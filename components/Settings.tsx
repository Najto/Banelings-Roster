
import React, { useState } from 'react';
import { FileSpreadsheet, ExternalLink, Lock, List, Settings as SettingsIcon, LogIn, LogOut, User } from 'lucide-react';
import { useIsAdmin } from '../hooks/useAdmin';
import { AccessDenied } from './AccessDenied';
import { AuditColumnsSettings } from './AuditColumnsSettings';
import { PresetManager } from './PresetManager';
import { AdminLogin } from './AdminLogin';
import { AdminProfile } from './AdminProfile';
import { setActivePreset } from '../services/auditTableService';
import { logoutAdmin } from '../services/adminService';

const SPREADSHEET_WEB_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS8AIcE-2b-IJohqlFiUCp0laqabWOptLdAk1OpL9o8LptWglWr2rMwnV-7YM6dwwGiEO9ruz7triLa/pubhtml?widget=true&headers=false";

type Tab = 'spreadsheet' | 'audit-columns' | 'presets' | 'admin-profile';

export const Settings: React.FC = () => {
  const { isAdmin, loading, adminUser } = useIsAdmin();
  const [activeTab, setActiveTab] = useState<Tab>('spreadsheet');
  const [currentPresetId, setCurrentPresetId] = useState<string | undefined>();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLoadPreset = async (presetId: string) => {
    await setActivePreset(presetId);
    setCurrentPresetId(presetId);
  };

  const handleLogout = () => {
    logoutAdmin();
    setRefreshKey(prev => prev + 1);
    setActiveTab('spreadsheet');
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setRefreshKey(prev => prev + 1);
  };

  const tabs: Array<{ id: Tab; label: string; icon: any; adminOnly: boolean }> = [
    { id: 'spreadsheet', label: 'Spreadsheet', icon: FileSpreadsheet, adminOnly: false },
    { id: 'audit-columns', label: 'Audit Columns', icon: SettingsIcon, adminOnly: true },
    { id: 'presets', label: 'Presets', icon: List, adminOnly: true },
    { id: 'admin-profile', label: 'Admin Profile', icon: User, adminOnly: true }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const currentTab = tabs.find(t => t.id === activeTab);
  const showAccessDenied = currentTab?.adminOnly && !isAdmin;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-20">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Manage your roster configuration and preferences</p>
        </div>
        <div>
          {isAdmin ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-slate-400">Logged in as</div>
                <div className="text-white font-semibold">{adminUser?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              <LogIn size={18} />
              Admin Login
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-700">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const canAccess = !tab.adminOnly || isAdmin;

          return (
            <button
              key={tab.id}
              onClick={() => canAccess && setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-white'
                  : canAccess
                  ? 'border-transparent text-slate-400 hover:text-white'
                  : 'border-transparent text-slate-600 cursor-not-allowed'
              }`}
              disabled={!canAccess}
            >
              <Icon size={18} />
              {tab.label}
              {tab.adminOnly && !isAdmin && <Lock size={14} className="ml-1" />}
            </button>
          );
        })}
      </div>

      <div className="min-h-[600px]">
        {showAccessDenied ? (
          <AccessDenied />
        ) : (
          <>
            {activeTab === 'spreadsheet' && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                      <FileSpreadsheet className="text-emerald-400" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Source Spreadsheet</h2>
                      <p className="text-slate-400 text-sm">Verknüpfte Google Tabelle verwalten</p>
                    </div>
                  </div>
                  <a
                    href="https://docs.google.com/spreadsheets/d/1zahCGbnowtqnmn2G82lZ6xVXGycjJlBRXAdvLymqapw"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Open Spreadsheet
                  </a>
                </div>

                <div className="rounded-lg border border-slate-700 overflow-hidden bg-black h-[600px]">
                  <iframe
                    src={SPREADSHEET_WEB_URL}
                    className="w-full h-full border-none"
                    title="Guild Spreadsheet"
                    sandbox="allow-scripts allow-same-origin"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <p className="mt-4 text-xs text-slate-500 text-center">
                  Hinweis: Die eingebettete Ansicht dient nur zur Kontrolle. Änderungen müssen direkt in Google Sheets vorgenommen werden.
                </p>
              </div>
            )}

            {activeTab === 'audit-columns' && <AuditColumnsSettings />}

            {activeTab === 'presets' && (
              <PresetManager
                onLoadPreset={handleLoadPreset}
                currentPresetId={currentPresetId}
              />
            )}

            {activeTab === 'admin-profile' && adminUser && (
              <AdminProfile
                adminUser={adminUser}
                onUpdate={() => setRefreshKey(prev => prev + 1)}
              />
            )}
          </>
        )}
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowLoginModal(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AdminLogin
              onLoginSuccess={handleLoginSuccess}
              onClose={() => setShowLoginModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
