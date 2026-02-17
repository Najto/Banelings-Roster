
import React, { useState, useMemo } from 'react';
import { Player, Character, CLASS_COLORS, PlayerRole, SlotAudit } from '../types';
import { Shield, Heart, Sword, Target, ExternalLink, ChevronLeft, ChevronRight, Star, Gem, Sparkles, Trophy, Skull, Search, Check, X, Zap, Coins, Globe, Swords, Activity } from 'lucide-react';

interface CharacterDetailViewProps {
  roster: Player[];
  minIlvl: number;
  initialMemberName?: string | null;
}

const SLOT_DISPLAY_NAMES: Record<string, string> = {
  head: 'Helm',
  neck: 'Neck',
  shoulder: 'Shoulder',
  back: 'Back',
  chest: 'Chest',
  wrist: 'Bracers',
  hands: 'Gloves',
  waist: 'Belt',
  legs: 'Legs',
  feet: 'Boots',
  finger1: 'Ring 1',
  finger2: 'Ring 2',
  trinket1: 'Trinket 1',
  trinket2: 'Trinket 2',
  mainhand: 'Main Hand',
  offhand: 'Off Hand'
};

const ENCHANTABLE_SLOTS = ['back', 'chest', 'wrist', 'legs', 'feet', 'finger1', 'finger2', 'mainhand'];
const TIER_SLOTS = ['head', 'shoulder', 'chest', 'hands', 'legs'];

const QUALITY_COLORS: Record<string, string> = {
  epic: '#a335ee',
  rare: '#0070dd',
  uncommon: '#1eff00'
};

const RoleIcon = ({ role }: { role: PlayerRole }) => {
  switch (role) {
    case PlayerRole.TANK: return <Shield size={14} className="text-blue-400" />;
    case PlayerRole.HEALER: return <Heart size={14} className="text-emerald-400" />;
    case PlayerRole.MELEE: return <Sword size={14} className="text-red-400" />;
    case PlayerRole.RANGE: return <Target size={14} className="text-cyan-400" />;
    default: return null;
  }
};

const StatBar = ({ label, value, color, max = 100 }: { label: string; value: number; color: string; max?: number }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
      <span className="text-[10px] font-black text-white">{value.toFixed(1)}%</span>
    </div>
    <div className="h-1.5 bg-black rounded-full overflow-hidden">
      <div className="h-full transition-all duration-500" style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }} />
    </div>
  </div>
);

const DataCell = ({ label, value, highlight, small }: { label: string; value: string | number; highlight?: 'good' | 'bad' | 'warn' | 'neutral'; small?: boolean }) => {
  const colors = {
    good: 'text-emerald-400',
    bad: 'text-red-400',
    warn: 'text-amber-400',
    neutral: 'text-white'
  };
  return (
    <div className={`text-center ${small ? 'px-2 py-1' : 'px-3 py-2'}`}>
      <p className="text-[8px] text-slate-600 uppercase font-bold tracking-wider">{label}</p>
      <p className={`${small ? 'text-xs' : 'text-sm'} font-black ${highlight ? colors[highlight] : 'text-white'}`}>{value}</p>
    </div>
  );
};

const GearRow: React.FC<{ slot: string; item: SlotAudit; isEnchantable: boolean }> = ({ slot, item, isEnchantable }) => {
  const qualityColor = QUALITY_COLORS.epic;
  const isTierSlot = TIER_SLOTS.includes(slot.toLowerCase());
  
  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="py-2.5 px-4">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{SLOT_DISPLAY_NAMES[slot.toLowerCase()] || slot}</span>
      </td>
      <td className="py-2.5 px-4">
        <span className="text-[11px] font-bold truncate max-w-[240px] block" style={{ color: qualityColor }}>{item.name}</span>
      </td>
      <td className="py-2.5 px-4 text-center">
        <span className="text-sm font-black text-white">{item.ilvl}</span>
      </td>
      <td className="py-2.5 px-4 text-center">
        {isTierSlot ? (
          item.isTier ? (
            <Star 
              size={12} 
              className="text-amber-500 mx-auto fill-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
            />
          ) : (
            <Star 
              size={12} 
              className="text-white/50 mx-auto opacity-60"
            />
          )
        ) : null}
      </td>
      <td className="py-2.5 px-4 text-center">
        {isEnchantable ? (
          item.hasEnchant ? <Check size={12} className="text-emerald-400 mx-auto" /> : <X size={12} className="text-red-400 mx-auto" />
        ) : null}
      </td>
      <td className="py-2.5 px-4 text-center">
        {item.hasGem ? (
            <Gem size={12} className="text-indigo-400 mx-auto shadow-[0_0_8px_rgba(129,140,248,0.4)]" />
        ) : (
            <div className="w-1.5 h-1.5 rounded-full border border-white/10 mx-auto opacity-20" />
        )}
      </td>
    </tr>
  );
};

export const CharacterDetailView: React.FC<CharacterDetailViewProps> = ({ roster, minIlvl, initialMemberName }) => {
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCharIndex, setSelectedCharIndex] = useState(0);

  const filteredPlayers = useMemo(() => {
    return roster.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mainCharacter.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roster, searchTerm]);

  React.useEffect(() => {
    if (initialMemberName) {
      const index = filteredPlayers.findIndex(p => p.name === initialMemberName);
      if (index !== -1) {
        setSelectedPlayerIndex(index);
      }
    }
  }, [initialMemberName, filteredPlayers]);

  const currentPlayer = filteredPlayers[selectedPlayerIndex] || filteredPlayers[0];
  const allCharsForPlayer = currentPlayer ? [currentPlayer.mainCharacter, ...currentPlayer.splits] : [];
  const displayChar = allCharsForPlayer[selectedCharIndex] || currentPlayer?.mainCharacter;

  const handlePrevPlayer = () => {
    setSelectedPlayerIndex(prev => (prev > 0 ? prev - 1 : filteredPlayers.length - 1));
    setSelectedCharIndex(0);
  };

  const handleNextPlayer = () => {
    setSelectedPlayerIndex(prev => (prev < filteredPlayers.length - 1 ? prev + 1 : 0));
    setSelectedCharIndex(0);
  };

  if (!displayChar || !currentPlayer) return null;

  const gearAudit = displayChar.gearAudit;
  const tierCount = gearAudit?.tierCount || 0;
  const enchantsDone = gearAudit?.enchantments || 0;
  const enchantsTotal = 8; 

  const gearSlots = useMemo(() => {
    if (!gearAudit?.slots) return [];
    const order = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'mainhand', 'offhand'];
    return order.filter(s => gearAudit.slots[s] || gearAudit.slots[s.toUpperCase()]).map(slot => {
        const item = gearAudit.slots[slot] || gearAudit.slots[slot.toUpperCase()];
        return {
            slot: slot.toLowerCase(),
            ...item
        };
    });
  }, [gearAudit]);

  const stats = gearAudit?.stats || { critPct: 0, hastePct: 0, masteryPct: 0, versPct: 0 };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center gap-4 bg-[#0c0c0e]/50 p-2 rounded-2xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={14} />
          <input
            type="text"
            placeholder="Search players for details..."
            className="w-full bg-black border border-white/5 rounded-xl py-3 pl-11 pr-4 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-slate-800 font-bold"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedPlayerIndex(0);
            }}
          />
        </div>

        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
          <button onClick={handlePrevPlayer} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ChevronLeft size={16} className="text-slate-400" />
          </button>
          <span className="text-[10px] font-black text-slate-500 min-w-[60px] text-center uppercase tracking-widest">
            {selectedPlayerIndex + 1} / {filteredPlayers.length}
          </span>
          <button onClick={handleNextPlayer} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>
      </div>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col lg:flex-row items-start gap-8">
          <div className="relative group">
            {displayChar.thumbnailUrl ? (
              <img src={displayChar.thumbnailUrl} className="w-28 h-28 rounded-2xl border border-white/10 shadow-2xl group-hover:scale-105 transition-transform" />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                <Skull size={32} className="text-slate-800" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-2 rounded-lg border border-white/20 shadow-xl">
              <RoleIcon role={currentPlayer.role} />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{displayChar.server || 'Blackhand'}</span>
                <div className="h-1 w-1 rounded-full bg-slate-800" />
                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">{currentPlayer.name}</span>
            </div>
            <h3 className="text-4xl font-black italic tracking-tighter uppercase mb-1" style={{ color: CLASS_COLORS[displayChar.className] }}>
              {displayChar.name}
            </h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">
              {displayChar.race} {displayChar.spec} {displayChar.className}
            </p>

            <div className="flex flex-wrap gap-2">
              {allCharsForPlayer.map((char, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCharIndex(idx)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedCharIndex === idx
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-white/5 text-slate-500 hover:text-white border border-white/5'
                  }`}
                >
                  {char.name}
                </button>
              ))}
              <a href={displayChar.profileUrl} target="_blank" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-[10px] font-black uppercase tracking-widest ml-4 mt-2">
                Raider.io <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-white/5 border-b border-white/5 bg-black/20">
          <DataCell label="Item Level" value={displayChar.itemLevel} highlight={displayChar.itemLevel >= minIlvl ? 'good' : 'bad'} />
          <DataCell label="M+ Rating" value={displayChar.mPlusRating || 0} highlight="good" />
          <DataCell label="Weekly 10+" value={`${displayChar.weeklyTenPlusCount || 0}/8`} />
          <DataCell label="Tier Pieces" value={`${tierCount}/5`} highlight={tierCount >= 4 ? 'good' : 'neutral'} />
          <DataCell label="Enchants" value={`${enchantsDone}/${enchantsTotal}`} highlight={enchantsDone === enchantsTotal ? 'good' : 'bad'} />
          <DataCell label="Gems" value={gearAudit?.sockets || 0} highlight="good" />
          <DataCell label="Ach Points" value={displayChar.collections?.achievements || 0} highlight="neutral" />
          <DataCell label="Last Seen" value={displayChar.lastSeen?.split(' ')[0] || '-'} />
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-black/30 rounded-3xl border border-white/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Equipment Audit</h4>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5"><Star size={10} className="text-amber-500" /><span className="text-[9px] font-black text-slate-600 uppercase">Tier</span></div>
                    <div className="flex items-center gap-1.5"><Check size={10} className="text-emerald-500" /><span className="text-[9px] font-black text-slate-600 uppercase">Enchant</span></div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-black/40">
                      <th className="py-3 px-4 text-[8px] font-black text-slate-700 uppercase tracking-widest">Slot</th>
                      <th className="py-3 px-4 text-[8px] font-black text-slate-700 uppercase tracking-widest">Item</th>
                      <th className="py-3 px-4 text-center text-[8px] font-black text-slate-700 uppercase tracking-widest">iLvl</th>
                      <th className="py-3 px-4 text-center text-[8px] font-black text-slate-700 uppercase tracking-widest">Tier</th>
                      <th className="py-3 px-4 text-center text-[8px] font-black text-slate-700 uppercase tracking-widest">Ench</th>
                      <th className="py-3 px-4 text-center text-[8px] font-black text-slate-700 uppercase tracking-widest">Gem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gearSlots.map((item) => (
                      <GearRow key={item.slot} slot={item.slot} item={item} isEnchantable={ENCHANTABLE_SLOTS.includes(item.slot.toLowerCase())} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/30 rounded-3xl border border-white/5 p-6">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Secondary Statistics</h4>
                  <div className="space-y-4">
                    <StatBar label="Critical Strike" value={stats.critPct} color="#ef4444" />
                    <StatBar label="Haste" value={stats.hastePct} color="#f59e0b" />
                    <StatBar label="Mastery" value={stats.masteryPct} color="#3b82f6" />
                    <StatBar label="Versatility" value={stats.versPct} color="#22c55e" />
                  </div>
                </div>

                <div className="bg-black/30 rounded-3xl border border-white/5 p-6">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Trophy size={14} className="text-amber-500" /> Raid Progress
                  </h4>
                  {displayChar.raidProgression ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                        <span className="text-xs font-black text-white uppercase italic">Heroic Kills</span>
                        <span className="text-lg font-black text-indigo-400">{displayChar.raidProgression.heroic_kills}/8</span>
                      </div>
                      <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                        <span className="text-xs font-black text-white uppercase italic">Mythic Kills</span>
                        <span className="text-lg font-black text-amber-500">{displayChar.raidProgression.mythic_kills}/8</span>
                      </div>
                      <div className="flex justify-center mt-2">
                         <div className={`px-4 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest ${displayChar.raidProgression.aotc ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-white/5 border-white/5 text-slate-700'}`}>Ahead of the Curve</div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center text-slate-600 italic text-[10px]">No progression data</div>
                  )}
                </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-black/30 rounded-3xl border border-white/5 p-6">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Skull size={14} className="text-red-500" /> Recent M+ Runs
              </h4>
              <div className="space-y-2">
                {displayChar.recentRuns && displayChar.recentRuns.length > 0 ? displayChar.recentRuns.slice(0, 8).map((run, i) => (
                  <div key={i} className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-colors">
                    <div>
                      <p className="text-[11px] font-black text-white truncate max-w-[150px]">{run.dungeon}</p>
                      <p className="text-[10px] text-slate-600 font-bold uppercase">{new Date(run.completed_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-black italic ${run.mythic_level >= 10 ? 'text-amber-500' : 'text-slate-500'}`}>+{run.mythic_level}</span>
                      <div className="flex gap-0.5">
                        {[...Array(Math.min(run.num_keystone_upgrades, 3))].map((_, star) => (
                          <Star key={star} size={8} className="text-amber-500 fill-amber-500" />
                        ))}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="h-32 flex items-center justify-center text-slate-600 italic text-[10px]">No mythic+ runs found</div>
                )}
              </div>
            </div>

            <div className="bg-black/30 rounded-3xl border border-white/5 p-6">
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Zap size={14} className="text-emerald-500" /> Weekly Activity
              </h4>
              <div className="space-y-4">
                {displayChar.weeklyHistory?.map((count, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex justify-between px-1">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{i === 0 ? 'This ID' : `${i} week${i > 1 ? 's' : ''} ago`}</span>
                      <span className="text-[10px] font-black text-white">{count}</span>
                    </div>
                    <div className="h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
                      <div className={`h-full transition-all duration-1000 ${i === 0 ? 'bg-emerald-500' : 'bg-slate-800'}`} style={{ width: `${Math.min((count / 8) * 100, 100)}%` }} />
                    </div>
                  </div>
                )) || <div className="text-[10px] text-slate-700 italic">No activity history</div>}
              </div>
            </div>

            <div className="bg-black/30 rounded-3xl border border-white/5 p-6">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Activity size={14} className="text-orange-500" /> WarcraftLogs
              </h4>
              {displayChar.warcraftLogs ? (
                <div className="space-y-3">
                  <div className="flex justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-500">Best Parse</span>
                    <span className={`text-xs font-black ${displayChar.warcraftLogs.bestParse >= 95 ? 'text-orange-500' : displayChar.warcraftLogs.bestParse >= 75 ? 'text-blue-400' : 'text-slate-400'}`}>
                      {displayChar.warcraftLogs.bestParse}%
                    </span>
                  </div>
                  <div className="flex justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-500">Median Perf</span>
                    <span className="text-xs font-black text-orange-400">{displayChar.warcraftLogs.medianPerformance}%</span>
                  </div>
                  <div className="flex justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-500">All-Star Points</span>
                    <span className="text-xs font-black text-orange-400">{displayChar.warcraftLogs.allStarPoints}</span>
                  </div>
                  <div className="flex justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-500">
                      Bosses / Kills{displayChar.warcraftLogs.highestDifficultyLabel ? ` (${displayChar.warcraftLogs.highestDifficultyLabel})` : ''}
                    </span>
                    <span className="text-xs font-black text-orange-400">{displayChar.warcraftLogs.bossesLogged} / {displayChar.warcraftLogs.totalKills}</span>
                  </div>
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center text-slate-600 italic text-[10px]">No WarcraftLogs data</div>
              )}
            </div>

            
          </div>
        </div>
      </div>
    </div>
  );
};
