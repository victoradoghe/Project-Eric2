import { createClient } from '@supabase/supabase-js';
import { SAMPLE_LISTINGS } from '@/lib/sampleListings';
import { listingSearchFields } from '@/lib/listingFields';
import { isAdminAccount, withAdminRole } from '@/lib/adminAccounts';
import { supabaseUrl, supabaseKey, isSupabaseConfigured } from '@/lib/supabase';

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

const INITIAL_LISTINGS_BY_ID = new Map(
  INITIAL_LISTINGS.map((item) => [item.id, item]),
);

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
const isDataImageUrl = (url) => typeof url === 'string' && url.startsWith('data:image/');
const isImageRef = (url) => typeof url === 'string' && url.startsWith('idb:img_');
const IMAGE_LS_PREFIX = 'dm_img_';
const DELETED_LISTINGS_KEY = 'dm_deleted_listings';

// ============================================================================
// Deduplicated Image Store (Memory + localStorage + IndexedDB)
// ============================================================================
const imageMemoryCache = new Map();

function hashImageString(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  const step = Math.max(1, Math.floor(str.length / 4096));
  for (let i = 0; i < str.length; i += step) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `idb:img_${(h2 >>> 0).toString(36)}_${(h1 >>> 0).toString(36)}_${str.length.toString(36)}`;
}

let idbPromise = null;
function openDwellmarkIdb() {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open('dwellmark_storage_v2', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images');
        }
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return idbPromise;
}

async function idbPut(storeName, key, value) {
  const db = await openDwellmarkIdb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbGetAllEntries(storeName) {
  const db = await openDwellmarkIdb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const keysReq = store.getAllKeys();
      const valsReq = store.getAll();
      tx.oncomplete = () => {
        const keys = keysReq.result || [];
        const vals = valsReq.result || [];
        resolve(keys.map((k, idx) => [String(k), vals[idx]]));
      };
      tx.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

function registerDataImage(dataUrl) {
  if (!isDataImageUrl(dataUrl)) return dataUrl;
  const ref = hashImageString(dataUrl);
  imageMemoryCache.set(ref, dataUrl);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${IMAGE_LS_PREFIX}${ref}`, dataUrl);
    } catch {
      // If localStorage is near quota, prune unreferenced image keys and retry
      pruneUnusedLocalStorageImages(ref);
      try {
        window.localStorage.setItem(`${IMAGE_LS_PREFIX}${ref}`, dataUrl);
      } catch {
        // IndexedDB + memoryCache + cloud sync still hold the full image
      }
    }
    idbPut('images', ref, dataUrl);
  }
  return ref;
}

function resolveImageRef(urlOrRef) {
  if (!isImageRef(urlOrRef)) return urlOrRef;
  if (imageMemoryCache.has(urlOrRef)) {
    return imageMemoryCache.get(urlOrRef);
  }
  if (typeof window !== 'undefined') {
    try {
      const fromLs = window.localStorage.getItem(`${IMAGE_LS_PREFIX}${urlOrRef}`);
      if (fromLs && isDataImageUrl(fromLs)) {
        imageMemoryCache.set(urlOrRef, fromLs);
        return fromLs;
      }
    } catch {
      // ignore
    }
  }
  return urlOrRef;
}

function dehydrateRecordImages(record) {
  if (!record || typeof record !== 'object') return record;
  let next = record;
  if (Array.isArray(record._raw_image_refs) && record._raw_image_refs.length) {
    next = { ...next, images: record._raw_image_refs };
    delete next._raw_image_refs;
  } else if (Array.isArray(record.images)) {
    let changed = false;
    const nextImages = record.images.map((img) => {
      if (isDataImageUrl(img)) {
        changed = true;
        return registerDataImage(img);
      }
      return img;
    });
    if (changed) {
      next = { ...next, images: nextImages };
    }
  }
  if (isDataImageUrl(record.listing_image)) {
    next = { ...next, listing_image: registerDataImage(record.listing_image) };
  }
  return next;
}

function hydrateRecordImages(record) {
  if (!record || typeof record !== 'object') return record;
  let next = record;
  const sourceImages =
    Array.isArray(record._raw_image_refs) && record._raw_image_refs.length
      ? record._raw_image_refs
      : record.images;
  if (Array.isArray(sourceImages)) {
    let changed = false;
    let hasUnresolvedRef = false;
    const nextImages = sourceImages
      .map((img) => {
        if (isImageRef(img)) {
          const resolved = resolveImageRef(img);
          if (resolved !== img) {
            changed = true;
            return resolved;
          }
          hasUnresolvedRef = true;
          return null;
        }
        return img;
      })
      .filter(Boolean);
    if (hasUnresolvedRef) {
      const fallback = INITIAL_IMAGES_BY_ID.get(record.id) || [];
      next = {
        ...next,
        images: nextImages.length ? nextImages : fallback,
        _raw_image_refs: sourceImages,
      };
    } else if (changed || record._raw_image_refs || nextImages.length !== sourceImages.length) {
      const fallback = INITIAL_IMAGES_BY_ID.get(record.id) || [];
      next = {
        ...next,
        images: nextImages.length ? nextImages : fallback,
      };
      delete next._raw_image_refs;
    }
  }
  if (isImageRef(record.listing_image)) {
    const resolved = resolveImageRef(record.listing_image);
    next = {
      ...next,
      listing_image: isImageRef(resolved) ? null : resolved,
    };
  }
  return next;
}

function pruneUnusedLocalStorageImages(keepRef) {
  if (typeof window === 'undefined') return;
  try {
    const referenced = new Set();
    if (keepRef) referenced.add(keepRef);
    const rawListings = window.localStorage.getItem('dm_listings');
    if (rawListings) {
      const parsed = JSON.parse(rawListings);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          (item?.images || []).forEach((img) => {
            if (isImageRef(img)) referenced.add(img);
          });
        });
      }
    }
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(IMAGE_LS_PREFIX)) {
        const ref = k.slice(IMAGE_LS_PREFIX.length);
        if (!referenced.has(ref)) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

function sanitizeListingRecord(record) {
  if (!record || typeof record !== 'object') return record;
  const hydrated = hydrateRecordImages(record);
  if (!Array.isArray(hydrated.images)) return hydrated;
  const hasDeadBlob = hydrated.images.some(isDeadBlobUrl);
  if (!hasDeadBlob) return hydrated;
  const validImages = hydrated.images.filter((url) => url && !isDeadBlobUrl(url));
  const fallback = INITIAL_IMAGES_BY_ID.get(hydrated.id) || [];
  return {
    ...hydrated,
    images: validImages.length ? validImages : fallback,
  };
}

// Convert uploaded File/Blob to a persistent compressed Data URL so it survives
// tab switches, tab closes, and browser restarts without exceeding storage quota.
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
    registerDataImage(rawDataUrl);
    return rawDataUrl;
  }

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = (err) => reject(err);
      el.src = rawDataUrl;
    });

    const maxDim = 1100;
    let width = img.naturalWidth || img.width || maxDim;
    let height = img.naturalHeight || img.height || 825;
    if (width > maxDim || height > maxDim) {
      const scale = Math.min(maxDim / width, maxDim / height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      registerDataImage(rawDataUrl);
      return rawDataUrl;
    }

    ctx.drawImage(img, 0, 0, width, height);

    // Try WebP first for superior compression (~40-80KB), fallback to JPEG
    let compressed = canvas.toDataURL('image/webp', 0.78);
    if (!compressed.startsWith('data:image/webp')) {
      compressed = canvas.toDataURL('image/jpeg', 0.78);
    }

    if (compressed.length > 140000) {
      const smallerScale = Math.min(860 / width, 860 / height, 1);
      canvas.width = Math.max(1, Math.round(width * smallerScale));
      canvas.height = Math.max(1, Math.round(height * smallerScale));
      const ctx2 = canvas.getContext('2d');
      if (ctx2) {
        ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
        const webpSmall = canvas.toDataURL('image/webp', 0.72);
        compressed = webpSmall.startsWith('data:image/webp')
          ? webpSmall
          : canvas.toDataURL('image/jpeg', 0.72);
      }
    }

    const finalUrl =
      compressed.length < rawDataUrl.length || rawDataUrl.length > 140000
        ? compressed
        : rawDataUrl;
    registerDataImage(finalUrl);
    return finalUrl;
  } catch {
    registerDataImage(rawDataUrl);
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

// BroadcastChannel for immediate cross-tab synchronization
let syncChannel = null;
if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
  try {
    syncChannel = new window.BroadcastChannel('dwellmark_live_sync');
    syncChannel.onmessage = (event) => {
      const { type, keys } = event.data || {};
      if (type === 'store_updated' && Array.isArray(keys)) {
        keys.forEach((key) => {
          memoryFallback.delete(key);
          notifySubscribers(key);
        });
      }
    };
  } catch {
    syncChannel = null;
  }
}

function broadcastStoreUpdate(keys = []) {
  if (!syncChannel) return;
  try {
    syncChannel.postMessage({ type: 'store_updated', keys });
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (!event.key) return;
    if (event.key.startsWith(IMAGE_LS_PREFIX) && event.newValue) {
      const ref = event.key.slice(IMAGE_LS_PREFIX.length);
      imageMemoryCache.set(ref, event.newValue);
      return;
    }
    if (event.key.startsWith('dm_')) {
      const key = event.key.slice(3);
      memoryFallback.delete(key);
      notifySubscribers(key);
    }
  });
}

function dehydrateForStorage(key, val) {
  if (!Array.isArray(val)) return val;
  if (key === 'listings' || key === 'properties' || key === 'favorites') {
    return val.map(dehydrateRecordImages);
  }
  return val;
}

function hydrateFromStorage(key, val) {
  if (!Array.isArray(val)) return val;
  if (key === 'listings' || key === 'properties' || key === 'favorites') {
    return val.map(hydrateRecordImages);
  }
  return val;
}

// Local storage + IndexedDB helper with memory-first consistency
const storage = {
  get(key, fallback) {
    if (memoryFallback.has(key)) {
      return hydrateFromStorage(key, memoryFallback.get(key));
    }
    if (typeof window === 'undefined') return fallback;
    try {
      const val = window.localStorage.getItem(`dm_${key}`);
      if (val) {
        const parsed = JSON.parse(val);
        const hydrated = hydrateFromStorage(key, parsed);
        memoryFallback.set(key, hydrated);
        return hydrated;
      }
      return fallback;
    } catch {
      return memoryFallback.get(key) ?? fallback;
    }
  },
  set(key, val) {
    const hydratedVal = hydrateFromStorage(key, val);
    memoryFallback.set(key, hydratedVal);
    if (typeof window === 'undefined') return;
    const compactVal = dehydrateForStorage(key, hydratedVal);
    const serialized = JSON.stringify(compactVal);
    idbPut('kv', `dm_${key}`, compactVal);
    try {
      window.localStorage.setItem(`dm_${key}`, serialized);
    } catch {
      try {
        window.localStorage.removeItem('dm_audit_logs');
        pruneUnusedLocalStorageImages();
        window.localStorage.setItem(`dm_${key}`, serialized);
      } catch {
        // memoryFallback and IndexedDB still hold the latest state
      }
    }
  },
};

function getDeletedListingIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(DELETED_LISTINGS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markListingDeleted(id) {
  if (!id || typeof window === 'undefined') return;
  try {
    const set = getDeletedListingIds();
    set.add(id);
    const arr = Array.from(set);
    window.localStorage.setItem(DELETED_LISTINGS_KEY, JSON.stringify(arr));
    idbPut('kv', DELETED_LISTINGS_KEY, arr);
  } catch {
    // ignore
  }
}

let idbHydrationPromise = null;

// Migrate any legacy inline base64 images in localStorage to deduplicated refs immediately
function migrateLegacyLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(IMAGE_LS_PREFIX)) {
        const ref = k.slice(IMAGE_LS_PREFIX.length);
        const val = window.localStorage.getItem(k);
        if (val && isDataImageUrl(val)) {
          imageMemoryCache.set(ref, val);
        }
      }
    }
    ['listings', 'properties', 'favorites'].forEach((key) => {
      const raw = window.localStorage.getItem(`dm_${key}`);
      if (raw && raw.includes('data:image/')) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          storage.set(key, parsed);
        }
      }
    });
  } catch {
    // ignore migration errors
  }

  // Hydrate from IndexedDB in case localStorage was cleared or exceeded previously
  idbHydrationPromise = (async () => {
    try {
      const imgEntries = await idbGetAllEntries('images');
      let loadedNewImg = false;
      imgEntries.forEach(([ref, dataUrl]) => {
        if (ref && isDataImageUrl(dataUrl) && !imageMemoryCache.has(ref)) {
          imageMemoryCache.set(ref, dataUrl);
          loadedNewImg = true;
        }
      });

      const kvEntries = await idbGetAllEntries('kv');
      const kvMap = new Map(kvEntries);
      const idbListings = kvMap.get('dm_listings');
      if (Array.isArray(idbListings) && idbListings.length) {
        const currentListings = storage.get('listings', INITIAL_LISTINGS);
        const merged = mergeListingsLists(currentListings, idbListings.map(hydrateRecordImages));
        if (merged.changed) {
          storage.set('listings', merged.items);
          merged.items.forEach(syncListingImagesAcrossStores);
          notifySubscribers('listings');
        }
      } else if (loadedNewImg) {
        memoryFallback.delete('listings');
        memoryFallback.delete('properties');
        notifySubscribers('listings');
        notifySubscribers('properties');
      }
    } catch {
      // ignore IDB hydration errors
    }
  })();
}

migrateLegacyLocalStorage();

// ============================================================================
// Supabase Cloud Synchronization (Cross-User / Cross-Browser / Cross-Session)
// ============================================================================
// Catalog metadata is stored in a dedicated lightweight account (`CLOUD_CATALOG_EMAIL`)
// without inline base64 images so its JWT never exceeds Cloudflare's 16KB HTTP header
// limit on `PUT /auth/v1/user` or `GET /auth/v1/user`.
// Each deduplicated custom image (`idb:img_<hash>`) is content-addressed and stored
// in its own immutable account (`idb_img_<hash>@dwellmark.internal`), written via
// `POST /auth/v1/signup` and read via `POST /auth/v1/token?grant_type=password`
// (which carry payloads in the HTTP body rather than HTTP headers).
const CLOUD_CATALOG_EMAIL = 'dm_catalog_store_v3@dwellmark.internal';
const LEGACY_CLOUD_SHARDS = [
  'dm_cloud_store_v1@dwellmark.app',
  'dm_cloud_shard_1@dwellmark.app',
  'dm_cloud_shard_2@dwellmark.app',
];
const CLOUD_SHARD_PASS = 'DwellmarkCloudSync!2026';
const SHARD_TOKEN_LS_PREFIX = 'dm_shard_token_v3_';
const UPLOADED_IMG_REFS_KEY = 'dm_cloud_uploaded_imgs_v3';
const shardTokenMemory = new Map();
const uploadedImageRefsMemory = new Set();

function imageRefToEmail(ref) {
  return `${String(ref).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}@dwellmark.internal`;
}

function getCachedShardToken(email) {
  const mem = shardTokenMemory.get(email);
  if (mem && mem.expires_at > Date.now() + 60000 && mem.access_token.length < 12000) {
    return mem.access_token;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${SHARD_TOKEN_LS_PREFIX}${email}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed?.access_token &&
          parsed.access_token.length < 12000 &&
          parsed?.expires_at > Date.now() + 60000
        ) {
          shardTokenMemory.set(email, parsed);
          return parsed.access_token;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function setCachedShardToken(email, access_token, expires_in = 3600) {
  if (!access_token || access_token.length >= 12000) return;
  const entry = {
    access_token,
    expires_at: Date.now() + Number(expires_in || 3600) * 1000,
  };
  shardTokenMemory.set(email, entry);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${SHARD_TOKEN_LS_PREFIX}${email}`, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }
}

function clearCachedShardToken(email) {
  shardTokenMemory.delete(email);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(`${SHARD_TOKEN_LS_PREFIX}${email}`);
    } catch {
      // ignore
    }
  }
}

async function loginCloudAccount(email, createIfMissing = false) {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) return null;
  try {
    let res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: CLOUD_SHARD_PASS }),
    });
    if (!res.ok && createIfMissing) {
      const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: CLOUD_SHARD_PASS }),
      });
      if (signupRes.ok) {
        const signupData = await signupRes.json();
        if (signupData?.access_token && signupData?.user) {
          setCachedShardToken(email, signupData.access_token, signupData.expires_in);
          return { token: signupData.access_token, user: signupData.user };
        }
      }
      res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: CLOUD_SHARD_PASS }),
      });
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.access_token || !data?.user) return null;
    setCachedShardToken(email, data.access_token, data.expires_in);
    return { token: data.access_token, user: data.user };
  } catch {
    return null;
  }
}

async function fetchCloudCatalogUser() {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) return null;
  const cachedToken = getCachedShardToken(CLOUD_CATALOG_EMAIL);
  if (cachedToken) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${cachedToken}`,
        },
      });
      if (res.ok) {
        const user = await res.json();
        if (user?.id) return { token: cachedToken, user };
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        clearCachedShardToken(CLOUD_CATALOG_EMAIL);
      }
    } catch {
      // fallback to login
    }
  }
  return loginCloudAccount(CLOUD_CATALOG_EMAIL, true);
}

async function updateCloudCatalogMetadata(token, metadataObj) {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) return false;
  const attemptUpdate = async (bearer) =>
    fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: metadataObj }),
    });

  try {
    let activeToken = token || getCachedShardToken(CLOUD_CATALOG_EMAIL);
    if (!activeToken) {
      const loggedIn = await loginCloudAccount(CLOUD_CATALOG_EMAIL, true);
      activeToken = loggedIn?.token;
    }
    if (!activeToken) return false;
    let res = await attemptUpdate(activeToken);
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      clearCachedShardToken(CLOUD_CATALOG_EMAIL);
      const relogged = await loginCloudAccount(CLOUD_CATALOG_EMAIL, true);
      if (!relogged?.token) return false;
      res = await attemptUpdate(relogged.token);
    }
    return res.ok;
  } catch {
    return false;
  }
}

async function uploadImageRefToCloud(ref, dataUrl) {
  if (!isImageRef(ref) || !isDataImageUrl(dataUrl) || !isSupabaseConfigured) return false;
  if (uploadedImageRefsMemory.has(ref)) return true;
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(UPLOADED_IMG_REFS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr) && arr.includes(ref)) {
        uploadedImageRefsMemory.add(ref);
        return true;
      }
    } catch {
      // ignore
    }
  }
  try {
    const email = imageRefToEmail(ref);
    const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: CLOUD_SHARD_PASS,
        data: { ref, dataUrl },
      }),
    });
    if (res.ok || res.status === 400 || res.status === 422) {
      uploadedImageRefsMemory.add(ref);
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(UPLOADED_IMG_REFS_KEY);
          const arr = raw ? JSON.parse(raw) : [];
          const set = new Set(Array.isArray(arr) ? arr : []);
          set.add(ref);
          window.localStorage.setItem(UPLOADED_IMG_REFS_KEY, JSON.stringify(Array.from(set)));
        } catch {
          // ignore
        }
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function cacheDownloadedImage(ref, dataUrl) {
  if (!isImageRef(ref) || !isDataImageUrl(dataUrl)) return;
  imageMemoryCache.set(ref, dataUrl);
  uploadedImageRefsMemory.add(ref);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${IMAGE_LS_PREFIX}${ref}`, dataUrl);
    } catch {
      pruneUnusedLocalStorageImages(ref);
      try {
        window.localStorage.setItem(`${IMAGE_LS_PREFIX}${ref}`, dataUrl);
      } catch {
        // ignore
      }
    }
    idbPut('images', ref, dataUrl);
  }
}

async function downloadImageRefFromCloud(ref) {
  if (!isImageRef(ref) || !isSupabaseConfigured) return null;
  const existing = resolveImageRef(ref);
  if (isDataImageUrl(existing)) return existing;
  try {
    const email = imageRefToEmail(ref);
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: CLOUD_SHARD_PASS }),
    });
    if (res.ok) {
      const data = await res.json();
      const dataUrl = data?.user?.user_metadata?.dataUrl;
      if (isDataImageUrl(dataUrl)) {
        cacheDownloadedImage(ref, dataUrl);
        return dataUrl;
      }
    }
    // Fallback: check legacy shards if image was uploaded before v3 migration
    for (const legacyEmail of LEGACY_CLOUD_SHARDS) {
      const leg = await loginCloudAccount(legacyEmail, false);
      const legImgs = leg?.user?.user_metadata?.dm_images || {};
      Object.entries(legImgs).forEach(([k, v]) => {
        if (isDataImageUrl(v)) {
          cacheDownloadedImage(k, v);
          uploadImageRefToCloud(k, v);
        }
      });
      if (imageMemoryCache.has(ref)) {
        return imageMemoryCache.get(ref);
      }
    }
    return null;
  } catch {
    return null;
  }
}

const CONTENT_COMPARE_FIELDS = [
  'title',
  'description',
  'listing_type',
  'price',
  'currency',
  'rent_frequency',
  'deposit',
  'lease_months',
  'available_from',
  'open_house_at',
  'accepts_applications',
  'status',
  'under_offer',
  'featured',
  'verification_status',
  'moderation_note',
  'property_type',
  'bedrooms',
  'bathrooms',
  'area_sqft',
  'lot_sqft',
  'year_built',
  'parking',
  'furnished',
  'pets_allowed',
  'address',
  'address_visibility',
  'neighborhood',
  'city',
  'state',
  'postal_code',
  'latitude',
  'longitude',
  'owner_name',
  'owner_role',
];

function normalizeImageForCompare(img) {
  if (isDataImageUrl(img)) return hashImageString(img);
  return img;
}

function hasContentChangedFromInitial(item) {
  if (!item?.id) return false;
  if (!item.is_demo) return true;
  if (typeof item._content_updated_ts === 'number' && item._content_updated_ts > 0) return true;
  const init = INITIAL_LISTINGS_BY_ID.get(item.id);
  if (!init) return true;
  const rawImgs =
    Array.isArray(item._raw_image_refs) && item._raw_image_refs.length
      ? item._raw_image_refs
      : item.images || [];
  const itemImgs = rawImgs.map(normalizeImageForCompare);
  const initImgs = (init.images || []).map(normalizeImageForCompare);
  if (JSON.stringify(itemImgs) !== JSON.stringify(initImgs)) return true;
  if (JSON.stringify(item.amenities || []) !== JSON.stringify(init.amenities || [])) return true;
  for (const field of CONTENT_COMPARE_FIELDS) {
    if ((item[field] ?? null) !== (init[field] ?? null)) {
      return true;
    }
  }
  return false;
}

function compactListingForCloud(item) {
  const dehydrated = dehydrateRecordImages(item);
  if (!dehydrated?.is_demo) {
    const copy = { ...dehydrated };
    delete copy.search_text;
    delete copy._raw_image_refs;
    return copy;
  }
  const init = INITIAL_LISTINGS_BY_ID.get(dehydrated.id);
  if (!init) return dehydrated;
  const delta = {
    id: dehydrated.id,
    is_demo: true,
    updated_date: dehydrated.updated_date || new Date().toISOString(),
    _content_updated_ts:
      typeof dehydrated._content_updated_ts === 'number' && dehydrated._content_updated_ts > 0
        ? dehydrated._content_updated_ts
        : Date.parse(dehydrated.updated_date) || Date.now(),
  };
  if (JSON.stringify(dehydrated.images || []) !== JSON.stringify(init.images || [])) {
    delta.images = dehydrated.images;
  }
  if (JSON.stringify(dehydrated.amenities || []) !== JSON.stringify(init.amenities || [])) {
    delta.amenities = dehydrated.amenities;
  }
  for (const field of CONTENT_COMPARE_FIELDS) {
    if ((dehydrated[field] ?? null) !== (init[field] ?? null)) {
      delta[field] = dehydrated[field];
    }
  }
  return delta;
}

let maxKnownCloudTs = 0;

function nextContentTimestamp() {
  const next = Math.max(Date.now(), maxKnownCloudTs + 1);
  maxKnownCloudTs = next;
  return next;
}

function getLocalContentTimestamp(item) {
  if (!item) return 0;
  return typeof item._content_updated_ts === 'number' && item._content_updated_ts > 0
    ? item._content_updated_ts
    : 0;
}

function getCloudContentTimestamp(item) {
  if (!item) return 0;
  if (typeof item._content_updated_ts === 'number' && item._content_updated_ts > 0) {
    return item._content_updated_ts;
  }
  if (hasContentChangedFromInitial(item)) {
    const parsed = item.updated_date ? Date.parse(item.updated_date) : 0;
    return parsed > 0 ? parsed : 1;
  }
  return 0;
}

function mergeListingsLists(localList = [], incomingList = [], deletedIds = new Set()) {
  const localById = new Map(localList.map((item) => [item.id, item]));
  const incomingById = new Map(incomingList.map((item) => [item.id, item]));
  const allIds = new Set([...localList.map((i) => i.id), ...incomingList.map((i) => i.id)]);

  let changed = false;
  let localHasNewer = false;
  const merged = [];

  allIds.forEach((id) => {
    if (deletedIds.has(id)) {
      if (localById.has(id)) changed = true;
      return;
    }
    const loc = localById.get(id);
    const inc = incomingById.get(id);
    if (loc && !inc) {
      merged.push(loc);
      if (hasContentChangedFromInitial(loc) && getLocalContentTimestamp(loc) > 0) {
        localHasNewer = true;
      }
      return;
    }
    if (!loc && inc) {
      merged.push(sanitizeListingRecord(inc));
      changed = true;
      return;
    }
    const locTime = getLocalContentTimestamp(loc);
    const incTime = getCloudContentTimestamp(inc);
    if (incTime > maxKnownCloudTs) {
      maxKnownCloudTs = incTime;
    }
    const mergedViews = Math.max(Number(loc.views || 0), Number(inc.views || 0));

    if (incTime > 0 && incTime >= locTime) {
      const nextRec = sanitizeListingRecord({
        ...loc,
        ...inc,
        views: mergedViews,
      });
      merged.push(nextRec);
      if (JSON.stringify(loc) !== JSON.stringify(nextRec)) {
        changed = true;
      }
    } else if (locTime > incTime) {
      merged.push(loc);
      localHasNewer = true;
    } else {
      merged.push(loc);
    }
  });

  return { items: merged, changed, localHasNewer };
}

let realtimeChannel = null;
if (typeof window !== 'undefined' && isSupabaseConfigured && supabaseUrl && supabaseKey) {
  try {
    const rtClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    realtimeChannel = rtClient
      .channel('dwellmark_catalog_sync')
      .on('broadcast', { event: 'catalog_updated' }, () => {
        syncListingsFromCloud(true);
      })
      .subscribe();
  } catch {
    realtimeChannel = null;
  }
}

let pushInFlight = null;
let pushQueued = false;

export async function pushListingsToCloud() {
  if (!isSupabaseConfigured) return false;
  if (pushInFlight) {
    pushQueued = true;
    return pushInFlight;
  }

  pushInFlight = (async () => {
    try {
      const currentListings = storage.get('listings', INITIAL_LISTINGS);
      const deletedIds = Array.from(getDeletedListingIds());
      const dirtyListings = currentListings
        .filter(hasContentChangedFromInitial)
        .map(compactListingForCloud);

      // Collect all referenced idb:img_* hashes and upload each to its dedicated cloud account
      const neededRefs = new Set();
      dirtyListings.forEach((item) => {
        (item.images || []).forEach((img) => {
          if (isImageRef(img)) neededRefs.add(img);
        });
      });

      if (neededRefs.size > 0) {
        await Promise.all(
          Array.from(neededRefs).map(async (ref) => {
            const dataUrl = resolveImageRef(ref);
            if (isDataImageUrl(dataUrl)) {
              await uploadImageRefToCloud(ref, dataUrl);
            }
          }),
        );
      }

      const catalogShard = await fetchCloudCatalogUser();
      if (!catalogShard) return false;

      const nowIso = new Date().toISOString();
      const ok = await updateCloudCatalogMetadata(catalogShard.token, {
        dm_catalog_v3: {
          updated_at: nowIso,
          deleted_ids: deletedIds,
          records: dirtyListings,
        },
      });
      if (!ok) return false;

      lastSyncedCatalogUpdatedAt = nowIso;

      if (realtimeChannel) {
        try {
          realtimeChannel.send({
            type: 'broadcast',
            event: 'catalog_updated',
            payload: { updated_at: nowIso },
          });
        } catch {
          // ignore
        }
      }

      return true;
    } catch {
      return false;
    } finally {
      pushInFlight = null;
      if (pushQueued) {
        pushQueued = false;
        pushListingsToCloud();
      }
    }
  })();

  return pushInFlight;
}

let syncInFlight = null;
let initialCloudSyncPromise = null;
let lastSyncedCatalogUpdatedAt = null;

export async function syncListingsFromCloud(force = false) {
  if (!isSupabaseConfigured) return false;
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const catalogShard = await fetchCloudCatalogUser();
      if (!catalogShard) return false;

      const meta = catalogShard.user?.user_metadata || {};
      let catalog = meta.dm_catalog_v3 || meta.dm_catalog_v2;

      // One-time automatic migration if v3 catalog is empty on first boot
      if (!catalog || (!Array.isArray(catalog.records) && !Array.isArray(catalog.deleted_ids))) {
        const legacyPrimary = await loginCloudAccount(LEGACY_CLOUD_SHARDS[0], false);
        const legacyMeta = legacyPrimary?.user?.user_metadata || {};
        const legacyImages = legacyMeta.dm_images || {};
        Object.entries(legacyImages).forEach(([ref, dataUrl]) => {
          if (isDataImageUrl(dataUrl)) {
            cacheDownloadedImage(ref, dataUrl);
            uploadImageRefToCloud(ref, dataUrl);
          }
        });
        if (legacyMeta.dm_catalog_v2) {
          catalog = legacyMeta.dm_catalog_v2;
        }
      }

      const cloudRecords = Array.isArray(catalog?.records) ? catalog.records : [];
      const cloudDeletedIds = Array.isArray(catalog?.deleted_ids) ? catalog.deleted_ids : [];

      if (
        !force &&
        lastSyncedCatalogUpdatedAt &&
        catalog?.updated_at &&
        catalog.updated_at === lastSyncedCatalogUpdatedAt
      ) {
        return false;
      }

      // Download any referenced custom images that aren't cached locally yet
      const missingRefs = new Set();
      cloudRecords.forEach((rec) => {
        (rec?.images || []).forEach((img) => {
          if (isImageRef(img) && !isDataImageUrl(resolveImageRef(img))) {
            missingRefs.add(img);
          }
        });
      });

      if (missingRefs.size > 0) {
        await Promise.all(
          Array.from(missingRefs).map((ref) => downloadImageRefFromCloud(ref)),
        );
      }

      const deletedSet = getDeletedListingIds();
      cloudDeletedIds.forEach((id) => {
        deletedSet.add(id);
        markListingDeleted(id);
      });

      // Clear memoryFallback so storage.get re-hydrates with any newly downloaded cloud images
      memoryFallback.delete('listings');
      const localListings = storage.get('listings', INITIAL_LISTINGS);
      const hydratedCloudRecords = cloudRecords.map((rec) => {
        const base = INITIAL_LISTINGS_BY_ID.get(rec.id) || {};
        const combined = { ...base, ...rec };
        if (combined.latitude !== undefined && combined.latitude !== null && combined.latitude !== '') {
          combined.lat = Number(combined.latitude);
        }
        if (combined.longitude !== undefined && combined.longitude !== null && combined.longitude !== '') {
          combined.lng = Number(combined.longitude);
        }
        Object.assign(combined, listingSearchFields(combined));
        return sanitizeListingRecord(combined);
      });

      const { items: mergedListings, changed, localHasNewer } = mergeListingsLists(
        localListings,
        hydratedCloudRecords,
        deletedSet,
      );

      const isFirstSync = !lastSyncedCatalogUpdatedAt;
      if (catalog?.updated_at) {
        lastSyncedCatalogUpdatedAt = catalog.updated_at;
      }

      if (changed || isFirstSync) {
        storage.set('listings', mergedListings);
        mergedListings.forEach(syncListingImagesAcrossStores);
        notifySubscribers('listings');
        notifySubscribers('properties');
        notifySubscribers('favorites');
        broadcastStoreUpdate(['listings', 'properties', 'favorites']);
      }

      if (localHasNewer) {
        pushListingsToCloud();
      }

      return changed;
    } catch {
      return false;
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

async function ensureCloudSynced() {
  if (!isSupabaseConfigured) return;
  if (idbHydrationPromise) {
    await Promise.race([idbHydrationPromise, new Promise((r) => setTimeout(r, 800))]);
  }
  if (!initialCloudSyncPromise) {
    initialCloudSyncPromise = syncListingsFromCloud();
  }
  await Promise.race([initialCloudSyncPromise, new Promise((r) => setTimeout(r, 4500))]);
}

if (typeof window !== 'undefined' && isSupabaseConfigured) {
  // Initial cloud sync on load
  initialCloudSyncPromise = syncListingsFromCloud();

  // Re-sync when tab becomes visible or window gains focus
  window.addEventListener('focus', () => {
    syncListingsFromCloud();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncListingsFromCloud();
    }
  });
  // Periodic background check so open browsers receive admin updates automatically
  window.setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      syncListingsFromCloud();
    }
  }, 8000);
}

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

const SHARED_PROPERTY_FIELDS = [
  'title',
  'property_type',
  'address',
  'address_visibility',
  'neighborhood',
  'city',
  'state',
  'postal_code',
  'latitude',
  'longitude',
  'bedrooms',
  'bathrooms',
  'area_sqft',
  'lot_sqft',
  'year_built',
  'parking',
  'furnished',
  'pets_allowed',
  'amenities',
  'images',
  'description',
  'owner_name',
  'owner_role',
];

function syncListingImagesAcrossStores(listingRecord) {
  if (!listingRecord?.id) return;
  const images = Array.isArray(listingRecord.images) ? listingRecord.images : [];
  const cover = images[0] || null;

  // Sync linked Property record (images + shared property metadata)
  const properties = storage.get('properties', INITIAL_PROPERTIES);
  if (Array.isArray(properties)) {
    let propChanged = false;
    const nextProps = properties.map((prop) => {
      if (
        (listingRecord.property_id && prop.id === listingRecord.property_id) ||
        prop.listing_id === listingRecord.id
      ) {
        const updatedProp = { ...prop };
        SHARED_PROPERTY_FIELDS.forEach((field) => {
          if (listingRecord[field] !== undefined) {
            updatedProp[field] = listingRecord[field];
          }
        });
        if (JSON.stringify(updatedProp) !== JSON.stringify(prop)) {
          propChanged = true;
          return updatedProp;
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
      if (fav.listing_id === listingRecord.id) {
        const nextFav = {
          ...fav,
          listing_image: cover ?? fav.listing_image,
          listing_title: listingRecord.title ?? fav.listing_title,
          listing_price: listingRecord.price ?? fav.listing_price,
          listing_city: listingRecord.city ?? fav.listing_city,
          listing_state: listingRecord.state ?? fav.listing_state,
          listing_type: listingRecord.listing_type ?? fav.listing_type,
          bedrooms: listingRecord.bedrooms ?? fav.bedrooms,
          bathrooms: listingRecord.bathrooms ?? fav.bathrooms,
          area_sqft: listingRecord.area_sqft ?? fav.area_sqft,
        };
        if (JSON.stringify(nextFav) !== JSON.stringify(fav)) {
          favChanged = true;
          return nextFav;
        }
      }
      return fav;
    });
    if (favChanged) {
      storage.set('favorites', nextFavs);
      notifySubscribers('favorites');
    }
  }

  // Sync Recently Viewed cache (dehydrate cover image if data URL so it stays tiny)
  if (typeof window !== 'undefined') {
    try {
      const rawRv = window.localStorage.getItem('dwellmark_recently_viewed');
      if (rawRv) {
        const parsedRv = JSON.parse(rawRv);
        if (Array.isArray(parsedRv)) {
          let rvChanged = false;
          const compactCover = cover && isDataImageUrl(cover) ? registerDataImage(cover) : cover;
          const nextRv = parsedRv.map((entry) => {
            if (entry?.id === listingRecord.id) {
              const nextImages = compactCover ? [compactCover] : [];
              const nextEntry = {
                ...entry,
                title: listingRecord.title ?? entry.title,
                price: listingRecord.price ?? entry.price,
                city: listingRecord.city ?? entry.city,
                state: listingRecord.state ?? entry.state,
                address: listingRecord.address ?? entry.address,
                bedrooms: listingRecord.bedrooms ?? entry.bedrooms,
                bathrooms: listingRecord.bathrooms ?? entry.bathrooms,
                area_sqft: listingRecord.area_sqft ?? entry.area_sqft,
                status: listingRecord.status ?? entry.status,
                under_offer:
                  listingRecord.under_offer !== undefined
                    ? Boolean(listingRecord.under_offer)
                    : entry.under_offer,
                images: nextImages,
              };
              if (JSON.stringify(entry) !== JSON.stringify(nextEntry)) {
                rvChanged = true;
                return nextEntry;
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

function syncPropertyToListing(propertyRecord) {
  if (!propertyRecord?.id) return;
  const listings = storage.get('listings', INITIAL_LISTINGS);
  if (!Array.isArray(listings)) return;
  let changed = false;
  let updatedListing = null;
  const now = new Date().toISOString();
  const nowTs = nextContentTimestamp();
  const nextListings = listings.map((item) => {
    if (item.property_id === propertyRecord.id || item.id === propertyRecord.listing_id) {
      const candidate = { ...item };
      let itemChanged = false;
      SHARED_PROPERTY_FIELDS.forEach((field) => {
        if (
          propertyRecord[field] !== undefined &&
          JSON.stringify(candidate[field]) !== JSON.stringify(propertyRecord[field])
        ) {
          candidate[field] = propertyRecord[field];
          itemChanged = true;
        }
      });
      if (itemChanged) {
        changed = true;
        if (Array.isArray(propertyRecord.images)) {
          delete candidate._raw_image_refs;
        }
        if (candidate.latitude !== undefined && candidate.latitude !== null && candidate.latitude !== '') {
          candidate.lat = Number(candidate.latitude);
        }
        if (candidate.longitude !== undefined && candidate.longitude !== null && candidate.longitude !== '') {
          candidate.lng = Number(candidate.longitude);
        }
        Object.assign(candidate, listingSearchFields(candidate));
        candidate.updated_date = now;
        candidate._content_updated_ts = nowTs;
        updatedListing = candidate;
        return candidate;
      }
    }
    return item;
  });
  if (changed) {
    storage.set('listings', nextListings);
    notifySubscribers('listings');
    if (updatedListing) {
      syncListingImagesAcrossStores(updatedListing);
      pushListingsToCloud();
    }
  }
}

function createEntityStore(storageKey, initialData) {
  const getStore = () => {
    const data = storage.get(storageKey, initialData);
    if (!Array.isArray(data)) return initialData;
    if (storageKey === 'listings' || storageKey === 'properties') {
      const deletedSet = storageKey === 'listings' ? getDeletedListingIds() : null;
      let needsPersist = false;
      const filtered = deletedSet
        ? data.filter((item) => {
            if (deletedSet.has(item?.id)) {
              needsPersist = true;
              return false;
            }
            return true;
          })
        : data;
      const cleaned = filtered.map((item) => {
        const hadDeadBlob = Array.isArray(item?.images) && item.images.some(isDeadBlobUrl);
        if (hadDeadBlob) needsPersist = true;
        return sanitizeListingRecord(item);
      });
      if (needsPersist) {
        storage.set(storageKey, cleaned);
      }
      return cleaned;
    }
    return data;
  };
  const saveStore = (data) => {
    storage.set(storageKey, data);
    notifySubscribers(storageKey);
    broadcastStoreUpdate([storageKey]);
  };

  return {
    async filter(query = {}, options = {}) {
      if (storageKey === 'listings' || storageKey === 'properties') {
        await ensureCloudSynced();
      }
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
      if (storageKey === 'listings' || storageKey === 'properties') {
        await ensureCloudSynced();
      }
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
      if (storageKey === 'listings' || storageKey === 'properties') {
        await ensureCloudSynced();
      }
      const all = getStore();
      const found = all.find((item) => item.id === id || item.listing_id === id);
      if (!found) {
        // Return null instead of rejecting so views don't break
        return null;
      }
      return { ...found };
    },

    async count(query = {}) {
      if (storageKey === 'listings' || storageKey === 'properties') {
        await ensureCloudSynced();
      }
      const all = getStore();
      return all.filter((item) => matchesQuery(item, query)).length;
    },

    async create(record) {
      const all = getStore();
      const id = record.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();
      const nowTs = nextContentTimestamp();
      const created = {
        ...record,
        id,
        created_date: record.created_date || now,
        updated_date: record.updated_date || now,
        _content_updated_ts: nowTs,
      };
      if (storageKey === 'listings') {
        if (created.latitude !== undefined && created.latitude !== null && created.latitude !== '') {
          created.lat = Number(created.latitude);
        }
        if (created.longitude !== undefined && created.longitude !== null && created.longitude !== '') {
          created.lng = Number(created.longitude);
        }
        Object.assign(created, listingSearchFields(created));
      }
      all.unshift(created);
      saveStore(all);
      if (storageKey === 'listings') {
        syncListingImagesAcrossStores(created);
        broadcastStoreUpdate(['listings', 'properties', 'favorites']);
        await Promise.race([
          pushListingsToCloud(),
          new Promise((r) => setTimeout(r, 4500)),
        ]);
      }
      if (storageKey === 'properties') {
        syncPropertyToListing(created);
      }
      return created;
    },

    async bulkCreate(records = []) {
      const all = getStore();
      const now = new Date().toISOString();
      const nowTs = nextContentTimestamp();
      const createdList = records.map((r, i) => ({
        ...r,
        id: r.id || `rec-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        created_date: r.created_date || now,
        updated_date: r.updated_date || now,
        _content_updated_ts: nowTs,
      }));
      const next = [...createdList, ...all];
      saveStore(next);
      if (storageKey === 'listings') {
        pushListingsToCloud();
      }
      return createdList;
    },

    async update(id, updates) {
      const all = getStore();
      const index = all.findIndex((item) => item.id === id || item.listing_id === id);
      if (index === -1) return updates;

      const updateKeys = Object.keys(updates || {});
      const isViewOnlyUpdate =
        storageKey === 'listings' && updateKeys.length === 1 && updateKeys[0] === 'views';

      if (isViewOnlyUpdate) {
        const updatedViewOnly = {
          ...all[index],
          views: updates.views,
        };
        all[index] = updatedViewOnly;
        storage.set(storageKey, all);
        return updatedViewOnly;
      }

      const now = new Date().toISOString();
      const nowTs = nextContentTimestamp();
      const updated = {
        ...all[index],
        ...updates,
        updated_date: now,
        _content_updated_ts: nowTs,
      };
      if (Array.isArray(updates?.images)) {
        delete updated._raw_image_refs;
      }
      if (storageKey === 'listings') {
        if (updated.latitude !== undefined && updated.latitude !== null && updated.latitude !== '') {
          updated.lat = Number(updated.latitude);
        }
        if (updated.longitude !== undefined && updated.longitude !== null && updated.longitude !== '') {
          updated.lng = Number(updated.longitude);
        }
        Object.assign(updated, listingSearchFields(updated));
      }
      all[index] = updated;
      saveStore(all);
      if (storageKey === 'listings') {
        syncListingImagesAcrossStores(updated);
        broadcastStoreUpdate(['listings', 'properties', 'favorites']);
        await Promise.race([
          pushListingsToCloud(),
          new Promise((r) => setTimeout(r, 4500)),
        ]);
      }
      if (storageKey === 'properties') {
        syncPropertyToListing(updated);
      }
      return updated;
    },

    async updateMany(query, updates) {
      const all = getStore();
      let updatedCount = 0;
      const updatedRecords = [];
      const now = new Date().toISOString();
      const nowTs = nextContentTimestamp();
      all.forEach((item, index) => {
        if (matchesQuery(item, query)) {
          const nextItem = {
            ...item,
            ...updates,
            updated_date: now,
            _content_updated_ts: nowTs,
          };
          if (Array.isArray(updates?.images)) {
            delete nextItem._raw_image_refs;
          }
          if (storageKey === 'listings') {
            if (nextItem.latitude !== undefined && nextItem.latitude !== null && nextItem.latitude !== '') {
              nextItem.lat = Number(nextItem.latitude);
            }
            if (nextItem.longitude !== undefined && nextItem.longitude !== null && nextItem.longitude !== '') {
              nextItem.lng = Number(nextItem.longitude);
            }
            Object.assign(nextItem, listingSearchFields(nextItem));
          }
          all[index] = nextItem;
          updatedRecords.push(nextItem);
          updatedCount++;
        }
      });
      saveStore(all);
      if (storageKey === 'listings') {
        updatedRecords.forEach(syncListingImagesAcrossStores);
        broadcastStoreUpdate(['listings', 'properties', 'favorites']);
        await Promise.race([
          pushListingsToCloud(),
          new Promise((r) => setTimeout(r, 4500)),
        ]);
      }
      if (storageKey === 'properties') {
        updatedRecords.forEach(syncPropertyToListing);
      }
      return { updated: updatedCount };
    },

    async delete(id) {
      const all = getStore();
      const next = all.filter((item) => item.id !== id);
      if (storageKey === 'listings') {
        markListingDeleted(id);
      }
      saveStore(next);
      if (storageKey === 'listings') {
        await Promise.race([
          pushListingsToCloud(),
          new Promise((r) => setTimeout(r, 4500)),
        ]);
      }
      return { success: true };
    },

    async deleteMany(query) {
      const all = getStore();
      const next = all.filter((item) => {
        const match = matchesQuery(item, query);
        if (match && storageKey === 'listings' && item?.id) {
          markListingDeleted(item.id);
        }
        return !match;
      });
      saveStore(next);
      if (storageKey === 'listings') {
        await Promise.race([
          pushListingsToCloud(),
          new Promise((r) => setTimeout(r, 4500)),
        ]);
      }
      return { success: true };
    },

    async aggregate({ query = {}, groupBy, avg, sum } = {}) {
      if (storageKey === 'listings' || storageKey === 'properties') {
        await ensureCloudSynced();
      }
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

export { resolveImageRef, registerDataImage };

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
    syncFromCloud: syncListingsFromCloud,
    pushToCloud: pushListingsToCloud,

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
        syncListingsFromCloud();
        return user;
      },
      async loginWithProvider(provider) {
        const user = {
          ...DEFAULT_USER,
          full_name: `${provider ? provider.toUpperCase() : 'Google'} User`,
        };
        storage.set('auth_user', user);
        syncListingsFromCloud();
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
        syncListingsFromCloud();
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
