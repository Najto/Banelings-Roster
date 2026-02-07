
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

export enum PlayerRole {
  TANK = 'Tank',
  HEALER = 'Healer',
  MELEE = 'Melee',
  RANGE = 'Range',
  UNKNOWN = 'Unknown'
}

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

export interface GearItem {
  slot: string;
  name: string;
  itemLevel: number;
  quality: string;
  enchant?: string;
  gems?: string[];
  bonusIds?: number[];
  tier?: boolean;
  upgradeTrack?: string;
  upgradeLevel?: string;
}

export interface GreatVaultSlot {
  itemLevel: number;
  available: boolean;
}

export interface GreatVault {
  raid: GreatVaultSlot[];
  dungeon: GreatVaultSlot[];
  world: GreatVaultSlot[];
}

export interface UpgradeTrackDistribution {
  mythic: number;
  hero: number;
  champion: number;
  veteran: number;
  adventurer: number;
  explorer: number;
}

export interface CrestProgress {
  weathered: number;
  carved: number;
  runed: number;
  gilded: number;
}

export interface MythicPlusSeasonStats {
  dungeonsDone: number;
  dungeonsDoneThisWeek: number;
  highestKey: number;
  rating: number;
}

export interface PvPRating {
  solo: number;
  twos: number;
  threes: number;
  rbg: number;
}

export interface PvPStats {
  honorLevel: number;
  honorableKills: number;
  currentRating: PvPRating;
  highestRating: PvPRating;
  gamesThisSeason: PvPRating;
  gamesThisWeek: PvPRating;
}

export interface CharacterStats {
  crit: number;
  haste: number;
  mastery: number;
  versatility: number;
}

export interface RaidProgress {
  name: string;
  shortName: string;
  normalKills: number;
  heroicKills: number;
  mythicKills: number;
  totalBosses: number;
}

export interface MythicPlusBestRun {
  dungeon: string;
  shortName: string;
  mythicLevel: number;
  completedAt: string;
  keystoneUpgrades: number;
  score: number;
  affixes: string[];
}

export interface Character {
  name: string;
  className: WoWClass;
  spec?: string;
  itemLevel: number;
  mPlusRating?: number;
  weeklyTenPlusCount?: number;
  weeklyHistory?: number[];
  recentRuns?: MPlusRun[];
  lastSeen?: string;
  server?: string;
  isMain?: boolean;
  playerName?: string;
  thumbnailUrl?: string;
  profileUrl?: string;
  race?: string;
  faction?: string;
  gear?: GearItem[];
  stats?: CharacterStats;
  raidProgress?: RaidProgress[];
  bestMythicPlusRuns?: MythicPlusBestRun[];
  talentLoadout?: string;
  achievementPoints?: number;
  honorableKills?: number;
  greatVault?: GreatVault;
  upgradeTrackDistribution?: UpgradeTrackDistribution;
  crests?: CrestProgress;
  valorstones?: number;
  mythicPlusSeasonStats?: MythicPlusSeasonStats;
  pvpStats?: PvPStats;
  professions?: string[];
  mountsOwned?: number;
  toysOwned?: number;
  petsOwned?: number;
  titlesOwned?: number;
}

export interface Player {
  id: string;
  name: string;
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
  buffs: RaidBuff[];
  utility: RaidBuff[];
  armor: ArmorCount;
}

export interface MemberMapping {
  memberName: string;
  role?: PlayerRole;
  characters: { name: string; realm: string }[];
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
