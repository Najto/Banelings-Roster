import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BLIZZARD_CLIENT_ID = Deno.env.get("BLIZZARD_CLIENT_ID") ?? "";
const BLIZZARD_CLIENT_SECRET = Deno.env.get("BLIZZARD_CLIENT_SECRET") ?? "";
const WCL_CLIENT_ID = Deno.env.get("WCL_CLIENT_ID") ?? "";
const WCL_CLIENT_SECRET = Deno.env.get("WCL_CLIENT_SECRET") ?? "";

const STALE_THRESHOLD_MS = 60 * 60 * 1000;

const ENCHANTABLE_TYPES = ["BACK", "CHEST", "WRIST", "LEGS", "FEET", "FINGER_1", "FINGER_2", "MAIN_HAND"];
const TIER_TYPES = ["HEAD", "SHOULDER", "CHEST", "HANDS", "LEGS"];

const SLOT_MAP: Record<string, string> = {
  HEAD: "head", NECK: "neck", SHOULDER: "shoulder", BACK: "back", CHEST: "chest",
  WRIST: "wrist", HANDS: "hands", WAIST: "waist", LEGS: "legs", FEET: "feet",
  FINGER_1: "finger1", FINGER_2: "finger2", TRINKET_1: "trinket1", TRINKET_2: "trinket2",
  MAIN_HAND: "mainhand", OFF_HAND: "offhand",
};

const DIFFICULTY_MAP: Record<number, string> = { 3: "Normal", 4: "Heroic", 5: "Mythic" };

const DEFAULT_RAID = {
  raidName: "Liberation of Undermine",
  raidSlug: "liberation-of-undermine",
  wclZoneId: 42,
  totalBosses: 8,
};

function determineTrack(ilvl: number): string {
  if (ilvl >= 639) return "Mythic";
  if (ilvl >= 626) return "Heroic";
  if (ilvl >= 613) return "Champion";
  if (ilvl >= 590) return "Veteran";
  if (ilvl >= 558) return "Adventurer";
  return "Explorer";
}

function getResetTimestamp(): number {
  const now = new Date();
  const resetDay = 3;
  const resetHour = 8;
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), resetHour, 0, 0));
  const day = now.getUTCDay();
  const diff = day < resetDay ? (day + 7 - resetDay) : (day - resetDay);
  reset.setUTCDate(reset.getUTCDate() - diff);
  if (day === resetDay && now.getUTCHours() < resetHour) {
    reset.setUTCDate(reset.getUTCDate() - 7);
  }
  return reset.getTime();
}

async function fetchBlizzardToken(): Promise<string> {
  try {
    const res = await fetch("https://oauth.battle.net/token", {
      method: "POST",
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      headers: { Authorization: "Basic " + btoa(`${BLIZZARD_CLIENT_ID}:${BLIZZARD_CLIENT_SECRET}`) },
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.access_token || "";
  } catch {
    return "";
  }
}

async function blizzardFetch(token: string, url: string): Promise<any> {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function fetchWclToken(): Promise<string> {
  try {
    const res = await fetch("https://www.warcraftlogs.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${WCL_CLIENT_ID}:${WCL_CLIENT_SECRET}`)}`,
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.access_token || "";
  } catch {
    return "";
  }
}

async function queryWCL(token: string, query: string, variables: Record<string, unknown>): Promise<any> {
  try {
    const res = await fetch("https://www.warcraftlogs.com/api/v2/client", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function fetchRaiderIO(name: string, realm: string, raidSlug: string, totalBosses: number): Promise<any> {
  try {
    const fields = [
      "mythic_plus_scores_by_season:current",
      "mythic_plus_recent_runs",
      "mythic_plus_weekly_highest_level_runs",
      `raid_progression`,
      "gear",
      "mythic_plus_ranks",
    ].join(",");
    const url = `https://raider.io/api/v1/characters/profile?region=eu&realm=${encodeURIComponent(realm)}&name=${encodeURIComponent(name)}&fields=${encodeURIComponent(fields)}`;
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function computeWeeklyRaidKills(raidBossKills: any[], baseline: any, resetDate: string) {
  if (!raidBossKills || raidBossKills.length === 0) return { count: 0, details: [], newBaseline: baseline };

  const newBaseline: Record<string, { normal: number; heroic: number; mythic: number }> = {};
  for (const boss of raidBossKills) {
    newBaseline[boss.name] = { normal: boss.normal || 0, heroic: boss.heroic || 0, mythic: boss.mythic || 0 };
  }

  if (!baseline || baseline.resetDate !== resetDate) {
    return { count: 0, details: [], newBaseline: { resetDate, bosses: newBaseline } };
  }

  const details: { bossName: string; difficulty: string; difficultyId: number }[] = [];
  for (const boss of raidBossKills) {
    const prev = baseline.bosses?.[boss.name] || { normal: 0, heroic: 0, mythic: 0 };
    const mythicNew = (boss.mythic || 0) - (prev.mythic || 0);
    const heroicNew = (boss.heroic || 0) - (prev.heroic || 0);
    const normalNew = (boss.normal || 0) - (prev.normal || 0);
    if (mythicNew > 0) details.push({ bossName: boss.name, difficulty: "Mythic", difficultyId: 5 });
    else if (heroicNew > 0) details.push({ bossName: boss.name, difficulty: "Heroic", difficultyId: 4 });
    else if (normalNew > 0) details.push({ bossName: boss.name, difficulty: "Normal", difficultyId: 3 });
  }

  return { count: details.length, details, newBaseline: { resetDate, bosses: newBaseline } };
}

async function enrichCharacter(
  name: string,
  realm: string,
  existingData: any,
  blizzToken: string,
  wclToken: string,
  raidConfig: typeof DEFAULT_RAID
): Promise<any> {
  const normalizedRealm = realm.toLowerCase();
  const normalizedName = name.toLowerCase();
  const ns = "profile-eu";
  const base = `https://eu.api.blizzard.com/profile/wow/character/${normalizedRealm}/${normalizedName}`;

  const [summary, stats, achievements, professions, equipment, pvpSummary, reputations, quests, mountsRes, petsRes, toysRes] = await Promise.all([
    blizzardFetch(blizzToken, `${base}?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/statistics?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/achievements?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/professions?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/equipment?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/pvp-summary?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/reputations?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/quests/completed?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/collections/mounts?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/collections/pets?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/collections/toys?namespace=${ns}&locale=en_GB`),
  ]);

  const [pvpSolo, pvp2v2, pvp3v3] = await Promise.all([
    blizzardFetch(blizzToken, `${base}/pvp-bracket/shuffle?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/pvp-bracket/2v2?namespace=${ns}&locale=en_GB`),
    blizzardFetch(blizzToken, `${base}/pvp-bracket/3v3?namespace=${ns}&locale=en_GB`),
  ]);

  const rio = await fetchRaiderIO(name, realm, raidConfig.raidSlug, raidConfig.totalBosses);

  let wclData: any = null;
  if (wclToken) {
    try {
      const resetMs = getResetTimestamp();
      const zoneArg = raidConfig.wclZoneId ? `zoneID: ${raidConfig.wclZoneId}, ` : "";
      const rankingsQuery = `
        query ($name: String!, $server: String!, $region: String!) {
          characterData {
            character(name: $name, serverSlug: $server, serverRegion: $region) {
              mythic: zoneRankings(${zoneArg}difficulty: 5)
              heroic: zoneRankings(${zoneArg}difficulty: 4)
              normal: zoneRankings(${zoneArg}difficulty: 3)
              recentReports(limit: 15) {
                data { code startTime endTime zone { id name } }
              }
            }
          }
        }
      `;
      const result = await queryWCL(wclToken, rankingsQuery, {
        name: normalizedName,
        server: normalizedRealm.replace(/\s+/g, "-"),
        region: "eu",
      });

      const character = result?.data?.characterData?.character;
      if (character) {
        const zoneData = character.mythic || character.heroic || character.normal;
        if (zoneData) {
          const highestDifficulty = character.mythic ? 5 : character.heroic ? 4 : 3;
          const mapRankings = (source: any, diff: number) =>
            ((source?.rankings as any[]) || []).map((r: any) => ({
              encounter: { name: r.encounter?.name || "Unknown" },
              difficulty: diff,
              rankPercent: r.rankPercent || 0,
              totalKills: r.totalKills || 0,
              bestAmount: r.bestAmount || 0,
              spec: r.spec || "",
            }));
          const rankings = mapRankings(zoneData, highestDifficulty);
          const mythicRankings = character.mythic ? mapRankings(character.mythic, 5) : [];
          const allStarPoints = Array.isArray(zoneData.allStars) && zoneData.allStars.length > 0
            ? zoneData.allStars[0].points || 0 : 0;

          let weeklyRaidKills: any[] = [];
          let raidBossKills: any[] = [];

          const recentReports = character.recentReports?.data || [];
          const reportsThisWeek = recentReports.filter((r: any) => {
            if (r.startTime < resetMs) return false;
            if (raidConfig.wclZoneId && r.zone?.id && r.zone.id !== raidConfig.wclZoneId) return false;
            return true;
          });

          if (reportsThisWeek.length > 0) {
            const reportCodes = reportsThisWeek.map((r: any) => r.code);
            const aliases = reportCodes.map((code: string, i: number) =>
              `r${i}: report(code: "${code}") { fights(kill: true) { encounterID name difficulty } }`
            ).join("\n");
            const fightsQuery = `query { reportData { ${aliases} } }`;
            const fightsResult = await queryWCL(wclToken, fightsQuery, {});
            if (fightsResult?.data?.reportData) {
              const reportData = fightsResult.data.reportData;
              const bossKillsByDifficulty = new Map<string, any>();
              const weeklyKillsForCompat = new Map<string, any>();
              for (const key of Object.keys(reportData)) {
                const fights = reportData[key]?.fights || [];
                for (const fight of fights) {
                  if (!fight.encounterID) continue;
                  const diff = fight.difficulty || 0;
                  if (diff < 3 || diff > 5) continue;
                  const bossKey = fight.name || `encounter-${fight.encounterID}`;
                  if (!bossKillsByDifficulty.has(bossKey)) {
                    bossKillsByDifficulty.set(bossKey, { name: bossKey, normal: 0, heroic: 0, mythic: 0 });
                  }
                  const bossData = bossKillsByDifficulty.get(bossKey);
                  if (diff === 3) bossData.normal++;
                  else if (diff === 4) bossData.heroic++;
                  else if (diff === 5) bossData.mythic++;
                  const existing = weeklyKillsForCompat.get(bossKey);
                  if (!existing || diff > existing.difficultyId) {
                    weeklyKillsForCompat.set(bossKey, { bossName: bossKey, difficulty: DIFFICULTY_MAP[diff] || "Normal", difficultyId: diff });
                  }
                }
              }
              raidBossKills = Array.from(bossKillsByDifficulty.values());
              weeklyRaidKills = Array.from(weeklyKillsForCompat.values()).sort((a, b) => b.difficultyId - a.difficultyId);
            }
          }

          const parseValues = rankings.map((r: any) => r.rankPercent).filter((v: number) => v > 0);
          const bestParse = parseValues.length > 0 ? Math.max(...parseValues) : 0;
          const medianPerformance = parseValues.length > 0
            ? [...parseValues].sort((a, b) => a - b)[Math.floor(parseValues.length / 2)] : 0;

          wclData = {
            bestParse: Math.round(bestParse * 10) / 10,
            medianPerformance: Math.round(medianPerformance * 10) / 10,
            bestPerformance: Math.round(bestParse * 10) / 10,
            allStarPoints: Math.round(allStarPoints * 10) / 10,
            bossesLogged: rankings.length,
            totalKills: rankings.reduce((s: number, r: any) => s + r.totalKills, 0),
            mythicBossesLogged: mythicRankings.length,
            mythicTotalKills: mythicRankings.reduce((s: number, r: any) => s + r.totalKills, 0),
            highestDifficulty,
            highestDifficultyLabel: DIFFICULTY_MAP[highestDifficulty] || "",
            rankings: rankings.map((r: any) => ({ encounter: r.encounter?.name || "Unknown", difficulty: r.difficulty, rankPercent: r.rankPercent, totalKills: r.totalKills, bestAmount: r.bestAmount, spec: r.spec })),
            weeklyRaidKills,
            raidBossKills,
          };
        }
      }
    } catch (e) {
      console.warn(`WCL fetch failed for ${name}:`, e);
    }
  }

  const repFactionMap: Record<string, string> = {
    "Council of Dornogal": "dornogal", "Assembly of the Deeps": "deeps",
    "Hallowfall Arathi": "arathi", "The Severed Threads": "threads",
    "Beledar's Spawn": "karesh", "Brann Bronzebeard": "vandals",
    "Cartels of the Undermine": "undermine", "Gallagio Loyalty Rewards": "gallagio",
  };

  const repsObj: Record<string, number> = { dornogal: 0, deeps: 0, arathi: 0, threads: 0, karesh: 0, vandals: 0, undermine: 0, gallagio: 0 };
  if (reputations?.reputations) {
    for (const rep of reputations.reputations) {
      const key = repFactionMap[rep.faction?.name];
      if (key) repsObj[key] = rep.standing?.value || rep.standing?.raw || 0;
    }
  }

  const completedQuestIds = new Set<number>((quests?.quests || []).map((q: any) => q.id as number));

  const rioBossKills = (rio?.raid_progression ? [] : []) as any[];
  const wclBossKills = wclData?.raidBossKills || [];
  const mergedBossKillsMap = new Map<string, any>();
  rioBossKills.forEach((b: any) => mergedBossKillsMap.set(b.name, { ...b }));
  wclBossKills.forEach((b: any) => {
    if (mergedBossKillsMap.has(b.name)) {
      const ex = mergedBossKillsMap.get(b.name);
      mergedBossKillsMap.set(b.name, { name: b.name, normal: Math.max(ex.normal, b.normal), heroic: Math.max(ex.heroic, b.heroic), mythic: Math.max(ex.mythic, b.mythic) });
    } else {
      mergedBossKillsMap.set(b.name, b);
    }
  });
  const mergedBossKills = Array.from(mergedBossKillsMap.values());

  const resetDate = new Date(getResetTimestamp()).toISOString().split("T")[0];
  const { count: weeklyCount, details: weeklyDetails, newBaseline } =
    computeWeeklyRaidKills(mergedBossKills, existingData?.raidKillBaseline, resetDate);

  const wclDetails = (wclData?.weeklyRaidKills || []).map((k: any) => ({
    bossName: k.bossName, difficulty: k.difficulty, difficultyId: k.difficultyId,
  }));
  const finalDetails = wclDetails.length > weeklyDetails.length ? wclDetails : weeklyDetails;
  const finalCount = wclDetails.length > weeklyDetails.length ? wclDetails.length : weeklyCount;

  const gearAudit: any = existingData?.gearAudit || {
    sockets: 0, missingSockets: 0, enchantments: 0, tierCount: 0, sparkItems: 0, upgradeTrack: "Explorer",
    tierPieces: { helm: false, shoulder: false, chest: false, gloves: false, legs: false },
    enchants: { cloak: false, chest: false, wrists: false, legs: false, feet: false, ring1: false, ring2: false, weapon: false, offhand: false, totalRank: 0, missingCount: 0 },
    specificItems: {}, embellishments: [], gems: { rare: 0, epic: 0 },
    itemTracks: { mythic: 0, heroic: 0, champion: 0, veteran: 0, adventurer: 0, explorer: 0 },
    stats: { crit: 0, haste: 0, mastery: 0, vers: 0, critPct: 0, hastePct: 0, masteryPct: 0, versPct: 0 },
    slots: {},
    vault: { rank: 0, thisWeek: 0, raid: [{ label: "-", ilvl: 0 }, { label: "-", ilvl: 0 }, { label: "-", ilvl: 0 }], dungeon: [{ label: "-", ilvl: 0 }, { label: "-", ilvl: 0 }, { label: "-", ilvl: 0 }], world: [{ label: "-", ilvl: 0 }, { label: "-", ilvl: 0 }, { label: "-", ilvl: 0 }], score: 0 }
  };

  if (equipment?.equipped_items) {
    const slots: Record<string, any> = {};
    const itemTracks = { mythic: 0, heroic: 0, champion: 0, veteran: 0, adventurer: 0, explorer: 0 };
    let totalGemsSlotted = 0, enchantsDone = 0, missingEnchantsCount = 0, tierCount = 0;

    for (const item of equipment.equipped_items) {
      const ilvl = item.level?.value || 0;
      const trackName = determineTrack(ilvl);
      const trackKey = trackName.toLowerCase() as keyof typeof itemTracks;
      if (trackKey in itemTracks) itemTracks[trackKey]++;
      const hasEnchant = !!(item.enchantments?.length > 0);
      const isEnchantable = ENCHANTABLE_TYPES.includes(item.slot.type);
      if (isEnchantable) { if (hasEnchant) enchantsDone++; else missingEnchantsCount++; }
      const gemsSlotted = item.sockets?.filter((s: any) => s.item)?.length || 0;
      totalGemsSlotted += gemsSlotted;
      const isTier = !!item.set && TIER_TYPES.includes(item.slot.type);
      if (isTier) tierCount++;
      const internalKey = SLOT_MAP[item.slot.type] || item.slot.type.toLowerCase();
      slots[internalKey] = { name: item.name, ilvl, track: trackName, hasEnchant, isTier, hasGem: gemsSlotted > 0, gemsCount: gemsSlotted };
    }

    gearAudit.itemTracks = itemTracks;
    gearAudit.slots = { ...gearAudit.slots, ...slots };
    gearAudit.sockets = totalGemsSlotted;
    gearAudit.enchantments = enchantsDone;
    gearAudit.enchants.missingCount = missingEnchantsCount;
    gearAudit.tierCount = tierCount;
    gearAudit.enchants.cloak = !!slots["back"]?.hasEnchant;
    gearAudit.enchants.chest = !!slots["chest"]?.hasEnchant;
    gearAudit.enchants.wrists = !!slots["wrist"]?.hasEnchant;
    gearAudit.enchants.legs = !!slots["legs"]?.hasEnchant;
    gearAudit.enchants.feet = !!slots["feet"]?.hasEnchant;
    gearAudit.enchants.ring1 = !!slots["finger1"]?.hasEnchant;
    gearAudit.enchants.ring2 = !!slots["finger2"]?.hasEnchant;
    gearAudit.enchants.weapon = !!slots["mainhand"]?.hasEnchant;
  }

  if (stats && gearAudit) {
    gearAudit.stats = {
      ...gearAudit.stats,
      critPct: stats.melee_crit?.value ?? stats.spell_crit?.value ?? stats.ranged_crit?.value ?? 0,
      hastePct: stats.melee_haste?.value ?? stats.spell_haste?.value ?? stats.ranged_haste?.value ?? 0,
      masteryPct: stats.mastery?.value ?? 0,
      versPct: stats.versatility_damage_done_bonus ?? 0,
    };
  }

  const itemLevel = summary?.equipped_item_level || rio?.gear?.item_level_equipped || existingData?.itemLevel || 0;
  gearAudit.upgradeTrack = determineTrack(itemLevel);

  const sorted = [...finalDetails].sort((a, b) => b.difficultyId - a.difficultyId);
  gearAudit.vault.raid = [
    { label: finalCount >= 2 ? (sorted[1]?.difficulty || "Normal") : "-", ilvl: 0 },
    { label: finalCount >= 4 ? (sorted[3]?.difficulty || "Normal") : "-", ilvl: 0 },
    { label: finalCount >= 6 ? (sorted[5]?.difficulty || "Normal") : "-", ilvl: 0 },
  ];

  return {
    ...existingData,
    name,
    server: realm,
    itemLevel,
    spec: rio?.active_spec_name || summary?.active_spec?.name || existingData?.spec,
    race: summary?.race?.name || existingData?.race,
    thumbnailUrl: summary?.character_media?.href || rio?.thumbnail_url || existingData?.thumbnailUrl,
    guild: summary?.guild?.name || existingData?.guild,
    mPlusRating: rio?.mythic_plus_scores_by_season?.[0]?.scores?.all || existingData?.mPlusRating || 0,
    weeklyTenPlusCount: (rio?.mythic_plus_weekly_highest_level_runs || []).filter((r: any) => r.mythic_level >= 10).length,
    recentRuns: (rio?.mythic_plus_recent_runs || []).slice(0, 10),
    raidProgression: rio?.raid_progression?.[raidConfig.raidSlug] || existingData?.raidProgression,
    mPlusRanks: rio?.mythic_plus_ranks || existingData?.mPlusRanks,
    raidBossKills: mergedBossKills,
    raidKillBaseline: newBaseline,
    weeklyRaidBossKills: finalCount,
    weeklyRaidKillDetails: finalDetails,
    collections: {
      mounts: mountsRes?.mounts?.length || 0,
      pets: petsRes?.pets?.length || 0,
      toys: toysRes?.toys?.length || 0,
      achievements: achievements?.total_quantity || 0,
      titles: summary?.titles?.length || 0,
    },
    currencies: { weathered: 0, carved: 0, runed: 0, gilded: 0, valorstones: 0 },
    pvp: {
      honorLevel: pvpSummary?.honor_level || 0,
      kills: pvpSummary?.honorable_kills || 0,
      ratings: { solo: pvpSolo?.rating || 0, v2: pvp2v2?.rating || 0, v3: pvp3v3?.rating || 0, rbg: 0 },
      games: {
        season: (pvpSolo?.season_match_statistics?.played || 0) + (pvp2v2?.season_match_statistics?.played || 0) + (pvp3v3?.season_match_statistics?.played || 0),
        weekly: (pvpSolo?.weekly_match_statistics?.played || 0) + (pvp2v2?.weekly_match_statistics?.played || 0) + (pvp3v3?.weekly_match_statistics?.played || 0),
      },
    },
    reputations: repsObj,
    activities: {
      worldQuests: completedQuestIds.size > 0 ? Math.min(completedQuestIds.size, 999) : 0,
      events: {
        theater: completedQuestIds.has(82946) || completedQuestIds.has(84042),
        awakening: completedQuestIds.has(82710) || completedQuestIds.has(82787),
        worldsoul: completedQuestIds.has(82458) || completedQuestIds.has(82459),
        memories: completedQuestIds.has(84488) || completedQuestIds.has(84489),
      },
      cofferKeys: 0,
      heroicDungeons: 0,
      mythicDungeons: (rio?.mythic_plus_recent_runs || []).length,
      highestMplus: (rio?.mythic_plus_recent_runs || []).length > 0
        ? Math.max(...(rio.mythic_plus_recent_runs as any[]).map((r: any) => r.mythic_level)) : 0,
    },
    professions: professions?.primaries?.map((p: any) => ({ name: p.profession.name, rank: p.rank })) || [],
    warcraftLogs: wclData || existingData?.warcraftLogs,
    gearAudit,
  };
}

async function pLimit<T>(fns: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < fns.length) {
      const i = idx++;
      results[i] = await fns[i]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, fns.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
    const { data: staleRows, error: fetchError } = await supabase
      .from("character_data")
      .select("id, character_name, realm, player_name, role, enriched_data, last_enriched_at")
      .or(`last_enriched_at.is.null,last_enriched_at.lt.${cutoff}`);

    if (fetchError) {
      console.error("Failed to fetch stale characters:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!staleRows || staleRows.length === 0) {
      return new Response(JSON.stringify({ message: "No stale characters to sync", synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: configRow } = await supabase
      .from("configuration")
      .select("value")
      .eq("key", "current_raid")
      .maybeSingle();
    const raidConfig = (configRow?.value as typeof DEFAULT_RAID) || DEFAULT_RAID;

    const blizzToken = await fetchBlizzardToken();
    const wclToken = await fetchWclToken();

    let synced = 0;
    let failed = 0;

    const tasks = staleRows.map((row) => async () => {
      try {
        const enriched = await enrichCharacter(
          row.character_name,
          row.realm,
          row.enriched_data || {},
          blizzToken,
          wclToken,
          raidConfig
        );

        const { error: upsertError } = await supabase
          .from("character_data")
          .update({ enriched_data: enriched, last_enriched_at: new Date().toISOString() })
          .eq("id", row.id);

        if (upsertError) {
          console.error(`Failed to upsert ${row.character_name}:`, upsertError);
          failed++;
        } else {
          synced++;
        }
      } catch (e) {
        console.error(`Error enriching ${row.character_name}:`, e);
        failed++;
      }
    });

    await pLimit(tasks, 5);

    return new Response(JSON.stringify({ message: "Sync complete", synced, failed, total: staleRows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-roster error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
