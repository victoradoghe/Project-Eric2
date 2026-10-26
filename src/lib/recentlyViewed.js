import { resolveImageRef, registerDataImage } from '@/lib/mockBase44';

const KEY = 'dwellmark_recently_viewed';
const LIMIT = 12;

export const getRecentlyViewed = () => {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => ({
      ...entry,
      images: Array.isArray(entry?.images)
        ? entry.images.map((img) => resolveImageRef(img)).filter(Boolean)
        : [],
    }));
  } catch (error) {
    return [];
  }
};

export const addRecentlyViewed = (listing) => {
  if (!listing?.id) return;
  try {
    const rawCover = listing.images?.[0];
    const compactCover = rawCover ? registerDataImage(rawCover) : null;
    const entry = {
      id: listing.id,
      title: listing.title,
      price: listing.price,
      currency: listing.currency || 'USD',
      listing_type: listing.listing_type,
      rent_frequency: listing.rent_frequency,
      city: listing.city,
      state: listing.state,
      address: listing.address,
      property_type: listing.property_type,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      area_sqft: listing.area_sqft,
      images: compactCover ? [compactCover] : [],
      status: listing.status,
      under_offer: Boolean(listing.under_offer),
      published_date: listing.published_date,
      is_demo: Boolean(listing.is_demo),
      viewed_date: new Date().toISOString(),
    };
    const existingRaw = window.localStorage.getItem(KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    const safeExisting = Array.isArray(existing) ? existing : [];
    const next = [entry, ...safeExisting.filter((item) => item.id !== listing.id)].slice(0, LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch (error) {
    /* history is a convenience only */
  }
};

export const clearRecentlyViewed = () => {
  try {
    window.localStorage.removeItem(KEY);
  } catch (error) {
    /* ignore */
  }
};