import type { PaymentMethod } from '../enums.js';

export interface BankAccountDto {
  bankName: string;
  accountName: string;
  iban: string;
  accountNumber?: string;
}

export interface PublicSettingsDto {
  platformName: string;
  legalName: string;
  vatNumber: string;
  crNumber: string;
  address: string;
  supportPhone: string;
  supportWhatsapp: string;
  supportEmail: string;
  appLinks: Record<'buyerIos' | 'buyerAndroid' | 'supplierIos' | 'supplierAndroid' | 'driverIos' | 'driverAndroid', string>;
  social: Partial<Record<'x' | 'instagram' | 'linkedin' | 'snapchat' | 'tiktok' | 'youtube', string>>;
  paymentMethods: PaymentMethod[];
  /** Platform accounts for bank-transfer payments. */
  bankAccounts: BankAccountDto[];
  hidePricesForGuests: boolean;
  defaultCitySlug: string;
  vatRate: string;
}
