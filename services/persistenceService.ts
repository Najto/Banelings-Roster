import { SplitGroup } from '../types';
import { supabase } from './supabaseClient';

const getGuildKey = () => {
  const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8AIcE-2b-IJohqlFiUCp0laqabWOptLdAk1OpL9o8LptWglWr2rMwnV-7YM6dwwGiEO9ruz7triLa/";
  const match = sheetUrl.match(/e\/(.+)\//);
  return match ? `splits_${match[1].substring(0, 32)}` : 'splits_default_guild';
};

export const persistenceService = {
  async saveSplits(splits: SplitGroup[]): Promise<boolean> {
    try {
      const guildKey = getGuildKey();
      const { error } = await supabase
        .from('splits')
        .upsert(
          { guild_key: guildKey, data: splits, updated_at: new Date().toISOString() },
          { onConflict: 'guild_key' }
        );

      if (error) {
        console.error('Failed to save splits:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to sync to shared cloud:', error);
      return false;
    }
  },

  async loadSplits(): Promise<SplitGroup[] | null> {
    try {
      const guildKey = getGuildKey();
      const { data, error } = await supabase
        .from('splits')
        .select('data')
        .eq('guild_key', guildKey)
        .maybeSingle();

      if (error) {
        console.error('Failed to load splits:', error);
        return null;
      }

      return data?.data || null;
    } catch (error) {
      console.error('Failed to load from shared cloud:', error);
      return null;
    }
  }
};
