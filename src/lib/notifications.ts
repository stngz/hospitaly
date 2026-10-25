/**
 * Luxury Hotel Web Audio, Haptics & Push Notification Engine
 * Zero external audio dependencies - uses Web Audio API synthesized harmonics
 */

type HapticStyle = 'light' | 'medium' | 'success' | 'warning' | 'dispatch';

export interface InAppNotification {
  id: string;
  title: string;
  subtitle: string;
  category?: 'dining' | 'housekeeping' | 'concierge' | 'maintenance' | 'reception' | 'transport' | 'other' | string;
  roomNumber?: string;
  actionLabel?: string;
  onAction?: () => void;
  timestamp: number;
}

type NotificationListener = (notification: InAppNotification) => void;
const listeners = new Set<NotificationListener>();

class SoundAndNotificationService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private hapticsEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const storedSound = localStorage.getItem('hospitally_sound_enabled');
      this.soundEnabled = storedSound !== null ? storedSound === 'true' : true;
      const storedHaptics = localStorage.getItem('hospitally_haptics_enabled');
      this.hapticsEnabled = storedHaptics !== null ? storedHaptics === 'true' : true;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('AudioContext not available:', e);
      return null;
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hospitally_sound_enabled', String(enabled));
    }
  }

  public isHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hospitally_haptics_enabled', String(enabled));
    }
  }

  /**
   * Tactile haptic feedback via Navigator Vibrate API
   */
  public triggerHaptic(style: HapticStyle = 'light') {
    if (!this.hapticsEnabled || typeof window === 'undefined' || !navigator.vibrate) return;
    try {
      switch (style) {
        case 'light':
          navigator.vibrate(12);
          break;
        case 'medium':
          navigator.vibrate(24);
          break;
        case 'success':
          navigator.vibrate([15, 30, 25]);
          break;
        case 'warning':
          navigator.vibrate([30, 40, 30, 40, 50]);
          break;
        case 'dispatch':
          navigator.vibrate([20, 25, 40, 25, 60]);
          break;
      }
    } catch {
      // Ignore vibration errors if unsupported
    }
  }

  /**
   * Warm 3-tone ascending chime when an order is placed from the bedside
   */
  public playOrderPlacedChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.35, gain: 0.15 }, // C5
        { freq: 659.25, time: 0.12, dur: 0.4, gain: 0.18 }, // E5
        { freq: 783.99, time: 0.24, dur: 0.65, gain: 0.22 }, // G5
        { freq: 1046.5, time: 0.38, dur: 0.85, gain: 0.16 }, // C6
      ];

      notes.forEach(({ freq, time, dur, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gainNode.gain.setValueAtTime(0.0001, now + time);
        gainNode.gain.exponentialRampToValueAtTime(gain, now + time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      console.warn('Audio chime note:', e);
    }
  }

  /**
   * Crisp reception chime when a new request arrives at the front desk / staff
   */
  public playStaffAlertChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High-clarity double ding (F#5 -> B5)
      const tones = [
        { freq: 739.99, time: 0.0, dur: 0.3, gain: 0.25 },
        { freq: 987.77, time: 0.14, dur: 0.55, gain: 0.28 },
      ];

      tones.forEach(({ freq, time, dur, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gainNode.gain.setValueAtTime(0.0001, now + time);
        gainNode.gain.exponentialRampToValueAtTime(gain, now + time + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      console.warn('Audio staff chime note:', e);
    }
  }

  /**
   * Subtle status update ping (order accepted / preparing / on the way)
   */
  public playStatusUpdateChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.1); // D6

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.warn('Audio status chime note:', e);
    }
  }

  /**
   * Two-tone hotel doorbell chime when staff arrives at the room door
   */
  public playDoorbellChime() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Classic Westminster 2-tone Ding-Dong (E5 -> C5)
      const bell = [
        { freq: 659.25, time: 0.0, dur: 0.6, gain: 0.26 },
        { freq: 523.25, time: 0.35, dur: 0.9, gain: 0.28 },
      ];

      bell.forEach(({ freq, time, dur, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gainNode.gain.setValueAtTime(0.0001, now + time);
        gainNode.gain.exponentialRampToValueAtTime(gain, now + time + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      console.warn('Doorbell chime note:', e);
    }
  }

  /**
   * Request native browser push notifications permission
   */
  public async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    } catch (e) {
      console.warn('Notification permission error:', e);
    }
    return false;
  }

  /**
   * Send native browser notification
   */
  public sendBrowserNotification(title: string, body: string, iconUrl?: string) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      if (Notification.permission === 'granted') {
        const n = new Notification(title, {
          body,
          icon: iconUrl || '/favicon.ico',
          badge: '/favicon.ico',
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      }
    } catch (e) {
      console.warn('Could not fire browser notification:', e);
    }
  }

  /**
   * Dispatch an in-app dynamic island notification
   */
  public notify(notif: Omit<InAppNotification, 'id' | 'timestamp'>) {
    const full: InAppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };

    // Play appropriate sound & haptic
    if (notif.category === 'dining') {
      this.playStatusUpdateChime();
      this.triggerHaptic('medium');
    } else {
      this.playStaffAlertChime();
      this.triggerHaptic('dispatch');
    }

    // Trigger browser notification if allowed
    this.sendBrowserNotification(full.title, full.subtitle);

    // Notify listeners
    listeners.forEach((listener) => {
      try {
        listener(full);
      } catch (err) {
        console.error('Notification listener error:', err);
      }
    });
  }

  public subscribe(listener: NotificationListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }
}

export const notificationService = new SoundAndNotificationService();
