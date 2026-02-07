import React, { useState, useMemo, useCallback } from 'react';
import { Player, PlayerRole } from '../types';
import { Search, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { HEADER_GROUPS, ALL_COLUMNS, type FlatChar } from './auditColumns';
import { AuditColumnPicker } from './AuditColumnPicker';

interface RosterAuditProps {
  roster: Player[];
}

const ROLE_ORDER: Record<string, number> = {
  [PlayerRole.TANK]: 0,
  [PlayerRole.HEALER]: 1,
  [PlayerRole.MELEE]: 2,
  [PlayerRole.RANGE]: 3,
  [PlayerRole.UNKNOWN]: 4,
};

const STORAGE_KEY = 'audit_visible_groups';

const loadVisibleGroups = (): Set<string> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return new Set(parsed);
    }
  } catch { /* default */ }
  return new Set(['identity', 'performance', 'gear', 'enchants', 'stats', 'slots', 'collections', 'pvp', 'mplusRanks', 'warcraftlogs']);
};

const saveVisibleGroups = (groups: Set<string>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...groups]));
};

export const RosterAudit: React.FC<RosterAuditProps> = ({ roster }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMainsOnly, setShowMainsOnly] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });
  const [visibleGroups, setVisibleGroups] = useState<Set<string>>(loadVisibleGroups);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const flatChars: FlatChar[] = useMemo(() => {
    return roster.flatMap(p => [
      { ...p.mainCharacter, isMain: true, playerName: p.name, role: p.role },
      ...p.splits.map(s => ({ ...s, isMain: false, playerName: p.name, role: p.role }))
    ]);
  }, [roster]);

  const sortedChars = useMemo(() => {
    const filtered = flatChars.filter(c => {
      if (showMainsOnly && !c.isMain) return false;
      const search = searchTerm.toLowerCase();
      if (!search) return true;
      return c.name.toLowerCase().includes(search) ||
        c.playerName?.toLowerCase().includes(search) ||
        (c.className && c.className.toLowerCase().includes(search));
    });

    const activeColumn = ALL_COLUMNS.find(col => col.key === sortConfig.key);
    if (!activeColumn) {
      return [...filtered].sort((a, b) => {
        const roleCmp = (ROLE_ORDER[a.role ?? ''] ?? 4) - (ROLE_ORDER[b.role ?? ''] ?? 4);
        if (roleCmp !== 0) return roleCmp;
        const classCmp = (a.className ?? '').localeCompare(b.className ?? '');
        if (classCmp !== 0) return classCmp;
        return a.name.localeCompare(b.name);
      });
    }

    return [...filtered].sort((a, b) => {
      const aVal = activeColumn.getValue(a);
      const bVal = activeColumn.getValue(b);
      let cmp = 0;
      if (activeColumn.sortType === 'string') {
        cmp = String(aVal || '').localeCompare(String(bVal || ''));
      } else {
        cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
      }
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [flatChars, showMainsOnly, searchTerm, sortConfig]);

  const activeGroups = useMemo(
    () => HEADER_GROUPS.filter(g => visibleGroups.has(g.id)),
    [visibleGroups]
  );

  const totalColCount = useMemo(
    () => activeGroups.reduce((sum, g) => sum + g.columns.length, 0),
    [activeGroups]
  );

  const handleSort = useCallback((columnKey: string) => {
    setSortConfig(prev => ({
      key: columnKey,
      direction: prev.key === columnKey && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const handleToggleGroup = useCallback((groupId: string) => {
    setVisibleGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      saveVisibleGroups(next);
      return next;
    });
  }, []);

  const handleShowAll = useCallback(() => {
    const all = new Set(HEADER_GROUPS.map(g => g.id));
    setVisibleGroups(all);
    saveVisibleGroups(all);
  }, []);

  const handleHideAll = useCallback(() => {
    const min = new Set<string>(['identity']);
    setVisibleGroups(min);
    saveVisibleGroups(min);
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in duration-700 pb-20 overflow-hidden max-w-full">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0c0c0e]/95 backdrop-blur-md p-4 rounded-3xl border border-white/5 sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-black rounded-2xl border border-white/5">
            <button
              onClick={() => setShowMainsOnly(true)}
              className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${showMainsOnly ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              MAINS
            </button>
            <button
              onClick={() => setShowMainsOnly(false)}
              className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${!showMainsOnly ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              ALL CHARS
            </button>
          </div>
          <span className="text-[10px] text-slate-600 font-bold tabular-nums hidden md:inline">
            {sortedChars.length} characters
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-[360px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input
              type="text"
              placeholder="Search characters..."
              className="w-full bg-black border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-sm text-white focus:ring-2 focus:ring-sky-500/40 outline-none font-bold placeholder:text-slate-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <AuditColumnPicker
            groups={HEADER_GROUPS}
            visibleGroups={visibleGroups}
            onToggle={handleToggleGroup}
            onShowAll={handleShowAll}
            onHideAll={handleHideAll}
            isOpen={showColumnPicker}
            onToggleOpen={() => setShowColumnPicker(p => !p)}
          />
          <div className="hidden lg:flex items-center gap-2 bg-sky-500/10 px-4 py-2 rounded-xl border border-sky-500/20">
            <Info size={14} className="text-sky-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-300">Live API Feed</span>
          </div>
        </div>
      </div>

      <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl shadow-2xl overflow-x-auto custom-scrollbar-horizontal">
        <table className="w-full border-collapse text-left" style={{ minWidth: `${totalColCount * 72}px` }}>
          <thead>
            <tr className="border-b border-white/10">
              {activeGroups.map(group => {
                const Icon = group.icon;
                return (
                  <th
                    key={group.id}
                    colSpan={group.columns.length}
                    className="bg-[#050507] border-x border-white/5 py-3 px-2 text-center sticky top-0 z-30"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Icon size={12} className={group.colorClass} />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{group.label}</span>
                    </div>
                  </th>
                );
              })}
            </tr>

            <tr className="border-b border-white/5 bg-black/30">
              {activeGroups.flatMap(group =>
                group.columns.map(column => {
                  const isActive = sortConfig.key === column.key;
                  const isCharCol = column.key === 'name';
                  return (
                    <th
                      key={column.key}
                      className={`px-3 py-2 border-r border-white/5 text-[8px] font-black uppercase tracking-wider whitespace-nowrap bg-black/80 sticky top-12 z-30 cursor-pointer select-none transition-colors ${
                        column.center !== false ? 'text-center' : ''
                      } ${
                        isActive ? 'text-sky-400 bg-sky-500/[0.06]' : 'text-slate-500 hover:text-white'
                      } ${isCharCol ? 'sticky left-0 z-40' : ''}`}
                      onClick={() => handleSort(column.key)}
                    >
                      <div className={`flex items-center gap-1 ${column.center !== false ? 'justify-center' : ''}`}>
                        {column.label}
                        {isActive && (
                          sortConfig.direction === 'asc'
                            ? <ChevronUp size={8} className="text-sky-400 flex-shrink-0" />
                            : <ChevronDown size={8} className="text-sky-400 flex-shrink-0" />
                        )}
                      </div>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5 font-mono">
            {sortedChars.map(char => (
              <tr
                key={`${char.name}-${char.server}-${char.playerName}`}
                className="hover:bg-white/[0.04] transition-colors group"
              >
                {activeGroups.flatMap(group =>
                  group.columns.map(column => {
                    const isCharCol = column.key === 'name';
                    return (
                      <td
                        key={column.key}
                        className={`px-4 py-3 border-r border-white/5 ${column.center !== false ? 'text-center' : ''} ${
                          isCharCol
                            ? 'sticky left-0 bg-[#0c0c0e] z-20 shadow-xl group-hover:bg-sky-950/20 transition-colors'
                            : ''
                        } ${column.key.startsWith('slot-') ? 'group/slot overflow-hidden' : ''}`}
                      >
                        {column.render(char)}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
