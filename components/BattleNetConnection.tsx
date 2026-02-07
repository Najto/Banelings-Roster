import React, { useState, useEffect } from 'react';
import { battlenetOAuthService, BattleNetConnection as BNetConnection } from '../services/battlenetOAuthService';
import { Shield, Link2, Unlink, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface BattleNetConnectionProps {
  userId: string;
  onConnectionChange?: () => void;
}

export const BattleNetConnection: React.FC<BattleNetConnectionProps> = ({ userId, onConnectionChange }) => {
  const [connection, setConnection] = useState<BNetConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConnection();
  }, [userId]);

  const loadConnection = async () => {
    setLoading(true);
    try {
      const conn = await battlenetOAuthService.getConnection(userId);
      setConnection(conn);
    } catch (err) {
      console.error('Error loading connection:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    try {
      const oauthUrl = battlenetOAuthService.getOAuthUrl();
      window.open(oauthUrl, '_blank', 'width=600,height=800');
      setSuccess('Please complete the Battle.net authorization in the new window.');
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Battle.net connection');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Battle.net account? This will remove all your character claims.')) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      await battlenetOAuthService.removeConnection(userId);
      setConnection(null);
      setSuccess('Battle.net account disconnected successfully');
      if (onConnectionChange) onConnectionChange();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect Battle.net account');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-black/40 border border-white/10 rounded-xl p-6 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${connection ? 'bg-green-500/10' : 'bg-slate-500/10'}`}>
          <Shield size={20} className={connection ? 'text-green-400' : 'text-slate-500'} />
        </div>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Battle.net Connection
          </h3>
          <p className="text-xs text-slate-400">
            {connection ? 'Connected' : 'Not Connected'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle size={14} />
          {success}
        </div>
      )}

      {connection ? (
        <div className="space-y-3">
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-xs font-black text-green-400 uppercase tracking-wider">
                Connected
              </span>
            </div>
            {connection.battletag && (
              <p className="text-sm text-white font-bold">{connection.battletag}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              Connected on {new Date(connection.connected_at).toLocaleDateString()}
            </p>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-wider hover:bg-red-500/20 transition-all disabled:opacity-50"
          >
            {actionLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Unlink size={14} />
                Disconnect Battle.net
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Connect your Battle.net account to claim guild characters and verify ownership. This is optional but required for character claiming.
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#148eff] text-white text-xs font-black uppercase tracking-wider hover:bg-[#0d7ae0] transition-all disabled:opacity-50"
          >
            {actionLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Link2 size={14} />
                Connect Battle.net
              </>
            )}
          </button>
        </div>
      )}

      <div className="pt-3 border-t border-white/5">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Your Battle.net connection is used only for character verification. We never access your personal information or payment details.
        </p>
      </div>
    </div>
  );
};
