export const BRAND = {
  name: 'Dwellmark',
  tagline: 'Find the place that fits.',
  email: 'hello@dwellmark.example',
  phone: '+1 (235) 222-5050',
  address: 'Sample Office, 100 Market Street, Suite 400',
};

export const PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi_family', label: 'Multi-family' },
  { value: 'land', label: 'Land' },
];

export const LISTING_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'published', label: 'Published' },
  { value: 'under_offer', label: 'Under offer' },
  { value: 'sold', label: 'Sold' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

export const LISTING_TYPES = [
  { value: 'sale', label: 'For sale' },
  { value: 'rent', label: 'For rent' },
];

export const RENT_FREQUENCIES = [
  { value: 'monthly', label: 'Per month' },
  { value: 'yearly', label: 'Per year' },
];

export const PET_POLICIES = [
  { value: 'cats_dogs', label: 'Cats and dogs allowed' },
  { value: 'cats_only', label: 'Cats only' },
  { value: 'small_pets', label: 'Small pets allowed' },
  { value: 'no_pets', label: 'No pets' },
];

export const AMENITIES = [
  'Air conditioning',
  'Heating',
  'In-unit laundry',
  'Dishwasher',
  'Balcony',
  'Private yard',
  'Swimming pool',
  'Gym',
  'Elevator',
  'Parking included',
  'Garage',
  'Fireplace',
  'Hardwood floors',
  'Furnished',
  'Solar panels',
  'Pet friendly',
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'beds_desc', label: 'Most bedrooms' },
  { value: 'baths_desc', label: 'Most bathrooms' },
  { value: 'area_desc', label: 'Largest area' },
];

export const SORT_TO_QUERY = {
  newest: { sort: '-published_date' },
  price_asc: { sort: 'price' },
  price_desc: { sort: '-price' },
  beds_desc: { sort: '-bedrooms' },
  baths_desc: { sort: '-bathrooms' },
  area_desc: { sort: '-area_sqft' },
};

export const ACCOUNT_ROLES = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'renter', label: 'Renter' },
  { value: 'owner', label: 'Owner or seller' },
  { value: 'landlord', label: 'Landlord' },
];

export const NOTIFICATION_FREQUENCIES = [
  { value: 'instant', label: 'As it happens' },
  { value: 'daily', label: 'Daily summary' },
  { value: 'weekly', label: 'Weekly summary' },
  { value: 'off', label: 'Off' },
];

export const PAYMENT = {
  bitcoinWallet: '15BaHPXDAMsy6rHfPiuvdciZhVNeWRfV6y',
  paypalGuideUrl: 'https://www.paypal.com/us/cshelp/article/how-do-i-transfer-my-crypto-help822',
};

export const MORTGAGE_DEFAULTS = {
  downPaymentPercent: 10,
  interestRate: 7.5,
  termYears: 30,
  annualTaxRate: 1.5,
  annualInsurance: 2400,
  monthlyHoa: 0,
  monthlyMortgageInsurance: 0,
};

export const AFFORDABILITY_DEFAULTS = {
  annualIncome: 110000,
  monthlyDebts: 650,
  downPayment: 40000,
  interestRate: 7.5,
  termYears: 30,
  housingRatio: 28,
  debtRatio: 36,
};

export const labelOf = (list, value) =>
  list.find((item) => item.value === value)?.label || (value ? String(value).replace(/_/g, ' ') : '—');

export const propertyTypeLabel = (value) => labelOf(PROPERTY_TYPES, value);
export const statusLabel = (value) => labelOf(LISTING_STATUSES, value);
export const listingTypeLabel = (value) => labelOf(LISTING_TYPES, value);
export const petPolicyLabel = (value) => labelOf(PET_POLICIES, value);
export const rentFrequencyLabel = (value) => labelOf(RENT_FREQUENCIES, value);
export const accountRoleLabel = (value) => labelOf(ACCOUNT_ROLES, value);
export const notificationFrequencyLabel = (value) => labelOf(NOTIFICATION_FREQUENCIES, value);