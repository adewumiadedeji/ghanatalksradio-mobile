import Clipboard from '@react-native-clipboard/clipboard';

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function buildTwitterShareUrl(url: string, title: string): string {
  const params = new URLSearchParams({ url, text: title });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export async function copyLinkToClipboard(url: string): Promise<boolean> {
  try {
    Clipboard.setString(url);
    return true;
  } catch {
    return false;
  }
}
