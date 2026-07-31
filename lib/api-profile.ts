import { apiRequest } from './api-client';

export type UploadProfilePhotoResponse = {
  status: number;
  message?: string;
  data: { profileImageUrl: string };
};

/**
 * Uploads the given local image URI as the authenticated user's profile photo.
 * Supports web blob/data URIs and React Native file:// / content:// URIs.
 * Returns the resulting Cloudflare R2 public URL.
 */
export async function uploadProfilePhoto(imageUri: string): Promise<UploadProfilePhotoResponse> {
  const formData = new FormData();

  if (imageUri.startsWith('data:image/')) {
    const base64Data = imageUri.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    formData.append('profileImage', blob, 'profile.jpg');
  } else if (imageUri.startsWith('blob:')) {
    const resp = await fetch(imageUri);
    const blob = await resp.blob();
    formData.append('profileImage', blob, 'profile.jpg');
  } else if (imageUri.startsWith('file:') || imageUri.startsWith('content:')) {
    const filename = imageUri.split('/').pop() || 'profile.jpg';
    const lower = filename.toLowerCase();
    const type = lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    const file: any = { uri: imageUri, name: filename, type };
    (formData as any).append('profileImage', file);
  } else {
    const resp = await fetch(imageUri);
    const blob = await resp.blob();
    formData.append('profileImage', blob, 'profile.jpg');
  }

  return apiRequest<UploadProfilePhotoResponse>('/profile/me/photo', {
    method: 'POST',
    auth: true,
    isFormData: true,
    body: formData,
  });
}
