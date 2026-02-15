
import React, { useState, useMemo } from 'react';
import { Player, Character, CLASS_COLORS, PlayerRole, ROLE_PRIORITY } from '../types';
import { WEEKLY_M_PLUS_GOAL, WEEKLY_RAID_VAULT_GOAL } from '../constants';
import { Search, Crown, Info, ExternalLink, CalendarDays, Shield, Heart, Sword, Target, ChevronDown, ChevronUp, ArrowUpDown, Check, Circle } from 'lucide-react';

interface RosterTableProps {
  roster: Player[];
  minIlvl: number;
}

type SortKey = 'name' | 'playerName' | 'role' | 'itemLevel' | 'mPlusRating' | 'weeklyTenPlusCount';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const RoleIcon = ({ role }: { role: PlayerRole }) => {
  switch (role) {
    case PlayerRole.TANK: return <Shield size={12} className="text-blue-400" />;
    case PlayerRole.HEALER: return <Heart size={12} className="text-emerald-400" />;
    case PlayerRole.MELEE: return <Sword size={12} className="text-red-400" />;
    case PlayerRole.RANGE: return <Target size={12} className="text-purple-400" />;
    default: return null;
  }
};

export const RosterTable: React.FC<RosterTableProps> = ({ roster, minIlvl }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'mains' | 'alts'>('all');
  const [activeThisWeek, setActiveThisWeek] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'role', direction: 'asc' });

  const flatChars = useMemo(() => {
    return roster.flatMap(p => [
      { ...p.mainCharacter, isMain: true, playerName: p.name, role: p.role },
      ...p.splits.map(s => ({ ...s, isMain: false, playerName: p.name, role: p.role }))
    ]);
  }, [roster]);

  const filteredChars = useMemo(() => {
    return flatChars.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.playerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.className.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = 
        filter === 'all' ? true :
        filter === 'mains' ? c.isMain : !c.isMain;
      
      const matchesActive = activeThisWeek ? (c.weeklyTenPlusCount || 0) > 0 : true;

      return matchesSearch && matchesFilter && matchesActive;
    }).sort((a, b) => {
      const { key, direction } = sortConfig;
      let comparison = 0;

      if (key === 'role') {
        comparison = (ROLE_PRIORITY[a.role] || 99) - (ROLE_PRIORITY[b.role] || 99);
        if (comparison === 0) {
          comparison = a.className.localeCompare(b.className);
        }
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name);
        }
      } else if (key === 'name' || key === 'playerName') {
        comparison = (a[key] || "").localeCompare(b[key] || "");
      } else {
        comparison = (a[key] || 0) - (b[key] || 0);
      }

      if (comparison === 0 && key !== 'role' && key !== 'mPlusRating') {
        comparison = (b.mPlusRating || 0) - (a.mPlusRating || 0);
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  }, [flatChars, searchTerm, filter, activeThisWeek, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleExpand = (charName: string, server: string, playerName: string) => {
    const id = `${charName}-${server}-${playerName}`;
    setExpandedId(expandedId === id ? null : id);
  };

  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={12} className="opacity-20 group-hover:opacity-50 transition-opacity ml-1" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-indigo-400 ml-1" /> : <ChevronDown size={14} className="text-indigo-400 ml-1" />;
  };

  const getProgressBarColor = (count: number) => {
    if (count >= 8) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    if (count >= 4) return 'bg-indigo-500';
    if (count >= 1) return 'bg-amber-500';
    return 'bg-slate-700';
  };

  const getVaultStatus = (count: number) => {
    if (count >= 8) return { label: 'Complete', color: 'text-emerald-500' };
    if (count >= 4) return { label: '2nd Slot', color: 'text-indigo-400' };
    if (count >= 1) return { label: '1st Slot', color: 'text-amber-500' };
    return { label: 'No Runs', color: 'text-slate-600' };
  };

  const getRaidProgressBarColor = (count: number) => {
    if (count >= 6) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    if (count >= 4) return 'bg-sky-500';
    if (count >= 2) return 'bg-amber-500';
    if (count >= 1) return 'bg-amber-500/60';
    return 'bg-slate-700';
  };

  const getRaidVaultStatus = (count: number) => {
    if (count >= 6) return { label: 'Complete', color: 'text-emerald-500' };
    if (count >= 4) return { label: '2nd Slot', color: 'text-sky-400' };
    if (count >= 2) return { label: '1st Slot', color: 'text-amber-500' };
    return { label: 'No Kills', color: 'text-slate-600' };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-center gap-4 bg-[#0c0c0e]/50 p-2 rounded-2xl border border-white/5 shadow-inner">
        <div className="flex p-1 bg-black rounded-xl border border-white/5">
          {['all', 'mains', 'alts'].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <button 
          onClick={() => setActiveThisWeek(!activeThisWeek)}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeThisWeek ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-white/5 border-white/5 text-slate-500'}`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${activeThisWeek ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
          Active Current ID
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" size={14} />
          <input 
            type="text"
            placeholder="Suchen nach Member, Char oder Klasse..."
            className="w-full bg-black border border-white/5 rounded-xl py-3 pl-11 pr-4 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-800 font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5 text-[12px] uppercase tracking-widest text-slate-600 font-black bg-black/40">
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Character <SortIndicator column="name" /></div>
                </th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('playerName')}>
                  <div className="flex items-center">Member <SortIndicator column="playerName" /></div>
                </th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('role')}>
                  <div className="flex items-center">Role <SortIndicator column="role" /></div>
                </th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('itemLevel')}>
                  <div className="flex items-center">iLvl <SortIndicator column="itemLevel" /></div>
                </th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors group" onClick={() => handleSort('mPlusRating')}>
                  <div className="flex items-center">Score <SortIndicator column="mPlusRating" /></div>
                </th>
                <th className="px-6 py-5 cursor-pointer hover:text-white transition-colors group text-center" onClick={() => handleSort('weeklyTenPlusCount')}>
                  <div className="flex items-center justify-center">M+ Vault (10+) <SortIndicator column="weeklyTenPlusCount" /></div>
                </th>
                <th className="px-6 py-5 text-center">
                  <div className="flex items-center justify-center">Raid Vault</div>
                </th>
                <th className="px-6 py-5">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredChars.map((char, idx) => {
                const charServer = char.server || 'Blackhand';
                const charId = `${char.name}-${charServer}-${char.playerName}`;
                const isExpanded = expandedId === charId;
                const count = char.weeklyTenPlusCount || 0;
                const isGoalMet = count >= WEEKLY_M_PLUS_GOAL;
                const vaultStatus = getVaultStatus(count);
                const raidCount = char.weeklyRaidBossKills || 0;
                const isRaidGoalMet = raidCount >= WEEKLY_RAID_VAULT_GOAL;
                const raidVaultStatus = getRaidVaultStatus(raidCount);

                const normalKills = char.weeklyRaidKillDetails?.filter(k => k.difficulty === 'Normal').length ?? 0;
                const heroicKills = char.weeklyRaidKillDetails?.filter(k => k.difficulty === 'Heroic').length ?? 0;
                const mythicKills = char.weeklyRaidKillDetails?.filter(k => k.difficulty === 'Mythic').length ?? 0;
                const raidVaultSlots = raidCount >= 6 ? 3 : raidCount >= 4 ? 2 : raidCount >= 2 ? 1 : 0;
                const highestDifficulty = mythicKills > 0 ? 'M' : heroicKills > 0 ? 'H' : normalKills > 0 ? 'N' : '-';
                
                return (
                  <React.Fragment key={charId}>
                    <tr 
                      onClick={() => toggleExpand(char.name, charServer, char.playerName || '')}
                      className={`hover:bg-white/[0.03] transition-all group cursor-pointer ${isExpanded ? 'bg-white/[0.04]' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {char.thumbnailUrl ? (
                              <img src={char.thumbnailUrl} className="w-10 h-10 rounded-lg border border-white/10 shadow-lg" alt="" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                                <Info size={16} className="text-slate-700" />
                              </div>
                            )}
                            {char.isMain && <Crown size={12} className="absolute -top-1.5 -right-1.5 text-amber-500 drop-shadow-md" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-sm tracking-tight" style={{ color: CLASS_COLORS[char.className] }}>
                              {char.name}
                            </span>
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">{charServer}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-black text-[11px] uppercase">{char.playerName}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <RoleIcon role={char.role} />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{char.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black shadow-sm ${char.itemLevel >= minIlvl ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                          {char.itemLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-amber-500 font-mono text-sm font-black tracking-tighter">{char.mPlusRating || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <div className="flex flex-col items-center gap-1.5 w-full max-w-[140px]">
                            <div className="flex items-center justify-between w-full px-1">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-black ${isGoalMet ? 'text-emerald-500' : 'text-white'}`}>
                                        {count} / {WEEKLY_M_PLUS_GOAL}
                                    </span>
                                    {isGoalMet && <Check size={10} className="text-emerald-500" />}
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-tighter ${vaultStatus.color}`}>
                                    {vaultStatus.label}
                                </span>
                            </div>
                            
                            <div className="relative w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                              {/* Progress Fill */}
                              <div 
                                className={`h-full transition-all duration-700 ease-out ${getProgressBarColor(count)}`}
                                style={{ width: `${Math.min((count / WEEKLY_M_PLUS_GOAL) * 100, 100)}%` }}
                              />
                              
                              {/* Milestone Markers */}
                              <div className="absolute inset-0 flex">
                                <div className="h-full border-r border-white/10" style={{ width: `${(1/8)*100}%` }} title="1st Slot" />
                                <div className="h-full border-r border-white/10" style={{ width: `${(3/8)*100}%` }} title="2nd Slot" />
                              </div>
                            </div>

                            <div className="flex justify-between w-full px-0.5 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full border border-white/10 ${count >= 1 ? 'bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.4)]' : 'bg-slate-800'}`} title="1 Run" />
                                <div className="flex-1 border-b border-white/5 mb-[3px] mx-1" />
                                <div className={`w-1.5 h-1.5 rounded-full border border-white/10 ${count >= 4 ? 'bg-indigo-500 shadow-[0_0_4px_rgba(99,102,241,0.4)]' : 'bg-slate-800'}`} title="4 Runs" />
                                <div className="flex-1 border-b border-white/5 mb-[3px] mx-1" />
                                <div className={`w-1.5 h-1.5 rounded-full border border-white/10 ${count >= 8 ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]' : 'bg-slate-800'}`} title="8 Runs" />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <div className="flex flex-col items-center gap-1.5 w-full max-w-[140px]">
                            <div className="flex items-center justify-between w-full px-1">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-black ${isRaidGoalMet ? 'text-emerald-500' : 'text-white'}`}>
                                        {raidCount} / {WEEKLY_RAID_VAULT_GOAL}
                                    </span>
                                    {isRaidGoalMet && <Check size={10} className="text-emerald-500" />}
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-tighter ${raidVaultStatus.color}`} title={`${raidVaultSlots}/3 Vault Slots - Highest: ${highestDifficulty}`}>
                                    {raidVaultStatus.label}
                                </span>
                            </div>

                            <div className="flex items-center gap-1 text-[8px] font-black">
                              {normalKills > 0 && <span className="text-green-400">{normalKills}N</span>}
                              {heroicKills > 0 && <span className="text-blue-400">{heroicKills}H</span>}
                              {mythicKills > 0 && <span className="text-orange-400">{mythicKills}M</span>}
                              {raidCount === 0 && <span className="text-slate-600">0 kills</span>}
                            </div>

                            <div className="relative w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                              <div
                                className={`h-full transition-all duration-700 ease-out ${getRaidProgressBarColor(raidCount)}`}
                                style={{ width: `${Math.min((raidCount / WEEKLY_RAID_VAULT_GOAL) * 100, 100)}%` }}
                              />
                              <div className="absolute inset-0 flex">
                                <div className="h-full border-r border-white/10" style={{ width: `${(2/6)*100}%` }} title="1st Slot" />
                                <div className="h-full border-r border-white/10" style={{ width: `${(2/6)*100}%` }} title="2nd Slot" />
                              </div>
                            </div>

                            <div className="flex justify-between w-full px-0.5 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full border border-white/10 ${raidCount >= 2 ? 'bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.4)]' : 'bg-slate-800'}`} title="2 Bosses" />
                                <div className="flex-1 border-b border-white/5 mb-[3px] mx-1" />
                                <div className={`w-1.5 h-1.5 rounded-full border border-white/10 ${raidCount >= 4 ? 'bg-sky-500 shadow-[0_0_4px_rgba(14,165,233,0.4)]' : 'bg-slate-800'}`} title="4 Bosses" />
                                <div className="flex-1 border-b border-white/5 mb-[3px] mx-1" />
                                <div className={`w-1.5 h-1.5 rounded-full border border-white/10 ${raidCount >= 6 ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]' : 'bg-slate-800'}`} title="6 Bosses" />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[9px] text-slate-600 font-bold uppercase italic">{char.lastSeen || '-'}</span>
                          {isExpanded ? <ChevronUp size={14} className="text-indigo-400" /> : <ChevronDown size={14} className="text-slate-700" />}
                        </div>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-black/60 animate-in slide-in-from-top-2 duration-200">
                        <td colSpan={8} className="px-8 py-8 border-l-4 border-indigo-500">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                              <div className="flex gap-4 items-center mb-4">
                                <img src={char.thumbnailUrl} className="w-16 h-16 rounded-xl border border-white/10 shadow-xl" alt="" />
                                <div>
                                  <h4 className="text-xl font-black text-white" style={{ color: CLASS_COLORS[char.className] }}>{char.name}</h4>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{char.spec} {char.className} • {charServer}</p>
                                  <a href={char.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-black text-[9px] uppercase tracking-widest mt-1">
                                    Raider.io <ExternalLink size={10} />
                                  </a>
                                </div>
                              </div>
                              
                              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-4">
                                  <CalendarDays className="text-indigo-400" size={14} />
                                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Weekly History</h5>
                                </div>
                                <div className="space-y-3">
                                  {char.weeklyHistory?.map((count, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                      <span className="text-[9px] font-bold text-slate-600 uppercase">
                                        {i === 0 ? 'Aktuelle ID' : `Vor ${i} Wo.`}
                                      </span>
                                      <div className="flex items-center gap-2 flex-1 mx-4">
                                         <div className="h-1 bg-white/5 rounded-full flex-1 overflow-hidden">
                                            <div 
                                              className={`h-full transition-all duration-1000 ${i === 0 ? 'bg-indigo-500' : 'bg-slate-700'}`} 
                                              style={{ width: `${Math.min((count / 8) * 100, 100)}%` }}
                                            />
                                         </div>
                                      </div>
                                      <span className={`text-[10px] font-black ${count > 0 ? 'text-white' : 'text-slate-700'}`}>{count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="lg:col-span-1">
                              <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4">Character Stats</h5>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
                                  <span className="block text-[9px] text-slate-600 uppercase font-black mb-1">Equipped iLvl</span>
                                  <span className="text-xl font-black text-white">{char.itemLevel}</span>
                                </div>
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
                                  <span className="block text-[9px] text-slate-600 uppercase font-black mb-1">M+ Score</span>
                                  <span className="text-xl font-black text-amber-500">{char.mPlusRating}</span>
                                </div>
                              </div>
                              <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                 <p className="text-[10px] text-indigo-300 font-medium leading-relaxed italic">
                                   "Dieser Charakter hat {count} / {WEEKLY_M_PLUS_GOAL} Keys der Stufe 10+ abgeschlossen."
                                 </p>
                              </div>
                            </div>

                            <div className="lg:col-span-1">
                              <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4">Kürzliche Runs</h5>
                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                {char.recentRuns?.length ? char.recentRuns.slice(0, 5).map((run, i) => (
                                  <div key={i} className="bg-white/[0.02] border border-white/5 rounded-lg p-3 flex items-center justify-between group/run hover:border-white/10 transition-colors">
                                    <div>
                                      <p className="text-[10px] font-black text-white">{run.dungeon}</p>
                                      <p className="text-[8px] text-slate-600 font-bold uppercase">{new Date(run.completed_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-black ${run.mythic_level >= 10 ? 'text-amber-500' : 'text-slate-400'}`}>+{run.mythic_level}</span>
                                      <div className={`w-0.5 h-4 rounded-full ${run.num_keystone_upgrades > 0 ? 'bg-emerald-500' : 'bg-red-500/30'}`} />
                                    </div>
                                  </div>
                                )) : (
                                  <p className="text-slate-600 text-[10px] italic">Keine aktuellen Daten.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
