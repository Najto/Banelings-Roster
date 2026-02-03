
import React, { useState, useMemo } from 'react';
import { Player, Character, CLASS_COLORS, PlayerRole, GearItem } from '../types';
import {
  Shield, Heart, Sword, Target, ChevronDown, ChevronUp, Check, X, Eye, EyeOff, Filter,
  Star, Gem, Zap, AlertCircle, Trophy, Box, Sparkles, BarChart, Wand2,
  Compass, Users2, Award, Swords, Hexagon, Search
} from 'lucide-react';

interface AuditProps {
  roster: Player[];
  minIlvl: number;
  isEnriched?: boolean;
  onEnrich?: () => void;
  isEnriching?: boolean;
}

type CharacterFilter = 'mains' | 'alts' | 'all';

interface ColumnGroup {
  id: string;
  label: string;
  enabled: boolean;
  icon: any;
  colorClass?: string;
}

const ENCHANTABLE_SLOTS = ['back', 'chest', 'wrist', 'legs', 'feet', 'finger1', 'finger2', 'mainhand'];

const SLOT_ORDER = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'mainhand', 'offhand'];

const SLOT_SHORT_NAMES: Record<string, string> = {
  head: 'Helm',
  neck: 'Neck',
  shoulder: 'Shldr',
  back: 'Back',
  chest: 'Chest',
  wrist: 'Wrist',
  hands: 'Hands',
  waist: 'Belt',
  legs: 'Legs',
  feet: 'Feet',
  finger1: 'Ring1',
  finger2: 'Ring2',
  trinket1: 'Trk1',
  trinket2: 'Trk2',
  mainhand: 'MH',
  offhand: 'OH'
};

const RoleIcon = ({ role }: { role: PlayerRole }) => {
  switch (role) {
    case PlayerRole.TANK: return <Shield size={10} className="text-blue-400" />;
    case PlayerRole.HEALER: return <Heart size={10} className="text-emerald-400" />;
    case PlayerRole.MELEE: return <Sword size={10} className="text-red-400" />;
    case PlayerRole.RANGE: return <Target size={10} className="text-cyan-400" />;
    default: return null;
  }
};

const StatusCell = ({ good }: { good: boolean }) => (
  good ? <Check size={10} className="text-emerald-400 mx-auto" /> : <X size={10} className="text-red-400 mx-auto" />
);

const getGearBySlot = (gear: GearItem[] | undefined): Record<string, GearItem> => {
  if (!gear) return {};
  return gear.reduce((acc, item) => {
    acc[item.slot] = item;
    return acc;
  }, {} as Record<string, GearItem>);
};

const getTrackColor = (track: string | undefined): string => {
  switch (track?.toLowerCase()) {
    case 'mythic': return 'text-amber-400';
    case 'hero': return 'text-blue-400';
    case 'champion': return 'text-emerald-400';
    case 'veteran': return 'text-cyan-400';
    case 'adventurer': return 'text-slate-400';
    case 'explorer': return 'text-slate-600';
    default: return 'text-slate-500';
  }
};

const getTrackShort = (track: string | undefined): string => {
  switch (track?.toLowerCase()) {
    case 'mythic': return 'M';
    case 'hero': return 'H';
    case 'champion': return 'C';
    case 'veteran': return 'V';
    case 'adventurer': return 'A';
    case 'explorer': return 'E';
    default: return '-';
  }
};

export const Audit: React.FC<AuditProps> = ({ roster, minIlvl, isEnriched = false, onEnrich, isEnriching = false }) => {
  const [charFilter, setCharFilter] = useState<CharacterFilter>('mains');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'itemLevel', direction: 'desc' });
  const [columnGroups, setColumnGroups] = useState<ColumnGroup[]>([
    { id: 'greatVault', label: 'Great Vault Score', enabled: true, icon: Trophy },
    { id: 'trackDist', label: 'Equipped Items by Track', enabled: true, icon: Box },
    { id: 'gearStats', label: 'Gear Stats', enabled: true, icon: Sparkles },
    { id: 'statDist', label: 'Stat Distribution (%)', enabled: true, icon: BarChart },
    { id: 'enchants', label: 'Enchantments', enabled: true, icon: Wand2 },
    { id: 'slotAudit', label: 'Slot Audit (iLvl & Tracks)', enabled: false, icon: Gem },
    { id: 'specificGear', label: 'Specific Gear', enabled: false, icon: Zap },
    { id: 'currencies', label: 'Currencies', enabled: false, icon: Gem, colorClass: 'text-amber-500' },
    { id: 'worldProgress', label: 'World Progress', enabled: false, icon: Compass, colorClass: 'text-emerald-500' },
    { id: 'pvpAudit', label: 'PvP Audit', enabled: false, icon: Swords, colorClass: 'text-red-500' },
    { id: 'raidProgress', label: 'Raid & CE', enabled: false, icon: Award },
    { id: 'collections', label: 'Collections', enabled: false, icon: Hexagon, colorClass: 'text-purple-400' }
  ]);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const toggleColumnGroup = (id: string) => {
    setColumnGroups(prev => prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g));
  };

  const characters = useMemo(() => {
    const result: { char: Character; player: Player; isMain: boolean }[] = [];

    roster.forEach(player => {
      if (charFilter === 'mains' || charFilter === 'all') {
        result.push({ char: player.mainCharacter, player, isMain: true });
      }
      if (charFilter === 'alts' || charFilter === 'all') {
        player.splits.forEach(split => {
          result.push({ char: split, player, isMain: false });
        });
      }
    });

    return result
      .filter(({ char, player }) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          char.name.toLowerCase().includes(search) ||
          player.name.toLowerCase().includes(search) ||
          char.className?.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        const { key, direction } = sortConfig;
        let comparison = 0;

        if (key === 'name') {
          comparison = a.char.name.localeCompare(b.char.name);
        } else if (key === 'playerName') {
          comparison = a.player.name.localeCompare(b.player.name);
        } else if (key === 'itemLevel') {
          comparison = (a.char.itemLevel || 0) - (b.char.itemLevel || 0);
        } else if (key === 'mPlusRating') {
          comparison = (a.char.mPlusRating || 0) - (b.char.mPlusRating || 0);
        }

        return direction === 'asc' ? comparison : -comparison;
      });
  }, [roster, charFilter, searchTerm, sortConfig]);

  const isGroupEnabled = (id: string) => columnGroups.find(g => g.id === id)?.enabled || false;

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="space-y-4 pb-20 max-w-full">
      {!isEnriched && (
        <div className="bg-amber-500 bg-opacity-10 border border-amber-500 border-opacity-20 text-amber-400 px-6 py-4 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">Detailed Data Not Available</h3>
                <p className="text-xs opacity-80 mt-1">
                  The audit requires enriched character data. Click "Enrich All Data" to fetch detailed gear, stats, and vault information.
                </p>
              </div>
            </div>
            {onEnrich && (
              <button
                onClick={onEnrich}
                disabled={isEnriching}
                className="bg-amber-500 hover:bg-amber-600 text-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap size={16} className={isEnriching ? 'animate-spin' : ''} />
                {isEnriching ? 'Enriching...' : 'Enrich All Data'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-900 bg-opacity-95 backdrop-blur-md p-4 rounded-3xl border border-white border-opacity-5 sticky top-0 z-40 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-black rounded-2xl border border-white border-opacity-5">
            {(['mains', 'alts', 'all'] as CharacterFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setCharFilter(filter)}
                className={charFilter === filter
                  ? 'px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-cyan-600 text-white shadow-lg transition-all'
                  : 'px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-all'
                }
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="flex items-center gap-2 px-5 py-2 bg-black rounded-2xl border border-white border-opacity-5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
            >
              <Filter size={12} />
              Columns ({columnGroups.filter(g => g.enabled).length})
              <ChevronDown size={10} className={showColumnMenu ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>

            {showColumnMenu && (
              <div className="absolute top-full left-0 mt-2 bg-gray-900 border border-white border-opacity-10 rounded-2xl p-3 z-50 min-w-[280px] shadow-2xl max-h-[400px] overflow-y-auto">
                {columnGroups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <button
                      key={group.id}
                      onClick={() => toggleColumnGroup(group.id)}
                      className={group.enabled
                        ? `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all mb-1 bg-cyan-500 bg-opacity-10 ${group.colorClass || 'text-cyan-400'}`
                        : 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all mb-1 text-slate-500 hover:text-white hover:bg-white hover:bg-opacity-5'
                      }
                    >
                      {group.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                      <Icon size={14} />
                      <span className="flex-1 text-left">{group.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="relative w-full md:w-[400px]">
          <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-600" size={16} />
          <input
            type="text"
            placeholder="Search characters..."
            className="w-full bg-black border border-white border-opacity-5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-cyan-500 outline-none font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <span className="text-xs text-slate-600">
          {characters.length} characters
        </span>
      </div>

      <div className="bg-gray-900 border border-white border-opacity-5 rounded-3xl shadow-2xl overflow-x-auto border-t-0">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white border-opacity-10">
              <th className="py-2 px-3 text-xs font-black text-slate-600 uppercase tracking-wider text-left">Player</th>
              <th className="py-2 px-3 text-xs font-black text-slate-600 uppercase tracking-wider text-left">Character</th>
              <th className="py-2 px-3 text-xs font-black text-slate-600 uppercase tracking-wider text-center">iLvl</th>
              <th className="py-2 px-3 text-xs font-black text-slate-600 uppercase tracking-wider text-center">M+</th>

              {isGroupEnabled('greatVault') && (
                <>
                  <th colSpan={9} className="py-2 px-3 text-xs font-black text-amber-500 opacity-60 uppercase tracking-wider text-center border-l border-white border-opacity-5">Great Vault</th>
                </>
              )}

              {isGroupEnabled('trackDist') && (
                <>
                  <th colSpan={6} className="py-2 px-3 text-xs font-black text-cyan-500 opacity-60 uppercase tracking-wider text-center border-l border-white border-opacity-5">Tracks</th>
                </>
              )}

              {isGroupEnabled('gearStats') && (
                <>
                  <th colSpan={3} className="py-2 px-3 text-xs font-black text-slate-600 uppercase tracking-wider text-center border-l border-white border-opacity-5">Gear</th>
                </>
              )}

              {isGroupEnabled('statDist') && (
                <>
                  <th colSpan={4} className="py-2 px-3 text-xs font-black text-slate-600 uppercase tracking-wider text-center border-l border-white border-opacity-5">Stats %</th>
                </>
              )}

              {isGroupEnabled('enchants') && (
                <>
                  <th colSpan={8} className="py-2 px-3 text-xs font-black text-slate-600 uppercase tracking-wider text-center border-l border-white border-opacity-5">Enchants</th>
                </>
              )}

              {isGroupEnabled('slotAudit') && (
                <>
                  <th colSpan={SLOT_ORDER.length} className="py-2 px-3 text-xs font-black text-slate-600 uppercase tracking-wider text-center border-l border-white border-opacity-5">Slots</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {characters.map(({ char, player, isMain }, idx) => {
              const gearBySlot = getGearBySlot(char.gear);
              const tierCount = char.gear?.filter(g => g.tier).length || 0;
              const enchantedSlots = ENCHANTABLE_SLOTS.filter(slot => gearBySlot[slot]?.enchant);
              const gemSlots = char.gear?.filter(g => g.gems && g.gems.length > 0).length || 0;

              const trackCounts = {
                mythic: char.gear?.filter(g => g.upgradeTrack?.toLowerCase() === 'mythic').length || 0,
                hero: char.gear?.filter(g => g.upgradeTrack?.toLowerCase() === 'hero').length || 0,
                champion: char.gear?.filter(g => g.upgradeTrack?.toLowerCase() === 'champion').length || 0,
                veteran: char.gear?.filter(g => g.upgradeTrack?.toLowerCase() === 'veteran').length || 0,
                adventurer: char.gear?.filter(g => g.upgradeTrack?.toLowerCase() === 'adventurer').length || 0,
                explorer: char.gear?.filter(g => g.upgradeTrack?.toLowerCase() === 'explorer').length || 0
              };

              const stats = char.stats || { crit: 0, haste: 0, mastery: 0, versatility: 0 };
              const gv = char.greatVault;

              return (
                <tr key={`${player.id}-${char.name}-${idx}`} className="border-b border-white border-opacity-5 hover:bg-white hover:bg-opacity-5 transition-colors">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <RoleIcon role={player.role} />
                      <span className="text-xs font-bold text-slate-400 truncate max-w-[100px]">{player.name}</span>
                      {!isMain && <span className="text-xs text-slate-600 uppercase">Alt</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      {char.thumbnailUrl && <img src={char.thumbnailUrl} className="w-5 h-5 rounded border border-white border-opacity-10" alt="" />}
                      <span className="text-xs font-black" style={{ color: CLASS_COLORS[char.className] }}>{char.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center text-xs font-black text-white">{char.itemLevel}</td>
                  <td className="py-2 px-3 text-center text-xs font-black text-amber-500">{char.mPlusRating || '-'}</td>

                  {isGroupEnabled('greatVault') && (
                    <>
                      {[0, 1, 2].map(i => (
                        <td key={`r${i}`} className="py-2 px-2 text-center text-xs border-l border-white border-opacity-5">
                          <span className={gv?.raid[i]?.available ? 'text-amber-400 font-bold' : 'text-slate-700'}>{gv?.raid[i]?.itemLevel || '-'}</span>
                        </td>
                      ))}
                      {[0, 1, 2].map(i => (
                        <td key={`d${i}`} className="py-2 px-2 text-center text-xs">
                          <span className={gv?.dungeon[i]?.available ? 'text-blue-400 font-bold' : 'text-slate-700'}>{gv?.dungeon[i]?.itemLevel || '-'}</span>
                        </td>
                      ))}
                      {[0, 1, 2].map(i => (
                        <td key={`w${i}`} className="py-2 px-2 text-center text-xs">
                          <span className={gv?.world[i]?.available ? 'text-emerald-400 font-bold' : 'text-slate-700'}>{gv?.world[i]?.itemLevel || '-'}</span>
                        </td>
                      ))}
                    </>
                  )}

                  {isGroupEnabled('trackDist') && (
                    <>
                      <td className="py-2 px-2 text-center text-xs border-l border-white border-opacity-5">
                        <span className={trackCounts.mythic > 0 ? 'text-purple-400 font-black' : 'text-slate-700'}>{trackCounts.mythic || '-'}</span>
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        <span className={trackCounts.hero > 0 ? 'text-blue-400 font-black' : 'text-slate-700'}>{trackCounts.hero || '-'}</span>
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        <span className={trackCounts.champion > 0 ? 'text-emerald-400' : 'text-slate-700'}>{trackCounts.champion || '-'}</span>
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        <span className={trackCounts.veteran > 0 ? 'text-amber-400' : 'text-slate-700'}>{trackCounts.veteran || '-'}</span>
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        <span className={trackCounts.adventurer > 0 ? 'text-slate-400' : 'text-slate-700'}>{trackCounts.adventurer || '-'}</span>
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        <span className={trackCounts.explorer > 0 ? 'text-slate-600' : 'text-slate-700'}>{trackCounts.explorer || '-'}</span>
                      </td>
                    </>
                  )}

                  {isGroupEnabled('gearStats') && (
                    <>
                      <td className="py-2 px-2 text-center text-xs border-l border-white border-opacity-5">
                        <span className={tierCount >= 4 ? 'text-emerald-500 font-black' : tierCount >= 2 ? 'text-amber-400 font-black' : 'text-slate-500 font-black'}>{tierCount}/5</span>
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        <span className={enchantedSlots.length === ENCHANTABLE_SLOTS.length ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{enchantedSlots.length}/{ENCHANTABLE_SLOTS.length}</span>
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        <span className={gemSlots > 0 ? 'text-cyan-400 font-bold' : 'text-slate-700'}>{gemSlots}</span>
                      </td>
                    </>
                  )}

                  {isGroupEnabled('statDist') && (
                    <>
                      <td className="py-2 px-2 text-center text-xs text-white font-black border-l border-white border-opacity-5">{stats.crit.toFixed(1)}%</td>
                      <td className="py-2 px-2 text-center text-xs text-white font-black">{stats.haste.toFixed(1)}%</td>
                      <td className="py-2 px-2 text-center text-xs text-white font-black">{stats.mastery.toFixed(1)}%</td>
                      <td className="py-2 px-2 text-center text-xs text-white font-black">{stats.versatility.toFixed(1)}%</td>
                    </>
                  )}

                  {isGroupEnabled('enchants') && (
                    <>
                      {ENCHANTABLE_SLOTS.map(slot => (
                        <td key={slot} className="py-2 px-2 text-center border-l border-white border-opacity-5">
                          <StatusCell good={!!gearBySlot[slot]?.enchant} />
                        </td>
                      ))}
                    </>
                  )}

                  {isGroupEnabled('slotAudit') && SLOT_ORDER.map(slot => {
                    const item = gearBySlot[slot];
                    return (
                      <td key={slot} className="py-2 px-2 text-center border-l border-white border-opacity-5">
                        {item ? (
                          <div className="flex flex-col">
                            <span className={item.itemLevel >= 626 ? 'text-purple-400 text-xs font-black' : item.itemLevel >= 613 ? 'text-cyan-400 text-xs font-black' : 'text-slate-400 text-xs font-black'}>{item.itemLevel}</span>
                            <span className="text-xs text-slate-500 opacity-60">{getTrackShort(item.upgradeTrack)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-700">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
