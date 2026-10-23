import { base44 } from '@/api/base44Client';
import { SAMPLE_LISTINGS } from '@/lib/sampleListings';
import { listingSearchFields } from '@/lib/listingFields';

const propertyFrom = (item, owner) => ({
  title: item.title,
  property_type: item.property_type,
  address: item.address,
  address_visibility: 'full',
  neighborhood: item.neighborhood || '',
  city: item.city,
  state: item.state,
  postal_code: item.postal_code || '',
  latitude: item.lat,
  longitude: item.lng,
  bedrooms: item.bedrooms,
  bathrooms: item.bathrooms,
  area_sqft: item.area_sqft,
  lot_sqft: item.lot_sqft,
  year_built: item.year_built,
  parking: item.parking || '',
  furnished: item.furnished || undefined,
  pets_allowed: item.pets_allowed || undefined,
  amenities: item.amenities || [],
  description: item.description,
  owner_id: owner.id,
  owner_name: item.owner_name,
  owner_role: item.owner_role,
  ownership_verified: false,
  is_demo: true,
});

const listingFrom = (item, owner, propertyId) => ({
  ...listingSearchFields(item),
  under_offer: item.status === 'under_offer',
  status: item.status === 'under_offer' ? 'published' : item.status,
  property_id: propertyId,
  title: item.title,
  description: item.description,
  listing_type: item.listing_type,
  price: item.price,
  currency: item.currency || 'USD',
  rent_frequency: item.rent_frequency || undefined,
  deposit: item.deposit,
  lease_months: item.lease_months,
  available_from: item.listing_type === 'rent' ? '2026-11-01' : undefined,
  accepts_applications: Boolean(item.accepts_applications),
  open_house_at: item.featured ? '2026-10-24T11:00' : undefined,
  verification_status: 'none',
  published_date: item.published_date,
  featured: Boolean(item.featured),
  images: item.images,
  views: 0,
  source: 'owner',
  owner_id: owner.id,
  owner_name: item.owner_name,
  owner_role: item.owner_role,
  property_type: item.property_type,
  bedrooms: item.bedrooms,
  bathrooms: item.bathrooms,
  area_sqft: item.area_sqft,
  lot_sqft: item.lot_sqft,
  year_built: item.year_built,
  parking: item.parking || '',
  furnished: item.furnished || undefined,
  pets_allowed: item.pets_allowed || undefined,
  amenities: item.amenities || [],
  address: item.address,
  address_visibility: 'full',
  neighborhood: item.neighborhood || '',
  city: item.city,
  state: item.state,
  postal_code: item.postal_code || '',
  latitude: item.lat,
  longitude: item.lng,
  is_demo: true,
});

export const demoListingCount = async () => {
  try {
    return await base44.entities.Listing.count({ is_demo: true });
  } catch (error) {
    return 0;
  }
};

export const seedDemoListings = async (owner) => {
  if (!owner?.id) throw new Error('You must be signed in to load demonstration listings.');

  const existing = await base44.entities.Listing.filter({ is_demo: true }, { limit: 1 });
  if ((existing?.items || []).length) {
    return { created: 0, skipped: true };
  }

  const properties = SAMPLE_LISTINGS.map((item) => propertyFrom(item, owner));
  const createdProperties = await base44.entities.Property.bulkCreate(properties);
  const propertyIds = (createdProperties || []).map((record) => record.id);

  const listings = SAMPLE_LISTINGS.map((item, index) => listingFrom(item, owner, propertyIds[index]));
  const createdListings = await base44.entities.Listing.bulkCreate(listings);

  return { created: (createdListings || []).length, skipped: false };
};

export const removeDemoListings = async () => {
  await base44.entities.Listing.deleteMany({ is_demo: true });
  await base44.entities.Property.deleteMany({ is_demo: true });
  return true;
};