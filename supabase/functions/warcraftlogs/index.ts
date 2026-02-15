import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WCL_TOKEN_URL = "https://www.warcraftlogs.com/oauth/token";
const WCL_API_URL = "https://www.warcraftlogs.com/api/v2/client";
const WCL_CLIENT_ID = "a1043cfd-5817-41fb-bcae-9c0790f09a5e";
const WCL_CLIENT_SECRET = "tZ87YJXe7nf4iMtZz3DGpqicDmJymQiFstrULDuv";

const EMPTY_RESPONSE = { rankings: [], allStarPoints: 0, weeklyRaidKills: [] };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getResetTimestamp(): number {
  const now = new Date();
  const resetDay = 3;
  const resetHour = 8;
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), resetHour, 0, 0));
  const day = now.getUTCDay();
  const diff = day < resetDay ? (day + 7 - resetDay) : (day - resetDay);
  reset.setUTCDate(reset.getUTCDate() - diff);
  if (day === resetDay && now.getUTCHours() < resetHour) {
    reset.setUTCDate(reset.getUTCDate() - 7);
  }
  return reset.getTime();
}

async function getAccessToken(): Promise<string> {
  const credentials = btoa(`${WCL_CLIENT_ID}:${WCL_CLIENT_SECRET}`);
  const res = await fetch(WCL_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function queryWCL(
  token: string,
  query: string,
  variables: Record<string, unknown>
) {
  const res = await fetch(WCL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WCL API error (${res.status}): ${text}`);
  }

  return res.json();
}

function buildRankingsQuery(zoneId?: number): string {
  const zoneArg = zoneId ? `zoneID: ${zoneId}, ` : '';
  return `
    query ($name: String!, $server: String!, $region: String!) {
      characterData {
        character(name: $name, serverSlug: $server, serverRegion: $region) {
          mythic: zoneRankings(${zoneArg}difficulty: 5)
          heroic: zoneRankings(${zoneArg}difficulty: 4)
          normal: zoneRankings(${zoneArg}difficulty: 3)
          recentReports(limit: 15) {
            data {
              code
              startTime
              endTime
              zone { id name }
            }
          }
        }
      }
    }
  `;
}

const ZONES_QUERY = `
  query ($expansionId: Int!) {
    worldData {
      zones(expansion_id: $expansionId) {
        id
        name
      }
    }
  }
`;

const DIFFICULTY_MAP: Record<number, string> = { 3: "Normal", 4: "Heroic", 5: "Mythic" };

interface RaidBossKill {
  name: string;
  normal: number;
  heroic: number;
  mythic: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (body.action === "list-zones") {
      const token = await getAccessToken();
      const expansionId = body.expansionId || 11;
      const result = await queryWCL(token, ZONES_QUERY, { expansionId });
      const zones = result?.data?.worldData?.zones || [];
      return jsonResponse({ zones });
    }

    const { characterName, serverSlug, serverRegion, wclZoneId } = body;

    if (!characterName || !serverSlug || !serverRegion) {
      return jsonResponse({ error: "Missing characterName, serverSlug, or serverRegion" }, 400);
    }

    const token = await getAccessToken();
    const resetMs = getResetTimestamp();

    const rankingsQuery = buildRankingsQuery(wclZoneId);
    const result = await queryWCL(token, rankingsQuery, {
      name: characterName,
      server: serverSlug,
      region: serverRegion,
    });

    const character = result?.data?.characterData?.character;
    if (!character) {
      console.warn(`No WCL data found for ${characterName}-${serverSlug} (${serverRegion})`);
      return jsonResponse(EMPTY_RESPONSE);
    }

    const zoneData = character.mythic || character.heroic || character.normal;
    if (!zoneData) {
      return jsonResponse(EMPTY_RESPONSE);
    }

    const difficulty = character.mythic ? 5 : character.heroic ? 4 : 3;

    const rankings = (zoneData.rankings || []).map((r: Record<string, unknown>) => ({
      encounter: { name: (r.encounter as Record<string, unknown>)?.name || "Unknown" },
      difficulty,
      rankPercent: r.rankPercent || 0,
      totalKills: r.totalKills || 0,
      bestAmount: r.bestAmount || 0,
      spec: r.spec || "",
    }));

    const allStarPoints =
      Array.isArray(zoneData.allStars) && zoneData.allStars.length > 0
        ? zoneData.allStars[0].points || 0
        : 0;

    let weeklyRaidKills: { bossName: string; difficulty: string; difficultyId: number }[] = [];
    const raidBossKills: RaidBossKill[] = [];

    const recentReports = character.recentReports?.data || [];
    console.log(`[WCL] ${characterName}: ${recentReports.length} recent reports, filtering for zoneId=${wclZoneId}, resetMs=${resetMs}`);
    if (recentReports.length > 0) {
      console.log(`[WCL] Report zones: ${recentReports.map((r: { zone?: { id: number; name: string }; startTime: number }) => `${r.zone?.name || 'unknown'}(${r.zone?.id || '?'}) @${r.startTime}`).join(', ')}`);
    }
    const reportsThisWeek = recentReports.filter(
      (r: { startTime: number; zone?: { id: number } }) => {
        if (r.startTime < resetMs) return false;
        if (wclZoneId && r.zone?.id && r.zone.id !== wclZoneId) return false;
        return true;
      }
    );
    console.log(`[WCL] ${characterName}: ${reportsThisWeek.length} reports this week after filtering`);

    if (reportsThisWeek.length > 0) {
      const reportCodes = reportsThisWeek.map((r: { code: string }) => r.code);
      const aliases = reportCodes.map((code: string, i: number) =>
        `r${i}: report(code: "${code}") { fights(kill: true) { encounterID name difficulty } }`
      ).join("\n");

      const fightsQuery = `query { reportData { ${aliases} } }`;

      try {
        const fightsResult = await queryWCL(token, fightsQuery, {});
        const reportData = fightsResult?.data?.reportData || {};
        const bossKillsByDifficulty = new Map<string, { name: string; normal: number; heroic: number; mythic: number }>();
        const weeklyKillsForCompat = new Map<string, { bossName: string; difficulty: string; difficultyId: number }>();

        for (const key of Object.keys(reportData)) {
          const fights = reportData[key]?.fights || [];
          for (const fight of fights) {
            if (!fight.encounterID) continue;
            const diff = fight.difficulty || 0;
            if (diff < 3 || diff > 5) continue;

            const bossKey = fight.name || `encounter-${fight.encounterID}`;

            if (!bossKillsByDifficulty.has(bossKey)) {
              bossKillsByDifficulty.set(bossKey, { name: bossKey, normal: 0, heroic: 0, mythic: 0 });
            }

            const bossData = bossKillsByDifficulty.get(bossKey)!;
            if (diff === 3) bossData.normal++;
            else if (diff === 4) bossData.heroic++;
            else if (diff === 5) bossData.mythic++;

            const existing = weeklyKillsForCompat.get(bossKey);
            if (!existing || diff > existing.difficultyId) {
              weeklyKillsForCompat.set(bossKey, {
                bossName: bossKey,
                difficulty: DIFFICULTY_MAP[diff] || "Normal",
                difficultyId: diff,
              });
            }
          }
        }

        raidBossKills.push(...Array.from(bossKillsByDifficulty.values()));
        weeklyRaidKills = Array.from(weeklyKillsForCompat.values()).sort(
          (a, b) => b.difficultyId - a.difficultyId
        );
      } catch (fightErr) {
        console.warn("Failed to fetch fight data for weekly kills:", fightErr);
      }
    }

    return jsonResponse({ rankings, allStarPoints, weeklyRaidKills, raidBossKills });
  } catch (error) {
    console.error("WCL edge function error:", error);
    return jsonResponse(EMPTY_RESPONSE);
  }
});
