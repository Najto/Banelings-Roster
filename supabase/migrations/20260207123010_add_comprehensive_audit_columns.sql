/*
  # Add comprehensive audit column definitions

  1. New Columns
    - Currency: weathered, carved, runed, gilded crests
    - Reputation: 8 TWW factions
    - PvP: solo shuffle, 2v2, 3v3, kills, games
    - Activity: coffer keys, heroic/mythic dungeons, events
    - WarcraftLogs: best parse, median perf, all-star
    - M+ Rankings: realm, region, class rank
    - Raid: normal/heroic/mythic kills
    - Guild, Titles
*/

INSERT INTO audit_column_definitions (column_key, display_name, category, data_source, data_path, data_type, is_calculated, format_config)
SELECT v.column_key, v.display_name, v.category, v.data_source, v.data_path, v.data_type, v.is_calculated, v.format_config::jsonb
FROM (VALUES
  ('currencies_weathered', 'Weathered Crests', 'Currency', 'blizzard', 'currencies.weathered', 'number', false, '{}'),
  ('currencies_carved', 'Carved Crests', 'Currency', 'blizzard', 'currencies.carved', 'number', false, '{}'),
  ('currencies_runed', 'Runed Crests', 'Currency', 'blizzard', 'currencies.runed', 'number', false, '{}'),
  ('currencies_gilded', 'Gilded Crests', 'Currency', 'blizzard', 'currencies.gilded', 'number', false, '{}'),

  ('rep_dornogal', 'Dornogal', 'Reputation', 'blizzard', 'reputations.dornogal', 'number', false, '{}'),
  ('rep_deeps', 'Assembly of Deeps', 'Reputation', 'blizzard', 'reputations.deeps', 'number', false, '{}'),
  ('rep_arathi', 'Hallowfall Arathi', 'Reputation', 'blizzard', 'reputations.arathi', 'number', false, '{}'),
  ('rep_threads', 'Severed Threads', 'Reputation', 'blizzard', 'reputations.threads', 'number', false, '{}'),
  ('rep_karesh', 'Karesh', 'Reputation', 'blizzard', 'reputations.karesh', 'number', false, '{}'),
  ('rep_vandals', 'Brann Bronzebeard', 'Reputation', 'blizzard', 'reputations.vandals', 'number', false, '{}'),
  ('rep_undermine', 'Cartels of Undermine', 'Reputation', 'blizzard', 'reputations.undermine', 'number', false, '{}'),
  ('rep_gallagio', 'Gallagio Loyalty', 'Reputation', 'blizzard', 'reputations.gallagio', 'number', false, '{}'),

  ('pvp_solo', 'Solo Shuffle', 'PvP', 'blizzard', 'pvp.ratings.solo', 'number', false, '{}'),
  ('pvp_2v2', '2v2 Rating', 'PvP', 'blizzard', 'pvp.ratings.v2', 'number', false, '{}'),
  ('pvp_3v3', '3v3 Rating', 'PvP', 'blizzard', 'pvp.ratings.v3', 'number', false, '{}'),
  ('pvp_kills_total', 'HK Total', 'PvP', 'blizzard', 'pvp.kills', 'number', false, '{}'),
  ('pvp_games_season', 'Season Games', 'PvP', 'blizzard', 'pvp.games.season', 'number', false, '{}'),
  ('pvp_games_weekly', 'Weekly Games', 'PvP', 'blizzard', 'pvp.games.weekly', 'number', false, '{}'),

  ('activities_cofferKeys', 'Coffer Keys', 'Activity', 'blizzard', 'activities.cofferKeys', 'number', false, '{}'),
  ('activities_heroicDungeons', 'Heroic Dungeons', 'Activity', 'blizzard', 'activities.heroicDungeons', 'number', false, '{}'),
  ('activities_mythicDungeons', 'Mythic Dungeons', 'Activity', 'raiderio', 'activities.mythicDungeons', 'number', false, '{}'),
  ('activities_theater', 'Theater', 'Activity', 'blizzard', 'activities.events.theater', 'boolean', false, '{}'),
  ('activities_awakening', 'Awakening', 'Activity', 'blizzard', 'activities.events.awakening', 'boolean', false, '{}'),
  ('activities_worldsoul', 'Worldsoul', 'Activity', 'blizzard', 'activities.events.worldsoul', 'boolean', false, '{}'),
  ('activities_memories', 'Memories', 'Activity', 'blizzard', 'activities.events.memories', 'boolean', false, '{}'),

  ('mplus_rank_realm', 'M+ Realm Rank', 'Progress', 'raiderio', 'mPlusRanks.overall.realm', 'number', false, '{}'),
  ('mplus_rank_region', 'M+ Region Rank', 'Progress', 'raiderio', 'mPlusRanks.overall.region', 'number', false, '{}'),
  ('mplus_rank_class_realm', 'M+ Class Realm', 'Progress', 'raiderio', 'mPlusRanks.class.realm', 'number', false, '{}'),

  ('guild_name', 'Guild', 'Character', 'raiderio', 'guild', 'text', false, '{}'),
  ('collections_titles', 'Titles', 'Collections', 'blizzard', 'collections.titles', 'number', false, '{}'),

  ('warcraftlogs_bestParse', 'WCL Best Parse', 'WarcraftLogs', 'warcraftlogs', 'warcraftLogs.bestParse', 'percentage', false, '{}'),
  ('warcraftlogs_medianPerf', 'WCL Median Perf', 'WarcraftLogs', 'warcraftlogs', 'warcraftLogs.medianPerformance', 'percentage', false, '{}'),
  ('warcraftlogs_allstar', 'WCL All-Star', 'WarcraftLogs', 'warcraftlogs', 'warcraftLogs.allStarPoints', 'number', false, '{}'),
  ('warcraftlogs_bosses', 'WCL Bosses', 'WarcraftLogs', 'warcraftlogs', 'warcraftLogs.bossesLogged', 'number', false, '{}'),
  ('warcraftlogs_kills', 'WCL Kills', 'WarcraftLogs', 'warcraftlogs', 'warcraftLogs.totalKills', 'number', false, '{}'),

  ('raid_normal_kills', 'Normal Kills', 'Raid', 'raiderio', 'raidProgression.normal_kills', 'number', false, '{}'),
  ('raid_heroic_kills', 'Heroic Kills', 'Raid', 'raiderio', 'raidProgression.heroic_kills', 'number', false, '{}'),
  ('raid_mythic_kills', 'Mythic Kills', 'Raid', 'raiderio', 'raidProgression.mythic_kills', 'number', false, '{}')
) AS v(column_key, display_name, category, data_source, data_path, data_type, is_calculated, format_config)
WHERE NOT EXISTS (
  SELECT 1 FROM audit_column_definitions acd WHERE acd.column_key = v.column_key
);