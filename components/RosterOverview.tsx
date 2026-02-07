
import React, { useMemo } from 'react';
import { Player, Character, PlayerRole, ROLE_PRIORITY, CLASS_COLORS } from '../types';
import { Shield, Heart, Sword, Target } from 'lucide-react';

interface RosterOverviewProps {
  roster: Player[];
  minIlvl: number;
}

const RoleIcon = ({ role }: { role: PlayerRole }) => {
  switch (role) {
    case PlayerRole.TANK: return <Shield size={14} className="text-blue-400" />;
    case PlayerRole.HEALER: return <Heart size={14} className="text-emerald-400" />;
    case PlayerRole.MELEE: return <Sword size={14} className="text-red-400" />;
    case PlayerRole.RANGE: return <Target size={14} className="text-purple-400" />;
    default: return null;
  }
};

const CharacterCell = ({ char, isMain = false, minIlvl }: { char?: Character, isMain?: boolean, minIlvl: number }) => {
  if (!char) return <div className="p-2 border border-white/5 bg-black/20 rounded min-h-[40px]" />;

  const classColor = CLASS_COLORS[char.className] || '#fff';
  
  return (
    <div 
      className={`p-2 border rounded transition-all hover:bg-white/[0.05] group min-h-[40px] flex flex-col justify-center ${
        isMain ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/5 bg-black/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span 
          className="text-[10px] font-black truncate uppercase tracking-tighter" 
          style={{ color: classColor }}
        >
          {char.name}
        </span>
        <span className={`text-[10px] font-mono font-black ${char.itemLevel >= minIlvl ? 'text-indigo-400' : 'text-slate-600'}`}>
          {char.itemLevel}
        </span>
      </div>
      <div className="text-[7px] font-bold text-slate-700 uppercase tracking-widest mt-0.5 truncate group-hover:text-slate-500 transition-colors">
        {char.className}
      </div>
    </div>
  );
};

export const RosterOverview: React.FC<RosterOverviewProps> = ({ roster, minIlvl }) => {
  const groupedPlayers = useMemo(() => {
    const groups: Record<PlayerRole, Player[]> = {
      [PlayerRole.TANK]: [],
      [PlayerRole.HEALER]: [],
      [PlayerRole.MELEE]: [],
      [PlayerRole.RANGE]: [],
      [PlayerRole.UNKNOWN]: []
    };

    roster.forEach(player => {
      groups[player.role].push(player);
    });

    Object.keys(groups).forEach(role => {
      groups[role as PlayerRole].sort((a, b) => {
        const classCmp = a.mainCharacter.className.localeCompare(b.mainCharacter.className);
        return classCmp !== 0 ? classCmp : a.name.localeCompare(b.name);
      });
    });

    return groups;
  }, [roster]);

  const maxSplits = useMemo(() => {
    return Math.max(...roster.map(p => p.splits.length), 5);
  }, [roster]);

  const splitHeaders = Array.from({ length: maxSplits }, (_, i) => `${i + 1}. Split Char`);

  return (
    <div className="space-y-8 pb-20">
      {Object.values(PlayerRole).filter(role => role !== PlayerRole.UNKNOWN && groupedPlayers[role].length > 0).sort((a, b) => ROLE_PRIORITY[a] - ROLE_PRIORITY[b]).map(role => (
        <div key={role} className="bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 bg-black/40 border-b border-white/5 flex items-center gap-3">
            <RoleIcon role={role} />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">{role}s</h3>
            <span className="text-[10px] text-slate-600 font-bold ml-auto">{groupedPlayers[role].length} Members</span>
          </div>

          <div className="overflow-x-auto custom-scrollbar-horizontal">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/60 border-b border-white/5">
                  <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 w-[120px]">Member</th>
                  <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 w-[180px]">Main Character</th>
                  {splitHeaders.map((header, i) => (
                    <th key={i} className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-500 w-[180px]">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {groupedPlayers[role].map(player => (
                  <tr key={player.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 align-middle">
                      <span className="text-[11px] font-black text-slate-300 uppercase tracking-tighter">
                        {player.name}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <CharacterCell char={player.mainCharacter} isMain minIlvl={minIlvl} />
                    </td>
                    {Array.from({ length: maxSplits }).map((_, i) => (
                      <td key={i} className="px-6 py-3">
                        <CharacterCell char={player.splits[i]} minIlvl={minIlvl} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
