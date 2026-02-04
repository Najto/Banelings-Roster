import React, { useState, useEffect } from 'react';
import { Star, Copy, Trash2, Check, Plus, Edit } from 'lucide-react';
import {
  getAllPresets,
  deletePreset,
  setDefaultPreset,
  PresetDefinition
} from '../services/auditTableService';

interface PresetManagerProps {
  onLoadPreset: (presetId: string) => void;
  currentPresetId?: string;
}

export const PresetManager: React.FC<PresetManagerProps> = ({ onLoadPreset, currentPresetId }) => {
  const [presets, setPresets] = useState<PresetDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setLoading(true);
    const data = await getAllPresets();
    setPresets(data);
    setLoading(false);
  };

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      alert('Cannot delete system presets');
      return;
    }

    if (!confirm('Are you sure you want to delete this preset?')) {
      return;
    }

    const success = await deletePreset(id);
    if (success) {
      await loadPresets();
    }
  };

  const handleSetDefault = async (id: string) => {
    const success = await setDefaultPreset(id);
    if (success) {
      await loadPresets();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading presets...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Audit Presets</h2>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Create New Preset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map(preset => (
          <div
            key={preset.id}
            className={`p-4 rounded-lg border ${
              currentPresetId === preset.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-800'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold">{preset.preset_name}</h3>
                  {preset.is_default && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                      Default
                    </span>
                  )}
                  {preset.is_system && (
                    <span className="px-2 py-0.5 text-xs bg-slate-600 text-slate-300 rounded">
                      System
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm line-clamp-2">
                  {preset.description || 'No description'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => onLoadPreset(preset.id)}
                className="flex-1 flex items-center justify-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                {currentPresetId === preset.id ? (
                  <>
                    <Check size={14} className="mr-1" />
                    Active
                  </>
                ) : (
                  'Load'
                )}
              </button>

              {!preset.is_default && (
                <button
                  onClick={() => handleSetDefault(preset.id)}
                  className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-yellow-400 rounded transition-colors"
                  title="Set as default"
                >
                  <Star size={16} />
                </button>
              )}

              {!preset.is_system && (
                <>
                  <button
                    className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-blue-400 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(preset.id, preset.is_system)}
                    className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {presets.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No presets found. Create your first preset to get started.
        </div>
      )}
    </div>
  );
};
