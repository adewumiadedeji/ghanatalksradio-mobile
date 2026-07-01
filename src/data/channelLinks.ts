// TODO: swap in the real WhatsApp/Telegram channel URLs. Earlier sessions
// confirmed GhanaTalksRadio has live WhatsApp and Telegram channels, but the
// actual invite/channel URLs weren't captured in a form I can pull from here -
// paste them in and these two lines are the only thing that needs to change.
export const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/REPLACE_ME';
export const TELEGRAM_CHANNEL_URL = 'https://t.me/REPLACE_ME';

export interface ChannelLink {
  label: string;
  href: string;
  icon: 'logo-whatsapp' | 'navigate-circle-outline';
}

export const CHANNEL_LINKS: ChannelLink[] = [
  { label: 'WhatsApp', href: WHATSAPP_CHANNEL_URL, icon: 'logo-whatsapp' },
  { label: 'Telegram', href: TELEGRAM_CHANNEL_URL, icon: 'navigate-circle-outline' },
];
