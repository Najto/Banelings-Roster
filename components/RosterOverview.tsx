
import React, { useMemo, useState } from 'react';
import { Player, Character, PlayerRole, ROLE_PRIORITY, CLASS_COLORS } from '../types';
import { Shield, Heart, Sword, Target, Trash2 } from 'lucide-react';

interface RosterOverviewProps {
  roster: Player[];
  minIlvl: number;
  onDeleteCharacter?: (characterName: string, realm: string) => Promise<void>;
  onAddCharacter?: (memberName: string, isMain: boolean) => void;
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

const CharacterCell = ({
  char,
  isMain = false,
  minIlvl,
  onDelete,
  onAdd,
}: {
  char?: Character;
  isMain?: boolean;
  minIlvl: number;
  onDelete?: (characterName: string, realm: string) => Promise<void>;
  onAdd?: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!char) {
    return (
      <div
        className="p-2 border border-white/5 bg-black/20 rounded min-h-[40px] flex items-center justify-center hover:bg-white/[0.03] hover:border-blue-500/30 transition-all cursor-pointer group"
        onClick={onAdd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="text-[10px] font-bold text-blue-400/60 group-hover:text-blue-400 uppercase tracking-wider transition-colors">
          Add
        </span>
      </div>
    );
  }

  const classColor = CLASS_COLORS[char.className] || '#fff';

  return (
    <div
      className={`p-2 border rounded transition-all hover:bg-white/[0.05] group min-h-[40px] flex flex-col justify-center relative ${
        isMain ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/5 bg-black/40'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[12px] font-black truncate uppercase tracking-tighter"
          style={{ color: classColor }}
        >
          {char.name}
        </span>
        <span className={`text-[12px] font-mono font-black ${char.itemLevel >= minIlvl ? 'text-indigo-400' : 'text-slate-600'}`}>
          {char.itemLevel}
        </span>
      </div>
      <div className="text-[7px] font-bold text-slate-700 uppercase tracking-widest mt-0.5 truncate group-hover:text-slate-500 transition-colors">
        {char.className}
      </div>

      {isHovered && onDelete && !isDeleting && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (window.confirm(`Delete ${char.name}?`)) {
              setIsDeleting(true);
              try {
                await onDelete(char.name, char.server || 'blackhand');
              } catch (error) {
                console.error('Delete failed:', error);
                alert('Failed to delete character. Please try again.');
              } finally {
                setIsDeleting(false);
              }
            }
          }}
          className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          disabled={isDeleting}
        >
          <Trash2 size={10} className="text-white" />
        </button>
      )}
      {isDeleting && (
        <div className="absolute top-1 right-1 p-1 bg-red-500/80 rounded">
          <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export const RosterOverview: React.FC<RosterOverviewProps> = ({ roster, minIlvl, onDeleteCharacter, onAddCharacter }) => {
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
                      <span className="text-[12px] font-black text-slate-300 uppercase tracking-tighter">
                        {player.name}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <CharacterCell
                        char={player.mainCharacter}
                        isMain
                        minIlvl={minIlvl}
                        onDelete={onDeleteCharacter}
                        onAdd={() => onAddCharacter?.(player.name, true)}
                      />
                    </td>
                    {Array.from({ length: maxSplits }).map((_, i) => (
                      <td key={i} className="px-6 py-3">
                        <CharacterCell
                          char={player.splits[i]}
                          minIlvl={minIlvl}
                          onDelete={onDeleteCharacter}
                          onAdd={() => onAddCharacter?.(player.name, false)}
                        />
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
