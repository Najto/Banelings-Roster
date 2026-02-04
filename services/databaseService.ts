import { supabase } from './supabaseClient';
import { Character, Player } from '../types';

const normalizeRealm = (realm: string): string => {
  return realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};

export interface CharacterDataRecord {
  id?: string;
  character_name: string;
  realm: string;
  player_name?: string;
  role?: string;
  class_name?: string;
  is_main: boolean;
  enriched_data: Character;
  last_enriched_at?: string;
  enrichment_status: 'success' | 'failed' | 'pending' | 'stale';
  error_count?: number;
  last_error?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnrichmentMetadata {
  id?: string;
  roster_id: string;
  last_enriched_at?: string;
  total_characters: number;
  success_count: number;
  failed_count: number;
  created_at?: string;
  updated_at?: string;
}

export const saveCharacterData = async (
  character: Character,
  playerName: string,
  isMain: boolean,
  status: 'success' | 'failed' | 'pending' | 'stale',
  errorMessage?: string
): Promise<void> => {
  try {
    const normalizedRealm = normalizeRealm(character.server || '');

    console.log(`💾 Saving character data: ${character.name}-${normalizedRealm} (status: ${status})`);

    const record: CharacterDataRecord = {
      character_name: character.name,
      realm: normalizedRealm,
      player_name: playerName,
      role: character.role,
      class_name: character.className,
      is_main: isMain,
      enriched_data: character,
      last_enriched_at: status === 'success' ? new Date().toISOString() : undefined,
      enrichment_status: status,
      error_count: status === 'failed' ? 1 : 0,
      last_error: errorMessage,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('character_data')
      .upsert(record, {
        onConflict: 'character_name,realm',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Failed to save character data:', error);
      console.error('Record that failed:', { character_name: character.name, realm: normalizedRealm });
      throw error;
    }

    console.log(`✅ Successfully saved character data: ${character.name}-${normalizedRealm}`);
  } catch (error) {
    console.error('❌ Error saving character data:', error);
    throw error;
  }
};

export const getCharacterData = async (
  name: string,
  realm: string
): Promise<Character | null> => {
  try {
    const normalizedRealm = normalizeRealm(realm);
    const { data, error } = await supabase
      .from('character_data')
      .select('enriched_data')
      .eq('character_name', name)
      .eq('realm', normalizedRealm)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.enriched_data as Character;
  } catch (error) {
    console.error('Error getting character data:', error);
    return null;
  }
};

export const getAllCharacterData = async (): Promise<Map<string, Character>> => {
  try {
    const { data, error } = await supabase
      .from('character_data')
      .select('character_name, realm, enriched_data, enrichment_status, last_enriched_at');

    if (error || !data) {
      return new Map();
    }

    const characterMap = new Map<string, Character>();
    data.forEach(record => {
      const normalizedRealm = normalizeRealm(record.realm);
      const key = `${record.character_name}-${normalizedRealm}`;
      const character = record.enriched_data as Character;

      if (character) {
        character.enrichmentStatus = record.enrichment_status;
        character.lastEnrichedAt = record.last_enriched_at;
        characterMap.set(key, character);
      }
    });

    return characterMap;
  } catch (error) {
    console.error('Error getting all character data:', error);
    return new Map();
  }
};

export const updateEnrichmentMetadata = async (
  totalCharacters: number,
  successCount: number,
  failedCount: number
): Promise<void> => {
  try {
    const metadata: EnrichmentMetadata = {
      roster_id: 'default',
      last_enriched_at: new Date().toISOString(),
      total_characters: totalCharacters,
      success_count: successCount,
      failed_count: failedCount,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('enrichment_metadata')
      .upsert(metadata, {
        onConflict: 'roster_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Failed to update enrichment metadata:', error);
    }
  } catch (error) {
    console.error('Error updating enrichment metadata:', error);
  }
};

export const getEnrichmentMetadata = async (): Promise<EnrichmentMetadata | null> => {
  try {
    const { data, error } = await supabase
      .from('enrichment_metadata')
      .select('*')
      .eq('roster_id', 'default')
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as EnrichmentMetadata;
  } catch (error) {
    console.error('Error getting enrichment metadata:', error);
    return null;
  }
};

export const isDataStale = async (maxAgeMinutes: number = 60): Promise<boolean> => {
  const metadata = await getEnrichmentMetadata();

  if (!metadata || !metadata.last_enriched_at) {
    return true;
  }

  const lastEnriched = new Date(metadata.last_enriched_at);
  const now = new Date();
  const ageMinutes = (now.getTime() - lastEnriched.getTime()) / (1000 * 60);

  return ageMinutes >= maxAgeMinutes;
};

export const incrementErrorCount = async (
  name: string,
  realm: string,
  errorMessage: string
): Promise<void> => {
  try {
    const normalizedRealm = normalizeRealm(realm);
    const { data: existing } = await supabase
      .from('character_data')
      .select('error_count')
      .eq('character_name', name)
      .eq('realm', normalizedRealm)
      .maybeSingle();

    const newErrorCount = (existing?.error_count || 0) + 1;

    const { error } = await supabase
      .from('character_data')
      .update({
        error_count: newErrorCount,
        last_error: errorMessage,
        enrichment_status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('character_name', name)
      .eq('realm', normalizedRealm);

    if (error) {
      console.error('Failed to increment error count:', error);
    }
  } catch (error) {
    console.error('Error incrementing error count:', error);
  }
};
