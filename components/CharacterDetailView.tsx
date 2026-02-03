
import React, { useState, useMemo } from 'react';
import { Player, Character, CLASS_COLORS, PlayerRole, GearItem } from '../types';
import { Shield, Heart, Sword, Target, ExternalLink, ChevronLeft, ChevronRight, Star, Gem, Sparkles, Trophy, Skull, Search } from 'lucide-react';

interface CharacterDetailViewProps {
  roster: Player[];
  minIlvl: number;
}

const SLOT_DISPLAY_NAMES: Record<string, string> = {
  head: 'Head',
  neck: 'Neck',
  shoulder: 'Shoulder',
  back: 'Back',
  chest: 'Chest',
  wrist: 'Wrist',
  hands: 'Hands',
  waist: 'Waist',
  legs: 'Legs',
  feet: 'Feet',
  finger1: 'Ring 1',
  finger2: 'Ring 2',
  trinket1: 'Trinket 1',
  trinket2: 'Trinket 2',
  mainhand: 'Main Hand',
  offhand: 'Off Hand'
};

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

const GearSlotCard = ({ item }: { item: GearItem }) => {
  const qualityColor = QUALITY_COLORS[item.quality] || QUALITY_COLORS.common;

  return (
    <div className="bg-black/40 border border-white/5 rounded-lg p-3 hover:border-white/10 transition-all group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{SLOT_DISPLAY_NAMES[item.slot]}</span>
        {item.tier && <Star size={10} className="text-amber-500" />}
      </div>
      <p className="text-[11px] font-bold truncate" style={{ color: qualityColor }}>{item.name}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs font-black text-white">{item.itemLevel}</span>
        <div className="flex items-center gap-1">
          {item.enchant && <Sparkles size={10} className="text-emerald-400" />}
          {item.gems && item.gems.length > 0 && <Gem size={10} className="text-cyan-400" />}
        </div>
      </div>
    </div>
  );
};

export const CharacterDetailView: React.FC<CharacterDetailViewProps> = ({ roster, minIlvl }) => {
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);
  const [showMains, setShowMains] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlayers = useMemo(() => {
    return roster.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mainCharacter.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roster, searchTerm]);

  const currentPlayer = filteredPlayers[selectedPlayerIndex] || filteredPlayers[0];
  const currentChar: Character | null = currentPlayer
    ? (showMains ? currentPlayer.mainCharacter : currentPlayer.splits[0])
    : null;

  const allCharsForPlayer = currentPlayer
    ? [currentPlayer.mainCharacter, ...currentPlayer.splits]
    : [];

  const [selectedCharIndex, setSelectedCharIndex] = useState(0);
  const displayChar = allCharsForPlayer[selectedCharIndex] || currentChar;

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
  const enchantedCount = displayChar.gear?.filter(g => g.enchant).length || 0;
  const currentRaid = displayChar.raidProgress?.[0];

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
          <button
            onClick={handlePrevPlayer}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all"
          >
            <ChevronLeft size={16} className="text-white" />
          </button>
          <span className="text-xs font-bold text-slate-400 min-w-[80px] text-center">
            {selectedPlayerIndex + 1} / {filteredPlayers.length}
          </span>
          <button
            onClick={handleNextPlayer}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all"
          >
            <ChevronRight size={16} className="text-white" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              {displayChar.thumbnailUrl ? (
                <img src={displayChar.thumbnailUrl} className="w-20 h-20 rounded-xl border border-white/10 shadow-xl" alt="" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/5" />
              )}
              <div>
                <h3 className="text-xl font-black" style={{ color: CLASS_COLORS[displayChar.className] }}>
                  {displayChar.name}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {displayChar.spec} {displayChar.className}
                </p>
                <p className="text-[10px] text-slate-600">{displayChar.race} - {displayChar.server}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <RoleIcon role={currentPlayer.role} />
              <span className="text-xs font-bold text-slate-400">{currentPlayer.name}</span>
            </div>

            <div className="flex flex-wrap gap-1 mb-4">
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
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-xs font-bold"
              >
                <ExternalLink size={12} />
                View on Raider.io
              </a>
            )}
          </div>

          <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Overview</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Item Level</span>
                <span className={`text-lg font-black ${displayChar.itemLevel >= minIlvl ? 'text-emerald-400' : 'text-red-400'}`}>
                  {displayChar.itemLevel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">M+ Rating</span>
                <span className="text-lg font-black text-amber-500">{displayChar.mPlusRating || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Weekly 10+</span>
                <span className="text-lg font-black text-white">{displayChar.weeklyTenPlusCount || 0}/8</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Tier Pieces</span>
                <span className="text-lg font-black text-amber-500">{tierCount}/5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Enchants</span>
                <span className="text-lg font-black text-emerald-400">{enchantedCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Equipment</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {displayChar.gear?.map((item) => (
                <GearSlotCard key={item.slot} item={item} />
              ))}
            </div>
            {(!displayChar.gear || displayChar.gear.length === 0) && (
              <p className="text-slate-600 text-xs text-center py-8">No gear data available</p>
            )}
          </div>

          <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Trophy size={12} className="text-amber-500" />
              Raid Progress
            </h4>
            {displayChar.raidProgress && displayChar.raidProgress.length > 0 ? (
              <div className="space-y-3">
                {displayChar.raidProgress.slice(0, 3).map((raid) => (
                  <div key={raid.shortName} className="bg-black/40 border border-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">{raid.name}</span>
                      <span className="text-[10px] text-slate-500">{raid.totalBosses} bosses</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <span className="block text-[9px] text-slate-500 uppercase">Normal</span>
                        <span className="text-sm font-black text-emerald-400">{raid.normalKills}/{raid.totalBosses}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[9px] text-slate-500 uppercase">Heroic</span>
                        <span className="text-sm font-black text-blue-400">{raid.heroicKills}/{raid.totalBosses}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[9px] text-slate-500 uppercase">Mythic</span>
                        <span className="text-sm font-black text-amber-500">{raid.mythicKills}/{raid.totalBosses}</span>
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

        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Skull size={12} className="text-red-400" />
              Best M+ Runs
            </h4>
            {displayChar.bestMythicPlusRuns && displayChar.bestMythicPlusRuns.length > 0 ? (
              <div className="space-y-2">
                {displayChar.bestMythicPlusRuns.slice(0, 8).map((run, idx) => (
                  <div key={`${run.shortName}-${idx}`} className="bg-black/40 border border-white/5 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-white">{run.dungeon}</p>
                      <p className="text-[9px] text-slate-600">{new Date(run.completedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
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

          <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Weekly History</h4>
            <div className="space-y-3">
              {displayChar.weeklyHistory?.map((count, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">
                    {i === 0 ? 'Current ID' : `${i} week${i > 1 ? 's' : ''} ago`}
                  </span>
                  <div className="flex items-center gap-2 flex-1 mx-4">
                    <div className="h-1.5 bg-white/5 rounded-full flex-1 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${i === 0 ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        style={{ width: `${Math.min((count / 8) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-xs font-black ${count > 0 ? 'text-white' : 'text-slate-700'}`}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider">Last Updated</p>
            <p className="text-xs font-bold text-slate-400 mt-1">{displayChar.lastSeen || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
