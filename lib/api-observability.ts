import { apiRequest } from './api-client';
import { getAuthUser } from './userPreference';

export type ClientErrorInput = {
  message: string;
  stack?: string;
  source?: string;
  url?: string;
  extra?: unknown;
};

export async function reportClientError(input: ClientErrorInput): Promise<void> {
  try {
    const user = await getAuthUser();
    await apiRequest('/observability/client-errors', {
      method: 'POST',
      body: {
        message: input.message,
        stack: input.stack,
        source: input.source,
        url: input.url,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        userId: user?.id,
        extra: input.extra,
      },
    });
  } catch {
    // Never throw from client error reporting
  }
}
