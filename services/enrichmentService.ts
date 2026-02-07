import {
  Character,
  GearItem,
  GreatVault,
  GreatVaultSlot,
  UpgradeTrackDistribution,
  CrestProgress,
  PvPStats,
  PvPRating,
  MPlusRun,
  WorldProgress,
  Reputation,
  Collections,
  RaidAchievements
} from '../types';
import * as BlizzardAPI from './blizzardService';

const UPGRADE_TRACK_BONUS_IDS: Record<string, number[]> = {
  mythic: [10341, 10342, 10343, 10344, 10345, 10346],
  hero: [10334, 10335, 10336, 10337, 10338, 10339, 10340],
  champion: [10327, 10328, 10329, 10330, 10331, 10332, 10333],
  veteran: [10320, 10321, 10322, 10323, 10324, 10325, 10326],
  adventurer: [10313, 10314, 10315, 10316, 10317, 10318, 10319],
  explorer: [10305, 10306, 10307, 10308, 10309, 10310, 10311, 10312]
};

const CREST_CURRENCY_IDS = {
  weathered: 2914,
  carved: 2915,
  runed: 2916,
  gilded: 2917
};

const VALORSTONE_CURRENCY_ID = 2245;

const EMBELLISHMENT_BONUS_IDS = new Set([
  10222, 10223, 10224, 10225, 10226, 10227, 10228, 10229, 10230,
  10532, 10533, 10534
]);

const TIER_ITEM_IDS = new Set([
  212072, 212073, 212074, 212075, 212076,
  212416, 212417, 212418, 212419, 212420,
  217223, 217224, 217225, 217226, 217227,
  212000, 212005, 212001, 212002, 212003
]);

const SLOT_NAME_MAP: Record<string, string> = {
  'HEAD': 'head',
  'NECK': 'neck',
  'SHOULDER': 'shoulder',
  'BACK': 'back',
  'CHEST': 'chest',
  'WRIST': 'wrist',
  'HANDS': 'hands',
  'WAIST': 'waist',
  'LEGS': 'legs',
  'FEET': 'feet',
  'FINGER_1': 'finger1',
  'FINGER_2': 'finger2',
  'TRINKET_1': 'trinket1',
  'TRINKET_2': 'trinket2',
  'MAIN_HAND': 'mainhand',
  'OFF_HAND': 'offhand'
};

export const detectUpgradeTrack = (bonusIds: number[]): string | undefined => {
  if (!bonusIds || bonusIds.length === 0) return undefined;

  for (const [track, ids] of Object.entries(UPGRADE_TRACK_BONUS_IDS)) {
    if (bonusIds.some(id => ids.includes(id))) {
      return track;
    }
  }
  return undefined;
};

export const enrichGearWithTracks = async (equipmentData: BlizzardAPI.BlizzardEquipmentData, token?: string): Promise<GearItem[]> => {
  if (!equipmentData?.equipped_items) return [];

  const gearItems = await Promise.all(
    equipmentData.equipped_items.map(async item => {
      const slotKey = SLOT_NAME_MAP[item.slot.type] || item.slot.type.toLowerCase();
      const bonusIds = item.bonus_list || [];
      const upgradeTrack = detectUpgradeTrack(bonusIds);
      const isTier = TIER_ITEM_IDS.has(item.item.id);

      const enchant = item.enchantments?.[0]?.display_string?.en_GB;
      const gems = item.sockets?.map(socket => socket.item.id.toString()) || [];

      let itemName = 'Unknown';

      if (typeof item.name === 'object' && item.name?.en_GB) {
        itemName = item.name.en_GB;
      } else if (typeof item.name === 'string') {
        itemName = item.name;
      } else if (token && item.item?.id) {
        const itemDetails = await BlizzardAPI.getItemDetails(token, item.item.id);
        if (itemDetails?.name?.en_GB) {
          itemName = itemDetails.name.en_GB;
        }
      }

      const isEmbellished = bonusIds.some(id => EMBELLISHMENT_BONUS_IDS.has(id));

      return {
        slot: slotKey,
        name: itemName,
        itemLevel: item.level.value,
        quality: item.quality.type,
        enchant,
        gems,
        bonusIds,
        tier: isTier,
        upgradeTrack,
        isEmbellished
      };
    })
  );

  return gearItems;
};

export const calculateUpgradeTrackDistribution = (gear: GearItem[]): UpgradeTrackDistribution => {
  const distribution: UpgradeTrackDistribution = {
    mythic: 0,
    hero: 0,
    champion: 0,
    veteran: 0,
    adventurer: 0,
    explorer: 0
  };

  gear.forEach(item => {
    const track = item.upgradeTrack?.toLowerCase();
    if (track && track in distribution) {
      distribution[track as keyof UpgradeTrackDistribution]++;
    }
  });

  return distribution;
};

const DUNGEON_ILVL_MAP: Record<number, number> = {
  2: 597, 3: 600, 4: 603, 5: 606, 6: 610, 7: 610, 8: 613, 9: 616, 10: 619, 11: 623, 12: 623
};

const RAID_ILVL_MAP: Record<string, number> = {
  normal: 610,
  heroic: 623,
  mythic: 636
};

const calculateGreatVaultDungeonSlots = (runs: MPlusRun[], resetTime: Date): GreatVaultSlot[] => {
  const currentWeekRuns = runs.filter(run => new Date(run.completed_at) >= resetTime);
  const runCount = currentWeekRuns.length;

  const slots: GreatVaultSlot[] = [
    { itemLevel: 0, available: false },
    { itemLevel: 0, available: false },
    { itemLevel: 0, available: false }
  ];

  if (runCount >= 1) {
    const highestRun = Math.max(...currentWeekRuns.map(r => r.mythic_level));
    slots[0] = { itemLevel: DUNGEON_ILVL_MAP[Math.min(highestRun, 12)] || 597, available: true };
  }

  if (runCount >= 4) {
    const sortedRuns = [...currentWeekRuns].sort((a, b) => b.mythic_level - a.mythic_level);
    const fourthHighest = sortedRuns[3]?.mythic_level || 2;
    slots[1] = { itemLevel: DUNGEON_ILVL_MAP[Math.min(fourthHighest, 12)] || 597, available: true };
  }

  if (runCount >= 8) {
    const sortedRuns = [...currentWeekRuns].sort((a, b) => b.mythic_level - a.mythic_level);
    const eighthHighest = sortedRuns[7]?.mythic_level || 2;
    slots[2] = { itemLevel: DUNGEON_ILVL_MAP[Math.min(eighthHighest, 12)] || 597, available: true };
  }

  return slots;
};

const calculateGreatVaultRaidSlots = (raidProgress: any): GreatVaultSlot[] => {
  const slots: GreatVaultSlot[] = [
    { itemLevel: 0, available: false },
    { itemLevel: 0, available: false },
    { itemLevel: 0, available: false }
  ];

  if (!raidProgress) return slots;

  const currentRaid = Object.values(raidProgress)[0] as any;
  if (!currentRaid) return slots;

  const mythicKills = currentRaid.mythic_bosses_killed || 0;
  const heroicKills = currentRaid.heroic_bosses_killed || 0;
  const normalKills = currentRaid.normal_bosses_killed || 0;

  if (mythicKills >= 2) {
    slots[0] = { itemLevel: RAID_ILVL_MAP.mythic, available: true };
  } else if (heroicKills >= 2) {
    slots[0] = { itemLevel: RAID_ILVL_MAP.heroic, available: true };
  } else if (normalKills >= 2) {
    slots[0] = { itemLevel: RAID_ILVL_MAP.normal, available: true };
  }

  if (mythicKills >= 4) {
    slots[1] = { itemLevel: RAID_ILVL_MAP.mythic, available: true };
  } else if (heroicKills >= 4) {
    slots[1] = { itemLevel: RAID_ILVL_MAP.heroic, available: true };
  } else if (normalKills >= 4) {
    slots[1] = { itemLevel: RAID_ILVL_MAP.normal, available: true };
  }

  if (mythicKills >= 6) {
    slots[2] = { itemLevel: RAID_ILVL_MAP.mythic, available: true };
  } else if (heroicKills >= 6) {
    slots[2] = { itemLevel: RAID_ILVL_MAP.heroic, available: true };
  } else if (normalKills >= 6) {
    slots[2] = { itemLevel: RAID_ILVL_MAP.normal, available: true };
  }

  return slots;
};

export const calculateGreatVault = (
  runs: MPlusRun[],
  raidProgress: any,
  resetTime: Date
): GreatVault => {
  return {
    dungeon: calculateGreatVaultDungeonSlots(runs, resetTime),
    raid: calculateGreatVaultRaidSlots(raidProgress),
    world: [
      { itemLevel: 603, available: false },
      { itemLevel: 610, available: false },
      { itemLevel: 616, available: false }
    ]
  };
};

export const parsePvPStats = async (token: string, realm: string, name: string): Promise<PvPStats | undefined> => {
  try {
    const summary = await BlizzardAPI.getCharacterPvPSummary(token, realm, name);
    if (!summary) return undefined;

    const honorLevel = summary.honor_level || 0;
    const honorableKills = summary.honorable_kills || 0;

    const brackets = ['2v2', '3v3', 'rated-battlegrounds'];
    const ratings: any = { solo: 0, twos: 0, threes: 0, rbg: 0 };
    const highestRatings: any = { solo: 0, twos: 0, threes: 0, rbg: 0 };
    const gamesThisSeason: any = { solo: 0, twos: 0, threes: 0, rbg: 0 };
    const gamesThisWeek: any = { solo: 0, twos: 0, threes: 0, rbg: 0 };

    for (const bracket of brackets) {
      const bracketData = await BlizzardAPI.getCharacterPvPBracketStats(token, realm, name, bracket);
      if (bracketData) {
        const key = bracket === '2v2' ? 'twos' : bracket === '3v3' ? 'threes' : 'rbg';
        ratings[key] = bracketData.rating || 0;
        highestRatings[key] = bracketData.season_best_rating || 0;
        gamesThisSeason[key] = (bracketData.season_match_statistics?.won || 0) + (bracketData.season_match_statistics?.lost || 0);
        gamesThisWeek[key] = (bracketData.weekly_match_statistics?.won || 0) + (bracketData.weekly_match_statistics?.lost || 0);
      }
    }

    return {
      honorLevel,
      honorableKills,
      currentRating: ratings as PvPRating,
      highestRating: highestRatings as PvPRating,
      gamesThisSeason: gamesThisSeason as PvPRating,
      gamesThisWeek: gamesThisWeek as PvPRating
    };
  } catch (error) {
    console.error(`Failed to fetch PvP stats for ${name}-${realm}:`, error);
    return undefined;
  }
};

export const parseCurrencies = async (token: string, realm: string, name: string): Promise<{ crests: CrestProgress; valorstones: number }> => {
  try {
    const currencyData = await BlizzardAPI.getCharacterCurrencies(token, realm, name);
    if (!currencyData?.currency_types) {
      return {
        crests: { weathered: 0, carved: 0, runed: 0, gilded: 0 },
        valorstones: 0
      };
    }

    const currencies = currencyData.currency_types;
    const crests: CrestProgress = {
      weathered: currencies.find((c: any) => c.id === CREST_CURRENCY_IDS.weathered)?.quantity || 0,
      carved: currencies.find((c: any) => c.id === CREST_CURRENCY_IDS.carved)?.quantity || 0,
      runed: currencies.find((c: any) => c.id === CREST_CURRENCY_IDS.runed)?.quantity || 0,
      gilded: currencies.find((c: any) => c.id === CREST_CURRENCY_IDS.gilded)?.quantity || 0
    };

    const valorstones = currencies.find((c: any) => c.id === VALORSTONE_CURRENCY_ID)?.quantity || 0;

    return { crests, valorstones };
  } catch (error) {
    console.error(`Failed to fetch currencies for ${name}-${realm}:`, error);
    return {
      crests: { weathered: 0, carved: 0, runed: 0, gilded: 0 },
      valorstones: 0
    };
  }
};

export const parseReputations = async (token: string, realm: string, name: string): Promise<Reputation[]> => {
  try {
    const repData = await BlizzardAPI.getCharacterReputations(token, realm, name);
    if (!repData?.reputations) return [];

    const TWW_FACTION_IDS = [2570, 2590, 2594, 2600, 2601, 2605, 2607];

    return repData.reputations
      .filter((rep: any) => TWW_FACTION_IDS.includes(rep.faction.id))
      .map((rep: any) => ({
        name: rep.faction.name,
        standing: rep.standing.value || 0,
        max: rep.standing.max || 1,
        standingName: rep.standing.name || 'Unknown',
        paragonProgress: rep.paragon?.value
      }));
  } catch (error) {
    console.error(`Failed to fetch reputations for ${name}-${realm}:`, error);
    return [];
  }
};

export const parseCollections = async (token: string, realm: string, name: string): Promise<Collections> => {
  try {
    const [collectionsData, achievementsData] = await Promise.all([
      BlizzardAPI.getCharacterCollections(token, realm, name),
      BlizzardAPI.getCharacterAchievements(token, realm, name)
    ]);

    return {
      mounts: collectionsData?.mounts?.collected?.length || 0,
      pets: collectionsData?.pets?.collected?.length || 0,
      toys: collectionsData?.toys?.collected?.length || 0,
      achievements: achievementsData?.total_points || 0,
      titles: achievementsData?.achievements?.filter((a: any) => a.criteria?.is_completed && a.reward?.title).length || 0
    };
  } catch (error) {
    console.error(`Failed to fetch collections for ${name}-${realm}:`, error);
    return { mounts: 0, pets: 0, toys: 0, achievements: 0, titles: 0 };
  }
};

export const parseRaidAchievements = async (token: string, realm: string, name: string): Promise<RaidAchievements> => {
  try {
    const achievementsData = await BlizzardAPI.getCharacterAchievements(token, realm, name);
    if (!achievementsData?.achievements) return {};

    const achievements = achievementsData.achievements;

    const CE_NERUB_AR = 40231;
    const AOTC_NERUB_AR = 40230;

    const cuttingEdge = achievements.find((a: any) => a.id === CE_NERUB_AR)?.completed_timestamp;
    const aheadOfTheCurve = achievements.find((a: any) => a.id === AOTC_NERUB_AR)?.completed_timestamp;

    return {
      cuttingEdge: cuttingEdge ? new Date(cuttingEdge).toLocaleDateString() : undefined,
      aheadOfTheCurve: aheadOfTheCurve ? new Date(aheadOfTheCurve).toLocaleDateString() : undefined
    };
  } catch (error) {
    console.error(`Failed to fetch raid achievements for ${name}-${realm}:`, error);
    return {};
  }
};

export const parseWorldProgress = async (token: string, realm: string, name: string): Promise<WorldProgress> => {
  try {
    const completedQuests = await BlizzardAPI.getCharacterCompletedQuests(token, realm, name);

    const progress: WorldProgress = {
      worldQuestsDone: completedQuests?.quests?.length || 0,
      theaterTroupe: 0,
      awakeningTheMachine: 0,
      severedThreads: 0,
      remembranceProgress: 0,
      delvesDone: 0,
      cofferKeys: 0,
      heroicDungeons: 0,
      mythicDungeons: 0
    };

    return progress;
  } catch (error) {
    console.error(`Failed to fetch world progress for ${name}-${realm}:`, error);
    return {};
  }
};

export const parseProfessions = async (token: string, realm: string, name: string): Promise<string[]> => {
  try {
    const professionsData = await BlizzardAPI.getCharacterProfessions(token, realm, name);
    if (!professionsData) return [];

    const professions: string[] = [];

    if (professionsData.primaries) {
      professionsData.primaries.forEach((prof: any) => {
        if (prof.profession?.name) {
          professions.push(`${prof.profession.name} (${prof.skill_points || 0}/${prof.max_skill_points || 0})`);
        }
      });
    }

    return professions;
  } catch (error) {
    console.error(`Failed to fetch professions for ${name}-${realm}:`, error);
    return [];
  }
};

export const enrichCharacterData = async (
  baseCharacter: Partial<Character>,
  token: string,
  realm: string,
  name: string
): Promise<Partial<Character>> => {
  const enriched = { ...baseCharacter };

  const [
    equipmentData,
    statsData,
    currencyData,
    reputations,
    collections,
    raidAchievements,
    worldProgress,
    professions
  ] = await Promise.all([
    BlizzardAPI.getCharacterEquipment(token, realm, name),
    BlizzardAPI.getCharacterStats(token, realm, name),
    parseCurrencies(token, realm, name),
    parseReputations(token, realm, name),
    parseCollections(token, realm, name),
    parseRaidAchievements(token, realm, name),
    parseWorldProgress(token, realm, name),
    parseProfessions(token, realm, name)
  ]);

  if (equipmentData) {
    enriched.gear = await enrichGearWithTracks(equipmentData, token);
    enriched.upgradeTrackDistribution = calculateUpgradeTrackDistribution(enriched.gear);

    const embellishedItems = enriched.gear.filter(item => item.isEmbellished);
    enriched.embellishments = embellishedItems.map(item => item.name);
  }

  if (statsData) {
    enriched.stats = statsData;
  }

  if (baseCharacter.recentRuns && baseCharacter.raidProgress) {
    const resetTime = getCurrentResetTime();
    enriched.greatVault = calculateGreatVault(
      baseCharacter.recentRuns,
      baseCharacter.raidProgress,
      resetTime
    );
  }

  const pvpStats = await parsePvPStats(token, realm, name);
  if (pvpStats) {
    enriched.pvpStats = pvpStats;
  }

  enriched.crests = currencyData.crests;
  enriched.valorstones = currencyData.valorstones;
  enriched.reputations = reputations;
  enriched.collections = collections;
  enriched.raidAchievements = raidAchievements;
  enriched.worldProgress = worldProgress;
  enriched.professions = professions;

  return enriched;
};

const getCurrentResetTime = (): Date => {
  const now = new Date();
  const resetDay = 3;
  const resetHour = 8;

  const currentReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), resetHour, 0, 0));

  const day = now.getUTCDay();
  const diff = day < resetDay ? (day + 7 - resetDay) : (day - resetDay);

  currentReset.setUTCDate(currentReset.getUTCDate() - diff);

  if (day === resetDay && now.getUTCHours() < resetHour) {
    currentReset.setUTCDate(currentReset.getUTCDate() - 7);
  }

  return currentReset;
};
