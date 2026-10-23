/**
 * Field helpers shared by the listing editor, the demonstration data seeder and search.
 * Values that search needs as a single-field comparison are derived and stored on the
 * listing when it is written, so no query has to combine several fields.
 */

export const buildSearchText = (source = {}) => {
  const parts = [
    source.title,
    source.address,
    source.neighborhood,
    source.city,
    source.state,
    source.postal_code,
    source.description,
    source.property_type,
    (source.amenities || []).join(' '),
    source.parking,
    source.owner_name,
  ];
  return parts.filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
};

export const petsOk = (petsAllowed) => Boolean(petsAllowed) && petsAllowed !== 'no_pets';

export const parkingOk = (parking, amenities = []) =>
  Boolean(
    (parking && String(parking).trim()) ||
      amenities.includes('Parking included') ||
      amenities.includes('Garage'),
  );

export const listingSearchFields = (source = {}) => ({
  search_text: buildSearchText(source),
  pets_ok: petsOk(source.pets_allowed),
  parking_ok: parkingOk(source.parking, source.amenities || []),
});

/** The badge a listing should show: an under-offer listing stays published. */
export const displayStatus = (listing) => {
  if (!listing) return 'published';
  if (listing.under_offer) return 'under_offer';
  return listing.status || 'published';
};

/** A saved-home snapshot renders with the same card as a live listing. */
export const snapshotToListing = (record) => ({
  id: record.listing_id || record.id,
  title: record.listing_title || 'Saved home',
  price: record.listing_price,
  currency: record.listing_currency || 'USD',
  listing_type: record.listing_type || 'sale',
  rent_frequency: record.listing_rent_frequency,
  city: record.listing_city,
  state: record.listing_state,
  address: record.listing_address,
  property_type: record.listing_property_type,
  bedrooms: record.listing_bedrooms,
  bathrooms: record.listing_bathrooms,
  area_sqft: record.listing_area_sqft,
  images: record.listing_image ? [record.listing_image] : [],
  status: record.listing_status || 'published',
  under_offer: Boolean(record.listing_under_offer),
  published_date: record.listing_published_date,
  is_demo: Boolean(record.listing_is_demo),
  is_snapshot: true,
});

export const favoriteSnapshot = (listing) => ({
  listing_title: listing.title,
  listing_price: listing.price,
  listing_currency: listing.currency || 'USD',
  listing_type: listing.listing_type,
  listing_rent_frequency: listing.rent_frequency,
  listing_city: listing.city,
  listing_state: listing.state,
  listing_address: listing.address,
  listing_property_type: listing.property_type,
  listing_bedrooms: listing.bedrooms,
  listing_bathrooms: listing.bathrooms,
  listing_area_sqft: listing.area_sqft,
  listing_image: listing.images?.[0] || null,
  listing_status: listing.status,
  listing_under_offer: Boolean(listing.under_offer),
  listing_published_date: listing.published_date,
  listing_is_demo: Boolean(listing.is_demo),
});