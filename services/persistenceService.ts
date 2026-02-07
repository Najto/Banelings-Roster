
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
  },

  // ROSTER MANAGEMENT FUNCTIONS
  async loadRosterFromDatabase(): Promise<Player[]> {
    try {
      // Fetch all members
      const { data: membersData, error: membersError } = await supabase
        .from('roster_members')
        .select('*')
        .order('display_order');

      if (membersError) {
        console.error('Error fetching roster members:', membersError);
        return [];
      }

      // Fetch all character data
      const { data: charactersData, error: charactersError } = await supabase
        .from('character_data')
        .select('*');

      if (charactersError) {
        console.error('Error fetching character data:', charactersError);
        return [];
      }

      // Build Player objects from database data
      const roster: Player[] = (membersData || []).map((member: any) => {
        // Find all characters for this member
        const memberCharacters = (charactersData || []).filter(
          (char: any) => char.player_name === member.member_name
        );

        // Map database records to Character objects
        const characters = memberCharacters.map((dbChar: any): Character => ({
          name: dbChar.character_name,
          className: dbChar.class_name,
          server: dbChar.realm,
          isMain: dbChar.is_main,
          playerName: dbChar.player_name,
          itemLevel: dbChar.enriched_data?.itemLevel || 0,
          spec: dbChar.enriched_data?.spec,
          race: dbChar.enriched_data?.race,
          mPlusRating: dbChar.enriched_data?.mPlusRating,
          weeklyTenPlusCount: dbChar.enriched_data?.weeklyTenPlusCount,
          raidProgression: dbChar.enriched_data?.raidProgression,
          gearAudit: dbChar.enriched_data?.gearAudit,
          thumbnailUrl: dbChar.enriched_data?.thumbnailUrl,
          profileUrl: dbChar.enriched_data?.profileUrl,
          weeklyHistory: dbChar.enriched_data?.weeklyHistory,
          recentRuns: dbChar.enriched_data?.recentRuns,
          collections: dbChar.enriched_data?.collections,
          currencies: dbChar.enriched_data?.currencies,
          pvp: dbChar.enriched_data?.pvp,
          reputations: dbChar.enriched_data?.reputations,
          activities: dbChar.enriched_data?.activities,
          professions: dbChar.enriched_data?.professions,
          warcraftLogs: dbChar.enriched_data?.warcraftLogs,
          mPlusRanks: dbChar.enriched_data?.mPlusRanks,
          raidBossKills: dbChar.enriched_data?.raidBossKills,
          raidKillBaseline: dbChar.enriched_data?.raidKillBaseline,
          weeklyRaidBossKills: dbChar.enriched_data?.weeklyRaidBossKills,
          weeklyRaidKillDetails: dbChar.enriched_data?.weeklyRaidKillDetails,
          guild: dbChar.enriched_data?.guild,
        }));

        // Find main character
        const mainChar = characters.find(c => c.isMain) || characters[0];
        const splits = characters.filter(c => !c.isMain);

        return {
          id: member.id,
          name: member.member_name,
          role: member.role as PlayerRole,
          mainCharacter: mainChar || {
            name: '',
            className: WoWClass.UNKNOWN,
            itemLevel: 0,
          },
          splits: splits,
        };
      });

      return roster;
    } catch (error) {
      console.error('Failed to load roster from database:', error);
      return [];
    }
  },

  async createRosterMember(memberName: string, role: PlayerRole, displayOrder?: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('roster_members')
        .insert({
          member_name: memberName,
          role: role,
          display_order: displayOrder || 0,
        });

      if (error) {
        console.error('Error creating roster member:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to create roster member:', error);
      return false;
    }
  },

  async deleteRosterMember(memberName: string): Promise<boolean> {
    try {
      // First delete all characters for this member
      const { error: charError } = await supabase
        .from('character_data')
        .delete()
        .eq('player_name', memberName);

      if (charError) {
        console.error('Error deleting member characters:', charError);
        return false;
      }

      // Then delete the member
      const { error } = await supabase
        .from('roster_members')
        .delete()
        .eq('member_name', memberName);

      if (error) {
        console.error('Error deleting roster member:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to delete roster member:', error);
      return false;
    }
  },

  async deleteCharacter(characterName: string, realm: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('character_data')
        .delete()
        .eq('character_name', characterName)
        .eq('realm', realm.toLowerCase());

      if (error) {
        console.error('Error deleting character:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to delete character:', error);
      return false;
    }
  },

  // MIGRATION FUNCTIONS
  async checkMigrationNeeded(): Promise<{ needed: boolean; uniquePlayers: number; totalCharacters: number; existingMembers: number }> {
    try {
      // Check if roster_members table is empty or has fewer members than unique player_names
      const { data: membersData, error: membersError } = await supabase
        .from('roster_members')
        .select('member_name');

      if (membersError) {
        console.error('Error checking roster members:', membersError);
        return { needed: false, uniquePlayers: 0, totalCharacters: 0, existingMembers: 0 };
      }

      // Get all unique player_names from character_data
      const { data: charactersData, error: charactersError } = await supabase
        .from('character_data')
        .select('player_name, role');

      if (charactersError) {
        console.error('Error checking character data:', charactersError);
        return { needed: false, uniquePlayers: 0, totalCharacters: 0, existingMembers: 0 };
      }

      const existingMembers = (membersData || []).map(m => m.member_name);
      const totalCharacters = charactersData?.length || 0;

      // Get unique player names that don't have roster members yet
      const uniquePlayerNames = new Set(
        (charactersData || [])
          .map((c: any) => c.player_name)
          .filter((name: string) => name && !existingMembers.includes(name))
      );

      return {
        needed: uniquePlayerNames.size > 0,
        uniquePlayers: uniquePlayerNames.size,
        totalCharacters,
        existingMembers: existingMembers.length
      };
    } catch (error) {
      console.error('Failed to check migration status:', error);
      return { needed: false, uniquePlayers: 0, totalCharacters: 0, existingMembers: 0 };
    }
  },

  async migrateCharactersToRosterMembers(): Promise<{ success: boolean; created: number; skipped: number; errors: string[] }> {
    try {
      const result = { success: true, created: 0, skipped: 0, errors: [] as string[] };

      // Get all existing roster members
      const { data: existingMembers, error: existingError } = await supabase
        .from('roster_members')
        .select('member_name');

      if (existingError) {
        result.errors.push(`Failed to fetch existing members: ${existingError.message}`);
        result.success = false;
        return result;
      }

      const existingMemberNames = new Set((existingMembers || []).map((m: any) => m.member_name));

      // Get all characters grouped by player_name
      const { data: characters, error: charError } = await supabase
        .from('character_data')
        .select('player_name, role')
        .order('player_name');

      if (charError) {
        result.errors.push(`Failed to fetch character data: ${charError.message}`);
        result.success = false;
        return result;
      }

      if (!characters || characters.length === 0) {
        result.errors.push('No character data found to migrate');
        return result;
      }

      // Group by player_name and get their role
      const playerMap = new Map<string, PlayerRole>();
      characters.forEach((char: any) => {
        if (char.player_name && !playerMap.has(char.player_name)) {
          playerMap.set(char.player_name, char.role);
        }
      });

      // Get current max display_order
      const { data: maxOrderData } = await supabase
        .from('roster_members')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      let displayOrder = (maxOrderData?.display_order || 0) + 1;

      // Create roster members for each unique player
      for (const [playerName, role] of playerMap.entries()) {
        if (existingMemberNames.has(playerName)) {
          result.skipped++;
          continue;
        }

        const { error: insertError } = await supabase
          .from('roster_members')
          .insert({
            member_name: playerName,
            role: role,
            display_order: displayOrder++,
          });

        if (insertError) {
          result.errors.push(`Failed to create member ${playerName}: ${insertError.message}`);
          result.success = false;
        } else {
          result.created++;
        }
      }

      return result;
    } catch (error) {
      console.error('Migration failed:', error);
      return {
        success: false,
        created: 0,
        skipped: 0,
        errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
};
