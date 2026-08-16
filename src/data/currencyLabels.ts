/**
 * Display names for raffle payment currencies - purely cosmetic. The
 * actual list of currencies a payer can choose from comes live from the
 * backend (raffleApi.ts's fetchSupportedCurrencies(), backed by
 * ghanatalksradio-portal's config/billing.php) so the app never offers
 * one the backend would reject - this map only supplies a friendly label
 * for whichever codes come back. A code with no entry here just renders
 * as its raw ISO code instead of a name, so adding a new currency
 * backend-side doesn't require a matching mobile release.
 *
 * config/billing.php only has real FX rates for these five today - the
 * legacy CodeIgniter backend's raffle flow supported more (KES, UGX,
 * TZS, ZAR, XOF, XAF, RWF, ZMW, EGP), but rather than guess at rates for
 * those, they're left out until real ones are added backend-side.
 */
export const CURRENCY_LABELS: Record<string, string> = {
  GHS: 'Ghanaian Cedi',
  USD: 'US Dollar',
  GBP: 'British Pound',
  EUR: 'Euro',
  NGN: 'Nigerian Naira',
};
