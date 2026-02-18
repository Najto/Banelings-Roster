# Banelings Roster Pro

A real-time, collaborative World of Warcraft guild management dashboard. It aggregates data from three external APIs (Blizzard Battle.net, Raider.io, WarcraftLogs), a Google Sheet source-of-truth, and stores everything in a Supabase PostgreSQL database with live multi-user sync.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Environment Variables](#environment-variables)
3. [Project Structure](#project-structure)
4. [How Data Flows: End-to-End](#how-data-flows-end-to-end)
5. [API Integrations](#api-integrations)
   - [Blizzard Battle.net API](#1-blizzard-battlenet-api)
   - [Raider.io API](#2-raiderio-api)
   - [WarcraftLogs API](#3-warcraftlogs-api-via-edge-function)
   - [Google Sheets](#4-google-sheets-as-roster-source)
6. [Database Schema](#database-schema)
   - [character_data](#character_data)
   - [roster_members](#roster_members)
   - [splits](#splits)
   - [configuration](#configuration)
   - [audit_column_definitions](#audit_column_definitions)
   - [audit_presets and audit_preset_columns](#audit_presets-and-audit_preset_columns)
   - [admin_users](#admin_users)
   - [enrichment_metadata](#enrichment_metadata)
7. [How Names Are Stored and Linked](#how-names-are-stored-and-linked)
8. [Supabase Edge Functions](#supabase-edge-functions)
9. [Services Reference](#services-reference)
10. [TypeScript Types](#typescript-types)
11. [Key Constants](#key-constants)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Database | Supabase (PostgreSQL + Realtime + RLS) |
| Serverless | Supabase Edge Functions (Deno) |
| Charts | Recharts |
| Icons | Lucide React |
| AI Analysis | Google Gemini 3 Pro (`@google/genai`) |
| Cron Jobs | pg_cron (hourly auto-sync) |

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Blizzard Battle.net (EU region, client credentials flow)
VITE_BLIZZARD_CLIENT_ID=your-blizzard-client-id
VITE_BLIZZARD_CLIENT_SECRET=your-blizzard-client-secret

# Google Gemini AI (for Roster Analysis feature)
VITE_GEMINI_API_KEY=your-gemini-api-key
```

The following secrets are set as Supabase Edge Function environment variables (not exposed to the frontend):

```env
# WarcraftLogs (set via Supabase dashboard Secrets section)
WCL_CLIENT_ID=your-wcl-client-id
WCL_CLIENT_SECRET=your-wcl-client-secret
```

---

## Project Structure

```
/
├── App.tsx                          # Root component, sync orchestration, tab routing
├── index.tsx                        # React entry point
├── types.ts                         # All TypeScript interfaces and enums
├── constants.ts                     # INITIAL_ROSTER, thresholds, KNOWN_RAIDS
│
├── components/
│   ├── RosterOverview.tsx           # Card-based player/character grid
│   ├── RosterTable.tsx              # Dense table view of all characters
│   ├── CharacterDetailView.tsx      # Full character detail panel
│   ├── RosterAudit.tsx              # Dynamic, configurable audit table
│   ├── SplitSetup.tsx               # Drag-and-drop raid split builder
│   ├── AnalyticsDashboard.tsx       # Charts, leaderboards, analytics
│   ├── StatOverview.tsx             # Summary statistics bar
│   ├── AddCharacterModal.tsx        # Modal to add a character to a player
│   ├── AddPlayerModal.tsx           # Modal to add a new guild member
│   ├── Settings.tsx                 # App settings (thresholds, raid config)
│   ├── GeminiAnalyzer.tsx           # AI roster analysis component
│   ├── WoWAuditView.tsx             # WoW audit integration view
│   ├── DynamicCell.tsx              # Renders a single audit table cell
│   ├── AuditColumnPicker.tsx        # Column visibility/order picker
│   ├── auditColumns.tsx             # Static audit column definitions
│   ├── ClassBadge.tsx               # WoW class colored badge
│   └── Toast.tsx                    # Toast notification component
│
├── services/
│   ├── supabaseClient.ts            # Singleton Supabase client
│   ├── blizzardService.ts           # All Blizzard Battle.net API calls
│   ├── raiderioService.ts           # Raider.io API + weekly calculation logic
│   ├── warcraftlogsService.ts       # WarcraftLogs proxy client
│   ├── spreadsheetService.ts        # Google Sheets CSV parser
│   ├── persistenceService.ts        # All Supabase read/write operations
│   ├── characterImportService.ts    # Single-character import and enrichment
│   ├── configService.ts             # App configuration (ilvl thresholds, raid)
│   ├── geminiService.ts             # Google Gemini AI roster analysis
│   ├── calculatedFieldsService.ts   # 45+ computed audit field functions
│   ├── auditTableService.ts         # Audit column/preset management
│   ├── realtimeService.ts           # Supabase Realtime subscriptions
│   └── presenceService.ts           # Live user presence tracking
│
├── hooks/
│   └── useToast.ts                  # Toast notification hook
│
└── supabase/
    ├── migrations/                  # 22 SQL migration files
    └── functions/
        ├── warcraftlogs/index.ts    # WCL GraphQL proxy edge function
        ├── sync-roster/index.ts     # Automated hourly roster sync
        └── create-admin/index.ts    # Admin user bootstrap
```

---

## How Data Flows: End-to-End

### 1. App Startup

When the app loads, `App.tsx` runs these steps in order:

```
App.tsx mounts
  └─> persistenceService.loadRosterFromDatabase()
      ├─> SELECT * FROM roster_members  (fetch guild member names + roles)
      ├─> SELECT * FROM character_data  (fetch all enriched character records)
      └─> Reconstruct Player[] array by matching character_data.player_name
              to roster_members.member_name
  └─> configService.getIlvlThresholds()   (load item level thresholds from DB)
  └─> configService.getCurrentRaid()      (load active raid config from DB)
  └─> realtimeService.subscribeCharacters()  (live DB -> React state sync)
  └─> realtimeService.subscribeRoster()
  └─> presenceService.trackPresence()     (show other online users)
```

### 2. Full Sync Operation

When a user clicks "Sync All", `App.tsx` runs `syncAll()`:

```
syncAll()
  ├─> fetchBlizzardToken()
  │   POST https://oauth.battle.net/token
  │   -> returns access_token (valid 24h)
  │
  └─> For each Player in roster:
      └─> For each Character (main + splits):
          │
          ├─> fetchRaiderIOData(name, realm, raidSlug)
          │   GET raider.io/api/v1/characters/profile
          │   -> score, recent M+ runs, raid progression, basic gear
          │   -> calculateWeeklyHistory() from runs since season start
          │
          ├─> [Parallel Blizzard calls]
          │   ├─> getCharacterSummary()    -> ilvl, spec, race, guild
          │   ├─> getCharacterStats()      -> crit, haste, mastery, vers
          │   ├─> getCharacterEquipment()  -> full gear slots, gems, enchants
          │   ├─> getCharacterAchievements() -> achievement count
          │   ├─> getCharacterCollections()  -> mounts, pets, toys count
          │   ├─> getCharacterProfessions()  -> profession names + ranks
          │   ├─> getCharacterPvPSummary()   -> honor level, total kills
          │   ├─> getCharacterPvPBracket('shuffle') -> solo shuffle rating
          │   ├─> getCharacterPvPBracket('2v2')
          │   ├─> getCharacterPvPBracket('3v3')
          │   ├─> getCharacterReputations()  -> faction standing values
          │   └─> getCharacterQuests()       -> completed quest IDs
          │
          ├─> fetchWarcraftLogsData(name, server, region, wclZoneId)
          │   POST {SUPABASE_URL}/functions/v1/warcraftlogs
          │   -> parse percentages, rankings, weekly raid kills
          │
          ├─> Merge all data into enriched Character object:
          │   ├─> Blizzard equipment overwrites RIO gear (more accurate)
          │   ├─> Build GearAudit: count enchants, gems, tier pieces
          │   ├─> Determine upgrade track per slot
          │   ├─> Map quest IDs to event booleans (Theater, Awakening, etc.)
          │   ├─> Map reputation faction values by name
          │   └─> computeWeeklyRaidKills() -> diff vs stored baseline
          │
          └─> persistenceService.bulkUpsertCharacterData()
              INSERT INTO character_data ON CONFLICT (character_name, realm)
              DO UPDATE SET enriched_data = ..., last_enriched_at = now()
```

### 3. Real-Time Collaboration

All connected clients subscribe to Supabase Realtime:

```
Supabase Realtime channel: 'character_data_changes'
  └─> On UPDATE/INSERT -> debounce 2s -> reload from DB -> update React state

Supabase Realtime channel: 'roster_members_changes'
  └─> On any change -> reload roster -> update React state

Supabase Realtime channel: 'splits:{guild_key}:{version}'
  └─> On UPDATE -> merge remote split data into local state
```

---

## API Integrations

### 1. Blizzard Battle.net API

**File:** `services/blizzardService.ts`

All calls target the EU region (`eu.api.blizzard.com`) with `namespace=profile-eu&locale=en_GB`.

#### Authentication

```
POST https://oauth.battle.net/token
Headers: Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Body:     grant_type=client_credentials

Response: { access_token: "eyJ...", expires_in: 86399 }
```

The token is fetched once per sync cycle and passed to all subsequent calls.

#### Character Summary

```
GET https://eu.api.blizzard.com/profile/wow/character/{realm}/{name}
    ?namespace=profile-eu&locale=en_GB
Headers: Authorization: Bearer {token}

Returns:
  equipped_item_level  -> Character.itemLevel
  active_spec.name     -> Character.spec
  race.name            -> Character.race
  character_class.name -> Character.className
  guild.name           -> Character.guild
```

#### Character Statistics

```
GET https://eu.api.blizzard.com/profile/wow/character/{realm}/{name}/statistics
    ?namespace=profile-eu&locale=en_GB

Returns (mapped to GearAudit.stats):
  melee_crit.value / spell_crit.value    -> stats.crit / stats.critPct
  melee_haste.value / spell_haste.value  -> stats.haste / stats.hastePct
  mastery.value                          -> stats.mastery / stats.masteryPct
  versatility_damage_done_bonus          -> stats.vers / stats.versPct
```

#### Character Equipment

```
GET https://eu.api.blizzard.com/profile/wow/character/{realm}/{name}/equipment
    ?namespace=profile-eu&locale=en_GB

Returns: equipped_items[] where each item contains:
  name                 -> SlotAudit.name
  level.value          -> SlotAudit.ilvl
  slot.type            -> slot key (HEAD, CHEST, WRIST, etc.)
  enchantments[]       -> SlotAudit.hasEnchant
  sockets[]            -> SlotAudit.gemsCount
  set.item_set.name    -> used to detect tier pieces
  limit_category       -> used to detect crafted/embellished items
```

The equipment data is merged with Raider.io gear data, with Blizzard taking precedence as it provides more accurate enchant and gem information.

#### Character Achievements

```
GET https://eu.api.blizzard.com/profile/wow/character/{realm}/{name}/achievements
    ?namespace=profile-eu&locale=en_GB

Returns:
  total_quantity -> Character.collections.achievements
```

#### Character Collections

Three parallel requests are made:

```
GET .../collections/mounts  -> mounts.mounts[].length -> Character.collections.mounts
GET .../collections/pets    -> pets.pets[].length     -> Character.collections.pets
GET .../collections/toys    -> toys.toys[].length     -> Character.collections.toys
```

#### Character Professions

```
GET https://eu.api.blizzard.com/profile/wow/character/{realm}/{name}/professions

Returns:
  primaries[].profession.name -> professions[].name
  primaries[].skill_points    -> professions[].rank
```

#### PvP Data

Three separate calls are made for PvP data:

```
GET .../pvp-summary
  -> honor_level        -> Character.pvp.honorLevel
  -> honorable_kills    -> Character.pvp.kills

GET .../pvp-bracket/shuffle
  -> rating             -> Character.pvp.ratings.solo

GET .../pvp-bracket/2v2
  -> rating             -> Character.pvp.ratings.v2

GET .../pvp-bracket/3v3
  -> rating             -> Character.pvp.ratings.v3
```

#### Reputations

```
GET .../reputations

Returns: reputations_gained[] where each entry has:
  faction.name     -> matched against tracked faction names (case-insensitive)
  standing.value   -> integer reputation value

Tracked Factions -> ReputationAudit field:
  "Council of Dornogal"              -> reputations.dornogal
  "Assembly of the Deeps"            -> reputations.deeps
  "Hallowfall Arathi"                -> reputations.arathi
  "The Severed Threads"              -> reputations.threads
  "Beledar's Spawn"                  -> reputations.karesh
  "Cartels of the Undermine"         -> reputations.undermine
  "Gallagio Loyalty Rewards Club"    -> reputations.gallagio
```

#### Quests

```
GET .../quests/completed

Returns: quests[] array of completed quest IDs

Tracked Quest IDs -> ActivityAudit.events field:
  82946 or 84042 -> events.theater    = true
  82710 or 82787 -> events.awakening  = true
  82458 or 82459 -> events.worldsoul  = true
  84488 or 84489 -> events.memories   = true
```

---

### 2. Raider.io API

**File:** `services/raiderioService.ts`

#### Character Profile

```
GET https://raider.io/api/v1/characters/profile
    ?region=eu
    &realm={realm}
    &name={name}
    &fields=mythic_plus_scores_by_season:current,
            mythic_plus_recent_runs,
            mythic_plus_ranks,
            mythic_plus_best_runs,
            mythic_plus_weekly_highest_level_runs,
            gear,
            raid_progression:{raidSlug},
            guild

Response mapped to Partial<Character>:
  mythic_plus_scores_by_season[0].scores.all  -> mPlusRating
  mythic_plus_recent_runs[]                   -> recentRuns (MPlusRun[])
  mythic_plus_ranks.overall / .class          -> mPlusRanks (MythicPlusRanks)
  gear.item_level_equipped                    -> itemLevel (fallback)
  gear.items[slot]                            -> GearAudit.slots
  raid_progression[raidSlug]                  -> raidProgression
  guild.name                                  -> guild
  thumbnail_url                               -> thumbnailUrl
  profile_url                                 -> profileUrl
  last_crawled_at                             -> lastSeen
```

#### Weekly M+ History Calculation

The EU weekly reset falls on **Wednesday at 08:00 UTC**. The app calculates the current reset timestamp and bins each run into its respective week:

```typescript
getCurrentResetTime()
  -> Finds the most recent Wednesday 08:00 UTC

calculateWeeklyHistory(runs, resetTime)
  -> Counts runs with mythic_level >= 10 per week
  -> Returns number[] where index 0 = this week, index 1 = last week, etc.
  -> Season started: 2024-11-19T08:00:00Z
```

The result is stored as `Character.weeklyHistory` and `Character.weeklyTenPlusCount`.

#### Weekly Raid Kill Diff

At the start of each new reset, the app compares the current total boss kills against a stored baseline snapshot:

```typescript
computeWeeklyRaidKills(current: RaidBossKill[], baseline, resetDate)
  -> If resetDate changed: use last week's latestKills as the new baseline
  -> For each boss: compare current.normal/heroic/mythic vs baseline values
  -> Any increase = a kill happened this week
  -> Returns: { count, details: WeeklyRaidKillDetail[], newBaseline }
```

This allows the app to show "killed 5 bosses this week" without requiring WarcraftLogs data.

#### Item Level Upgrade Track Mapping

```
ilvl >= 626  -> "Mythic"
ilvl >= 613  -> "Heroic"
ilvl >= 600  -> "Champion"
ilvl >= 587  -> "Veteran"
ilvl >= 574  -> "Adventurer"
ilvl <  574  -> "Explorer"
```

---

### 3. WarcraftLogs API (via Edge Function)

**Frontend client:** `services/warcraftlogsService.ts`
**Edge Function:** `supabase/functions/warcraftlogs/index.ts`

WarcraftLogs uses OAuth2 and a GraphQL API. Because the WCL `CLIENT_SECRET` must never be exposed to the browser, all requests are proxied through a Supabase Edge Function that holds the secret server-side.

#### Frontend to Edge Function Request

```
POST {SUPABASE_URL}/functions/v1/warcraftlogs
Headers:
  Authorization: Bearer {SUPABASE_ANON_KEY}
  Content-Type: application/json

Body (character data):
{
  "characterName": "dekoya",
  "serverSlug":    "blackhand",
  "serverRegion":  "eu",
  "wclZoneId":     44
}

Body (list zones):
{
  "action":      "list-zones",
  "expansionId": 11
}
```

#### Edge Function to WarcraftLogs

The edge function first obtains an OAuth token:

```
POST https://www.warcraftlogs.com/oauth/token
Headers: Authorization: Basic base64(WCL_CLIENT_ID:WCL_CLIENT_SECRET)
Body:    grant_type=client_credentials

-> access_token for subsequent GraphQL calls
```

Then it sends a GraphQL query:

```graphql
query ($name: String!, $server: String!, $region: String!) {
  characterData {
    character(name: $name, serverSlug: $server, serverRegion: $region) {
      mythic: zoneRankings(zoneID: 44, difficulty: 5)
      heroic: zoneRankings(zoneID: 44, difficulty: 4)
      normal: zoneRankings(zoneID: 44, difficulty: 3)
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
```

For weekly kill detection, the function filters `recentReports` to those after the current EU reset timestamp (Wednesday 08:00 UTC), then fetches fight data for each matching report:

```graphql
query {
  reportData {
    r0: report(code: "abc123") { fights(kill: true) { encounterID name difficulty } }
    r1: report(code: "def456") { fights(kill: true) { encounterID name difficulty } }
  }
}
```

#### Edge Function Response

```json
{
  "rankings": [
    {
      "encounter": { "name": "Sprocketmonger Lockenstock" },
      "difficulty": 5,
      "rankPercent": 87.3,
      "totalKills": 12,
      "bestAmount": 245000,
      "spec": "Devastation"
    }
  ],
  "mythicRankings": [],
  "highestDifficulty": 5,
  "allStarPoints": 420.5,
  "weeklyRaidKills": [
    { "bossName": "Vexie", "difficulty": "Mythic", "difficultyId": 5 }
  ],
  "raidBossKills": [
    { "name": "Vexie", "normal": 3, "heroic": 7, "mythic": 2 }
  ]
}
```

The frontend `warcraftlogsService.ts` then computes `bestParse`, `medianPerformance`, `bossesLogged`, `totalKills` from the rankings array and stores the result as `Character.warcraftLogs`.

---

### 4. Google Sheets as Roster Source

**File:** `services/spreadsheetService.ts`

The Google Sheet is published as CSV (no authentication required) and serves as the administrative source of truth for the roster structure.

#### Roster Sheet

```
Sheet ID: gid=953594606

Sheet Layout:
  Row 3, Column C : Minimum item level threshold (e.g., "615")
  Row 6+          : Data rows

  Column A : Player name (e.g., "Dekoya") OR role header ("Tank", "Healer", "Melee", "Range")
  Column B : Character 1 input  -> format "CharName-Server"   (e.g., "Dekoyalt-Blackhand")
  Column C : Character 1 result -> format "Class - iLvl"      (e.g., "Death Knight - 630")
  Column D : Character 2 input
  Column E : Character 2 result
  ... up to 6 character pairs (columns B through M)
```

Parsing logic:

1. Read row by row from row 6 onward.
2. If column A matches a role keyword (`Tank`, `Healer`, `Melee`, `Range`), set `currentRole` for all subsequent rows.
3. Otherwise, column A is treated as the `Player.name` (guild member name).
4. For each character pair, split the input on `-` to get `characterName` and `serverName`. Split the result on ` - ` to get class string and item level integer.
5. The first character pair (index 0) becomes `Player.mainCharacter` with `isMain = true`. All subsequent pairs become `Player.splits`.
6. `parseClass()` maps the class string to the `WoWClass` enum (case-insensitive substring match).

#### Splits Sheet

```
Sheet ID: gid=1064018328

Sheet Layout (two groups side by side):
  Group 1: Columns B-E  (index 1-4),  Buffs at Column F-G  (index 5-6)
  Group 2: Columns K-N  (index 10-13), Buffs at Column O-P  (index 14-15)

  Per group columns:
    [0] Role label (optional)
    [1] Character name
    [2] Class text
    [3] Type ("Main" / "Alt")
    [4] Item level (integer)
```

Each group is parsed into a `SplitGroup` object with:
- `players[]` - characters assigned to this split
- `buffs[]` - raid buff availability flags (rows 2-14 of the buff columns)
- `utility[]` - utility assignment flags (rows 28-33)
- `armor` - cloth/leather/mail/plate count (mains only)
- `avgIlvl` - average item level across all players

---

## Database Schema

All tables have Row Level Security enabled. The app uses Supabase's anonymous key for reads and writes, relying on open policies for collaborative access without mandatory login.

### `character_data`

The central table. Stores one row per character, uniquely identified by `character_name + realm`.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `character_name` | text NOT NULL | Character name, e.g. `"dekoyalt"` |
| `realm` | text NOT NULL | Realm slug, e.g. `"blackhand"` |
| `player_name` | text | Guild member name, e.g. `"Dekoya"` |
| `role` | text | Tank / Healer / Melee / Range |
| `class_name` | text | WoW class string |
| `is_main` | boolean | `true` if this is the player's main character |
| `split_order` | integer | Index among alts (0 = first alt, 1 = second, etc.) |
| `enriched_data` | jsonb | Full `Character` object from all API sources |
| `last_enriched_at` | timestamptz | Timestamp of last successful sync |
| `enrichment_status` | text | `'pending'` / `'success'` / `'failed'` |
| `error_count` | integer | Number of consecutive fetch failures |
| `last_error` | text | Last error message |
| `created_at` | timestamptz | Row creation time |
| `updated_at` | timestamptz | Auto-updated on change |

**Unique constraint:** `(character_name, realm)`

**`enriched_data` JSONB structure:**

```json
{
  "spec":                "Unholy",
  "race":                "Human",
  "itemLevel":           636,
  "mPlusRating":         2847,
  "weeklyTenPlusCount":  5,
  "weeklyHistory":       [5, 8, 3, 6, 7],
  "raidProgression": {
    "summary":        "8/8M",
    "normal_kills":   8,
    "heroic_kills":   8,
    "mythic_kills":   8,
    "total_bosses":   8,
    "aotc":           true,
    "ce":             true
  },
  "gearAudit": {
    "tierCount":  4,
    "enchantments": 8,
    "sockets":    12,
    "itemTracks": { "mythic": 5, "heroic": 8, "champion": 3 },
    "enchants":   { "cloak": true, "chest": true, "missingCount": 0 },
    "tierPieces": { "helm": true, "chest": true, "shoulder": true, "gloves": false, "legs": false },
    "vault": { "thisWeek": 5, "dungeon": ["+14", "+10", "-"], "raid": ["-", "-", "-"] },
    "slots": { "head": { "name": "...", "ilvl": 639, "track": "Mythic", "hasEnchant": true } }
  },
  "mPlusRanks": {
    "overall": { "world": 12400, "region": 3200, "realm": 45 },
    "class":   { "world": 800,   "region": 210,  "realm": 4 }
  },
  "raidBossKills": [
    { "name": "vexie", "normal": 3, "heroic": 8, "mythic": 2 }
  ],
  "raidKillBaseline": { "resetDate": "2026-02-12", "bossKills": [] },
  "weeklyRaidBossKills": 5,
  "weeklyRaidKillDetails": [
    { "bossName": "Vexie", "difficulty": "Mythic", "difficultyId": 5 }
  ],
  "warcraftLogs": {
    "bestParse":         94.2,
    "medianPerformance": 78.1,
    "allStarPoints":     412.5,
    "bossesLogged":      8,
    "totalKills":        64
  },
  "collections": { "mounts": 412, "pets": 887, "toys": 201, "achievements": 31420 },
  "pvp": { "honorLevel": 250, "kills": 12000, "ratings": { "solo": 1850, "v2": 0, "v3": 0 } },
  "reputations": { "dornogal": 42000, "deeps": 38500, "arathi": 21000 },
  "activities": { "events": { "theater": true, "awakening": false, "worldsoul": true, "memories": false } },
  "professions": [{ "name": "Blacksmithing", "rank": 100 }],
  "guild": "Banelings",
  "thumbnailUrl": "https://render.worldofwarcraft.com/...",
  "profileUrl":   "https://raider.io/characters/eu/blackhand/Dekoyalt"
}
```

---

### `roster_members`

Stores the list of guild members (people, not characters). One row per player.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `member_name` | text UNIQUE NOT NULL | The player's name, e.g. `"Dekoya"` |
| `role` | text | CHECK IN ('Tank','Healer','Melee','Range') |
| `display_order` | integer | Sort order in the UI |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `splits`

Stores drag-and-drop raid split configurations. Supports 4 named versions per guild.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `guild_key` | text NOT NULL | Derived from the Google Sheets URL path segment |
| `version_key` | text NOT NULL | `'main'` / `'alt1'` / `'alt2'` / `'alt3'` |
| `data` | jsonb | Array of `SplitGroup` objects |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint:** `(guild_key, version_key)`

The `guild_key` is extracted from the Google Sheets published URL:

```typescript
const match = SHEET_URL.match(/e\/(.+)\//);
// For URL: "https://docs.google.com/.../e/2PACX-1vS8AIcE-.../pub?..."
// guild_key = "2PACX-1vS8AIcE-..."
```

This ties all split data to a specific spreadsheet, so different guilds using their own sheets never share data.

---

### `configuration`

Stores key-value app settings.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `key` | text UNIQUE | Setting name |
| `value` | jsonb | Setting value |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Known keys:**

| Key | Value Shape | Description |
|---|---|---|
| `ilvl_thresholds` | `{ min_ilvl: 615, mythic_ilvl: 626, heroic_ilvl: 613 }` | Item level warning thresholds |
| `current_raid` | `{ raidName, raidSlug, wclZoneId, totalBosses }` | Active raid for all sync calls |

---

### `audit_column_definitions`

Defines every available column for the dynamic audit table. Populated by migration.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | |
| `column_key` | text UNIQUE | e.g. `"itemLevel"`, `"stats_crit"` |
| `display_name` | text | e.g. `"Item Level"`, `"Crit %"` |
| `category` | text | `"Basis"` / `"Stats"` / `"Gear"` / `"Progress"` / etc. |
| `data_source` | text | `"blizzard"` / `"raiderio"` / `"enriched"` / `"calculated"` |
| `data_path` | text | Dot-notation path into `Character`, e.g. `"gearAudit.tierCount"` |
| `data_type` | text | `"number"` / `"text"` / `"percentage"` / `"badge"` / `"date"` |
| `is_calculated` | boolean | Whether a function in `calculatedFieldsService` computes the value |
| `calculation_function` | text | Function name if `is_calculated = true` |
| `format_config` | jsonb | Rendering options (color ranges, suffixes, etc.) |
| `is_available` | boolean | Whether the column is selectable by users |

---

### `audit_presets` and `audit_preset_columns`

Store named column layout presets (e.g., "Weekly Check", "Gear Audit", "Progression").

**`audit_presets`:**

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | |
| `preset_name` | text UNIQUE | Display name |
| `is_default` | boolean | Loaded on first open |
| `is_system` | boolean | Cannot be deleted by users |

**`audit_preset_columns`** (join table):

| Column | Type | Description |
|---|---|---|
| `preset_id` | uuid -> `audit_presets(id)` CASCADE | |
| `column_key` | text | References `audit_column_definitions.column_key` |
| `is_visible` | boolean | |
| `column_order` | integer | Sort order |
| `column_width` | text | CSS width string |
| `alignment` | text | `"left"` / `"center"` / `"right"` |

**Unique constraint:** `(preset_id, column_key)`

---

### `admin_users`

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | |
| `email` | text UNIQUE | Admin email address |
| `password_hash` | text | Hashed password |
| `is_admin` | boolean | |

---

### `enrichment_metadata`

Tracks the status of the last full roster sync.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | |
| `roster_id` | text UNIQUE DEFAULT `'default'` | Identifies the roster |
| `last_enriched_at` | timestamptz | When the last full sync completed |
| `total_characters` | integer | Total characters in the last sync |
| `success_count` | integer | How many succeeded |
| `failed_count` | integer | How many failed |

---

## How Names Are Stored and Linked

The app distinguishes between two concepts:

- **Member Name** - The real person's name or nickname (e.g., `"Dekoya"`, `"Klaus"`)
- **Character Name** - The WoW character name (e.g., `"Dekoyalt"`, `"Clappocino"`)

### Storage Example

```
roster_members row:
  member_name  = "Dekoya"
  role         = "Melee"

character_data row (main):
  character_name = "dekoya"
  realm          = "blackhand"
  player_name    = "Dekoya"      <- links back to roster_members.member_name
  is_main        = true
  split_order    = 0

character_data row (first alt):
  character_name = "dekoyalt"
  realm          = "blackhand"
  player_name    = "Dekoya"      <- same link
  is_main        = false
  split_order    = 0             <- first alt (0-indexed)

character_data row (second alt):
  character_name = "dekoyhunter"
  realm          = "blackhand"
  player_name    = "Dekoya"
  is_main        = false
  split_order    = 1             <- second alt
```

### Reconstruction at Load Time

`persistenceService.loadRosterFromDatabase()` performs the join in TypeScript:

```
SELECT * FROM roster_members   -> list of members
SELECT * FROM character_data   -> all character rows

Group characters by player_name
For each member:
  main  = characters WHERE is_main = true  AND player_name = member.member_name
  alts  = characters WHERE is_main = false AND player_name = member.member_name
          ORDER BY split_order ASC

Build Player { id, name, role, mainCharacter, splits[] }
```

### Upsert Identity Key

When saving after a sync, the conflict resolution key is `(character_name, realm)`:

```sql
INSERT INTO character_data (...) VALUES (...)
ON CONFLICT (character_name, realm)
DO UPDATE SET
  enriched_data    = EXCLUDED.enriched_data,
  player_name      = EXCLUDED.player_name,
  last_enriched_at = now()
```

This guarantees the same character is never duplicated regardless of how many times sync is run.

---

## Supabase Edge Functions

### `warcraftlogs`

Proxies calls to the WarcraftLogs GraphQL API. Holds `WCL_CLIENT_ID` and `WCL_CLIENT_SECRET` server-side so they are never exposed to the browser.

**Supported actions:**
- Default (no `action` field): Fetch character zone rankings and weekly raid kills
- `action: "list-zones"`: Return all zones for a given expansion ID

**Authentication flow inside the function:**
1. POST to `https://www.warcraftlogs.com/oauth/token` with client credentials
2. Use the returned `access_token` as Bearer for all GraphQL requests to `https://www.warcraftlogs.com/api/v2/client`

### `sync-roster`

Automated roster sync triggered by `pg_cron` every hour. Fetches the Google Sheet, enriches all characters via the same pipeline as the manual sync, and saves results to the database. This runs even when no user has the app open, keeping data fresh.

### `create-admin`

Called once on app startup from `App.tsx`. Creates the default admin user row in the `admin_users` table if it does not already exist.

---

## Services Reference

| Service | Responsibility |
|---|---|
| `supabaseClient.ts` | Singleton Supabase client instance, initialized from env vars |
| `blizzardService.ts` | OAuth token fetch + all 10 Battle.net character endpoints |
| `raiderioService.ts` | Raider.io profile fetch, EU weekly reset calculation, boss kill diff, M+ weekly history |
| `warcraftlogsService.ts` | Frontend proxy client that posts to the WCL edge function |
| `spreadsheetService.ts` | CSV fetch and parse for the roster sheet and the splits sheet |
| `persistenceService.ts` | All Supabase CRUD: characters, roster members, splits, configuration |
| `characterImportService.ts` | Validate existence and enrich a single newly added character |
| `configService.ts` | Read/write item level thresholds and current raid from `configuration` table |
| `geminiService.ts` | Send roster JSON to Google Gemini for AI-generated composition recommendations |
| `calculatedFieldsService.ts` | 45+ computed field functions (gear score, vault status, weekly activity score, etc.) |
| `auditTableService.ts` | Load column definitions and presets; resolve cell values via path or calculation |
| `realtimeService.ts` | Supabase Realtime channel subscriptions for live roster/character/split sync |
| `presenceService.ts` | Track and display online users via Supabase Presence API |

---

## TypeScript Types

Core types defined in `types.ts`:

```typescript
// A guild member (the person)
interface Player {
  id:            string
  name:          string        // Member name, e.g. "Dekoya"
  role:          PlayerRole
  mainCharacter: Character
  splits:        Character[]
}

// A single WoW character (main or alt)
interface Character {
  name:                   string          // Character name, e.g. "Dekoyalt"
  className:              WoWClass
  spec?:                  string
  race?:                  string
  itemLevel:              number
  server?:                string          // Realm name
  isMain?:                boolean
  playerName?:            string          // Links back to Player.name
  mPlusRating?:           number
  weeklyTenPlusCount?:    number
  weeklyHistory?:         number[]        // Run counts per week, index 0 = current week
  recentRuns?:            MPlusRun[]
  raidProgression?:       RaidProgression
  gearAudit?:             GearAudit
  warcraftLogs?:          WarcraftLogsData
  mPlusRanks?:            MythicPlusRanks
  raidBossKills?:         RaidBossKill[]
  weeklyRaidBossKills?:   number
  weeklyRaidKillDetails?: WeeklyRaidKillDetail[]
  raidKillBaseline?:      RaidKillBaseline
  reputations?:           ReputationAudit
  activities?:            ActivityAudit
  collections?:           { mounts: number; pets: number; toys: number; achievements: number }
  pvp?:                   { honorLevel: number; kills: number; ratings: { solo: number; v2: number; v3: number } }
  professions?:           { name: string; rank: number }[]
  guild?:                 string
  thumbnailUrl?:          string
  profileUrl?:            string
}

enum WoWClass {
  DEATH_KNIGHT = 'Death Knight',
  DEMON_HUNTER = 'Demon Hunter',
  DRUID        = 'Druid',
  EVOKER       = 'Evoker',
  HUNTER       = 'Hunter',
  MAGE         = 'Mage',
  MONK         = 'Monk',
  PALADIN      = 'Paladin',
  PRIEST       = 'Priest',
  ROGUE        = 'Rogue',
  SHAMAN       = 'Shaman',
  WARLOCK      = 'Warlock',
  WARRIOR      = 'Warrior',
  UNKNOWN      = 'Unknown'
}

enum PlayerRole {
  TANK    = 'Tank',
  HEALER  = 'Healer',
  MELEE   = 'Melee',
  RANGE   = 'Range',
  UNKNOWN = 'Unknown'
}

type VersionKey = 'main' | 'alt1' | 'alt2' | 'alt3'

interface RaidConfig {
  raidName:    string   // e.g. "Manaforge Omega"
  raidSlug:    string   // e.g. "manaforge-omega" (used in Raider.io URL)
  wclZoneId:   number   // e.g. 44              (used in WCL GraphQL query)
  totalBosses: number
}
```

---

## Key Constants

```typescript
// constants.ts
ILVL_WARNING_THRESHOLD = 615    // Characters below this are flagged in the UI
WEEKLY_M_PLUS_GOAL     = 8      // Target weekly M+ runs for vault progress
WEEKLY_RAID_VAULT_GOAL = 6      // Target raid boss kills for vault progress

// types.ts - All supported raid tiers
KNOWN_RAIDS = [
  { raidName: 'Manaforge Omega',                raidSlug: 'manaforge-omega',               wclZoneId: 44, totalBosses: 8 },
  { raidName: 'Liberation of Undermine',        raidSlug: 'liberation-of-undermine',       wclZoneId: 42, totalBosses: 8 },
  { raidName: 'Nerub-ar Palace',                raidSlug: 'nerubar-palace',                wclZoneId: 38, totalBosses: 8 },
  { raidName: "Amirdrassil, the Dream's Hope",  raidSlug: 'amirdrassil-the-dreams-hope',   wclZoneId: 35, totalBosses: 9 },
  { raidName: 'Aberrus, the Shadowed Crucible', raidSlug: 'aberrus-the-shadowed-crucible', wclZoneId: 33, totalBosses: 9 },
  { raidName: 'Vault of the Incarnates',        raidSlug: 'vault-of-the-incarnates',       wclZoneId: 31, totalBosses: 8 },
]

// Split version labels
VERSION_LABELS = {
  main: 'Main Setup',
  alt1: 'Alternative Setup1',
  alt2: 'Alternative Setup2',
  alt3: 'Alternative Setup3'
}

// WoW class colors (official Blizzard hex values)
CLASS_COLORS = {
  'Death Knight': '#C41F3B',
  'Demon Hunter': '#A330C9',
  'Druid':        '#FF7D0A',
  'Evoker':       '#33937F',
  'Hunter':       '#ABD473',
  'Mage':         '#3FC7EB',
  'Monk':         '#00FF98',
  'Paladin':      '#F58CBA',
  'Priest':       '#FFFFFF',
  'Rogue':        '#FFF569',
  'Shaman':       '#0070DE',
  'Warlock':      '#8787ED',
  'Warrior':      '#C79C6E',
}
```
