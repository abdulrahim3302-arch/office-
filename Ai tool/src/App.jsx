import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { NAV_SECTIONS } from './utils/constants.js';
import { Dashboard } from './components/Dashboard.jsx';
import { NewProjectPage } from './components/NewProjectPage.jsx';
import { ProjectSetup } from './components/ProjectSetup.jsx';
import { FootingBoxes } from './components/sections/FootingBoxes.jsx';
import { StripFootings } from './components/sections/StripFootings.jsx';
import { GroundBeams } from './components/sections/GroundBeams.jsx';
import { ColumnSection } from './components/sections/ColumnSection.jsx';
import { RingBeams } from './components/sections/RingBeams.jsx';
import { FloorBeams } from './components/sections/FloorBeams.jsx';
import { SlabSection } from './components/sections/SlabSection.jsx';
import { Blinding } from './components/sections/Blinding.jsx';
import { Summary } from './components/Summary.jsx';
import { Settings } from './components/Settings.jsx';
import { Modal } from './components/ui/Modal.jsx';

function SectionContent({ activeSection }) {
  switch (activeSection) {
    case 'project':      return <ProjectSetup />;
    case 'footingBoxes': return <FootingBoxes />;
    case 'stripFootings':return <StripFootings />;
    case 'groundBeams':  return <GroundBeams />;
    case 'columns':      return <ColumnSection />;
    case 'ringBeams':    return <RingBeams />;
    case 'floorBeams':   return <FloorBeams />;
    case 'slabs':        return <SlabSection />;
    case 'blinding':     return <Blinding />;
    case 'summary':      return <Summary />;
    default:             return <FootingBoxes />;
  }
}

function AppShell() {
  const { state, dispatch } = useApp();
  const { activeSection, project } = state;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const setSection = (id) => {
    dispatch({ type: 'SET_ACTIVE_SECTION', payload: id });
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-40 w-56 bg-gray-900 border-r border-gray-800
        flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo + back */}
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-xs font-black text-white">QS</div>
            <div>
              <div className="text-sm font-bold text-gray-100">Structural QS</div>
              <div className="text-xs text-gray-500">Bahrain Villa Tool</div>
            </div>
          </div>
          <button
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
            onClick={() => dispatch({ type: 'SET_APP_VIEW', payload: 'dashboard' })}
          >
            ← All Projects
          </button>
        </div>

        {/* Project name */}
        {project.name && (
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-800">
            <div className="text-xs text-gray-500">Project</div>
            <div className="text-xs font-semibold text-cyan-400 truncate">{project.name}</div>
            {project.client && <div className="text-xs text-gray-500 truncate">{project.client}</div>}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_SECTIONS.map((item) => (
            <button
              key={item.id}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors ${
                activeSection === item.id
                  ? 'bg-cyan-700/30 text-cyan-300 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
              onClick={() => setSection(item.id)}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-gray-800">
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            onClick={() => setShowSettings(true)}
          >
            <span className="text-base w-5 text-center">⚙</span>
            <span>Engineering Settings</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button
            className="lg:hidden text-gray-400 hover:text-gray-200 p-1"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 text-sm font-semibold text-gray-300">
            {NAV_SECTIONS.find((s) => s.id === activeSection)?.label || 'Structural QS'}
          </div>
          {project.name && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800 rounded-lg px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{project.name}</span>
            </div>
          )}
          <button className="btn-ghost text-xs py-1.5 px-3" onClick={() => setShowSettings(true)}>
            ⚙ Settings
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 sm:p-6">
            <SectionContent activeSection={activeSection} />
          </div>
        </main>
      </div>

      {showSettings && (
        <Modal title="Engineering Settings" onClose={() => setShowSettings(false)} wide>
          <Settings onClose={() => setShowSettings(false)} />
        </Modal>
      )}
    </div>
  );
}

function AppRouter() {
  const { state } = useApp();
  switch (state.appView) {
    case 'dashboard': return <Dashboard />;
    case 'setup':     return <NewProjectPage />;
    case 'tool':      return <AppShell />;
    default:          return <Dashboard />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
