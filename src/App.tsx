import React, { useState } from 'react';
import TricentricIntegration from '@/components/features/tricentric/TricentricIntegration';
import ActDashboard from '@/components/features/tricentric/ActDashboard';

export function App() {
  const [activeTab, setActiveTab] = useState<'practice' | 'dashboard'>('practice');
  const userId = 'user-1'; // Usuario activo sincronizado con la sesión

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-red-400 to-green-400 bg-clip-text text-transparent">
            SISTEMA CHALAMANDRA™ · ACT v1.0
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Arquitectura Tricéntrica y Coherencia Operativa
          </p>
        </div>
        <nav className="flex gap-3 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('practice')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'practice'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎯 Práctica Diaria
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Panel ACT & Histórico
          </button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto">
        {activeTab === 'practice' ? (
          <TricentricIntegration
            userId={userId}
            onPracticeComplete={async () => {
              console.log('Práctica completada con éxito. Actualizando estado...');
            }}
            stripeUrl="https://stripe.com/test"
          />
        ) : (
          <ActDashboard userId={userId} />
        )}
      </main>
    </div>
  );
}

export default App;
