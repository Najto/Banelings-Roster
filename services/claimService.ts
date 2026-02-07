import { supabase } from './supabaseClient';

export interface UserClaim {
  id: string;
  user_id: string;
  battlenet_id: string;
  guild_member_name: string;
  character_name: string;
  realm: string;
  claimed_at: string;
  verified: boolean;
  last_verified_at: string | null;
}

export interface ClaimableCharacter {
  memberName: string;
  characterName: string;
  realm: string;
  canClaim: boolean;
  alreadyClaimed: boolean;
  matchesBattleNet: boolean;
}

export const claimService = {
  async getUserClaims(userId: string): Promise<UserClaim[]> {
    const { data, error } = await supabase
      .from('user_claims')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user claims:', error);
      return [];
    }

    return data || [];
  },

  async claimCharacter(
    userId: string,
    battlenetId: string,
    guildMemberName: string,
    characterName: string,
    realm: string
  ): Promise<{ success: boolean; error?: string }> {
    const existing = await supabase
      .from('user_claims')
      .select('id')
      .eq('guild_member_name', guildMemberName)
      .maybeSingle();

    if (existing.data) {
      return { success: false, error: 'This character has already been claimed by another user' };
    }

    const battlenetChars = await supabase
      .from('battlenet_characters')
      .select('*')
      .eq('user_id', userId)
      .eq('character_name', characterName)
      .eq('realm', realm)
      .maybeSingle();

    const verified = !!battlenetChars.data;

    const { error } = await supabase.from('user_claims').insert({
      user_id: userId,
      battlenet_id: battlenetId,
      guild_member_name: guildMemberName,
      character_name: characterName,
      realm: realm,
      verified: verified,
      last_verified_at: verified ? new Date().toISOString() : null
    });

    if (error) {
      console.error('Error creating claim:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  async unclaimCharacter(claimId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('user_claims')
      .delete()
      .eq('id', claimId);

    if (error) {
      console.error('Error removing claim:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  async verifyUserClaims(userId: string): Promise<void> {
    const claims = await this.getUserClaims(userId);
    const battlenetChars = await supabase
      .from('battlenet_characters')
      .select('*')
      .eq('user_id', userId);

    if (!battlenetChars.data) return;

    for (const claim of claims) {
      const match = battlenetChars.data.find(
        char => char.character_name.toLowerCase() === claim.character_name.toLowerCase() &&
                char.realm.toLowerCase() === claim.realm.toLowerCase()
      );

      if (match && !claim.verified) {
        await supabase
          .from('user_claims')
          .update({
            verified: true,
            last_verified_at: new Date().toISOString()
          })
          .eq('id', claim.id);
      } else if (!match && claim.verified) {
        await supabase
          .from('user_claims')
          .update({
            verified: false,
            last_verified_at: new Date().toISOString()
          })
          .eq('id', claim.id);
      }
    }
  },

  async getAllClaims(): Promise<UserClaim[]> {
    const { data, error } = await supabase
      .from('user_claims')
      .select('*');

    if (error) {
      console.error('Error fetching all claims:', error);
      return [];
    }

    return data || [];
  }
};
