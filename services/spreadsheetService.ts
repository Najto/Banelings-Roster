
import { Player, WoWClass, Character, PlayerRole, SplitGroup, RaidBuff, ArmorCount } from '../types';

const ROSTER_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vS8AIcE-2b-IJohqlFiUCp0laqabWOptLdAk1OpL9o8LptWglWr2rMwnV-7YM6dwwGiEO9ruz7triLa/pub?gid=953594606&single=true&output=csv`;
const SPLITS_CSV_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vS8AIcE-2b-IJohqlFiUCp0laqabWOptLdAk1OpL9o8LptWglWr2rMwnV-7YM6dwwGiEO9ruz7triLa/pub?gid=1064018328&single=true&output=csv`;

const parseClass = (text: string): WoWClass => {
  const normalized = (text || "").toLowerCase();
  if (normalized.includes('death knight')) return WoWClass.DEATH_KNIGHT;
  if (normalized.includes('demon hunter')) return WoWClass.DEMON_HUNTER;
  if (normalized.includes('druid')) return WoWClass.DRUID;
  if (normalized.includes('evoker')) return WoWClass.EVOKER;
  if (normalized.includes('hunter')) return WoWClass.HUNTER;
  if (normalized.includes('mage')) return WoWClass.MAGE;
  if (normalized.includes('monk')) return WoWClass.MONK;
  if (normalized.includes('paladin')) return WoWClass.PALADIN;
  if (normalized.includes('priest')) return WoWClass.PRIEST;
  if (normalized.includes('rogue')) return WoWClass.ROGUE;
  if (normalized.includes('shaman')) return WoWClass.SHAMAN;
  if (normalized.includes('warlock')) return WoWClass.WARLOCK;
  if (normalized.includes('warrior')) return WoWClass.WARRIOR;
  return WoWClass.UNKNOWN;
};

const normalizeRole = (text: string): PlayerRole | null => {
  const normalized = text.toLowerCase().trim();
  if (normalized === 'tank' || normalized === 'tanks') return PlayerRole.TANK;
  if (normalized === 'heal' || normalized === 'healer') return PlayerRole.HEALER;
  if (normalized === 'meele' || normalized === 'melee') return PlayerRole.MELEE;
  if (normalized === 'range' || normalized === 'ranges') return PlayerRole.RANGE;
  return null;
};

const splitCSVRow = (row: string): string[] => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result;
};

export interface SheetSyncResult {
  roster: Player[];
  minIlvl: number;
}

export const fetchRosterFromSheet = async (): Promise<SheetSyncResult> => {
  try {
    const response = await fetch(`${ROSTER_CSV_URL}&t=${Date.now()}`);
    if (!response.ok) throw new Error("Sync failed");
    
    const csvText = await response.text();
    const rows = csvText.split(/\r?\n/).map(splitCSVRow);
    
    const minIlvlValue = rows[2]?.[2]?.replace(/^"|"$/g, '').trim();
    const minIlvl = parseInt(minIlvlValue) || 615;

    const dataRows = rows.slice(5, 100); 
    const players: Player[] = [];
    let currentRole: PlayerRole = PlayerRole.UNKNOWN;

    dataRows.forEach((row, index) => {
      const colA = row[0]?.replace(/^"|"$/g, '').trim();
      if (!colA || colA === "") return;

      const roleMarker = normalizeRole(colA);
      if (roleMarker) {
        currentRole = roleMarker;
        return; 
      }

      const playerName = colA;
      if (playerName.toLowerCase() === "spieler") return;

      const characters: Character[] = [];
      for (let i = 0; i < 6; i++) {
        const inputIdx = 1 + (i * 2);
        const resultIdx = 2 + (i * 2);
        
        const input = row[inputIdx]?.replace(/^"|"$/g, '').trim();
        const result = row[resultIdx]?.replace(/^"|"$/g, '').trim();

        if (input && result && result.includes('-')) {
          const [namePart, serverPart] = input.split('-');
          const parts = result.split(' - ');
          const classSpec = parts[0] || "";
          const ilvl = parseInt(parts[1]) || 0;
          
          characters.push({
            name: namePart?.trim() || "Unknown",
            playerName: playerName,
            className: parseClass(classSpec),
            itemLevel: ilvl,
            server: serverPart?.trim(),
            isMain: i === 0
          });
        }
      }

      if (characters.length > 0) {
        players.push({
          id: `p-${index}-${playerName}`,
          name: playerName,
          role: currentRole,
          mainCharacter: characters[0],
          splits: characters.slice(1)
        });
      }
    });

    return { roster: players, minIlvl };
  } catch (error) {
    console.error("Sheet Sync Error:", error);
    throw error;
  }
};

export const fetchSplitsFromSheet = async (): Promise<SplitGroup[]> => {
  try {
    const response = await fetch(`${SPLITS_CSV_URL}&t=${Date.now()}`);
    if (!response.ok) throw new Error("Splits Sync failed");
    
    const csvText = await response.text();
    const rows = csvText.split(/\r?\n/).map(splitCSVRow);

    const parseGroup = (colStart: number, buffCol: number): SplitGroup => {
      const players: SplitGroup['players'] = [];
      const buffs: RaidBuff[] = [];
      const utility: RaidBuff[] = [];
      const armor: ArmorCount = { cloth: 0, leather: 0, mail: 0, plate: 0 };
      
      let currentRole: PlayerRole = PlayerRole.UNKNOWN;
      let totalIlvl = 0;

      // Iterate player rows (from row 3 to roughly 35)
      for (let i = 2; i < 35; i++) {
        const row = rows[i];
        if (!row) continue;

        const roleLabel = row[colStart - 1]?.trim();
        const potentialRole = normalizeRole(roleLabel);
        if (potentialRole) currentRole = potentialRole;

        const name = row[colStart]?.trim();
        const classText = row[colStart + 1]?.trim();
        const typeText = row[colStart + 2]?.trim();
        const ilvl = parseInt(row[colStart + 3]) || 0;

        if (name && classText && name !== "Name") {
          const className = parseClass(classText);
          const isMain = typeText?.toLowerCase().includes('main');
          
          players.push({
            role: currentRole,
            name,
            playerName: name, // Default to name if unknown, usually matched in App.tsx
            className,
            isMain,
            ilvl
          });
          totalIlvl += ilvl;

          // Armor counts - ONLY for Mains
          if (isMain) {
            const cls = className;
            if ([WoWClass.MAGE, WoWClass.PRIEST, WoWClass.WARLOCK].includes(cls)) armor.cloth++;
            if ([WoWClass.DRUID, WoWClass.MONK, WoWClass.ROGUE, WoWClass.DEMON_HUNTER].includes(cls)) armor.leather++;
            if ([WoWClass.HUNTER, WoWClass.SHAMAN, WoWClass.EVOKER].includes(cls)) armor.mail++;
            if ([WoWClass.WARRIOR, WoWClass.PALADIN, WoWClass.DEATH_KNIGHT].includes(cls)) armor.plate++;
          }
        }

        // Buffs/Utility parsing from respective columns
        const buffNameRaw = row[buffCol]?.trim();
        const buffCheck = row[buffCol + 1]?.trim().toLowerCase();
        
        // Remove "Token" (case insensitive) from names as per request
        const buffName = buffNameRaw ? buffNameRaw.replace(/\bToken\b/gi, '').trim() : "";

        if (buffName && i < 15) {
          buffs.push({ name: buffName, active: buffCheck === 'true' || buffCheck === 'yes' || buffCheck === 'x' });
        } else if (buffName && i >= 28 && i < 34) {
          utility.push({ name: buffName, active: buffCheck === 'true' || buffCheck === 'yes' || buffCheck === 'x' });
        }
      }

      return {
        name: colStart < 5 ? "Split Group 1" : "Split Group 2",
        avgIlvl: players.length > 0 ? totalIlvl / players.length : 0,
        players,
        buffs,
        utility,
        armor
      };
    };

    // Grp 1 starts at Col B (index 1), Buffs at Col F (index 5)
    // Grp 2 starts at Col K (index 10), Buffs at Col O (index 14)
    return [parseGroup(1, 5), parseGroup(10, 14)];
  } catch (error) {
    console.error("Splits Parsing Error:", error);
    return [];
  }
};
