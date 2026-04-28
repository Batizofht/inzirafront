import { reportClientError } from './api-observability';

function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message || 'Unknown error', stack: error.stack };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  return { message: 'Non-error thrown value', stack: JSON.stringify(error) };
}

export function initCrashReporting(): void {
  const reported = new Set<string>();

  const send = async (source: string, error: unknown, extra?: unknown) => {
    const parsed = normalizeError(error);
    const dedupeKey = `${source}:${parsed.message}:${parsed.stack || ''}`;
    if (reported.has(dedupeKey)) return;
    reported.add(dedupeKey);

    await reportClientError({
      message: parsed.message,
      stack: parsed.stack,
      source,
      url: typeof location !== 'undefined' ? location.href : undefined,
      extra,
    });
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('error', (event) => {
      void send('window.error', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      void send('window.unhandledrejection', event.reason);
    });
  }

  const globalAny = globalThis as any;
  const ErrorUtilsObj = globalAny?.ErrorUtils;
  if (ErrorUtilsObj?.getGlobalHandler && ErrorUtilsObj?.setGlobalHandler) {
    const original = ErrorUtilsObj.getGlobalHandler();
    ErrorUtilsObj.setGlobalHandler((error: unknown, isFatal?: boolean) => {
      void send('react-native.global', error, { isFatal: Boolean(isFatal) });
      if (typeof original === 'function') {
        original(error, isFatal);
      }
    });
  }
}
