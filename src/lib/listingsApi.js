import moment from 'moment';
import { base44 } from '@/api/base44Client';
import { SORT_TO_QUERY } from '@/lib/constants';

export const PAGE_SIZE = 12;
export const SEARCHABLE_STATUS = 'published';
export const SOLD_STATUS = 'sold';

/**
 * Search conditions are kept to single-field comparisons. The platform's list layer
 * evaluates plain equality and range comparisons reliably, so no query combines
 * several fields with $or / $in / $all.
 */
export const availableClause = () => ({ status: SEARCHABLE_STATUS });
export const publicClause = () => ({ status: SEARCHABLE_STATUS });
export const soldClause = () => ({ status: SOLD_STATUS });
export const statusAlternatives = () => ({ status: SEARCHABLE_STATUS });

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const filtersFromParams = (params) => ({
  q: params.get('q') || '',
  listing_type: params.get('listing_type') || '',
  status_scope: params.get('status') === 'sold' ? 'sold' : 'available',
  price_min: params.get('price_min') || '',
  price_max: params.get('price_max') || '',
  property_type: params.get('property_type') || '',
  city: params.get('city') || '',
  beds_min: params.get('beds_min') || '',
  baths_min: params.get('baths_min') || '',
  area_min: params.get('area_min') || '',
  area_max: params.get('area_max') || '',
  lot_min: params.get('lot_min') || '',
  year_min: params.get('year_min') || '',
  parking_ok: params.get('parking') === '1',
  pets_ok: params.get('pets') === '1',
  furnished: params.get('furnished') || '',
  open_house: params.get('open_house') === '1',
  new_construction: params.get('new_construction') === '1',
  listed_within: params.get('listed_within') || '',
  source: params.get('source') || '',
});

export const buildQuery = (filters, knownCities = []) => {
  const query = {};

  if (filters.listing_type) query.listing_type = filters.listing_type;
  query.status = filters.status_scope === 'sold' ? SOLD_STATUS : SEARCHABLE_STATUS;

  const priceMin = toNumber(filters.price_min);
  const priceMax = toNumber(filters.price_max);
  if (priceMin !== null) query.price = { ...(query.price || {}), $gte: priceMin };
  if (priceMax !== null) query.price = { ...(query.price || {}), $lte: priceMax };

  if (filters.property_type) query.property_type = filters.property_type;

  const beds = toNumber(filters.beds_min);
  if (beds !== null) query.bedrooms = { $gte: beds };

  const baths = toNumber(filters.baths_min);
  if (baths !== null) query.bathrooms = { $gte: baths };

  const areaMin = toNumber(filters.area_min);
  const areaMax = toNumber(filters.area_max);
  if (areaMin !== null) query.area_sqft = { ...(query.area_sqft || {}), $gte: areaMin };
  if (areaMax !== null) query.area_sqft = { ...(query.area_sqft || {}), $lte: areaMax };

  const lotMin = toNumber(filters.lot_min);
  if (lotMin !== null) query.lot_sqft = { $gte: lotMin };

  if (filters.new_construction) {
    query.year_built = { $gte: new Date().getFullYear() - 3 };
  } else {
    const yearMin = toNumber(filters.year_min);
    if (yearMin !== null) query.year_built = { $gte: yearMin };
  }

  if (filters.furnished) query.furnished = filters.furnished;
  if (filters.parking_ok) query.parking_ok = true;
  if (filters.pets_ok) query.pets_ok = true;
  if (filters.source) query.source = filters.source;

  if (filters.open_house) {
    query.open_house_at = { $gte: moment().format('YYYY-MM-DD') };
  }

  const days = toNumber(filters.listed_within);
  if (days !== null) {
    query.published_date = { $gte: moment().subtract(days, 'days').format('YYYY-MM-DD') };
  }

  const text = String(filters.q || '').trim();
  if (text) {
    const matchedCity = knownCities.find((city) => city.toLowerCase() === text.toLowerCase());
    if (matchedCity) {
      query.city = matchedCity;
    } else if (filters.city) {
      query.city = filters.city;
      query.search_text = { $regex: escapeRegex(text.slice(0, 45)), $options: 'i' };
    } else {
      query.search_text = { $regex: escapeRegex(text.slice(0, 45)), $options: 'i' };
    }
  } else if (filters.city) {
    query.city = filters.city;
  }

  return query;
};

export const paramsFromFilters = (filters, sort = 'newest', view = 'list') => {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.listing_type) params.set('listing_type', filters.listing_type);
  if (filters.status_scope === 'sold') params.set('status', 'sold');
  if (filters.price_min !== '' && filters.price_min != null) params.set('price_min', filters.price_min);
  if (filters.price_max !== '' && filters.price_max != null) params.set('price_max', filters.price_max);
  if (filters.property_type) params.set('property_type', filters.property_type);
  if (filters.city) params.set('city', filters.city);
  if (filters.beds_min) params.set('beds_min', filters.beds_min);
  if (filters.baths_min) params.set('baths_min', filters.baths_min);
  if (filters.area_min) params.set('area_min', filters.area_min);
  if (filters.area_max) params.set('area_max', filters.area_max);
  if (filters.lot_min) params.set('lot_min', filters.lot_min);
  if (filters.year_min) params.set('year_min', filters.year_min);
  if (filters.parking_ok) params.set('parking', '1');
  if (filters.pets_ok) params.set('pets', '1');
  if (filters.furnished) params.set('furnished', filters.furnished);
  if (filters.open_house) params.set('open_house', '1');
  if (filters.new_construction) params.set('new_construction', '1');
  if (filters.listed_within) params.set('listed_within', filters.listed_within);
  if (filters.source) params.set('source', filters.source);
  if (sort && sort !== 'newest') params.set('sort', sort);
  if (view && view !== 'list') params.set('view', view);
  return params;
};

export const activeFilterCount = (filters) => {
  let count = 0;
  [
    filters.q,
    filters.price_min,
    filters.price_max,
    filters.beds_min,
    filters.baths_min,
    filters.area_min,
    filters.area_max,
    filters.lot_min,
    filters.year_min,
    filters.furnished,
    filters.listed_within,
    filters.source,
    filters.property_type,
    filters.city,
  ].forEach((value) => {
    if (value !== '' && value !== null && value !== undefined && value !== false) count += 1;
  });
  if (filters.status_scope === 'sold') count += 1;
  if (filters.parking_ok) count += 1;
  if (filters.pets_ok) count += 1;
  if (filters.open_house) count += 1;
  if (filters.new_construction) count += 1;
  return count;
};

export const describeFilters = (filters) => {
  const parts = [];
  if (filters.q) parts.push(filters.q);
  if (filters.city) parts.push(filters.city);
  if (filters.listing_type === 'rent') parts.push('for rent');
  if (filters.listing_type === 'sale') parts.push('for sale');
  if (filters.status_scope === 'sold') parts.push('sold');
  if (filters.property_type) parts.push(filters.property_type.replace(/_/g, ' '));
  if (filters.beds_min) parts.push(`${filters.beds_min}+ beds`);
  if (filters.baths_min) parts.push(`${filters.baths_min}+ baths`);
  if (filters.price_max) parts.push(`under $${Number(filters.price_max).toLocaleString('en-US')}`);
  if (filters.price_min) parts.push(`over $${Number(filters.price_min).toLocaleString('en-US')}`);
  if (filters.pets_ok) parts.push('pets allowed');
  return parts.length ? parts.join(' · ') : 'All homes';
};

export const sortSpec = (sort) => SORT_TO_QUERY[sort] || SORT_TO_QUERY.newest;

export const searchListings = async ({ filters, sort = 'newest', cursor, limit = PAGE_SIZE, cities = [] }) => {
  const page = await base44.entities.Listing.filter(buildQuery(filters, cities), {
    sort: sortSpec(sort),
    limit,
    cursor,
  });
  return {
    items: page?.items || [],
    next_cursor: page?.next_cursor ?? null,
    has_more: Boolean(page?.has_more),
  };
};

export const getListing = (id) => base44.entities.Listing.get(id);

export const getProperty = (id) => base44.entities.Property.get(id);

export const registerListingView = async (listingId, currentViews) => {
  try {
    await base44.entities.Listing.update(listingId, { views: Number(currentViews || 0) + 1 });
  } catch (error) {
    /* view counts are best effort and must never block the page */
  }
};

export const cityOptions = async () => {
  try {
    const result = await base44.entities.Listing.list({ distinct: 'city' });
    return (result?.items || []).filter(Boolean).sort();
  } catch (error) {
    return [];
  }
};

export const notifyInquiryEvent = (kind, record_id) =>
  base44.functions.invoke('notifyInquiryEvent', { kind, record_id });

export const notifyListingPublished = (listing_id) =>
  base44.functions.invoke('notifyListingPublished', { listing_id });

export const displayAddress = (listing) => {
  if (!listing) return '—';
  if (listing.address_visibility === 'approximate') {
    return [listing.neighborhood, listing.city, listing.state].filter(Boolean).join(', ');
  }
  return [listing.address, listing.city, listing.state, listing.postal_code].filter(Boolean).join(', ');
};

export const similarListings = async (listing, limit = 4) => {
  if (!listing?.city) return [];
  const result = await base44.entities.Listing.filter(
    {
      city: listing.city,
      listing_type: listing.listing_type || 'sale',
      ...availableClause(),
    },
    { sort: '-published_date', limit: limit + 1 },
  );
  return (result?.items || []).filter((item) => item.id !== listing.id).slice(0, limit);
};