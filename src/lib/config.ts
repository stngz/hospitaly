/**
 * Central application constants and feature flags.
 */

export const APP_NAME =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_NAME) || 'Hospitaly';

export const PUSH_ENABLED =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUSH_ENABLED === 'true';

export const USE_FIREBASE_EMULATOR =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_FIREBASE_EMULATOR === 'true';

export const DEFAULT_TIMEZONE = 'Africa/Lusaka';
export const DEFAULT_CURRENCY_SYMBOL = 'K';
export const DEFAULT_COVER_IMAGE_URL = '/images/rocks-suite-enhanced.jpg';
export const FOUNDER_CONTACT_PHONE = '+260 97 985 0598';
export const FOUNDER_WHATSAPP_NUMBER = '260979850598';
export const DEFAULT_FOUNDER_WHATSAPP = '+260 97 985 0598';
export const DEFAULT_RECEPTION_PHONE = '+260 97 405 6547';
export const DEFAULT_SUSPEND_MESSAGE =
  "We're not taking requests through the app right now. Please contact reception: +260 97 405 6547";
