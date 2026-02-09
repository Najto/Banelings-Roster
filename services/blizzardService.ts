import Redis from "ioredis";
import pLimit from "p-limit";
import { Agent, setGlobalDispatcher } from "undici";

/* ===============================
   CONFIG
================================ */

const REGION = "eu";
const LOCALE = "en_GB";
const API_BASE = `https://${REGION}.api.blizzard.com`;

const CLIENT_ID = "6297890373d64a43920eebba7395ddd7";
const CLIENT_SECRET = "2aik8t8euM3mGGYDvUrELn9lNVarodGr";

/* ===============================
   HTTP KEEP-ALIVE
================================ */

const agent = new Agent({
  connections: 10,
  keepAliveTimeout: 10_000,
  keepAliveMaxTimeout: 60_000,
});

setGlobalDispatcher(agent);

/* ===============================
   REDIS
================================ */

const redis = new Redis(); // configure if needed

/* ===============================
   RATE LIMITING
================================ */
// Blizzard is generous, but don’t be rude
const limit = pLimit(5);

/* ===============================
   SERVICE
================================ */

export class BlizzardService {
  private token: { value: string; expiresAt: number } | null = null;

  /* ===========================
     AUTH
  ============================ */

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt) {
      return this.token.value;
    }

    const res = await fetch("https://oauth.battle.net/token", {
      method: "POST",
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      },
    });

    if (!res.ok) {
      throw new Error("Blizzard OAuth failed");
    }

    const data = await res.json();

    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    return this.token.value;
  }

  /* ===========================
     CORE FETCH (cached + limited)
  ============================ */

  private async fetch<T>(
    path: string,
    namespace = "profile-eu",
    ttlSeconds = 60
  ): Promise<T | null> {
    const cacheKey = `blizzard:${path}:${namespace}:${LOCALE}`;

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    return limit(async () => {
      const token = await this.getToken();
      const url = `${API_BASE}${path}?namespace=${namespace}&locale=${LOCALE}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return null;

      const data = await res.json();
      await redis.set(cacheKey, JSON.stringify(data), "EX", ttlSeconds);

      return data;
    });
  }

  /* ===========================
     CHARACTER ENDPOINTS
  ============================ */

  private charPath(realm: string, name: string) {
    return `/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}`;
  }

  getCharacterSummary(realm: string, name: string) {
    return this.fetch(`${this.charPath(realm, name)}`, "profile-eu", 60);
  }

  getCharacterStats(realm: string, name: string) {
    return this.fetch(`${this.charPath(realm, name)}/statistics`, "profile-eu", 60);
  }

  getCharacterEquipment(realm: string, name: string) {
    return this.fetch(`${this.charPath(realm, name)}/equipment`, "profile-eu", 120);
  }

  getCharacterProfessions(realm: string, name: string) {
    return this.fetch(`${this.charPath(realm, name)}/professions`, "profile-eu", 300);
  }

  getCharacterReputations(realm: string, name: string) {
    return this.fetch(`${this.charPath(realm, name)}/reputations`, "profile-eu", 300);
  }

  getCharacterAchievements(realm: string, name: string) {
    return this.fetch(`${this.charPath(realm, name)}/achievements`, "profile-eu", 300);
  }

  getCharacterCollections(realm: string, name: string) {
    const base = `${this.charPath(realm, name)}/collections`;
    return Promise.all([
      this.fetch(`${base}/mounts`, "profile-eu", 600),
      this.fetch(`${base}/pets`, "profile-eu", 600),
      this.fetch(`${base}/toys`, "profile-eu", 600),
    ]).then(([mounts, pets, toys]) => ({ mounts, pets, toys }));
  }

  /* ===========================
     AGGREGATED PROFILE
  ============================ */

  async getFullCharacterProfile(realm: string, name: string) {
    const [
      summary,
      stats,
      equipment,
      professions,
      reputations,
      achievements,
      collections,
    ] = await Promise.all([
      this.getCharacterSummary(realm, name),
      this.getCharacterStats(realm, name),
      this.getCharacterEquipment(realm, name),
      this.getCharacterProfessions(realm, name),
      this.getCharacterReputations(realm, name),
      this.getCharacterAchievements(realm, name),
      this.getCharacterCollections(realm, name),
    ]);

    return {
      summary,
      stats,
      equipment,
      professions,
      reputations,
      achievements,
      collections,
    };
    // ===============================
    // SINGLETON INSTANCE
    // ===============================
    
    export const blizzardService = new BlizzardService();
    
    // ===============================
    // BACKWARD-COMPAT EXPORTS
    // (so existing imports keep working)
    // ===============================
    
    export const fetchBlizzardToken = () =>
      blizzardService["getToken"]();
    
    export const getCharacterSummary = (realm: string, name: string) =>
      blizzardService.getCharacterSummary(realm, name);
    
    export const getCharacterStats = (realm: string, name: string) =>
      blizzardService.getCharacterStats(realm, name);
    
    export const getCharacterAchievements = (realm: string, name: string) =>
      blizzardService.getCharacterAchievements(realm, name);
    
    export const getCharacterCollections = (realm: string, name: string) =>
      blizzardService.getCharacterCollections(realm, name);
    
    export const getCharacterProfessions = (realm: string, name: string) =>
      blizzardService.getCharacterProfessions(realm, name);
    
    export const getCharacterEquipment = (realm: string, name: string) =>
      blizzardService.getCharacterEquipment(realm, name);
    
    export const getCharacterPvPSummary = (realm: string, name: string) =>
      blizzardService.fetch(
        `/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/pvp-summary`,
        "profile-eu",
        60
      );
    
    export const getCharacterPvPBracket = (
      realm: string,
      name: string,
      bracket: string
    ) =>
      blizzardService.fetch(
        `/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/pvp-bracket/${bracket}`,
        "profile-eu",
        60
      );
    
    export const getCharacterReputations = (realm: string, name: string) =>
      blizzardService.getCharacterReputations(realm, name);
    
    export const getCharacterQuests = (realm: string, name: string) =>
      blizzardService.fetch(
        `/profile/wow/character/${realm.toLowerCase()}/${name.toLowerCase()}/quests/completed`,
        "profile-eu",
        300
      );

  }
}
