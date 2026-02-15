
import { Character, PlayerRole, WoWClass } from '../types';
import { fetchBlizzardToken, getCharacterSummary, getCharacterStats, getCharacterAchievements, getCharacterCollections, getCharacterProfessions, getCharacterEquipment, getCharacterPvPSummary, getCharacterPvPBracket, getCharacterReputations, getCharacterQuests } from './blizzardService';
import { fetchRaiderIOData, getCurrentResetTime, computeWeeklyRaidKills } from './raiderioService';
import { fetchWarcraftLogsData } from './warcraftlogsService';
import { persistenceService } from './persistenceService';
import { configService } from './configService';

const ENCHANTABLE_TYPES = ['BACK', 'CHEST', 'WRIST', 'LEGS', 'FEET', 'FINGER', 'MAIN_HAND', 'OFF_HAND', 'TWO_HAND'];
const TIER_TYPES = ['HEAD', 'SHOULDER', 'CHEST', 'HANDS', 'LEGS'];

const SLOT_MAP: Record<string, string> = {
  'HEAD': 'head',
  'NECK': 'neck',
  'SHOULDER': 'shoulders',
  'BACK': 'cloak',
  'CHEST': 'chest',
  'WRIST': 'wrists',
  'HANDS': 'gloves',
  'WAIST': 'belt',
  'LEGS': 'legs',
  'FEET': 'feet',
  'FINGER_1': 'ring1',
  'FINGER_2': 'ring2',
  'TRINKET_1': 'trinket1',
  'TRINKET_2': 'trinket2',
  'MAIN_HAND': 'weapon',
  'OFF_HAND': 'offhand',
  'TWO_HAND': 'weapon'
};

const determineTrack = (ilvl: number): string => {
  if (ilvl >= 639) return 'Mythic';
  if (ilvl >= 626) return 'Heroic';
  if (ilvl >= 613) return 'Champion';
  if (ilvl >= 590) return 'Veteran';
  if (ilvl >= 558) return 'Adventurer';
  return 'Explorer';
};

export interface CharacterImportResult {
  success: boolean;
  character?: Character;
  error?: string;
  errorType?: 'not_found' | 'api_error' | 'enrichment_failed';
}

export interface BatchImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  current?: string;
}

/**
 * Validates a character exists in the Blizzard API
 */
export const validateCharacterExists = async (name: string, realm: string): Promise<boolean> => {
  try {
    const token = await fetchBlizzardToken();
    if (!token) return false;

    const summary = await getCharacterSummary(token, realm, name);
    return summary !== null;
  } catch (error) {
    console.error(`Failed to validate character ${name}-${realm}:`, error);
    return false;
  }
};

/**
 * Enriches a character with full API data from Raider.io, Blizzard, and WarcraftLogs
 */
export const enrichCharacter = async (
  name: string,
  realm: string,
  className: WoWClass,
  isMain: boolean,
  playerName: string
): Promise<CharacterImportResult> => {
  try {
    const normalizedRealm = (realm || 'Blackhand').toLowerCase();

    // Step 1: Fetch Blizzard token
    const blizzToken = await fetchBlizzardToken();
    if (!blizzToken) {
      return {
        success: false,
        error: 'Failed to fetch Blizzard API token',
        errorType: 'api_error'
      };
    }

    // Step 2: Validate character exists
    const summary = await getCharacterSummary(blizzToken, normalizedRealm, name);
    if (!summary) {
      return {
        success: false,
        error: `Character ${name}-${realm} not found in Blizzard API`,
        errorType: 'not_found'
      };
    }

    // Step 3: Fetch current raid config and Raider.io data
    const raidConfig = await configService.getCurrentRaid();
    const rio = await fetchRaiderIOData(name, normalizedRealm, raidConfig.raidSlug, raidConfig.totalBosses);

    // Step 4: Fetch all Blizzard data in parallel
    await new Promise(r => setTimeout(r, 100));
    const [blizzStat, blizzAch, blizzColl, blizzProf, blizzEquip, blizzPvP, blizzReps, blizzQuests] = await Promise.all([
      getCharacterStats(blizzToken, normalizedRealm, name),
      getCharacterAchievements(blizzToken, normalizedRealm, name),
      getCharacterCollections(blizzToken, normalizedRealm, name),
      getCharacterProfessions(blizzToken, normalizedRealm, name),
      getCharacterEquipment(blizzToken, normalizedRealm, name),
      getCharacterPvPSummary(blizzToken, normalizedRealm, name),
      getCharacterReputations(blizzToken, normalizedRealm, name),
      getCharacterQuests(blizzToken, normalizedRealm, name),
    ].map(p => p.catch(() => null)));

    const [blizzPvPSolo, blizzPvP2v2, blizzPvP3v3] = await Promise.all([
      getCharacterPvPBracket(blizzToken, normalizedRealm, name, 'shuffle'),
      getCharacterPvPBracket(blizzToken, normalizedRealm, name, '2v2'),
      getCharacterPvPBracket(blizzToken, normalizedRealm, name, '3v3'),
    ].map(p => p.catch(() => null)));

    // Step 5: Fetch WarcraftLogs data
    const wclData = await fetchWarcraftLogsData(name, normalizedRealm).catch(() => null);

    // Step 6: Build reputations object
    const repFactionMap: Record<string, string> = {
      'Council of Dornogal': 'dornogal',
      'Assembly of the Deeps': 'deeps',
      'Hallowfall Arathi': 'arathi',
      'The Severed Threads': 'threads',
      "Beledar's Spawn": 'karesh',
      'Brann Bronzebeard': 'vandals',
      'Cartels of the Undermine': 'undermine',
      'Gallagio Loyalty Rewards': 'gallagio',
    };

    const reputations: Character['reputations'] = {
      dornogal: 0, deeps: 0, arathi: 0, threads: 0,
      karesh: 0, vandals: 0, undermine: 0, gallagio: 0
    };

    if (blizzReps?.reputations) {
      for (const rep of blizzReps.reputations) {
        const factionName = rep.faction?.name;
        const key = repFactionMap[factionName];
        if (key && key in reputations) {
          (reputations as any)[key] = rep.standing?.value || rep.standing?.raw || 0;
        }
      }
    }

    // Step 7: Process quests
    const completedQuestIds = new Set((blizzQuests?.quests || []).map((q: any) => q.id));

    // Step 8: Build the character object
    const character: Character = {
      name,
      className,
      server: normalizedRealm,
      isMain,
      playerName,
      spec: rio?.spec || summary?.active_spec?.name,
      race: summary?.race?.name,
      itemLevel: summary?.equipped_item_level || rio?.itemLevel || 0,
      thumbnailUrl: summary?.character_media?.href || rio?.thumbnailUrl,
      profileUrl: rio?.profileUrl,
      mPlusRating: rio?.mPlusRating,
      weeklyTenPlusCount: rio?.weeklyTenPlusCount,
      weeklyHistory: rio?.weeklyHistory,
      recentRuns: rio?.recentRuns,
      raidProgression: rio?.raidProgression,
      mPlusRanks: rio?.mPlusRanks,
      raidBossKills: rio?.raidBossKills,
      guild: summary?.guild?.name,
      collections: {
        mounts: blizzColl?.mounts?.mounts?.length || 0,
        pets: blizzColl?.pets?.pets?.length || 0,
        toys: blizzColl?.toys?.toys?.length || 0,
        achievements: blizzAch?.total_quantity || 0,
        titles: summary?.titles?.length || 0
      },
      currencies: {
        weathered: 0,
        carved: 0,
        runed: 0,
        gilded: 0,
        valorstones: 0,
      },
      pvp: {
        honorLevel: blizzPvP?.honor_level || 0,
        kills: blizzPvP?.honorable_kills || 0,
        ratings: {
          solo: blizzPvPSolo?.rating || 0,
          v2: blizzPvP2v2?.rating || 0,
          v3: blizzPvP3v3?.rating || 0,
          rbg: 0,
        },
        games: {
          season: (blizzPvPSolo?.season_match_statistics?.played || 0) +
                  (blizzPvP2v2?.season_match_statistics?.played || 0) +
                  (blizzPvP3v3?.season_match_statistics?.played || 0),
          weekly: (blizzPvPSolo?.weekly_match_statistics?.played || 0) +
                  (blizzPvP2v2?.weekly_match_statistics?.played || 0) +
                  (blizzPvP3v3?.weekly_match_statistics?.played || 0),
        },
      },
      reputations,
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
        mythicDungeons: rio?.recentRuns?.length || 0,
        highestMplus: rio?.recentRuns && rio.recentRuns.length > 0
          ? Math.max(...rio.recentRuns.map(r => r.mythic_level))
          : 0,
      },
      professions: blizzProf?.primaries?.map((p: any) => ({
        name: p.profession.name,
        rank: p.rank
      })) || [],
      warcraftLogs: wclData || undefined,
    };

    // Step 9: Process raid kills baseline
    const resetDate = getCurrentResetTime().toISOString().split('T')[0];
    const currentBossKills = character.raidBossKills || [];
    const { count: weeklyCount, details: weeklyDetails, newBaseline } =
      computeWeeklyRaidKills(currentBossKills, undefined, resetDate);

    const wclDetails = (wclData?.weeklyRaidKills || []).map(k => ({
      bossName: k.bossName,
      difficulty: k.difficulty as 'Normal' | 'Heroic' | 'Mythic',
      difficultyId: k.difficultyId,
    }));

    let finalDetails = weeklyDetails;
    let finalCount = weeklyCount;

    if (wclDetails.length > weeklyDetails.length) {
      finalDetails = wclDetails;
      finalCount = wclDetails.length;
    }

    character.raidKillBaseline = newBaseline;
    character.weeklyRaidBossKills = finalCount;
    character.weeklyRaidKillDetails = finalDetails;

    // Step 10: Process gear audit if equipment data available
    if (blizzEquip?.equipped_items) {
      const slots: Record<string, any> = {};
      const itemTracks = { mythic: 0, heroic: 0, champion: 0, veteran: 0, adventurer: 0, explorer: 0 };
      let totalGemsSlotted = 0, enchantsDone = 0, missingEnchantsCount = 0, tierCount = 0;

      blizzEquip.equipped_items.forEach((item: any) => {
        const ilvl = item.level?.value || 0;
        const trackName = determineTrack(ilvl);

        const trackKey = trackName.toLowerCase() as keyof typeof itemTracks;
        if (trackKey in itemTracks) itemTracks[trackKey]++;

        const hasEnchant = !!(item.enchantments?.length > 0);
        const isEnchantable = ENCHANTABLE_TYPES.includes(item.slot.type);
        if (isEnchantable) {
          if (hasEnchant) enchantsDone++;
          else missingEnchantsCount++;
        }

        const gemsSlotted = item.sockets?.filter((s: any) => s.item)?.length || 0;
        totalGemsSlotted += gemsSlotted;

        const isSetItem = !!item.set;
        const isCanonicalTierSlot = TIER_TYPES.includes(item.slot.type);
        const isTier = isSetItem && isCanonicalTierSlot;
        if (isTier) tierCount++;

        const internalKey = SLOT_MAP[item.slot.type] || item.slot.type.toLowerCase();
        slots[internalKey] = {
          name: item.name,
          ilvl: ilvl,
          track: trackName,
          hasEnchant: hasEnchant,
          enchantRank: hasEnchant ? (item.enchantments[0]?.enchantment_id || 0) : 0,
          isTier: isTier,
          hasGem: gemsSlotted > 0,
          gemsCount: gemsSlotted,
        };
      });

      character.gearAudit = {
        sockets: totalGemsSlotted,
        missingSockets: 0,
        enchantments: enchantsDone,
        tierCount: tierCount,
        sparkItems: 0,
        upgradeTrack: determineTrack(character.itemLevel),
        tierPieces: {
          helm: slots.head?.isTier || false,
          shoulder: slots.shoulders?.isTier || false,
          chest: slots.chest?.isTier || false,
          gloves: slots.gloves?.isTier || false,
          legs: slots.legs?.isTier || false,
        },
        enchants: {
          cloak: slots.cloak?.hasEnchant || false,
          chest: slots.chest?.hasEnchant || false,
          wrists: slots.wrists?.hasEnchant || false,
          legs: slots.legs?.hasEnchant || false,
          feet: slots.feet?.hasEnchant || false,
          ring1: slots.ring1?.hasEnchant || false,
          ring2: slots.ring2?.hasEnchant || false,
          weapon: slots.weapon?.hasEnchant || false,
          offhand: slots.offhand?.hasEnchant || false,
          totalRank: 0,
          missingCount: missingEnchantsCount,
        },
        specificItems: {},
        embellishments: [],
        gems: { rare: 0, epic: 0 },
        itemTracks,
        stats: { crit: 0, haste: 0, mastery: 0, vers: 0, critPct: 0, hastePct: 0, masteryPct: 0, versPct: 0 },
        slots,
        vault: {
          rank: 0,
          thisWeek: character.weeklyTenPlusCount || 0,
          raid: [{label: '-', ilvl: 0}, {label: '-', ilvl: 0}, {label: '-', ilvl: 0}],
          dungeon: [{label: '-', ilvl: 0}, {label: '-', ilvl: 0}, {label: '-', ilvl: 0}],
          world: [{label: '-', ilvl: 0}, {label: '-', ilvl: 0}, {label: '-', ilvl: 0}],
          score: 0
        }
      };
    }

    return {
      success: true,
      character
    };
  } catch (error) {
    console.error(`Failed to enrich character ${name}-${realm}:`, error);
    return {
      success: false,
      error: `Failed to enrich character: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorType: 'enrichment_failed'
    };
  }
};

/**
 * Imports a single character with full enrichment
 */
export const importCharacter = async (
  name: string,
  realm: string,
  className: WoWClass,
  isMain: boolean,
  playerName: string,
  role: PlayerRole
): Promise<CharacterImportResult> => {
  try {
    // Check if character already exists
    const existing = await persistenceService.fetchCharactersFromDb();
    const alreadyExists = existing.some(
      (c: any) => c.character_name.toLowerCase() === name.toLowerCase() &&
                  c.realm.toLowerCase() === realm.toLowerCase()
    );

    if (alreadyExists) {
      return {
        success: false,
        error: 'Character already exists in database',
        errorType: 'api_error'
      };
    }

    // Enrich the character
    const enrichResult = await enrichCharacter(name, realm, className, isMain, playerName);

    if (!enrichResult.success || !enrichResult.character) {
      return enrichResult;
    }

    // Save to database
    await persistenceService.upsertCharacterData(enrichResult.character, playerName, role);

    return {
      success: true,
      character: enrichResult.character
    };
  } catch (error) {
    return {
      success: false,
      error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorType: 'api_error'
    };
  }
};

export const characterImportService = {
  validateCharacterExists,
  enrichCharacter,
  importCharacter,
};
