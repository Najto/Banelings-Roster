
import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, ExternalLink, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { persistenceService } from '../services/persistenceService';

const SPREADSHEET_WEB_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8AIcE-2b-IJohqlFiUCp0laqabWOptLdAk1OpL9o8LptWglWr2rMwnV-7YM6dwwGiEO9ruz7triLa/pubhtml";

export const Settings: React.FC = () => {
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

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    const status = await persistenceService.checkMigrationNeeded();
    setMigrationStatus(status);
  };

  const runMigration = async () => {
    setMigrating(true);
    setMigrationResult(null);

    const result = await persistenceService.migrateCharactersToRosterMembers();
    setMigrationResult(result);
    setMigrating(false);

    await checkMigrationStatus();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
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
