import {
  Character,
  GearItem,
  GreatVault,
  GreatVaultSlot,
  UpgradeTrackDistribution,
  CrestProgress,
  PvPStats,
  PvPRating,
  MPlusRun
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

      return {
        slot: slotKey,
        name: itemName,
        itemLevel: item.level.value,
        quality: item.quality.type,
        enchant,
        gems,
        bonusIds,
        tier: isTier,
        upgradeTrack
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

export const enrichCharacterData = async (
  baseCharacter: Partial<Character>,
  token: string,
  realm: string,
  name: string
): Promise<Partial<Character>> => {
  const enriched = { ...baseCharacter };

  const [equipmentData, statsData] = await Promise.all([
    BlizzardAPI.getCharacterEquipment(token, realm, name),
    BlizzardAPI.getCharacterStats(token, realm, name)
  ]);

  if (equipmentData) {
    enriched.gear = await enrichGearWithTracks(equipmentData, token);
    enriched.upgradeTrackDistribution = calculateUpgradeTrackDistribution(enriched.gear);
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
