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
  description: item.description,
  owner_id: 'owner-1',
  owner_name: item.owner_name || 'Elena Rostova',
  owner_role: item.owner_role || 'owner',
  ownership_verified: true,
  is_demo: true,
}));

const DEFAULT_USER = {
  id: 'demo-user-1',
  email: 'eric@dwellmark.example',
  full_name: 'Eric Admin',
  role: 'admin',
  phone: '+1 (512) 555-0100',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
};

// Local storage helper
const storage = {
  get(key, fallback) {
    if (typeof window === 'undefined') return fallback;
    try {
      const val = window.localStorage.getItem(`dm_${key}`);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, val) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(`dm_${key}`, JSON.stringify(val));
    } catch {
      // storage quota or private browsing safe
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

function createEntityStore(storageKey, initialData) {
  const getStore = () => {
    const data = storage.get(storageKey, initialData);
    return data;
  };
  const saveStore = (data) => storage.set(storageKey, data);

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
      const index = all.findIndex((item) => item.id === id);
      if (index === -1) return updates;
      all[index] = { ...all[index], ...updates };
      saveStore(all);
      return all[index];
    },

    async updateMany(query, updates) {
      const all = getStore();
      let updatedCount = 0;
      all.forEach((item, index) => {
        if (matchesQuery(item, query)) {
          all[index] = { ...item, ...updates };
          updatedCount++;
        }
      });
      saveStore(all);
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

    subscribe() {
      return () => {};
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
            return { file_url: URL.createObjectURL(file) };
          }
          return { file_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' };
        },
        async UploadPrivateFile({ file }) {
          if (file instanceof File || file instanceof Blob) {
            return { file_url: URL.createObjectURL(file) };
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
