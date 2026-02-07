
import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_ROSTER } from './constants';
import { Player, MemberMapping, PlayerRole, SplitGroup, Character, SlotAudit, GearAudit } from './types';
import { RosterTable } from './components/RosterTable';
import { StatOverview } from './components/StatOverview';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SplitSetup } from './components/SplitSetup';
import { RosterAudit } from './components/RosterAudit';
import { CharacterDetailView } from './components/CharacterDetailView';
import { RosterOverview } from './components/RosterOverview';
import { Settings } from './components/Settings';
import { fetchRosterFromSheet, fetchSplitsFromSheet } from './services/spreadsheetService';
import { fetchRaiderIOData, getCurrentResetTime, computeWeeklyRaidKills } from './services/raiderioService';
import { fetchBlizzardToken, getCharacterSummary, getCharacterStats, getCharacterAchievements, getCharacterCollections, getCharacterProfessions, getCharacterEquipment, getCharacterPvPSummary, getCharacterPvPBracket, getCharacterReputations, getCharacterQuests } from './services/blizzardService';
import { fetchWarcraftLogsData } from './services/warcraftlogsService';
import { persistenceService } from './services/persistenceService';
import { LayoutGrid, Users, Trophy, Sword, RefreshCw, Settings as SettingsIcon, AlertTriangle, Zap, Split, ClipboardList, Database, List, User, Loader2, Layout } from 'lucide-react';

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
  if (ilvl >= 626) return "Mythic";
  if (ilvl >= 613) return "Heroic";
  if (ilvl >= 600) return "Champion";
  if (ilvl >= 587) return "Veteran";
  if (ilvl >= 574) return "Adventurer";
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
  const [roster, setRoster] = useState<Player[]>(INITIAL_ROSTER);
  const [splits, setSplits] = useState<SplitGroup[]>([]);
  const [minIlvl, setMinIlvl] = useState<number>(615);
  const [activeTab, setActiveTab] = useState<'roster' | 'audit' | 'analytics' | 'splits' | 'settings'>('roster');
  const [rosterViewMode, setRosterViewMode] = useState<'table' | 'overview' | 'detail'>('overview');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("Nie");

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
    setError(null);
    try {
      const blizzToken = await fetchBlizzardToken();
      const [rosterResult, splitsResult] = await Promise.all([
        fetchRosterFromSheet(),
        fetchSplitsFromSheet()
      ]);

      setSplits(splitsResult);
      setMinIlvl(rosterResult.minIlvl);
      setUpdateProgress({ current: 0, total: rosterResult.roster.length });

      const mappings: MemberMapping[] = JSON.parse(localStorage.getItem('guild_mappings') || "[]");
      
      const enrichedRoster: Player[] = [];

      for (let i = 0; i < rosterResult.roster.length; i++) {
        const player = rosterResult.roster[i];
        setUpdateProgress(prev => ({ ...prev, current: i + 1 }));

        const mapping = mappings.find(m => m.memberName.toLowerCase() === player.name.toLowerCase());
        const finalRole = (mapping && mapping.role && mapping.role !== PlayerRole.UNKNOWN) ? mapping.role : player.role;

        const processChar = async (char: Character) => {
          const realm = char.server || "Blackhand";
          // 1. Fetch Raider.io Data
          const rio = await fetchRaiderIOData(char.name, realm);
          
          let blizzSum = null, blizzStat = null, blizzAch = null, blizzColl = null, blizzProf = null, blizzEquip = null;
          let blizzPvP = null, blizzPvPSolo = null, blizzPvP2v2 = null, blizzPvP3v3 = null, blizzReps = null, blizzQuests = null;

          // 2. Fetch Blizzard Data (if token available)
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

            [blizzPvPSolo, blizzPvP2v2, blizzPvP3v3] = await Promise.all([
              getCharacterPvPBracket(blizzToken, realm, char.name, 'shuffle'),
              getCharacterPvPBracket(blizzToken, realm, char.name, '2v2'),
              getCharacterPvPBracket(blizzToken, realm, char.name, '3v3'),
            ].map(p => p.catch(() => null)));
          }

          // 3. Fetch WarcraftLogs data
          const wclData = await fetchWarcraftLogsData(char.name, realm).catch(() => null);

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

          // 3. Process Detailed Gear Audit using Blizzard Equipment Data
          if (blizzEquip?.equipped_items) {
            const slots: Record<string, SlotAudit> = {};
            const itemTracks = { mythic: 0, heroic: 0, champion: 0, veteran: 0, adventurer: 0, explorer: 0 };
            let totalGemsSlotted = 0, enchantsDone = 0, missingEnchantsCount = 0, tierCount = 0;

            blizzEquip.equipped_items.forEach((item: any) => {
              // Access item properties directly from the array element
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

            // Update gearAudit from latest Blizzard data
            updatedChar.gearAudit.itemTracks = itemTracks;
            updatedChar.gearAudit.slots = { ...updatedChar.gearAudit.slots, ...slots };
            updatedChar.gearAudit.sockets = totalGemsSlotted;
            updatedChar.gearAudit.enchantments = enchantsDone;
            updatedChar.gearAudit.enchants.missingCount = missingEnchantsCount;
            updatedChar.gearAudit.tierCount = tierCount;
            // Map individual enchant slots for UI visualization
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

          // 4. Persist to DB
          await persistenceService.upsertCharacterData(updatedChar, player.name, finalRole);
          return updatedChar;
        };

        const enrichedMain = await processChar(player.mainCharacter);
        const enrichedSplits: Character[] = [];
        for (const splitChar of player.splits) {
          enrichedSplits.push(await processChar(splitChar));
        }

        enrichedRoster.push({
          ...player,
          role: finalRole,
          mainCharacter: enrichedMain,
          splits: enrichedSplits
        });
      }

      setRoster(enrichedRoster);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Sync error:", e);
      setError("Synchronisierung fehlgeschlagen. Blizzard API Limit erreicht oder Verbindungsprobleme.");
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Initial Data Load
  useEffect(() => {
    const initLoad = async () => {
      try {
        const rosterResult = await fetchRosterFromSheet();
        const merged = await mergeWithDatabase(rosterResult.roster);
        setRoster(merged);
        const splitsResult = await fetchSplitsFromSheet();
        setSplits(splitsResult);
        setMinIlvl(rosterResult.minIlvl);
      } catch (e) {}
    };
    initLoad();
  }, [mergeWithDatabase]);

  return (
    <div className="min-h-screen wow-gradient flex flex-col md:flex-row overflow-hidden h-screen text-slate-200">
      <nav className="w-full md:w-64 bg-[#050507] border-b md:border-b-0 md:border-r border-white/5 p-6 space-y-8 sticky top-0 md:h-screen z-10 flex flex-col shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Sword className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Banelings</h1>
        </div>

        <div className="space-y-1 flex-1">
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="pt-8 border-t border-white/5">
          <div className="bg-black/40 p-4 rounded-xl border border-white/5">
             <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Database State</p>
               <Database className={isUpdating ? "text-indigo-400 animate-pulse" : "text-emerald-500"} size={12} />
             </div>
             <p className="text-[10px] text-slate-300">Last Sync: {lastUpdate}</p>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#020203]">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-[0.2em]">Gilden Dashboard S1</span>
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
                  {isUpdating ? `SYNCING ${updateProgress.current}/${updateProgress.total}` : 'REFRESH DATA'}
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

        <div className="max-w-[1600px] mx-auto">
          {activeTab === 'roster' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
              <StatOverview roster={roster} minIlvl={minIlvl} />
              <div className="flex justify-end">
                <div className="flex p-1 bg-black rounded-xl border border-white/5">
                  <button onClick={() => setRosterViewMode('overview')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rosterViewMode === 'overview' ? 'bg-[#059669] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Layout size={14} />OVERVIEW</button>
                  <button onClick={() => setRosterViewMode('table')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rosterViewMode === 'table' ? 'bg-[#059669] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><List size={14} />TABLE</button>
                  <button onClick={() => setRosterViewMode('detail')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rosterViewMode === 'detail' ? 'bg-[#059669] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><User size={14} />DETAIL</button>
                </div>
              </div>
              {rosterViewMode === 'overview' && <RosterOverview roster={roster} minIlvl={minIlvl} />}
              {rosterViewMode === 'table' && <RosterTable roster={roster} minIlvl={minIlvl} />}
              {rosterViewMode === 'detail' && <CharacterDetailView roster={roster} minIlvl={minIlvl} />}
            </div>
          )}
          {activeTab === 'audit' && <RosterAudit roster={roster} />}
          {activeTab === 'splits' && <SplitSetup splits={splits} roster={roster} minIlvl={minIlvl} />}
          {activeTab === 'analytics' && <AnalyticsDashboard roster={roster} />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
};

export default App;
