import moment from 'moment';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', NGN: '₦' };

export const currencySymbol = (currency = 'USD') => CURRENCY_SYMBOLS[currency] || `${currency} `;

export const formatMoney = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined || amount === '') return '—';
  const value = Number(amount);
  if (Number.isNaN(value)) return '—';
  return `${currencySymbol(currency)}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

export const PET_PREMIUMS = {
  cats_dogs: 500,
  yes: 500,
  small_pets: 350,
  cats_only: 200,
  no_pets: 0,
};

export const petPremium = (listing) => {
  if (!listing) return 0;
  return PET_PREMIUMS[listing.pets_allowed] || 0;
};

export const effectivePrice = (listing) => {
  if (!listing) return 0;
  return Number(listing.price || 0) + petPremium(listing);
};

export const formatPrice = (listing) => {
  if (!listing) return '—';
  const amount = formatMoney(effectivePrice(listing), listing.currency || 'USD');
  if (listing.listing_type !== 'rent') return amount;
  return `${amount}/mo`;
};

export const formatNumber = (value, digits = 0) => {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

export const formatArea = (value) => (value ? `${formatNumber(value)} sq ft` : '—');

export const formatDate = (value) => (value ? moment(value).format('MMM D, YYYY') : '—');

export const formatDateTime = (value) => (value ? moment(value).format('MMM D, YYYY · h:mm A') : '—');

export const formatRelative = (value) => {
  if (!value) return '—';
  const then = moment(value);
  if (!then.isValid()) return '—';
  const days = moment().diff(then, 'days');
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return then.format('MMM D, YYYY');
};

export const formatListingDate = (listing) =>
  listing?.published_date ? `Listed ${formatRelative(listing.published_date)}` : 'Listed recently';

export const bedsLabel = (beds) => (beds ? `${beds} bd` : '—');
export const bathsLabel = (baths) => (baths ? `${baths} ba` : '—');

export const fullAddress = (listing) =>
  [listing?.address, listing?.city, listing?.state, listing?.postal_code].filter(Boolean).join(', ');

export const cityState = (listing) =>
  [listing?.city, listing?.state].filter(Boolean).join(', ') || 'Location available on request';

export const percent = (value, digits = 1) => `${formatNumber(value, digits)}%`;

export const initialsOf = (name, email) => {
  const source = (name || email || '?').trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};