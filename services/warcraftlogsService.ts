const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://snxgbxwjldbknntpxuwu.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface WclWeeklyKill {
  bossName: string;
  difficulty: string;
  difficultyId: number;
}

export interface WarcraftLogsData {
  bestParse: number;
  medianPerformance: number;
  bestPerformance: number;
  allStarPoints: number;
  bossesLogged: number;
  totalKills: number;
  rankings: WarcraftLogsRanking[];
  weeklyRaidKills: WclWeeklyKill[];
}

export interface WarcraftLogsRanking {
  encounter: string;
  difficulty: number;
  rankPercent: number;
  totalKills: number;
  bestAmount: number;
  spec: string;
}

export const isWCLConfigured = (): boolean => {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
};

export interface WclZone {
  id: number;
  name: string;
}

export const fetchWclZones = async (expansionId: number = 11): Promise<WclZone[]> => {
  if (!isWCLConfigured()) return [];

  try {
    const url = `${SUPABASE_URL}/functions/v1/warcraftlogs`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'list-zones', expansionId }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.zones || []) as WclZone[];
  } catch {
    return [];
  }
};

export const fetchWarcraftLogsData = async (
  name: string,
  server: string,
  region: string = 'eu',
  wclZoneId?: number
): Promise<WarcraftLogsData | null> => {
  if (!isWCLConfigured()) return null;

  try {
    const url = `${SUPABASE_URL}/functions/v1/warcraftlogs`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        characterName: name.toLowerCase(),
        serverSlug: server.toLowerCase().replace(/\s+/g, '-'),
        serverRegion: region,
        ...(wclZoneId ? { wclZoneId } : {}),
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn(`[WCL] Request failed (${response.status}): ${text}`);
      return null;
    }

    const data = await response.json();
    if (!data || data.error) {
      console.warn('[WCL] Empty or error response:', data?.error || 'no data');
      return null;
    }

    const rankings: WarcraftLogsRanking[] = (data.rankings || []).map((r: any) => ({
      encounter: r.encounter?.name || r.encounterName || 'Unknown',
      difficulty: r.difficulty || 0,
      rankPercent: r.rankPercent || 0,
      totalKills: r.totalKills || 0,
      bestAmount: r.bestAmount || 0,
      spec: r.spec || '',
    }));

    const parseValues = rankings.map(r => r.rankPercent).filter(v => v > 0);
    const bestParse = parseValues.length > 0 ? Math.max(...parseValues) : 0;
    const medianPerformance = parseValues.length > 0
      ? parseValues.sort((a, b) => a - b)[Math.floor(parseValues.length / 2)]
      : 0;
    const bestPerformance = bestParse;
    const allStarPoints = data.allStarPoints || rankings.reduce((sum, r) => sum + r.rankPercent, 0);
    const bossesLogged = rankings.length;
    const totalKills = rankings.reduce((sum, r) => sum + r.totalKills, 0);

    const weeklyRaidKills: WclWeeklyKill[] = (data.weeklyRaidKills || []).map((k: any) => ({
      bossName: k.bossName || 'Unknown',
      difficulty: k.difficulty || 'Normal',
      difficultyId: k.difficultyId || 3,
    }));

    return {
      bestParse: Math.round(bestParse * 10) / 10,
      medianPerformance: Math.round(medianPerformance * 10) / 10,
      bestPerformance: Math.round(bestPerformance * 10) / 10,
      allStarPoints: Math.round(allStarPoints * 10) / 10,
      bossesLogged,
      totalKills,
      rankings,
      weeklyRaidKills,
    };
  } catch (err) {
    console.warn('[WCL] Fetch error (continuing without WCL data):', err);
    return null;
  }
};
