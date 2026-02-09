
import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, ExternalLink, Users, AlertCircle, CheckCircle, Loader2, Sliders, Save, RefreshCw, Download, X, ChevronDown, ChevronUp } from 'lucide-react';
import { persistenceService } from '../services/persistenceService';
import { configService, IlvlThresholds } from '../services/configService';
import { characterImportService } from '../services/characterImportService';
import { WoWClass, PlayerRole } from '../types';

const SPREADSHEET_WEB_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8AIcE-2b-IJohqlFiUCp0laqabWOptLdAk1OpL9o8LptWglWr2rMwnV-7YM6dwwGiEO9ruz7triLa/pubhtml";

interface ImportStatus {
  status: 'pending' | 'importing' | 'success' | 'failed';
  error?: string;
}

interface SettingsProps {
  onRosterUpdate?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onRosterUpdate }) => {
  const [migrationStatus, setMigrationStatus] = useState<{
    needed: boolean;
    uniquePlayers: number;
    totalCharacters: number;
    existingMembers: number;
  } | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [thresholds, setThresholds] = useState<IlvlThresholds>({
    min_ilvl: 615,
    mythic_ilvl: 626,
    heroic_ilvl: 613,
  });
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [thresholdsSaved, setThresholdsSaved] = useState(false);

  // Spreadsheet import state
  const [spreadsheetData, setSpreadsheetData] = useState<any>(null);
  const [loadingSpreadsheet, setLoadingSpreadsheet] = useState(false);
  const [importStatuses, setImportStatuses] = useState<Map<string, ImportStatus>>(new Map());
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ total: 0, processed: 0, successful: 0, failed: 0 });
  const [showNewPlayers, setShowNewPlayers] = useState(true);
  const [showNewCharacters, setShowNewCharacters] = useState(true);

  useEffect(() => {
    checkMigrationStatus();
    loadThresholds();
    checkSpreadsheet();
  }, []);

  const checkMigrationStatus = async () => {
    const status = await persistenceService.checkMigrationNeeded();
    setMigrationStatus(status);
  };

  const loadThresholds = async () => {
    const loadedThresholds = await configService.getIlvlThresholds();
    setThresholds(loadedThresholds);
  };

  const saveThresholds = async () => {
    setSavingThresholds(true);
    setThresholdsSaved(false);

    const success = await configService.updateIlvlThresholds(thresholds);

    setSavingThresholds(false);
    if (success) {
      setThresholdsSaved(true);
      setTimeout(() => setThresholdsSaved(false), 3000);
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    setMigrationResult(null);

    const result = await persistenceService.migrateCharactersToRosterMembers();
    setMigrationResult(result);
    setMigrating(false);

    await checkMigrationStatus();
  };

  const checkSpreadsheet = async () => {
    setLoadingSpreadsheet(true);
    try {
      const data = await persistenceService.compareSpreadsheetWithDatabase();
      setSpreadsheetData(data);
    } catch (error) {
      console.error('Failed to check spreadsheet:', error);
    } finally {
      setLoadingSpreadsheet(false);
    }
  };

  const importSingleCharacter = async (
    charName: string,
    realm: string,
    className: WoWClass,
    isMain: boolean,
    playerName: string,
    role: PlayerRole
  ) => {
    const charKey = `${charName}-${realm}-${playerName}`;
    setImportStatuses(prev => new Map(prev).set(charKey, { status: 'importing' }));

    const result = await characterImportService.importCharacter(
      charName,
      realm,
      className,
      isMain,
      playerName,
      role
    );

    if (result.success) {
      setImportStatuses(prev => new Map(prev).set(charKey, { status: 'success' }));
      setTimeout(() => {
        setImportStatuses(prev => {
          const newMap = new Map(prev);
          newMap.delete(charKey);
          return newMap;
        });
      }, 3000);
      await checkSpreadsheet();
      // Trigger roster reload in parent component
      if (onRosterUpdate) {
        onRosterUpdate();
      }
    } else {
      setImportStatuses(prev => new Map(prev).set(charKey, {
        status: 'failed',
        error: result.error || 'Unknown error'
      }));
    }
  };

  const importAllCharacters = async () => {
    if (!spreadsheetData) return;

    setBatchImporting(true);
    const allImports: Array<{
      name: string;
      realm: string;
      className: WoWClass;
      isMain: boolean;
      playerName: string;
      role: PlayerRole;
      isNewPlayer: boolean;
    }> = [];

    // Collect all characters to import
    for (const newPlayer of spreadsheetData.newPlayers) {
      for (const char of newPlayer.characters) {
        allImports.push({
          name: char.name,
          realm: char.realm,
          className: char.className,
          isMain: char.isMain,
          playerName: newPlayer.playerName,
          role: newPlayer.role,
          isNewPlayer: true,
        });
      }
    }

    for (const newChar of spreadsheetData.newCharactersForExisting) {
      allImports.push({
        name: newChar.character.name,
        realm: newChar.character.realm,
        className: newChar.character.className,
        isMain: newChar.character.isMain,
        playerName: newChar.playerName,
        role: newChar.role,
        isNewPlayer: false,
      });
    }

    setBatchProgress({ total: allImports.length, processed: 0, successful: 0, failed: 0 });

    // Create roster members for new players first
    const newPlayerNames = new Set<string>();
    for (const imp of allImports) {
      if (imp.isNewPlayer && !newPlayerNames.has(imp.playerName)) {
        newPlayerNames.add(imp.playerName);
        const displayOrder = await persistenceService.getNextDisplayOrder();
        await persistenceService.createRosterMember(imp.playerName, imp.role, displayOrder);
      }
    }

    // Import characters sequentially
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (const imp of allImports) {
      const result = await characterImportService.importCharacter(
        imp.name,
        imp.realm,
        imp.className,
        imp.isMain,
        imp.playerName,
        imp.role
      );

      processed++;
      if (result.success) successful++;
      else failed++;

      setBatchProgress({ total: allImports.length, processed, successful, failed });

      // Small delay to avoid overwhelming the APIs
      await new Promise(r => setTimeout(r, 200));
    }

    setBatchImporting(false);
    await checkSpreadsheet();
    // Trigger roster reload in parent component
    if (onRosterUpdate) {
      onRosterUpdate();
    }
  };

  const getClassColor = (className: WoWClass): string => {
    const colors: Record<WoWClass, string> = {
      [WoWClass.DEATH_KNIGHT]: '#C41F3B',
      [WoWClass.DEMON_HUNTER]: '#A330C9',
      [WoWClass.DRUID]: '#FF7D0A',
      [WoWClass.EVOKER]: '#33937F',
      [WoWClass.HUNTER]: '#ABD473',
      [WoWClass.MAGE]: '#3FC7EB',
      [WoWClass.MONK]: '#00FF98',
      [WoWClass.PALADIN]: '#F58CBA',
      [WoWClass.PRIEST]: '#FFFFFF',
      [WoWClass.ROGUE]: '#FFF569',
      [WoWClass.SHAMAN]: '#0070DE',
      [WoWClass.WARLOCK]: '#8787ED',
      [WoWClass.WARRIOR]: '#C79C6E',
      [WoWClass.UNKNOWN]: '#94a3b8'
    };
    return colors[className] || '#94a3b8';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Spreadsheet Import Section */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 rounded-xl">
              <Download className="text-sky-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Spreadsheet Import</h2>
              <p className="text-slate-500 text-sm font-medium">Import new characters from spreadsheet</p>
            </div>
          </div>
          <button
            onClick={checkSpreadsheet}
            disabled={loadingSpreadsheet}
            className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
          >
            <RefreshCw size={14} className={loadingSpreadsheet ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loadingSpreadsheet ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-sky-400" size={32} />
          </div>
        ) : spreadsheetData ? (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">In Spreadsheet</div>
                <div className="text-2xl font-black text-white">{spreadsheetData.totalInSpreadsheet}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">In Database</div>
                <div className="text-2xl font-black text-white">{spreadsheetData.totalInDatabase}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">New Players</div>
                <div className="text-2xl font-black text-emerald-400">{spreadsheetData.newPlayers.length}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">New Characters</div>
                <div className="text-2xl font-black text-sky-400">{spreadsheetData.newCharactersForExisting.length}</div>
              </div>
            </div>

            <div className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              Last checked: {new Date(spreadsheetData.lastSyncCheck).toLocaleString()}
            </div>

            {/* Batch Import Button */}
            {(spreadsheetData.newPlayers.length > 0 || spreadsheetData.newCharactersForExisting.length > 0) && (
              <div className="space-y-4">
                <button
                  onClick={importAllCharacters}
                  disabled={batchImporting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:shadow-none"
                >
                  {batchImporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Importing {batchProgress.processed}/{batchProgress.total}...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Import All New Characters ({spreadsheetData.newPlayers.reduce((sum: number, p: any) => sum + p.characters.length, 0) + spreadsheetData.newCharactersForExisting.length})
                    </>
                  )}
                </button>

                {batchImporting && (
                  <div className="space-y-2">
                    <div className="w-full bg-black/60 rounded-full h-3 overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-300"
                        style={{ width: `${(batchProgress.processed / batchProgress.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span className="text-emerald-400">Success: {batchProgress.successful}</span>
                      <span className="text-red-400">Failed: {batchProgress.failed}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* New Players Section */}
            {spreadsheetData.newPlayers.length > 0 && (
              <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowNewPlayers(!showNewPlayers)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="text-emerald-400" size={20} />
                    <span className="text-white font-black text-sm uppercase tracking-wider">
                      New Players ({spreadsheetData.newPlayers.length})
                    </span>
                  </div>
                  {showNewPlayers ? <ChevronUp className="text-slate-500" size={20} /> : <ChevronDown className="text-slate-500" size={20} />}
                </button>

                {showNewPlayers && (
                  <div className="px-5 pb-4 space-y-3">
                    {spreadsheetData.newPlayers.map((player: any) => (
                      <div key={player.playerName} className="bg-black/60 border border-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-white font-black text-sm">{player.playerName}</div>
                            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">{player.role}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {player.characters.map((char: any) => {
                            const charKey = `${char.name}-${char.realm}-${player.playerName}`;
                            const status = importStatuses.get(charKey);
                            return (
                              <div key={charKey} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-lg p-3">
                                <div className="flex items-center gap-3 flex-1">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: getClassColor(char.className) }}
                                  />
                                  <div className="flex-1">
                                    <div className="text-white font-bold text-xs">{char.name}-{char.realm}</div>
                                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                                      <span style={{ color: getClassColor(char.className) }}>{char.className}</span>
                                      <span>•</span>
                                      <span>iLvl {char.itemLevel}</span>
                                      <span>•</span>
                                      <span>{char.isMain ? 'Main' : 'Split'}</span>
                                    </div>
                                  </div>
                                  {status && (
                                    <div className="flex items-center gap-2">
                                      {status.status === 'importing' && <Loader2 className="text-sky-400 animate-spin" size={16} />}
                                      {status.status === 'success' && <CheckCircle className="text-emerald-400" size={16} />}
                                      {status.status === 'failed' && (
                                        <div className="flex items-center gap-2">
                                          <X className="text-red-400" size={16} />
                                          <span className="text-red-400 text-xs">{status.error}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {!status && (
                                  <button
                                    onClick={() => importSingleCharacter(char.name, char.realm, char.className, char.isMain, player.playerName, player.role)}
                                    className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                                  >
                                    Import
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* New Characters for Existing Players */}
            {spreadsheetData.newCharactersForExisting.length > 0 && (
              <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowNewCharacters(!showNewCharacters)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="text-sky-400" size={20} />
                    <span className="text-white font-black text-sm uppercase tracking-wider">
                      New Characters for Existing Players ({spreadsheetData.newCharactersForExisting.length})
                    </span>
                  </div>
                  {showNewCharacters ? <ChevronUp className="text-slate-500" size={20} /> : <ChevronDown className="text-slate-500" size={20} />}
                </button>

                {showNewCharacters && (
                  <div className="px-5 pb-4 space-y-2">
                    {spreadsheetData.newCharactersForExisting.map((item: any) => {
                      const charKey = `${item.character.name}-${item.character.realm}-${item.playerName}`;
                      const status = importStatuses.get(charKey);
                      return (
                        <div key={charKey} className="flex items-center justify-between bg-black/60 border border-white/5 rounded-lg p-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getClassColor(item.character.className) }}
                            />
                            <div className="flex-1">
                              <div className="text-white font-bold text-xs">{item.character.name}-{item.character.realm}</div>
                              <div className="flex items-center gap-2 text-slate-500 text-xs">
                                <span className="text-slate-400">{item.playerName}</span>
                                <span>•</span>
                                <span style={{ color: getClassColor(item.character.className) }}>{item.character.className}</span>
                                <span>•</span>
                                <span>iLvl {item.character.itemLevel}</span>
                                <span>•</span>
                                <span>{item.character.isMain ? 'Main' : 'Split'}</span>
                              </div>
                            </div>
                            {status && (
                              <div className="flex items-center gap-2">
                                {status.status === 'importing' && <Loader2 className="text-sky-400 animate-spin" size={16} />}
                                {status.status === 'success' && <CheckCircle className="text-emerald-400" size={16} />}
                                {status.status === 'failed' && (
                                  <div className="flex items-center gap-2">
                                    <X className="text-red-400" size={16} />
                                    <span className="text-red-400 text-xs">{status.error}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {!status && (
                            <button
                              onClick={() => importSingleCharacter(item.character.name, item.character.realm, item.character.className, item.character.isMain, item.playerName, item.role)}
                              className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
                            >
                              Import
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* No New Characters */}
            {spreadsheetData.newPlayers.length === 0 && spreadsheetData.newCharactersForExisting.length === 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="text-emerald-400" size={20} />
                <span className="text-emerald-300 font-bold text-sm">All characters from spreadsheet are already imported</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-400" size={20} />
            <span className="text-red-300 font-bold text-sm">Failed to load spreadsheet data</span>
          </div>
        )}
      </div>
          <div className="flex flex-col items-end gap-2">
              <button 
                  onClick={syncAll}
                  disabled={isUpdating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-indigo-600/20"
              >
                  {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                  {isUpdating ? `SYNCING ${updateProgress.current}/${updateProgress.total}` : 'REFRESH DATA'}
              </button>
              {isUpdating && (
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-300" 
                    style={{ width: `${(updateProgress.current / updateProgress.total) * 100}%` }} 
                  />
                </div>
              )}
          </div>
      {/* Item Level Thresholds Section */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-500/10 rounded-xl">
            <Sliders className="text-amber-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Item Level Thresholds</h2>
            <p className="text-slate-500 text-sm font-medium">Configure color-coded item level thresholds</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/40 border border-white/10 rounded-xl p-5">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 block">
                Minimum Item Level
              </label>
              <input
                type="number"
                value={thresholds.min_ilvl}
                onChange={(e) => setThresholds({ ...thresholds, min_ilvl: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-black focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <p className="text-slate-600 text-xs mt-2">Items below this will be marked red</p>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-5">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 block">
                Heroic Track Item Level
              </label>
              <input
                type="number"
                value={thresholds.heroic_ilvl}
                onChange={(e) => setThresholds({ ...thresholds, heroic_ilvl: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-black focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
              <p className="text-slate-600 text-xs mt-2">Items at this level will be marked blue</p>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-5">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 block">
                Mythic Track Item Level
              </label>
              <input
                type="number"
                value={thresholds.mythic_ilvl}
                onChange={(e) => setThresholds({ ...thresholds, mythic_ilvl: parseInt(e.target.value) || 0 })}
                className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-black focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <p className="text-slate-600 text-xs mt-2">Items at this level will be marked gold</p>
            </div>
          </div>

          {thresholdsSaved && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="text-emerald-400" size={20} />
              <span className="text-emerald-300 font-bold text-sm">Thresholds saved successfully</span>
            </div>
          )}

          <button
            onClick={saveThresholds}
            disabled={savingThresholds}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 disabled:shadow-none"
          >
            {savingThresholds ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Thresholds
              </>
            )}
          </button>
        </div>
      </div>

      {/* Migration Section */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Users className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Roster Migration</h2>
            <p className="text-slate-500 text-sm font-medium">Migrate existing characters to roster members</p>
          </div>
        </div>

        {migrationStatus && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Characters</div>
                <div className="text-2xl font-black text-white">{migrationStatus.totalCharacters}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Existing Members</div>
                <div className="text-2xl font-black text-white">{migrationStatus.existingMembers}</div>
              </div>
              <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Players to Migrate</div>
                <div className="text-2xl font-black text-emerald-400">{migrationStatus.uniquePlayers}</div>
              </div>
            </div>

            {migrationStatus.needed ? (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <div className="text-blue-300 font-bold text-sm mb-1">Migration Available</div>
                  <div className="text-slate-400 text-xs">
                    Found {migrationStatus.uniquePlayers} player{migrationStatus.uniquePlayers !== 1 ? 's' : ''} in character_data that need to be added to roster_members.
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="text-emerald-400 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <div className="text-emerald-300 font-bold text-sm mb-1">All Players Migrated</div>
                  <div className="text-slate-400 text-xs">
                    All players from character_data are already in roster_members.
                  </div>
                </div>
              </div>
            )}

            {migrationResult && (
              <div className={`${migrationResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} border rounded-xl p-4`}>
                <div className={`${migrationResult.success ? 'text-emerald-300' : 'text-red-300'} font-bold text-sm mb-2`}>
                  Migration {migrationResult.success ? 'Completed' : 'Failed'}
                </div>
                <div className="text-slate-400 text-xs space-y-1">
                  <div>Created: {migrationResult.created} member{migrationResult.created !== 1 ? 's' : ''}</div>
                  <div>Skipped: {migrationResult.skipped} (already exist{migrationResult.skipped !== 1 ? '' : 's'})</div>
                  {migrationResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {migrationResult.errors.map((error, idx) => (
                        <div key={idx} className="text-red-400 text-xs">{error}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={runMigration}
              disabled={migrating || !migrationStatus.needed}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 disabled:shadow-none"
            >
              {migrating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Users size={16} />
                  Run Migration
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Section */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <FileSpreadsheet className="text-emerald-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Source Spreadsheet</h2>
              <p className="text-slate-500 text-sm font-medium">Verknüpfte Google Tabelle verwalten</p>
            </div>
          </div>
          <a 
            href="https://docs.google.com/spreadsheets/d/1vS8AIcE-2b-IJohqlFiUCp0laqabWOptLdAk1OpL9o8LptWglWr2rMwnV-7YM6dwwGiEO9ruz7triLa/edit" 
            target="_blank" 
            rel="noreferrer"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
          >
            <ExternalLink size={14} />
            Open Spreadsheet
          </a>
        </div>

        <div className="rounded-xl border border-white/10 overflow-hidden bg-black h-[600px] relative group">
          <iframe 
            src={SPREADSHEET_WEB_URL} 
            className="w-full h-full border-none opacity-80 group-hover:opacity-100 transition-opacity"
            title="Guild Spreadsheet"
          />
          <div className="absolute inset-0 pointer-events-none border-2 border-indigo-500/10 rounded-xl"></div>
        </div>
        <p className="mt-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center italic">
          Hinweis: Die eingebettete Ansicht dient nur zur Kontrolle. Änderungen müssen direkt in Google Sheets vorgenommen werden.
        </p>
      </div>
    </div>
  );
};
