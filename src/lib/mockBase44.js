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
  if (Array.isArray(record.images)) {
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
  if (Array.isArray(record.images)) {
    let changed = false;
    const nextImages = record.images
      .map((img) => {
        if (isImageRef(img)) {
          const resolved = resolveImageRef(img);
          if (resolved !== img) changed = true;
          return resolved;
        }
        return img;
      })
      .filter((img) => img && !isImageRef(img));
    if (changed || nextImages.length !== record.images.length) {
      const fallback = INITIAL_IMAGES_BY_ID.get(record.id) || [];
      next = {
        ...next,
        images: nextImages.length ? nextImages : fallback,
      };
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

  // Also hydrate from IndexedDB in background in case localStorage was cleared or exceeded previously
  (async () => {
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
const CLOUD_SHARD_ACCOUNTS = [
  'dm_cloud_store_v1@dwellmark.app',
  'dm_cloud_shard_1@dwellmark.app',
  'dm_cloud_shard_2@dwellmark.app',
];
const CLOUD_SHARD_PASS = 'DwellmarkCloudSync!2026';
const cloudClients = new Map();

function getCloudClient(email) {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) return null;
  if (cloudClients.has(email)) return cloudClients.get(email);
  const memStore = new Map();
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `dm_cloud_isolated_${email}`,
      storage: {
        getItem: (k) => memStore.get(k) ?? null,
        setItem: (k, v) => memStore.set(k, v),
        removeItem: (k) => memStore.delete(k),
      },
    },
  });
  cloudClients.set(email, client);
  return client;
}

async function getAuthenticatedCloudShard(email) {
  const client = getCloudClient(email);
  if (!client) return null;
  try {
    const { data: sessionData } = await client.auth.getSession();
    if (sessionData?.session?.user) {
      const { data: userData, error: userErr } = await client.auth.getUser();
      if (!userErr && userData?.user) return { client, user: userData.user };
    }
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: CLOUD_SHARD_PASS,
    });
    if (error || !data?.user) return null;
    return { client, user: data.user };
  } catch {
    return null;
  }
}

function hasListingChangedFromInitial(item) {
  if (!item?.id) return false;
  if (!item.is_demo) return true;
  if (item.updated_date) return true;
  const init = INITIAL_LISTINGS_BY_ID.get(item.id);
  if (!init) return true;
  return (
    JSON.stringify(item.images || []) !== JSON.stringify(init.images || []) ||
    item.price !== init.price ||
    item.title !== init.title ||
    item.status !== init.status ||
    item.featured !== init.featured ||
    item.description !== init.description ||
    item.address !== init.address ||
    item.bedrooms !== init.bedrooms ||
    item.bathrooms !== init.bathrooms ||
    item.area_sqft !== init.area_sqft ||
    item.verification_status !== init.verification_status
  );
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
      if (hasListingChangedFromInitial(loc)) {
        localHasNewer = true;
      }
      return;
    }
    if (!loc && inc) {
      merged.push(sanitizeListingRecord(inc));
      changed = true;
      return;
    }
    const locTime = loc.updated_date ? Date.parse(loc.updated_date) || 0 : 0;
    const incTime = inc.updated_date ? Date.parse(inc.updated_date) || 0 : 0;
    if (incTime > locTime) {
      merged.push(sanitizeListingRecord({ ...loc, ...inc }));
      if (JSON.stringify(loc) !== JSON.stringify({ ...loc, ...inc })) {
        changed = true;
      }
    } else if (locTime > incTime) {
      merged.push(loc);
      localHasNewer = true;
    } else {
      // Equal timestamps: prefer record with modified/custom images if different
      if (
        JSON.stringify(loc.images || []) !== JSON.stringify(inc.images || []) &&
        JSON.stringify(inc.images || []) !== JSON.stringify(INITIAL_IMAGES_BY_ID.get(id) || [])
      ) {
        merged.push(sanitizeListingRecord({ ...loc, ...inc }));
        changed = true;
      } else {
        merged.push(loc);
      }
    }
  });

  return { items: merged, changed, localHasNewer };
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
        .filter(hasListingChangedFromInitial)
        .map(dehydrateRecordImages);

      // Collect all referenced idb:img_* hashes
      const neededRefs = new Set();
      dirtyListings.forEach((item) => {
        (item.images || []).forEach((img) => {
          if (isImageRef(img)) neededRefs.add(img);
        });
      });

      const primaryShard = await getAuthenticatedCloudShard(CLOUD_SHARD_ACCOUNTS[0]);
      if (!primaryShard) return false;

      // Upload any new deduplicated images across the 3 shard accounts
      if (neededRefs.size > 0) {
        const shards = await Promise.all(
          CLOUD_SHARD_ACCOUNTS.map((email) => getAuthenticatedCloudShard(email)),
        );
        const activeShards = shards.filter(Boolean);
        const existingImagesByRef = new Map();

        activeShards.forEach((s) => {
          const imgs = s.user?.user_metadata?.dm_images || {};
          Object.entries(imgs).forEach(([ref, dataUrl]) => {
            if (isDataImageUrl(dataUrl)) {
              existingImagesByRef.set(ref, dataUrl);
              if (!imageMemoryCache.has(ref)) imageMemoryCache.set(ref, dataUrl);
            }
          });
        });

        const shardPayloads = activeShards.map((s) => ({
          ...(s.user?.user_metadata?.dm_images || {}),
        }));
        const shardDirty = activeShards.map(() => false);

        let shardCursor = 0;
        neededRefs.forEach((ref) => {
          if (existingImagesByRef.has(ref)) return;
          const dataUrl = resolveImageRef(ref);
          if (!isDataImageUrl(dataUrl) || !activeShards.length) return;
          // Pick shard with smallest current serialized size
          let targetIdx = shardCursor % activeShards.length;
          let minSize = Infinity;
          for (let i = 0; i < activeShards.length; i++) {
            const sz = JSON.stringify(shardPayloads[i]).length;
            if (sz < minSize) {
              minSize = sz;
              targetIdx = i;
            }
          }
          // If shard exceeds ~650KB, prune unreferenced images from it first
          if (minSize + dataUrl.length > 650000) {
            Object.keys(shardPayloads[targetIdx]).forEach((oldRef) => {
              if (!neededRefs.has(oldRef)) {
                delete shardPayloads[targetIdx][oldRef];
              }
            });
          }
          shardPayloads[targetIdx][ref] = dataUrl;
          shardDirty[targetIdx] = true;
          shardCursor++;
        });

        await Promise.all(
          activeShards.map(async (s, idx) => {
            if (!shardDirty[idx]) return;
            if (idx === 0) return; // Shard 0 updates together with catalog below
            await s.client.auth.updateUser({
              data: { dm_images: shardPayloads[idx] },
            });
          }),
        );

        const shard0Images = shardPayloads[0] || primaryShard.user?.user_metadata?.dm_images || {};
        await primaryShard.client.auth.updateUser({
          data: {
            dm_images: shard0Images,
            dm_catalog_v2: {
              updated_at: new Date().toISOString(),
              deleted_ids: deletedIds,
              records: dirtyListings,
            },
          },
        });
      } else {
        await primaryShard.client.auth.updateUser({
          data: {
            dm_catalog_v2: {
              updated_at: new Date().toISOString(),
              deleted_ids: deletedIds,
              records: dirtyListings,
            },
          },
        });
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

export async function syncListingsFromCloud() {
  if (!isSupabaseConfigured) return false;
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const primaryShard = await getAuthenticatedCloudShard(CLOUD_SHARD_ACCOUNTS[0]);
      if (!primaryShard) return false;

      const meta = primaryShard.user?.user_metadata || {};
      const catalog = meta.dm_catalog_v2;
      const shard0Images = meta.dm_images || {};

      Object.entries(shard0Images).forEach(([ref, dataUrl]) => {
        if (isDataImageUrl(dataUrl)) {
          imageMemoryCache.set(ref, dataUrl);
          try {
            window.localStorage.setItem(`${IMAGE_LS_PREFIX}${ref}`, dataUrl);
          } catch {
            // ignore
          }
          idbPut('images', ref, dataUrl);
        }
      });

      const cloudRecords = Array.isArray(catalog?.records) ? catalog.records : [];
      const cloudDeletedIds = Array.isArray(catalog?.deleted_ids) ? catalog.deleted_ids : [];

      // Check if any cloud record references an image in shard 1 or shard 2
      const missingRefs = new Set();
      cloudRecords.forEach((rec) => {
        (rec?.images || []).forEach((img) => {
          if (isImageRef(img) && !isDataImageUrl(resolveImageRef(img))) {
            missingRefs.add(img);
          }
        });
      });

      if (missingRefs.size > 0) {
        const extraShards = await Promise.all(
          CLOUD_SHARD_ACCOUNTS.slice(1).map((email) => getAuthenticatedCloudShard(email)),
        );
        extraShards.filter(Boolean).forEach((s) => {
          const imgs = s.user?.user_metadata?.dm_images || {};
          Object.entries(imgs).forEach(([ref, dataUrl]) => {
            if (isDataImageUrl(dataUrl)) {
              imageMemoryCache.set(ref, dataUrl);
              try {
                window.localStorage.setItem(`${IMAGE_LS_PREFIX}${ref}`, dataUrl);
              } catch {
                // ignore
              }
              idbPut('images', ref, dataUrl);
            }
          });
        });
      }

      const deletedSet = getDeletedListingIds();
      cloudDeletedIds.forEach((id) => {
        deletedSet.add(id);
        markListingDeleted(id);
      });

      const localListings = storage.get('listings', INITIAL_LISTINGS);
      const hydratedCloudRecords = cloudRecords.map((rec) => {
        const base = INITIAL_LISTINGS_BY_ID.get(rec.id) || {};
        return sanitizeListingRecord({ ...base, ...rec });
      });

      const { items: mergedListings, changed, localHasNewer } = mergeListingsLists(
        localListings,
        hydratedCloudRecords,
        deletedSet,
      );

      if (changed) {
        storage.set('listings', mergedListings);
        mergedListings.forEach(syncListingImagesAcrossStores);
        notifySubscribers('listings');
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

if (typeof window !== 'undefined' && isSupabaseConfigured) {
  // Initial cloud sync on load
  syncListingsFromCloud();

  // Re-sync when tab becomes visible or window gains focus
  window.addEventListener('focus', () => {
    syncListingsFromCloud();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncListingsFromCloud();
    }
  });
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
        updatedListing = {
          ...item,
          images: propertyRecord.images,
          updated_date: new Date().toISOString(),
        };
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
      const deletedSet = storageKey === 'listings' ? getDeletedListingIds() : null;
      let healed = false;
      const filtered = deletedSet
        ? data.filter((item) => {
            if (deletedSet.has(item?.id)) {
              healed = true;
              return false;
            }
            return true;
          })
        : data;
      const cleaned = filtered.map((item) => {
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
    broadcastStoreUpdate([storageKey]);
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
      const now = new Date().toISOString();
      const created = {
        ...record,
        id,
        created_date: record.created_date || now,
        updated_date: record.updated_date || now,
      };
      all.unshift(created);
      saveStore(all);
      if (storageKey === 'listings') {
        syncListingImagesAcrossStores(created);
        broadcastStoreUpdate(['listings', 'properties', 'favorites']);
        await Promise.race([
          pushListingsToCloud(),
          new Promise((r) => setTimeout(r, 1800)),
        ]);
      }
      if (storageKey === 'properties') {
        syncPropertyImagesToListing(created);
      }
      return created;
    },

    async bulkCreate(records = []) {
      const all = getStore();
      const now = new Date().toISOString();
      const createdList = records.map((r, i) => ({
        ...r,
        id: r.id || `rec-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        created_date: r.created_date || now,
        updated_date: r.updated_date || now,
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
      const updated = {
        ...all[index],
        ...updates,
        updated_date: new Date().toISOString(),
      };
      all[index] = updated;
      saveStore(all);
      if (storageKey === 'listings') {
        syncListingImagesAcrossStores(updated);
        broadcastStoreUpdate(['listings', 'properties', 'favorites']);
        await Promise.race([
          pushListingsToCloud(),
          new Promise((r) => setTimeout(r, 1800)),
        ]);
      }
      if (storageKey === 'properties') {
        syncPropertyImagesToListing(updated);
      }
      return updated;
    },

    async updateMany(query, updates) {
      const all = getStore();
      let updatedCount = 0;
      const updatedRecords = [];
      const now = new Date().toISOString();
      all.forEach((item, index) => {
        if (matchesQuery(item, query)) {
          all[index] = { ...item, ...updates, updated_date: now };
          updatedRecords.push(all[index]);
          updatedCount++;
        }
      });
      saveStore(all);
      if (storageKey === 'listings') {
        updatedRecords.forEach(syncListingImagesAcrossStores);
        broadcastStoreUpdate(['listings', 'properties', 'favorites']);
        await Promise.race([
          pushListingsToCloud(),
          new Promise((r) => setTimeout(r, 1800)),
        ]);
      }
      if (storageKey === 'properties') {
        updatedRecords.forEach(syncPropertyImagesToListing);
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
          new Promise((r) => setTimeout(r, 1800)),
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
          new Promise((r) => setTimeout(r, 1800)),
        ]);
      }
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
