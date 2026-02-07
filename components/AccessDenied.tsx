import React from 'react';
import { ShieldOff } from 'lucide-react';

export const AccessDenied: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <ShieldOff size={64} className="text-red-400 mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
      <p className="text-slate-400 max-w-md">
        You need administrator privileges to access this section.
        Please contact your system administrator if you believe you should have access.
      </p>
    </div>
  );
};
