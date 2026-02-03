
import React, { useState, useMemo, useEffect } from 'react';
import { Player, Character, CLASS_COLORS, PlayerRole, GearItem } from '../types';
import { Shield, Heart, Sword, Target, ChevronDown, ChevronRight, Check, X, Eye, EyeOff, Filter, Star, Gem, Zap, AlertCircle } from 'lucide-react';

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
}

const ENCHANTABLE_SLOTS = ['back', 'chest', 'wrist', 'legs', 'feet', 'finger1', 'finger2', 'mainhand'];
const SOCKET_SLOTS = ['neck', 'finger1', 'finger2'];

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
  const [columnGroups, setColumnGroups] = useState<ColumnGroup[]>([
    { id: 'greatVault', label: 'Great Vault Score', enabled: true },
    { id: 'trackDist', label: 'Equipped Items by Track', enabled: true },
    { id: 'gearStats', label: 'Gear Stats', enabled: true },
    { id: 'statDist', label: 'Stat Distribution (%)', enabled: true },
    { id: 'enchants', label: 'Enchantments', enabled: true },
    { id: 'slotAudit', label: 'Slot Audit (iLvl & Tracks)', enabled: false },
    { id: 'specificGear', label: 'Specific Gear', enabled: false },
    { id: 'currencies', label: 'Currencies', enabled: false },
    { id: 'worldProgress', label: 'World Progress', enabled: false },
    { id: 'pvpAudit', label: 'PvP Audit', enabled: false }
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

    return result.sort((a, b) => {
      if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
      return b.char.itemLevel - a.char.itemLevel;
    });
  }, [roster, charFilter]);

  const isGroupEnabled = (id: string) => columnGroups.find(g => g.id === id)?.enabled || false;

  return (
    <div className="space-y-4">
      {!isEnriched && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-6 py-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">Detailed Data Not Available</h3>
                <p className="text-xs text-amber-400/80 mt-1">
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

      <div className="flex flex-wrap items-center gap-3 bg-[#0c0c0e] p-3 rounded-xl border border-white/5">
        <div className="flex p-0.5 bg-black rounded-lg border border-white/5">
          {(['mains', 'alts', 'all'] as CharacterFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setCharFilter(filter)}
              className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                charFilter === filter
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-black rounded-lg border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
          >
            <Filter size={12} />
            Columns
            <ChevronDown size={10} className={`transition-transform ${showColumnMenu ? 'rotate-180' : ''}`} />
          </button>

          {showColumnMenu && (
            <div className="absolute top-full left-0 mt-2 bg-[#0c0c0e] border border-white/10 rounded-xl p-2 z-50 min-w-[220px] shadow-2xl">
              {columnGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => toggleColumnGroup(group.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    group.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {group.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                  {group.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-[10px] text-slate-600 ml-auto">
          {characters.length} characters
        </span>
      </div>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-white/10 bg-black/60">
                <th className="sticky left-0 bg-black z-20 py-2 px-2 text-left font-black text-slate-600 uppercase tracking-wider border-r border-white/5">Player</th>
                <th className="py-2 px-2 text-left font-black text-slate-600 uppercase tracking-wider">Character</th>
                <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider">iLvl</th>
                <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider">M+</th>

                {isGroupEnabled('greatVault') && (
                  <>
                    <th colSpan={3} className="py-1 px-2 text-center font-black text-amber-500/60 uppercase tracking-wider border-l border-white/5 bg-amber-500/5">Raid</th>
                    <th colSpan={3} className="py-1 px-2 text-center font-black text-blue-500/60 uppercase tracking-wider bg-blue-500/5">Dungeon</th>
                    <th colSpan={3} className="py-1 px-2 text-center font-black text-emerald-500/60 uppercase tracking-wider bg-emerald-500/5 border-r border-white/5">World</th>
                  </>
                )}

                {isGroupEnabled('trackDist') && (
                  <>
                    <th className="py-2 px-1 text-center font-black text-amber-400 uppercase tracking-wider border-l border-white/5">M</th>
                    <th className="py-2 px-1 text-center font-black text-blue-400 uppercase tracking-wider">H</th>
                    <th className="py-2 px-1 text-center font-black text-emerald-400 uppercase tracking-wider">C</th>
                    <th className="py-2 px-1 text-center font-black text-cyan-400 uppercase tracking-wider">V</th>
                    <th className="py-2 px-1 text-center font-black text-slate-400 uppercase tracking-wider">A</th>
                    <th className="py-2 px-1 text-center font-black text-slate-600 uppercase tracking-wider border-r border-white/5">E</th>
                  </>
                )}

                {isGroupEnabled('gearStats') && (
                  <>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider border-l border-white/5">Tier</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider">Ench</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider border-r border-white/5">Gems</th>
                  </>
                )}

                {isGroupEnabled('statDist') && (
                  <>
                    <th className="py-2 px-2 text-center font-black text-red-400/60 uppercase tracking-wider border-l border-white/5">Crit</th>
                    <th className="py-2 px-2 text-center font-black text-amber-400/60 uppercase tracking-wider">Haste</th>
                    <th className="py-2 px-2 text-center font-black text-blue-400/60 uppercase tracking-wider">Mast</th>
                    <th className="py-2 px-2 text-center font-black text-emerald-400/60 uppercase tracking-wider border-r border-white/5">Vers</th>
                  </>
                )}

                {isGroupEnabled('enchants') && (
                  <>
                    <th className="py-2 px-1 text-center font-black text-slate-600 uppercase tracking-wider border-l border-white/5">Back</th>
                    <th className="py-2 px-1 text-center font-black text-slate-600 uppercase tracking-wider">Chest</th>
                    <th className="py-2 px-1 text-center font-black text-slate-600 uppercase tracking-wider">Wrist</th>
                    <th className="py-2 px-1 text-center font-black text-slate-600 uppercase tracking-wider">Legs</th>
                    <th className="py-2 px-1 text-center font-black text-slate-600 uppercase tracking-wider">Feet</th>
                    <th className="py-2 px-1 text-center font-black text-slate-600 uppercase tracking-wider">R1</th>
                    <th className="py-2 px-1 text-center font-black text-slate-600 uppercase tracking-wider">R2</th>
                    <th className="py-2 px-1 text-center font-black text-slate-600 uppercase tracking-wider border-r border-white/5">MH</th>
                  </>
                )}

                {isGroupEnabled('slotAudit') && SLOT_ORDER.map((slot, idx) => (
                  <th key={slot} className={`py-2 px-1 text-center font-black text-slate-600 uppercase tracking-wider ${idx === 0 ? 'border-l border-white/5' : ''} ${idx === SLOT_ORDER.length - 1 ? 'border-r border-white/5' : ''}`}>
                    {SLOT_SHORT_NAMES[slot]}
                  </th>
                ))}

                {isGroupEnabled('specificGear') && (
                  <>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider border-l border-white/5">Spark</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider">Embel1</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider border-r border-white/5">Embel2</th>
                  </>
                )}

                {isGroupEnabled('currencies') && (
                  <>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider border-l border-white/5">Gilded</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider">Runed</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider">Carved</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider border-r border-white/5">Valor</th>
                  </>
                )}

                {isGroupEnabled('worldProgress') && (
                  <>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider border-l border-white/5">WQ</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider">Delves</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider border-r border-white/5">Keys</th>
                  </>
                )}

                {isGroupEnabled('pvpAudit') && (
                  <>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider border-l border-white/5">Honor</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider">HKs</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider">2v2</th>
                    <th className="py-2 px-2 text-center font-black text-slate-600 uppercase tracking-wider border-r border-white/5">3v3</th>
                  </>
                )}
              </tr>

              {isGroupEnabled('greatVault') && (
                <tr className="border-b border-white/5 bg-black/40">
                  <th className="sticky left-0 bg-black z-20 border-r border-white/5"></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th className="py-1 px-1 text-center text-[8px] text-amber-500/40 border-l border-white/5">1</th>
                  <th className="py-1 px-1 text-center text-[8px] text-amber-500/40">2</th>
                  <th className="py-1 px-1 text-center text-[8px] text-amber-500/40">3</th>
                  <th className="py-1 px-1 text-center text-[8px] text-blue-500/40">1</th>
                  <th className="py-1 px-1 text-center text-[8px] text-blue-500/40">2</th>
                  <th className="py-1 px-1 text-center text-[8px] text-blue-500/40">3</th>
                  <th className="py-1 px-1 text-center text-[8px] text-emerald-500/40">1</th>
                  <th className="py-1 px-1 text-center text-[8px] text-emerald-500/40">2</th>
                  <th className="py-1 px-1 text-center text-[8px] text-emerald-500/40 border-r border-white/5">3</th>
                  {isGroupEnabled('trackDist') && <th colSpan={6} className="border-r border-white/5"></th>}
                  {isGroupEnabled('gearStats') && <th colSpan={3} className="border-r border-white/5"></th>}
                  {isGroupEnabled('statDist') && <th colSpan={4} className="border-r border-white/5"></th>}
                  {isGroupEnabled('enchants') && <th colSpan={8} className="border-r border-white/5"></th>}
                  {isGroupEnabled('slotAudit') && <th colSpan={SLOT_ORDER.length} className="border-r border-white/5"></th>}
                  {isGroupEnabled('specificGear') && <th colSpan={3} className="border-r border-white/5"></th>}
                  {isGroupEnabled('currencies') && <th colSpan={4} className="border-r border-white/5"></th>}
                  {isGroupEnabled('worldProgress') && <th colSpan={3} className="border-r border-white/5"></th>}
                  {isGroupEnabled('pvpAudit') && <th colSpan={4} className="border-r border-white/5"></th>}
                </tr>
              )}
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
                const crests = char.crests;
                const pvp = char.pvpStats;

                return (
                  <tr key={`${player.id}-${char.name}-${idx}`} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${!isMain ? 'bg-white/[0.02]' : ''}`}>
                    <td className="sticky left-0 bg-[#0c0c0e] z-10 py-2 px-2 border-r border-white/5">
                      <div className="flex items-center gap-1.5">
                        <RoleIcon role={player.role} />
                        <span className="font-bold text-slate-400 truncate max-w-[80px]">{player.name}</span>
                        {!isMain && <span className="text-[8px] text-slate-600 uppercase">Alt</span>}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className="font-bold" style={{ color: CLASS_COLORS[char.className] }}>{char.name}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`font-black ${char.itemLevel >= minIlvl ? 'text-emerald-400' : 'text-red-400'}`}>{char.itemLevel}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`font-black ${char.mPlusRating && char.mPlusRating >= 2500 ? 'text-amber-400' : 'text-white'}`}>{char.mPlusRating || '-'}</span>
                    </td>

                    {isGroupEnabled('greatVault') && (
                      <>
                        {[0, 1, 2].map(i => (
                          <td key={`raid-${i}`} className={`py-2 px-1 text-center ${i === 0 ? 'border-l border-white/5' : ''}`}>
                            <span className={gv?.raid[i]?.available ? 'text-amber-400 font-bold' : 'text-slate-700'}>{gv?.raid[i]?.itemLevel || '-'}</span>
                          </td>
                        ))}
                        {[0, 1, 2].map(i => (
                          <td key={`dung-${i}`} className="py-2 px-1 text-center">
                            <span className={gv?.dungeon[i]?.available ? 'text-blue-400 font-bold' : 'text-slate-700'}>{gv?.dungeon[i]?.itemLevel || '-'}</span>
                          </td>
                        ))}
                        {[0, 1, 2].map(i => (
                          <td key={`world-${i}`} className={`py-2 px-1 text-center ${i === 2 ? 'border-r border-white/5' : ''}`}>
                            <span className={gv?.world[i]?.available ? 'text-emerald-400 font-bold' : 'text-slate-700'}>{gv?.world[i]?.itemLevel || '-'}</span>
                          </td>
                        ))}
                      </>
                    )}

                    {isGroupEnabled('trackDist') && (
                      <>
                        <td className="py-2 px-1 text-center border-l border-white/5"><span className={trackCounts.mythic > 0 ? 'text-amber-400 font-bold' : 'text-slate-700'}>{trackCounts.mythic || '-'}</span></td>
                        <td className="py-2 px-1 text-center"><span className={trackCounts.hero > 0 ? 'text-blue-400 font-bold' : 'text-slate-700'}>{trackCounts.hero || '-'}</span></td>
                        <td className="py-2 px-1 text-center"><span className={trackCounts.champion > 0 ? 'text-emerald-400 font-bold' : 'text-slate-700'}>{trackCounts.champion || '-'}</span></td>
                        <td className="py-2 px-1 text-center"><span className={trackCounts.veteran > 0 ? 'text-cyan-400 font-bold' : 'text-slate-700'}>{trackCounts.veteran || '-'}</span></td>
                        <td className="py-2 px-1 text-center"><span className={trackCounts.adventurer > 0 ? 'text-slate-400 font-bold' : 'text-slate-700'}>{trackCounts.adventurer || '-'}</span></td>
                        <td className="py-2 px-1 text-center border-r border-white/5"><span className={trackCounts.explorer > 0 ? 'text-slate-500 font-bold' : 'text-slate-700'}>{trackCounts.explorer || '-'}</span></td>
                      </>
                    )}

                    {isGroupEnabled('gearStats') && (
                      <>
                        <td className="py-2 px-2 text-center border-l border-white/5">
                          <span className={`font-bold ${tierCount >= 4 ? 'text-emerald-400' : tierCount >= 2 ? 'text-amber-400' : 'text-slate-500'}`}>{tierCount}/5</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`font-bold ${enchantedSlots.length === ENCHANTABLE_SLOTS.length ? 'text-emerald-400' : 'text-red-400'}`}>{enchantedSlots.length}/{ENCHANTABLE_SLOTS.length}</span>
                        </td>
                        <td className="py-2 px-2 text-center border-r border-white/5">
                          <span className={`font-bold ${gemSlots > 0 ? 'text-cyan-400' : 'text-slate-700'}`}>{gemSlots}</span>
                        </td>
                      </>
                    )}

                    {isGroupEnabled('statDist') && (
                      <>
                        <td className="py-2 px-2 text-center border-l border-white/5"><span className="text-red-400">{stats.crit.toFixed(1)}</span></td>
                        <td className="py-2 px-2 text-center"><span className="text-amber-400">{stats.haste.toFixed(1)}</span></td>
                        <td className="py-2 px-2 text-center"><span className="text-blue-400">{stats.mastery.toFixed(1)}</span></td>
                        <td className="py-2 px-2 text-center border-r border-white/5"><span className="text-emerald-400">{stats.versatility.toFixed(1)}</span></td>
                      </>
                    )}

                    {isGroupEnabled('enchants') && (
                      <>
                        {ENCHANTABLE_SLOTS.map((slot, i) => (
                          <td key={slot} className={`py-2 px-1 text-center ${i === 0 ? 'border-l border-white/5' : ''} ${i === ENCHANTABLE_SLOTS.length - 1 ? 'border-r border-white/5' : ''}`}>
                            <StatusCell good={!!gearBySlot[slot]?.enchant} />
                          </td>
                        ))}
                      </>
                    )}

                    {isGroupEnabled('slotAudit') && SLOT_ORDER.map((slot, i) => {
                      const item = gearBySlot[slot];
                      return (
                        <td key={slot} className={`py-2 px-1 text-center ${i === 0 ? 'border-l border-white/5' : ''} ${i === SLOT_ORDER.length - 1 ? 'border-r border-white/5' : ''}`}>
                          {item ? (
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-white">{item.itemLevel}</span>
                              <span className={`text-[8px] ${getTrackColor(item.upgradeTrack)}`}>{getTrackShort(item.upgradeTrack)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-700">-</span>
                          )}
                        </td>
                      );
                    })}

                    {isGroupEnabled('specificGear') && (
                      <>
                        <td className="py-2 px-2 text-center border-l border-white/5"><span className="text-slate-700">-</span></td>
                        <td className="py-2 px-2 text-center"><span className="text-slate-700">-</span></td>
                        <td className="py-2 px-2 text-center border-r border-white/5"><span className="text-slate-700">-</span></td>
                      </>
                    )}

                    {isGroupEnabled('currencies') && (
                      <>
                        <td className="py-2 px-2 text-center border-l border-white/5"><span className={crests?.gilded ? 'text-amber-400' : 'text-slate-700'}>{crests?.gilded || '-'}</span></td>
                        <td className="py-2 px-2 text-center"><span className={crests?.runed ? 'text-blue-400' : 'text-slate-700'}>{crests?.runed || '-'}</span></td>
                        <td className="py-2 px-2 text-center"><span className={crests?.carved ? 'text-emerald-400' : 'text-slate-700'}>{crests?.carved || '-'}</span></td>
                        <td className="py-2 px-2 text-center border-r border-white/5"><span className={char.valorstones ? 'text-cyan-400' : 'text-slate-700'}>{char.valorstones || '-'}</span></td>
                      </>
                    )}

                    {isGroupEnabled('worldProgress') && (
                      <>
                        <td className="py-2 px-2 text-center border-l border-white/5"><span className="text-slate-700">-</span></td>
                        <td className="py-2 px-2 text-center"><span className="text-slate-700">-</span></td>
                        <td className="py-2 px-2 text-center border-r border-white/5"><span className="text-slate-700">-</span></td>
                      </>
                    )}

                    {isGroupEnabled('pvpAudit') && (
                      <>
                        <td className="py-2 px-2 text-center border-l border-white/5"><span className={pvp?.honorLevel ? 'text-amber-400' : 'text-slate-700'}>{pvp?.honorLevel || '-'}</span></td>
                        <td className="py-2 px-2 text-center"><span className={pvp?.honorableKills ? 'text-red-400' : 'text-slate-700'}>{pvp?.honorableKills || '-'}</span></td>
                        <td className="py-2 px-2 text-center"><span className={pvp?.currentRating?.twos ? 'text-cyan-400' : 'text-slate-700'}>{pvp?.currentRating?.twos || '-'}</span></td>
                        <td className="py-2 px-2 text-center border-r border-white/5"><span className={pvp?.currentRating?.threes ? 'text-emerald-400' : 'text-slate-700'}>{pvp?.currentRating?.threes || '-'}</span></td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
