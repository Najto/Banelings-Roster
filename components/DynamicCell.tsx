import React from 'react';
import { ColumnConfig } from '../services/auditTableService';

interface DynamicCellProps {
  value: any;
  config: ColumnConfig;
}

export const DynamicCell: React.FC<DynamicCellProps> = ({ value, config }) => {
  const format = { ...config.format_config, ...config.custom_format_override };

  if (value === null || value === undefined) {
    return <span className="text-slate-500 text-xs">-</span>;
  }

  const renderNumber = () => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return <span className="text-slate-500 text-xs">-</span>;

    const decimals = format.decimals ?? 0;
    const formatted = num.toFixed(decimals);
    const withSeparator = format.useThousandsSeparator
      ? parseFloat(formatted).toLocaleString()
      : formatted;

    const text = `${format.prefix || ''}${withSeparator}${format.suffix || ''}`;

    let colorClass = 'text-white';
    if (format.colorRules && Array.isArray(format.colorRules)) {
      const sortedRules = [...format.colorRules].sort((a, b) => b.threshold - a.threshold);
      for (const rule of sortedRules) {
        if (num >= rule.threshold) {
          colorClass = rule.color;
          break;
        }
      }
    }

    return <span className={`${colorClass} text-xs font-medium`}>{text}</span>;
  };

  const renderPercentage = () => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return <span className="text-slate-500 text-xs">-</span>;

    const decimals = format.decimals ?? 1;
    const text = `${num.toFixed(decimals)}%`;

    let colorClass = 'text-slate-400';
    if (num >= 80) colorClass = 'text-emerald-400';
    else if (num >= 60) colorClass = 'text-blue-400';
    else if (num >= 40) colorClass = 'text-yellow-400';
    else colorClass = 'text-red-400';

    return <span className={`${colorClass} text-xs font-medium`}>{text}</span>;
  };

  const renderBadge = () => {
    const text = String(value);
    const style = format.style || 'solid';
    const size = format.size || 'small';

    const sizeClasses = {
      small: 'text-xs px-2 py-0.5',
      medium: 'text-sm px-3 py-1',
      large: 'text-base px-4 py-1.5'
    };

    const styleClasses = {
      solid: 'bg-blue-600 text-white',
      outline: 'border border-blue-500 text-blue-400 bg-transparent',
      soft: 'bg-blue-500/20 text-blue-400'
    };

    return (
      <span className={`inline-block rounded ${sizeClasses[size]} ${styleClasses[style]}`}>
        {text}
      </span>
    );
  };

  const renderDate = () => {
    const dateStr = String(value);

    try {
      const match = dateStr.match(/(\d{2}):(\d{2}) - (\d{2})\/(\d{2})\/(\d{2})/);
      if (match) {
        return <span className="text-slate-300 text-xs">{dateStr}</span>;
      }

      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const now = Date.now();
        const diff = now - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) {
          return <span className="text-slate-300 text-xs">{days}d ago</span>;
        } else if (hours > 0) {
          return <span className="text-slate-300 text-xs">{hours}h ago</span>;
        } else {
          return <span className="text-slate-300 text-xs">Recently</span>;
        }
      }
    } catch (e) {
      return <span className="text-slate-300 text-xs">{dateStr}</span>;
    }

    return <span className="text-slate-300 text-xs">{dateStr}</span>;
  };

  const renderArray = () => {
    if (!Array.isArray(value)) return <span className="text-slate-500 text-xs">-</span>;

    const mode = format.displayMode || 'count';

    switch (mode) {
      case 'count':
        return <span className="text-blue-400 text-xs font-medium">{value.length}</span>;

      case 'first':
        if (value.length === 0) return <span className="text-slate-500 text-xs">-</span>;
        const first = typeof value[0] === 'object' ? JSON.stringify(value[0]) : String(value[0]);
        return <span className="text-slate-300 text-xs truncate max-w-[100px]">{first}</span>;

      case 'comma':
        const maxItems = format.maxItems || 3;
        const items = value.slice(0, maxItems).map(item =>
          typeof item === 'object' ? JSON.stringify(item) : String(item)
        );
        const text = items.join(', ');
        return <span className="text-slate-300 text-xs truncate max-w-[150px]">{text}</span>;

      default:
        return <span className="text-blue-400 text-xs font-medium">{value.length}</span>;
    }
  };

  const renderBoolean = () => {
    const isTrue = value === true || value === 'true';
    return (
      <span className={`text-xs font-medium ${isTrue ? 'text-emerald-400' : 'text-red-400'}`}>
        {isTrue ? 'Yes' : 'No'}
      </span>
    );
  };

  const renderText = () => {
    const text = String(value);
    const maxLength = 50;
    const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    return <span className="text-slate-300 text-xs">{truncated}</span>;
  };

  switch (config.data_type) {
    case 'number':
      return renderNumber();
    case 'percentage':
      return renderPercentage();
    case 'badge':
      return renderBadge();
    case 'date':
      return renderDate();
    case 'array':
      return renderArray();
    case 'boolean':
      return renderBoolean();
    case 'text':
    default:
      return renderText();
  }
};
