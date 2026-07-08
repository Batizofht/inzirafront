import { isWeb } from './platform';

/**
 * Triggers Google Translate to switch the page language.
 * Works by setting the googtrans cookie and reloading the translate frame.
 * Only works on web.
 */
export function setGoogleTranslateLanguage(langCode: string) {
  if (!isWeb || typeof document === 'undefined') return;

  // Google Translate uses language codes like '/en/fr'
  const targetLang = langCode === 'en' ? '' : `/en/${langCode}`;

  // Set the cookie that Google Translate reads
  document.cookie = `googtrans=${targetLang}; path=/`;
  document.cookie = `googtrans=${targetLang}; path=/; domain=${window.location.hostname}`;

  // Try to trigger the translate combo box programmatically
  const frame = document.querySelector('.goog-te-combo') as HTMLSelectElement;
  if (frame) {
    frame.value = langCode === 'en' ? '' : langCode;
    frame.dispatchEvent(new Event('change'));
    return;
  }

  // If no combo found, reload to apply the cookie
  if (langCode !== 'en') {
    window.location.reload();
  } else {
    // Reset to English - clear cookie and reload
    document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    document.cookie = `googtrans=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
    window.location.reload();
  }
}
