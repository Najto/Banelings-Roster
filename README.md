
# Banelings Roster Pro - Guild Management Dashboard

**Banelings Roster Pro** is a high-performance, comprehensive dashboard designed for World of Warcraft guilds. It serves as a central hub for roster management, split-run optimization, gear auditing, and performance analytics.

It aggregates data from **Google Sheets** (administrative roster), **Blizzard API** (official equipment/stats), and **Raider.io** (Mythic+ scores) to provide a unified view of the guild's readiness.

---

## 🚀 Key Features

### 1. Roster Management
- **Unified View:** consolidates Main characters and Alts (Split characters) into a single, searchable table.
- **Data Synchronization:** Fetches a CSV export from a Google Sheet and enriches it with real-time game data.
- **Filtering & Sorting:** Filter by Mains/Alts, Role, or specific classes. Sort by Item Level, Score, or Vault progress.

### 2. Master Audit (Gear & Performance)
- **Equipment Analysis:** Tracks Item Level, Tier Set bonuses (2pc/4pc), Embellishments, and Enchant/Gem status.
- **Great Vault Tracking:** Visualizes progress towards weekly rewards (Raid, Dungeon, World) based on recent activity.
- **Upgrade Tracks:** Categorizes gear by upgrade track (Explorer, Adventurer, Veteran, Champion, Heroic, Mythic).

### 3. Split Setup & Optimization
- **Drag-and-Drop Interface:** Interactive tool to organize 40+ players into balanced raid groups (Split 1 / Split 2).
- **Buff Coverage:** Automatically detects missing raid buffs (e.g., Battle Shout, Arcane Intellect, Windfury) based on group composition.
- **Armor Stacking:** Calculates armor type distribution (Cloth, Leather, Mail, Plate) to optimize loot funnels.
- **Cloud Sync:** Saves split configurations to Supabase, allowing officers to share layouts in real-time.

### 4. Intelligence & Analytics
- **Visual Charts:** Breakdown of Class distribution, Guild Activity trends, and Role balance.
- **Leaderboards:** Top lists for M+ Score, Item Level, and Weekly Activity.
- **AI Strategy:** Integrated Google Gemini 3 Pro to analyze the roster and suggest composition strategies.

---

## 🛠 Tech Stack

- **Frontend:** React 19, Vite, TypeScript
- **Styling:** Tailwind CSS (Dark Mode / Gaming Aesthetic)
- **Icons:** Lucide React
- **Visualization:** Recharts
- **Backend / Persistence:** Supabase (PostgreSQL)
- **AI:** Google GenAI SDK (Gemini 3 Pro)
- **External APIs:**
  - Blizzard Battle.net API (OAuth Client Credentials)
  - Raider.io API
  - Google Sheets (via CSV Publish)

---

## ⚙️ Architecture & Data Flow

1.  **Source of Truth (Google Sheets):** The guild leadership maintains the list of members and their character names in a Google Sheet.
2.  **Ingestion:** The app fetches this data via CSV export (`spreadsheetService.ts`).
3.  **Enrichment (The Sync Process):**
    - The app iterates through the roster.
    - **Raider.io:** Fetches Mythic+ score, recent runs, and raid progress.
    - **Blizzard:** Fetches precise equipment details (socketed gems, enchant IDs, item tracks).
4.  **Persistence:** Enriched data is upserted into **Supabase** (`character_data` table). This acts as a cache to prevent API rate limiting and allows fast loads on subsequent visits.
5.  **State Management:** React local state (`App.tsx`) manages the display, while services handle data fetching.

---

## 🔧 Setup & Installation

1.  **Clone the repository**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Configuration:**
    Create a `.env` file in the root directory.
    *Note: The project currently contains hardcoded fallbacks for demo purposes, but env vars are recommended.*
    ```env
    VITE_GEMINI_API_KEY=your_google_ai_key
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_key
    ```
4.  **Blizzard Credentials:**
    Update `services/blizzardService.ts` with your Battle.net Client ID and Secret if hosting your own instance.
5.  **Run Development Server:**
    ```bash
    npm run dev
    ```

---

## 📂 Project Structure

- **`App.tsx`**: Main controller. Handles the "Sync" logic and tab routing.
- **`components/`**:
  - `RosterTable`: The main grid view.
  - `CharacterDetailView`: The "Player Card" with deep-dive stats.
  - `SplitSetup`: The raid planning tool.
  - `GeminiAnalyzer`: AI integration.
- **`services/`**:
  - `blizzardService`: Handlers for Battle.net OAuth and endpoints.
  - `spreadsheetService`: CSV parsing logic for the Google Sheet.
  - `persistenceService`: Database layer (Supabase).
- **`types.ts`**: TypeScript definitions for the complex data models (GearAudit, Player, Character).

