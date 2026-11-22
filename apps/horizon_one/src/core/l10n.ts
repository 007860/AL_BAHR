export type LocaleCode = 'en' | 'ur';

const EN_STRINGS: Record<string, string> = {
  app_title: 'HORIZON ONE',
  loading_workspace: 'Loading... Please wait',
  skip_animation: 'Skip Animation',
  sign_in: 'Sign In',
  email: 'Work or Portal Email',
  password: 'Password',
  forgot_password: 'Forgot Password?',
  back_to_website: 'Back to www.albahrtravels.com',
  activate_invite: 'Activate Employee Invite',
  offline_banner: 'Offline Mode — Changes saved locally. Payment verification & ticket issuance resume when online.',
  workspace_bar: 'AL-BAHR HORIZON Cloud Workspace · Connected Social & Travel Operations',
  support_center: 'Support Center',
  call_support: 'Call Support (+92 300 8442100)',
  whatsapp_support: 'WhatsApp Business Live Chat',
  email_support: 'Email Support (info@albahrtravels.com)',
  search_hint: 'Search bookings, leads, visas, or packages...',
  clear_filters: 'Clear Filters',
  retry: 'Retry',
  social_hub: 'Social Media Connectors',
};

const UR_STRINGS: Record<string, string> = {
  app_title: 'HORIZON ONE — البہر ہورائزن',
  loading_workspace: 'لوڈ ہو رہا ہے... براہ کرم انتظار کریں',
  skip_animation: 'آگے بڑھیں',
  sign_in: 'لاگ ان کریں',
  email: 'ای میل ایڈریس',
  password: 'پاس ورڈ',
  forgot_password: 'پاس ورڈ بھول گئے؟',
  back_to_website: 'ویب سائٹ پر واپس جائیں',
  activate_invite: 'ملازم دعوت نامہ فعال کریں',
  offline_banner: 'آف لائن موڈ — ڈرافٹ محفوظ ہیں۔ آن لائن ہونے پر ادائیگی اور ٹکٹنگ بحال ہو جائے گی۔',
  workspace_bar: 'البہر ہورائزن کلاؤڈ ورک اسپیس · سوشل میڈیا اور ٹریول آپریشنز',
  support_center: 'سپورٹ سینٹر',
  call_support: 'کال سپورٹ (+92 300 8442100)',
  whatsapp_support: 'واٹس ایپ بزنس لائیو چیٹ',
  email_support: 'ای میل سپورٹ',
  search_hint: 'بکنگ، لیڈز، ویزا یا پیکجز تلاش کریں...',
  clear_filters: 'فلٹرز صاف کریں',
  retry: 'دوبارہ کوشش کریں',
  social_hub: 'سوشل میڈیا کنیکٹرز',
};

export function translate(locale: LocaleCode, key: string): string {
  const dict = locale === 'ur' ? UR_STRINGS : EN_STRINGS;
  return dict[key] ?? EN_STRINGS[key] ?? key;
}

export function isRtlLocale(locale: LocaleCode): boolean {
  return locale === 'ur';
}
