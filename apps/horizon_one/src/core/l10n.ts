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
  offline_banner: 'Offline Mode — Safe drafts saved locally. Payment verify, ticketing & publishing disabled.',
  sandbox_banner: 'LOCAL EVALUATION SANDBOX (Synthetic Data — Connect Live Server in Settings)',
  logo_pending: 'OFFICIAL LOGO ASSET PENDING',
  support_center: 'Support Center',
  call_support: 'Call Support',
  whatsapp_unverified: 'WhatsApp (Pending Owner Verification)',
  email_support: 'Email Support',
  search_hint: 'Search permitted records...',
  clear_filters: 'Clear Filters',
  retry: 'Retry',
};

const UR_STRINGS: Record<string, string> = {
  app_title: 'HORIZON ONE — البہر ہورائزن',
  loading_workspace: 'ورک اسپیس لوڈ ہو رہا ہے...',
  skip_animation: 'اینیمیشن چھوڑیں',
  sign_in: 'لاگ ان کریں',
  email: 'ای میل ایڈریس',
  password: 'پاس ورڈ',
  forgot_password: 'پاس ورڈ بھول گئے؟',
  back_to_website: 'ویب سائٹ پر واپس جائیں',
  activate_invite: 'ملازم دعوت نامہ فعال کریں',
  offline_banner: 'آف لائن موڈ — محفوظ ڈرافٹ محفوظ ہیں۔ ادائیگی کی تصدیق اور ٹکٹ جاری کرنا معطل ہے۔',
  sandbox_banner: 'لوکل سینڈ باکس موڈ (تجرباتی ڈیٹا — لائیو سرور سیٹنگز سے جوڑیں)',
  logo_pending: 'آفیشل لوگو فائل ابھی درکار ہے',
  support_center: 'سپورٹ سینٹر',
  call_support: 'کال سپورٹ',
  whatsapp_unverified: 'واٹس ایپ (مالک کی تصدیق باقی)',
  email_support: 'ای میل سپورٹ',
  search_hint: 'مجاز ریکارڈ تلاش کریں...',
  clear_filters: 'فلٹرز صاف کریں',
  retry: 'دوبارہ کوشش کریں',
};

export function translate(locale: LocaleCode, key: string): string {
  const dict = locale === 'ur' ? UR_STRINGS : EN_STRINGS;
  return dict[key] ?? EN_STRINGS[key] ?? key;
}

export function isRtlLocale(locale: LocaleCode): boolean {
  return locale === 'ur';
}
