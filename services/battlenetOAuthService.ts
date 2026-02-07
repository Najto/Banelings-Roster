import { supabase } from './supabaseClient';

export interface BattleNetCharacter {
  id: number;
  name: string;
  realm: {
    slug: string;
    name: string;
  };
  level: number;
  playable_class: {
    name: string;
  };
  playable_race: {
    name: string;
  };
  faction: {
    type: string;
  };
  guild?: {
    name: string;
    realm: {
      slug: string;
    };
  };
}

export const battlenetOAuthService = {
  async fetchCharacters(accessToken: string, region: string = 'eu'): Promise<BattleNetCharacter[]> {
    try {
      const response = await fetch(`https://${region}.api.blizzard.com/profile/user/wow?namespace=profile-${region}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Battle.net characters');
      }

      const data = await response.json();
      return data.wow_accounts?.flatMap((account: any) => account.characters || []) || [];
    } catch (error) {
      console.error('Error fetching Battle.net characters:', error);
      return [];
    }
  },

  async cacheCharacters(userId: string, characters: BattleNetCharacter[]) {
    const charRecords = characters.map(char => ({
      user_id: userId,
      character_id: char.id,
      character_name: char.name,
      realm: char.realm.slug,
      level: char.level,
      class: char.playable_class?.name || '',
      race: char.playable_race?.name || '',
      faction: char.faction?.type || '',
      guild_name: char.guild?.name || null,
      guild_realm: char.guild?.realm?.slug || null,
      fetched_at: new Date().toISOString()
    }));

    await supabase.from('battlenet_characters').delete().eq('user_id', userId);

    if (charRecords.length > 0) {
      const { error } = await supabase.from('battlenet_characters').insert(charRecords);
      if (error) {
        console.error('Error caching Battle.net characters:', error);
      }
    }
  },

  async getCachedCharacters(userId: string) {
    const { data, error } = await supabase
      .from('battlenet_characters')
      .select('*')
      .eq('user_id', userId)
      .order('character_name');

    if (error) {
      console.error('Error fetching cached characters:', error);
      return [];
    }

    return data || [];
  }
};
