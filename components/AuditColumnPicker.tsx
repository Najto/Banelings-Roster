import React, { useRef, useEffect } from 'react';
import { SlidersHorizontal, Check, Eye, EyeOff } from 'lucide-react';
import { HeaderGroup } from './auditColumns';

interface AuditColumnPickerProps {
  groups: HeaderGroup[];
  visibleGroups: Set<string>;
  onToggle: (groupId: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const AuditColumnPicker: React.FC<AuditColumnPickerProps> = ({
  groups, visibleGroups, onToggle, onShowAll, onHideAll, isOpen, onToggleOpen,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && isOpen) {
        onToggleOpen();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onToggleOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggleOpen}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
          isOpen
            ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
            : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/20'
        }`}
      >
        <SlidersHorizontal size={13} />
        Columns {visibleGroups.size}/{groups.length}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0c0c10] border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/60 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Toggle Header Groups
            </span>
            <div className="flex gap-3">
              <button
                onClick={onShowAll}
                className="flex items-center gap-1.5 text-[9px] font-bold text-sky-400 hover:text-sky-300 transition-colors"
              >
                <Eye size={10} /> All
              </button>
              <button
                onClick={onHideAll}
                className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
              >
                <EyeOff size={10} /> None
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto py-1 custom-scrollbar">
            {groups.map(group => {
              const active = visibleGroups.has(group.id);
              const Icon = group.icon;
              return (
                <button
                  key={group.id}
                  onClick={() => onToggle(group.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      active ? 'bg-sky-500 border-sky-400' : 'border-white/10 bg-white/[0.03]'
                    }`}>
                      {active && <Check size={11} className="text-white" />}
                    </div>
                    <Icon size={12} className={group.colorClass} />
                    <span className={`text-[11px] font-bold transition-colors ${
                      active ? 'text-white' : 'text-slate-600'
                    }`}>
                      {group.label}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600">
                    {group.columns.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
