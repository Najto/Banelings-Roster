import { Character, GearItem } from '../types';

export interface CalculatedField {
  name: string;
  description: string;
  category: string;
  returnType: string;
  formatSuggestion: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
    type?: string;
  };
  calculate: (character: Character) => number | string | boolean | null;
}

const ENCHANTABLE_SLOTS = ['back', 'chest', 'wrist', 'legs', 'feet', 'finger1', 'finger2', 'mainhand'];

export const CALCULATED_FIELDS: Record<string, CalculatedField> = {
  avgGearItemLevel: {
    name: 'Average Gear iLevel',
    description: 'Durchschnittlicher Item-Level aller Gear-Slots',
    category: 'Gear',
    returnType: 'number',
    formatSuggestion: { decimals: 1, suffix: ' ilvl' },
    calculate: (char: Character) => {
      const gear = char.gear || [];
      if (gear.length === 0) return 0;
      const sum = gear.reduce((acc: number, item: GearItem) => acc + (item.itemLevel || 0), 0);
      return sum / gear.length;
    }
  },

  missingEnchants: {
    name: 'Missing Enchants',
    description: 'Anzahl der Slots ohne Enchantment',
    category: 'Gear',
    returnType: 'number',
    formatSuggestion: { suffix: ' missing' },
    calculate: (char: Character) => {
      const gear = char.gear || [];
      const gearBySlot = gear.reduce((acc: Record<string, GearItem>, item: GearItem) => {
        acc[item.slot] = item;
        return acc;
      }, {});

      let missing = 0;
      ENCHANTABLE_SLOTS.forEach(slot => {
        const item = gearBySlot[slot];
        if (item && !item.enchant) {
          missing++;
        }
      });
      return missing;
    }
  },

  missingGems: {
    name: 'Missing Gems',
    description: 'Anzahl der leeren Gem-Slots',
    category: 'Gear',
    returnType: 'number',
    formatSuggestion: { suffix: ' missing' },
    calculate: (char: Character) => {
      const gear = char.gear || [];
      let missingGems = 0;

      gear.forEach(item => {
        if (item.gems && item.gems.length === 0 && item.bonusIds) {
          const hasSocketBonus = item.bonusIds.some((id: number) =>
            id === 1808 || id === 10384 || id === 10385 || id === 10386
          );
          if (hasSocketBonus) {
            missingGems++;
          }
        }
      });

      return missingGems;
    }
  },

  tierSetCount: {
    name: 'Tier Set Count',
    description: 'Anzahl der Tier-Set Teile',
    category: 'Gear',
    returnType: 'number',
    formatSuggestion: { suffix: ' pieces' },
    calculate: (char: Character) => {
      const gear = char.gear || [];
      return gear.filter((item: GearItem) => item.tier === true).length;
    }
  },

  lowestGearSlotLevel: {
    name: 'Lowest Gear Slot',
    description: 'Niedrigster Item-Level eines Gear-Slots',
    category: 'Gear',
    returnType: 'number',
    formatSuggestion: { suffix: ' ilvl' },
    calculate: (char: Character) => {
      const gear = char.gear || [];
      if (gear.length === 0) return 0;
      return Math.min(...gear.map((item: GearItem) => item.itemLevel || 0));
    }
  },

  upgradeTrackScore: {
    name: 'Upgrade Track Score',
    description: 'Gewichteter Score basierend auf Upgrade Tracks',
    category: 'Gear',
    returnType: 'number',
    formatSuggestion: { decimals: 0 },
    calculate: (char: Character) => {
      const distribution = char.upgradeTrackDistribution;
      if (!distribution) return 0;

      const weights = {
        mythic: 6,
        hero: 5,
        champion: 4,
        veteran: 3,
        adventurer: 2,
        explorer: 1
      };

      let score = 0;
      Object.entries(distribution).forEach(([track, count]) => {
        const weight = weights[track as keyof typeof weights] || 0;
        score += (count as number) * weight;
      });

      return score;
    }
  },

  weeklyActivityScore: {
    name: 'Weekly Activity Score',
    description: 'Kombinierter Score aus M+, Delves, World Quests',
    category: 'Progress',
    returnType: 'number',
    formatSuggestion: { decimals: 0 },
    calculate: (char: Character) => {
      const mPlusCount = char.weeklyTenPlusCount || 0;
      const delves = char.worldProgress?.delvesDone || 0;
      const worldQuests = Math.min(char.worldProgress?.worldQuestsDone || 0, 20);

      return (mPlusCount * 10) + (delves * 5) + worldQuests;
    }
  },

  gearQualityScore: {
    name: 'Gear Quality Score',
    description: 'Prozentsatz der Slots mit Enchants und Gems',
    category: 'Gear',
    returnType: 'percentage',
    formatSuggestion: { decimals: 1, type: 'percentage' },
    calculate: (char: Character) => {
      const gear = char.gear || [];
      if (gear.length === 0) return 0;

      const gearBySlot = gear.reduce((acc: Record<string, GearItem>, item: GearItem) => {
        acc[item.slot] = item;
        return acc;
      }, {});

      let totalSlots = 0;
      let qualitySlots = 0;

      ENCHANTABLE_SLOTS.forEach(slot => {
        const item = gearBySlot[slot];
        if (item) {
          totalSlots++;
          if (item.enchant) qualitySlots++;
        }
      });

      gear.forEach(item => {
        if (item.gems && item.bonusIds) {
          const hasSocketBonus = item.bonusIds.some((id: number) =>
            id === 1808 || id === 10384 || id === 10385 || id === 10386
          );
          if (hasSocketBonus && item.gems.length > 0) {
            qualitySlots++;
          }
        }
      });

      return totalSlots > 0 ? (qualitySlots / totalSlots) * 100 : 0;
    }
  },

  reputationProgress: {
    name: 'Reputation Progress',
    description: 'Durchschnittlicher Fortschritt aller Reputations',
    category: 'World',
    returnType: 'percentage',
    formatSuggestion: { decimals: 1, type: 'percentage' },
    calculate: (char: Character) => {
      const reputations = char.reputations || [];
      if (reputations.length === 0) return 0;

      const totalProgress = reputations.reduce((sum: number, rep: any) => {
        const progress = rep.max > 0 ? (rep.standing / rep.max) * 100 : 0;
        return sum + progress;
      }, 0);

      return totalProgress / reputations.length;
    }
  },

  collectionScore: {
    name: 'Collection Score',
    description: 'Kombinierter Score aus Mounts, Pets, Toys, Achievements',
    category: 'Collections',
    returnType: 'number',
    formatSuggestion: { decimals: 0 },
    calculate: (char: Character) => {
      const collections = char.collections || { mounts: 0, pets: 0, toys: 0, achievements: 0 };
      const achievementPoints = char.achievementPoints || 0;

      return (
        (collections.mounts * 10) +
        (collections.pets * 5) +
        (collections.toys * 3) +
        (achievementPoints / 10)
      );
    }
  },

  embellishmentCount: {
    name: 'Embellishment Count',
    description: 'Anzahl der Embellished Items',
    category: 'Gear',
    returnType: 'number',
    formatSuggestion: { suffix: ' embellished' },
    calculate: (char: Character) => {
      return (char.embellishments || []).length;
    }
  },

  greatVaultUnlocked: {
    name: 'Great Vault Unlocked',
    description: 'Anzahl der freigeschalteten Great Vault Slots',
    category: 'Progress',
    returnType: 'number',
    formatSuggestion: { suffix: ' slots' },
    calculate: (char: Character) => {
      const vault = char.greatVault;
      if (!vault) return 0;

      let unlocked = 0;
      ['raid', 'dungeon', 'world'].forEach(category => {
        const slots = vault[category as keyof typeof vault] || [];
        unlocked += slots.filter((slot: any) => slot.available).length;
      });

      return unlocked;
    }
  },

  pvpRatingHighest: {
    name: 'Highest PvP Rating',
    description: 'Höchstes PvP Rating über alle Brackets',
    category: 'PvP',
    returnType: 'number',
    formatSuggestion: { suffix: ' rating' },
    calculate: (char: Character) => {
      const pvp = char.pvpStats;
      if (!pvp?.highestRating) return 0;

      return Math.max(
        pvp.highestRating.solo || 0,
        pvp.highestRating.twos || 0,
        pvp.highestRating.threes || 0,
        pvp.highestRating.rbg || 0
      );
    }
  },

  crestCount: {
    name: 'Total Crests',
    description: 'Gesamtanzahl aller Crests',
    category: 'Currency',
    returnType: 'number',
    formatSuggestion: { suffix: ' crests' },
    calculate: (char: Character) => {
      const crests = char.crests;
      if (!crests) return 0;

      return (
        (crests.weathered || 0) +
        (crests.carved || 0) +
        (crests.runed || 0) +
        (crests.gilded || 0)
      );
    }
  },

  mythicPlusKeyLevel: {
    name: 'Highest M+ Key',
    description: 'Höchste abgeschlossene M+ Stufe',
    category: 'Progress',
    returnType: 'number',
    formatSuggestion: { prefix: '+' },
    calculate: (char: Character) => {
      const runs = char.bestMythicPlusRuns || [];
      if (runs.length === 0) return 0;

      return Math.max(...runs.map((run: any) => run.mythicLevel || 0));
    }
  },

  raidMythicBosses: {
    name: 'Mythic Raid Bosses',
    description: 'Anzahl der getöteten Mythic Raid Bosse',
    category: 'Progress',
    returnType: 'number',
    formatSuggestion: { suffix: ' bosses' },
    calculate: (char: Character) => {
      const progress = char.raidProgress || [];
      return progress.reduce((sum: number, raid: any) => sum + (raid.mythicKills || 0), 0);
    }
  }
};

export function calculateField(fieldKey: string, character: Character): number | string | boolean | null {
  const field = CALCULATED_FIELDS[fieldKey];
  if (!field) {
    console.warn(`Calculated field "${fieldKey}" not found`);
    return null;
  }

  try {
    return field.calculate(character);
  } catch (error) {
    console.error(`Error calculating field "${fieldKey}":`, error);
    return null;
  }
}

export function getCalculatedFieldMetadata(fieldKey: string): CalculatedField | null {
  return CALCULATED_FIELDS[fieldKey] || null;
}

export function getAllCalculatedFields(): Record<string, CalculatedField> {
  return CALCULATED_FIELDS;
}
