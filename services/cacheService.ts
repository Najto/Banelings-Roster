import { supabase } from './supabaseClient';

const CACHE_DURATION_MINUTES = 30;

export const getCacheKey = (source: string, region: string, realm: string, characterName: string): string => {
  return `${source}:${region}:${realm.toLowerCase()}:${characterName.toLowerCase()}`;
};

export const getCachedData = async <T>(cacheKey: string): Promise<T | null> => {
  try {
    const { data, error } = await supabase
      .from('api_cache')
      .select('data, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error) {
      console.error('Cache read error:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      return null;
    }

    return data.data as T;
  } catch (error) {
    console.error('Cache read exception:', error);
    return null;
  }
};

export const setCachedData = async <T>(cacheKey: string, data: T): Promise<void> => {
  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CACHE_DURATION_MINUTES);

    const { error } = await supabase
      .from('api_cache')
      .upsert(
        {
          cache_key: cacheKey,
          data: data as any,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'cache_key'
        }
      );

    if (error) {
      console.error('Cache write error:', error);
    }
  } catch (error) {
    console.error('Cache write exception:', error);
  }
};

export const clearExpiredCache = async (): Promise<void> => {
  try {
    const { error } = await supabase
      .from('api_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Cache cleanup error:', error);
    }
  } catch (error) {
    console.error('Cache cleanup exception:', error);
  }
};

export const invalidateCache = async (cacheKey: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('api_cache')
      .delete()
      .eq('cache_key', cacheKey);

    if (error) {
      console.error('Cache invalidation error:', error);
    }
  } catch (error) {
    console.error('Cache invalidation exception:', error);
  }
};
