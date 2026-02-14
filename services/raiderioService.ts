
import { Character, WoWClass, MPlusRun, RaidProgression, SlotAudit, GearAudit, VaultSlot, MythicPlusRanks, RaidBossKill, RaidKillBaseline, WeeklyRaidKillDetail } from '../types';

const BASE_URL = "https://raider.io/api/v1/characters/profile";

/**
 * Calculates the most recent weekly reset time (Wednesday 08:00 UTC for EU).
 * Used to filter M+ runs for the "current ID".
 */
export const getCurrentResetTime = (): Date => {
  const now = new Date();
  const resetDay = 3; // Wednesday (EU)
  const resetHour = 8; // 08:00 UTC
  const currentReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), resetHour, 0, 0));
  const day = now.getUTCDay();
  const diff = day < resetDay ? (day + 7 - resetDay) : (day - resetDay);
  currentReset.setUTCDate(currentReset.getUTCDate() - diff);
  if (day === resetDay && now.getUTCHours() < resetHour) {
    currentReset.setUTCDate(currentReset.getUTCDate() - 7);
  }
  return currentReset;
};

/**
 * Buckets recent runs into 4 weeks of history: [This Week, Last Week, 2 Weeks Ago, 3 Weeks Ago].
 * Only counts keys >= Level 10.
 */
const calculateWeeklyHistory = (runs: MPlusRun[], resetTime: Date): number[] => {
  const history = [0, 0, 0, 0]; // [This ID, -1 Week, -2 Weeks, -3 Weeks]
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const resetTimeMs = resetTime.getTime();
  
  runs.forEach(run => {
    if (run.mythic_level < 10) return;
    const runTimeMs = new Date(run.completed_at).getTime();
    for (let i = 0; i < 4; i++) {
      const weekStart = resetTimeMs - (i * oneWeekMs);
      const weekEnd = weekStart + oneWeekMs;
      if (runTimeMs >= weekStart && runTimeMs < weekEnd) {
        history[i]++;
        break;
      }
    }
  });
  return history;
};

export const computeWeeklyRaidKills = (
  current: RaidBossKill[],
  baseline: RaidKillBaseline | undefined,
  resetDate: string
): { count: number; details: WeeklyRaidKillDetail[]; newBaseline: RaidKillBaseline } => {
  if (!baseline) {
    return {
      count: 0,
      details: [],
      newBaseline: { resetDate, bossKills: current, latestKills: current }
    };
  }

  const isNewWeek = baseline.resetDate !== resetDate;
  const referenceKills = isNewWeek
    ? (baseline.latestKills || baseline.bossKills)
    : baseline.bossKills;

  const baseMap = new Map(referenceKills.map(b => [b.name, b]));
  const details: WeeklyRaidKillDetail[] = [];

  for (const boss of current) {
    const base = baseMap.get(boss.name);
    const baseNormal = base?.normal ?? 0;
    const baseHeroic = base?.heroic ?? 0;
    const baseMythic = base?.mythic ?? 0;

    let highestDiff: WeeklyRaidKillDetail['difficulty'] | null = null;
    let highestId = 0;

    if (boss.mythic > baseMythic) { highestDiff = 'Mythic'; highestId = 5; }
    else if (boss.heroic > baseHeroic) { highestDiff = 'Heroic'; highestId = 4; }
    else if (boss.normal > baseNormal) { highestDiff = 'Normal'; highestId = 3; }

    if (highestDiff) {
      details.push({ bossName: boss.name, difficulty: highestDiff, difficultyId: highestId });
    }
  }

  details.sort((a, b) => b.difficultyId - a.difficultyId);

  const newBaseline: RaidKillBaseline = isNewWeek
    ? { resetDate, bossKills: referenceKills, latestKills: current }
    : { ...baseline, latestKills: current };

  return { count: details.length, details, newBaseline };
};

const getDifficultyLabel = (details: WeeklyRaidKillDetail[], index: number): string => {
  if (index < details.length) return details[index].difficulty;
  return '-';
};

const determineTrack = (ilvl: number): string => {
  if (ilvl >= 626) return "Mythic";
  if (ilvl >= 613) return "Heroic";
  if (ilvl >= 600) return "Champion";
  if (ilvl >= 587) return "Veteran";
  if (ilvl >= 574) return "Adventurer";
  return "Explorer";
};

/**
 * Main fetch function for Raider.io.
 * retrieves: Score, Recent Runs, Raid Progress, and Basic Gear (Enchants/Gems).
 * Note: Gear data here is less accurate than Blizzard API, but serves as a fallback or seed.
 */
export const fetchRaiderIOData = async (name: string, realm: string, raidSlug?: string, totalBosses?: number): Promise<Partial<Character> | null> => {
  try {
    const encodedRealm = encodeURIComponent(realm.toLowerCase());
    const encodedName = encodeURIComponent(name.toLowerCase());
    const fields = "mythic_plus_scores_by_season:current,mythic_plus_recent_runs,mythic_plus_ranks,mythic_plus_best_runs,mythic_plus_weekly_highest_level_runs,gear,raid_progression,guild";
    
    const url = `${BASE_URL}?region=eu&realm=${encodedRealm}&name=${encodedName}&fields=${fields}`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const resetTime = getCurrentResetTime();

    const allRuns: MPlusRun[] = data.mythic_plus_recent_runs?.map((run: any) => ({
      dungeon: run.dungeon,
      short_name: run.short_name,
      mythic_level: run.mythic_level,
      completed_at: run.completed_at,
      num_keystone_upgrades: run.num_keystone_upgrades,
      score: run.score,
      url: run.url
    })) || [];

    const weeklyHistory = calculateWeeklyHistory(allRuns, resetTime);
    const weeklyTenPlusCount = weeklyHistory[0];

    const raidKeys = Object.keys(data.raid_progression || {});
    const raidKey = (raidSlug && raidKeys.includes(raidSlug)) ? raidSlug : raidKeys[0];
    const raidInfo = data.raid_progression?.[raidKey];
    const bossCap = totalBosses || raidInfo?.total_bosses || 8;
    const raidProgression: RaidProgression | undefined = raidInfo ? {
      summary: raidInfo.summary,
      normal_kills: raidInfo.normal_bosses_killed,
      heroic_kills: raidInfo.heroic_bosses_killed,
      mythic_kills: raidInfo.mythic_bosses_killed,
      total_bosses: raidInfo.total_bosses,
      completions: Math.floor(raidInfo.mythic_bosses_killed / bossCap) || 0,
      aotc: raidInfo.heroic_bosses_killed >= bossCap,
      ce: raidInfo.mythic_bosses_killed >= bossCap
    } : undefined;

    const gearItems = data.gear?.items || {};
    const slots: Record<string, SlotAudit> = {};
    const itemTracks = { mythic: 0, heroic: 0, champion: 0, veteran: 0, adventurer: 0, explorer: 0 };
    
    let tierCount = 0;
    let missingEnchants = 0;
    let totalGems = 0;
    const ENCHANTABLE = ['back', 'chest', 'wrist', 'legs', 'feet', 'finger1', 'finger2', 'mainhand'];

    Object.entries(gearItems).forEach(([slot, item]: [string, any]) => {
      const trackName = determineTrack(item.item_level);
      const trackKey = trackName.toLowerCase() as keyof typeof itemTracks;
      if (trackKey in itemTracks) itemTracks[trackKey]++;

      const hasEnchant = !!item.enchant;
      if (ENCHANTABLE.includes(slot) && !hasEnchant) missingEnchants++;
      
      const isTierSlot = ['head', 'shoulder', 'chest', 'hands', 'legs'].includes(slot);
      const isTier = isTierSlot && (item.tier || item.is_tier || item.name.toLowerCase().includes('channeled fury') || item.name.toLowerCase().includes('sentinel'));
      if (isTier) tierCount++;

      const gemsCount = item.gems && Array.isArray(item.gems) ? item.gems.length : 0;
      totalGems += gemsCount;

      slots[slot] = {
        name: item.name,
        ilvl: item.item_level,
        track: trackName,
        hasEnchant: hasEnchant,
        enchantRank: item.enchant ? (item.enchant_quality || 3) : undefined,
        isTier: !!isTier,
        hasGem: gemsCount > 0,
        gemsCount: gemsCount
      };
    });

    // Vault Simulation
    const currentIdRuns = allRuns.filter(r => new Date(r.completed_at) >= resetTime).sort((a, b) => b.mythic_level - a.mythic_level);
    const dungeonVault: [VaultSlot, VaultSlot, VaultSlot] = [
      { label: currentIdRuns[0] ? `+${currentIdRuns[0].mythic_level}` : '-', ilvl: 0 },
      { label: currentIdRuns[3] ? `+${currentIdRuns[3].mythic_level}` : '-', ilvl: 0 },
      { label: currentIdRuns[7] ? `+${currentIdRuns[7].mythic_level}` : '-', ilvl: 0 }
    ];

    const raidVault: [VaultSlot, VaultSlot, VaultSlot] = [
      { label: '-', ilvl: 0 },
      { label: '-', ilvl: 0 },
      { label: '-', ilvl: 0 }
    ];

    const gearAudit: GearAudit = {
      sockets: totalGems,
      missingSockets: 0,
      enchantments: Math.max(0, 8 - missingEnchants),
      tierCount: tierCount,
      sparkItems: 0,
      upgradeTrack: determineTrack(data.gear?.item_level_equipped || 0),
      tierPieces: {
        helm: !!slots['head'], shoulder: !!slots['shoulder'], chest: !!slots['chest'], gloves: !!slots['hands'], legs: !!slots['legs']
      },
      enchants: {
        cloak: !!slots['back']?.hasEnchant, chest: !!slots['chest']?.hasEnchant, wrists: !!slots['wrist']?.hasEnchant,
        legs: !!slots['legs']?.hasEnchant, feet: !!slots['feet']?.hasEnchant, ring1: !!slots['finger1']?.hasEnchant,
        ring2: !!slots['finger2']?.hasEnchant, weapon: !!slots['mainhand']?.hasEnchant, offhand: !!slots['offhand']?.hasEnchant,
        totalRank: 3, missingCount: missingEnchants
      },
      specificItems: {
        reshiiWraps: slots['back']?.name.toLowerCase().includes('reshii'),
        discBelt: slots['waist']?.name.toLowerCase().includes('everforged'),
        cyrceCirclet: slots['head']?.name.toLowerCase().includes('cyrce')
      },
      embellishments: [],
      gems: { rare: totalGems, epic: 0 },
      itemTracks,
      stats: {
        crit: 0, haste: 0, mastery: 0, vers: 0,
        critPct: 0, hastePct: 0, masteryPct: 0, versPct: 0
      },
      slots,
      vault: { rank: 1, thisWeek: weeklyTenPlusCount, raid: raidVault, dungeon: dungeonVault, world: [{label: '-', ilvl: 0}, {label: '-', ilvl: 0}, {label: '-', ilvl: 0}], score: data.mPlusRating }
    };

    const mPlusRanks: MythicPlusRanks | undefined = data.mythic_plus_ranks ? {
      overall: {
        world: data.mythic_plus_ranks.overall?.world || 0,
        region: data.mythic_plus_ranks.overall?.region || 0,
        realm: data.mythic_plus_ranks.overall?.realm || 0,
      },
      class: {
        world: data.mythic_plus_ranks.class?.world || 0,
        region: data.mythic_plus_ranks.class?.region || 0,
        realm: data.mythic_plus_ranks.class?.realm || 0,
      },
    } : undefined;

    const guild = data.guild?.name || undefined;

    const raidBossKills: RaidBossKill[] = [];
    if (raidInfo?.bosses) {
      for (const boss of raidInfo.bosses) {
        raidBossKills.push({
          name: boss.slug || boss.name || 'Unknown',
          normal: boss.normal_kills || 0,
          heroic: boss.heroic_kills || 0,
          mythic: boss.mythic_kills || 0,
        });
      }
    }

    return {
      spec: data.active_spec_name,
      race: data.race,
      itemLevel: Math.round(data.gear?.item_level_equipped || 0),
      mPlusRating: Math.round(data.mythic_plus_scores_by_season?.[0]?.scores?.all || 0),
      weeklyTenPlusCount,
      weeklyHistory,
      raidProgression,
      gearAudit,
      mPlusRanks,
      guild,
      raidBossKills: raidBossKills.length > 0 ? raidBossKills : undefined,
      thumbnailUrl: data.thumbnail_url,
      profileUrl: data.profile_url,
      recentRuns: allRuns,
      lastSeen: data.last_crawled_at ? new Date(data.last_crawled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"
    };
  } catch (error) {
    return null;
  }
};
