
import { Character, WoWClass, MPlusRun } from '../types';

const BASE_URL = "https://raider.io/api/v1/characters/profile";

/**
 * Berechnet den Startzeitpunkt der aktuellen EU-ID (Mittwoch 08:00 UTC)
 */
const getCurrentResetTime = (): Date => {
  const now = new Date();
  const resetDay = 3; // Mittwoch
  const resetHour = 8; // 08:00 UTC
  
  const currentReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), resetHour, 0, 0));
  
  const day = now.getUTCDay();
  const diff = day < resetDay ? (day + 7 - resetDay) : (day - resetDay);
  
  currentReset.setUTCDate(currentReset.getUTCDate() - diff);
  
  // Wenn es Mittwoch ist, aber vor 08:00, gehören wir noch zur Vorwoche
  if (day === resetDay && now.getUTCHours() < resetHour) {
    currentReset.setUTCDate(currentReset.getUTCDate() - 7);
  }
  
  return currentReset;
};

export const fetchRaiderIOData = async (name: string, realm: string): Promise<Partial<Character> | null> => {
  try {
    const url = `${BASE_URL}?region=eu&realm=${realm.toLowerCase()}&name=${name.toLowerCase()}&fields=mythic_plus_scores_by_season:current,mythic_plus_recent_runs,gear`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const resetTime = getCurrentResetTime();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    const allRuns: MPlusRun[] = data.mythic_plus_recent_runs.map((run: any) => ({
      dungeon: run.dungeon,
      short_name: run.short_name,
      mythic_level: run.mythic_level,
      completed_at: run.completed_at,
      num_keystone_upgrades: run.num_keystone_upgrades,
      score: run.score,
      url: run.url
    }));

    // Bucketing der Runs in IDs (0 = aktuell, 1 = letzte Woche, etc.)
    const weeklyHistory = [0, 0, 0, 0];
    
    allRuns.forEach(run => {
      const runDate = new Date(run.completed_at);
      const diff = resetTime.getTime() - runDate.getTime();
      
      if (diff <= 0) {
        // Aktuelle ID
        weeklyHistory[0]++;
      } else {
        const weeksAgo = Math.floor(diff / oneWeekMs) + 1;
        if (weeksAgo < 4) {
          weeklyHistory[weeksAgo]++;
        }
      }
    });

    // Für die Tabelle zeigen wir nur Runs der aktuellen ID, die >= 10 sind
    const currentIdRuns = allRuns.filter(run => new Date(run.completed_at) >= resetTime);
    const weeklyTenPlusCount = currentIdRuns.filter(run => run.mythic_level >= 10).length;

    return {
      spec: data.active_spec_name,
      itemLevel: Math.round(data.gear?.item_level_equipped || 0),
      mPlusRating: Math.round(data.mythic_plus_scores_by_season?.[0]?.scores?.all || 0),
      weeklyTenPlusCount,
      weeklyHistory,
      recentRuns: allRuns,
      thumbnailUrl: data.thumbnail_url,
      profileUrl: data.profile_url,
      lastSeen: (() => {
        const d = new Date(data.last_crawled_at);
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        return `${time} - ${day}/${month}/${year}`;
      })()
    };
  } catch (error) {
    console.error(`Raider.io fetch failed for ${name}-${realm}:`, error);
    return null;
  }
};
