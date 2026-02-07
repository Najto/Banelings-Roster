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

export interface BattleNetConnection {
  id: string;
  user_id: string;
  battlenet_id: string;
  battletag: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  region: string;
  connected_at: string;
  last_synced_at: string | null;
}

export const battlenetOAuthService = {
  getOAuthUrl(region: string = 'eu'): string {
    const clientId = import.meta.env.VITE_BATTLENET_CLIENT_ID;
    if (!clientId) {
      throw new Error('Battle.net Client ID not configured');
    }

    const redirectUri = `${window.location.origin}/battlenet-callback`;
    const scope = 'wow.profile';

    const regionDomain = region === 'us' ? 'us' : region === 'kr' ? 'kr' : region === 'tw' ? 'tw' : 'eu';

    return `https://${regionDomain}.battle.net/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
  },

  async getConnection(userId: string): Promise<BattleNetConnection | null> {
    const { data, error } = await supabase
      .from('battlenet_connections')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Battle.net connection:', error);
      return null;
    }

    return data;
  },

  async saveConnection(
    userId: string,
    battlenetId: string,
    battletag: string,
    accessToken: string,
    refreshToken: string | null,
    expiresIn: number,
    region: string = 'eu'
  ) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error } = await supabase.from('battlenet_connections').upsert({
      user_id: userId,
      battlenet_id: battlenetId,
      battletag: battletag,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: expiresAt,
      region: region,
      last_synced_at: new Date().toISOString()
    });

    if (error) {
      console.error('Error saving Battle.net connection:', error);
      throw error;
    }
  },

  async removeConnection(userId: string) {
    await supabase.from('battlenet_connections').delete().eq('user_id', userId);
    await supabase.from('battlenet_characters').delete().eq('user_id', userId);
  },

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
