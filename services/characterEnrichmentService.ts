import { Character, Player } from '../types';
import * as BlizzardAPI from './blizzardService';
import { fetchRaiderIOData } from './raiderioService';
import { enrichCharacterData } from './enrichmentService';
import { fetchWithRetry, RateLimiter } from './retryService';
import { saveCharacterData, getCharacterData, getAllCharacterData, updateEnrichmentMetadata } from './databaseService';

const normalizeRealm = (realm: string): string => {
  return realm.toLowerCase().replace(/\s+/g, '-').replace(/'/g, '');
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

  const result = await fetchWithRetry(
    async () => {
      let enrichedChar: Partial<Character> = {
        name,
        className: 'Unknown' as any,
        itemLevel: 0,
        server: realm
      };

      const raiderIOData = await raiderIORateLimiter.execute(() =>
        fetchRaiderIOData(name, normalizedRealm)
      );

      if (raiderIOData) {
        enrichedChar = { ...enrichedChar, ...raiderIOData };
      }

      const blizzardData = await enrichCharacterFromBlizzard(name, normalizedRealm, blizzardToken);

      if (blizzardData) {
        enrichedChar = { ...enrichedChar, ...blizzardData };
      }

      if (!raiderIOData && !blizzardData) {
        throw new Error('Both Raider.IO and Blizzard API failed');
      }

      const finalEnrichedData = await enrichCharacterData(
        enrichedChar,
        blizzardToken,
        normalizedRealm,
        name
      );

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
      `Failed to enrich character ${name}-${realm} after ${result.attempts} attempts:`,
      result.error?.message
    );
    return null;
  }

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
      const cacheKey = `${player.mainCharacter.name}-${player.mainCharacter.server}`;
      const cachedChar = cachedData.get(cacheKey);

      if (cachedChar) {
        enrichedPlayer.mainCharacter = { ...player.mainCharacter, ...cachedChar };
        progress.skipped++;
      } else {
        const enriched = await enrichCharacterComplete(
          player.mainCharacter.name,
          player.mainCharacter.server,
          blizzardToken
        );

        if (enriched) {
          enrichedPlayer.mainCharacter = { ...player.mainCharacter, ...enriched };
          await saveCharacterData(
            enrichedPlayer.mainCharacter,
            player.name,
            true,
            'success'
          );
          progress.successful++;
        } else {
          const oldData = await getCharacterData(
            player.mainCharacter.name,
            player.mainCharacter.server
          );

          if (oldData) {
            enrichedPlayer.mainCharacter = { ...player.mainCharacter, ...oldData };
            progress.skipped++;
          } else {
            await saveCharacterData(
              player.mainCharacter,
              player.name,
              true,
              'failed',
              'API enrichment failed'
            );
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
        const cacheKey = `${split.name}-${split.server}`;
        const cachedChar = cachedData.get(cacheKey);

        if (cachedChar) {
          enrichedSplits.push({ ...split, ...cachedChar });
          progress.skipped++;
        } else {
          const enriched = await enrichCharacterComplete(
            split.name,
            split.server,
            blizzardToken
          );

          if (enriched) {
            enrichedSplits.push({ ...split, ...enriched });
            await saveCharacterData(
              { ...split, ...enriched },
              player.name,
              false,
              'success'
            );
            progress.successful++;
          } else {
            const oldData = await getCharacterData(split.name, split.server);

            if (oldData) {
              enrichedSplits.push({ ...split, ...oldData });
              progress.skipped++;
            } else {
              enrichedSplits.push(split);
              await saveCharacterData(
                split,
                player.name,
                false,
                'failed',
                'API enrichment failed'
              );
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

    const mainKey = `${player.mainCharacter.name}-${player.mainCharacter.server}`;
    const cachedMain = cachedData.get(mainKey);
    if (cachedMain) {
      enrichedPlayer.mainCharacter = { ...player.mainCharacter, ...cachedMain };
    }

    enrichedPlayer.splits = player.splits.map(split => {
      const splitKey = `${split.name}-${split.server}`;
      const cachedSplit = cachedData.get(splitKey);
      return cachedSplit ? { ...split, ...cachedSplit } : split;
    });

    return enrichedPlayer;
  });

  return enrichedRoster;
};
