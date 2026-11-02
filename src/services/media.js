import { launchImageLibrary } from 'react-native-image-picker';
import { config } from './config';
import { request } from './client';
export async function selectImage() {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    includeBase64: config.mode === 'mock',
    maxWidth: 900,
    maxHeight: 900,
    quality: 0.8,
  });
  if (result.didCancel) return null;
  if (result.errorCode)
    throw new Error(result.errorMessage || 'Image selection failed');
  const asset = result.assets?.[0];
  if (!asset) return null;
  if (config.mode === 'mock') {
    if (!asset.base64) throw new Error('Unable to read photo');
    return `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
  }
  const form = new FormData();
  form.append('image', {
    uri: asset.uri,
    type: asset.type,
    name: asset.fileName || 'attachment.jpg',
  });
  return (await request('/uploads', 'POST', form)).url;
}
