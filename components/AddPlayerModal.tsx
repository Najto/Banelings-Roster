import React, { useState } from 'react';
import { X, Shield, Heart, Sword, Target } from 'lucide-react';
import { PlayerRole } from '../types';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (playerName: string, role: PlayerRole) => Promise<void>;
  defaultRole?: PlayerRole;
}

const ROLE_OPTIONS: { role: PlayerRole; label: string; icon: React.ReactNode; color: string }[] = [
  { role: PlayerRole.TANK, label: 'Tank', icon: <Shield size={14} />, color: 'text-blue-400 border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20' },
  { role: PlayerRole.HEALER, label: 'Healer', icon: <Heart size={14} />, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20' },
  { role: PlayerRole.MELEE, label: 'Melee', icon: <Sword size={14} />, color: 'text-red-400 border-red-500/40 bg-red-500/10 hover:bg-red-500/20' },
  { role: PlayerRole.RANGE, label: 'Range', icon: <Target size={14} />, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20' },
];

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  defaultRole,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlayerRole>(defaultRole || PlayerRole.MELEE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!playerName.trim()) {
      setError('Player name is required');
      return;
    }

    setIsLoading(true);
    try {
      await onAdd(playerName.trim(), selectedRole);
      setPlayerName('');
      setSelectedRole(defaultRole || PlayerRole.MELEE);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add player');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setPlayerName('');
      setSelectedRole(defaultRole || PlayerRole.MELEE);
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">Add Player</h2>
            <p className="text-sm text-slate-400 mt-1">Create an empty roster slot</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Player Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter player name"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(({ role, label, icon, color }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-4 py-3 border rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${color} ${
                    selectedRole === role
                      ? 'ring-2 ring-offset-1 ring-offset-[#0a0a0f] ring-current opacity-100'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !playerName.trim()}
              className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Add Player'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
