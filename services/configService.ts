import { supabase } from './supabaseClient';

export interface IlvlThresholds {
  min_ilvl: number;
  mythic_ilvl: number;
  heroic_ilvl: number;
}

const DEFAULT_THRESHOLDS: IlvlThresholds = {
  min_ilvl: 150,
  mythic_ilvl: 168,
  heroic_ilvl: 160,
};

export const configService = {
  async getIlvlThresholds(): Promise<IlvlThresholds> {
    try {
      const { data, error } = await supabase
        .from('configuration')
        .select('value')
        .eq('key', 'ilvl_thresholds')
        .maybeSingle();

      if (error) {
        console.error('Error fetching ilvl thresholds:', error);
        return DEFAULT_THRESHOLDS;
      }

      if (!data) {
        return DEFAULT_THRESHOLDS;
      }

      return data.value as IlvlThresholds;
    } catch (error) {
      console.error('Error in getIlvlThresholds:', error);
      return DEFAULT_THRESHOLDS;
    }
  },

  async updateIlvlThresholds(thresholds: IlvlThresholds): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('configuration')
        .upsert({
          key: 'ilvl_thresholds',
          value: thresholds,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('Error updating ilvl thresholds:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateIlvlThresholds:', error);
      return false;
    }
  },
};
