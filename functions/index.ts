import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

interface NotificationSettings {
  enabled?: boolean;
  quietHoursStart?: string; // e.g. "22:00"
  quietHoursEnd?: string;   // e.g. "07:00"
  onDutyNight?: boolean;
}

/**
 * Evaluate whether a recipient is currently in Quiet Hours (Africa/Lusaka UTC+2)
 * Urgent requests or staff marked "On duty tonight" bypass quiet hours.
 */
function shouldSuppressForQuietHours(
  settings: NotificationSettings | undefined,
  isUrgent: boolean
): boolean {
  if (settings && settings.enabled === false) {
    return true;
  }
  if (isUrgent || settings?.onDutyNight) {
    return false;
  }

  const startStr = settings?.quietHoursStart || '22:00';
  const endStr = settings?.quietHoursEnd || '07:00';
  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);
  if (Number.isNaN(startH) || Number.isNaN(endH)) return false;

  // Africa/Lusaka is UTC+2 year-round
  const now = new Date();
  const lusakaMinutes = ((now.getUTCHours() + 2) % 24) * 60 + now.getUTCMinutes();
  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  if (startMinutes <= endMinutes) {
    return lusakaMinutes >= startMinutes && lusakaMinutes < endMinutes;
  }
  // Overnight window (e.g. 22:00 -> 07:00)
  return lusakaMinutes >= startMinutes || lusakaMinutes < endMinutes;
}

/**
 * Send FCM webpush notification to all registered devices for a user
 * Automatically prunes dead tokens from users/{uid}/devices/{token}
 */
async function sendPushToUserDevices(
  uid: string,
  payload: {
    title: string;
    body: string;
    requestId: string;
    houseName: string;
    category?: string;
    isUrgent?: boolean;
  }
): Promise<void> {
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) return;

  const userData = userSnap.data() || {};
  if (userData.active === false) return;

  if (shouldSuppressForQuietHours(userData.notificationSettings, Boolean(payload.isUrgent))) {
    return;
  }

  const devicesSnap = await db.collection('users').doc(uid).collection('devices').get();
  if (devicesSnap.empty) return;

  const targetUrl = `/staff?request=${encodeURIComponent(payload.requestId)}`;

  const sendPromises = devicesSnap.docs.map(async (deviceDoc) => {
    const token = deviceDoc.data()?.token || deviceDoc.id;
    if (!token || String(token).startsWith('webpush_')) return;

    try {
      await messaging.send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          title: payload.title,
          body: payload.body,
          requestId: payload.requestId,
          houseName: payload.houseName,
          category: payload.category || 'concierge',
          url: targetUrl,
        },
        webpush: {
          fcmOptions: {
            link: targetUrl,
          },
          notification: {
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: `req-${payload.requestId}`,
            renotify: true,
          },
        },
      });
    } catch (err: any) {
      const code = err?.code || err?.errorInfo?.code || '';
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        await deviceDoc.ref.delete().catch(() => {});
      }
    }
  });

  await Promise.all(sendPromises);
}

/**
 * 1. Trigger when a guest submits a new request:
 *    Notify all active managers of that property.
 *    Title: "New request · {House}" (or "URGENT · {House}")
 *    Body:  "{request title}" (never includes guest phone number)
 */
export const onRequestCreated = onDocumentCreated('requests/{id}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const requestId = event.params.id;
  const propertyId = String(data.propertyId || '');
  const houseName = String(data.roomNumber || 'House');
  const requestTitle = String(data.title || 'Guest Service Request');
  const isUrgent = data.priority === 'urgent';

  const title = isUrgent ? `URGENT · ${houseName}` : `New request · ${houseName}`;
  const body = requestTitle;

  const managersSnap = await db
    .collection('users')
    .where('propertyId', '==', propertyId)
    .where('role', '==', 'manager')
    .where('active', '==', true)
    .get();

  await Promise.all(
    managersSnap.docs.map((mgrDoc) =>
      sendPushToUserDevices(mgrDoc.id, {
        title,
        body,
        requestId,
        houseName,
        category: data.category,
        isUrgent,
      })
    )
  );
});

/**
 * 2. Trigger when a manager assigns a request to a staff member:
 *    Title: "Assigned to you · {House}"
 *    Body:  "{request title}"
 */
export const onRequestAssigned = onDocumentUpdated('requests/{id}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  const prevUid = before.assignedTo?.uid || '';
  const nextUid = after.assignedTo?.uid || '';
  if (!nextUid || prevUid === nextUid) return;

  const requestId = event.params.id;
  const houseName = String(after.roomNumber || 'House');
  const requestTitle = String(after.title || 'Guest Service Request');
  const isUrgent = after.priority === 'urgent';

  await sendPushToUserDevices(nextUid, {
    title: `Assigned to you · ${houseName}`,
    body: requestTitle,
    requestId,
    houseName,
    category: after.category,
    isUrgent,
  });
});

/**
 * 3. 5-Minute Unassigned Escalation Reminder:
 *    If a request is still pending & unassigned after 5 minutes, send one reminder push to the manager:
 *    "Still waiting · {House} · {title}"
 */
export const remindUnassignedRequests = onSchedule('every 5 minutes', async () => {
  const nowMs = Date.now();
  const fiveMinMs = 5 * 60 * 1000;
  const fifteenMinMs = 15 * 60 * 1000;

  const pendingSnap = await db
    .collection('requests')
    .where('status', '==', 'pending')
    .get();

  for (const reqDoc of pendingSnap.docs) {
    const req = reqDoc.data();
    if (req.assignedTo?.uid) continue;

    const createdMs = new Date(req.createdAt || 0).getTime();
    const ageMs = nowMs - createdMs;

    // Send a single reminder for requests between 5 and 10 minutes old
    if (ageMs >= fiveMinMs && ageMs < fiveMinMs * 2 && ageMs < fifteenMinMs) {
      const propertyId = String(req.propertyId || '');
      const houseName = String(req.roomNumber || 'House');
      const requestTitle = String(req.title || 'Service Request');

      const managersSnap = await db
        .collection('users')
        .where('propertyId', '==', propertyId)
        .where('role', '==', 'manager')
        .where('active', '==', true)
        .get();

      await Promise.all(
        managersSnap.docs.map((mgrDoc) =>
          sendPushToUserDevices(mgrDoc.id, {
            title: `Still waiting · ${houseName} · ${requestTitle}`,
            body: requestTitle,
            requestId: reqDoc.id,
            houseName,
            category: req.category,
            isUrgent: req.priority === 'urgent',
          })
        )
      );
    }
  }
});
