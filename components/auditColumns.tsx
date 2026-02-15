import React from 'react';
import { Character, CLASS_COLORS, PlayerRole } from '../types';
import { IlvlThresholds } from '../services/configService';
import {
  Shield, Heart, Sword, Target, CheckCircle2, Eye,
  Zap, Box, Trophy, Gem, Compass, Users2, Sparkles,
  Award, BarChart, Swords, Hexagon, Wand2, Coins,
  Crown, Activity, Globe
} from 'lucide-react';

export type FlatChar = Character & { isMain: boolean; playerName: string; role: PlayerRole };

export interface AuditColumn {
  key: string;
  label: string;
  getValue: (c: FlatChar) => string | number | boolean | undefined;
  sortType: 'string' | 'number';
  center?: boolean;
  render: (c: FlatChar) => React.ReactNode;
}

export interface HeaderGroup {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  colorClass: string;
  columns: AuditColumn[];
}

const RoleIcon = ({ role }: { role: PlayerRole }) => {
  switch (role) {
    case PlayerRole.TANK: return <Shield size={10} className="text-blue-400" />;
    case PlayerRole.HEALER: return <Heart size={10} className="text-emerald-400" />;
    case PlayerRole.MELEE: return <Sword size={10} className="text-red-400" />;
    case PlayerRole.RANGE: return <Target size={10} className="text-sky-400" />;
    default: return <span className="text-slate-700">-</span>;
  }
};

const SLOTS = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'mainhand', 'offhand'];

export const getHeaderGroups = (thresholds: IlvlThresholds): HeaderGroup[] => [
  {
    id: 'identity',
    label: 'IDENTITY',
    icon: Users2,
    colorClass: 'text-sky-400',
    columns: [
      {
        key: 'rank', label: 'Rank', sortType: 'string', center: true,
        getValue: c => c.rank || '',
        render: c => <span className="text-[9px] text-slate-600 font-black">{c.rank}</span>,
      },
      {
        key: 'className', label: 'Class', sortType: 'string', center: false,
        getValue: c => c.className,
        render: c => <span className="text-[9px] text-slate-500 font-bold uppercase">{c.className}</span>,
      },
      {
        key: 'name', label: 'Character', sortType: 'string', center: false,
        getValue: c => c.name,
        render: c => (
          <div className="flex items-center gap-2">
            {c.thumbnailUrl ? (
              <img src={c.thumbnailUrl} className="w-6 h-6 rounded border border-white/10" alt="" />
            ) : (
              <div className="w-6 h-6 rounded bg-white/5 border border-white/5" />
            )}
            <span className="text-[11px] font-black whitespace-nowrap" style={{ color: CLASS_COLORS[c.className] }}>{c.name}</span>
          </div>
        ),
      },
      {
        key: 'playerName', label: 'Member', sortType: 'string', center: false,
        getValue: c => c.playerName,
        render: c => <span className="text-[10px] text-slate-500 font-bold">{c.playerName}</span>,
      },
      {
        key: 'role', label: 'Role', sortType: 'string', center: true,
        getValue: c => c.role,
        render: c => <div className="flex justify-center"><RoleIcon role={c.role || PlayerRole.UNKNOWN} /></div>,
      },
    ],
  },
  {
    id: 'performance',
    label: 'PERFORMANCE',
    icon: Zap,
    colorClass: 'text-amber-400',
    columns: [
      {
        key: 'itemLevel', label: 'iLvl', sortType: 'number', center: true,
        getValue: c => c.itemLevel,
        render: c => <span className="text-[12px] font-black text-white">{c.itemLevel}</span>,
      },
      {
        key: 'mPlusRating', label: 'M+ Score', sortType: 'number', center: true,
        getValue: c => c.mPlusRating || 0,
        render: c => <span className="text-[11px] text-amber-500 font-black">{c.mPlusRating || 0}</span>,
      },
      {
        key: 'weeklyTenPlusCount', label: 'ID 10+', sortType: 'number', center: true,
        getValue: c => c.weeklyTenPlusCount || 0,
        render: c => <span className="text-[10px] text-sky-400 font-black">{c.weeklyTenPlusCount || 0}</span>,
      },
      {
        key: 'raidSummary', label: 'Raid', sortType: 'string', center: true,
        getValue: c => c.raidProgression?.summary || '0/8 N',
        render: c => <span className="text-[10px] text-slate-300 font-black">{c.raidProgression?.summary || '0/8 N'}</span>,
      },
      {
        key: 'aotc', label: 'AotC', sortType: 'number', center: true,
        getValue: c => c.raidProgression?.aotc ? 1 : 0,
        render: c => <CheckCircle2 size={12} className={c.raidProgression?.aotc ? "text-sky-400 mx-auto" : "text-slate-800 mx-auto"} />,
      },
      {
        key: 'ce', label: 'CE', sortType: 'number', center: true,
        getValue: c => c.raidProgression?.ce ? 1 : 0,
        render: c => <CheckCircle2 size={12} className={c.raidProgression?.ce ? "text-amber-500 drop-shadow-[0_0_8px_#f59e0b] mx-auto" : "text-slate-800 mx-auto"} />,
      },
    ],
  },
  {
    id: 'gear',
    label: 'GEAR OVERVIEW',
    icon: Sparkles,
    colorClass: 'text-emerald-400',
    columns: [
      { key: 'sockets', label: 'Sockets', sortType: 'number', center: true, getValue: c => c.gearAudit?.sockets ?? 0, render: c => <span className="text-[11px] text-sky-400 font-black">{c.gearAudit?.sockets}</span> },
      { key: 'tierCount', label: 'Tier', sortType: 'number', center: true, getValue: c => c.gearAudit?.tierCount ?? 0, render: c => <span className="text-[11px] text-emerald-500 font-black">{c.gearAudit?.tierCount}/4</span> },
      { key: 'sparkItems', label: 'Sparks', sortType: 'number', center: true, getValue: c => c.gearAudit?.sparkItems ?? 0, render: c => <span className="text-[11px] text-amber-500 font-black">{c.gearAudit?.sparkItems}</span> },
    ],
  },
  {
    id: 'enchants',
    label: 'ENCHANT AUDIT',
    icon: Wand2,
    colorClass: 'text-sky-400',
    columns: [
      { key: 'enchantRank', label: 'Rating', sortType: 'number', center: true, getValue: c => c.gearAudit?.enchants.totalRank ?? 0, render: c => <span className="text-[10px] text-sky-400 font-black">R{c.gearAudit?.enchants.totalRank}</span> },
      { key: 'enchantMissing', label: 'Missing', sortType: 'number', center: true, getValue: c => c.gearAudit?.enchants.missingCount ?? 0, render: c => { const m = c.gearAudit?.enchants.missingCount ?? 0; return <span className={`text-[10px] font-black ${m > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{m}</span>; } },
    ],
  },
  {
    id: 'stats',
    label: 'STAT ANALYSIS (%)',
    icon: BarChart,
    colorClass: 'text-sky-400',
    columns: [
      { key: 'critPct', label: 'Crit%', sortType: 'number', center: true, getValue: c => c.gearAudit?.stats.critPct ?? 0, render: c => <span className="text-[10px] text-white font-black">{c.gearAudit?.stats.critPct}%</span> },
      { key: 'hastePct', label: 'Haste%', sortType: 'number', center: true, getValue: c => c.gearAudit?.stats.hastePct ?? 0, render: c => <span className="text-[10px] text-white font-black">{c.gearAudit?.stats.hastePct}%</span> },
      { key: 'masteryPct', label: 'Mast%', sortType: 'number', center: true, getValue: c => c.gearAudit?.stats.masteryPct ?? 0, render: c => <span className="text-[10px] text-white font-black">{c.gearAudit?.stats.masteryPct}%</span> },
      { key: 'versPct', label: 'Vers%', sortType: 'number', center: true, getValue: c => c.gearAudit?.stats.versPct ?? 0, render: c => <span className="text-[10px] text-white font-black">{c.gearAudit?.stats.versPct}%</span> },
    ],
  },
  {
    id: 'slots',
    label: 'SLOT-BY-SLOT ILVL',
    icon: Gem,
    colorClass: 'text-sky-400',
    columns: SLOTS.map(s => ({
      key: `slot-${s}`, label: s, sortType: 'number' as const, center: true,
      getValue: (c: FlatChar) => c.gearAudit?.slots[s]?.ilvl ?? 0,
      render: (c: FlatChar) => {
        const item = c.gearAudit?.slots[s];
        const ilvl = item?.ilvl;
        const clr = ilvl && ilvl >= thresholds.mythic_ilvl ? 'text-amber-400' : ilvl && ilvl >= thresholds.heroic_ilvl ? 'text-sky-400' : 'text-slate-400';
        return (
          <div className="flex flex-col">
            <span className={`text-[11px] font-black ${clr}`}>{ilvl || '-'}</span>
            <span className="text-[7px] font-bold uppercase opacity-40 group-hover/slot:opacity-100 transition-opacity whitespace-nowrap">{item?.track || '-'}</span>
          </div>
        );
      },
    })),
  },
  {
    id: 'collections',
    label: 'COLLECTIONS',
    icon: Hexagon,
    colorClass: 'text-teal-400',
    columns: [
      { key: 'mounts', label: 'Mounts', sortType: 'number', center: true, getValue: c => c.collections?.mounts || 0, render: c => <span className="text-[11px] text-teal-400 font-black">{c.collections?.mounts || 0}</span> },
      { key: 'pets', label: 'Pets', sortType: 'number', center: true, getValue: c => c.collections?.pets || 0, render: c => <span className="text-[11px] text-teal-400 font-black">{c.collections?.pets || 0}</span> },
      { key: 'toys', label: 'Toys', sortType: 'number', center: true, getValue: c => c.collections?.toys || 0, render: c => <span className="text-[11px] text-teal-400 font-black">{c.collections?.toys || 0}</span> },
      { key: 'achievements', label: 'Achievs', sortType: 'number', center: true, getValue: c => c.collections?.achievements || 0, render: c => <span className="text-[11px] text-teal-400 font-black">{c.collections?.achievements || 0}</span> },
      { key: 'titles', label: 'Titles', sortType: 'number', center: true, getValue: c => c.collections?.titles || 0, render: c => <span className="text-[11px] text-teal-400 font-black">{c.collections?.titles || 0}</span> },
    ],
  },
  {
    id: 'pvp',
    label: 'PVP',
    icon: Swords,
    colorClass: 'text-red-500',
    columns: [
      { key: 'pvpHonor', label: 'Honor', sortType: 'number', center: true, getValue: c => c.pvp?.honorLevel || 0, render: c => <span className="text-[10px] text-red-400 font-black">{c.pvp?.honorLevel || 0}</span> },
      { key: 'pvpKills', label: 'HKs', sortType: 'number', center: true, getValue: c => c.pvp?.kills || 0, render: c => <span className="text-[10px] text-red-400">{c.pvp?.kills || 0}</span> },
      { key: 'pvpSolo', label: 'Solo', sortType: 'number', center: true, getValue: c => c.pvp?.ratings.solo || 0, render: c => <span className="text-[10px] text-red-500 font-black">{c.pvp?.ratings.solo || 0}</span> },
      { key: 'pvp2v2', label: '2v2', sortType: 'number', center: true, getValue: c => c.pvp?.ratings.v2 || 0, render: c => <span className="text-[10px] text-red-400">{c.pvp?.ratings.v2 || 0}</span> },
      { key: 'pvp3v3', label: '3v3', sortType: 'number', center: true, getValue: c => c.pvp?.ratings.v3 || 0, render: c => <span className="text-[10px] text-red-400">{c.pvp?.ratings.v3 || 0}</span> },
      { key: 'pvpGames', label: 'Games', sortType: 'number', center: true, getValue: c => c.pvp?.games.season || 0, render: c => <span className="text-[10px] text-red-400">{c.pvp?.games.season || 0}</span> },
    ],
  },
  {
    id: 'mplusRanks',
    label: 'M+ RANKINGS',
    icon: Crown,
    colorClass: 'text-amber-400',
    columns: [
      { key: 'rankRealm', label: 'Realm', sortType: 'number', center: true, getValue: c => c.mPlusRanks?.overall.realm || 0, render: c => <span className="text-[10px] text-amber-400 font-black">{c.mPlusRanks?.overall.realm || '-'}</span> },
      { key: 'rankRegion', label: 'Region', sortType: 'number', center: true, getValue: c => c.mPlusRanks?.overall.region || 0, render: c => <span className="text-[10px] text-amber-400">{c.mPlusRanks?.overall.region || '-'}</span> },
      { key: 'rankClass', label: 'Class', sortType: 'number', center: true, getValue: c => c.mPlusRanks?.class.realm || 0, render: c => <span className="text-[10px] text-amber-400">{c.mPlusRanks?.class.realm || '-'}</span> },
    ],
  },
  {
    id: 'warcraftlogs',
    label: 'WARCRAFTLOGS',
    icon: Activity,
    colorClass: 'text-orange-500',
    columns: [
      {
        key: 'wclBest', label: 'Best%', sortType: 'number', center: true,
        getValue: c => c.warcraftLogs?.bestParse || 0,
        render: c => {
          const v = c.warcraftLogs?.bestParse || 0;
          const clr = v >= 95 ? 'text-orange-500' : v >= 75 ? 'text-blue-400' : 'text-slate-400';
          return <span className={`text-[10px] font-black ${clr}`}>{v || '-'}</span>;
        },
      },
      {
        key: 'wclMed', label: 'Med%', sortType: 'number', center: true,
        getValue: c => c.warcraftLogs?.medianPerformance || 0,
        render: c => {
          const v = c.warcraftLogs?.medianPerformance || 0;
          const clr = v >= 95 ? 'text-orange-500' : v >= 75 ? 'text-blue-400' : 'text-slate-400';
          return <span className={`text-[10px] font-black ${clr}`}>{v || '-'}</span>;
        },
      },
      { key: 'wclAllStar', label: 'AllStar', sortType: 'number', center: true, getValue: c => c.warcraftLogs?.allStarPoints || 0, render: c => <span className="text-[10px] text-orange-400 font-black">{c.warcraftLogs?.allStarPoints || '-'}</span> },
      { key: 'wclBosses', label: 'Bosses', sortType: 'number', center: true, getValue: c => c.warcraftLogs?.bossesLogged || 0, render: c => <span className="text-[10px] text-orange-400">{c.warcraftLogs?.bossesLogged || '-'}</span> },
      { key: 'wclKills', label: 'Kills', sortType: 'number', center: true, getValue: c => c.warcraftLogs?.totalKills || 0, render: c => <span className="text-[10px] text-orange-400">{c.warcraftLogs?.totalKills || '-'}</span> },
    ],
  },
  {
    id: 'weeklyRaid',
    label: 'WEEKLY RAID',
    icon: Swords,
    colorClass: 'text-purple-400',
    columns: [
      {
        key: 'weeklyKillsFormatted', label: 'Kills (N/H/M)', sortType: 'string', center: true,
        getValue: c => {
          const normal = c.weeklyRaidKillDetails?.filter(k => k.difficulty === 'Normal').length ?? 0;
          const heroic = c.weeklyRaidKillDetails?.filter(k => k.difficulty === 'Heroic').length ?? 0;
          const mythic = c.weeklyRaidKillDetails?.filter(k => k.difficulty === 'Mythic').length ?? 0;
          return `${normal}N+${heroic}H+${mythic}M`;
        },
        render: c => {
          const normal = c.weeklyRaidKillDetails?.filter(k => k.difficulty === 'Normal').length ?? 0;
          const heroic = c.weeklyRaidKillDetails?.filter(k => k.difficulty === 'Heroic').length ?? 0;
          const mythic = c.weeklyRaidKillDetails?.filter(k => k.difficulty === 'Mythic').length ?? 0;
          const parts = [];
          if (normal > 0) parts.push(<span key="n" className="text-green-400">{normal}N</span>);
          if (heroic > 0) parts.push(<span key="h" className="text-blue-400">{heroic}H</span>);
          if (mythic > 0) parts.push(<span key="m" className="text-orange-400">{mythic}M</span>);
          if (parts.length === 0) return <span className="text-slate-600">-</span>;
          return <span className="text-[10px] font-black flex gap-1 justify-center">{parts.map((p, i) => i > 0 ? [<span key={`sep${i}`} className="text-slate-600">+</span>, p] : p)}</span>;
        },
      },
      {
        key: 'weeklyRaidBossKills', label: 'Total', sortType: 'number', center: true,
        getValue: c => c.weeklyRaidBossKills ?? 0,
        render: c => {
          const kills = c.weeklyRaidBossKills ?? 0;
          const clr = kills >= 6 ? 'text-emerald-500' : kills >= 4 ? 'text-sky-500' : kills >= 2 ? 'text-amber-500' : 'text-slate-600';
          return <span className={`text-[11px] font-black ${clr}`}>{kills}</span>;
        },
      },
      {
        key: 'raidVaultSlots', label: 'Vault Slots', sortType: 'number', center: true,
        getValue: c => {
          const kills = c.weeklyRaidBossKills ?? 0;
          if (kills >= 6) return 3;
          if (kills >= 4) return 2;
          if (kills >= 2) return 1;
          return 0;
        },
        render: c => {
          const kills = c.weeklyRaidBossKills ?? 0;
          const slots = kills >= 6 ? 3 : kills >= 4 ? 2 : kills >= 2 ? 1 : 0;
          const clr = slots === 3 ? 'text-emerald-500' : slots === 2 ? 'text-sky-500' : slots === 1 ? 'text-amber-500' : 'text-slate-600';
          return <span className={`text-[11px] font-black ${clr}`}>{slots}/3</span>;
        },
      },
      {
        key: 'raidVaultLevel', label: 'Vault Track', sortType: 'string', center: true,
        getValue: c => {
          const details = c.weeklyRaidKillDetails ?? [];
          if (details.some(k => k.difficulty === 'Mythic')) return 'Mythic';
          if (details.some(k => k.difficulty === 'Heroic')) return 'Heroic';
          if (details.some(k => k.difficulty === 'Normal')) return 'Normal';
          return '-';
        },
        render: c => {
          const details = c.weeklyRaidKillDetails ?? [];
          const hasMythic = details.some(k => k.difficulty === 'Mythic');
          const hasHeroic = details.some(k => k.difficulty === 'Heroic');
          const hasNormal = details.some(k => k.difficulty === 'Normal');

          if (hasMythic) return <span className="text-[9px] font-black text-orange-400">MYTHIC</span>;
          if (hasHeroic) return <span className="text-[9px] font-black text-blue-400">HEROIC</span>;
          if (hasNormal) return <span className="text-[9px] font-black text-green-400">NORMAL</span>;
          return <span className="text-[9px] text-slate-600">-</span>;
        },
      },
      {
        key: 'lifetimeRaidBosses', label: 'Lifetime Bosses', sortType: 'number', center: true,
        getValue: c => {
          const bosses = c.raidBossKills ?? [];
          return bosses.filter(b => b.normal > 0 || b.heroic > 0 || b.mythic > 0).length;
        },
        render: c => {
          const bosses = c.raidBossKills ?? [];
          const count = bosses.filter(b => b.normal > 0 || b.heroic > 0 || b.mythic > 0).length;
          return <span className="text-[10px] text-purple-400 font-black">{count}</span>;
        },
      },
    ],
  },
  {
    id: 'vault',
    label: 'GREAT VAULT',
    icon: Trophy,
    colorClass: 'text-sky-400',
    columns: [
      {
        key: 'vaultRank', label: 'Prog.', sortType: 'number', center: true,
        getValue: c => c.gearAudit?.vault.rank ?? 0,
        render: c => <span className="text-[9px] text-sky-400 font-black">{c.gearAudit?.vault.rank}</span>,
      },
      {
        key: 'vault10Plus', label: '10+ Done', sortType: 'number', center: true,
        getValue: c => c.weeklyTenPlusCount || 0,
        render: c => <span className="text-[9px] text-sky-400 font-black">{c.weeklyTenPlusCount}</span>,
      },
      ...([0, 1, 2] as const).map(i => ({
        key: `vaultRaid${i}`, label: `Raid ${i + 1}`, sortType: 'string' as const, center: true,
        getValue: (c: FlatChar) => c.gearAudit?.vault.raid[i]?.label || '-',
        render: (c: FlatChar) => <span className="text-[8px] text-slate-400">{c.gearAudit?.vault.raid[i]?.label || '-'}</span>,
      })),
      ...([0, 1, 2] as const).map(i => ({
        key: `vaultDung${i}`, label: `Dung ${i + 1}`, sortType: 'string' as const, center: true,
        getValue: (c: FlatChar) => c.gearAudit?.vault.dungeon[i]?.label || '-',
        render: (c: FlatChar) => <span className="text-[8px] text-emerald-500 font-bold">{c.gearAudit?.vault.dungeon[i]?.label || '-'}</span>,
      })),
      ...([0, 1, 2] as const).map(i => ({
        key: `vaultWorld${i}`, label: `World ${i + 1}`, sortType: 'string' as const, center: true,
        getValue: (c: FlatChar) => c.gearAudit?.vault.world[i]?.label || '-',
        render: (c: FlatChar) => <span className="text-[8px] text-amber-500">{c.gearAudit?.vault.world[i]?.label || '-'}</span>,
      })),
    ],
  },
  {
    id: 'tracks',
    label: 'EQUIPPED TRACKS',
    icon: Box,
    colorClass: 'text-sky-400',
    columns: [
      { key: 'trackMythic', label: 'Mythic', sortType: 'number', center: true, getValue: c => c.gearAudit?.itemTracks.mythic ?? 0, render: c => <span className="text-[10px] text-amber-400 font-black">{c.gearAudit?.itemTracks.mythic}</span> },
      { key: 'trackHeroic', label: 'Heroic', sortType: 'number', center: true, getValue: c => c.gearAudit?.itemTracks.heroic ?? 0, render: c => <span className="text-[10px] text-sky-400 font-black">{c.gearAudit?.itemTracks.heroic}</span> },
      { key: 'trackChamp', label: 'Champ', sortType: 'number', center: true, getValue: c => c.gearAudit?.itemTracks.champion ?? 0, render: c => <span className="text-[10px] text-emerald-400">{c.gearAudit?.itemTracks.champion}</span> },
      { key: 'trackVet', label: 'Vet', sortType: 'number', center: true, getValue: c => c.gearAudit?.itemTracks.veteran ?? 0, render: c => <span className="text-[10px] text-amber-400">{c.gearAudit?.itemTracks.veteran}</span> },
      { key: 'trackAdv', label: 'Adv', sortType: 'number', center: true, getValue: c => c.gearAudit?.itemTracks.adventurer ?? 0, render: c => <span className="text-[10px] text-slate-400">{c.gearAudit?.itemTracks.adventurer}</span> },
      { key: 'trackExpl', label: 'Expl', sortType: 'number', center: true, getValue: c => c.gearAudit?.itemTracks.explorer ?? 0, render: c => <span className="text-[10px] text-slate-600">{c.gearAudit?.itemTracks.explorer}</span> },
    ],
  },
  {
    id: 'unique',
    label: 'UNIQUE ITEMS',
    icon: Zap,
    colorClass: 'text-sky-400',
    columns: [
      { key: 'reshii', label: 'Reshii', sortType: 'number', center: true, getValue: c => c.gearAudit?.specificItems.reshiiWraps ? 1 : 0, render: c => <CheckCircle2 size={12} className={c.gearAudit?.specificItems.reshiiWraps ? "text-sky-400 mx-auto" : "text-slate-800 mx-auto"} /> },
      { key: 'disc', label: 'DISC', sortType: 'number', center: true, getValue: c => c.gearAudit?.specificItems.discBelt ? 1 : 0, render: c => <CheckCircle2 size={12} className={c.gearAudit?.specificItems.discBelt ? "text-sky-400 mx-auto" : "text-slate-800 mx-auto"} /> },
      { key: 'cyrce', label: 'Cyrce', sortType: 'number', center: true, getValue: c => c.gearAudit?.specificItems.cyrceCirclet ? 1 : 0, render: c => <CheckCircle2 size={12} className={c.gearAudit?.specificItems.cyrceCirclet ? "text-sky-400 mx-auto" : "text-slate-800 mx-auto"} /> },
      { key: 'embel1', label: 'Embel 1', sortType: 'string', center: false, getValue: c => c.gearAudit?.embellishments[0] || '-', render: c => <span className="text-[9px] text-slate-500 font-bold truncate block max-w-[80px]">{c.gearAudit?.embellishments[0] || '-'}</span> },
      { key: 'embel2', label: 'Embel 2', sortType: 'string', center: false, getValue: c => c.gearAudit?.embellishments[1] || '-', render: c => <span className="text-[9px] text-slate-500 font-bold truncate block max-w-[80px]">{c.gearAudit?.embellishments[1] || '-'}</span> },
      { key: 'auditEye', label: 'Audit', sortType: 'number', center: true, getValue: () => 1, render: () => <Eye size={12} className="text-emerald-500 mx-auto" /> },
    ],
  },
  {
    id: 'world',
    label: 'WORLD & REPUTATION',
    icon: Compass,
    colorClass: 'text-emerald-500',
    columns: [
      { key: 'worldQuests', label: 'WQs', sortType: 'number', center: true, getValue: c => c.activities?.worldQuests || 0, render: c => <span className="text-[10px] text-slate-500 font-black">{c.activities?.worldQuests || 0}</span> },
      { key: 'theater', label: 'Theater', sortType: 'number', center: true, getValue: c => c.activities?.events.theater ? 1 : 0, render: c => <CheckCircle2 size={12} className={c.activities?.events.theater ? "text-emerald-500 mx-auto" : "text-slate-800 mx-auto"} /> },
      { key: 'awaken', label: 'Awaken', sortType: 'number', center: true, getValue: c => c.activities?.events.awakening ? 1 : 0, render: c => <CheckCircle2 size={12} className={c.activities?.events.awakening ? "text-emerald-500 mx-auto" : "text-slate-800 mx-auto"} /> },
      { key: 'worldsoul', label: 'Soul', sortType: 'number', center: true, getValue: c => c.activities?.events.worldsoul ? 1 : 0, render: c => <CheckCircle2 size={12} className={c.activities?.events.worldsoul ? "text-emerald-500 mx-auto" : "text-slate-800 mx-auto"} /> },
      { key: 'memories', label: 'Memories', sortType: 'number', center: true, getValue: c => c.activities?.events.memories ? 1 : 0, render: c => <CheckCircle2 size={12} className={c.activities?.events.memories ? "text-emerald-500 mx-auto" : "text-slate-800 mx-auto"} /> },
      { key: 'delves', label: 'Delves', sortType: 'number', center: true, getValue: c => c.activities?.highestMplus || 0, render: c => <span className="text-[10px] text-slate-400 font-black">{c.activities?.highestMplus || 0}</span> },
      { key: 'cofferKeys', label: 'Keys', sortType: 'number', center: true, getValue: c => c.activities?.cofferKeys || 0, render: c => <span className="text-[10px] text-sky-400 font-black">{c.activities?.cofferKeys || 0}</span> },
      { key: 'heroicD', label: 'Heroic D', sortType: 'number', center: true, getValue: c => c.activities?.heroicDungeons || 0, render: c => <span className="text-[10px] text-slate-600">{c.activities?.heroicDungeons || 0}</span> },
      { key: 'mythicD', label: 'Mythic D', sortType: 'number', center: true, getValue: c => c.activities?.mythicDungeons || 0, render: c => <span className="text-[10px] text-slate-600">{c.activities?.mythicDungeons || 0}</span> },
      { key: 'profs', label: 'Profs', sortType: 'string', center: false, getValue: c => c.professions?.map(p => p.name).join(', ') || '', render: c => <span className="text-[10px] text-slate-600 truncate block max-w-[120px]">{c.professions?.map(p => p.name).join(', ')}</span> },
    ],
  },
  {
    id: 'raid',
    label: 'RAID SPECIFICS',
    icon: Award,
    colorClass: 'text-amber-400',
    columns: [
      { key: 'ansurek', label: 'Ansurek', sortType: 'number', center: true, getValue: c => c.raidProgression?.summary?.includes('8/8 M') ? 1 : 0, render: c => <CheckCircle2 size={12} className={c.raidProgression?.summary?.includes('8/8 M') ? "text-emerald-500 mx-auto" : "text-slate-800 mx-auto"} /> },
      { key: 'undermine', label: 'Undermine', sortType: 'number', center: true, getValue: c => c.raidProgression?.summary?.includes('4/8 M') ? 1 : 0, render: c => <CheckCircle2 size={12} className={c.raidProgression?.summary?.includes('4/8 M') ? "text-emerald-500 mx-auto" : "text-slate-800 mx-auto"} /> },
    ],
  },
  {
    id: 'currencies',
    label: 'CURRENCIES',
    icon: Coins,
    colorClass: 'text-amber-500',
    columns: [
      { key: 'valorstones', label: 'Valor', sortType: 'number', center: true, getValue: c => c.currencies?.valorstones || 0, render: c => <span className="text-[10px] text-amber-500 font-black">{c.currencies?.valorstones || 0}</span> },
      { key: 'weathered', label: 'Weath', sortType: 'number', center: true, getValue: c => c.currencies?.weathered || 0, render: c => <span className="text-[10px] text-amber-400">{c.currencies?.weathered || 0}</span> },
      { key: 'carved', label: 'Carved', sortType: 'number', center: true, getValue: c => c.currencies?.carved || 0, render: c => <span className="text-[10px] text-amber-400">{c.currencies?.carved || 0}</span> },
      { key: 'runed', label: 'Runed', sortType: 'number', center: true, getValue: c => c.currencies?.runed || 0, render: c => <span className="text-[10px] text-amber-400">{c.currencies?.runed || 0}</span> },
      { key: 'gilded', label: 'Gilded', sortType: 'number', center: true, getValue: c => c.currencies?.gilded || 0, render: c => <span className="text-[10px] text-amber-500 font-black">{c.currencies?.gilded || 0}</span> },
    ],
  },
  {
    id: 'reputations',
    label: 'REPUTATIONS',
    icon: Globe,
    colorClass: 'text-cyan-400',
    columns: [
      { key: 'repDornogal', label: 'Dornogal', sortType: 'number', center: true, getValue: c => c.reputations?.dornogal || 0, render: c => <span className="text-[9px] text-cyan-400">{c.reputations?.dornogal || 0}</span> },
      { key: 'repDeeps', label: 'Deeps', sortType: 'number', center: true, getValue: c => c.reputations?.deeps || 0, render: c => <span className="text-[9px] text-cyan-400">{c.reputations?.deeps || 0}</span> },
      { key: 'repArathi', label: 'Arathi', sortType: 'number', center: true, getValue: c => c.reputations?.arathi || 0, render: c => <span className="text-[9px] text-cyan-400">{c.reputations?.arathi || 0}</span> },
      { key: 'repThreads', label: 'Threads', sortType: 'number', center: true, getValue: c => c.reputations?.threads || 0, render: c => <span className="text-[9px] text-cyan-400">{c.reputations?.threads || 0}</span> },
      { key: 'repKaresh', label: 'Karesh', sortType: 'number', center: true, getValue: c => c.reputations?.karesh || 0, render: c => <span className="text-[9px] text-cyan-400">{c.reputations?.karesh || 0}</span> },
      { key: 'repBrann', label: 'Brann', sortType: 'number', center: true, getValue: c => c.reputations?.vandals || 0, render: c => <span className="text-[9px] text-cyan-400">{c.reputations?.vandals || 0}</span> },
      { key: 'repUndermine', label: 'Underm.', sortType: 'number', center: true, getValue: c => c.reputations?.undermine || 0, render: c => <span className="text-[9px] text-cyan-400">{c.reputations?.undermine || 0}</span> },
      { key: 'repGallagio', label: 'Gallagio', sortType: 'number', center: true, getValue: c => c.reputations?.gallagio || 0, render: c => <span className="text-[9px] text-cyan-400">{c.reputations?.gallagio || 0}</span> },
    ],
  },
];

export const getAllColumns = (thresholds: IlvlThresholds) => getHeaderGroups(thresholds).flatMap(g => g.columns);

export const HEADER_GROUPS: HeaderGroup[] = getHeaderGroups({
  min_ilvl: 615,
  mythic_ilvl: 626,
  heroic_ilvl: 613,
});

export const ALL_COLUMNS = HEADER_GROUPS.flatMap(g => g.columns);
