import React, { useState, useEffect } from 'react';
import { Plus, Save, Eye, EyeOff, GripVertical, Trash2, Search } from 'lucide-react';
import {
  ColumnConfig,
  ColumnDefinition,
  PresetDefinition,
  getAllColumnDefinitions,
  getColumnConfiguration,
  updatePresetColumns,
  loadActivePreset
} from '../services/auditTableService';

export const AuditColumnsSettings: React.FC = () => {
  const [activePreset, setActivePreset] = useState<PresetDefinition | null>(null);
  const [availableColumns, setAvailableColumns] = useState<ColumnDefinition[]>([]);
  const [activeColumns, setActiveColumns] = useState<ColumnConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const preset = await loadActivePreset();
    if (preset) {
      setActivePreset(preset);
      const columns = await getColumnConfiguration(preset.id);
      setActiveColumns(columns);
    }

    const allColumns = await getAllColumnDefinitions();
    setAvailableColumns(allColumns);
  };

  const handleAddColumn = (column: ColumnDefinition) => {
    const maxOrder = Math.max(0, ...activeColumns.map(c => c.column_order));

    const newColumn: ColumnConfig = {
      ...column,
      is_visible: true,
      column_order: maxOrder + 1,
      column_width: 'auto',
      alignment: 'left',
      is_sortable: true,
      custom_format_override: {}
    };

    setActiveColumns([...activeColumns, newColumn]);
    setIsDirty(true);
  };

  const handleRemoveColumn = (columnKey: string) => {
    setActiveColumns(activeColumns.filter(c => c.column_key !== columnKey));
    setIsDirty(true);
  };

  const handleToggleVisibility = (columnKey: string) => {
    setActiveColumns(
      activeColumns.map(c =>
        c.column_key === columnKey ? { ...c, is_visible: !c.is_visible } : c
      )
    );
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!activePreset) return;

    setSaving(true);
    const columns = activeColumns.map(c => ({
      column_key: c.column_key,
      is_visible: c.is_visible,
      column_order: c.column_order,
      column_width: c.column_width,
      alignment: c.alignment,
      is_sortable: c.is_sortable,
      custom_format_override: c.custom_format_override
    }));

    const success = await updatePresetColumns(activePreset.id, columns);
    setSaving(false);

    if (success) {
      setIsDirty(false);
      alert('Configuration saved successfully!');
    } else {
      alert('Failed to save configuration');
    }
  };

  const filteredAvailable = availableColumns.filter(col =>
    col.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    col.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedByCategory = filteredAvailable.reduce((acc, col) => {
    if (!acc[col.category]) acc[col.category] = [];
    acc[col.category].push(col);
    return acc;
  }, {} as Record<string, ColumnDefinition[]>);

  const isColumnActive = (columnKey: string) => {
    return activeColumns.some(c => c.column_key === columnKey);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-white">Audit Column Configuration</h2>
          {activePreset && (
            <p className="text-slate-400 text-sm mt-1">
              Editing preset: <span className="text-white">{activePreset.preset_name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="flex items-center text-yellow-400 text-sm">
              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded transition-colors"
          >
            <Save size={18} className="mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
        <div className="flex flex-col bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Available Fields</h3>
            <span className="text-slate-400 text-sm">{filteredAvailable.length} fields</span>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {Object.entries(groupedByCategory).map(([category, columns]) => (
              <div key={category}>
                <div className="text-slate-400 text-xs font-semibold uppercase mb-2 sticky top-0 bg-slate-800 py-1">
                  {category}
                </div>
                <div className="space-y-1">
                  {columns.map(col => (
                    <div
                      key={col.column_key}
                      className={`flex items-center justify-between p-2 rounded ${
                        isColumnActive(col.column_key)
                          ? 'bg-slate-700/50 text-slate-500'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm truncate">{col.display_name}</div>
                        <div className="text-slate-400 text-xs">
                          {col.data_source} · {col.data_type}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddColumn(col)}
                        disabled={isColumnActive(col.column_key)}
                        className="ml-2 p-1 hover:bg-slate-500 disabled:opacity-30 disabled:cursor-not-allowed text-blue-400 rounded"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Active Columns</h3>
            <span className="text-slate-400 text-sm">
              {activeColumns.filter(c => c.is_visible).length} visible / {activeColumns.length} total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {activeColumns.length === 0 ? (
              <div className="text-center text-slate-400 py-12">
                No columns added yet. Add columns from the left panel.
              </div>
            ) : (
              activeColumns
                .sort((a, b) => a.column_order - b.column_order)
                .map(col => (
                  <div
                    key={col.column_key}
                    className={`flex items-center gap-2 p-3 rounded ${
                      col.is_visible ? 'bg-slate-700' : 'bg-slate-700/30'
                    }`}
                  >
                    <GripVertical size={16} className="text-slate-500 cursor-move" />

                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${col.is_visible ? 'text-white' : 'text-slate-500'}`}>
                        {col.display_name}
                      </div>
                      <div className="text-slate-400 text-xs">{col.data_path}</div>
                    </div>

                    <button
                      onClick={() => handleToggleVisibility(col.column_key)}
                      className="p-1 hover:bg-slate-600 text-slate-400 rounded"
                      title={col.is_visible ? 'Hide' : 'Show'}
                    >
                      {col.is_visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    <button
                      onClick={() => handleRemoveColumn(col.column_key)}
                      className="p-1 hover:bg-slate-600 text-red-400 rounded"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
