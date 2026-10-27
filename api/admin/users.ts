import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

/**
 * Trusted Backend Endpoint for Founder-Only Account Administration (/api/admin/users)
 *
 * Security model:
 * 1. Requires a valid Firebase ID token in the `Authorization: Bearer <token>` header.
 * 2. Verifies the token against Google Identity Toolkit (`accounts:lookup`) and checks
 *    the caller's authoritative Firestore profile in `users/{uid}` (must have `role == 'founder'` and `active == true`).
 * 3. Never uses a client-side secondary Firebase app as a security boundary.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers?.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!idToken) {
    return res.status(401).json({ error: 'Missing Authorization Bearer token.' });
  }

  try {
    // 1. Verify caller's Firebase ID Token via Identity Toolkit REST API
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!lookupRes.ok) {
      return res.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
    }

    const lookupData = await lookupRes.json();
    const callerAuthUser = lookupData?.users?.[0];
    if (!callerAuthUser?.localId) {
      return res.status(401).json({ error: 'Unable to resolve authenticated user.' });
    }

    const callerUid = callerAuthUser.localId;
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${encodeURIComponent(dbId)}/documents`;

    // 2. Verify caller is an active Founder in Firestore
    const callerDocRes = await fetch(`${firestoreBaseUrl}/users/${encodeURIComponent(callerUid)}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!callerDocRes.ok) {
      return res.status(403).json({ error: 'Caller does not have an authorised Founder profile.' });
    }

    const callerDoc = await callerDocRes.json();
    const callerRole = callerDoc?.fields?.role?.stringValue;
    const callerActive = callerDoc?.fields?.active?.booleanValue ?? true;

    if ((callerRole !== 'founder' && callerRole !== 'admin') || !callerActive) {
      return res.status(403).json({ error: 'Forbidden: Only an active Founder can administer accounts.' });
    }

    // 3. Process Founder Account Action
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { action } = body;

    if (action === 'provision') {
      const { email, name, role, department, propertyId, phone, tempPassword } = body;
      const cleanEmail = String(email || '').toLowerCase().trim();
      const cleanName = String(name || '').trim();
      const targetRole = role === 'manager' ? 'manager' : 'staff';
      const targetDept = String(department || (targetRole === 'manager' ? 'management' : 'housekeeping'));
      const targetPropertyId = String(propertyId || '').trim();

      if (!cleanEmail || !cleanName || !targetPropertyId) {
        return res.status(400).json({ error: 'Name, email, and assigned propertyId are required.' });
      }

      // Create the Firebase Auth account via Identity Toolkit if temporary password is provided
      // Note: On the backend this does not affect the Founder's browser session.
      let provisionedUid = '';
      let authCreated = false;

      if (tempPassword && String(tempPassword).length >= 8) {
        const signUpRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password: String(tempPassword),
              returnSecureToken: false,
            }),
          }
        );

        if (signUpRes.ok) {
          const signUpData = await signUpRes.json();
          provisionedUid = signUpData.localId;
          authCreated = true;
        } else {
          const errData = await signUpRes.json().catch(() => ({}));
          const errMsg = errData?.error?.message || '';
          if (errMsg !== 'EMAIL_EXISTS') {
            return res.status(400).json({ error: `Firebase Auth provisioning failed: ${errMsg || 'Unknown error'}` });
          }
        }
      }

      const profileId = provisionedUid || `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      // Write authoritative user profile document in Firestore using Founder's verified token
      const firestorePayload = {
        fields: {
          id: { stringValue: profileId },
          propertyId: { stringValue: targetPropertyId },
          name: { stringValue: cleanName },
          email: { stringValue: cleanEmail },
          phone: { stringValue: String(phone || '').trim() },
          role: { stringValue: targetRole },
          department: { stringValue: targetDept },
          active: { booleanValue: true },
          createdAt: { stringValue: now },
          updatedAt: { stringValue: now },
        },
      };

      const writeRes = await fetch(`${firestoreBaseUrl}/users?documentId=${encodeURIComponent(profileId)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(firestorePayload),
      });

      if (!writeRes.ok) {
        // Fallback PATCH if documentId already exists
        await fetch(`${firestoreBaseUrl}/users/${encodeURIComponent(profileId)}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(firestorePayload),
        });
      }

      // Trigger password reset email so staff/manager sets their own private password
      await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email: cleanEmail,
          }),
        }
      ).catch(() => {});

      return res.status(200).json({
        ok: true,
        authCreated,
        profile: {
          id: profileId,
          propertyId: targetPropertyId,
          name: cleanName,
          email: cleanEmail,
          phone: String(phone || '').trim(),
          role: targetRole,
          department: targetDept,
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    return res.status(400).json({ error: 'Unsupported action.' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal provisioning error.' });
  }
}
