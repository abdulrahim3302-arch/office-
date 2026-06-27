import { useApp } from '../context/AppContext.jsx';
import { loadProjects, deleteProject } from '../utils/storage.js';
import { useState } from 'react';
import { ScheduleUpload } from './ScheduleUpload.jsx';

export function ProjectSetup() {
  const { state, dispatch } = useApp();
  const { project } = state;
  const [showSaved, setShowSaved] = useState(false);

  const update = (field, value) => dispatch({ type: 'SET_PROJECT', payload: { [field]: value } });

  const savedProjects = Object.entries(loadProjects()).filter(([id]) => id !== project.id);

  function loadProject(id) {
    const projects = loadProjects();
    if (projects[id]) {
      dispatch({ type: 'LOAD_STATE', payload: { ...projects[id], project: { ...projects[id].project, id } } });
    }
    setShowSaved(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Project Setup</h1>
        <p className="text-sm text-gray-500">Fill in project details, upload your structural schedules, then continue to each section.</p>
      </div>

      {/* Step 1 — Project details */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 rounded-full bg-cyan-700 text-white text-xs font-bold flex items-center justify-center">1</span>
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Project Details</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Project Name *</label>
            <input
              className="input-dark"
              placeholder="e.g. Villa Al-Manama"
              value={project.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>
          <div>
            <label className="label">Client Name</label>
            <input className="input-dark" placeholder="Client / Owner" value={project.client} onChange={(e) => update('client', e.target.value)} />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input-dark" placeholder="e.g. Riffa, Bahrain" value={project.location} onChange={(e) => update('location', e.target.value)} />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input-dark" value={project.date} onChange={(e) => update('date', e.target.value)} />
          </div>
          <div>
            <label className="label">Number of Storeys</label>
            <div className="flex gap-2">
              {[2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${
                    (project.storeys || 2) === n
                      ? 'bg-cyan-700 border-cyan-600 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                  onClick={() => update('storeys', n)}
                >
                  {n} Storeys
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1">Controls column and beam floor tabs</p>
          </div>
        </div>
      </div>

      {/* Step 2 — AI Schedule Upload */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 rounded-full bg-violet-700 text-white text-xs font-bold flex items-center justify-center">2</span>
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Upload Structural Schedules</h2>
          <span className="text-xs text-violet-400 bg-violet-900/30 border border-violet-800/50 rounded px-1.5 py-0.5 font-semibold">AI</span>
        </div>
        <ScheduleUpload />
      </div>

      {/* Step 3 — Or manual */}
      <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-5 h-5 rounded-full bg-gray-700 text-gray-300 text-xs font-bold flex items-center justify-center">3</span>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Or Enter Manually</h2>
        </div>
        <p className="text-xs text-gray-500">Use the sidebar to navigate to each section (Footing Boxes, Columns, Beams, etc.) and add members manually using the <strong className="text-gray-300">+ Add</strong> buttons.</p>
      </div>

      {/* Saved projects */}
      {savedProjects.length > 0 && (
        <div className="card">
          <button
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-300"
            onClick={() => setShowSaved(!showSaved)}
          >
            <span>Saved Projects ({savedProjects.length})</span>
            <span className="text-gray-500">{showSaved ? '▲' : '▼'}</span>
          </button>
          {showSaved && (
            <div className="mt-3 space-y-2">
              {savedProjects.map(([id, data]) => (
                <div key={id} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-sm text-gray-200">{data.project?.name || 'Unnamed'}</div>
                    <div className="text-xs text-gray-500">{data.project?.client} · {data.project?.location}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs py-1 px-2" onClick={() => loadProject(id)}>Load</button>
                    <button className="btn-danger text-xs py-1 px-2" onClick={() => { deleteProject(id); setShowSaved(false); setTimeout(() => setShowSaved(true), 0); }}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
