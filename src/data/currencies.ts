/**
 * Currencies the raffle payment flow lets a user pick from. Must stay in
 * sync with $config['flw_supported_currencies'] in the backend's
 * application/config/flutterwave.php - the backend is the source of truth
 * for what Flutterwave will actually accept, and silently falls back to
 * USD server-side for anything requested outside that list, so a mismatch
 * here just means a slightly wrong preview label, not a broken payment.
 */
export interface CurrencyOption {
  code: string;
  label: string;
}

export const RAFFLE_CURRENCIES: CurrencyOption[] = [
  { code: 'GHS', label: 'Ghanaian Cedi' },
  { code: 'NGN', label: 'Nigerian Naira' },
  { code: 'KES', label: 'Kenyan Shilling' },
  { code: 'UGX', label: 'Ugandan Shilling' },
  { code: 'TZS', label: 'Tanzanian Shilling' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'XOF', label: 'West African CFA Franc' },
  { code: 'XAF', label: 'Central African CFA Franc' },
  { code: 'RWF', label: 'Rwandan Franc' },
  { code: 'ZMW', label: 'Zambian Kwacha' },
  { code: 'EGP', label: 'Egyptian Pound' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'EUR', label: 'Euro' },
];
