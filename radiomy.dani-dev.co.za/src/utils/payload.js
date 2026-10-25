export function encodePayload(obj) {
  if (!obj) return '';
  try {
    const payloadData = {
      slug: obj.slug || '',
      provider: obj.provider || '',
      type: obj.type || 'video',
      title: obj.title || obj.name || '',
      image: obj.image || '',
      category: obj.category || ''
    };
    return encodeURIComponent(btoa(JSON.stringify(payloadData)));
  } catch (e) {
    console.error('Payload encoding error:', e);
    return '';
  }
}

export function decodePayload(raw) {
  if (!raw) return null;
  try {
    const jsonStr = atob(decodeURIComponent(raw));
    return JSON.parse(jsonStr);
  } catch (e) {
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch (e2) {
      return null;
    }
  }
}
