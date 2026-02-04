
import { WoWClass, CharacterStats, CrestProgress, PvPStats } from '../types';

const CLIENT_ID = "6297890373d64a43920eebba7395ddd7";
const CLIENT_SECRET = "2aik8t8euM3mGGYDvUrELn9lNVarodGr";

const REGION = 'eu';
const NAMESPACE = 'profile-eu';
const LOCALE = 'en_GB';

const normalizeRealmForAPI = (realm: string): string => {
  return realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};

export interface BlizzardCharData {
  name: string;
  itemLevel: number;
  className: WoWClass;
  realm: string;
}

export interface BlizzardEquipmentItem {
  slot: { type: string; name: string };
  name?: { en_GB?: string } | string;
  level: { value: number };
  quality: { type: string };
  item: { id: number };
  bonus_list?: number[];
  enchantments?: { display_string: { en_GB: string } }[];
  sockets?: { item: { id: number } }[];
}

export interface BlizzardEquipmentData {
  equipped_items: BlizzardEquipmentItem[];
}

export interface BlizzardStatsData {
  character_class: { name: string };
  active_spec: { name: string };
  equipped_item_level: number;
  health: number;
  power: number;
  power_type: { name: string };
  stats: Array<{ type: { type: string }; value: number }>;
  speed: { rating: number; rating_bonus: number };
}

export interface BlizzardCurrency {
  id: number;
  quantity: number;
}

export const fetchBlizzardToken = async (): Promise<string> => {
  try {
    const response = await fetch("https://oauth.battle.net/token", {
      method: "POST",
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      headers: {
        Authorization: "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
      },
    });
    const data = await response.json();
    return data.access_token;
  } catch (e) {
    console.error("Auth failed", e);
    return "";
  }
};

const fetchBlizzardAPI = async (token: string, endpoint: string, silent404 = false): Promise<any | null> => {
  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      if (!silent404 || response.status !== 404) {
        console.warn(`Blizzard API returned ${response.status} for ${endpoint}`);
      }
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error(`Blizzard API fetch failed for ${endpoint}:`, e);
    return null;
  }
};

export const getCharacterData = async (token: string, realm: string, name: string): Promise<BlizzardCharData | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}?namespace=${NAMESPACE}&locale=${LOCALE}`;

  const data = await fetchBlizzardAPI(token, url);
  if (!data) return null;

  return {
    name: data.name,
    itemLevel: data.equipped_item_level,
    className: data.character_class.name as WoWClass,
    realm: data.realm.name
  };
};

export const getCharacterEquipment = async (token: string, realm: string, name: string): Promise<BlizzardEquipmentData | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/equipment?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};

export const getCharacterStats = async (token: string, realm: string, name: string): Promise<CharacterStats | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/statistics?namespace=${NAMESPACE}&locale=${LOCALE}`;

  const data = await fetchBlizzardAPI(token, url);
  if (!data) return null;

  console.log(`📊 Stats raw data for ${name}:`, {
    melee_crit: data.melee_crit,
    spell_crit: data.spell_crit,
    ranged_crit: data.ranged_crit,
    melee_haste: data.melee_haste,
    spell_haste: data.spell_haste,
    ranged_haste: data.ranged_haste,
    mastery: data.mastery,
    versatility: data.versatility,
    versatility_damage_done_bonus: data.versatility_damage_done_bonus
  });

  const critValue = data.melee_crit?.value ?? data.spell_crit?.value ?? data.ranged_crit?.value ?? 0;
  const hasteValue = data.melee_haste?.value ?? data.spell_haste?.value ?? data.ranged_haste?.value ?? 0;
  const masteryValue = data.mastery?.value ?? 0;
  const versValue = data.versatility_damage_done_bonus ?? (data.versatility ? data.versatility / 205 : 0);

  console.log(`📈 Parsed stats for ${name}: Crit ${critValue.toFixed(2)}%, Haste ${hasteValue.toFixed(2)}%, Mastery ${masteryValue.toFixed(2)}%, Vers ${versValue.toFixed(2)}%`);

  return {
    crit: critValue,
    haste: hasteValue,
    mastery: masteryValue,
    versatility: versValue
  };
};

export const getCharacterMythicKeystoneProfile = async (token: string, realm: string, name: string): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/mythic-keystone-profile?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};

export const getCharacterMythicKeystoneSeasonDetails = async (token: string, realm: string, name: string, seasonId: number): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/mythic-keystone-profile/season/${seasonId}?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};

export const getCharacterPvPBracketStats = async (token: string, realm: string, name: string, bracket: string): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/pvp-bracket/${bracket}?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url, true);
};

export const getCharacterPvPSummary = async (token: string, realm: string, name: string): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/pvp-summary?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url, true);
};

export const getCharacterAchievements = async (token: string, realm: string, name: string): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/achievements?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};

export const getCharacterCollections = async (token: string, realm: string, name: string): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/collections?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};

export const getItemDetails = async (token: string, itemId: number): Promise<{ name: { en_GB: string } } | null> => {
  const url = `https://${REGION}.api.blizzard.com/data/wow/item/${itemId}?namespace=static-${REGION}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};

export const getCharacterCurrencies = async (token: string, realm: string, name: string): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/currencies?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};

export const getCharacterQuests = async (token: string, realm: string, name: string): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/quests?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};

export const getCharacterCompletedQuests = async (token: string, realm: string, name: string): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/quests/completed?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};

export const getCharacterReputations = async (token: string, realm: string, name: string): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/reputations?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};

export const getCharacterProfessions = async (token: string, realm: string, name: string): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/professions?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};

export const getCharacterMedia = async (token: string, realm: string, name: string): Promise<any | null> => {
  const realmSlug = normalizeRealmForAPI(realm);
  const url = `https://${REGION}.api.blizzard.com/profile/wow/character/${realmSlug}/${name.toLowerCase()}/character-media?namespace=${NAMESPACE}&locale=${LOCALE}`;
  return fetchBlizzardAPI(token, url);
};
