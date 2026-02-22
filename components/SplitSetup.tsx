import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { SplitGroup, HelperCharacter, PlayerRole, CLASS_COLORS, ROLE_PRIORITY, WoWClass, Player, Character, VersionKey, VERSION_LABELS } from '../types';
import { persistenceService } from '../services/persistenceService';
import { supabase } from '../services/supabaseClient';
import { realtimeService } from '../services/realtimeService';
import { presenceService } from '../services/presenceService';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
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
  GripVertical,
  AlertTriangle,
  LogIn,
  LogOut,
  Users,
  Eye,
  Minus,
  Plus,
  Layers
} from 'lucide-react';

interface SplitSetupProps {
  splits: SplitGroup[];
  roster: Player[];
  minIlvl: number;
}

// Buff provider mapping - which classes provide which raid buffs
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

// Metadata for each buff including description and icon
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

// Descriptions for each armor type
const ARMOR_DESCRIPTIONS: Record<string, string> = {
  "cloth": "Mages, Priests, Warlocks",
  "leather": "Druids, Monks, Rogues, Demon Hunters",
  "mail": "Hunters, Shamans, Evokers",
  "plate": "Warriors, Paladins, Death Knights"
};

// Color mapping for each armor type (Cloth: Violet/Blue, Leather: Green, Mail: Cyan, Plate: Gold/Red)
const ARMOR_COLORS: Record<string, {
  border: string,
  bg: string,
  shadow: string,
  text: string,
  hoverBorder: string,
  hoverBg: string,
  indicator: string
}> = {
  "cloth": {
    border: "border-violet-500/70",
    bg: "bg-violet-500/10",
    shadow: "shadow-[0_0_15px_rgba(139,92,246,0.4)]",
    text: "text-violet-300",
    hoverBorder: "hover:border-violet-500/50",
    hoverBg: "hover:bg-violet-500/5",
    indicator: "bg-violet-400"
  },
  "leather": {
    border: "border-lime-500/70",
    bg: "bg-lime-500/10",
    shadow: "shadow-[0_0_12px_rgba(132,204,22,0.35)]",
    text: "text-lime-300",
    hoverBorder: "hover:border-lime-500/50",
    hoverBg: "hover:bg-lime-500/5",
    indicator: "bg-lime-400"
  },
  "mail": {
    border: "border-sky-500/70",
    bg: "bg-sky-500/10",
    shadow: "shadow-[0_0_15px_rgba(56,189,248,0.45)]",
    text: "text-sky-300",
    hoverBorder: "hover:border-sky-500/50",
    hoverBg: "hover:bg-sky-500/5",
    indicator: "bg-sky-400"
  },
  "plate": {
    border: "border-amber-500/70",
    bg: "bg-amber-500/10",
    shadow: "shadow-[0_0_15px_rgba(239,68,68,0.4)]",
    text: "text-amber-300",
    hoverBorder: "hover:border-amber-500/50",
    hoverBg: "hover:bg-amber-500/5",
    indicator: "bg-amber-400"
  }
};

// Helper function to determine armor type for a given class
const getArmorTypeForClass = (className: WoWClass): string => {
  if ([WoWClass.MAGE, WoWClass.PRIEST, WoWClass.WARLOCK].includes(className)) return 'cloth';
  if ([WoWClass.DRUID, WoWClass.MONK, WoWClass.ROGUE, WoWClass.DEMON_HUNTER].includes(className)) return 'leather';
  if ([WoWClass.HUNTER, WoWClass.SHAMAN, WoWClass.EVOKER].includes(className)) return 'mail';
  if ([WoWClass.WARRIOR, WoWClass.PALADIN, WoWClass.DEATH_KNIGHT].includes(className)) return 'plate';
  return '';
};

// Reusable Tooltip component
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

// Role icon component
const RoleIcon = ({ role }: { role: PlayerRole }) => {
  switch (role) {
    case PlayerRole.TANK: return <Shield size={14} className="text-blue-400" />;
    case PlayerRole.HEALER: return <Heart size={14} className="text-emerald-400" />;
    case PlayerRole.MELEE: return <Sword size={14} className="text-red-400" />;
    case PlayerRole.RANGE: return <Target size={14} className="text-purple-400" />;
    default: return null;
  }
};

// Helper function to compare if two characters are the same
const isSameCharacter = (c1: { name: string, isMain?: boolean, server?: string }, c2: { name: string, isMain?: boolean, server?: string }) => {
    return c1.name === c2.name && 
           c1.isMain === c2.isMain && 
           (c1.server === c2.server || (!c1.server && !c2.server));
};

export const SplitSetup: React.FC<SplitSetupProps> = ({ splits, roster, minIlvl }) => {
  // State for current version and split configuration
  const [currentVersion, setCurrentVersion] = useState<VersionKey>('main');
  const [currentSplits, setCurrentSplits] = useState<SplitGroup[]>([]);
  
  // State for editing members
  const [editMember, setEditMember] = useState<{ memberName: string, groupIndex: number } | null>(null);
  
  // State for sync status
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  
  // State for helper management
  const [addingHelperToGroup, setAddingHelperToGroup] = useState<number | null>(null);
  const [helperName, setHelperName] = useState('');
  const [helperClass, setHelperClass] = useState<WoWClass>(WoWClass.WARRIOR);
  
  // State for version copying
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyFrom, setCopyFrom] = useState<VersionKey>('main');
  const [copyTo, setCopyTo] = useState<VersionKey>('alt1');
  
  // State for authentication
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginEmail, setLoginEmail] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  
  // State for loading and real-time features
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);
  
  // NEW: State for armor hover highlighting
  const [highlightedArmorType, setHighlightedArmorType] = useState<string | null>(null);
  const [highlightedGroupIndex, setHighlightedGroupIndex] = useState<number | null>(null);

  // NEW: State for locked/pinned armor highlighting - supports multiple locks
  const [lockedArmorTypes, setLockedArmorTypes] = useState<Set<string>>(new Set());

  // State for group count management
  const [showGroupCountWarning, setShowGroupCountWarning] = useState(false);
  const [pendingGroupCount, setPendingGroupCount] = useState<number | null>(null);

  // Refs and hooks
  const isSavingRef = useRef(false);
  const { toasts, showToast, dismissToast } = useToast();

  // Resolve splits by matching players with roster data
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
          let resolvedIlvl = p.ilvl;
          let isMainMismatch = false;

          if (member) {
             const charMatch = [member.mainCharacter, ...member.splits].find(c => c.name.toLowerCase() === p.name.toLowerCase());
             if (charMatch) {
               resolvedServer = charMatch.server;
               if (charMatch.itemLevel) resolvedIlvl = charMatch.itemLevel;
               if (!!charMatch.isMain !== !!p.isMain) isMainMismatch = true;
             }
          }

          const isOrphaned = !roster.find(m => m.name === p.playerName);

          return {
              ...p,
              playerName: member?.name || p.playerName || p.name,
              server: resolvedServer,
              ilvl: resolvedIlvl,
              isOrphaned,
              isMainMismatch
          };
      })
    }));
  }, [roster]);

  // Authentication effect
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(!!session?.user);
    };
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setIsAdmin(!!session?.user);
      })();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Login handler
  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${loginEmail}@admin.local`,
        password: loginPassword,
      });

      if (error) {
        alert('Login failed: Invalid credentials');
        return;
      }

      setShowLoginDialog(false);
      setLoginPassword('');
    } catch (error) {
      alert('Login failed');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  // Initial load effect
  useEffect(() => {
    const initSource = async () => {
      try {
        setSyncStatus('syncing');
        const remoteData = await persistenceService.loadSplits(currentVersion);
        if (remoteData && remoteData.length > 0) {
          setCurrentSplits(resolveSplits(remoteData));
          setSyncStatus('synced');
        } else {
          const base = resolveSplits(splits);
          setCurrentSplits(base);
          setSyncStatus('idle');
        }
      } catch (error) {
        console.error('Failed to load splits:', error);
        const base = resolveSplits(splits);
        setCurrentSplits(base);
        setSyncStatus('error');
      } finally {
        setIsInitialLoad(false);
      }
    };
    initSource();
  }, [currentVersion, splits, resolveSplits]);

  // Real-time subscription effect
  useEffect(() => {
    const guildKeyMatch = "2PACX-1vS8AIcE-2b-IJohqlFiUCp0laqabWOptLdAk1OpL9o8LptWglWr2rMwnV-7YM6dwwGiEO9ruz7triLa";

    const unsubscribe = realtimeService.subscribeSplits(
      guildKeyMatch,
      currentVersion,
      (newSplits: SplitGroup[]) => {
        if (!isSavingRef.current) {
          const resolved = resolveSplits(newSplits);
          setCurrentSplits(resolved);
          showToast('Split setup updated by another user', 'info', 3000);
        }
      }
    );

    const unsubscribePresence = presenceService.trackPresence(
      'split-setup',
      currentVersion,
      (count: number) => {
        setActiveUsers(count);
      }
    );

    setIsRealtimeConnected(true);

    return () => {
      unsubscribe();
      unsubscribePresence();
      setIsRealtimeConnected(false);
      setActiveUsers(0);
    };
  }, [currentVersion, resolveSplits, showToast]);

  // Save splits to backend
  const saveWebSplits = async (newSplits: SplitGroup[]) => {
    if (currentVersion === 'main' && !isAdmin) {
      alert('You have to be an admin to do that');
      return;
    }

    setCurrentSplits(newSplits);
    setSyncStatus('syncing');
    isSavingRef.current = true;
    const success = await persistenceService.saveSplits(newSplits, currentVersion);
    setSyncStatus(success ? 'synced' : 'error');
    setTimeout(() => {
      isSavingRef.current = false;
    }, 1000);
  };

  // Handle armor type click to lock/unlock highlighting
  const handleArmorClick = (armorType: string, groupIndex: number, hasPlayers: boolean) => {
    if (!hasPlayers) return; // Don't allow clicking on empty armor types

    const lockKey = `${groupIndex}-${armorType}`;
    setLockedArmorTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lockKey)) {
        // If already locked, unlock it
        newSet.delete(lockKey);
      } else {
        // Lock the armor type
        newSet.add(lockKey);
      }
      return newSet;
    });
  };

  // Copy version handler
  const handleCopyVersion = async () => {
    if (copyFrom === copyTo) {
      alert('Source and destination must be different.');
      return;
    }

    if (copyTo === 'main' && !isAdmin) {
      alert('You have to be an admin to do that');
      return;
    }

    const confirmed = confirm(`Copy ${VERSION_LABELS[copyFrom]} to ${VERSION_LABELS[copyTo]}? This will overwrite the destination.`);
    if (!confirmed) return;

    setSyncStatus('syncing');
    const success = await persistenceService.copySplits(copyFrom, copyTo);
    if (success) {
      setShowCopyDialog(false);
      setCurrentVersion(copyTo);
      setSyncStatus('synced');
    } else {
      alert('Failed to copy version');
      setSyncStatus('error');
    }
  };

  // Calculate armor distribution for mains only
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

  // Update group statistics
  const updateGroupStats = (group: SplitGroup): SplitGroup => {
    const activePlayers = group.players.filter(p => !p.isOrphaned);
    const totalIlvl = activePlayers.reduce((sum, p) => sum + p.ilvl, 0);
    return {
      ...group,
      avgIlvl: activePlayers.length > 0 ? totalIlvl / activePlayers.length : 0,
      armor: calculateArmor(group.players)
    };
  };

  // Create a new empty split group using buff/utility structure from an existing group
  const createEmptyGroup = (groupNumber: number, templateGroup?: SplitGroup): SplitGroup => {
    const buffs = templateGroup
      ? templateGroup.buffs.map(b => ({ ...b, active: false }))
      : [];
    const utility = templateGroup
      ? templateGroup.utility.map(u => ({ ...u, active: false }))
      : [];
    return {
      name: `Split Group ${groupNumber}`,
      avgIlvl: 0,
      players: [],
      helpers: [],
      buffs,
      utility,
      armor: { cloth: 0, leather: 0, mail: 0, plate: 0 }
    };
  };

  // Request a group count change - shows warning modal
  const requestGroupCountChange = (newCount: number) => {
    if (newCount < 2 || newCount > 6) return;
    if (newCount === currentSplits.length) return;
    setPendingGroupCount(newCount);
    setShowGroupCountWarning(true);
  };

  // Apply the confirmed group count change
  const applyGroupCountChange = () => {
    if (pendingGroupCount === null) return;
    const newCount = pendingGroupCount;
    const template = currentSplits[0];
    let newSplits: SplitGroup[];

    if (newCount > currentSplits.length) {
      newSplits = currentSplits.map(g => updateGroupStats({ ...g, players: [], helpers: [] }));
      for (let i = currentSplits.length + 1; i <= newCount; i++) {
        newSplits.push(createEmptyGroup(i, template));
      }
    } else {
      newSplits = currentSplits.slice(0, newCount).map(g =>
        updateGroupStats({ ...g, players: [], helpers: [] })
      );
    }

    setShowGroupCountWarning(false);
    setPendingGroupCount(null);
    saveWebSplits(newSplits);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, playerName: string, charName: string, isMain: boolean, server: string | undefined, fromGroupIdx: number) => {
    e.dataTransfer.setData('playerName', playerName);
    e.dataTransfer.setData('charName', charName);
    e.dataTransfer.setData('isMain', isMain.toString());
    e.dataTransfer.setData('server', server || "");
    e.dataTransfer.setData('fromGroupIdx', fromGroupIdx.toString());
  };

  const handleDrop = (e: React.DragEvent, toGroupIdx: number) => {
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

  // Change character assignment
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

  // Helper management functions
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
    e.dataTransfer.setData('dragType', 'helper');
    e.dataTransfer.setData('helperIdx', helperIdx.toString());
    e.dataTransfer.setData('helperName', helper.name);
    e.dataTransfer.setData('helperClass', helper.className);
    e.dataTransfer.setData('fromGroupIdx', fromGroupIdx.toString());
  };

  // Group players by role for display
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

  // Loading state
  if (isInitialLoad || !currentSplits || currentSplits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-600">
        <Loader2 className="animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-xs">Loading Split Configuration...</p>
      </div>
    );
  }

  const gridMaxWidth = `${currentSplits.length * 800 + (currentSplits.length - 1) * 24}px`;

  return (
    <div className="space-y-6">
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Header section with version selection and sync status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-[#0c0c0e]/50 p-3 rounded-2xl border border-white/5 gap-4 shadow-xl mx-auto" style={{ maxWidth: gridMaxWidth }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-wrap p-1 bg-black rounded-xl border border-white/5 gap-1">
            <button
              onClick={() => setCurrentVersion('main')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentVersion === 'main' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Globe size={14} />
              Main Setup
            </button>
            <button
              onClick={() => setCurrentVersion('alt1')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentVersion === 'alt1' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Globe size={14} />
              Alternative Setup1
            </button>
            <button
              onClick={() => setCurrentVersion('alt2')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentVersion === 'alt2' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Globe size={14} />
              Alternative Setup2
            </button>
            <button
              onClick={() => setCurrentVersion('alt3')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${currentVersion === 'alt3' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Globe size={14} />
              Alternative Setup3
            </button>
          </div>

          <button
            onClick={() => setShowCopyDialog(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:border-white/10 transition-all"
          >
            <Share2 size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Copy Setup</span>
          </button>

          {/* Group count control */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
            <Layers size={14} className="text-slate-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Groups:</span>
            {isAdmin ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => requestGroupCountChange(currentSplits.length - 1)}
                  disabled={currentSplits.length <= 2}
                  className="w-5 h-5 flex items-center justify-center rounded bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Remove a group"
                >
                  <Minus size={10} />
                </button>
                <span className="text-[13px] font-black text-white w-5 text-center">{currentSplits.length}</span>
                <button
                  onClick={() => requestGroupCountChange(currentSplits.length + 1)}
                  disabled={currentSplits.length >= 6}
                  className="w-5 h-5 flex items-center justify-center rounded bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Add a group"
                >
                  <Plus size={10} />
                </button>
              </div>
            ) : (
              <span className="text-[13px] font-black text-white">{currentSplits.length}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {syncStatus === 'syncing' ? (
                <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                  <Loader2 size={12} className="animate-spin" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{VERSION_LABELS[currentVersion]} - Syncing...</span>
                </div>
              ) : syncStatus === 'synced' ? (
                <div className="flex items-center gap-2 text-emerald-500">
                  <Cloud size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{VERSION_LABELS[currentVersion]} - Cloud Synced</span>
                  {isRealtimeConnected && (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-600">•</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Real-time sync active" />
                      </div>
                      {activeUsers > 0 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full">
                          <Eye size={10} className="text-blue-400" />
                          <span className="text-[9px] font-bold text-blue-400 tracking-wide">
                            {activeUsers} {activeUsers === 1 ? 'viewer' : 'viewers'}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : syncStatus === 'error' ? (
                <div className="flex items-center gap-2 text-red-500">
                  <CloudOff size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Cloud Error</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-600">
                  <Cloud size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{VERSION_LABELS[currentVersion]} - Local Session</span>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-white/10" />

            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="group flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors"
                title="Logout from admin account"
              >
                <LogOut size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Logout Admin</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginDialog(true)}
                className="group flex items-center gap-2 text-indigo-500 hover:text-indigo-400 transition-colors"
                title="Login as admin"
              >
                <LogIn size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main split groups display */}
      <div
        className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${currentSplits.length}, minmax(420px, 800px))`,
          maxWidth: gridMaxWidth,
        }}
      >
        {currentSplits.map((group, groupIdx) => (
          <div 
            key={groupIdx} 
            className="bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, groupIdx)}
          >
            {/* Group header with name, stats, and counts */}
            <div className="p-6 bg-indigo-500/5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">{group.name}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  Average iLvl: <span className="text-indigo-400">{group.avgIlvl.toFixed(1)}</span> 
                  <span className="text-slate-700"> (Active only)</span>
                </p>
              </div>
              
              {/* UPDATED: Count display showing Mains/Total instead of Active Chars */}
              <div className="flex flex-col items-end gap-1">
                <div className="px-3 py-1 bg-black rounded-lg border border-white/5 text-[10px] font-black uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    {/* Mains count in amber color */}
                    <span className="text-amber-500">
                      {group.players.filter(p => !p.isOrphaned && p.isMain).length} Mains
                    </span>
                    <span className="text-slate-500">/</span>
                    {/* Total count including helpers */}
                    <span className="text-indigo-400">
                      {group.players.filter(p => !p.isOrphaned).length + (group.helpers || []).length} Total
                    </span>
                  </div>
                </div>
                
                {/* Helpers count - displayed separately */}
                {(group.helpers || []).length > 0 && (
                  <div className="px-3 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                    <HandHelping size={10} />
                    {(group.helpers || []).length} Helpers
                  </div>
                )}
                
                {/* Deleted players count - less prominent since it's rare */}
                {group.players.filter(p => p.isOrphaned).length > 0 && (
                  <div className="px-3 py-1 bg-red-500/10 rounded-lg border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5">
                    <AlertTriangle size={10} />
                    {group.players.filter(p => p.isOrphaned).length} Deleted
                  </div>
                )}
              </div>
            </div>

            {/* Group content divided into left (players) and right (stats) sections */}
            <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left section: Players organized by role */}
              <div className="lg:col-span-8 space-y-6">
                {Object.keys(PlayerRole).filter(r => r !== 'UNKNOWN').sort((a,b) => ROLE_PRIORITY[a as PlayerRole] - ROLE_PRIORITY[b as PlayerRole]).map(roleKey => {
                  const role = PlayerRole[roleKey as keyof typeof PlayerRole];
                  const membersOfRole = playersByRole[role];
                  const orphanedCharsOfRole = group.players.filter(p => p.role === role && p.isOrphaned);

                  if (membersOfRole.length === 0 && orphanedCharsOfRole.length === 0) return null;

                  return (
                    <div key={role} className="space-y-2">
                      <div className="flex items-center gap-2 px-2">
                        <RoleIcon role={role} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{role}</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {membersOfRole.map((member, idx) => {
                          const assignedChar = group.players.find(p => p.playerName === member.name && !p.isOrphaned);

                          if (assignedChar) {
                            const isOrphaned = assignedChar.isOrphaned || false;
                            const tooltipContent = isOrphaned
                              ? `DELETED PLAYER: ${assignedChar.playerName} | Character: ${assignedChar.name} (${assignedChar.className}) | Server: ${assignedChar.server || 'Unknown'} | Item Level: ${assignedChar.ilvl} | Type: ${assignedChar.isMain ? 'Main' : 'Alt'} | WARNING: This player no longer exists in the roster`
                              : '';

                            const characterCard = (
                              <div
                                key={member.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, member.name, assignedChar.name, assignedChar.isMain, assignedChar.server, groupIdx)}
                                onClick={() => setEditMember({ memberName: member.name, groupIndex: groupIdx })}
                                className={`flex flex-col p-2.5 rounded-xl transition-all duration-300 group cursor-grab active:cursor-grabbing ${
                                  isOrphaned
                                    ? 'bg-red-500/[0.03] border-2 border-red-500 hover:border-red-400 hover:bg-red-500/[0.06]'
                                    : 'bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                                } ${
                                  // NEW: Highlight effect for armor type hover or lock with armor-specific colors
                                  (() => {
                                    if (isOrphaned || !assignedChar.isMain) return '';
                                    const charArmorType = getArmorTypeForClass(assignedChar.className);
                                    const isHovered = highlightedArmorType === charArmorType && highlightedGroupIndex === groupIdx;
                                    const isLocked = lockedArmorTypes.has(`${groupIdx}-${charArmorType}`);
                                    if (isLocked || isHovered) {
                                      const colors = ARMOR_COLORS[charArmorType];
                                      return `!${colors.border} !${colors.bg} ${colors.shadow}`;
                                    }
                                    return '';
                                  })()
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 group">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5">
                                        {isOrphaned && <AlertTriangle size={10} className="text-red-500" />}
                                        <span
                                          className="text-xs font-black truncate"
                                          style={{ color: CLASS_COLORS[assignedChar.className] }}
                                        >
                                          {assignedChar.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[8px] font-bold uppercase px-1 rounded ${(assignedChar as any).isMainMismatch ? 'bg-red-500/25 text-red-500 animate-pulse' : assignedChar.isMain ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'}`}>
                                          {assignedChar.isMain ? 'Main' : 'Twink'}{(assignedChar as any).isMainMismatch ? '!' : ''}
                                        </span>
                                        <span className="text-[7px] text-slate-600 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                          ({member.name})
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[11px] font-black px-1.5 py-0.5 rounded ${assignedChar.ilvl >= minIlvl ? 'text-emerald-400 bg-emerald-400/5' : 'text-red-500 bg-red-500/10'}`}>
                                      {assignedChar.ilvl}
                                    </span>
                                    <Settings2 size={10} className="text-slate-700 opacity-0 group-hover:opacity-100" />
                                  </div>
                                </div>
                                {isOrphaned && (
                                  <div className="mt-2 pt-2 border-t border-red-500/20 flex items-center gap-1.5">
                                    <div className="px-2 py-0.5 bg-red-500/10 rounded border border-red-500/20 flex items-center gap-1">
                                      <AlertTriangle size={8} className="text-red-500" />
                                      <span className="text-[8px] font-black uppercase text-red-500">Player Deleted: {assignedChar.playerName}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );

                            return isOrphaned ? (
                              <Tooltip key={member.id} content={tooltipContent}>
                                {characterCard}
                              </Tooltip>
                            ) : characterCard;
                          } else {
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
                        })}

                        {orphanedCharsOfRole.map((orphanedChar, idx) => {
                          const tooltipContent = `DELETED PLAYER: ${orphanedChar.playerName} | Character: ${orphanedChar.name} (${orphanedChar.className}) | Server: ${orphanedChar.server || 'Unknown'} | Item Level: ${orphanedChar.ilvl} | Type: ${orphanedChar.isMain ? 'Main' : 'Alt'} | WARNING: This player no longer exists in the roster`;

                          return (
                            <Tooltip key={`orphaned-${idx}`} content={tooltipContent}>
                              <div
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, orphanedChar.playerName, orphanedChar.name, orphanedChar.isMain, orphanedChar.server, groupIdx)}
                                onClick={() => setEditMember({ memberName: orphanedChar.playerName, groupIndex: groupIdx })}
                                className="flex flex-col p-2.5 rounded-xl transition-all group cursor-grab active:cursor-grabbing bg-red-500/[0.03] border-2 border-red-500 hover:border-red-400 hover:bg-red-500/[0.06]"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5">
                                        <AlertTriangle size={10} className="text-red-500" />
                                        <span className="text-xs font-black truncate" style={{ color: CLASS_COLORS[orphanedChar.className] }}>{orphanedChar.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                          <span className={`text-[8px] font-bold uppercase px-1 rounded ${(orphanedChar as any).isMainMismatch ? 'bg-orange-500/15 text-orange-400' : orphanedChar.isMain ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'}`}>
                                              {orphanedChar.isMain ? 'Main' : 'Twink'}{(orphanedChar as any).isMainMismatch ? '!' : ''}
                                          </span>
                                          <span className="text-[7px] text-slate-600 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">({orphanedChar.playerName})</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className={`text-[11px] font-black px-1.5 py-0.5 rounded ${orphanedChar.ilvl >= minIlvl ? 'text-indigo-400 bg-indigo-400/5' : 'text-red-500 bg-red-500/10'}`}>
                                          {orphanedChar.ilvl}
                                      </span>
                                      <Settings2 size={10} className="text-slate-700 opacity-0 group-hover:opacity-100" />
                                  </div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-red-500/20 flex items-center gap-1.5">
                                  <div className="px-2 py-0.5 bg-red-500/10 rounded border border-red-500/20 flex items-center gap-1">
                                    <AlertTriangle size={8} className="text-red-500" />
                                    <span className="text-[8px] font-black uppercase text-red-500">Player Deleted: {orphanedChar.playerName}</span>
                                  </div>
                                </div>
                              </div>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Helpers section */}
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
                        draggable={true}
                        onDragStart={(e) => handleHelperDragStart(e, hIdx, helper, groupIdx)}
                        className={`flex items-center justify-between p-2.5 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 hover:border-amber-500/20 transition-all group cursor-grab active:cursor-grabbing hover:bg-amber-500/[0.06]`}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical size={12} className="text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex flex-col">
                            <span className="text-xs font-black truncate" style={{ color: CLASS_COLORS[helper.className] }}>{helper.name}</span>
                            <span className="text-[8px] font-bold uppercase px-1 rounded bg-amber-500/10 text-amber-500 w-fit">Helper</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeHelper(groupIdx, hIdx); }}
                          className="p-1 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    {addingHelperToGroup === groupIdx && (
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

                    {addingHelperToGroup !== groupIdx && (
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

              {/* Right section: Group statistics (buffs, armor, utility) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Raid Buffs section */}
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

                {/* UPDATED: Armor Class section with hover highlighting */}
                <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Boxes size={12} className="text-indigo-500" /> Armor Class
                    </h5>
                    <span className="text-[7px] font-black uppercase tracking-tighter text-slate-600">Mains Only</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(group.armor).map(([type, count]) => {
                      // Determine which classes wear this armor type
                      const armorClasses: WoWClass[] = (() => {
                        switch(type) {
                          case 'cloth': return [WoWClass.MAGE, WoWClass.PRIEST, WoWClass.WARLOCK];
                          case 'leather': return [WoWClass.DRUID, WoWClass.MONK, WoWClass.ROGUE, WoWClass.DEMON_HUNTER];
                          case 'mail': return [WoWClass.HUNTER, WoWClass.SHAMAN, WoWClass.EVOKER];
                          case 'plate': return [WoWClass.WARRIOR, WoWClass.PALADIN, WoWClass.DEATH_KNIGHT];
                          default: return [];
                        }
                      })();
                      
                      // Find main players wearing this armor type
                      const mainPlayersWithArmor = group.players
                        .filter(p => p.isMain && !p.isOrphaned && armorClasses.includes(p.className))
                        .map(p => p.name);
                      
                      const hasPlayers = mainPlayersWithArmor.length > 0;
                      const isHovered = highlightedArmorType === type && highlightedGroupIndex === groupIdx;
                      const isLocked = lockedArmorTypes.has(`${groupIdx}-${type}`);
                      const isActive = isLocked || isHovered;
                      const colors = ARMOR_COLORS[type];

                      return (
                        <Tooltip
                          key={type}
                          content={`${hasPlayers ? `Click to ${isLocked ? 'unlock' : 'lock'} highlighting (multiple allowed)\n\nCurrent mains: ${mainPlayersWithArmor.join(', ')}` : ''}`}
                        >
                          <div
                            className={`bg-white/[0.02] border p-2 rounded-lg text-center transition-all duration-200 relative ${
                              hasPlayers
                                ? `cursor-pointer border-white/5 ${!isActive ? colors.hoverBorder + ' ' + colors.hoverBg : ''}`
                                : 'border-white/5 opacity-60 cursor-not-allowed'
                            } ${isActive ? `${colors.border} ${colors.bg} ${colors.shadow}` : ''}`}
                            onMouseEnter={() => {
                              if (hasPlayers && !isLocked) {
                                setHighlightedArmorType(type);
                                setHighlightedGroupIndex(groupIdx);
                              }
                            }}
                            onMouseLeave={() => {
                              if (!isLocked) {
                                setHighlightedArmorType(null);
                                setHighlightedGroupIndex(null);
                              }
                            }}
                            onClick={() => handleArmorClick(type, groupIdx, hasPlayers)}
                          >
                            <span className="block text-[8px] font-black uppercase text-slate-600 mb-1">{type}</span>
                            <span className={`text-sm text-[20px] font-black ${
                              hasPlayers
                                ? isActive ? colors.text : 'text-white'
                                : 'text-slate-700'
                            }`}>
                              {count}
                            </span>

                            {/* Glow effect when active */}
                            {isActive && (
                              <div className="absolute inset-0 rounded-lg pointer-events-none">
                                <div className={`absolute inset-0 ${colors.bg} rounded-lg blur-sm`}></div>
                              </div>
                            )}

                            {/* Lock icon when locked */}
                            {isLocked && (
                              <div className="absolute top-1 left-1">
                                <Lock size={10} className={colors.text} />
                              </div>
                            )}

                            {/* Indicator dot if there are players with this armor */}
                            {hasPlayers && (
                              <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                                isActive ? colors.indicator : 'bg-indigo-500/60'
                              }`}></div>
                            )}
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                {/* Key Utility section */}
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

      {/* Edit member modal */}
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
                const activePlayerInGroup = currentSplits[editMember.groupIndex].players.find(p => p.playerName === editMember.memberName);
                const isOrphanedAssignment = activePlayerInGroup?.isOrphaned || false;

                if (!player && !isOrphanedAssignment) {
                  return <p className="text-slate-500 text-xs italic">Member nicht im Roster gefunden.</p>;
                }

                if (isOrphanedAssignment) {
                  return (
                    <>
                      <div className="bg-red-500/10 border-2 border-red-500 rounded-xl p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-black uppercase text-red-500 mb-1">Player No Longer Exists</h4>
                            <p className="text-[11px] text-red-400 leading-relaxed">
                              The player "<span className="font-black">{activePlayerInGroup.playerName}</span>" has been removed from the roster. This character assignment is preserved for reference but should be removed or reassigned.
                            </p>
                            <div className="mt-3 p-3 bg-black/40 rounded-lg border border-red-500/20">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Last Known Information:</p>
                              <div className="space-y-1 text-[10px] text-slate-300">
                                <p><span className="text-slate-500">Character:</span> <span className="font-black" style={{ color: CLASS_COLORS[activePlayerInGroup.className] }}>{activePlayerInGroup.name}</span></p>
                                <p><span className="text-slate-500">Class:</span> {activePlayerInGroup.className}</p>
                                <p><span className="text-slate-500">Server:</span> {activePlayerInGroup.server || 'Unknown'}</p>
                                <p><span className="text-slate-500">Item Level:</span> {activePlayerInGroup.ilvl}</p>
                                <p><span className="text-slate-500">Type:</span> {activePlayerInGroup.isMain ? 'Main' : 'Alt'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => changeCharacter(editMember.groupIndex, editMember.memberName, null)}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[11px] font-black uppercase tracking-widest transition-all"
                      >
                        <Trash2 size={16} />
                        Remove Orphaned Assignment
                      </button>
                    </>
                  );
                }

                const allChars = [player.mainCharacter, ...player.splits];

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

      {/* Copy setup dialog */}
      {showCopyDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Share2 className="text-indigo-400" size={20} />
                <div>
                  <h3 className="text-lg font-black text-white uppercase">Copy Setup</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Duplicate configuration between versions</p>
                </div>
              </div>
              <button onClick={() => setShowCopyDialog(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Copy From</label>
                <select
                  value={copyFrom}
                  onChange={(e) => setCopyFrom(e.target.value as VersionKey)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/40"
                >
                  {(Object.keys(VERSION_LABELS) as VersionKey[]).map(key => (
                    <option key={key} value={key}>{VERSION_LABELS[key]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Copy To</label>
                <select
                  value={copyTo}
                  onChange={(e) => setCopyTo(e.target.value as VersionKey)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/40"
                >
                  {(Object.keys(VERSION_LABELS) as VersionKey[]).map(key => (
                    <option key={key} value={key}>{VERSION_LABELS[key]}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCopyVersion}
                  disabled={copyFrom === copyTo}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Share2 size={14} />
                  Copy Setup
                </button>
                <button
                  onClick={() => setShowCopyDialog(false)}
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/5 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:text-white hover:border-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group count warning modal */}
      {showGroupCountWarning && pendingGroupCount !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-500" size={20} />
                <div>
                  <h3 className="text-lg font-black text-white uppercase">Change Group Count</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {currentSplits.length} &rarr; {pendingGroupCount} groups
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowGroupCountWarning(false); setPendingGroupCount(null); }}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-black text-red-400 uppercase tracking-wide">All character assignments will be cleared</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Changing the group count will remove every character assignment from all groups across this setup. Every player will remain as a pending slot but will need to be reassigned.
                    </p>
                    {pendingGroupCount < currentSplits.length && (
                      <p className="text-[11px] text-red-400 font-bold leading-relaxed">
                        Groups {pendingGroupCount + 1} through {currentSplits.length} and all their data will be permanently removed.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={applyGroupCountChange}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-red-500 transition-all"
                >
                  <Layers size={14} />
                  Confirm Change
                </button>
                <button
                  onClick={() => { setShowGroupCountWarning(false); setPendingGroupCount(null); }}
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/5 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:text-white hover:border-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin login dialog */}
      {showLoginDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="text-indigo-400" size={20} />
                <div>
                  <h3 className="text-lg font-black text-white uppercase">Admin Login</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Required for main setup editing</p>
                </div>
              </div>
              <button onClick={() => setShowLoginDialog(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Username</label>
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/40"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLogin();
                    if (e.key === 'Escape') setShowLoginDialog(false);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/40"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLogin();
                    if (e.key === 'Escape') setShowLoginDialog(false);
                  }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleLogin}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all"
                >
                  <LogIn size={14} />
                  Login
                </button>
                <button
                  onClick={() => setShowLoginDialog(false)}
                  className="px-4 py-3 rounded-lg bg-white/5 border border-white/5 text-slate-400 text-[11px] font-black uppercase tracking-widest hover:text-white hover:border-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};