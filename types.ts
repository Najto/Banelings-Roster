
/**
 * WoW Class Enumeration.
 * Used for strict typing of character classes throughout the app for styling and logic.
 */
export enum WoWClass {
  DEATH_KNIGHT = 'Death Knight',
  DEMON_HUNTER = 'Demon Hunter',
  DRUID = 'Druid',
  EVOKER = 'Evoker',
  HUNTER = 'Hunter',
  MAGE = 'Mage',
  MONK = 'Monk',
  PALADIN = 'Paladin',
  PRIEST = 'Priest',
  ROGUE = 'Rogue',
  SHAMAN = 'Shaman',
  WARLOCK = 'Warlock',
  WARRIOR = 'Warrior',
  UNKNOWN = 'Unknown'
}

/**
 * Player Roles in a raid environment.
 */
export enum PlayerRole {
  TANK = 'Tank',
  HEALER = 'Healer',
  MELEE = 'Melee',
  RANGE = 'Range',
  UNKNOWN = 'Unknown'
}

/**
 * Priority for sorting roles in the UI (Tank -> Healer -> DPS).
 */
export const ROLE_PRIORITY: Record<PlayerRole, number> = {
  [PlayerRole.TANK]: 1,
  [PlayerRole.HEALER]: 2,
  [PlayerRole.MELEE]: 3,
  [PlayerRole.RANGE]: 4,
  [PlayerRole.UNKNOWN]: 5
};

export interface MPlusRun {
  dungeon: string;
  short_name: string;
  mythic_level: number;
  completed_at: string;
  num_keystone_upgrades: number;
  score: number;
  url: string;
}

export interface RaidProgression {
  summary: string;
  normal_kills: number;
  heroic_kills: number;
  mythic_kills: number;
  total_bosses: number;
  completions?: number;
  aotc?: boolean; // Ahead of the Curve achievement
  ce?: boolean;   // Cutting Edge achievement
}

/**
 * Detailed audit of a specific gear slot (Head, Chest, etc.).
 */
export interface SlotAudit {
  name: string;
  ilvl: number;
  track: string; // e.g., "Heroic", "Mythic"
  enchantRank?: number;
  hasEnchant: boolean;
  isTier?: boolean; // Is this a tier set piece?
  hasGem?: boolean;
  gemsCount?: number;
}

export interface VaultSlot {
  label: string; // Display text (e.g., "+10" or "Heroic")
  ilvl: number;
}

/**
 * Comprehensive Gear Audit object.
 * This is the core data structure for the "Master Audit" view.
 * It is calculated by merging data from Blizzard Equipment API and Raider.io.
 */
export interface GearAudit {
  sockets: number;
  missingSockets: number;
  enchantments: number;
  tierCount: number; // Number of tier pieces equipped (0-5)
  sparkItems: number; // Crafted items
  upgradeTrack: string; // Highest available track on gear
  // Flags for specific slots to check for tier presence
  tierPieces: {
    helm: boolean;
    shoulder: boolean;
    chest: boolean;
    gloves: boolean;
    legs: boolean;
  };
  // Detailed enchant status per slot
  enchants: {
    cloak: boolean;
    chest: boolean;
    wrists: boolean;
    legs: boolean;
    feet: boolean;
    ring1: boolean;
    ring2: boolean;
    weapon: boolean;
    offhand: boolean;
    totalRank: number;
    missingCount: number;
  };
  // Specific named items relevant to the current patch meta
  specificItems: {
    circlet?: { level: number; rank: string };
    belt?: { level: number; spell: string };
    wraps?: { level: number; type: string };
    reshiiWraps?: boolean;
    discBelt?: boolean;
    cyrceCirclet?: boolean;
  };
  embellishments: string[];
  gems: {
    rare: number;
    epic: number;
  };
  // Counts of items per upgrade track
  itemTracks: {
    mythic: number;
    heroic: number;
    champion: number;
    veteran: number;
    adventurer: number;
    explorer: number;
  };
  stats: {
    crit: number;
    haste: number;
    mastery: number;
    vers: number;
    critPct: number;
    hastePct: number;
    masteryPct: number;
    versPct: number;
  };
  slots: Record<string, SlotAudit>;
  // Great Vault Status
  vault: {
    rank: number;
    thisWeek: number; // Number of M+ runs > 10
    raid: [VaultSlot, VaultSlot, VaultSlot];
    dungeon: [VaultSlot, VaultSlot, VaultSlot];
    world: [VaultSlot, VaultSlot, VaultSlot];
    score: number;
  };
}

export interface ReputationAudit {
  dornogal: number;
  deeps: number;
  arathi: number;
  threads: number;
  karesh: number;
  vandals: number;
  undermine: number;
  gallagio: number;
}

export interface ActivityAudit {
  worldQuests: number;
  events: {
    theater: boolean;
    awakening: boolean;
    worldsoul: boolean;
    memories: boolean;
  };
  cofferKeys: number;
  heroicDungeons: number;
  mythicDungeons: number;
  highestMplus: number;
}

export interface MythicPlusRanks {
  overall: { world: number; region: number; realm: number };
  class: { world: number; region: number; realm: number };
}

export interface WeeklyRaidKillDetail {
  bossName: string;
  difficulty: 'Normal' | 'Heroic' | 'Mythic';
  difficultyId: number;
}

export interface RaidKillBaseline {
  resetDate: string;
  bossKills: RaidBossKill[];
  latestKills?: RaidBossKill[];
}

export interface WarcraftLogsData {
  bestParse: number;
  medianPerformance: number;
  bestPerformance: number;
  allStarPoints: number;
  bossesLogged: number;
  totalKills: number;
  weeklyRaidKills?: WeeklyRaidKillDetail[];
}

export interface RaidBossKill {
  name: string;
  normal: number;
  heroic: number;
  mythic: number;
}

/**
 * Represents a single WoW Character (Main or Alt).
 */
export interface Character {
  name: string;
  className: WoWClass;
  spec?: string;
  race?: string;
  rank?: string;
  itemLevel: number;
  mPlusRating?: number;
  weeklyTenPlusCount?: number;
  weeklyHistory?: number[]; // Array of run counts for previous weeks
  recentRuns?: MPlusRun[];
  raidProgression?: RaidProgression;
  gearAudit?: GearAudit;
  currencies?: {
    weathered: number;
    carved: number;
    runed: number;
    gilded: number;
    valorstones: number;
  };
  activities?: ActivityAudit;
  reputations?: ReputationAudit;
  collections?: {
    mounts: number;
    pets: number;
    toys: number;
    achievements: number;
    titles: number;
  };
  pvp?: {
    honorLevel: number;
    kills: number;
    ratings: { solo: number; v2: number; v3: number; rbg: number };
    games: { season: number; weekly: number };
  };
  professions?: { name: string; rank: number }[];
  warcraftLogs?: WarcraftLogsData;
  mPlusRanks?: MythicPlusRanks;
  raidBossKills?: RaidBossKill[];
  raidKillBaseline?: RaidKillBaseline;
  weeklyRaidBossKills?: number;
  weeklyRaidKillDetails?: WeeklyRaidKillDetail[];
  guild?: string;
  lastSeen?: string;
  server?: string;
  isMain?: boolean;
  playerName?: string;
  thumbnailUrl?: string;
  profileUrl?: string;
}

/**
 * Represents a Guild Member, containing their Main and their Alts (Splits).
 */
export interface Player {
  id: string;
  name: string; // Member Name (e.g., "Dekoya")
  role: PlayerRole;
  mainCharacter: Character;
  splits: Character[];
}

export interface RaidBuff {
  name: string;
  active: boolean;
}

export interface ArmorCount {
  cloth: number;
  leather: number;
  mail: number;
  plate: number;
}

/**
 * Represents a logical group for Split Runs (e.g., "Split 1").
 */
export interface HelperCharacter {
  name: string;
  className: WoWClass;
}

export interface SplitGroup {
  name: string;
  avgIlvl: number;
  players: {
    role: PlayerRole;
    name: string;
    playerName: string;
    className: WoWClass;
    isMain: boolean;
    ilvl: number;
    server?: string;
  }[];
  helpers?: HelperCharacter[];
  buffs: RaidBuff[];
  utility: RaidBuff[];
  armor: ArmorCount;
}

export interface MemberMapping {
  memberName: string;
  role: PlayerRole;
}

export const CLASS_COLORS: Record<WoWClass, string> = {
  [WoWClass.DEATH_KNIGHT]: '#C41F3B',
  [WoWClass.DEMON_HUNTER]: '#A330C9',
  [WoWClass.DRUID]: '#FF7D0A',
  [WoWClass.EVOKER]: '#33937F',
  [WoWClass.HUNTER]: '#ABD473',
  [WoWClass.MAGE]: '#3FC7EB',
  [WoWClass.MONK]: '#00FF98',
  [WoWClass.PALADIN]: '#F58CBA',
  [WoWClass.PRIEST]: '#FFFFFF',
  [WoWClass.ROGUE]: '#FFF569',
  [WoWClass.SHAMAN]: '#0070DE',
  [WoWClass.WARLOCK]: '#8787ED',
  [WoWClass.WARRIOR]: '#C79C6E',
  [WoWClass.UNKNOWN]: '#94a3b8'
};
