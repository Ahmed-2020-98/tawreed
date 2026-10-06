import type { BankAccountDto, PaymentMethod } from '@tawreed/contracts';

/** Defaults used until an admin saves platform settings (also written by the bootstrap seed). */
export const SETTINGS_DEFAULTS = {
  platform: {
    name: 'توريد',
    nameEn: 'Tawreed',
    legalName: 'شركة توريد للتجارة الإلكترونية',
    legalNameEn: 'Tawreed E-Commerce Co.',
    vatNumber: '310000000000003',
    crNumber: '1010000000',
    address: 'الرياض، حي الملقا، طريق الملك فهد',
    addressEn: 'Al Malqa, King Fahd Road, Riyadh',
  },
  support: { phone: '+966920000000', whatsapp: '+966550000000', email: 'support@tawreed.sa' },
  appLinks: {
    buyerIos: 'https://apps.apple.com/app/tawreed',
    buyerAndroid: 'https://play.google.com/store/apps/details?id=sa.tawreed.buyer',
    supplierIos: 'https://apps.apple.com/app/tawreed-supplier',
    supplierAndroid: 'https://play.google.com/store/apps/details?id=sa.tawreed.supplier',
    driverIos: 'https://apps.apple.com/app/tawreed-driver',
    driverAndroid: 'https://play.google.com/store/apps/details?id=sa.tawreed.driver',
  },
  social: { x: 'https://x.com/tawreed', instagram: 'https://instagram.com/tawreed', linkedin: 'https://linkedin.com/company/tawreed', snapchat: 'https://snapchat.com/add/tawreed' },
  payments: {
    enabledMethods: ['CREDIT', 'CARD', 'BANK_TRANSFER', 'COD'] as PaymentMethod[],
    codMaxAmount: '20000',
    hidePricesForGuests: false,
    bankAccounts: [
      { bankName: 'مصرف الراجحي', accountName: 'شركة توريد للتجارة الإلكترونية', iban: 'SA0380000000608010167519' },
      { bankName: 'البنك الأهلي السعودي', accountName: 'شركة توريد للتجارة الإلكترونية', iban: 'SA4410000001234567891234' },
    ] as BankAccountDto[],
  },
  orders: { supplierAcceptHours: 6, disputeWindowDays: 3, completeAfterDays: 3, reviewWindowDays: 14, requireVerification: false, unpaidCancelHours: 24 },
  credit: { ladder: [10000, 25000, 50000, 100000, 250000, 500000, 1000000], defaultTermsDays: 30, graceDays: 5, reminderOffsets: [-3, 0, 3, 7] },
  delivery: { defaultCitySlug: 'riyadh' },
  tax: { vatRate: '0.15' },
  terms: { version: '2026-09', quotationApprovalText: 'أقر بصفتي مفوضًا عن المنشأة بقبول عرض السعر وفق الشروط والأحكام، ويعد هذا القبول أمر شراء ملزمًا.' },
};

export type SettingsShape = typeof SETTINGS_DEFAULTS;
export type SettingsKey = keyof SettingsShape;
