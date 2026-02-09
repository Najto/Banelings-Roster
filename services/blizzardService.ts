// services/blizzardService.ts

const BLIZZARD_API_BASE = 'https://eu.api.blizzard.com';
const BLIZZARD_AUTH_BASE = 'https://oauth.battle.net';

const CLIENT_ID = "6297890373d64a43920eebba7395ddd7"; 
const CLIENT_SECRET = "2aik8t8euM3mGGYDvUrELn9lNVarodGr";

// -----------------------------
// Simple in-memory cache
// -----------------------------
type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<any>>();

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

// -----------------------------
// Basic rate limiting
// -----------------------------
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // ms

async function rateLimit() {
  const now = Date.now();
  const diff = now - lastRequestTime;
  if (diff < MIN_REQUEST_INTERVAL) {
    await new Promise(res =>
      setTimeout(res, MIN_REQUEST_INTERVAL - diff)
    );
  }
  lastRequestTime = Date.now();
}

// -----------------------------
// OAuth token
// -----------------------------
export async function fetchBlizzardToken(): Promise<string> {
  const cached = getCache<string>('blizzard_token');
  if (cached) return cached;

  await rateLimit();

  const response = await fetch(`${BLIZZARD_AUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' +
        btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Blizzard token');
  }

  const data = await response.json();

  setCache('blizzard_token', data.access_token, data.expires_in * 1000);
  return data.access_token;
}

// -----------------------------
// Generic API fetcher
// -----------------------------
async function blizzardFetch<T>(
  endpoint: string,
  token: string,
  namespace = 'profile-eu'
): Promise<T> {
  const cacheKey = `${endpoint}`;

  const cached = getCache<T>(cacheKey);
  if (cached) return cached;

  await rateLimit();

  const url = `${BLIZZARD_API_BASE}${endpoint}?namespace=${namespace}&locale=en_GB`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Blizzard API error: ${response.status}`);
  }

  const data = await response.json();
  setCache(cacheKey, data, 60_000); // cache 60s
  return data;
}

// -----------------------------
// Character endpoints
// -----------------------------
export function getCharacterSummary(
  realm: string,
  name: string,
  token: string
) {
  return blizzardFetch(
    `/profile/wow/character/${realm}/${name}`,
    token
  );
}

export function getCharacterStats(
  realm: string,
  name: string,
  token: string
) {
  return blizzardFetch(
    `/profile/wow/character/${realm}/${name}/statistics`,
    token
  );
}

export function getCharacterAchievements(
  realm: string,
  name: string,
  token: string
) {
  return blizzardFetch(
    `/profile/wow/character/${realm}/${name}/achievements`,
    token
  );
}

export function getCharacterCollections(
  realm: string,
  name: string,
  token: string
) {
  return blizzardFetch(
    `/profile/wow/character/${realm}/${name}/collections`,
    token
  );
}

export function getCharacterProfessions(
  realm: string,
  name: string,
  token: string
) {
  return blizzardFetch(
    `/profile/wow/character/${realm}/${name}/professions`,
    token
  );
}

export function getCharacterEquipment(
  realm: string,
  name: string,
  token: string
) {
  return blizzardFetch(
    `/profile/wow/character/${realm}/${name}/equipment`,
    token
  );
}

export function getCharacterPvPSummary(
  realm: string,
  name: string,
  token: string
) {
  return blizzardFetch(
    `/profile/wow/character/${realm}/${name}/pvp-summary`,
    token
  );
}

export function getCharacterPvPBracket(
  realm: string,
  name: string,
  bracket: string,
  token: string
) {
  return blizzardFetch(
    `/profile/wow/character/${realm}/${name}/pvp-bracket/${bracket}`,
    token
  );
}

export function getCharacterReputations(
  realm: string,
  name: string,
  token: string
) {
  return blizzardFetch(
    `/profile/wow/character/${realm}/${name}/reputations`,
    token
  );
}

export function getCharacterQuests(
  realm: string,
  name: string,
  token: string
) {
  return blizzardFetch(
    `/profile/wow/character/${realm}/${name}/quests`,
    token
  );
}
