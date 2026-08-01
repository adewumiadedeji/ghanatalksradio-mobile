export const WHATSAPP_CHANNEL_URL = 'https://www.whatsapp.com/channel/0029VaG3JNKId7nFeOZUsF3K';
export const TELEGRAM_CHANNEL_URL = 'https://t.me/GhanaTalksRadio';

export interface ChannelLink {
  label: string;
  href: string;
  icon: 'logo-whatsapp' | 'navigate-circle-outline';
}

export const CHANNEL_LINKS: ChannelLink[] = [
  { label: 'WhatsApp', href: WHATSAPP_CHANNEL_URL, icon: 'logo-whatsapp' },
  { label: 'Telegram', href: TELEGRAM_CHANNEL_URL, icon: 'navigate-circle-outline' },
];
