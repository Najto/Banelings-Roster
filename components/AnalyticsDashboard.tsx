
import React, { useMemo, useState } from 'react';
import { Player, Character, WoWClass, CLASS_COLORS, PlayerRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Trophy, Zap, Shield, TrendingUp, Users } from 'lucide-react';

interface AnalyticsDashboardProps {
  roster: Player[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ roster }) => {
  const [chartMode, setChartMode] = useState<'mains' | 'all'>('mains');
  const [activityMode, setActivityMode] = useState<'id' | 'all'>('id');

  const allChars = useMemo(() => {
    return roster.flatMap(p => [
      { ...p.mainCharacter, isMain: true, playerName: p.name },
      ...p.splits.map(s => ({ ...s, isMain: false, playerName: p.name }))
    ]);
  }, [roster]);

  // Gefilterte Charaktere basierend auf dem globalen Chart-Modus (Mains vs Alle)
  const leaderboardChars = useMemo(() => {
    return chartMode === 'mains' ? allChars.filter(c => c.isMain) : allChars;
  }, [allChars, chartMode]);

  // Daten für Klassenverteilung
  const classData = useMemo(() => {
    const counts: Record<string, { class: string, Mains: number, Alts: number, color: string }> = {};
    
    // Initialisierung aller Klassen
    Object.values(WoWClass).forEach(cls => {
      if (cls === WoWClass.UNKNOWN) return;
      counts[cls] = { class: cls, Mains: 0, Alts: 0, color: CLASS_COLORS[cls] };
    });

    allChars.forEach(char => {
      if (counts[char.className]) {
        if (char.isMain) counts[char.className].Mains++;
        else counts[char.className].Alts++;
      }
    });

    return Object.values(counts).sort((a, b) => (b.Mains + b.Alts) - (a.Mains + a.Alts));
  }, [allChars]);

  // Leaderboards basierend auf den gefilterten Charakteren (Slicing entfernt für vollständige Liste)
  const topScore = useMemo(() => [...leaderboardChars].sort((a, b) => (b.mPlusRating || 0) - (a.mPlusRating || 0)), [leaderboardChars]);
  const topIlvl = useMemo(() => [...leaderboardChars].sort((a, b) => b.itemLevel - a.itemLevel), [leaderboardChars]);
  
  const topActivity = useMemo(() => {
    return [...leaderboardChars].sort((a, b) => {
      if (activityMode === 'id') {
        return (b.weeklyTenPlusCount || 0) - (a.weeklyTenPlusCount || 0);
      } else {
        const sumA = (a.weeklyHistory || []).reduce((acc, curr) => acc + curr, 0);
        const sumB = (b.weeklyHistory || []).reduce((acc, curr) => acc + curr, 0);
        return sumB - sumA;
      }
    });
  }, [leaderboardChars, activityMode]);

  // Gilden-Aktivitäts-Trend (Summe über alle Chars)
  const activityTrend = useMemo(() => {
    const trend = [
      { name: 'Vor 3 Wo.', keys: 0 },
      { name: 'Vor 2 Wo.', keys: 0 },
      { name: 'Letzte Wo.', keys: 0 },
      { name: 'Diese ID', keys: 0 },
    ];

    allChars.forEach(char => {
      if (char.weeklyHistory) {
        char.weeklyHistory.forEach((count, i) => {
          if (i < 4) {
            trend[3 - i].keys += count;
          }
        });
      }
    });

    return trend;
  }, [allChars]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Distribution Chart */}
        <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Users className="text-indigo-400" size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Klassenverteilung</h3>
            </div>
            <div className="flex p-1 bg-black rounded-lg border border-white/5">
              <button 
                onClick={() => setChartMode('mains')}
                className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${chartMode === 'mains' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
              >Mains</button>
              <button 
                onClick={() => setChartMode('all')}
                className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${chartMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
              >Alle</button>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="class" 
                  type="category" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="Mains" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} barSize={12} />
                {chartMode === 'all' && <Bar dataKey="Alts" stackId="a" fill="#1e1b4b" radius={[0, 4, 4, 0]} barSize={12} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Trend Chart */}
        <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="text-emerald-400" size={20} />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Gilden Aktivität (Trend)</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="keys" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#000' }}
                  activeDot={{ r: 8, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaderboards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* M+ Score Leaders */}
        <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 bg-amber-500/5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-500" size={16} />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Score Ranking</h4>
            </div>
            <span className="text-[9px] font-black text-slate-600 uppercase">{chartMode === 'mains' ? 'Mains' : 'Global'} ({topScore.length})</span>
          </div>
          <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
            {topScore.map((char, i) => (
              <div key={`${char.name}-${char.playerName}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-700 w-4">{i+1}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black" style={{ color: CLASS_COLORS[char.className] }}>{char.name}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase">{char.playerName}</span>
                  </div>
                </div>
                <span className="text-sm font-mono font-black text-amber-500">{char.mPlusRating}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gear Leaders */}
        <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 bg-indigo-500/5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="text-indigo-400" size={16} />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Gear Ranking</h4>
            </div>
            <span className="text-[9px] font-black text-slate-600 uppercase">{chartMode === 'mains' ? 'Mains' : 'Global'} ({topIlvl.length})</span>
          </div>
          <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
            {topIlvl.map((char, i) => (
              <div key={`${char.name}-${char.playerName}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-700 w-4">{i+1}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black" style={{ color: CLASS_COLORS[char.className] }}>{char.name}</span>
                    <span className="text-[9px] text-slate-600 font-bold uppercase">{char.playerName}</span>
                  </div>
                </div>
                <span className="text-xs font-black text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">{char.itemLevel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Leaders */}
        <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 bg-emerald-500/5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="text-emerald-500" size={16} />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Activity Ranking</h4>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex p-1 bg-black rounded-lg border border-white/5">
                <button 
                  onClick={() => setActivityMode('id')}
                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${activityMode === 'id' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
                >ID</button>
                <button 
                  onClick={() => setActivityMode('all')}
                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${activityMode === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
                >ALL</button>
              </div>
            </div>
          </div>
          <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
            {topActivity.map((char, i) => {
              const value = activityMode === 'id' 
                ? (char.weeklyTenPlusCount || 0)
                : (char.weeklyHistory || []).reduce((acc, curr) => acc + curr, 0);

              return (
                <div key={`${char.name}-${char.playerName}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-700 w-4">{i+1}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-black" style={{ color: CLASS_COLORS[char.className] }}>{char.name}</span>
                      <span className="text-[9px] text-slate-600 font-bold uppercase">{char.playerName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${value > 0 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                    <span className="text-sm font-black text-white">{value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
