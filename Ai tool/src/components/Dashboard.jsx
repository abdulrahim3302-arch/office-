import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { loadProjects, deleteProject } from '../utils/storage.js';

function storeyLabel(n) {
  return `${n || 2}-Storey Villa`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function Dashboard() {
  const { dispatch } = useApp();
  const [projects, setProjects] = useState(() => {
    const raw = loadProjects();
    return Object.entries(raw)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
  });
  const [confirmDelete, setConfirmDelete] = useState(null);

  function openProject(entry) {
    dispatch({ type: 'OPEN_PROJECT', payload: entry });
  }

  function handleDelete(id, e) {
    e.stopPropagation();
    if (confirmDelete === id) {
      deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-sm font-black text-white shadow-lg">
            QS
          </div>
          <div>
            <div className="text-lg font-bold text-gray-100">Structural QS</div>
            <div className="text-xs text-gray-500">Bahrain Villa Tool</div>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => dispatch({ type: 'SET_APP_VIEW', payload: 'setup' })}
        >
          + New Project
        </button>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center text-3xl mb-5">🏗</div>
            <h2 className="text-xl font-bold text-gray-200 mb-2">No projects yet</h2>
            <p className="text-sm text-gray-500 mb-8 max-w-xs">
              Create your first project to start calculating steel and concrete quantities.
            </p>
            <button
              className="btn-primary px-8 py-3 text-base"
              onClick={() => dispatch({ type: 'SET_APP_VIEW', payload: 'setup' })}
            >
              + Create First Project
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Your Projects ({projects.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((entry) => {
                const proj = entry.project || {};
                const isDeleting = confirmDelete === entry.id;
                return (
                  <div
                    key={entry.id}
                    onClick={() => openProject(entry)}
                    className="group relative bg-gray-900 border border-gray-800 hover:border-cyan-700/60 rounded-2xl p-5 cursor-pointer transition-all hover:bg-gray-800/80 hover:shadow-xl"
                  >
                    {/* Accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-cyan-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Project name */}
                    <div className="text-base font-bold text-gray-100 mb-1 truncate pr-8">
                      {proj.name || <span className="text-gray-500 italic">Unnamed Project</span>}
                    </div>

                    {/* Client name */}
                    <div className="text-sm font-semibold text-gray-300 mb-2 truncate">
                      {proj.client || <span className="text-gray-600">No client</span>}
                    </div>

                    {/* Storey + location row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-cyan-900/40 border border-cyan-800/50 text-cyan-400 rounded-full px-2 py-0.5 font-semibold">
                        {storeyLabel(proj.storeys)}
                      </span>
                      {proj.location && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <span>📍</span>{proj.location}
                        </span>
                      )}
                    </div>

                    {/* Saved time */}
                    <div className="mt-3 text-xs text-gray-700">
                      {timeAgo(entry.savedAt)}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(entry.id, e)}
                      className={`absolute top-3.5 right-3.5 text-xs px-2 py-0.5 rounded-lg transition-colors ${
                        isDeleting
                          ? 'bg-red-700 text-white'
                          : 'text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isDeleting ? 'Confirm' : '✕'}
                    </button>
                  </div>
                );
              })}

              {/* New project card */}
              <div
                onClick={() => dispatch({ type: 'SET_APP_VIEW', payload: 'setup' })}
                className="bg-gray-900/50 border border-dashed border-gray-700 hover:border-cyan-700 rounded-2xl p-5 cursor-pointer transition-all hover:bg-gray-800/40 flex flex-col items-center justify-center gap-2 min-h-[140px]"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl text-gray-500">+</div>
                <span className="text-sm text-gray-500 font-semibold">New Project</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
