
import { SplitGroup } from '../types';

// We use a public bucket on kvdb.io. 
// Every guild using this app with a unique spreadsheet will have their own key.
const BUCKET_ID = 'AzerothPro_v1_Public';
const BASE_URL = `https://kvdb.io/A6j8J1P7b8Lq2N4m9Z`; // Public bucket

// Derives a unique ID from the spreadsheet URL to identify the guild
const getGuildKey = () => {
  const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8AIcE-2b-IJohqlFiUCp0laqabWOptLdAk1OpL9o8LptWglWr2rMwnV-7YM6dwwGiEO9ruz7triLa/";
  // Extract a unique part of the URL to use as a key
  const match = sheetUrl.match(/e\/(.+)\//);
  return match ? `splits_${match[1].substring(0, 32)}` : 'splits_default_guild';
};

export const persistenceService = {
  async saveSplits(splits: SplitGroup[]): Promise<boolean> {
    try {
      const key = getGuildKey();
      const response = await fetch(`${BASE_URL}/${key}`, {
        method: 'POST', // kvdb uses POST to set values
        body: JSON.stringify(splits),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to sync to shared cloud:', error);
      return false;
    }
  },

  async loadSplits(): Promise<SplitGroup[] | null> {
    try {
      const key = getGuildKey();
      const response = await fetch(`${BASE_URL}/${key}`);
      if (!response.ok) {
        if (response.status === 404) return null; // Not created yet
        throw new Error('Load failed');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load from shared cloud:', error);
      return null;
    }
  }
};
