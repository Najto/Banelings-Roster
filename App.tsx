
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_ROSTER } from './constants';
import { Player, MemberMapping, PlayerRole, SplitGroup, Character, SlotAudit, GearAudit, WoWClass, RaidConfig, DEFAULT_RAID_CONFIG } from './types';
import { RosterTable } from './components/RosterTable';
import { StatOverview } from './components/StatOverview';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SplitSetup } from './components/SplitSetup';
import { RosterAudit } from './components/RosterAudit';
import { CharacterDetailView } from './components/CharacterDetailView';
import { RosterOverview } from './components/RosterOverview';
import { AddCharacterModal } from './components/AddCharacterModal';
import { AddPlayerModal } from './components/AddPlayerModal';
import { Settings } from './components/Settings';
import { fetchRosterFromSheet, fetchSplitsFromSheet } from './services/spreadsheetService';
import { fetchRaiderIOData, getCurrentResetTime, computeWeeklyRaidKills } from './services/raiderioService';
import { fetchBlizzardToken, getCharacterSummary, getCharacterStats, getCharacterAchievements, getCharacterCollections, getCharacterProfessions, getCharacterEquipment, getCharacterPvPSummary, getCharacterPvPBracket, getCharacterReputations, getCharacterQuests } from './services/blizzardService';
import { fetchWarcraftLogsData } from './services/warcraftlogsService';
import { persistenceService } from './services/persistenceService';
import { configService, IlvlThresholds } from './services/configService';
import { supabase } from './services/supabaseClient';
import { realtimeService } from './services/realtimeService';
import { presenceService } from './services/presenceService';
import Toast from './components/Toast';
import { useToast } from './hooks/useToast';
import pLimit from 'p-limit';
import { LayoutGrid, Users, Trophy, RefreshCw, Settings as SettingsIcon, AlertTriangle, Zap, Split, ClipboardList, Database, List, User, Loader2, Layout, AlertCircle, X, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const SLOT_MAP: Record<string, string> = {
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

const ENCHANTABLE_TYPES = ['BACK', 'CHEST', 'WRIST', 'LEGS', 'FEET', 'FINGER_1', 'FINGER_2', 'MAIN_HAND'];
const TIER_TYPES = ['HEAD', 'SHOULDER', 'CHEST', 'HANDS', 'LEGS'];

/**
 * Determines the upgrade track of an item based on item level.
 * Used for visual categorization in the Gear Audit.
 */
const determineTrack = (ilvl: number): string => {
  if (ilvl >= 150) return "Mythic";
  if (ilvl >= 140) return "Heroic";
  if (ilvl >= 130) return "Champion";
  if (ilvl >= 125) return "Veteran";
  if (ilvl >= 120) return "Adventurer";
  return "Explorer";
};

/**
 * Main Application Component.
 * 
 * Responsibilities:
 * 1. State Management: Holds the global `roster` state, splits, and view configuration.
 * 2. Data Synchronization (`syncAll`): Orchestrates fetching data from Google Sheets, 
 *    Blizzard API, and Raider.io, then persists it to Supabase.
 * 3. Routing: Simple tab-based navigation between views.
 */
const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [roster, setRoster] = useState<Player[]>(INITIAL_ROSTER);
  const [splits, setSplits] = useState<SplitGroup[]>([]);
  const [minIlvl, setMinIlvl] = useState<number>(615);
  const [ilvlThresholds, setIlvlThresholds] = useState<IlvlThresholds>({
    min_ilvl: 615,
    mythic_ilvl: 626,
    heroic_ilvl: 613,
  });
  const [raidConfig, setRaidConfig] = useState<RaidConfig>(DEFAULT_RAID_CONFIG);
  const [activeTab, setActiveTab] = useState<'roster' | 'audit' | 'analytics' | 'splits' | 'settings'>('roster');
  const [rosterViewMode, setRosterViewMode] = useState<'table' | 'overview' | 'detail'>('overview');
  const [selectedMemberName, setSelectedMemberName] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("Nie");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalContext, setAddModalContext] = useState<{ memberName: string; isMain: boolean } | null>(null);
  const [addPlayerModalOpen, setAddPlayerModalOpen] = useState(false);
  const [addPlayerModalRole, setAddPlayerModalRole] = useState<PlayerRole>(PlayerRole.MELEE);
  const [migrationBanner, setMigrationBanner] = useState<{ show: boolean; count: number }>({ show: false, count: 0 });
  const [migrationDismissed, setMigrationDismissed] = useState(false);
  const [globalActiveUsers, setGlobalActiveUsers] = useState(0);
  const { toasts, showToast, dismissToast } = useToast();
  const isSyncingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const createAdminUser = async () => {
      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`;
        const headers = {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        };
        await fetch(apiUrl, { method: 'POST', headers });
      } catch (error) {
        console.error('Failed to create admin user:', error);
      }
    };
    createAdminUser();
  }, []);

  /**
   * Merges the raw roster data (from Google Sheet) with enriched data stored in Supabase.
   * This ensures that on initial load, we show cached rich data (ilvl, score, etc.)
   * without hitting external APIs immediately.
   */
  const mergeWithDatabase = useCallback(async (baseRoster: Player[]) => {
    try {
      const dbChars = await persistenceService.fetchCharactersFromDb();
      if (!dbChars || dbChars.length === 0) return baseRoster;

      return baseRoster.map(player => {
        const enrichChar = (char: Character) => {
          const dbEntry = dbChars.find(db => 
            db.character_name.toLowerCase() === char.name.toLowerCase() && 
            db.realm.toLowerCase() === (char.server || 'blackhand').toLowerCase()
          );

          if (dbEntry && dbEntry.enriched_data) {
            return {
              ...char,
              ...dbEntry.enriched_data,
              lastSeen: dbEntry.last_enriched_at ? new Date(dbEntry.last_enriched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : char.lastSeen
            };
          }
          return char;
        };

        return {
          ...player,
          mainCharacter: enrichChar(player.mainCharacter),
          splits: player.splits.map(enrichChar)
        };
      });
    } catch (e) {
      return baseRoster;
    }
  }, []);

  /**
   * Core Synchronization Function.
   * 
   * Workflow:
   * 1. Fetches authentication token from Blizzard.
   * 2. Fetches the base roster and split structure from Google Sheets (CSV).
   * 3. Iterates through every character in the roster:
   *    a. Fetches Raider.io data (Score, basic gear).
   *    b. Fetches Blizzard data (Detailed equipment, stats, currencies).
   *    c. Calculates a comprehensive `GearAudit` (Tier sets, enchants, gems).
   * 4. Persists the enriched character data to Supabase for future caching.
   * 5. Updates local state.
   */
  const syncAll = useCallback(async () => {
    setIsUpdating(true);
    isSyncingRef.current = true;
    setError(null);
    try {
      const blizzToken = await fetchBlizzardToken();
      const dbRoster = await persistenceService.loadRosterFromDatabase();

      const allChars: Array<{ char: Character; playerIndex: number; isMain: boolean; splitIndex: number }> = [];
      for (let i = 0; i < dbRoster.length; i++) {
        const player = dbRoster[i];
        allChars.push({ char: player.mainCharacter, playerIndex: i, isMain: true, splitIndex: -1 });
        player.splits.forEach((s, si) => allChars.push({ char: s, playerIndex: i, isMain: false, splitIndex: si }));
      }

      setUpdateProgress({ current: 0, total: allChars.length });
      let processed = 0;

      const processChar = async (char: Character): Promise<Character> => {
        const realm = char.server || "Blackhand";
        const rio = await fetchRaiderIOData(char.name, realm, raidConfig.raidSlug, raidConfig.totalBosses);

        let blizzSum = null, blizzStat = null, blizzAch = null, blizzColl = null, blizzProf = null, blizzEquip = null;
        let blizzPvP = null, blizzPvPSolo = null, blizzPvP2v2 = null, blizzPvP3v3 = null, blizzReps = null, blizzQuests = null;

        if (blizzToken) {
          [blizzSum, blizzStat, blizzAch, blizzColl, blizzProf, blizzEquip, blizzPvP, blizzReps, blizzQuests] = await Promise.all([
            getCharacterSummary(blizzToken, realm, char.name),
            getCharacterStats(blizzToken, realm, char.name),
            getCharacterAchievements(blizzToken, realm, char.name),
            getCharacterCollections(blizzToken, realm, char.name),
            getCharacterProfessions(blizzToken, realm, char.name),
            getCharacterEquipment(blizzToken, realm, char.name),
            getCharacterPvPSummary(blizzToken, realm, char.name),
            getCharacterReputations(blizzToken, realm, char.name),
            getCharacterQuests(blizzToken, realm, char.name),
          ].map(p => p.catch(() => null)));

          if (blizzPvP?.brackets) {
            const hrefs = (blizzPvP.brackets as any[]).map((b: any) => b.href || '');
            [blizzPvPSolo, blizzPvP2v2, blizzPvP3v3] = await Promise.all([
              hrefs.some((h: string) => h.includes('shuffle')) ? getCharacterPvPBracket(blizzToken, realm, char.name, 'shuffle') : Promise.resolve(null),
              hrefs.some((h: string) => h.includes('2v2')) ? getCharacterPvPBracket(blizzToken, realm, char.name, '2v2') : Promise.resolve(null),
              hrefs.some((h: string) => h.includes('3v3')) ? getCharacterPvPBracket(blizzToken, realm, char.name, '3v3') : Promise.resolve(null),
            ].map(p => p.catch(() => null)));
          }
        }

        const wclData = await fetchWarcraftLogsData(char.name, realm, 'eu', raidConfig.wclZoneId).catch(() => null);

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

        const reputations: Character['reputations'] = { dornogal: 0, deeps: 0, arathi: 0, threads: 0, karesh: 0, vandals: 0, undermine: 0, gallagio: 0 };
        if (blizzReps?.reputations) {
          for (const rep of blizzReps.reputations) {
            const factionName = rep.faction?.name;
            const key = repFactionMap[factionName];
            if (key && key in reputations) {
              (reputations as any)[key] = rep.standing?.value || rep.standing?.raw || 0;
            }
          }
        }

        const completedQuestIds = new Set((blizzQuests?.quests || []).map((q: any) => q.id));

        const updatedChar: Character = {
          ...char,
          ...(rio || {}),
          itemLevel: blizzSum?.equipped_item_level || rio?.itemLevel || char.itemLevel,
          thumbnailUrl: blizzSum?.character_media?.href || rio?.thumbnailUrl || char.thumbnailUrl,
          collections: {
            mounts: blizzColl?.mounts?.mounts?.length || 0,
            pets: blizzColl?.pets?.pets?.length || 0,
            toys: blizzColl?.toys?.toys?.length || 0,
            achievements: blizzAch?.total_quantity || 0,
            titles: blizzSum?.titles?.length || 0
          },
          currencies: { weathered: 0, carved: 0, runed: 0, gilded: 0, valorstones: 0 },
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
              season: (blizzPvPSolo?.season_match_statistics?.played || 0) + (blizzPvP2v2?.season_match_statistics?.played || 0) + (blizzPvP3v3?.season_match_statistics?.played || 0),
              weekly: (blizzPvPSolo?.weekly_match_statistics?.played || 0) + (blizzPvP2v2?.weekly_match_statistics?.played || 0) + (blizzPvP3v3?.weekly_match_statistics?.played || 0),
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
            highestMplus: rio?.recentRuns && rio.recentRuns.length > 0 ? Math.max(...rio.recentRuns.map(r => r.mythic_level)) : 0,
          },
          warcraftLogs: wclData ? { ...wclData, weeklyRaidKills: wclData.weeklyRaidKills } : undefined,
          professions: blizzProf?.primaries?.map((p: any) => ({ name: p.profession.name, rank: p.rank })) || []
        };

        const resetDate = getCurrentResetTime().toISOString().split('T')[0];
        const existingBaseline = char.raidKillBaseline;
        const currentBossKills = updatedChar.raidBossKills || [];

        const { count: rioWeeklyCount, details: rioDetails, newBaseline } =
          computeWeeklyRaidKills(currentBossKills, existingBaseline, resetDate);

        const wclDetails = (wclData?.weeklyRaidKills || []).map(k => ({
          bossName: k.bossName,
          difficulty: k.difficulty as 'Normal' | 'Heroic' | 'Mythic',
          difficultyId: k.difficultyId,
        }));

        let finalDetails = rioDetails;
        let finalCount = rioWeeklyCount;
        if (wclDetails.length > rioDetails.length) {
          finalDetails = wclDetails;
          finalCount = wclDetails.length;
        }

        updatedChar.raidKillBaseline = newBaseline;
        updatedChar.weeklyRaidBossKills = finalCount;
        updatedChar.weeklyRaidKillDetails = finalDetails;

        if (!updatedChar.gearAudit) {
          updatedChar.gearAudit = {
            sockets: 0, missingSockets: 0, enchantments: 0, tierCount: 0, sparkItems: 0, upgradeTrack: 'Explorer',
            tierPieces: { helm: false, shoulder: false, chest: false, gloves: false, legs: false },
            enchants: { cloak: false, chest: false, wrists: false, legs: false, feet: false, ring1: false, ring2: false, weapon: false, offhand: false, totalRank: 0, missingCount: 0 },
            specificItems: {}, embellishments: [], gems: { rare: 0, epic: 0 },
            itemTracks: { mythic: 0, heroic: 0, champion: 0, veteran: 0, adventurer: 0, explorer: 0 },
            stats: { crit: 0, haste: 0, mastery: 0, vers: 0, critPct: 0, hastePct: 0, masteryPct: 0, versPct: 0 },
            slots: {},
            vault: { rank: 0, thisWeek: 0, raid: [{label: '-', ilvl: 0}, {label: '-', ilvl: 0}, {label: '-', ilvl: 0}], dungeon: [{label: '-', ilvl: 0}, {label: '-', ilvl: 0}, {label: '-', ilvl: 0}], world: [{label: '-', ilvl: 0}, {label: '-', ilvl: 0}, {label: '-', ilvl: 0}], score: 0 }
          };
        }

        if (blizzEquip?.equipped_items) {
          const slots: Record<string, SlotAudit> = {};
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
              isTier: isTier,
              hasGem: gemsSlotted > 0,
              gemsCount: gemsSlotted
            };
          });

          updatedChar.gearAudit.itemTracks = itemTracks;
          updatedChar.gearAudit.slots = { ...updatedChar.gearAudit.slots, ...slots };
          updatedChar.gearAudit.sockets = totalGemsSlotted;
          updatedChar.gearAudit.enchantments = enchantsDone;
          updatedChar.gearAudit.enchants.missingCount = missingEnchantsCount;
          updatedChar.gearAudit.tierCount = tierCount;
          updatedChar.gearAudit.enchants.cloak = !!slots['back']?.hasEnchant;
          updatedChar.gearAudit.enchants.chest = !!slots['chest']?.hasEnchant;
          updatedChar.gearAudit.enchants.wrists = !!slots['wrist']?.hasEnchant;
          updatedChar.gearAudit.enchants.legs = !!slots['legs']?.hasEnchant;
          updatedChar.gearAudit.enchants.feet = !!slots['feet']?.hasEnchant;
          updatedChar.gearAudit.enchants.ring1 = !!slots['finger1']?.hasEnchant;
          updatedChar.gearAudit.enchants.ring2 = !!slots['finger2']?.hasEnchant;
          updatedChar.gearAudit.enchants.weapon = !!slots['mainhand']?.hasEnchant;
        }

        if (blizzStat && updatedChar.gearAudit) {
          const s = blizzStat;
          updatedChar.gearAudit.stats = {
            ...updatedChar.gearAudit.stats,
            critPct: s.melee_crit?.value ?? s.spell_crit?.value ?? s.ranged_crit?.value ?? 0,
            hastePct: s.melee_haste?.value ?? s.spell_haste?.value ?? s.ranged_haste?.value ?? 0,
            masteryPct: s.mastery?.value ?? 0,
            versPct: s.versatility_damage_done_bonus ?? 0
          };
        }

        if (updatedChar.gearAudit) {
          const sorted = [...finalDetails].sort((a, b) => b.difficultyId - a.difficultyId);
          updatedChar.gearAudit.vault.raid = [
            { label: finalCount >= 2 ? (sorted[1]?.difficulty || 'Normal') : '-', ilvl: 0 },
            { label: finalCount >= 4 ? (sorted[3]?.difficulty || 'Normal') : '-', ilvl: 0 },
            { label: finalCount >= 6 ? (sorted[5]?.difficulty || 'Normal') : '-', ilvl: 0 },
          ];
        }

        processed++;
        setUpdateProgress({ current: processed, total: allChars.length });
        return updatedChar;
      };

      const limit = pLimit(5);
      const enrichedResults = await Promise.all(
        allChars.map(entry => limit(() => processChar(entry.char).then(result => ({ ...entry, enriched: result }))))
      );

      const enrichedRoster: Player[] = dbRoster.map((player, pi) => {
        const mainResult = enrichedResults.find(r => r.playerIndex === pi && r.isMain);
        const splitResults = enrichedResults
          .filter(r => r.playerIndex === pi && !r.isMain)
          .sort((a, b) => a.splitIndex - b.splitIndex);

        return {
          ...player,
          mainCharacter: mainResult?.enriched || player.mainCharacter,
          splits: splitResults.map(r => r.enriched),
        };
      });

      const bulkEntries = enrichedResults.map(r => {
        const player = dbRoster[r.playerIndex];
        return { char: r.enriched, playerName: player.name, role: player.role };
      });

      setUpdateProgress({ current: allChars.length, total: allChars.length });
      await persistenceService.bulkUpsertCharacterData(bulkEntries);

      setRoster(enrichedRoster);
      await loadLastSyncTime();
    } catch (e) {
      console.error("Sync error:", e);
      setError("Synchronisierung fehlgeschlagen. Blizzard API Limit erreicht oder Verbindungsprobleme.");
    } finally {
      setIsUpdating(false);
      isSyncingRef.current = false;
    }
  }, [raidConfig]);

  // Helper to format last sync time
  const formatLastSyncTime = useCallback((date: Date | null): string => {
    if (!date) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // If less than 1 hour ago, show relative time
    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} min ago`;
    }

    // If less than 24 hours ago, show hours
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // If less than 7 days ago, show days
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    // Otherwise show full date and time
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Load last sync time
  const loadLastSyncTime = useCallback(async () => {
    try {
      const lastSync = await persistenceService.getLastSyncTime();
      if (lastSync) {
        setLastUpdate(formatLastSyncTime(lastSync));
      }
    } catch (e) {
      console.error('Failed to load last sync time:', e);
    }
  }, [formatLastSyncTime]);

  // Initial Data Load - Load from Database
  useEffect(() => {
    const initLoad = async () => {
      try {
        const dbRoster = await persistenceService.loadRosterFromDatabase();
        setRoster(dbRoster);
        const savedSplits = await persistenceService.loadSplits();
        if (savedSplits) setSplits(savedSplits);

        const thresholds = await configService.getIlvlThresholds();
        setIlvlThresholds(thresholds);
        setMinIlvl(thresholds.min_ilvl);

        const raid = await configService.getCurrentRaid();
        setRaidConfig(raid);

        const migrationCheck = await persistenceService.checkMigrationNeeded();
        if (migrationCheck.needed && !localStorage.getItem('migration_dismissed')) {
          setMigrationBanner({ show: true, count: migrationCheck.uniquePlayers });
        }

        // Load last sync time
        await loadLastSyncTime();
      } catch (e) {
        console.error('Failed to load initial data:', e);
      }
    };
    initLoad();
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const handleRosterUpdate = () => {
      if (!isSubscribed || isSyncingRef.current) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        if (!isSubscribed || isSyncingRef.current) return;
        try {
          const updatedRoster = await persistenceService.loadRosterFromDatabase();
          setRoster(updatedRoster);
          showToast('Roster updated by another user', 'info', 3000);
        } catch (error) {
          console.error('Failed to reload roster on real-time update:', error);
        }
      }, 2000);
    };

    const unsubscribeCharacters = realtimeService.subscribeCharacters(handleRosterUpdate);
    const unsubscribeRoster = realtimeService.subscribeRoster(handleRosterUpdate);

    return () => {
      isSubscribed = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      unsubscribeCharacters();
      unsubscribeRoster();
    };
  }, [showToast]);

  useEffect(() => {
    const unsubscribePresence = presenceService.trackPresence(
      'global-app',
      'main',
      (count: number) => {
        setGlobalActiveUsers(count);
      }
    );

    return () => {
      unsubscribePresence();
    };
  }, []);


  useEffect(() => {
    if (activeTab !== 'settings') {
      const reloadConfig = async () => {
        const thresholds = await configService.getIlvlThresholds();
        setIlvlThresholds(thresholds);
        setMinIlvl(thresholds.min_ilvl);
        const raid = await configService.getCurrentRaid();
        setRaidConfig(raid);
      };
      reloadConfig();
    }
  }, [activeTab]);

  // Delete Character Handler
  const handleDeleteCharacter = useCallback(async (characterName: string, realm: string) => {
    try {
      const success = await persistenceService.deleteCharacter(characterName, realm);
      if (success) {
        const updatedRoster = await persistenceService.loadRosterFromDatabase();
        setRoster(updatedRoster);
      } else {
        setError('Failed to delete character');
      }
    } catch (e) {
      console.error('Failed to delete character:', e);
      setError('Failed to delete character');
    }
  }, []);

  // Swap Main Character Handler
  const handleSwapCharacters = useCallback(async (
    playerName: string,
    draggedCharName: string,
    draggedRealm: string,
    targetCharName: string,
    targetRealm: string
  ) => {
    try {
      // Find which is main and which is split
      const player = roster.find(p => p.name === playerName);
      if (!player) {
        setError('Player not found');
        return;
      }

      const draggedIsMain = player.mainCharacter.name === draggedCharName;
      const targetIsMain = player.mainCharacter.name === targetCharName;

      // Case 1: Swapping main with a split or vice versa
      if (draggedIsMain || targetIsMain) {
        const oldMainName = draggedIsMain ? draggedCharName : targetCharName;
        const oldMainRealm = draggedIsMain ? draggedRealm : targetRealm;
        const newMainName = draggedIsMain ? targetCharName : draggedCharName;
        const newMainRealm = draggedIsMain ? targetRealm : draggedRealm;

        const success = await persistenceService.swapMainCharacter(
          playerName,
          newMainName,
          newMainRealm,
          oldMainName,
          oldMainRealm
        );

        if (success) {
          const updatedRoster = await persistenceService.loadRosterFromDatabase();
          setRoster(updatedRoster);
        } else {
          setError('Failed to swap characters');
        }
      }
      // Case 2: Reordering split characters
      else if (!draggedIsMain && !targetIsMain) {
        const draggedIndex = player.splits.findIndex(s => s.name === draggedCharName);
        const targetIndex = player.splits.findIndex(s => s.name === targetCharName);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          const success = await persistenceService.reorderSplitCharacters(
            playerName,
            draggedCharName,
            draggedRealm,
            targetCharName,
            targetRealm
          );

          if (success) {
            const updatedRoster = await persistenceService.loadRosterFromDatabase();
            setRoster(updatedRoster);
          } else {
            setError('Failed to reorder characters');
          }
        }
      }
    } catch (e) {
      console.error('Failed to swap characters:', e);
      setError('Failed to swap characters');
    }
  }, [roster]);

  // Reload Roster Handler
  const handleReloadRoster = useCallback(async () => {
    try {
      const updatedRoster = await persistenceService.loadRosterFromDatabase();
      setRoster(updatedRoster);
      await loadLastSyncTime();
    } catch (e) {
      console.error('Failed to reload roster:', e);
    }
  }, [loadLastSyncTime]);

  // Add Character Handler
  const handleAddCharacter = useCallback((memberName: string, isMain: boolean) => {
    setAddModalContext({ memberName, isMain });
    setAddModalOpen(true);
  }, []);

  // Add Player Handler
  const handleOpenAddPlayer = useCallback((role: PlayerRole) => {
    setAddPlayerModalRole(role);
    setAddPlayerModalOpen(true);
  }, []);

  const handleAddPlayer = useCallback(async (playerName: string, role: PlayerRole) => {
    const displayOrder = await persistenceService.getNextDisplayOrder();
    const success = await persistenceService.createRosterMember(playerName, role, displayOrder);
    if (!success) {
      throw new Error('Failed to create player. Name may already exist.');
    }
    const updatedRoster = await persistenceService.loadRosterFromDatabase();
    setRoster(updatedRoster);
  }, []);

  // Change Role Handler
  const handleChangeRole = useCallback(async (memberName: string, newRole: PlayerRole) => {
    const success = await persistenceService.updateRosterMemberRole(memberName, newRole);
    if (success) {
      const updatedRoster = await persistenceService.loadRosterFromDatabase();
      setRoster(updatedRoster);
    }
  }, []);

  // Handle Member Click - Navigate to Detail View
  const handleMemberClick = useCallback((memberName: string) => {
    setSelectedMemberName(memberName);
    setRosterViewMode('detail');
  }, []);

  // Refresh Single Character
  const refreshSingleCharacter = useCallback(async (characterName: string, realm: string, memberName: string, isMain: boolean) => {
    setIsUpdating(true);
    setError(null);
    try {
      const blizzToken = await fetchBlizzardToken();
      const player = roster.find(p => p.name === memberName);
      if (!player) throw new Error('Player not found');

      const char: Character = {
        name: characterName,
        className: WoWClass.UNKNOWN,
        server: realm,
        isMain: isMain,
        playerName: memberName,
        itemLevel: 0,
      };

      const processChar = async (char: Character) => {
        const rio = await fetchRaiderIOData(char.name, realm, raidConfig.raidSlug, raidConfig.totalBosses);

        let blizzSum = null, blizzStat = null, blizzAch = null, blizzColl = null, blizzProf = null, blizzEquip = null;
        let blizzPvP = null, blizzPvPSolo = null, blizzPvP2v2 = null, blizzPvP3v3 = null, blizzReps = null, blizzQuests = null;

        if (blizzToken) {
          await new Promise(r => setTimeout(r, 100));
          [blizzSum, blizzStat, blizzAch, blizzColl, blizzProf, blizzEquip, blizzPvP, blizzReps, blizzQuests] = await Promise.all([
            getCharacterSummary(blizzToken, realm, char.name),
            getCharacterStats(blizzToken, realm, char.name),
            getCharacterAchievements(blizzToken, realm, char.name),
            getCharacterCollections(blizzToken, realm, char.name),
            getCharacterProfessions(blizzToken, realm, char.name),
            getCharacterEquipment(blizzToken, realm, char.name),
            getCharacterPvPSummary(blizzToken, realm, char.name),
            getCharacterReputations(blizzToken, realm, char.name),
            getCharacterQuests(blizzToken, realm, char.name),
          ].map(p => p.catch(() => null)));

          if (blizzPvP?.brackets) {
            const hrefs = (blizzPvP.brackets as any[]).map((b: any) => b.href || '');
            [blizzPvPSolo, blizzPvP2v2, blizzPvP3v3] = await Promise.all([
              hrefs.some((h: string) => h.includes('shuffle')) ? getCharacterPvPBracket(blizzToken, realm, char.name, 'shuffle') : Promise.resolve(null),
              hrefs.some((h: string) => h.includes('2v2')) ? getCharacterPvPBracket(blizzToken, realm, char.name, '2v2') : Promise.resolve(null),
              hrefs.some((h: string) => h.includes('3v3')) ? getCharacterPvPBracket(blizzToken, realm, char.name, '3v3') : Promise.resolve(null),
            ].map(p => p.catch(() => null)));
          }
        }

        const wclData = await fetchWarcraftLogsData(char.name, realm, 'eu', raidConfig.wclZoneId).catch(() => null);

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

        const reputations: Character['reputations'] = { dornogal: 0, deeps: 0, arathi: 0, threads: 0, karesh: 0, vandals: 0, undermine: 0, gallagio: 0 };
        if (blizzReps?.reputations) {
          for (const rep of blizzReps.reputations) {
            const factionName = rep.faction?.name;
            const key = repFactionMap[factionName];
            if (key && key in reputations) {
              (reputations as any)[key] = rep.standing?.value || rep.standing?.raw || 0;
            }
          }
        }

        const completedQuestIds = new Set((blizzQuests?.quests || []).map((q: any) => q.id));

        const updatedChar: Character = {
          ...char,
          ...(rio || {}),
          itemLevel: blizzSum?.equipped_item_level || rio?.itemLevel || char.itemLevel,
          className: rio?.className || blizzSum?.character_class?.name || char.className,
          thumbnailUrl: blizzSum?.character_media?.href || rio?.thumbnailUrl || char.thumbnailUrl,
          collections: {
            mounts: blizzColl?.mounts?.mounts?.length || 0,
            pets: blizzColl?.pets?.pets?.length || 0,
            toys: blizzColl?.toys?.toys?.length || 0,
            achievements: blizzAch?.total_quantity || 0,
            titles: blizzSum?.titles?.length || 0
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
              season: (blizzPvPSolo?.season_match_statistics?.played || 0) + (blizzPvP2v2?.season_match_statistics?.played || 0) + (blizzPvP3v3?.season_match_statistics?.played || 0),
              weekly: (blizzPvPSolo?.weekly_match_statistics?.played || 0) + (blizzPvP2v2?.weekly_match_statistics?.played || 0) + (blizzPvP3v3?.weekly_match_statistics?.played || 0),
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
            highestMplus: rio?.recentRuns && rio.recentRuns.length > 0 ? Math.max(...rio.recentRuns.map(r => r.mythic_level)) : 0,
          },
          warcraftLogs: wclData ? { ...wclData, weeklyRaidKills: wclData.weeklyRaidKills } : undefined,
          professions: blizzProf?.primaries?.map((p: any) => ({ name: p.profession.name, rank: p.rank })) || []
        };

        const resetDate = getCurrentResetTime().toISOString().split('T')[0];
        const existingBaseline = char.raidKillBaseline;
        const currentBossKills = updatedChar.raidBossKills || [];

        const { count: rioWeeklyCount, details: rioDetails, newBaseline } =
          computeWeeklyRaidKills(currentBossKills, existingBaseline, resetDate);

        const wclDetails = (wclData?.weeklyRaidKills || []).map(k => ({
          bossName: k.bossName,
          difficulty: k.difficulty as 'Normal' | 'Heroic' | 'Mythic',
          difficultyId: k.difficultyId,
        }));

        let finalDetails = rioDetails;
        let finalCount = rioWeeklyCount;

        if (wclDetails.length > rioDetails.length) {
          finalDetails = wclDetails;
          finalCount = wclDetails.length;
        }

        updatedChar.raidKillBaseline = newBaseline;
        updatedChar.weeklyRaidBossKills = finalCount;
        updatedChar.weeklyRaidKillDetails = finalDetails;

        if (!updatedChar.gearAudit) {
          updatedChar.gearAudit = {
            sockets: 0, missingSockets: 0, enchantments: 0, tierCount: 0, sparkItems: 0, upgradeTrack: 'Explorer',
            tierPieces: { helm: false, shoulder: false, chest: false, gloves: false, legs: false },
            enchants: { cloak: false, chest: false, wrists: false, legs: false, feet: false, ring1: false, ring2: false, weapon: false, offhand: false, totalRank: 0, missingCount: 0 },
            specificItems: {}, embellishments: [], gems: { rare: 0, epic: 0 },
            itemTracks: { mythic: 0, heroic: 0, champion: 0, veteran: 0, adventurer: 0, explorer: 0 },
            stats: { crit: 0, haste: 0, mastery: 0, vers: 0, critPct: 0, hastePct: 0, masteryPct: 0, versPct: 0 },
            slots: {},
            vault: { rank: 0, thisWeek: 0, raid: [{label: '-', ilvl: 0}, {label: '-', ilvl: 0}, {label: '-', ilvl: 0}], dungeon: [{label: '-', ilvl: 0}, {label: '-', ilvl: 0}, {label: '-', ilvl: 0}], world: [{label: '-', ilvl: 0}, {label: '-', ilvl: 0}, {label: '-', ilvl: 0}], score: 0 }
          };
        }

        // Process Detailed Gear Audit using Blizzard Equipment Data
        if (blizzEquip?.equipped_items) {
          const slots: Record<string, SlotAudit> = {};
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
              isTier: isTier,
              hasGem: gemsSlotted > 0,
              gemsCount: gemsSlotted
            };
          });

          updatedChar.gearAudit.itemTracks = itemTracks;
          updatedChar.gearAudit.slots = { ...updatedChar.gearAudit.slots, ...slots };
          updatedChar.gearAudit.sockets = totalGemsSlotted;
          updatedChar.gearAudit.enchantments = enchantsDone;
          updatedChar.gearAudit.enchants.missingCount = missingEnchantsCount;
          updatedChar.gearAudit.tierCount = tierCount;
          updatedChar.gearAudit.enchants.cloak = !!slots['back']?.hasEnchant;
          updatedChar.gearAudit.enchants.chest = !!slots['chest']?.hasEnchant;
          updatedChar.gearAudit.enchants.wrists = !!slots['wrist']?.hasEnchant;
          updatedChar.gearAudit.enchants.legs = !!slots['legs']?.hasEnchant;
          updatedChar.gearAudit.enchants.feet = !!slots['feet']?.hasEnchant;
          updatedChar.gearAudit.enchants.ring1 = !!slots['finger1']?.hasEnchant;
          updatedChar.gearAudit.enchants.ring2 = !!slots['finger2']?.hasEnchant;
          updatedChar.gearAudit.enchants.weapon = !!slots['mainhand']?.hasEnchant;
        }

        if (blizzStat && updatedChar.gearAudit) {
          const s = blizzStat;
          updatedChar.gearAudit.stats = {
            ...updatedChar.gearAudit.stats,
            critPct: s.melee_crit?.value ?? s.spell_crit?.value ?? s.ranged_crit?.value ?? 0,
            hastePct: s.melee_haste?.value ?? s.spell_haste?.value ?? s.ranged_haste?.value ?? 0,
            masteryPct: s.mastery?.value ?? 0,
            versPct: s.versatility_damage_done_bonus ?? 0
          };
        }

        if (updatedChar.gearAudit) {
          const sorted = [...finalDetails].sort((a, b) => b.difficultyId - a.difficultyId);
          updatedChar.gearAudit.vault.raid = [
            { label: finalCount >= 2 ? (sorted[1]?.difficulty || 'Normal') : '-', ilvl: 0 },
            { label: finalCount >= 4 ? (sorted[3]?.difficulty || 'Normal') : '-', ilvl: 0 },
            { label: finalCount >= 6 ? (sorted[5]?.difficulty || 'Normal') : '-', ilvl: 0 },
          ];
        }

        await persistenceService.upsertCharacterData(updatedChar, memberName, player.role);
        return updatedChar;
      };

      await processChar(char);

      // Reload roster from database
      const updatedRoster = await persistenceService.loadRosterFromDatabase();
      setRoster(updatedRoster);
      await loadLastSyncTime();
    } catch (e) {
      console.error('Failed to refresh character:', e);
      setError('Failed to add and refresh character');
    } finally {
      setIsUpdating(false);
    }
  }, [roster, raidConfig]);

  return (
    <div className="min-h-screen wow-gradient flex flex-col md:flex-row overflow-hidden h-screen text-slate-200">
      <Toast toasts={toasts} onDismiss={dismissToast} />
      <nav className={`relative bg-[#050507] border-b md:border-b-0 md:border-r border-white/5 sticky top-0 md:h-screen z-10 flex flex-col shadow-2xl transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-full md:w-[72px] p-3' : 'w-full md:w-64 p-6'}`}>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex absolute -right-3 top-8 w-6 h-6 bg-[#050507] border border-white/10 rounded-full items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-all z-20 shadow-lg"
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div className={`${sidebarCollapsed ? 'space-y-2 items-center flex flex-col' : 'space-y-3'}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <img src="/96f31eb4f56a49f3e069065c7614c591.png" alt="Banelings" className="w-10 h-10 rounded-xl shadow-lg flex-shrink-0" />
            {!sidebarCollapsed && <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Banelings</h1>}
          </div>
          {globalActiveUsers > 0 && !sidebarCollapsed && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/30 rounded-lg">
              <Eye size={14} className="text-blue-400" />
              <span className="text-xs font-bold text-blue-400">
                {globalActiveUsers} {globalActiveUsers === 1 ? 'user online' : 'users online'}
              </span>
            </div>
          )}
          {globalActiveUsers > 0 && sidebarCollapsed && (
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500/10 border border-blue-500/30 rounded-lg" title={`${globalActiveUsers} ${globalActiveUsers === 1 ? 'user' : 'users'} online`}>
              <Eye size={12} className="text-blue-400" />
            </div>
          )}
        </div>

        <div className={`space-y-1 flex-1 ${sidebarCollapsed ? 'mt-4' : 'mt-8'}`}>
          {[
            { id: 'roster', label: 'Roster', icon: Users },
            { id: 'audit', label: 'Audit-Beta', icon: ClipboardList },
            { id: 'splits', label: 'Split Setup', icon: Split },
            { id: 'analytics', label: 'Performance', icon: LayoutGrid },
            { id: 'settings', label: 'Config', icon: SettingsIcon },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'} ${activeTab === item.id ? 'bg-[#059669] text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon size={16} className="flex-shrink-0" />
              {!sidebarCollapsed && item.label}
            </button>
          ))}
        </div>

        <div className={`border-t border-white/5 ${sidebarCollapsed ? 'pt-4' : 'pt-8'}`}>
          {sidebarCollapsed ? (
            <div className="flex justify-center" title={`Last Sync: ${lastUpdate}`}>
              <Database className={isUpdating ? "text-[#059669] animate-pulse" : "text-emerald-500"} size={14} />
            </div>
          ) : (
            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Database State</p>
                <Database className={isUpdating ? "text-[#059669] animate-pulse" : "text-emerald-500"} size={12} />
              </div>
              <p className="text-[10px] text-slate-300">Last Sync: {lastUpdate}</p>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#020203]">
        {migrationBanner.show && !migrationDismissed && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-4 duration-500">
            <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <div className="text-blue-300 font-bold text-sm mb-1">Roster Migration Available</div>
              <div className="text-slate-400 text-xs mb-3">
                Found {migrationBanner.count} player{migrationBanner.count !== 1 ? 's' : ''} in character_data that can be migrated to roster_members.
                This will allow you to manage your roster structure more effectively.
              </div>
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setMigrationDismissed(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
              >
                Go to Settings to Migrate
              </button>
            </div>
            <button
              onClick={() => {
                setMigrationDismissed(true);
                localStorage.setItem('migration_dismissed', 'true');
              }}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-[0.2em]">Gilden Dashboard</span>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight uppercase italic">
              {activeTab === 'roster' && 'Guild Roster'}
              {activeTab === 'audit' && 'Audit-Beta'}
              {activeTab === 'splits' && 'Split Control'}
              {activeTab === 'analytics' && 'Performance'}
              {activeTab === 'settings' && 'System Config'}
            </h2>
          </div>
          
          <div className="flex flex-col items-end gap-2">
              <button 
                  onClick={syncAll}
                  disabled={isUpdating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-indigo-600/20"
              >
                  {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                  {isUpdating ? `SYNCING ${updateProgress.current}/${updateProgress.total}` : 'REFRESH Armory'}
              </button>
              {isUpdating && (
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-300" 
                    style={{ width: `${(updateProgress.current / updateProgress.total) * 100}%` }} 
                  />
                </div>
              )}
          </div>
        </header>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3">
             <AlertTriangle size={16} />
             {error}
          </div>
        )}

        <div className="mx-auto">
          {activeTab === 'roster' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 max-w-[1600px] mx-auto w-full">
              <StatOverview roster={roster} minIlvl={minIlvl} />
              <div className="flex justify-end">
                <div className="flex p-1 bg-black rounded-xl border border-white/5">
                  <button onClick={() => setRosterViewMode('overview')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rosterViewMode === 'overview' ? 'bg-[#059669] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Layout size={14} />OVERVIEW</button>
                  <button onClick={() => setRosterViewMode('table')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rosterViewMode === 'table' ? 'bg-[#059669] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><List size={14} />TABLE</button>
                  <button onClick={() => setRosterViewMode('detail')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rosterViewMode === 'detail' ? 'bg-[#059669] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><User size={14} />DETAIL</button>
                </div>
              </div>
              {rosterViewMode === 'overview' && <RosterOverview roster={roster} minIlvl={minIlvl} onDeleteCharacter={handleDeleteCharacter} onAddCharacter={handleAddCharacter} onMemberClick={handleMemberClick} onSwapCharacters={handleSwapCharacters} onAddPlayer={handleOpenAddPlayer} onChangeRole={handleChangeRole} />}
              {rosterViewMode === 'table' && <RosterTable roster={roster} minIlvl={minIlvl} />}
              {rosterViewMode === 'detail' && <CharacterDetailView roster={roster} minIlvl={minIlvl} initialMemberName={selectedMemberName} />}
            </div>
          )}
          {activeTab === 'audit' && <RosterAudit roster={roster} ilvlThresholds={ilvlThresholds} />}
          {activeTab === 'splits' && <SplitSetup splits={splits} roster={roster} minIlvl={minIlvl} />}
          {activeTab === 'analytics' && <div className="max-w-[1600px] mx-auto w-full"><AnalyticsDashboard roster={roster} /></div>}
          {activeTab === 'settings' && <Settings onRosterUpdate={handleReloadRoster} />}
        </div>
      </main>

      <AddCharacterModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setAddModalContext(null);
        }}
        onAdd={async (characterName, realm) => {
          if (!addModalContext) return;
          await refreshSingleCharacter(characterName, realm, addModalContext.memberName, addModalContext.isMain);
        }}
        memberName={addModalContext?.memberName || ''}
        isMain={addModalContext?.isMain || false}
      />
      <AddPlayerModal
        isOpen={addPlayerModalOpen}
        onClose={() => setAddPlayerModalOpen(false)}
        onAdd={handleAddPlayer}
        defaultRole={addPlayerModalRole}
      />
    </div>
  );
};

export default App;
