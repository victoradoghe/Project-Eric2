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
  owner_id: 'agent-1',
  owner_name: item.owner_name || 'Elena Rostova',
  owner_role: item.owner_role || 'agent',
  agency_name: item.agency_name || 'Dwellmark Premier',
  ownership_verified: true,
  is_demo: true,
}));

const INITIAL_AGENCIES = [
  {
    id: 'agency-1',
    name: 'Dwellmark Premier',
    city: 'Austin',
    state: 'TX',
    address: '100 Congress Ave, Suite 1200, Austin, TX 78701',
    phone: '+1 (512) 555-0199',
    email: 'premier@dwellmark.example',
    description: 'Premier residential sales, modern estates, and downtown high-rise condominiums across Greater Austin.',
    verified: true,
    created_date: '2025-01-10T10:00:00Z',
  },
  {
    id: 'agency-2',
    name: 'Austin Metro Realty',
    city: 'Austin',
    state: 'TX',
    address: '1504 S Congress Ave, Austin, TX 78704',
    phone: '+1 (512) 555-0144',
    email: 'contact@austinmetro.example',
    description: 'Specializing in Zilker, Bouldin Creek, East Austin, and vibrant urban neighborhood properties.',
    verified: true,
    created_date: '2025-02-14T10:00:00Z',
  },
  {
    id: 'agency-3',
    name: 'Lone Star Living',
    city: 'Dallas',
    state: 'TX',
    address: '2200 Ross Ave, Dallas, TX 75201',
    phone: '+1 (214) 555-0188',
    email: 'info@lonestarliving.example',
    description: 'Boutique brokerage representing architectural homes, historic bungalows, and luxury leases.',
    verified: true,
    created_date: '2025-03-01T10:00:00Z',
  },
];

const INITIAL_AGENTS = [
  {
    id: 'agent-1',
    user_id: 'user-agent-1',
    display_name: 'Elena Rostova',
    agency_name: 'Dwellmark Premier',
    agency_id: 'agency-1',
    city: 'Austin',
    state: 'TX',
    phone: '+1 (512) 555-0121',
    email: 'elena@dwellmark.example',
    photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    license_number: 'TX-724189',
    years_experience: 11,
    service_areas: ['Downtown Austin', 'Zilker', 'Barton Hills', 'Tarrytown', 'West Lake Hills'],
    specialties: ['Luxury Homes', 'Waterfront', 'Relocation', 'High-Rise Condos'],
    bio: 'With over a decade of luxury real estate advisory in Austin, Elena helps buyers, sellers, and investors find exceptional properties with confidence.',
    verified: true,
    verification_status: 'verified',
    is_demo: true,
    created_date: '2025-01-15T08:00:00Z',
  },
  {
    id: 'agent-2',
    user_id: 'user-agent-2',
    display_name: 'Marcus Chen',
    agency_name: 'Austin Metro Realty',
    agency_id: 'agency-2',
    city: 'Austin',
    state: 'TX',
    phone: '+1 (512) 555-0177',
    email: 'marcus@austinmetro.example',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    license_number: 'TX-689320',
    years_experience: 8,
    service_areas: ['South Congress', 'Bouldin', 'Travis Heights', 'East Austin', 'Mueller'],
    specialties: ['Modern Bungalows', 'Urban Infill', 'First-Time Buyers', 'New Construction'],
    bio: 'Marcus combines rigorous neighborhood market analysis with personalized search curation to find dream urban residences.',
    verified: true,
    verification_status: 'verified',
    is_demo: true,
    created_date: '2025-02-01T08:00:00Z',
  },
  {
    id: 'agent-3',
    user_id: 'user-agent-3',
    display_name: 'Sarah Jenkins',
    agency_name: 'Dwellmark Premier',
    agency_id: 'agency-1',
    city: 'Austin',
    state: 'TX',
    phone: '+1 (512) 555-0133',
    email: 'sarah.j@dwellmark.example',
    photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    license_number: 'TX-810442',
    years_experience: 6,
    service_areas: ['Domain', 'North Austin', 'Round Rock', 'Cedar Park'],
    specialties: ['Suburban Homes', 'Relocation', 'Rental Investments', 'Single Family'],
    bio: 'Sarah is passionate about guiding families and tech professionals to neighborhood communities that balance lifestyle, schools, and commute.',
    verified: true,
    verification_status: 'verified',
    is_demo: true,
    created_date: '2025-02-10T08:00:00Z',
  },
  {
    id: 'agent-4',
    user_id: 'user-agent-4',
    display_name: 'David Vance',
    agency_name: 'Lone Star Living',
    agency_id: 'agency-3',
    city: 'Dallas',
    state: 'TX',
    phone: '+1 (214) 555-0155',
    email: 'david@lonestarliving.example',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    license_number: 'TX-590214',
    years_experience: 14,
    service_areas: ['Uptown Dallas', 'Preston Hollow', 'Lakewood', 'Highland Park'],
    specialties: ['Architectural Estates', 'Historic Preservation', 'Land Parcels'],
    bio: 'David brings 14 years of premier property transaction expertise, specializing in historic restorations and bespoke estate developments.',
    verified: true,
    verification_status: 'verified',
    is_demo: true,
    created_date: '2025-02-20T08:00:00Z',
  },
];

const INITIAL_REVIEWS = [
  { id: 'rev-1', agent_profile_id: 'agent-1', rating: 5, client_name: 'Jonathan Miller', comment: 'Elena was extraordinary throughout the entire purchase.', created_date: '2026-09-01T12:00:00Z' },
  { id: 'rev-2', agent_profile_id: 'agent-1', rating: 5, client_name: 'Claire Dupont', comment: 'Flawless communication and negotiated a fantastic rate.', created_date: '2026-09-12T12:00:00Z' },
  { id: 'rev-3', agent_profile_id: 'agent-2', rating: 5, client_name: 'Tariq Al-Mansoor', comment: 'Marcus knows every street in East Austin inside out.', created_date: '2026-08-20T12:00:00Z' },
  { id: 'rev-4', agent_profile_id: 'agent-2', rating: 4, client_name: 'Amanda Brooks', comment: 'Very responsive and patient with all our questions.', created_date: '2026-09-15T12:00:00Z' },
  { id: 'rev-5', agent_profile_id: 'agent-3', rating: 5, client_name: 'Kevin Zhao', comment: 'Found us our dream home near the Arboretum in record time!', created_date: '2026-09-10T12:00:00Z' },
  { id: 'rev-6', agent_profile_id: 'agent-4', rating: 5, client_name: 'Rachel Hughes', comment: 'Top tier knowledge of Dallas architectural estates.', created_date: '2026-08-05T12:00:00Z' },
];

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
    let data = storage.get(storageKey, initialData);
    if (storageKey === 'agents' && Array.isArray(data)) {
      data = data.map((agent) => ({
        ...agent,
        photo_url: agent.photo_url || agent.avatar_url,
        verification_status: agent.verification_status || (agent.verified ? 'verified' : 'unverified'),
        service_areas: Array.isArray(agent.service_areas)
          ? agent.service_areas
          : typeof agent.service_areas === 'string'
            ? agent.service_areas.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        specialties: Array.isArray(agent.specialties)
          ? agent.specialties
          : typeof agent.specialties === 'string'
            ? agent.specialties.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
      }));
    }
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
  const agencyStore = createEntityStore('agencies', INITIAL_AGENCIES);
  const agentStore = createEntityStore('agents', INITIAL_AGENTS);
  const reviewStore = createEntityStore('reviews', INITIAL_REVIEWS);
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
      body: 'Explore Austin & Texas homes, calculate your mortgage, or browse vetted local agents.',
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
      Agency: agencyStore,
      AgentProfile: agentStore,
      Review: reviewStore,
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
