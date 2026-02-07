
import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_ROSTER } from './constants';
import { Player, MemberMapping, PlayerRole, SplitGroup } from './types';
import { RosterTable } from './components/RosterTable';
import { StatOverview } from './components/StatOverview';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SplitSetup } from './components/SplitSetup';
import { Settings } from './components/Settings';
import { fetchRosterFromSheet, fetchSplitsFromSheet } from './services/spreadsheetService';
import { fetchBlizzardToken } from './services/blizzardService';
import { enrichRosterWithDatabase, loadRosterFromDatabase, EnrichmentProgress } from './services/characterEnrichmentService';
import { isDataStale, getEnrichmentMetadata } from './services/databaseService';
import { CharacterDetailView } from './components/CharacterDetailView';
import { Audit } from './components/Audit';
import { LayoutGrid, Users, RefreshCw, Settings as SettingsIcon, AlertTriangle, Zap, Split, List, User, ClipboardCheck, Clock } from 'lucide-react';

const App: React.FC = () => {
  const [roster, setRoster] = useState<Player[]>(INITIAL_ROSTER);
  const [splits, setSplits] = useState<SplitGroup[]>([]);
  const [minIlvl, setMinIlvl] = useState<number>(615);
  const [activeTab, setActiveTab] = useState<'roster' | 'audit' | 'analytics' | 'splits' | 'settings'>('roster');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("Nie");
  const [rosterViewMode, setRosterViewMode] = useState<'table' | 'detail'>('table');
  const [enrichmentProgress, setEnrichmentProgress] = useState<EnrichmentProgress | null>(null);
  const [isEnriched, setIsEnriched] = useState(false);

  const enrichWithFullAPIData = useCallback(async (baseRoster: Player[]) => {
    const mappings: MemberMapping[] = JSON.parse(localStorage.getItem('guild_mappings') || "[]");

    const token = await fetchBlizzardToken();
    if (!token) {
      console.error('Failed to fetch Blizzard token');
      return baseRoster;
    }

    const enrichedRoster = await enrichRosterWithDatabase(
      baseRoster,
      token,
      (progress) => {
        setEnrichmentProgress(progress);
      }
    );

    setEnrichmentProgress(null);

    const finalRoster = enrichedRoster.map(player => {
      const mapping = mappings.find(m => m.memberName.toLowerCase() === player.name.toLowerCase());
      const finalRole = (mapping && mapping.role && mapping.role !== PlayerRole.UNKNOWN)
        ? mapping.role
        : player.role;

      return { ...player, role: finalRole };
    });

    setRoster(finalRoster);
    setIsEnriched(true);

    const metadata = await getEnrichmentMetadata();
    if (metadata?.last_enriched_at) {
      setLastUpdate(new Date(metadata.last_enriched_at).toLocaleTimeString());
    }
  }, []);

  const syncWithSheet = useCallback(async (withEnrichment: boolean = false) => {
    setIsUpdating(true);
    setError(null);
    try {
      const [rosterResult, splitsResult] = await Promise.all([
        fetchRosterFromSheet(),
        fetchSplitsFromSheet()
      ]);

      setSplits(splitsResult);
      setMinIlvl(rosterResult.minIlvl);

      if (rosterResult.roster.length > 0) {
        const mappings: MemberMapping[] = JSON.parse(localStorage.getItem('guild_mappings') || "[]");

        const finalRoster = rosterResult.roster.map(player => {
          const mapping = mappings.find(m => m.memberName.toLowerCase() === player.name.toLowerCase());
          const finalRole = (mapping && mapping.role && mapping.role !== PlayerRole.UNKNOWN)
            ? mapping.role
            : player.role;

          return { ...player, role: finalRole };
        });

        setRoster(finalRoster);
        setLastUpdate(new Date().toLocaleTimeString());

        if (withEnrichment) {
          await enrichWithFullAPIData(finalRoster);
        }
      }
    } catch (e) {
      setError("Synchronisierung fehlgeschlagen.");
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  }, [enrichWithFullAPIData]);

  useEffect(() => {
    syncWithSheet(false);
  }, [syncWithSheet]);

  return (
    <div className="min-h-screen wow-gradient flex flex-col md:flex-row overflow-hidden h-screen text-slate-200">
      <nav className="w-full md:w-64 bg-[#050507] border-b md:border-b-0 md:border-r border-white/5 p-6 space-y-8 sticky top-0 md:h-screen z-10 flex flex-col shadow-2xl">
        <div className="flex items-center gap-3">
          <img src="/96f31eb4f56a49f3e069065c7614c591.png" alt="Banelings" className="w-10 h-10 object-contain" />
          <h1 className="text-xl font-black tracking-tighter text-white">Banelings</h1>
        </div>

        <div className="space-y-1 flex-1">
          <button
            onClick={() => setActiveTab('roster')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'roster' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
          >
            <Users size={16} />
            Roster
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
          >
            <ClipboardCheck size={16} />
            Audit
          </button>
          <button
            onClick={() => setActiveTab('splits')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'splits' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
          >
            <Split size={16} />
            Split Setup
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
          >
            <LayoutGrid size={16} />
            Performance
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
          >
            <SettingsIcon size={16} />
            Settings
          </button>
        </div>

        <div className="pt-8 border-t border-white/5">
          <div className="bg-black/40 p-4 rounded-xl border border-white/5">
             <div className="flex items-center justify-between mb-2">
               <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Live Status</p>
               <Zap className={isUpdating ? "text-emerald-400 animate-pulse" : "text-emerald-500"} size={12} />
             </div>
             <p className="text-[10px] text-slate-300">Sync: {lastUpdate}</p>
             <p className="text-[10px] text-emerald-400 mt-1 font-bold">Limit: {minIlvl} iLvl</p>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#020203]">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">Guild Dashboard S1</span>
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight uppercase">
              {activeTab === 'roster' && 'Guild Roster'}
              {activeTab === 'audit' && 'Character Audit'}
              {activeTab === 'splits' && 'Split Setup'}
              {activeTab === 'analytics' && 'Analytics'}
              {activeTab === 'settings' && 'Guild Settings'}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => syncWithSheet(false)}
              disabled={isUpdating}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`${isUpdating ? 'animate-spin' : ''}`} size={16} />
              {isUpdating ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => syncWithSheet(true)}
              disabled={isUpdating}
              className="bg-emerald-600 hover:bg-emerald-700 border border-emerald-500/20 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Zap className={`${isUpdating ? 'animate-spin' : ''}`} size={16} />
              {isUpdating ? 'Enriching...' : 'Enrich All'}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3">
             <AlertTriangle size={16} />
             {error}
          </div>
        )}

        {enrichmentProgress && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Zap size={16} className="animate-pulse" />
                <span className="text-xs font-bold">
                  Enriching characters: {enrichmentProgress.processed}/{enrichmentProgress.total}
                </span>
              </div>
              <span className="text-[10px]">
                {enrichmentProgress.successful} successful · {enrichmentProgress.failed} failed · {enrichmentProgress.skipped} cached
              </span>
            </div>
            <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 transition-all duration-300 ease-out"
                style={{ width: `${(enrichmentProgress.processed / enrichmentProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          {activeTab === 'roster' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-between mb-6">
                <StatOverview roster={roster} minIlvl={minIlvl} />
                <div className="flex p-1 bg-black rounded-xl border border-white/5">
                  <button
                    onClick={() => setRosterViewMode('table')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rosterViewMode === 'table' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <List size={14} />
                    Table
                  </button>
                  <button
                    onClick={() => setRosterViewMode('detail')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${rosterViewMode === 'detail' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <User size={14} />
                    Detail
                  </button>
                </div>
              </div>
              {rosterViewMode === 'table' ? (
                <RosterTable roster={roster} minIlvl={minIlvl} />
              ) : (
                <CharacterDetailView roster={roster} minIlvl={minIlvl} />
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Audit
                roster={roster}
                minIlvl={minIlvl}
                isEnriched={isEnriched}
                onEnrich={() => syncWithSheet(true)}
                isEnriching={isUpdating && enrichmentProgress !== null}
              />
            </div>
          )}

          {activeTab === 'splits' && (
            <SplitSetup splits={splits} roster={roster} />
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <StatOverview roster={roster} minIlvl={minIlvl} />
              <AnalyticsDashboard roster={roster} />
            </div>
          )}
          
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
};

export default App;
