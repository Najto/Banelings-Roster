
import React, { useMemo } from 'react';
import { Player } from '../types';
import { Users, Crown, Activity, BarChart3 } from 'lucide-react';

interface StatOverviewProps {
  roster: Player[];
  minIlvl: number;
}

const StatCard = ({ title, value, subValue, icon: Icon, colorClass }: any) => (
  <div className="bg-[#0c0c0e] border border-white/5 p-4 rounded-xl flex items-center gap-4">
    <div className={`p-3 rounded-lg bg-white/5 ${colorClass}`}>
      <Icon size={20} />
    </div>
    <div>
      <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-0.5">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white leading-none">{value}</span>
        {subValue && <span className="text-xs text-slate-500">{subValue}</span>}
      </div>
    </div>
  </div>
);

export const StatOverview: React.FC<StatOverviewProps> = ({ roster, minIlvl }) => {
  const allChars = useMemo(() => roster.flatMap(p => [p.mainCharacter, ...p.splits]), [roster]);
  const mainChars = useMemo(() => roster.map(p => p.mainCharacter), [roster]);
  
  const avgMainIlvl = useMemo(() => 
    Math.round(mainChars.reduce((sum, c) => sum + c.itemLevel, 0) / mainChars.length || 0)
  , [mainChars]);

  const avgAllIlvl = useMemo(() => 
    Math.round(allChars.reduce((sum, c) => sum + c.itemLevel, 0) / allChars.length || 0)
  , [allChars]);

  const avgMainRating = useMemo(() => 
    Math.round(mainChars.reduce((sum, c) => sum + (c.mPlusRating || 0), 0) / mainChars.length || 0)
  , [mainChars]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatCard 
        title="Average Main iLvl" 
        value={avgMainIlvl} 
        icon={Crown} 
        colorClass="text-amber-500" 
      />
      <StatCard 
        title="Average All iLvl" 
        value={avgAllIlvl} 
        icon={Users} 
        colorClass="text-blue-500" 
      />
      <StatCard 
        title="Average Main M+" 
        value={avgMainRating} 
        icon={Activity} 
        colorClass="text-purple-500" 
      />
      <StatCard 
        title="Characters" 
        value={mainChars.length} 
        subValue={`/ ${allChars.length - mainChars.length} alts`} 
        icon={BarChart3} 
        colorClass="text-emerald-500" 
      />
    </div>
  );
};
