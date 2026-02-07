import { supabase } from './supabaseClient';
import { Character } from '../types';
import { getAllCalculatedFields } from './calculatedFieldsService';

export interface FieldMetadata {
  column_key: string;
  display_name: string;
  category: string;
  data_source: string;
  data_path: string;
  data_type: string;
  is_calculated: boolean;
  calculation_function: string | null;
  description: string | null;
  example_value: string | null;
  format_config: any;
}

const RAIDERIO_FIELDS = [
  'mPlusRating', 'recentRuns', 'bestMythicPlusRuns', 'weeklyTenPlusCount',
  'profileUrl', 'lastSeen', 'weeklyHistory'
];

const BLIZZARD_FIELDS = [
  'gear', 'stats', 'crests', 'pvpStats', 'greatVault', 'valorstones',
  'professions', 'reputations', 'collections', 'achievementPoints',
  'itemLevel', 'spec', 'race', 'faction', 'className'
];

const ENRICHED_FIELDS = [
  'embellishments', 'upgradeTrackDistribution', 'raidProgress',
  'raidAchievements', 'worldProgress'
];

function detectDataSource(path: string): string {
  const topLevel = path.split('.')[0];

  if (RAIDERIO_FIELDS.includes(topLevel)) return 'raiderio';
  if (BLIZZARD_FIELDS.includes(topLevel)) return 'blizzard';
  if (ENRICHED_FIELDS.includes(topLevel)) return 'enriched';

  return 'unknown';
}

function generateDisplayName(path: string): string {
  const mappings: Record<string, string> = {
    'itemLevel': 'Item Level',
    'mPlusRating': 'M+ Rating',
    'stats.crit': 'Critical Strike',
    'stats.haste': 'Haste',
    'stats.mastery': 'Mastery',
    'stats.versatility': 'Versatility',
    'pvpStats.honorLevel': 'Honor Level',
    'pvpStats.honorableKills': 'Honorable Kills',
    'pvpStats.currentRating.solo': 'Solo Shuffle Rating',
    'pvpStats.currentRating.twos': '2v2 Arena Rating',
    'pvpStats.currentRating.threes': '3v3 Arena Rating',
    'pvpStats.currentRating.rbg': 'RBG Rating',
    'crests.weathered': 'Weathered Crests',
    'crests.carved': 'Carved Crests',
    'crests.runed': 'Runed Crests',
    'crests.gilded': 'Gilded Crests',
    'valorstones': 'Valorstones',
    'weeklyTenPlusCount': 'Weekly 10+ Keys',
    'achievementPoints': 'Achievement Points',
    'collections.mounts': 'Mounts',
    'collections.pets': 'Pets',
    'collections.toys': 'Toys',
    'collections.titles': 'Titles',
    'worldProgress.delvesDone': 'Delves Completed',
    'worldProgress.worldQuestsDone': 'World Quests Done',
    'worldProgress.heroicDungeons': 'Heroic Dungeons',
    'worldProgress.mythicDungeons': 'Mythic Dungeons',
    'lastSeen': 'Last Seen',
    'profileUrl': 'Profile URL',
    'spec': 'Specialization',
    'race': 'Race',
    'faction': 'Faction',
    'className': 'Class'
  };

  if (mappings[path]) return mappings[path];

  const parts = path.split('.');
  const last = parts[parts.length - 1];

  return last
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function detectDataType(value: any, path: string): string {
  if (value === null || value === undefined) return 'text';

  if (Array.isArray(value)) return 'array';

  if (typeof value === 'boolean') return 'boolean';

  if (typeof value === 'number') {
    if (path.includes('crit') || path.includes('haste') ||
        path.includes('mastery') || path.includes('versatility')) {
      return 'percentage';
    }
    return 'number';
  }

  if (typeof value === 'string') {
    if (value.match(/^\d{2}:\d{2} - \d{2}\/\d{2}\/\d{2}$/)) {
      return 'date';
    }
    return 'text';
  }

  if (typeof value === 'object') {
    return 'object';
  }

  return 'text';
}

function categorizeField(path: string): string {
  const topLevel = path.split('.')[0];

  const categoryMap: Record<string, string> = {
    'itemLevel': 'Basis',
    'spec': 'Basis',
    'race': 'Basis',
    'faction': 'Basis',
    'className': 'Basis',
    'stats': 'Stats',
    'gear': 'Gear',
    'embellishments': 'Gear',
    'upgradeTrackDistribution': 'Gear',
    'mPlusRating': 'Mythic+',
    'weeklyTenPlusCount': 'Mythic+',
    'recentRuns': 'Mythic+',
    'bestMythicPlusRuns': 'Mythic+',
    'raidProgress': 'Raid',
    'raidAchievements': 'Raid',
    'greatVault': 'Great Vault',
    'crests': 'Currency',
    'valorstones': 'Currency',
    'pvpStats': 'PvP',
    'worldProgress': 'World Content',
    'collections': 'Collections',
    'achievementPoints': 'Collections',
    'professions': 'Professions',
    'reputations': 'Reputations',
    'lastSeen': 'Meta',
    'profileUrl': 'Meta'
  };

  return categoryMap[topLevel] || 'Other';
}

function scanObject(obj: any, prefix: string = '', results: FieldMetadata[] = []): FieldMetadata[] {
  if (obj === null || obj === undefined) return results;

  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const arrayPath = prefix;
      const exampleValue = obj[0];

      results.push({
        column_key: arrayPath.replace(/\./g, '_'),
        display_name: generateDisplayName(arrayPath),
        category: categorizeField(arrayPath),
        data_source: detectDataSource(arrayPath),
        data_path: arrayPath,
        data_type: 'array',
        is_calculated: false,
        calculation_function: null,
        description: null,
        example_value: JSON.stringify(obj.slice(0, 2)),
        format_config: { displayMode: 'count' }
      });

      if (typeof exampleValue === 'object' && !Array.isArray(exampleValue)) {
        Object.keys(exampleValue).forEach(key => {
          const itemPath = `${arrayPath}[].${key}`;
          const value = exampleValue[key];

          results.push({
            column_key: itemPath.replace(/\./g, '_').replace('[]', ''),
            display_name: `${generateDisplayName(arrayPath)} - ${generateDisplayName(key)}`,
            category: categorizeField(arrayPath),
            data_source: detectDataSource(arrayPath),
            data_path: itemPath,
            data_type: detectDataType(value, itemPath),
            is_calculated: false,
            calculation_function: null,
            description: null,
            example_value: String(value),
            format_config: {}
          });
        });
      }
    }
    return results;
  }

  if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      const path = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        scanObject(value, path, results);
      } else {
        results.push({
          column_key: path.replace(/\./g, '_'),
          display_name: generateDisplayName(path),
          category: categorizeField(path),
          data_source: detectDataSource(path),
          data_path: path,
          data_type: detectDataType(value, path),
          is_calculated: false,
          calculation_function: null,
          description: null,
          example_value: Array.isArray(value) ? JSON.stringify(value.slice(0, 2)) : String(value),
          format_config: {}
        });
      }
    });
  }

  return results;
}

export function scanCharacterFields(character: Character): FieldMetadata[] {
  const fields = scanObject(character);

  const calculatedFields = getAllCalculatedFields();
  Object.entries(calculatedFields).forEach(([key, field]) => {
    fields.push({
      column_key: `calc_${key}`,
      display_name: field.name,
      category: field.category,
      data_source: 'calculated',
      data_path: 'calculated',
      data_type: field.returnType,
      is_calculated: true,
      calculation_function: key,
      description: field.description,
      example_value: null,
      format_config: field.formatSuggestion || {}
    });
  });

  return fields;
}

export async function syncAvailableFields(): Promise<{ added: number; updated: number }> {
  const { data: characters } = await supabase
    .from('character_data')
    .select('enriched_data')
    .not('enriched_data', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!characters || !characters.enriched_data) {
    console.warn('No enriched character data found for field discovery');
    return { added: 0, updated: 0 };
  }

  const discoveredFields = scanCharacterFields(characters.enriched_data);

  const { data: existingFields } = await supabase
    .from('audit_column_definitions')
    .select('column_key');

  const existingKeys = new Set(existingFields?.map(f => f.column_key) || []);

  const newFields = discoveredFields.filter(f => !existingKeys.has(f.column_key));

  if (newFields.length > 0) {
    const { error } = await supabase
      .from('audit_column_definitions')
      .insert(newFields);

    if (error) {
      console.error('Error inserting new fields:', error);
      return { added: 0, updated: 0 };
    }
  }

  return { added: newFields.length, updated: 0 };
}

export async function getFieldsByCategory(): Promise<Record<string, FieldMetadata[]>> {
  const { data: fields } = await supabase
    .from('audit_column_definitions')
    .select('*')
    .eq('is_available', true)
    .order('display_name', { ascending: true });

  if (!fields) return {};

  return fields.reduce((acc: Record<string, FieldMetadata[]>, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {});
}
