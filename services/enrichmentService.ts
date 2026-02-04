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
  mythic: [10341, 10342, 10343, 10344, 10345, 10346, 11142, 11143, 11144, 11145, 11146, 11147],
  hero: [10334, 10335, 10336, 10337, 10338, 10339, 10340, 11135, 11136, 11137, 11138, 11139, 11140, 11141],
  champion: [10327, 10328, 10329, 10330, 10331, 10332, 10333, 11128, 11129, 11130, 11131, 11132, 11133, 11134],
  veteran: [10320, 10321, 10322, 10323, 10324, 10325, 10326, 11121, 11122, 11123, 11124, 11125, 11126, 11127],
  adventurer: [10313, 10314, 10315, 10316, 10317, 10318, 10319, 11114, 11115, 11116, 11117, 11118, 11119, 11120],
  explorer: [10305, 10306, 10307, 10308, 10309, 10310, 10311, 10312, 11107, 11108, 11109, 11110, 11111, 11112, 11113]
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
  212000, 212005, 212001, 212002, 212003,
  211978, 211979, 211980, 211981, 211982,
  211983, 211984, 211985, 211986, 211987,
  211988, 211989, 211990, 211991, 211992,
  211993, 211994, 211995, 211996, 211997,
  211998, 211999, 212004, 212006, 212007,
  229268, 229269, 229270, 229271, 229272,
  229273, 229274, 229275, 229276, 229277,
  229278, 229279, 229280, 229281, 229282
]);

const TIER_SET_BONUS_IDS = new Set([
  10856, 10857, 10858, 10859, 10860, 10861, 10862, 10863,
  10864, 10865, 10866, 10867, 10868, 10869, 10870, 10871
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
  if (!equipmentData?.equipped_items) {
    console.log('⚠️ No equipped_items in equipment data');
    return [];
  }

  console.log(`🛡️ Processing ${equipmentData.equipped_items.length} gear items`);

  const gearItems = await Promise.all(
    equipmentData.equipped_items.map(async item => {
      const slotKey = SLOT_NAME_MAP[item.slot.type] || item.slot.type.toLowerCase();
      const bonusIds = item.bonus_list || [];
      const upgradeTrack = detectUpgradeTrack(bonusIds);
      const isTier = TIER_ITEM_IDS.has(item.item.id) || bonusIds.some(id => TIER_SET_BONUS_IDS.has(id));

      let enchant: string | undefined = undefined;
      if (item.enchantments && item.enchantments.length > 0) {
        const enchantData = item.enchantments[0];
        enchant = enchantData?.display_string?.en_GB ||
                  enchantData?.display_string?.en_US ||
                  (typeof enchantData?.display_string === 'string' ? enchantData.display_string : undefined) ||
                  enchantData?.enchantment_id?.toString() ||
                  'Enchanted';
      }
      const gems = item.sockets?.filter(s => s.item?.id)?.map(socket => socket.item.id.toString()) || [];

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

      console.log(`  📦 ${slotKey}: iLvl ${item.level.value}, Track: ${upgradeTrack || 'none'}, Tier: ${isTier}, Enchant: ${enchant ? 'Yes' : 'No'}, Gems: ${gems.length}, BonusIDs: [${bonusIds.slice(0, 5).join(',')}${bonusIds.length > 5 ? '...' : ''}]`);

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

  const trackSummary = gearItems.reduce((acc, item) => {
    if (item.upgradeTrack) {
      acc[item.upgradeTrack] = (acc[item.upgradeTrack] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  console.log(`📊 Track distribution:`, trackSummary);
  console.log(`🎯 Tier pieces: ${gearItems.filter(g => g.tier).length}/5`);
  console.log(`✨ Enchanted: ${gearItems.filter(g => g.enchant).length}`);
  console.log(`💎 Items with gems: ${gearItems.filter(g => g.gems.length > 0).length}`);

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
    console.log(`🛡️ Got Blizzard equipment data for ${name}, processing...`);
    const blizzardGear = await enrichGearWithTracks(equipmentData, token);

    if (baseCharacter.gear && baseCharacter.gear.length > 0) {
      const rioGearBySlot = new Map(baseCharacter.gear.map(g => [g.slot, g]));
      enriched.gear = blizzardGear.map(blizzItem => {
        const rioItem = rioGearBySlot.get(blizzItem.slot);
        return {
          ...blizzItem,
          tier: blizzItem.tier || (rioItem?.tier ?? false)
        };
      });
    } else {
      enriched.gear = blizzardGear;
    }

    enriched.upgradeTrackDistribution = calculateUpgradeTrackDistribution(enriched.gear);

    const embellishedItems = enriched.gear.filter(item => item.isEmbellished);
    enriched.embellishments = embellishedItems.map(item => item.name);

    console.log(`📊 Final gear stats: Tier ${enriched.gear.filter(g => g.tier).length}/5, Enchants: ${enriched.gear.filter(g => g.enchant).length}`);
  } else {
    console.log(`⚠️ No Blizzard equipment data for ${name}, keeping RIO gear`);
  }

  if (statsData) {
    console.log(`📈 Stats for ${name}: Crit ${statsData.crit.toFixed(1)}%, Haste ${statsData.haste.toFixed(1)}%, Mastery ${statsData.mastery.toFixed(1)}%, Vers ${statsData.versatility.toFixed(1)}%`);
    enriched.stats = statsData;
  } else {
    console.log(`⚠️ No stats data for ${name}`);
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
