
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SplitGroup, HelperCharacter, PlayerRole, CLASS_COLORS, ROLE_PRIORITY, WoWClass, Player, Character } from '../types';
import { persistenceService } from '../services/persistenceService';
import { 
  Shield, 
  Heart, 
  Sword, 
  Target, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Boxes, 
  Brain,
  Swords,
  Zap,
  ShieldCheck,
  Wind,
  Activity,
  ShieldAlert,
  DoorOpen,
  HeartPulse,
  FastForward,
  PlusCircle,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  Globe,
  Settings2,
  X,
  UserCircle,
  UserPlus,
  Lock,
  Trash2,
  Cloud,
  CloudOff,
  Loader2,
  Share2,
  HandHelping,
  ChevronDown,
  GripVertical
} from 'lucide-react';

interface SplitSetupProps {
  splits: SplitGroup[];
  roster: Player[];
  minIlvl: number;
}

const BUFF_PROVIDERS: Record<string, WoWClass[]> = {
  "5% Intellect": [WoWClass.MAGE],
  "5% Attack Power": [WoWClass.WARRIOR],
  "5% Stamina": [WoWClass.PRIEST],
  "5% Phys DMG": [WoWClass.MONK],
  "5% Magic DMG": [WoWClass.DEMON_HUNTER],
  "Devo Aura": [WoWClass.PALADIN],
  "Skyfury": [WoWClass.SHAMAN],
  "Skyfury Totem": [WoWClass.SHAMAN],
  "3% Vers": [WoWClass.DRUID],
  "Hunters Mark": [WoWClass.HUNTER],
  "Gateway": [WoWClass.WARLOCK],
  "Rallying Cry": [WoWClass.WARRIOR],
  "Bloodlust": [WoWClass.SHAMAN, WoWClass.MAGE, WoWClass.HUNTER, WoWClass.EVOKER],
  "CR": [WoWClass.DRUID, WoWClass.DEATH_KNIGHT, WoWClass.PALADIN, WoWClass.WARLOCK],
  "Speed": [WoWClass.SHAMAN, WoWClass.DRUID],
  "Mass Resurrection": [WoWClass.PRIEST, WoWClass.PALADIN, WoWClass.SHAMAN, WoWClass.MONK, WoWClass.DRUID, WoWClass.EVOKER],
  "3.6% DMG Red": [WoWClass.PALADIN]
};

const BUFF_METADATA: Record<string, { description: string, icon: React.ReactNode }> = {
  "5% Intellect": { description: "Arcane Brilliance: Increases Intellect by 5%.", icon: <Brain size={14} /> },
  "5% Attack Power": { description: "Battle Shout: Increases Attack Power by 5%.", icon: <Swords size={14} /> },
  "5% Stamina": { description: "Power Word: Fortitude: Increases Stamina by 5%.", icon: <Heart size={14} /> },
  "5% Phys DMG": { description: "Mystic Touch: Targets take 5% increased Physical damage.", icon: <Sword size={14} /> },
  "5% Magic DMG": { description: "Chaos Brand: Targets take 3% increased Magic damage.", icon: <Sparkles size={14} /> },
  "Devo Aura": { description: "Devotion Aura: Reduces damage taken by 3%.", icon: <ShieldCheck size={14} /> },
  "Skyfury Totem": { description: "Skyfury: Increases Critical Strike and Mastery.", icon: <Wind size={14} /> },
  "Skyfury": { description: "Skyfury: Increases Critical Strike and Mastery.", icon: <Wind size={14} /> },
  "3% Vers": { description: "Mark of the Wild: Increases Versatility by 3%.", icon: <Activity size={14} /> },
  "3.6% DMG Red": { description: "Passive damage reduction (e.g. Aura of Swiftness).", icon: <Shield size={14} /> },
  "Hunters Mark": { description: "Hunter's Mark: Increases damage taken by targets above 80% health.", icon: <Target size={14} /> },
  "Gateway": { description: "Demonic Gateway: Allows raid members to teleport.", icon: <DoorOpen size={14} /> },
  "Rallying Cry": { description: "Rallying Cry: Increases maximum health.", icon: <ShieldAlert size={14} /> },
  "Bloodlust": { description: "Heroism/Bloodlust: Increases haste by 30% for 40s.", icon: <Zap size={14} /> },
  "CR": { description: "Combat Resurrection.", icon: <HeartPulse size={14} /> },
  "Speed": { description: "Wind Rush Totem or Stampeding Roar.", icon: <FastForward size={14} /> },
  "Mass Resurrection": { description: "Allows the caster to resurrect all dead party members.", icon: <PlusCircle size={14} /> }
};

const ARMOR_DESCRIPTIONS: Record<string, string> = {
  "cloth": "Mages, Priests, Warlocks",
  "leather": "Druids, Monks, Rogues, Demon Hunters",
  "mail": "Hunters, Shamans, Evokers",
  "plate": "Warriors, Paladins, Death Knights"
};

// Fix: Destructured key and added optional children to satisfy TypeScript when used in maps
const Tooltip = ({ content, children, key }: { content: string, children?: React.ReactNode, key?: React.Key }) => {
  if (!content) return <>{children}</>;
  return (
    <div key={key} className="group relative inline-block w-full">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-[#050507] border border-white/10 text-slate-300 text-[10px] px-3 py-2 rounded-lg shadow-2xl w-48 text-center font-medium leading-relaxed">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#050507]"></div>
        </div>
      </div>
    </div>
  );
};

const RoleIcon = ({ role }: { role: PlayerRole }) => {
  switch (role) {
    case PlayerRole.TANK: return <Shield size={14} className="text-blue-400" />;
    case PlayerRole.HEALER: return <Heart size={14} className="text-emerald-400" />;
    case PlayerRole.MELEE: return <Sword size={14} className="text-red-400" />;
    case PlayerRole.RANGE: return <Target size={14} className="text-purple-400" />;
    default: return null;
  }
};

const isSameCharacter = (c1: { name: string, isMain?: boolean, server?: string }, c2: { name: string, isMain?: boolean, server?: string }) => {
    return c1.name === c2.name && 
           c1.isMain === c2.isMain && 
           (c1.server === c2.server || (!c1.server && !c2.server));
};

export const SplitSetup: React.FC<SplitSetupProps> = ({ splits, roster, minIlvl }) => {
  const [source, setSource] = useState<'sheet' | 'web'>('web');
  const [currentSplits, setCurrentSplits] = useState<SplitGroup[]>([]);
  const [editMember, setEditMember] = useState<{ memberName: string, groupIndex: number } | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [addingHelperToGroup, setAddingHelperToGroup] = useState<number | null>(null);
  const [helperName, setHelperName] = useState('');
  const [helperClass, setHelperClass] = useState<WoWClass>(WoWClass.WARRIOR);

  const resolveSplits = useCallback((baseSplits: SplitGroup[]) => {
    return baseSplits.map(group => ({
      ...group,
      helpers: group.helpers || [],
      players: group.players.map(p => {
          const member = roster.find(m => 
              m.mainCharacter.name.toLowerCase() === p.name.toLowerCase() || 
              m.splits.some(s => s.name.toLowerCase() === p.name.toLowerCase())
          );
          
          let resolvedServer = p.server;
          if (member) {
             const charMatch = [member.mainCharacter, ...member.splits].find(c => c.name.toLowerCase() === p.name.toLowerCase() && !!c.isMain === !!p.isMain);
             if (charMatch) resolvedServer = charMatch.server;
          }

          return { 
              ...p, 
              playerName: member?.name || p.name,
              server: resolvedServer
          };
      })
    }));
  }, [roster]);

  useEffect(() => {
    const initSource = async () => {
      if (source === 'sheet') {
        setCurrentSplits(resolveSplits(splits));
        setSyncStatus('idle');
      } else {
        setSyncStatus('syncing');
        const remoteData = await persistenceService.loadSplits();
        if (remoteData) {
          setCurrentSplits(resolveSplits(remoteData));
          setSyncStatus('synced');
        } else {
          // If no cloud data yet, initialize with sheet data but stay in web mode
          const base = resolveSplits(splits);
          setCurrentSplits(base);
          setSyncStatus('idle');
        }
      }
    };
    initSource();
  }, [source, splits, resolveSplits]);

  const saveWebSplits = async (newSplits: SplitGroup[]) => {
    setCurrentSplits(newSplits);
    if (source === 'web') {
      setSyncStatus('syncing');
      const success = await persistenceService.saveSplits(newSplits);
      setSyncStatus(success ? 'synced' : 'error');
    }
  };

  const calculateArmor = (players: SplitGroup['players']) => {
    const armor: SplitGroup['armor'] = { cloth: 0, leather: 0, mail: 0, plate: 0 };
    players.filter(p => p.isMain).forEach(p => {
      const cls = p.className;
      if ([WoWClass.MAGE, WoWClass.PRIEST, WoWClass.WARLOCK].includes(cls)) armor.cloth++;
      if ([WoWClass.DRUID, WoWClass.MONK, WoWClass.ROGUE, WoWClass.DEMON_HUNTER].includes(cls)) armor.leather++;
      if ([WoWClass.HUNTER, WoWClass.SHAMAN, WoWClass.EVOKER].includes(cls)) armor.mail++;
      if ([WoWClass.WARRIOR, WoWClass.PALADIN, WoWClass.DEATH_KNIGHT].includes(cls)) armor.plate++;
    });
    return armor;
  };

  const updateGroupStats = (group: SplitGroup): SplitGroup => {
    const totalIlvl = group.players.reduce((sum, p) => sum + p.ilvl, 0);
    return {
      ...group,
      avgIlvl: group.players.length > 0 ? totalIlvl / group.players.length : 0,
      armor: calculateArmor(group.players)
    };
  };

  const handleDragStart = (e: React.DragEvent, playerName: string, charName: string, isMain: boolean, server: string | undefined, fromGroupIdx: number) => {
    if (source === 'sheet') return;
    e.dataTransfer.setData('playerName', playerName);
    e.dataTransfer.setData('charName', charName);
    e.dataTransfer.setData('isMain', isMain.toString());
    e.dataTransfer.setData('server', server || "");
    e.dataTransfer.setData('fromGroupIdx', fromGroupIdx.toString());
  };

  const handleDrop = (e: React.DragEvent, toGroupIdx: number) => {
    if (source === 'sheet') return;
    const dragType = e.dataTransfer.getData('dragType');
    const fromGroupIdx = parseInt(e.dataTransfer.getData('fromGroupIdx'));

    if (isNaN(fromGroupIdx) || fromGroupIdx === toGroupIdx) return;

    if (dragType === 'helper') {
      const helperIdx = parseInt(e.dataTransfer.getData('helperIdx'));
      const newSplits = [...currentSplits];
      const fromGroup = { ...newSplits[fromGroupIdx] };
      const toGroup = { ...newSplits[toGroupIdx] };
      const fromHelpers = [...(fromGroup.helpers || [])];
      const helperToMove = fromHelpers[helperIdx];
      if (!helperToMove) return;
      fromHelpers.splice(helperIdx, 1);
      fromGroup.helpers = fromHelpers;
      toGroup.helpers = [...(toGroup.helpers || []), helperToMove];
      newSplits[fromGroupIdx] = fromGroup;
      newSplits[toGroupIdx] = toGroup;
      saveWebSplits(newSplits);
      return;
    }

    const playerName = e.dataTransfer.getData('playerName');
    const charName = e.dataTransfer.getData('charName');
    const isMain = e.dataTransfer.getData('isMain') === 'true';
    const server = e.dataTransfer.getData('server') || undefined;

    const newSplits = [...currentSplits];
    const fromGroup = newSplits[fromGroupIdx];
    const toGroup = newSplits[toGroupIdx];

    const charToMove = fromGroup.players.find(p => p.playerName === playerName && isSameCharacter(p, { name: charName, isMain, server }));
    if (!charToMove) return;

    fromGroup.players = fromGroup.players.filter(p => !(p.playerName === playerName && isSameCharacter(p, { name: charName, isMain, server })));

    const existingInTo = toGroup.players.find(p => p.playerName === playerName);
    if (existingInTo) {
      toGroup.players = toGroup.players.filter(p => p.playerName !== playerName);
      fromGroup.players.push(existingInTo);
    }

    toGroup.players.push(charToMove);

    newSplits[fromGroupIdx] = updateGroupStats(fromGroup);
    newSplits[toGroupIdx] = updateGroupStats(toGroup);
    saveWebSplits(newSplits);
  };

  const changeCharacter = (groupIndex: number, playerName: string, newChar: Character | null) => {
    const newSplits = [...currentSplits];
    const group = newSplits[groupIndex];
    
    group.players = group.players.filter(p => p.playerName !== playerName);

    if (newChar) {
      const playerObj = roster.find(r => r.name === playerName);
      group.players.push({
        name: newChar.name,
        playerName: playerName,
        className: newChar.className,
        ilvl: newChar.itemLevel,
        isMain: !!newChar.isMain,
        role: playerObj?.role || PlayerRole.UNKNOWN,
        server: newChar.server
      });
    }

    newSplits[groupIndex] = updateGroupStats(group);
    saveWebSplits(newSplits);
    setEditMember(null);
  };

  const addHelper = (groupIdx: number, name: string, className: WoWClass) => {
    const newSplits = [...currentSplits];
    const group = { ...newSplits[groupIdx] };
    group.helpers = [...(group.helpers || []), { name, className }];
    newSplits[groupIdx] = group;
    saveWebSplits(newSplits);
    setAddingHelperToGroup(null);
    setHelperName('');
    setHelperClass(WoWClass.WARRIOR);
  };

  const removeHelper = (groupIdx: number, helperIdx: number) => {
    const newSplits = [...currentSplits];
    const group = { ...newSplits[groupIdx] };
    group.helpers = (group.helpers || []).filter((_, i) => i !== helperIdx);
    newSplits[groupIdx] = group;
    saveWebSplits(newSplits);
  };

  const handleHelperDragStart = (e: React.DragEvent, helperIdx: number, helper: HelperCharacter, fromGroupIdx: number) => {
    if (source === 'sheet') return;
    e.dataTransfer.setData('dragType', 'helper');
    e.dataTransfer.setData('helperIdx', helperIdx.toString());
    e.dataTransfer.setData('helperName', helper.name);
    e.dataTransfer.setData('helperClass', helper.className);
    e.dataTransfer.setData('fromGroupIdx', fromGroupIdx.toString());
  };

  const playersByRole = useMemo(() => {
    const roles: Record<PlayerRole, Player[]> = {
      [PlayerRole.TANK]: [],
      [PlayerRole.HEALER]: [],
      [PlayerRole.MELEE]: [],
      [PlayerRole.RANGE]: [],
      [PlayerRole.UNKNOWN]: []
    };
    roster.forEach(p => roles[p.role].push(p));
    return roles;
  }, [roster]);

  if (!currentSplits || currentSplits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-600">
        <Loader2 className="animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-xs">Loading Split Configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shared Header & Toggles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-[#0c0c0e]/50 p-3 rounded-2xl border border-white/5 gap-4 shadow-xl">
        <div className="flex p-1 bg-black rounded-xl border border-white/5">
          <button 
            onClick={() => setSource('sheet')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${source === 'sheet' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <FileSpreadsheet size={14} />
            Sheet Version
          </button>
          <button 
            onClick={() => setSource('web')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${source === 'web' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Globe size={14} />
            Shared Web Version
          </button>
        </div>
        
        <div className="flex items-center gap-6 px-4">
            {source === 'web' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {syncStatus === 'syncing' ? (
                    <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                      <Loader2 size={12} className="animate-spin" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Shared Cloud Syncing...</span>
                    </div>
                  ) : syncStatus === 'synced' ? (
                    <div className="flex items-center gap-2 text-emerald-500">
                      <Cloud size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Cloud Synced</span>
                    </div>
                  ) : syncStatus === 'error' ? (
                    <div className="flex items-center gap-2 text-red-500">
                      <CloudOff size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Cloud Error</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Cloud size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Local Session</span>
                    </div>
                  )}
                </div>
                
                <div className="h-4 w-px bg-white/10" />
                
                <button
                  onClick={async () => {
                    const pw = prompt("Enter admin password to reset cloud:");
                    if (pw !== 'admin1337') {
                      if (pw !== null) alert("Incorrect password.");
                      return;
                    }
                    const existingHelpers = currentSplits.map(g => g.helpers || []);
                    const base = resolveSplits(splits).map((g, i) => ({
                      ...g,
                      helpers: existingHelpers[i] || []
                    }));
                    await saveWebSplits(base);
                  }}
                  className="group flex items-center gap-2 text-slate-600 hover:text-red-400 transition-colors"
                  title="Overwrite Cloud with Spreadsheet Data"
                >
                  <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Reset Cloud</span>
                </button>
              </div>
            )}
            
            {source === 'sheet' && (
              <div className="flex items-center gap-2 text-slate-600 font-bold uppercase tracking-widest italic text-[9px]">
                <Share2 size={12} />
                Syncing directly from Spreadsheet
              </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        {currentSplits.map((group, groupIdx) => (
          <div 
            key={groupIdx} 
            className="bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, groupIdx)}
          >
            <div className="p-6 bg-indigo-500/5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">{group.name}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Average iLvl: <span className="text-indigo-400">{group.avgIlvl.toFixed(1)}</span></p>
              </div>
              <div className="flex gap-2">
                  <div className="px-3 py-1 bg-black rounded-lg border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {group.players.length} Active Chars
                  </div>
              </div>
            </div>

            <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-6">
                {Object.keys(PlayerRole).filter(r => r !== 'UNKNOWN').sort((a,b) => ROLE_PRIORITY[a as PlayerRole] - ROLE_PRIORITY[b as PlayerRole]).map(roleKey => {
                  const role = PlayerRole[roleKey as keyof typeof PlayerRole];
                  const membersOfRole = playersByRole[role];
                  if (membersOfRole.length === 0) return null;

                  return (
                    <div key={role} className="space-y-2">
                      <div className="flex items-center gap-2 px-2">
                        <RoleIcon role={role} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{role}</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {membersOfRole.map((member, idx) => {
                          const assignedChar = group.players.find(p => p.playerName === member.name);

                          if (assignedChar) {
                            return (
                              <div
                                key={member.id}
                                draggable={source === 'web'}
                                onDragStart={(e) => handleDragStart(e, member.name, assignedChar.name, assignedChar.isMain, assignedChar.server, groupIdx)}
                                onClick={() => source === 'web' && setEditMember({ memberName: member.name, groupIndex: groupIdx })}
                                className={`flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group ${source === 'web' ? 'cursor-grab active:cursor-grabbing hover:bg-white/[0.04]' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black truncate" style={{ color: CLASS_COLORS[assignedChar.className] }}>{assignedChar.name}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[8px] font-bold uppercase px-1 rounded ${assignedChar.isMain ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'}`}>
                                            {assignedChar.isMain ? 'Main' : 'Twink'}
                                        </span>
                                        <span className="text-[7px] text-slate-600 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">({member.name})</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[110px] font-black px-1.5 py-0.5 rounded ${assignedChar.ilvl >= minIlvl ? 'text-indigo-400 bg-indigo-400/5' : 'text-red-500 bg-red-500/10'}`}>
                                        {assignedChar.ilvl}
                                    </span>
                                    {source === 'web' && <Settings2 size={10} className="text-slate-700 opacity-0 group-hover:opacity-100" />}
                                </div>
                              </div>
                            );
                          } else if (source === 'web') {
                            return (
                              <div
                                key={member.id}
                                onClick={() => setEditMember({ memberName: member.name, groupIndex: groupIdx })}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-dashed border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.03] transition-all group cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded bg-black/40 flex items-center justify-center text-slate-800 group-hover:text-indigo-500 transition-colors">
                                    <UserPlus size={12} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-slate-700 group-hover:text-slate-500 transition-colors uppercase tracking-widest">{member.name}</span>
                                    <span className="text-[8px] text-slate-800 font-bold uppercase tracking-tighter">Pending Slot</span>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                    <PlusCircle size={10} className="text-slate-800 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-2">
                    <HandHelping size={14} className="text-amber-400" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Helper</h4>
                    <span className="text-[7px] font-bold uppercase tracking-tighter text-slate-700 ml-auto">{(group.helpers || []).length} added</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(group.helpers || []).map((helper, hIdx) => (
                      <div
                        key={`helper-${hIdx}`}
                        draggable={source === 'web'}
                        onDragStart={(e) => handleHelperDragStart(e, hIdx, helper, groupIdx)}
                        className={`flex items-center justify-between p-2.5 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 hover:border-amber-500/20 transition-all group ${source === 'web' ? 'cursor-grab active:cursor-grabbing hover:bg-amber-500/[0.06]' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {source === 'web' && <GripVertical size={12} className="text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />}
                          <div className="flex flex-col">
                            <span className="text-xs font-black truncate" style={{ color: CLASS_COLORS[helper.className] }}>{helper.name}</span>
                            <span className="text-[8px] font-bold uppercase px-1 rounded bg-amber-500/10 text-amber-500 w-fit">Helper</span>
                          </div>
                        </div>
                        {source === 'web' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeHelper(groupIdx, hIdx); }}
                            className="p-1 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}

                    {source === 'web' && addingHelperToGroup === groupIdx && (
                      <div className="col-span-1 sm:col-span-2 flex flex-col gap-2 p-3 rounded-xl bg-white/[0.02] border border-amber-500/20">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={helperName}
                            onChange={(e) => setHelperName(e.target.value)}
                            placeholder="Character name"
                            className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && helperName.trim()) addHelper(groupIdx, helperName.trim(), helperClass);
                              if (e.key === 'Escape') { setAddingHelperToGroup(null); setHelperName(''); }
                            }}
                          />
                          <div className="relative">
                            <select
                              value={helperClass}
                              onChange={(e) => setHelperClass(e.target.value as WoWClass)}
                              className="appearance-none bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 pr-7 text-xs text-white focus:outline-none focus:border-amber-500/40 cursor-pointer"
                              style={{ color: CLASS_COLORS[helperClass] }}
                            >
                              {Object.values(WoWClass).filter(c => c !== WoWClass.UNKNOWN).map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => helperName.trim() && addHelper(groupIdx, helperName.trim(), helperClass)}
                            disabled={!helperName.trim()}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <PlusCircle size={12} />
                            Add
                          </button>
                          <button
                            onClick={() => { setAddingHelperToGroup(null); setHelperName(''); }}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {source === 'web' && addingHelperToGroup !== groupIdx && (
                      <button
                        onClick={() => { setAddingHelperToGroup(groupIdx); setHelperName(''); setHelperClass(WoWClass.WARRIOR); }}
                        className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/[0.01] border border-dashed border-amber-500/10 hover:border-amber-500/30 hover:bg-amber-500/[0.03] transition-all group/add cursor-pointer"
                      >
                        <PlusCircle size={12} className="text-slate-700 group-hover/add:text-amber-400 transition-colors" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 group-hover/add:text-amber-400 transition-colors">Add Helper</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-indigo-500" /> Raid Buffs
                  </h5>
                  <div className="space-y-2">
                    {group.buffs.filter(b => b.name.toLowerCase() !== 'raidbuffs').map((buff, i) => {
                      const providers = BUFF_PROVIDERS[buff.name] || BUFF_PROVIDERS[buff.name.replace(/\bTotem\b/gi, '').trim()];
                      const isActive = group.players.some(p => providers?.includes(p.className)) || (group.helpers || []).some(h => providers?.includes(h.className));
                      const meta = BUFF_METADATA[buff.name] || BUFF_METADATA[buff.name.replace(/\bTotem\b/gi, '').trim()];
                      return (
                        <Tooltip key={i} content={meta?.description || ""}>
                          <div className="flex items-center justify-between text-[10px] p-1 rounded hover:bg-white/5 transition-colors cursor-help">
                            <div className="flex items-center gap-2">
                              <div className={`${isActive ? 'text-indigo-400' : 'text-slate-700'}`}>{meta?.icon || <CheckCircle2 size={12} />}</div>
                              <span className={`font-bold ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>{buff.name}</span>
                            </div>
                            {isActive ? <CheckCircle2 size={12} className="text-emerald-500" /> : <XCircle size={12} className="text-red-500/30" />}
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Boxes size={12} className="text-indigo-500" /> Armor Class
                    </h5>
                    <span className="text-[7px] font-black uppercase tracking-tighter text-slate-600">Mains Only</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(group.armor).map(([type, count]) => (
                      <Tooltip key={type} content={ARMOR_DESCRIPTIONS[type] || ""}>
                        <div className="bg-white/[0.02] border border-white/5 p-2 rounded-lg text-center cursor-help hover:border-white/20 transition-all">
                          <span className="block text-[8px] font-black uppercase text-slate-600 mb-1">{type}</span>
                          <span className="text-sm font-black text-white">{count}</span>
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                  <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                      <Info size={12} className="text-indigo-500" /> Key Utility
                  </h5>
                  <div className="space-y-2">
                    {group.utility.filter(u => u.name.toLowerCase() !== 'utility').map((util, i) => {
                      const providers = BUFF_PROVIDERS[util.name];
                      const isActive = group.players.some(p => providers?.includes(p.className)) || (group.helpers || []).some(h => providers?.includes(h.className));
                      const meta = BUFF_METADATA[util.name];
                      return (
                        <Tooltip key={i} content={meta?.description || ""}>
                          <div className="flex items-center justify-between text-[10px] p-1 rounded hover:bg-white/5 transition-colors cursor-help">
                            <div className="flex items-center gap-2">
                              <div className={`${isActive ? 'text-indigo-400' : 'text-slate-700'}`}>{meta?.icon || <Info size={12} />}</div>
                              <span className={`font-bold ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>{util.name}</span>
                            </div>
                            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 'bg-slate-800'}`} />
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <UserCircle className="text-indigo-400" size={20} />
                  <div>
                    <h3 className="text-lg font-black text-white uppercase">{editMember.memberName}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Character auswählen</p>
                  </div>
               </div>
               <button onClick={() => setEditMember(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {(() => {
                const player = roster.find(r => r.name === editMember.memberName);
                if (!player) return <p className="text-slate-500 text-xs italic">Member nicht im Roster gefunden.</p>;
                
                const allChars = [player.mainCharacter, ...player.splits];
                const activePlayerInGroup = currentSplits[editMember.groupIndex].players.find(p => p.playerName === editMember.memberName);

                const assignedInOtherGroups = currentSplits
                  .filter((_, idx) => idx !== editMember.groupIndex)
                  .flatMap(g => g.players)
                  .filter(p => p.playerName === editMember.memberName);

                return (
                  <>
                    {allChars.map((char, i) => {
                      const isUsedElsewhere = assignedInOtherGroups.some(p => isSameCharacter(p, char));
                      const isActiveHere = activePlayerInGroup && isSameCharacter(activePlayerInGroup, char);

                      return (
                        <button
                          key={i}
                          disabled={isUsedElsewhere}
                          onClick={() => !isUsedElsewhere && changeCharacter(editMember.groupIndex, editMember.memberName, char)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all relative overflow-hidden ${
                            isActiveHere 
                              ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-[inset_0_0_20px_rgba(79,70,229,0.1)]' 
                              : isUsedElsewhere 
                                ? 'bg-black/40 border-white/5 text-slate-700 cursor-not-allowed grayscale' 
                                : 'bg-white/5 border-white/5 text-slate-300 hover:border-white/10 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-black text-sm" style={{ color: (isActiveHere || isUsedElsewhere) ? undefined : CLASS_COLORS[char.className] }}>
                              {char.name}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                              {char.className} • {char.isMain ? 'Main' : 'Alt'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                             {isUsedElsewhere ? (
                               <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 rounded border border-red-500/20">
                                  <Lock size={10} className="text-red-500" />
                                  <span className="text-[8px] font-black uppercase text-red-500">Other Group</span>
                               </div>
                             ) : isActiveHere ? (
                               <CheckCircle2 size={16} className="text-indigo-500" />
                             ) : null}
                             <span className="font-mono font-black text-sm">{char.itemLevel}</span>
                          </div>
                        </button>
                      );
                    })}
                    
                    {activePlayerInGroup && (
                      <button
                        onClick={() => changeCharacter(editMember.groupIndex, editMember.memberName, null)}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-red-500/20 text-red-500/50 hover:text-red-500 hover:bg-red-500/5 text-[10px] font-black uppercase tracking-widest transition-all mt-4"
                      >
                        <Trash2 size={14} />
                        Character aus Slot entfernen
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
