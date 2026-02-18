
import { WoWClass } from '../types';

const CLIENT_ID = import.meta.env.VITE_BLIZZARD_CLIENT_ID || "";
const CLIENT_SECRET = import.meta.env.VITE_BLIZZARD_CLIENT_SECRET || "";

/**
 * Fetches an OAuth Client Credentials token from Battle.net.
 * Required for all subsequent API calls.
 */
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
    console.error("Blizzard Auth failed", e);
    return "";
  }
};

/**
 * Endpoint: /profile/wow/character/{realm}/{name}
 * Returns: Basic character data (Level, Race, Class, Active Title, Equipped Item Level).
 */
export const getCharacterSummary = async (token: string, realm: string, name: string): Promise<any> => {
  const base = `https://eu.api.blizzard.com/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}`;
  const ns = "profile-eu";
  
  try {
    const response = await fetch(`${base}?namespace=${ns}&locale=en_GB`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    return null;
  }
};

/**
 * Endpoint: /profile/wow/character/{realm}/{name}/statistics
 * Returns: Primary and Secondary stats (Crit, Haste, Mastery, Versatility).
 */
export const getCharacterStats = async (token: string, realm: string, name: string): Promise<any> => {
  const base = `https://eu.api.blizzard.com/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/statistics`;
  const ns = "profile-eu";
  
  try {
    const response = await fetch(`${base}?namespace=${ns}&locale=en_GB`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    return null;
  }
};

// Fetch character achievements summary
export const getCharacterAchievements = async (token: string, realm: string, name: string): Promise<any> => {
  const base = `https://eu.api.blizzard.com/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/achievements`;
  const ns = "profile-eu";
  try {
    const response = await fetch(`${base}?namespace=${ns}&locale=en_GB`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok ? await response.json() : null;
  } catch (e) { return null; }
};

// Aggregate collections data (mounts, pets, toys) as expected by App.tsx
export const getCharacterCollections = async (token: string, realm: string, name: string): Promise<any> => {
  const ns = "profile-eu";
  const baseUrl = `https://eu.api.blizzard.com/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/collections`;
  try {
    const [mounts, pets, toys] = await Promise.all([
      fetch(`${baseUrl}/mounts?namespace=${ns}&locale=en_GB`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${baseUrl}/pets?namespace=${ns}&locale=en_GB`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${baseUrl}/toys?namespace=${ns}&locale=en_GB`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
    ]);
    return { mounts, pets, toys };
  } catch (e) { return null; }
};

// Fetch character primary and secondary professions
export const getCharacterProfessions = async (token: string, realm: string, name: string): Promise<any> => {
  const base = `https://eu.api.blizzard.com/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/professions`;
  const ns = "profile-eu";
  try {
    const response = await fetch(`${base}?namespace=${ns}&locale=en_GB`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok ? await response.json() : null;
  } catch (e) { return null; }
};

/**
 * Endpoint: /profile/wow/character/{realm}/{name}/equipment
 * Returns: Detailed item data for every equipped slot, including:
 * - Sockets (gems)
 * - Enchantments
 * - Set Bonuses
 * - Upgrade Tracks
 */
export const getCharacterEquipment = async (token: string, realm: string, name: string): Promise<any> => {
  const base = `https://eu.api.blizzard.com/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/equipment`;
  const ns = "profile-eu";
  try {
    const response = await fetch(`${base}?namespace=${ns}&locale=en_GB`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok ? await response.json() : null;
  } catch (e) { return null; }
};

export const getCharacterPvPSummary = async (token: string, realm: string, name: string): Promise<any> => {
  const base = `https://eu.api.blizzard.com/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/pvp-summary`;
  const ns = "profile-eu";
  try {
    const response = await fetch(`${base}?namespace=${ns}&locale=en_GB`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok ? await response.json() : null;
  } catch (e) { return null; }
};

export const getCharacterPvPBracket = async (token: string, realm: string, name: string, bracket: string): Promise<any> => {
  const base = `https://eu.api.blizzard.com/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/pvp-bracket/${bracket}`;
  const ns = "profile-eu";
  try {
    const response = await fetch(`${base}?namespace=${ns}&locale=en_GB`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok ? await response.json() : null;
  } catch (e) { return null; }
};

export const getCharacterReputations = async (token: string, realm: string, name: string): Promise<any> => {
  const base = `https://eu.api.blizzard.com/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/reputations`;
  const ns = "profile-eu";
  try {
    const response = await fetch(`${base}?namespace=${ns}&locale=en_GB`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok ? await response.json() : null;
  } catch (e) { return null; }
};

export const getCharacterQuests = async (token: string, realm: string, name: string): Promise<any> => {
  const base = `https://eu.api.blizzard.com/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/quests/completed`;
  const ns = "profile-eu";
  try {
    const response = await fetch(`${base}?namespace=${ns}&locale=en_GB`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.ok ? await response.json() : null;
  } catch (e) { return null; }
};
