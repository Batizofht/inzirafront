import { Linking, Platform } from 'react-native';

/**
 * WhatsApp deep links that land in a chat straight away.
 *
 * `wa.me` links stop on WhatsApp's "Continue to Chat" interstitial in a
 * desktop browser, where the visitor still has to pick between WhatsApp Web
 * and the desktop app. These helpers skip that page entirely: desktop goes to
 * web.whatsapp.com, phones hand off to the installed app via the whatsapp://
 * scheme.
 */

type WhatsAppTarget = {
  /** Phone number in international format; digits only, no '+'. Omit to let the user pick a contact. */
  phone?: string;
  /** Pre-filled message body. */
  text?: string;
};

const isMobileBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
};

const buildQuery = ({ phone, text }: WhatsAppTarget): string => {
  const params: string[] = [];
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits) params.push(`phone=${digits}`);
  if (text) params.push(`text=${encodeURIComponent(text)}`);
  return params.length ? `?${params.join('&')}` : '';
};

/** WhatsApp Web URL — opens the chat in the browser, no interstitial. */
export const whatsappWebUrl = (target: WhatsAppTarget = {}): string =>
  `https://web.whatsapp.com/send${buildQuery(target)}`;

/** Native app URL — opens the installed WhatsApp app, no interstitial. */
export const whatsappAppUrl = (target: WhatsAppTarget = {}): string =>
  `whatsapp://send${buildQuery(target)}`;

/**
 * Open a WhatsApp chat directly. On the native app and mobile browsers this
 * jumps into the WhatsApp app; everywhere else it opens WhatsApp Web.
 */
export async function openWhatsApp(target: WhatsAppTarget = {}): Promise<void> {
  const appUrl = whatsappAppUrl(target);
  const webUrl = whatsappWebUrl(target);

  if (Platform.OS === 'web') {
    if (isMobileBrowser()) {
      window.location.href = appUrl;
      return;
    }
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    await Linking.openURL(appUrl);
  } catch {
    // WhatsApp isn't installed — fall back to the web client.
    await Linking.openURL(webUrl).catch(() => {});
  }
}
