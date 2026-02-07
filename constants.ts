
import { Player, WoWClass, PlayerRole } from './types';

export const ILVL_WARNING_THRESHOLD = 615;
export const WEEKLY_M_PLUS_GOAL = 8;

export const INITIAL_ROSTER: Player[] = [
  {
    id: '1',
    name: 'Dekoya',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Dekoya', className: WoWClass.DEATH_KNIGHT, itemLevel: 630 },
    splits: [
      { name: 'Dekoyalt', className: WoWClass.PALADIN, itemLevel: 610 },
      { name: 'Dekoyhunter', className: WoWClass.HUNTER, itemLevel: 590 }
    ]
  },
  {
    id: '2',
    name: 'Klaus',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Clappocino', className: WoWClass.WARRIOR, itemLevel: 628 },
    splits: [
      { name: 'Holychinoo', className: WoWClass.PALADIN, itemLevel: 625 },
      { name: 'Brewchinoo', className: WoWClass.MONK, itemLevel: 602, server: 'Blackhand' }
    ]
  },
  {
    id: '3',
    name: 'Najto',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Najto', className: WoWClass.MONK, itemLevel: 631 },
    splits: [
      { name: 'Najtoev', className: WoWClass.EVOKER, itemLevel: 615 },
      { name: 'Takojax', className: WoWClass.PRIEST, itemLevel: 617 },
      { name: 'Najtos', className: WoWClass.SHAMAN, itemLevel: 580 }
    ]
  },
  {
    id: '4',
    name: 'Drumonij',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Drumonji', className: WoWClass.DRUID, itemLevel: 629 },
    splits: [
      { name: 'Druvoke', className: WoWClass.EVOKER, itemLevel: 615 },
      { name: 'Drupriest', className: WoWClass.PRIEST, itemLevel: 614 },
      { name: 'Druladin', className: WoWClass.PALADIN, itemLevel: 612 },
      { name: 'Drumane', className: WoWClass.SHAMAN, itemLevel: 609 }
    ]
  },
  {
    id: '5',
    name: 'Cranx',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Cranxdk', className: WoWClass.DEATH_KNIGHT, itemLevel: 633 },
    splits: [
      { name: 'Cranx', className: WoWClass.SHAMAN, itemLevel: 621 },
      { name: 'Cranxw', className: WoWClass.WARRIOR, itemLevel: 613 },
      { name: 'Cranxl', className: WoWClass.WARLOCK, itemLevel: 617 }
    ]
  },
  {
    id: '6',
    name: 'Aideen',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Aideen', className: WoWClass.MAGE, itemLevel: 632, server: 'Blackrock' },
    splits: [
      { name: 'Aideenhunter', className: WoWClass.HUNTER, itemLevel: 623, server: 'Blackrock' },
      { name: 'Aideendruid', className: WoWClass.DRUID, itemLevel: 618, server: 'Blackrock' }
    ]
  },
  {
    id: '7',
    name: 'Zorak',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Zorakwar', className: WoWClass.WARRIOR, itemLevel: 630 },
    splits: [{ name: 'Zorakmage', className: WoWClass.MAGE, itemLevel: 612 }]
  },
  {
    id: '8',
    name: 'Lumina',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Luminapriest', className: WoWClass.PRIEST, itemLevel: 625 },
    splits: [{ name: 'Lumidruid', className: WoWClass.DRUID, itemLevel: 610 }]
  },
  {
    id: '9',
    name: 'Brog',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Brogdk', className: WoWClass.DEATH_KNIGHT, itemLevel: 621 },
    splits: []
  },
  {
    id: '10',
    name: 'Sylvan',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Sylvhunter', className: WoWClass.HUNTER, itemLevel: 635 },
    splits: [{ name: 'Sylvrogue', className: WoWClass.ROGUE, itemLevel: 620 }]
  },
  {
    id: '11',
    name: 'Morgos',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Morgoslock', className: WoWClass.WARLOCK, itemLevel: 627 },
    splits: [{ name: 'Morgosdh', className: WoWClass.DEMON_HUNTER, itemLevel: 605 }]
  },
  {
    id: '12',
    name: 'Thalra',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Thalrasham', className: WoWClass.SHAMAN, itemLevel: 629 },
    splits: [{ name: 'Thalraevoker', className: WoWClass.EVOKER, itemLevel: 618 }]
  },
  {
    id: '13',
    name: 'Kael',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Kaelmage', className: WoWClass.MAGE, itemLevel: 631 },
    splits: []
  },
  {
    id: '14',
    name: 'Jaina',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Jainapriest', className: WoWClass.PRIEST, itemLevel: 628 },
    splits: [{ name: 'Jainalock', className: WoWClass.WARLOCK, itemLevel: 614 }]
  },
  {
    id: '15',
    name: 'Uther',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Utherpal', className: WoWClass.PALADIN, itemLevel: 634 },
    splits: [{ name: 'Utherwar', className: WoWClass.WARRIOR, itemLevel: 622 }]
  },
  {
    id: '16',
    name: 'Illidan',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Illidh', className: WoWClass.DEMON_HUNTER, itemLevel: 630 },
    splits: []
  },
  {
    id: '17',
    name: 'Rexxar',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Rexxhunt', className: WoWClass.HUNTER, itemLevel: 626 },
    splits: [{ name: 'Rexxdruid', className: WoWClass.DRUID, itemLevel: 608 }]
  },
  {
    id: '18',
    name: 'Garrosh',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Garrowar', className: WoWClass.WARRIOR, itemLevel: 622 },
    splits: []
  },
  {
    id: '19',
    name: 'Valeera',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Valrogue', className: WoWClass.ROGUE, itemLevel: 632 },
    splits: []
  },
  {
    id: '20',
    name: 'Thrall',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Thrallsham', className: WoWClass.SHAMAN, itemLevel: 630 },
    splits: [{ name: 'Thrallmonk', className: WoWClass.MONK, itemLevel: 615 }]
  },
  {
    id: '21',
    name: 'Anduin',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Anduinpriest', className: WoWClass.PRIEST, itemLevel: 629 },
    splits: []
  },
  {
    id: '22',
    name: 'Malfurion',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Malfdruid', className: WoWClass.DRUID, itemLevel: 631 },
    splits: []
  },
  {
    id: '23',
    name: 'Terenas',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Terenaspal', className: WoWClass.PALADIN, itemLevel: 624 },
    splits: []
  },
  {
    id: '24',
    name: 'Varok',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Varokwar', className: WoWClass.WARRIOR, itemLevel: 627 },
    splits: []
  },
  {
    id: '25',
    name: 'Grom',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Gromwar', className: WoWClass.WARRIOR, itemLevel: 623 },
    splits: []
  },
  {
    id: '26',
    name: 'Tyrande',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Tyranhunt', className: WoWClass.HUNTER, itemLevel: 630 },
    splits: []
  },
  {
    id: '27',
    name: 'Velen',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Velenpriest', className: WoWClass.PRIEST, itemLevel: 628 },
    splits: []
  },
  {
    id: '28',
    name: 'Khagdar',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Khagdar', className: WoWClass.MAGE, itemLevel: 635 },
    splits: []
  },
  {
    id: '29',
    name: 'Medivh',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Medivh', className: WoWClass.MAGE, itemLevel: 633 },
    splits: []
  },
  {
    id: '30',
    name: 'Guldan',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Guldan', className: WoWClass.WARLOCK, itemLevel: 632 },
    splits: []
  },
  {
    id: '31',
    name: 'Kelthuzad',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Kelthuzad', className: WoWClass.MAGE, itemLevel: 629 },
    splits: []
  },
  {
    id: '32',
    name: 'Anubarak',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Anubarak', className: WoWClass.DEATH_KNIGHT, itemLevel: 626 },
    splits: []
  },
  {
    id: '33',
    name: 'Bolvar',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Bolvar', className: WoWClass.PALADIN, itemLevel: 630 },
    splits: []
  },
  {
    id: '34',
    name: 'Alexstrasza',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Alexevoker', className: WoWClass.EVOKER, itemLevel: 636 },
    splits: []
  },
  {
    id: '35',
    name: 'Nozdormu',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Nozdevoker', className: WoWClass.EVOKER, itemLevel: 634 },
    splits: []
  },
  {
    id: '36',
    name: 'Ysera',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Yseradruid', className: WoWClass.DRUID, itemLevel: 632 },
    splits: []
  },
  {
    id: '37',
    name: 'Malygos',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Malymage', className: WoWClass.MAGE, itemLevel: 630 },
    splits: []
  },
  {
    id: '38',
    name: 'Kalecgos',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Kalecmage', className: WoWClass.MAGE, itemLevel: 628 },
    splits: []
  },
  {
    id: '39',
    name: 'Chen',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Chenmonk', className: WoWClass.MONK, itemLevel: 629 },
    splits: []
  },
  {
    id: '40',
    name: 'LiLi',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'LiLimonk', className: WoWClass.MONK, itemLevel: 625 },
    splits: []
  },
  {
    id: '41',
    name: 'Taran Zhu',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Taranzhu', className: WoWClass.MONK, itemLevel: 631 },
    splits: []
  },
  {
    id: '42',
    name: 'LorThemar',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Lorthemar', className: WoWClass.HUNTER, itemLevel: 627 },
    splits: []
  },
  {
    id: '43',
    name: 'LadyLiadrin',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Liadrin', className: WoWClass.PALADIN, itemLevel: 632 },
    splits: []
  },
  {
    id: '44',
    name: 'Halduron',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Halduron', className: WoWClass.HUNTER, itemLevel: 624 },
    splits: []
  },
  {
    id: '45',
    name: 'Rommath',
    role: PlayerRole.UNKNOWN,
    mainCharacter: { name: 'Rommath', className: WoWClass.MAGE, itemLevel: 626 },
    splits: []
  }
];
