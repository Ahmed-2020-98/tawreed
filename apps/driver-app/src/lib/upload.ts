import { api } from '@tawreed/mobile';

/** Uploads a local file URI (camera / picker / view-shot) and returns the stored file id. */
export async function uploadUri(uri: string, purpose: 'POD_PHOTO' | 'POD_SIGNATURE' | 'PICKUP_PHOTO', mime = 'image/jpeg'): Promise<string> {
  const fd = new FormData();
  fd.append('file', { uri, name: uri.split('/').pop() ?? 'photo.jpg', type: mime } as unknown as Blob);
  fd.append('purpose', purpose);
  const file = await api.post<{ id: string }>('/files', fd);
  return file.id;
}
