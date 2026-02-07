import { supabase } from './supabaseClient';
import { Character } from '../types';
import { calculateField, CALCULATED_FIELDS } from './calculatedFieldsService';

export interface ColumnDefinition {
  id: string;
  column_key: string;
  display_name: string;
  category: string;
  data_source: string;
  data_path: string;
  data_type: string;
  is_calculated: boolean;
  calculation_function: string | null;
  format_config: FormatConfig;
  description: string | null;
  example_value: string | null;
  is_available: boolean;
}

export interface FormatConfig {
  decimals?: number;
  prefix?: string;
  suffix?: string;
  type?: string;
  colorRules?: Array<{ threshold: number; color: string }>;
  style?: 'solid' | 'outline' | 'soft';
  size?: 'small' | 'medium' | 'large';
  maxItems?: number;
  displayMode?: 'count' | 'first' | 'comma' | 'custom';
}

export interface PresetDefinition {
  id: string;
  preset_name: string;
  description: string | null;
  is_default: boolean;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PresetColumn {
  id: string;
  preset_id: string;
  column_key: string;
  is_visible: boolean;
  column_order: number;
  column_width: string;
  alignment: string;
  is_sortable: boolean;
  custom_format_override: FormatConfig;
}

export interface ColumnConfig extends ColumnDefinition {
  is_visible: boolean;
  column_order: number;
  column_width: string;
  alignment: string;
  is_sortable: boolean;
  custom_format_override: FormatConfig;
}

const CACHE_KEY_ACTIVE_PRESET = 'audit_active_preset_id';
const CACHE_PREFIX_COLUMN_CONFIG = 'audit_column_configs_';
const CACHE_TTL = 60 * 60 * 1000;

export async function loadActivePreset(): Promise<PresetDefinition | null> {
  const cachedId = localStorage.getItem(CACHE_KEY_ACTIVE_PRESET);

  if (cachedId) {
    const { data, error } = await supabase
      .from('audit_presets')
      .select('*')
      .eq('id', cachedId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  }

  const { data, error } = await supabase
    .from('audit_presets')
    .select('*')
    .eq('is_default', true)
    .maybeSingle();

  if (error || !data) {
    const { data: fallback } = await supabase
      .from('audit_presets')
      .select('*')
      .eq('preset_name', 'Default Audit')
      .maybeSingle();

    return fallback;
  }

  if (data) {
    localStorage.setItem(CACHE_KEY_ACTIVE_PRESET, data.id);
  }

  return data;
}

export async function setActivePreset(presetId: string): Promise<void> {
  localStorage.setItem(CACHE_KEY_ACTIVE_PRESET, presetId);
  localStorage.removeItem(CACHE_PREFIX_COLUMN_CONFIG + presetId);
}

export async function getColumnConfiguration(presetId: string): Promise<ColumnConfig[]> {
  const cacheKey = CACHE_PREFIX_COLUMN_CONFIG + presetId;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed.data;
      }
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }
  }

  const { data: presetColumns, error: pcError } = await supabase
    .from('audit_preset_columns')
    .select('*')
    .eq('preset_id', presetId)
    .order('column_order', { ascending: true });

  if (pcError || !presetColumns) {
    console.error('Error loading preset columns:', pcError);
    return [];
  }

  const columnKeys = presetColumns.map(pc => pc.column_key);

  const { data: columnDefs, error: cdError } = await supabase
    .from('audit_column_definitions')
    .select('*')
    .in('column_key', columnKeys);

  if (cdError || !columnDefs) {
    console.error('Error loading column definitions:', cdError);
    return [];
  }

  const columnDefMap = columnDefs.reduce((acc: Record<string, ColumnDefinition>, def) => {
    acc[def.column_key] = def;
    return acc;
  }, {});

  const configs: ColumnConfig[] = presetColumns
    .map(pc => {
      const def = columnDefMap[pc.column_key];
      if (!def) return null;

      return {
        ...def,
        is_visible: pc.is_visible,
        column_order: pc.column_order,
        column_width: pc.column_width,
        alignment: pc.alignment,
        is_sortable: pc.is_sortable,
        custom_format_override: pc.custom_format_override
      };
    })
    .filter(Boolean) as ColumnConfig[];

  localStorage.setItem(cacheKey, JSON.stringify({
    timestamp: Date.now(),
    data: configs
  }));

  return configs;
}

export function getValueByPath(obj: any, path: string): any {
  if (path === 'calculated') return null;

  const parts = path.split('.');
  let value = obj;

  for (const part of parts) {
    if (value === null || value === undefined) return null;
    value = value[part];
  }

  return value;
}

export function getCellValue(character: Character, config: ColumnConfig): any {
  if (config.is_calculated && config.calculation_function) {
    return calculateField(config.calculation_function, character);
  }

  return getValueByPath(character, config.data_path);
}

export async function getAllPresets(): Promise<PresetDefinition[]> {
  const { data, error } = await supabase
    .from('audit_presets')
    .select('*')
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading presets:', error);
    return [];
  }

  return data || [];
}

export async function getAllColumnDefinitions(): Promise<ColumnDefinition[]> {
  const { data, error } = await supabase
    .from('audit_column_definitions')
    .select('*')
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('display_name', { ascending: true });

  if (error) {
    console.error('Error loading column definitions:', error);
    return [];
  }

  return data || [];
}

export async function createPreset(
  name: string,
  description: string,
  isDefault: boolean,
  columns: Omit<PresetColumn, 'id' | 'preset_id'>[]
): Promise<PresetDefinition | null> {
  const { data: preset, error: presetError } = await supabase
    .from('audit_presets')
    .insert({
      preset_name: name,
      description,
      is_default: isDefault,
      is_system: false
    })
    .select()
    .single();

  if (presetError || !preset) {
    console.error('Error creating preset:', presetError);
    return null;
  }

  const columnsToInsert = columns.map(col => ({
    preset_id: preset.id,
    ...col
  }));

  const { error: columnsError } = await supabase
    .from('audit_preset_columns')
    .insert(columnsToInsert);

  if (columnsError) {
    console.error('Error creating preset columns:', columnsError);
    await supabase.from('audit_presets').delete().eq('id', preset.id);
    return null;
  }

  return preset;
}

export async function updatePresetColumns(
  presetId: string,
  columns: Omit<PresetColumn, 'id' | 'preset_id'>[]
): Promise<boolean> {
  await supabase
    .from('audit_preset_columns')
    .delete()
    .eq('preset_id', presetId);

  const columnsToInsert = columns.map(col => ({
    preset_id: presetId,
    ...col
  }));

  const { error } = await supabase
    .from('audit_preset_columns')
    .insert(columnsToInsert);

  if (error) {
    console.error('Error updating preset columns:', error);
    return false;
  }

  localStorage.removeItem(CACHE_PREFIX_COLUMN_CONFIG + presetId);
  return true;
}

export async function deletePreset(presetId: string): Promise<boolean> {
  const { error } = await supabase
    .from('audit_presets')
    .delete()
    .eq('id', presetId)
    .eq('is_system', false);

  if (error) {
    console.error('Error deleting preset:', error);
    return false;
  }

  localStorage.removeItem(CACHE_PREFIX_COLUMN_CONFIG + presetId);

  const cachedActiveId = localStorage.getItem(CACHE_KEY_ACTIVE_PRESET);
  if (cachedActiveId === presetId) {
    localStorage.removeItem(CACHE_KEY_ACTIVE_PRESET);
  }

  return true;
}

export async function setDefaultPreset(presetId: string): Promise<boolean> {
  await supabase
    .from('audit_presets')
    .update({ is_default: false })
    .neq('id', presetId);

  const { error } = await supabase
    .from('audit_presets')
    .update({ is_default: true })
    .eq('id', presetId);

  if (error) {
    console.error('Error setting default preset:', error);
    return false;
  }

  return true;
}

export function invalidateCache(presetId?: string): void {
  if (presetId) {
    localStorage.removeItem(CACHE_PREFIX_COLUMN_CONFIG + presetId);
  } else {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX_COLUMN_CONFIG)) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem(CACHE_KEY_ACTIVE_PRESET);
  }
}
