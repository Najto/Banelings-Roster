import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface AddCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (characterName: string, realm: string) => Promise<void>;
  memberName: string;
  isMain: boolean;
}

const EU_REALMS = [
  'Blackhand',
  'Antonidas',
  'Aegwynn',
  'Alleria',
  'Antonidas',
  'Blackmoore',
  'Eredar',
  'Frostwolf',
  'Kargath',
  'Lordaeron',
  'Malfurion',
  'Thrall',
  'Tichondrius',
  'Uldaman',
  'Alexstrasza',
  'Dalaran',
  'Gilneas',
  'Khadgar',
  'Perenolde',
];

export const AddCharacterModal: React.FC<AddCharacterModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  memberName,
  isMain,
}) => {
  const [characterName, setCharacterName] = useState('');
  const [realm, setRealm] = useState('Blackhand');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!characterName.trim()) {
      setError('Character name is required');
      return;
    }

    setIsLoading(true);
    try {
      await onAdd(characterName.trim(), realm);
      setCharacterName('');
      setRealm('Blackhand');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add character');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setCharacterName('');
      setRealm('Blackhand');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white">
              Add {isMain ? 'Main' : 'Split'} Character
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              For {memberName}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Character Name Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Character Name
            </label>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Enter character name"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              autoFocus
            />
          </div>

          {/* Realm Select */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Realm
            </label>
            <select
              value={realm}
              onChange={(e) => setRealm(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 cursor-pointer"
            >
              {EU_REALMS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-300">
              Character will be validated via Blizzard API and enriched with all available data including M+ scores, raid progression, and gear information.
            </p>
          </div>

          {/* Actions */}
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
              disabled={isLoading || !characterName.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Character'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
