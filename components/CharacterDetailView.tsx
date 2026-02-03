
import React, { useState, useMemo } from 'react';
import { Player, Character, CLASS_COLORS, PlayerRole, GearItem } from '../types';
import { Shield, Heart, Sword, Target, ExternalLink, ChevronLeft, ChevronRight, Star, Gem, Sparkles, Trophy, Skull, Search, Check, X, Zap } from 'lucide-react';

interface CharacterDetailViewProps {
  roster: Player[];
  minIlvl: number;
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

const QUALITY_COLORS: Record<string, string> = {
  poor: '#9d9d9d',
  common: '#ffffff',
  uncommon: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
  artifact: '#e6cc80',
  heirloom: '#00ccff'
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

const GearRow = ({ item, isEnchantable }: { item: GearItem; isEnchantable: boolean }) => {
  const qualityColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS.common;
  const hasEnchant = !!item.enchant;
  const hasGems = item.gems && item.gems.length > 0;
  const needsEnchant = isEnchantable && !hasEnchant;

  return (
    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
      <td className="py-2 px-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase">{SLOT_DISPLAY_NAMES[item.slot]}</span>
      </td>
      <td className="py-2 px-3">
        <span className="text-[11px] font-bold truncate max-w-[200px] block" style={{ color: qualityColor }}>{item.name}</span>
      </td>
      <td className="py-2 px-3 text-center">
        <span className="text-sm font-black text-white">{item.itemLevel}</span>
      </td>
      <td className="py-2 px-3 text-center">
        {item.tier && <Star size={12} className="text-amber-500 mx-auto" />}
      </td>
      <td className="py-2 px-3 text-center">
        {isEnchantable && (
          hasEnchant ? <Check size={12} className="text-emerald-400 mx-auto" /> : <X size={12} className="text-red-400 mx-auto" />
        )}
      </td>
      <td className="py-2 px-3 text-center">
        {hasGems ? <Gem size={12} className="text-cyan-400 mx-auto" /> : (item.slot.includes('finger') || item.slot === 'neck') && <X size={12} className="text-slate-700 mx-auto" />}
      </td>
    </tr>
  );
};

export const CharacterDetailView: React.FC<CharacterDetailViewProps> = ({ roster, minIlvl }) => {
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCharIndex, setSelectedCharIndex] = useState(0);

  const filteredPlayers = useMemo(() => {
    return roster.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mainCharacter.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roster, searchTerm]);

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

  if (!displayChar || !currentPlayer) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        No character data available
      </div>
    );
  }

  const tierCount = displayChar.gear?.filter(g => g.tier).length || 0;
  const enchantedCount = displayChar.gear?.filter(g => ENCHANTABLE_SLOTS.includes(g.slot) && g.enchant).length || 0;
  const enchantableTotal = displayChar.gear?.filter(g => ENCHANTABLE_SLOTS.includes(g.slot)).length || 0;
  const gemsCount = displayChar.gear?.reduce((acc, g) => acc + (g.gems?.length || 0), 0) || 0;

  const gearBySlot = displayChar.gear?.reduce((acc, item) => {
    acc[item.slot] = item;
    return acc;
  }, {} as Record<string, GearItem>) || {};

  const estimatedStats = displayChar.stats || {
    crit: Math.random() * 30 + 10,
    haste: Math.random() * 30 + 10,
    mastery: Math.random() * 30 + 10,
    versatility: Math.random() * 20 + 5
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center gap-4 bg-[#0c0c0e]/50 p-3 rounded-2xl border border-white/5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={14} />
          <input
            type="text"
            placeholder="Search players..."
            className="w-full bg-black border border-white/5 rounded-xl py-3 pl-11 pr-4 text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-slate-700 font-bold"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedPlayerIndex(0);
              setSelectedCharIndex(0);
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePrevPlayer} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all">
            <ChevronLeft size={16} className="text-white" />
          </button>
          <span className="text-xs font-bold text-slate-400 min-w-[80px] text-center">
            {selectedPlayerIndex + 1} / {filteredPlayers.length}
          </span>
          <button onClick={handleNextPlayer} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all">
            <ChevronRight size={16} className="text-white" />
          </button>
        </div>
      </div>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row items-start gap-6 mb-6">
          <div className="flex items-center gap-4">
            {displayChar.thumbnailUrl ? (
              <img src={displayChar.thumbnailUrl} className="w-24 h-24 rounded-xl border border-white/10 shadow-xl" alt="" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-white/5 border border-white/5" />
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <RoleIcon role={currentPlayer.role} />
                <span className="text-[10px] text-slate-500 font-bold uppercase">{currentPlayer.name}</span>
              </div>
              <h3 className="text-2xl font-black" style={{ color: CLASS_COLORS[displayChar.className] }}>
                {displayChar.name}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {displayChar.race} {displayChar.spec} {displayChar.className}
              </p>
              <p className="text-[10px] text-slate-600">{displayChar.server}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 lg:ml-auto">
            {allCharsForPlayer.map((char, idx) => (
              <button
                key={`${char.name}-${idx}`}
                onClick={() => setSelectedCharIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  selectedCharIndex === idx
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/5 hover:text-white'
                }`}
              >
                {char.name}
              </button>
            ))}
          </div>

          {displayChar.profileUrl && (
            <a
              href={displayChar.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-bold whitespace-nowrap"
            >
              <ExternalLink size={12} />
              Raider.io
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-6 bg-black/40 rounded-xl p-4 border border-white/5">
          <DataCell label="Item Level" value={displayChar.itemLevel} highlight={displayChar.itemLevel >= minIlvl ? 'good' : 'bad'} />
          <DataCell label="M+ Rating" value={displayChar.mPlusRating || 0} highlight={displayChar.mPlusRating && displayChar.mPlusRating >= 2500 ? 'good' : 'neutral'} />
          <DataCell label="Weekly 10+" value={`${displayChar.weeklyTenPlusCount || 0}/8`} highlight={displayChar.weeklyTenPlusCount && displayChar.weeklyTenPlusCount >= 8 ? 'good' : 'neutral'} />
          <DataCell label="Tier Pieces" value={`${tierCount}/5`} highlight={tierCount >= 4 ? 'good' : tierCount >= 2 ? 'warn' : 'neutral'} />
          <DataCell label="Enchants" value={`${enchantedCount}/${enchantableTotal}`} highlight={enchantedCount === enchantableTotal ? 'good' : 'bad'} />
          <DataCell label="Gems" value={gemsCount} highlight={gemsCount > 0 ? 'good' : 'neutral'} />
          <DataCell label="Ach Points" value={displayChar.achievementPoints || '-'} />
          <DataCell label="Last Seen" value={displayChar.lastSeen?.split(' - ')[0] || '-'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Equipment</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/40">
                      <th className="py-2 px-3 text-left text-[8px] font-black text-slate-600 uppercase">Slot</th>
                      <th className="py-2 px-3 text-left text-[8px] font-black text-slate-600 uppercase">Item</th>
                      <th className="py-2 px-3 text-center text-[8px] font-black text-slate-600 uppercase">iLvl</th>
                      <th className="py-2 px-3 text-center text-[8px] font-black text-slate-600 uppercase">Tier</th>
                      <th className="py-2 px-3 text-center text-[8px] font-black text-slate-600 uppercase">Ench</th>
                      <th className="py-2 px-3 text-center text-[8px] font-black text-slate-600 uppercase">Gem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayChar.gear?.map((item) => (
                      <GearRow key={item.slot} item={item} isEnchantable={ENCHANTABLE_SLOTS.includes(item.slot)} />
                    ))}
                  </tbody>
                </table>
                {(!displayChar.gear || displayChar.gear.length === 0) && (
                  <p className="text-slate-600 text-xs text-center py-8">No gear data available</p>
                )}
              </div>
            </div>

            <div className="bg-black/30 rounded-xl border border-white/5 p-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Stat Distribution (%)</h4>
              <div className="grid grid-cols-2 gap-4">
                <StatBar label="Critical Strike" value={estimatedStats.crit} color="#ef4444" />
                <StatBar label="Haste" value={estimatedStats.haste} color="#f59e0b" />
                <StatBar label="Mastery" value={estimatedStats.mastery} color="#3b82f6" />
                <StatBar label="Versatility" value={estimatedStats.versatility} color="#22c55e" />
              </div>
            </div>

            <div className="bg-black/30 rounded-xl border border-white/5 p-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Trophy size={12} className="text-amber-500" />
                Raid Progress
              </h4>
              {displayChar.raidProgress && displayChar.raidProgress.length > 0 ? (
                <div className="space-y-3">
                  {displayChar.raidProgress.slice(0, 3).map((raid) => (
                    <div key={raid.shortName} className="bg-black/40 border border-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-white">{raid.name}</span>
                        <span className="text-[10px] text-slate-500">{raid.totalBosses} bosses</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center bg-emerald-500/10 rounded-lg py-2 border border-emerald-500/20">
                          <span className="block text-[8px] text-emerald-400 uppercase font-bold">Normal</span>
                          <span className="text-lg font-black text-emerald-400">{raid.normalKills}/{raid.totalBosses}</span>
                        </div>
                        <div className="text-center bg-blue-500/10 rounded-lg py-2 border border-blue-500/20">
                          <span className="block text-[8px] text-blue-400 uppercase font-bold">Heroic</span>
                          <span className="text-lg font-black text-blue-400">{raid.heroicKills}/{raid.totalBosses}</span>
                        </div>
                        <div className="text-center bg-amber-500/10 rounded-lg py-2 border border-amber-500/20">
                          <span className="block text-[8px] text-amber-400 uppercase font-bold">Mythic</span>
                          <span className="text-lg font-black text-amber-500">{raid.mythicKills}/{raid.totalBosses}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-xs text-center py-4">No raid data available</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-black/30 rounded-xl border border-white/5 p-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Skull size={12} className="text-red-400" />
                Best M+ Runs
              </h4>
              {displayChar.bestMythicPlusRuns && displayChar.bestMythicPlusRuns.length > 0 ? (
                <div className="space-y-2">
                  {displayChar.bestMythicPlusRuns.slice(0, 8).map((run, idx) => (
                    <div key={`${run.shortName}-${idx}`} className="bg-black/40 border border-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">{run.dungeon}</p>
                        <p className="text-[9px] text-slate-600">{new Date(run.completedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`text-sm font-black ${run.mythicLevel >= 10 ? 'text-amber-500' : 'text-slate-400'}`}>
                          +{run.mythicLevel}
                        </span>
                        <div className="flex">
                          {[...Array(Math.min(run.keystoneUpgrades, 3))].map((_, i) => (
                            <Star key={i} size={8} className="text-amber-500 fill-amber-500" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-xs text-center py-4">No M+ data available</p>
              )}
            </div>

            <div className="bg-black/30 rounded-xl border border-white/5 p-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap size={12} className="text-emerald-400" />
                Weekly Activity
              </h4>
              <div className="space-y-3">
                {displayChar.weeklyHistory?.map((count, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-bold text-slate-600 uppercase w-20">
                      {i === 0 ? 'This ID' : `${i} week${i > 1 ? 's' : ''} ago`}
                    </span>
                    <div className="flex-1 h-2 bg-black rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${i === 0 ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        style={{ width: `${Math.min((count / 8) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-black w-8 text-right ${count > 0 ? 'text-white' : 'text-slate-700'}`}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/30 rounded-xl border border-white/5 p-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Recent Runs</h4>
              {displayChar.recentRuns && displayChar.recentRuns.length > 0 ? (
                <div className="space-y-2">
                  {displayChar.recentRuns.slice(0, 5).map((run, idx) => (
                    <a
                      key={`recent-${idx}`}
                      href={run.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block bg-black/40 border border-white/5 rounded-lg p-3 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white">{run.short_name}</span>
                        <span className={`text-xs font-black ${run.mythic_level >= 10 ? 'text-amber-500' : 'text-slate-400'}`}>+{run.mythic_level}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-slate-600">{new Date(run.completed_at).toLocaleString()}</span>
                        <span className="text-[9px] text-emerald-400 font-bold">{run.score.toFixed(1)} pts</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-xs text-center py-4">No recent runs</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
