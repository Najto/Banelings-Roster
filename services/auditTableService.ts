import { supabase } from './supabaseClient';
import { Character } from '../types';
import { calculateField } from './calculatedFieldsService';

export interface ColumnConfig {
  id: string;
  column_key: string;
  display_name: string;
  category: string;
  data_source: string;
  data_path: string;
  data_type: string;
  is_calculated: boolean;
  calculation_function: string | null;
  column_width: number;
  sort_order: number;
  format_config: Record<string, any>;
  custom_format_override?: Record<string, any>;
}

export interface AuditPreset {
  id: string;
  preset_name: string;
  is_system: boolean;
  columns: ColumnConfig[];
}

const CACHE_KEY = 'audit_column_cache';
const CACHE_TTL = 5 * 60 * 1000;

let columnCache: { data: ColumnConfig[]; timestamp: number } | null = null;

export const invalidateCache = () => {
  columnCache = null;
  localStorage.removeItem(CACHE_KEY);
};

const resolveNestedPath = (obj: any, path: string): any => {
  if (!path || !obj) return undefined;
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
};

export const resolveColumnValue = (char: Character, config: ColumnConfig): any => {
  if (config.is_calculated && config.calculation_function) {
    return calculateField(config.calculation_function, char);
  }
  return resolveNestedPath(char, config.data_path);
};

export const fetchColumnDefinitions = async (): Promise<ColumnConfig[]> => {
  if (columnCache && (Date.now() - columnCache.timestamp < CACHE_TTL)) {
    return columnCache.data;
  }

  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        columnCache = parsed;
        return parsed.data;
      }
    } catch { /* ignore parse errors */ }
  }

  const { data, error } = await supabase
    .from('audit_column_definitions')
    .select('*')
    .order('column_key', { ascending: true });

  if (error || !data) return [];

  const configs: ColumnConfig[] = data.map((row: any) => ({
    id: row.id,
    column_key: row.column_key,
    display_name: row.display_name,
    category: row.category,
    data_source: row.data_source,
    data_path: row.data_path || '',
    data_type: row.data_type || 'text',
    is_calculated: row.is_calculated || false,
    calculation_function: row.calculation_function,
    column_width: row.column_width || 80,
    sort_order: row.sort_order || 0,
    format_config: row.format_config || {},
    custom_format_override: {},
  }));

  columnCache = { data: configs, timestamp: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(columnCache));
  return configs;
};

export const fetchPresets = async (): Promise<AuditPreset[]> => {
  const { data: presets, error: presetsError } = await supabase
    .from('audit_presets')
    .select('*')
    .order('preset_name');

  if (presetsError || !presets) return [];

  const allColumns = await fetchColumnDefinitions();
  const columnKeyMap = new Map(allColumns.map(c => [c.column_key, c]));

  const result: AuditPreset[] = [];
  for (const preset of presets) {
    const { data: presetCols } = await supabase
      .from('audit_preset_columns')
      .select('column_key, column_order, custom_format_override')
      .eq('preset_id', preset.id)
      .order('column_order');

    const columns: ColumnConfig[] = (presetCols || [])
      .map((pc: any) => {
        const base = columnKeyMap.get(pc.column_key);
        if (!base) return null;
        return {
          ...base,
          sort_order: pc.column_order || 0,
          custom_format_override: pc.custom_format_override || {},
        };
      })
      .filter(Boolean) as ColumnConfig[];

    result.push({
      id: preset.id,
      preset_name: preset.preset_name,
      is_system: preset.is_system,
      columns,
    });
  }

  return result;
};
