
import React, { useState } from 'react';
import { Player } from '../types';
import { analyzeRoster } from '../services/geminiService';
import { BrainCircuit, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface GeminiAnalyzerProps {
  roster: Player[];
}

export const GeminiAnalyzer: React.FC<GeminiAnalyzerProps> = ({ roster }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await analyzeRoster(roster);
    setAnalysis(result || "No analysis available.");
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <BrainCircuit className="text-indigo-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">AI Raid Strategist</h3>
            <p className="text-sm text-indigo-300/70">Powered by Gemini 3 Pro</p>
          </div>
        </div>
        <button 
          onClick={handleAnalyze}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          {analysis ? 'Re-Analyze' : 'Analyze Roster'}
        </button>
      </div>

      {!analysis && !loading && (
        <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-800 rounded-xl">
          <AlertCircle className="mx-auto mb-2 opacity-50" size={32} />
          <p>Click the button above to generate a strategic overview for your guild.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-10 text-slate-400">
          <div className="flex justify-center mb-4">
             <div className="relative">
                <div className="w-12 h-12 border-4 border-indigo-500/20 rounded-full"></div>
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
             </div>
          </div>
          <p className="animate-pulse">Consulting the Dragon Isles for insights...</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="prose prose-invert max-w-none">
          <div className="bg-slate-950/80 p-6 rounded-xl border border-indigo-500/20 font-light text-slate-300 leading-relaxed whitespace-pre-wrap">
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
};
