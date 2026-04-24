import React from 'react';
import { Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function LoadingScreen() {
  const { dbInitialized, modelsLoaded } = useApp();

  if (dbInitialized && modelsLoaded) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-slate-800 flex items-center justify-center z-50">
      <div className="text-center text-white">
        <Loader2 className="w-16 h-16 animate-spin mx-auto mb-6 text-blue-400" />
        <h2 className="text-2xl font-bold mb-4">Loading System</h2>
        
        <div className="space-y-3 max-w-md">
          <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-sm">Preparing workspace...</span>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-sm">Finalizing startup...</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-6">
          This may take a few moments on first load
        </p>
      </div>
    </div>
  );
}
