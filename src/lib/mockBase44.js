import { SAMPLE_LISTINGS } from '@/lib/sampleListings';
import { listingSearchFields } from '@/lib/listingFields';
import { isAdminAccount, withAdminRole } from '@/lib/adminAccounts';

// Normalize sample listings so all queryable & display fields are present
const INITIAL_LISTINGS = SAMPLE_LISTINGS.map((item, idx) => {
  const norm = {
    ...item,
    id: item.id || `demo-listing-${idx + 1}`,
    property_id: `prop-${item.id || idx + 1}`,
    latitude: item.lat ?? item.latitude ?? 30.2672,
    longitude: item.lng ?? item.longitude ?? -97.7431,
    lat: item.lat ?? item.latitude ?? 30.2672,
    lng: item.lng ?? item.longitude ?? -97.7431,
    published_date: item.published_date || new Date(Date.now() - idx * 86400000).toISOString(),
    views: item.views ?? (45 + idx * 7),
    featured: Boolean(item.featured),
    under_offer: item.status === 'under_offer',
    status: item.status === 'under_offer' ? 'published' : (item.status || 'published'),
    is_demo: true,
    ...listingSearchFields(item),
  };
  return norm;
});

const INITIAL_PROPERTIES = INITIAL_LISTINGS.map((item) => ({
  id: item.property_id,
  listing_id: item.id,
  title: item.title,
  property_type: item.property_type,
  address: item.address,
  neighborhood: item.neighborhood || '',
  city: item.city,
  state: item.state,
  postal_code: item.postal_code || '',
  latitude: item.latitude,
  longitude: item.longitude,
  bedrooms: item.bedrooms,
  bathrooms: item.bathrooms,
  area_sqft: item.area_sqft,
  lot_sqft: item.lot_sqft,
  year_built: item.year_built,
  parking: item.parking,
  amenities: item.amenities || [],
  images: item.images || [],
  description: item.description,
  owner_id: 'owner-1',
  owner_name: item.owner_name || 'Elena Rostova',
  owner_role: item.owner_role || 'owner',
  ownership_verified: true,
  is_demo: true,
}));

const INITIAL_IMAGES_BY_ID = new Map(
  INITIAL_LISTINGS.map((item) => [item.id, item.images || []]),
);

const DEFAULT_USER = {
  id: 'demo-user-1',
  email: 'eric@dwellmark.example',
  full_name: 'Eric Admin',
  role: 'admin',
  phone: '+1 (512) 555-0100',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
};

const isDeadBlobUrl = (url) => typeof url === 'string' && url.startsWith('blob:');

function sanitizeListingRecord(record) {
  if (!record || typeof record !== 'object') return record;
  if (!Array.isArray(record.images)) return record;
  const hasDeadBlob = record.images.some(isDeadBlobUrl);
  if (!hasDeadBlob) return record;
  const validImages = record.images.filter((url) => url && !isDeadBlobUrl(url));
  const fallback = INITIAL_IMAGES_BY_ID.get(record.id) || [];
  return {
    ...record,
    images: validImages.length ? validImages : fallback,
  };
}

// Convert uploaded File/Blob to a persistent compressed Data URL so it survives
// tab switches, tab closes, and browser restarts without exceeding localStorage quota.
async function fileToPersistentDataUrl(file) {
  const rawDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });

  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !file.type?.startsWith('image/') ||
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif'
  ) {
    return rawDataUrl;
  }

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = (err) => reject(err);
      el.src = rawDataUrl;
    });

    const maxDim = 1200;
    let width = img.naturalWidth || img.width || maxDim;
    let height = img.naturalHeight || img.height || 900;
    if (width > maxDim || height > maxDim) {
      const scale = Math.min(maxDim / width, maxDim / height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return rawDataUrl;

    ctx.drawImage(img, 0, 0, width, height);
    let compressed = canvas.toDataURL('image/jpeg', 0.8);

    // Ensure large photos are compact enough that multiple uploads never hit localStorage quota
    if (compressed.length > 220000) {
      const smallerScale = Math.min(900 / width, 900 / height, 1);
      canvas.width = Math.max(1, Math.round(width * smallerScale));
      canvas.height = Math.max(1, Math.round(height * smallerScale));
      const ctx2 = canvas.getContext('2d');
      if (ctx2) {
        ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
        compressed = canvas.toDataURL('image/jpeg', 0.72);
      }
    }

    return compressed.length < rawDataUrl.length || rawDataUrl.length > 180000
      ? compressed
      : rawDataUrl;
  } catch {
    return rawDataUrl;
  }
}

const memoryFallback = new Map();
const storeSubscribers = new Map();

function notifySubscribers(storageKey) {
  const subs = storeSubscribers.get(storageKey);
  if (!subs) return;
  subs.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore subscriber errors
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (!event.key || !event.key.startsWith('dm_')) return;
    const key = event.key.slice(3);
    memoryFallback.delete(key);
    notifySubscribers(key);
  });
}

// Local storage helper
const storage = {
  get(key, fallback) {
    if (typeof window === 'undefined') return fallback;
    try {
      const val = window.localStorage.getItem(`dm_${key}`);
      if (val) return JSON.parse(val);
      if (memoryFallback.has(key)) return memoryFallback.get(key);
      return fallback;
    } catch {
      return memoryFallback.get(key) ?? fallback;
    }
  },
  set(key, val) {
    memoryFallback.set(key, val);
    if (typeof window === 'undefined') return;
    const serialized = JSON.stringify(val);
    try {
      window.localStorage.setItem(`dm_${key}`, serialized);
    } catch {
      try {
        window.localStorage.removeItem('dm_audit_logs');
        window.localStorage.removeItem('dwellmark_recently_viewed');
        window.localStorage.setItem(`dm_${key}`, serialized);
      } catch {
        // memoryFallback still holds the latest state for this session
      }
    }
  },
};

function matchesQuery(item, query = {}) {
  if (!query || typeof query !== 'object') return true;

  for (const [key, expected] of Object.entries(query)) {
    if (key === '$or' && Array.isArray(expected)) {
      const anyMatch = expected.some((subQuery) => matchesQuery(item, subQuery));
      if (!anyMatch) return false;
      continue;
    }

    const actual = item[key];

    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if (expected.$gte !== undefined && (actual === undefined || actual < expected.$gte)) {
        return false;
      }
      if (expected.$lte !== undefined && (actual === undefined || actual > expected.$lte)) {
        return false;
      }
      if (expected.$gt !== undefined && (actual === undefined || actual <= expected.$gt)) {
        return false;
      }
      if (expected.$lt !== undefined && (actual === undefined || actual >= expected.$lt)) {
        return false;
      }
      if (expected.$regex !== undefined) {
        const flags = expected.$options || '';
        const re = new RegExp(expected.$regex, flags);
        if (!re.test(String(actual ?? ''))) {
          return false;
        }
      }
      if (expected.$in !== undefined && Array.isArray(expected.$in)) {
        if (!expected.$in.includes(actual)) {
          return false;
        }
      }
      continue;
    }

    if (expected !== undefined && actual !== expected) {
      if (typeof actual === 'string' && typeof expected === 'string') {
        if (actual.toLowerCase() !== expected.toLowerCase()) return false;
      } else {
        return false;
      }
    }
  }

  return true;
}

function sortItems(items, sortExpr) {
  if (!sortExpr) return items;
  const isDesc = sortExpr.startsWith('-');
  const field = isDesc ? sortExpr.slice(1) : sortExpr;

  return [...items].sort((a, b) => {
    let va = a[field];
    let vb = b[field];
    if (va === undefined || va === null) return 1;
    if (vb === undefined || vb === null) return -1;

    if (typeof va === 'string' && typeof vb === 'string') {
      return isDesc ? vb.localeCompare(va) : va.localeCompare(vb);
    }
    return isDesc ? (vb > va ? 1 : vb < va ? -1 : 0) : (va > vb ? 1 : va < vb ? -1 : 0);
  });
}

function syncListingImagesAcrossStores(listingRecord) {
  if (!listingRecord?.id || !Array.isArray(listingRecord.images)) return;
  const images = listingRecord.images;
  const cover = images[0] || null;

  // Sync linked Property record
  const properties = storage.get('properties', INITIAL_PROPERTIES);
  if (Array.isArray(properties)) {
    let propChanged = false;
    const nextProps = properties.map((prop) => {
      if (
        (listingRecord.property_id && prop.id === listingRecord.property_id) ||
        prop.listing_id === listingRecord.id
      ) {
        if (JSON.stringify(prop.images || []) !== JSON.stringify(images)) {
          propChanged = true;
          return { ...prop, images };
        }
      }
      return prop;
    });
    if (propChanged) {
      storage.set('properties', nextProps);
      notifySubscribers('properties');
    }
  }

  // Sync Favorite snapshots
  const favorites = storage.get('favorites', []);
  if (Array.isArray(favorites) && favorites.length) {
    let favChanged = false;
    const nextFavs = favorites.map((fav) => {
      if (fav.listing_id === listingRecord.id && fav.listing_image !== cover) {
        favChanged = true;
        return { ...fav, listing_image: cover };
      }
      return fav;
    });
    if (favChanged) {
      storage.set('favorites', nextFavs);
      notifySubscribers('favorites');
    }
  }

  // Sync Recently Viewed cache
  if (typeof window !== 'undefined') {
    try {
      const rawRv = window.localStorage.getItem('dwellmark_recently_viewed');
      if (rawRv) {
        const parsedRv = JSON.parse(rawRv);
        if (Array.isArray(parsedRv)) {
          let rvChanged = false;
          const nextRv = parsedRv.map((entry) => {
            if (entry?.id === listingRecord.id) {
              const nextImages = cover ? [cover] : [];
              if (JSON.stringify(entry.images || []) !== JSON.stringify(nextImages)) {
                rvChanged = true;
                return { ...entry, images: nextImages };
              }
            }
            return entry;
          });
          if (rvChanged) {
            window.localStorage.setItem('dwellmark_recently_viewed', JSON.stringify(nextRv));
          }
        }
      }
    } catch {
      // ignore recently viewed sync errors
    }
  }
}

function syncPropertyImagesToListing(propertyRecord) {
  if (!propertyRecord?.id || !Array.isArray(propertyRecord.images)) return;
  const listings = storage.get('listings', INITIAL_LISTINGS);
  if (!Array.isArray(listings)) return;
  let changed = false;
  let updatedListing = null;
  const nextListings = listings.map((item) => {
    if (item.property_id === propertyRecord.id || item.id === propertyRecord.listing_id) {
      if (JSON.stringify(item.images || []) !== JSON.stringify(propertyRecord.images)) {
        changed = true;
        updatedListing = { ...item, images: propertyRecord.images };
        return updatedListing;
      }
    }
    return item;
  });
  if (changed) {
    storage.set('listings', nextListings);
    notifySubscribers('listings');
    if (updatedListing) syncListingImagesAcrossStores(updatedListing);
  }
}

function createEntityStore(storageKey, initialData) {
  const getStore = () => {
    const data = storage.get(storageKey, initialData);
    if (!Array.isArray(data)) return initialData;
    if (storageKey === 'listings' || storageKey === 'properties') {
      let healed = false;
      const cleaned = data.map((item) => {
        const next = sanitizeListingRecord(item);
        if (next !== item) healed = true;
        return next;
      });
      if (healed) {
        storage.set(storageKey, cleaned);
      }
      return cleaned;
    }
    return data;
  };
  const saveStore = (data) => {
    storage.set(storageKey, data);
    notifySubscribers(storageKey);
  };

  return {
    async filter(query = {}, options = {}) {
      const all = getStore();
      let matched = all.filter((item) => matchesQuery(item, query));
      if (options.sort) {
        matched = sortItems(matched, options.sort);
      }
      const limit = options.limit || 50;
      const cursor = options.cursor ? Number(options.cursor) : 0;
      const paged = matched.slice(cursor, cursor + limit);
      const next_cursor = cursor + limit < matched.length ? cursor + limit : null;

      return {
        items: paged,
        has_more: Boolean(next_cursor),
        next_cursor,
        total: matched.length,
      };
    },

    async list(options = {}) {
      const all = getStore();
      if (options.distinct) {
        const field = options.distinct;
        const set = new Set();
        all.forEach((item) => {
          if (item[field]) set.add(item[field]);
        });
        return { items: Array.from(set).sort() };
      }
      return { items: all };
    },

    async get(id) {
      const all = getStore();
      const found = all.find((item) => item.id === id || item.listing_id === id);
      if (!found) {
        // Return null instead of rejecting so views don't break
        return null;
      }
      return { ...found };
    },

    async count(query = {}) {
      const all = getStore();
      return all.filter((item) => matchesQuery(item, query)).length;
    },

    async create(record) {
      const all = getStore();
      const id = record.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const created = {
        ...record,
        id,
        created_date: record.created_date || new Date().toISOString(),
      };
      all.unshift(created);
      saveStore(all);
      if (storageKey === 'listings') syncListingImagesAcrossStores(created);
      if (storageKey === 'properties') syncPropertyImagesToListing(created);
      return created;
    },

    async bulkCreate(records = []) {
      const all = getStore();
      const createdList = records.map((r, i) => ({
        ...r,
        id: r.id || `rec-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        created_date: r.created_date || new Date().toISOString(),
      }));
      const next = [...createdList, ...all];
      saveStore(next);
      return createdList;
    },

    async update(id, updates) {
      const all = getStore();
      const index = all.findIndex((item) => item.id === id || item.listing_id === id);
      if (index === -1) return updates;
      const updated = {
        ...all[index],
        ...updates,
        updated_date: new Date().toISOString(),
      };
      all[index] = updated;
      saveStore(all);
      if (storageKey === 'listings') syncListingImagesAcrossStores(updated);
      if (storageKey === 'properties') syncPropertyImagesToListing(updated);
      return updated;
    },

    async updateMany(query, updates) {
      const all = getStore();
      let updatedCount = 0;
      const updatedRecords = [];
      all.forEach((item, index) => {
        if (matchesQuery(item, query)) {
          all[index] = { ...item, ...updates, updated_date: new Date().toISOString() };
          updatedRecords.push(all[index]);
          updatedCount++;
        }
      });
      saveStore(all);
      if (storageKey === 'listings') updatedRecords.forEach(syncListingImagesAcrossStores);
      if (storageKey === 'properties') updatedRecords.forEach(syncPropertyImagesToListing);
      return { updated: updatedCount };
    },

    async delete(id) {
      const all = getStore();
      const next = all.filter((item) => item.id !== id);
      saveStore(next);
      return { success: true };
    },

    async deleteMany(query) {
      const all = getStore();
      const next = all.filter((item) => !matchesQuery(item, query));
      saveStore(next);
      return { success: true };
    },

    async aggregate({ query = {}, groupBy, avg, sum } = {}) {
      const all = getStore().filter((item) => matchesQuery(item, query));
      const groups = {};

      all.forEach((item) => {
        const key = item[groupBy] || 'unknown';
        if (!groups[key]) groups[key] = { count: 0, sum: 0, items: [] };
        groups[key].count += 1;
        if (sum && typeof item[sum] === 'number') groups[key].sum += item[sum];
        if (avg && typeof item[avg] === 'number') groups[key].sum += item[avg];
        groups[key].items.push(item);
      });

      const rows = Object.entries(groups).map(([groupKey, data]) => {
        const row = { [groupBy]: groupKey, count: data.count };
        if (sum) row[`sum_${sum}`] = data.sum;
        if (avg) row[`avg_${avg}`] = data.count ? Number((data.sum / data.count).toFixed(1)) : 0;
        return row;
      });

      return { rows };
    },

    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      if (!storeSubscribers.has(storageKey)) {
        storeSubscribers.set(storageKey, new Set());
      }
      const subs = storeSubscribers.get(storageKey);
      subs.add(listener);
      return () => {
        subs.delete(listener);
      };
    },
  };
}

export function createMockBase44Client() {
  const listingStore = createEntityStore('listings', INITIAL_LISTINGS);
  const propertyStore = createEntityStore('properties', INITIAL_PROPERTIES);
  const favoriteStore = createEntityStore('favorites', []);
  const inquiryStore = createEntityStore('inquiries', []);
  const viewingStore = createEntityStore('viewing_requests', []);
  const appStore = createEntityStore('rental_applications', []);
  const messageStore = createEntityStore('messages', []);
  const notificationStore = createEntityStore('notifications', [
    {
      id: 'notif-1',
      user_id: DEFAULT_USER.id,
      type: 'system',
      title: 'Welcome to Dwellmark',
      body: 'Explore Austin & Texas homes, calculate your mortgage, or estimate your home value.',
      read: false,
      created_date: new Date().toISOString(),
    },
  ]);
  const searchStore = createEntityStore('saved_searches', []);
  const valuationStore = createEntityStore('valuations', []);
  const contactStore = createEntityStore('contacts', []);
  const reportStore = createEntityStore('reports', []);
  const adminMsgStore = createEntityStore('admin_messages', []);
  const auditStore = createEntityStore('audit_logs', []);
  const userStore = createEntityStore('users', [DEFAULT_USER]);

  return {
    app: {
      async getPublicSettings() {
        return {
          id: 'dwellmark-marketplace',
          public_settings: {
            app_name: 'Dwellmark',
            contact_email: 'hello@dwellmark.example',
            brand_phone: '+1 (235) 222-5050',
          },
        };
      },
    },

    auth: {
      async me() {
        const u = storage.get('auth_user', DEFAULT_USER);
        return withAdminRole(u);
      },
      async isAuthenticated() {
        return Boolean(storage.get('auth_user', DEFAULT_USER));
      },
      async loginViaEmailPassword(email, password) {
        const admin = isAdminAccount(email, password);
        const user = withAdminRole({
          ...DEFAULT_USER,
          email: email || DEFAULT_USER.email,
          full_name: admin ? 'Admin' : DEFAULT_USER.full_name,
          role: admin ? 'admin' : DEFAULT_USER.role,
        });
        storage.set('auth_user', user);
        return user;
      },
      async loginWithProvider(provider) {
        const user = {
          ...DEFAULT_USER,
          full_name: `${provider ? provider.toUpperCase() : 'Google'} User`,
        };
        storage.set('auth_user', user);
        return user;
      },
      async logout(redirectUrl) {
        storage.set('auth_user', null);
        if (redirectUrl && typeof window !== 'undefined') {
          window.location.href = redirectUrl;
        }
      },
      redirectToLogin(redirectUrl) {
        if (typeof window !== 'undefined') {
          window.location.href = `/login${redirectUrl ? `?returnTo=${encodeURIComponent(redirectUrl)}` : ''}`;
        }
      },
      async register(data = {}) {
        const user = {
          ...DEFAULT_USER,
          ...data,
          id: `usr-${Date.now()}`,
        };
        storage.set('auth_user', user);
        return user;
      },
      async resendOtp() {
        return { success: true };
      },
      async verifyOtp() {
        return { success: true };
      },
      async resetPasswordRequest() {
        return { success: true };
      },
      async resetPassword() {
        return { success: true };
      },
      async updateMe(updates = {}) {
        const current = storage.get('auth_user', DEFAULT_USER);
        const updated = { ...current, ...updates };
        storage.set('auth_user', updated);
        return updated;
      },
      setToken() {},
    },

    entities: {
      Listing: listingStore,
      Property: propertyStore,
      Favorite: favoriteStore,
      Inquiry: inquiryStore,
      ViewingRequest: viewingStore,
      RentalApplication: appStore,
      Message: messageStore,
      Notification: notificationStore,
      SavedSearch: searchStore,
      ValuationEstimate: valuationStore,
      ContactMessage: contactStore,
      Report: reportStore,
      AdminMessage: adminMsgStore,
      AuditLog: auditStore,
      User: userStore,
    },

    functions: {
      async invoke(name, args) {
        return { success: true, name, args };
      },
    },

    integrations: {
      Core: {
        async UploadPublicFile({ file }) {
          if (file instanceof File || file instanceof Blob) {
            const file_url = await fileToPersistentDataUrl(file);
            return { file_url };
          }
          if (typeof file === 'string' && file) {
            return { file_url: file };
          }
          return { file_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' };
        },
        async UploadPrivateFile({ file }) {
          if (file instanceof File || file instanceof Blob) {
            const file_url = await fileToPersistentDataUrl(file);
            return { file_url };
          }
          if (typeof file === 'string' && file) {
            return { file_url: file };
          }
          return { file_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' };
        },
        async CreateFileSignedUrl({ file_path }) {
          return { signed_url: file_path };
        },
      },
    },
  };
}
