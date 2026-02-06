import { Character } from '../types';

type CalcFn = (char: Character) => number | string | null;

const CALCULATED_FIELDS: Record<string, CalcFn> = {
  avgGearItemLevel: (char) => {
    const slots = char.gearAudit?.slots;
    if (!slots) return null;
    const values = Object.values(slots).map(s => s.ilvl).filter(v => v > 0);
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  },

  lowestGearSlotLevel: (char) => {
    const slots = char.gearAudit?.slots;
    if (!slots) return null;
    const values = Object.values(slots).map(s => s.ilvl).filter(v => v > 0);
    return values.length > 0 ? Math.min(...values) : null;
  },

  gearQualityScore: (char) => {
    const ga = char.gearAudit;
    if (!ga) return null;
    const trackScore = (ga.itemTracks.mythic * 6) + (ga.itemTracks.heroic * 5) + (ga.itemTracks.champion * 4)
      + (ga.itemTracks.veteran * 3) + (ga.itemTracks.adventurer * 2) + (ga.itemTracks.explorer * 1);
    const total = Object.values(ga.itemTracks).reduce((a, b) => a + b, 0);
    return total > 0 ? Math.round((trackScore / (total * 6)) * 100) : null;
  },

  greatVaultUnlocked: (char) => {
    const vault = char.gearAudit?.vault;
    if (!vault) return 0;
    let count = 0;
    vault.raid.forEach(s => { if (s.label !== '-') count++; });
    vault.dungeon.forEach(s => { if (s.label !== '-') count++; });
    vault.world.forEach(s => { if (s.label !== '-') count++; });
    return count;
  },

  missingEnchants: (char) => char.gearAudit?.enchants.missingCount ?? null,

  missingGems: (char) => char.gearAudit?.missingSockets ?? null,

  mythicPlusKeyLevel: (char) => {
    const runs = char.recentRuns;
    if (!runs || runs.length === 0) return null;
    return Math.max(...runs.map(r => r.mythic_level));
  },

  raidMythicBosses: (char) => char.raidProgression?.mythic_kills ?? null,

  tierSetCount: (char) => {
    const count = char.gearAudit?.tierCount ?? 0;
    return `${count}/5`;
  },

  weeklyActivityScore: (char) => {
    let score = 0;
    score += (char.weeklyTenPlusCount || 0) * 10;
    score += (char.activities?.worldQuests || 0);
    score += (char.activities?.heroicDungeons || 0) * 3;
    score += (char.activities?.mythicDungeons || 0) * 5;
    return score;
  },

  collectionScore: (char) => {
    const c = char.collections;
    if (!c) return 0;
    return c.mounts + c.pets + c.toys + c.achievements + c.titles;
  },

  pvpRatingHighest: (char) => {
    const r = char.pvp?.ratings;
    if (!r) return null;
    return Math.max(r.solo, r.v2, r.v3, r.rbg);
  },

  honorLevel: (char) => char.pvp?.honorLevel ?? null,

  pvpCurrentRatingSolo: (char) => char.pvp?.ratings.solo ?? null,

  pvpCurrentRating2v2: (char) => char.pvp?.ratings.v2 ?? null,

  pvpCurrentRating3v3: (char) => char.pvp?.ratings.v3 ?? null,

  dungeonsDoneThisWeek: (char) => char.weeklyTenPlusCount ?? 0,

  totalDungeonsSeason: (char) => {
    const history = char.weeklyHistory;
    if (!history) return null;
    return history.reduce((a, b) => a + b, 0);
  },

  mPlusRankRealm: (char) => char.mPlusRanks?.overall.realm ?? null,

  mPlusRankRegion: (char) => char.mPlusRanks?.overall.region ?? null,

  mPlusClassRankRealm: (char) => char.mPlusRanks?.class.realm ?? null,

  mythicTrackCount: (char) => char.gearAudit?.itemTracks.mythic ?? null,
  heroTrackCount: (char) => char.gearAudit?.itemTracks.heroic ?? null,
  championTrackCount: (char) => char.gearAudit?.itemTracks.champion ?? null,
  veteranTrackCount: (char) => char.gearAudit?.itemTracks.veteran ?? null,
  adventurerTrackCount: (char) => char.gearAudit?.itemTracks.adventurer ?? null,
  explorerTrackCount: (char) => char.gearAudit?.itemTracks.explorer ?? null,

  dominantTrack: (char) => {
    const tracks = char.gearAudit?.itemTracks;
    if (!tracks) return null;
    const entries = Object.entries(tracks) as [string, number][];
    const max = entries.reduce((a, b) => b[1] > a[1] ? b : a);
    return max[1] > 0 ? max[0].charAt(0).toUpperCase() + max[0].slice(1) : null;
  },

  avgTrackLevel: (char) => {
    const tracks = char.gearAudit?.itemTracks;
    if (!tracks) return null;
    const weights: Record<string, number> = { mythic: 6, heroic: 5, champion: 4, veteran: 3, adventurer: 2, explorer: 1 };
    let total = 0, count = 0;
    Object.entries(tracks).forEach(([key, val]) => {
      total += (weights[key] || 0) * val;
      count += val;
    });
    return count > 0 ? Math.round((total / count) * 10) / 10 : null;
  },

  trackDiversityScore: (char) => {
    const tracks = char.gearAudit?.itemTracks;
    if (!tracks) return null;
    return Object.values(tracks).filter(v => v > 0).length;
  },

  wclBestParse: (char) => char.warcraftLogs?.bestParse ?? null,
  wclMedianPerformance: (char) => char.warcraftLogs?.medianPerformance ?? null,
  wclBestPerformance: (char) => char.warcraftLogs?.bestPerformance ?? null,
  wclAllStarPoints: (char) => char.warcraftLogs?.allStarPoints ?? null,
  wclBossesLogged: (char) => char.warcraftLogs?.bossesLogged ?? null,
  wclTotalKills: (char) => char.warcraftLogs?.totalKills ?? null,

  weeklyRaidBossKills: (char) => char.weeklyRaidBossKills ?? 0,
  weeklyRaidVaultSlots: (char) => {
    const kills = char.weeklyRaidBossKills ?? 0;
    if (kills >= 6) return 3;
    if (kills >= 4) return 2;
    if (kills >= 2) return 1;
    return 0;
  },
};

export const calculateField = (functionName: string, char: Character): any => {
  const fn = CALCULATED_FIELDS[functionName];
  if (!fn) return null;
  try {
    return fn(char);
  } catch {
    return null;
  }
};

export const getAvailableCalculatedFields = (): string[] => Object.keys(CALCULATED_FIELDS);
