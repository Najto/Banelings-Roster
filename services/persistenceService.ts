
import { SplitGroup, Player, Character, PlayerRole, WoWClass } from '../types';
import { supabase } from './supabaseClient';

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8AIcE-2b-IJohqlFiUCp0laqabWOptLdAk1OpL9o8LptWglWr2rMwnV-7YM6dwwGiEO9ruz7triLa/";

// Helper to generate a deterministic UUID-like string from any string input
// This ensures compatibility with Postgres UUID columns while maintaining a unique key derived from the sheet URL.
const stringToUuid = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  
  // Generate a hex string based on the input string to ensure uniqueness
  let hexStr = '';
  for (let i = 0; i < str.length; i++) {
      hexStr += str.charCodeAt(i).toString(16);
  }
  
  // Pad with the hash if too short, or truncate if too long
  // We need exactly 32 hex digits for the UUID payload
  const targetLength = 32;
  if (hexStr.length < targetLength) {
      // Pad with repeating hash
      const hashHex = Math.abs(hash).toString(16);
      while (hexStr.length < targetLength) {
          hexStr += hashHex;
      }
  }
  hexStr = hexStr.substring(0, targetLength);
  
  // Apply UUID v4 formatting (8-4-4-4-12)
  // We force version 4 (char 13 = '4') and variant 1 (char 17 = '8', '9', 'a', or 'b') to satisfy strict parsers
  return `${hexStr.substring(0, 8)}-${hexStr.substring(8, 12)}-4${hexStr.substring(13, 16)}-8${hexStr.substring(17, 20)}-${hexStr.substring(20, 32)}`;
};

const getRawGuildKey = () => {
  const match = SHEET_URL.match(/e\/(.+)\//);
  return (match && match[1]) ? match[1] : 'default_guild_key';
};

const getGuildUuid = () => {
  return stringToUuid(getRawGuildKey());
};

export const persistenceService = {
  // SPLITS PERSISTENCE (Stores the drag-and-drop layout)
  async saveSplits(splits: SplitGroup[]): Promise<boolean> {
    try {
      const uuid = getGuildUuid();
      const rawKey = getRawGuildKey();
      
      const { error } = await supabase
        .from('splits')
        .upsert({ 
          id: uuid, 
          guild_key: rawKey,
          data: splits,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) {
        console.error('Split save error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Split save exception:', error);
      return false;
    }
  },

  async loadSplits(): Promise<SplitGroup[] | null> {
    try {
      const uuid = getGuildUuid();

      const { data, error } = await supabase
        .from('splits')
        .select('data')
        .eq('id', uuid)
        .maybeSingle();

      if (error) {
        console.error("Supabase load error:", error);
        return null;
      }
      return data ? (data.data as SplitGroup[]) : null;
    } catch (error) {
      console.error('Split load exception:', error);
      return null;
    }
  },

  // CHARACTER_DATA TABLE PERSISTENCE (Core Roster Data)
  async fetchCharactersFromDb(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('character_data')
        .select('*');
      
      if (error) {
        console.error('Error fetching character_data:', error);
        return [];
      }
      return data || [];
    } catch (error) {
      return [];
    }
  },

  async upsertCharacterData(char: Character, playerName: string, role: PlayerRole): Promise<void> {
    try {
      // Map Character object to the specific table schema columns as seen in the user's database
      const payload = {
        character_name: char.name,
        realm: (char.server || 'blackhand').toLowerCase(),
        player_name: playerName,
        role: role,
        class_name: char.className,
        is_main: !!char.isMain,
        // The nested RIO data goes into the jsonb column
        enriched_data: {
          spec: char.spec,
          race: char.race,
          itemLevel: char.itemLevel,
          mPlusRating: char.mPlusRating,
          weeklyTenPlusCount: char.weeklyTenPlusCount,
          raidProgression: char.raidProgression,
          gearAudit: char.gearAudit,
          thumbnailUrl: char.thumbnailUrl,
          profileUrl: char.profileUrl,
          weeklyHistory: char.weeklyHistory,
          recentRuns: char.recentRuns,
          collections: char.collections,
          currencies: char.currencies,
          pvp: char.pvp,
          reputations: char.reputations,
          activities: char.activities,
          professions: char.professions,
          warcraftLogs: char.warcraftLogs,
          mPlusRanks: char.mPlusRanks,
          raidBossKills: char.raidBossKills,
          raidKillBaseline: char.raidKillBaseline,
          weeklyRaidBossKills: char.weeklyRaidBossKills,
          weeklyRaidKillDetails: char.weeklyRaidKillDetails,
          guild: char.guild,
        },
        last_enriched_at: new Date().toISOString(),
        enrichment_status: 'success'
      };

      // We use character_name and realm as the natural unique key for conflict resolution
      const { error } = await supabase
        .from('character_data')
        .upsert(payload, { 
          onConflict: 'character_name,realm' 
        });

      if (error) {
        console.error(`Failed to upsert database record for ${char.name}:`, error);
      }
    } catch (error) {
      console.error('Database connection failed during character upsert:', error);
    }
  }
};
