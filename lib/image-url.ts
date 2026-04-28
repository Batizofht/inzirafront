import { API_BASE_URL } from './api-client';

export function resolveImageUrl(src?: string): string {
  if (!src) return '';
  // Already absolute or local runtime URIs
  if (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.startsWith('file:') ||
    src.startsWith('content:')
  ) {
    return src;
  }
  // If it's a bare filename (no slash), assume vehicle image filename
  if (!src.includes('/')) {
    return `${API_BASE_URL}/vehicles/image/${src}`;
  }
  // Stored as /uploads/vehicles/<filename> -> use dedicated vehicle image endpoint
  if (src.startsWith('/uploads/vehicles/')) {
    const filename = src.split('/').pop() || src;
    return `${API_BASE_URL}/vehicles/image/${filename}`;
  }
  // Other uploads paths served statically
  if (src.startsWith('/uploads/')) {
    return `${API_BASE_URL}${src}`;
  }
  // Fallback: prefix API base
  return `${API_BASE_URL}${src.startsWith('/') ? src : `/${src}`}`;
}
