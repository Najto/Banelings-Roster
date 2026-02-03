
import React from 'react';
import { FileSpreadsheet, ExternalLink } from 'lucide-react';

const SPREADSHEET_WEB_URL = "https://docs.google.com/spreadsheets/d/1zahCGbnowtqnmn2G82lZ6xVXGycjJlBRXAdvLymqapw/pubhtml";

export const Settings: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
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
