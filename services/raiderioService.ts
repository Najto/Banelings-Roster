
import { Character, MPlusRun, GearItem, RaidProgress, MythicPlusBestRun } from '../types';

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

const GEAR_SLOTS = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'mainhand', 'offhand'];

const TIER_SLOTS = ['head', 'shoulder', 'chest', 'hands', 'legs'];

export const fetchRaiderIOData = async (name: string, realm: string): Promise<Partial<Character> | null> => {
  try {
    const fields = [
      'mythic_plus_scores_by_season:current',
      'mythic_plus_recent_runs',
      'mythic_plus_best_runs',
      'gear',
      'raid_progression',
      'talents'
    ].join(',');

    const url = `${BASE_URL}?region=eu&realm=${realm.toLowerCase()}&name=${name.toLowerCase()}&fields=${fields}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const resetTime = getCurrentResetTime();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    const allRuns: MPlusRun[] = (data.mythic_plus_recent_runs || []).map((run: any) => ({
      dungeon: run.dungeon,
      short_name: run.short_name,
      mythic_level: run.mythic_level,
      completed_at: run.completed_at,
      num_keystone_upgrades: run.num_keystone_upgrades,
      score: run.score,
      url: run.url
    }));

    const weeklyHistory = [0, 0, 0, 0];

    allRuns.forEach(run => {
      const runDate = new Date(run.completed_at);
      const diff = resetTime.getTime() - runDate.getTime();

      if (diff <= 0) {
        weeklyHistory[0]++;
      } else {
        const weeksAgo = Math.floor(diff / oneWeekMs) + 1;
        if (weeksAgo < 4) {
          weeklyHistory[weeksAgo]++;
        }
      }
    });

    const currentIdRuns = allRuns.filter(run => new Date(run.completed_at) >= resetTime);
    const weeklyTenPlusCount = currentIdRuns.filter(run => run.mythic_level >= 10).length;

    const gearItems: GearItem[] = GEAR_SLOTS.map(slot => {
      const item = data.gear?.items?.[slot];
      if (!item) return null;
      return {
        slot: slot,
        name: item.name || 'Unknown',
        itemLevel: item.item_level || 0,
        quality: item.quality || 'common',
        enchant: item.enchant || undefined,
        gems: item.gems?.map((g: any) => g.name) || [],
        bonusIds: item.bonuses || [],
        tier: TIER_SLOTS.includes(slot) && item.tier ? true : false
      };
    }).filter(Boolean) as GearItem[];

    const raidProgress: RaidProgress[] = Object.entries(data.raid_progression || {}).map(([key, raid]: [string, any]) => ({
      name: raid.summary?.split(' ')[0] || key,
      shortName: key,
      normalKills: raid.normal_bosses_killed || 0,
      heroicKills: raid.heroic_bosses_killed || 0,
      mythicKills: raid.mythic_bosses_killed || 0,
      totalBosses: raid.total_bosses || 0
    }));

    const bestRuns: MythicPlusBestRun[] = (data.mythic_plus_best_runs || []).map((run: any) => ({
      dungeon: run.dungeon,
      shortName: run.short_name,
      mythicLevel: run.mythic_level,
      completedAt: run.completed_at,
      keystoneUpgrades: run.num_keystone_upgrades,
      score: run.score,
      affixes: run.affixes?.map((a: any) => a.name) || []
    }));

    return {
      spec: data.active_spec_name,
      itemLevel: Math.round(data.gear?.item_level_equipped || 0),
      mPlusRating: Math.round(data.mythic_plus_scores_by_season?.[0]?.scores?.all || 0),
      weeklyTenPlusCount,
      weeklyHistory,
      recentRuns: allRuns,
      thumbnailUrl: data.thumbnail_url,
      profileUrl: data.profile_url,
      race: data.race,
      faction: data.faction,
      gear: gearItems,
      raidProgress,
      bestMythicPlusRuns: bestRuns,
      talentLoadout: data.talents?.selected_traits_url,
      achievementPoints: data.achievement_points,
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
