import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

const TODAY = new Date().toISOString().split('T')[0];

export function NewProjectPage() {
  const { dispatch } = useApp();
  const [form, setForm] = useState({
    name: '', client: '', location: '', date: TODAY, storeys: 2,
  });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    dispatch({ type: 'NEW_PROJECT', payload: form });
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-5 flex items-center gap-4">
        <button
          onClick={() => dispatch({ type: 'SET_APP_VIEW', payload: 'dashboard' })}
          className="text-gray-400 hover:text-gray-200 transition-colors text-sm flex items-center gap-1.5"
        >
          ← Projects
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-xs font-black text-white">QS</div>
          <span className="text-sm font-bold text-gray-400">New Project</span>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-start justify-center px-6 pt-12 pb-16">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Project Setup</h1>
          <p className="text-sm text-gray-500 mb-8">Fill in the project details to get started.</p>

          <form onSubmit={handleCreate} className="space-y-5">
            {/* Project name */}
            <div>
              <label className="label">Project Name *</label>
              <input
                required
                autoFocus
                className="input-dark"
                placeholder="e.g. Villa Al-Manama"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Client Name</label>
                <input
                  className="input-dark"
                  placeholder="Client / Owner"
                  value={form.client}
                  onChange={(e) => set('client', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input
                  className="input-dark"
                  placeholder="e.g. Riffa, Bahrain"
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input-dark"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>

            {/* Storeys */}
            <div>
              <label className="label">Number of Storeys</label>
              <div className="flex gap-3">
                {[2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                      form.storeys === n
                        ? 'bg-cyan-700 border-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                    onClick={() => set('storeys', n)}
                  >
                    <div className="text-lg mb-0.5">{n === 2 ? '🏠' : '🏢'}</div>
                    {n} Storeys
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1.5">
                Determines column and beam floor levels (can be changed later in project settings)
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!form.name.trim()}
                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
                  form.name.trim()
                    ? 'bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                Create Project →
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
