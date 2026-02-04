import { Character, Player } from '../types';
import * as BlizzardAPI from './blizzardService';
import { fetchRaiderIOData } from './raiderioService';
import { enrichCharacterData } from './enrichmentService';
import { fetchWithRetry, RateLimiter } from './retryService';
import { saveCharacterData, getCharacterData, getAllCharacterData, updateEnrichmentMetadata } from './databaseService';

const normalizeRealm = (realm: string): string => {
  return realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
};

const isCharacterStale = (character: Character, maxAgeMinutes: number = 60): boolean => {
  if (!character.lastEnrichedAt) {
    return true;
  }

  const lastEnriched = new Date(character.lastEnrichedAt);
  const now = new Date();
  const ageMinutes = (now.getTime() - lastEnriched.getTime()) / (1000 * 60);

  return ageMinutes >= maxAgeMinutes;
};

export interface EnrichmentProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}

const blizzardRateLimiter = new RateLimiter(5, 30);
const raiderIORateLimiter = new RateLimiter(3, 5);

export const enrichCharacterFromBlizzard = async (
  name: string,
  realm: string,
  blizzardToken: string
): Promise<Partial<Character> | null> => {
  const normalizedRealm = normalizeRealm(realm);

  try {
    const [charData, equipmentData, statsData] = await Promise.all([
      blizzardRateLimiter.execute(() =>
        BlizzardAPI.getCharacterData(blizzardToken, normalizedRealm, name)
      ),
      blizzardRateLimiter.execute(() =>
        BlizzardAPI.getCharacterEquipment(blizzardToken, normalizedRealm, name)
      ),
      blizzardRateLimiter.execute(() =>
        BlizzardAPI.getCharacterStats(blizzardToken, normalizedRealm, name)
      )
    ]);

    if (!charData) {
      return null;
    }

    const character: Partial<Character> = {
      name: charData.name,
      className: charData.className,
      itemLevel: charData.itemLevel,
      server: charData.realm
    };

    if (statsData) {
      character.stats = statsData;
    }

    return character;
  } catch (error) {
    console.error(`Failed to enrich from Blizzard: ${name}-${realm}`, error);
    return null;
  }
};

export const enrichCharacterComplete = async (
  name: string,
  realm: string,
  blizzardToken: string
): Promise<Character | null> => {
  const normalizedRealm = normalizeRealm(realm);

  console.log(`🚀 Starting complete enrichment for ${name}-${normalizedRealm}`);

  const result = await fetchWithRetry(
    async () => {
      let enrichedChar: Partial<Character> = {
        name,
        className: 'Unknown' as any,
        itemLevel: 0,
        server: realm
      };

      console.log(`  📊 Fetching Raider.IO data for ${name}-${normalizedRealm}...`);
      const raiderIOData = await raiderIORateLimiter.execute(() =>
        fetchRaiderIOData(name, normalizedRealm)
      );

      if (raiderIOData) {
        console.log(`  ✅ Raider.IO data fetched for ${name}-${normalizedRealm}`);
        enrichedChar = { ...enrichedChar, ...raiderIOData };
      } else {
        console.log(`  ⚠️ No Raider.IO data for ${name}-${normalizedRealm}`);
      }

      console.log(`  🎮 Fetching Blizzard data for ${name}-${normalizedRealm}...`);
      const blizzardData = await enrichCharacterFromBlizzard(name, normalizedRealm, blizzardToken);

      if (blizzardData) {
        console.log(`  ✅ Blizzard data fetched for ${name}-${normalizedRealm}`);
        enrichedChar = { ...enrichedChar, ...blizzardData };
      } else {
        console.log(`  ⚠️ No Blizzard data for ${name}-${normalizedRealm}`);
      }

      if (!raiderIOData && !blizzardData) {
        throw new Error('Both Raider.IO and Blizzard API failed');
      }

      console.log(`  🔧 Enriching additional data for ${name}-${normalizedRealm}...`);
      const finalEnrichedData = await enrichCharacterData(
        enrichedChar,
        blizzardToken,
        normalizedRealm,
        name
      );

      console.log(`  ✅ Full enrichment complete for ${name}-${normalizedRealm}`);

      return { ...enrichedChar, ...finalEnrichedData } as Character;
    },
    {
      maxRetries: 2,
      initialDelayMs: 1000,
      exponentialBase: 2
    }
  );

  if (!result.success || !result.data) {
    console.error(
      `❌ Failed to enrich character ${name}-${realm} after ${result.attempts} attempts:`,
      result.error?.message
    );
    return null;
  }

  console.log(`✅ Enrichment successful for ${name}-${realm}`);
  return result.data;
};

export const enrichRosterWithDatabase = async (
  roster: Player[],
  blizzardToken: string,
  onProgress?: (progress: EnrichmentProgress) => void
): Promise<Player[]> => {
  const cachedData = await getAllCharacterData();

  const progress: EnrichmentProgress = {
    total: roster.reduce((sum, p) => sum + 1 + p.splits.length, 0),
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0
  };

  const enrichedRoster: Player[] = [];

  for (const player of roster) {
    const enrichedPlayer = { ...player };

    if (player.mainCharacter.server && player.mainCharacter.name) {
      const normalizedRealm = normalizeRealm(player.mainCharacter.server);
      const cacheKey = `${player.mainCharacter.name}-${normalizedRealm}`;
      const cachedChar = cachedData.get(cacheKey);

      const shouldRefresh = !cachedChar || isCharacterStale(cachedChar);

      if (cachedChar && !shouldRefresh) {
        console.log(`⏭️ Skipping ${player.mainCharacter.name}-${normalizedRealm} (cached and fresh)`);
        enrichedPlayer.mainCharacter = { ...player.mainCharacter, ...cachedChar };
        progress.skipped++;
      } else {
        console.log(`🔄 Enriching ${player.mainCharacter.name}-${normalizedRealm}...`);

        const enriched = await enrichCharacterComplete(
          player.mainCharacter.name,
          player.mainCharacter.server,
          blizzardToken
        );

        if (enriched) {
          console.log(`✅ Enrichment successful for ${player.mainCharacter.name}-${normalizedRealm}`);
          enrichedPlayer.mainCharacter = { ...player.mainCharacter, ...enriched };

          try {
            await saveCharacterData(
              enrichedPlayer.mainCharacter,
              player.name,
              true,
              'success'
            );
            progress.successful++;
          } catch (saveError) {
            console.error(`❌ Failed to save ${player.mainCharacter.name}-${normalizedRealm}:`, saveError);
            progress.failed++;
          }
        } else {
          console.log(`❌ Enrichment failed for ${player.mainCharacter.name}-${normalizedRealm}`);

          const oldData = await getCharacterData(
            player.mainCharacter.name,
            normalizedRealm
          );

          if (oldData) {
            enrichedPlayer.mainCharacter = { ...player.mainCharacter, ...oldData };
            progress.skipped++;
          } else {
            try {
              await saveCharacterData(
                player.mainCharacter,
                player.name,
                true,
                'failed',
                'API enrichment failed'
              );
            } catch (saveError) {
              console.error(`❌ Failed to save error state for ${player.mainCharacter.name}-${normalizedRealm}:`, saveError);
            }
            progress.failed++;
          }
        }
      }

      progress.processed++;
      onProgress?.(progress);
    }

    const enrichedSplits: Character[] = [];
    for (const split of player.splits) {
      if (split.server && split.name) {
        const normalizedRealm = normalizeRealm(split.server);
        const cacheKey = `${split.name}-${normalizedRealm}`;
        const cachedChar = cachedData.get(cacheKey);

        const shouldRefresh = !cachedChar || isCharacterStale(cachedChar);

        if (cachedChar && !shouldRefresh) {
          console.log(`⏭️ Skipping split ${split.name}-${normalizedRealm} (cached and fresh)`);
          enrichedSplits.push({ ...split, ...cachedChar });
          progress.skipped++;
        } else {
          console.log(`🔄 Enriching split ${split.name}-${normalizedRealm}...`);

          const enriched = await enrichCharacterComplete(
            split.name,
            split.server,
            blizzardToken
          );

          if (enriched) {
            console.log(`✅ Enrichment successful for split ${split.name}-${normalizedRealm}`);
            enrichedSplits.push({ ...split, ...enriched });

            try {
              await saveCharacterData(
                { ...split, ...enriched },
                player.name,
                false,
                'success'
              );
              progress.successful++;
            } catch (saveError) {
              console.error(`❌ Failed to save split ${split.name}-${normalizedRealm}:`, saveError);
              progress.failed++;
            }
          } else {
            console.log(`❌ Enrichment failed for split ${split.name}-${normalizedRealm}`);

            const oldData = await getCharacterData(split.name, normalizedRealm);

            if (oldData) {
              enrichedSplits.push({ ...split, ...oldData });
              progress.skipped++;
            } else {
              enrichedSplits.push(split);

              try {
                await saveCharacterData(
                  split,
                  player.name,
                  false,
                  'failed',
                  'API enrichment failed'
                );
              } catch (saveError) {
                console.error(`❌ Failed to save error state for split ${split.name}-${normalizedRealm}:`, saveError);
              }

              progress.failed++;
            }
          }
        }

        progress.processed++;
        onProgress?.(progress);
      } else {
        enrichedSplits.push(split);
      }
    }

    enrichedPlayer.splits = enrichedSplits;
    enrichedRoster.push(enrichedPlayer);
  }

  await updateEnrichmentMetadata(
    progress.total,
    progress.successful,
    progress.failed
  );

  return enrichedRoster;
};

export const loadRosterFromDatabase = async (roster: Player[]): Promise<Player[]> => {
  const cachedData = await getAllCharacterData();

  const enrichedRoster: Player[] = roster.map(player => {
    const enrichedPlayer = { ...player };

    if (player.mainCharacter.name && player.mainCharacter.server) {
      const normalizedRealm = normalizeRealm(player.mainCharacter.server);
      const mainKey = `${player.mainCharacter.name}-${normalizedRealm}`;
      const cachedMain = cachedData.get(mainKey);
      if (cachedMain) {
        enrichedPlayer.mainCharacter = { ...player.mainCharacter, ...cachedMain };
      }
    }

    enrichedPlayer.splits = player.splits.map(split => {
      if (split.name && split.server) {
        const normalizedRealm = normalizeRealm(split.server);
        const splitKey = `${split.name}-${normalizedRealm}`;
        const cachedSplit = cachedData.get(splitKey);
        return cachedSplit ? { ...split, ...cachedSplit } : split;
      }
      return split;
    });

    return enrichedPlayer;
  });

  return enrichedRoster;
};
