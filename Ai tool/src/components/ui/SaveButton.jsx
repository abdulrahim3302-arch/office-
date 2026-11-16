import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { saveProject } from '../../utils/storage.js';

export function SaveButton() {
  const { state } = useApp();
  const [status, setStatus] = useState('idle'); // idle | saved | noname

  function handleSave() {
    const id = state.project.id;
    if (!id) { setStatus('noname'); setTimeout(() => setStatus('idle'), 2500); return; }
    saveProject(id, { project: state.project, settings: state.settings, sections: state.sections });
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2000);
  }

  return (
    <button
      className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold flex items-center gap-1.5 ${
        status === 'saved'
          ? 'border-emerald-600 text-emerald-400 bg-emerald-900/20'
          : status === 'noname'
          ? 'border-amber-600 text-amber-400 bg-amber-900/20'
          : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200'
      }`}
      onClick={handleSave}
    >
      {status === 'saved'
        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</>
        : status === 'noname'
        ? <><AlertTriangle className="w-3.5 h-3.5" /> Enter project name first</>
        : <><Download className="w-3.5 h-3.5" /> Save</>}
    </button>
  );
}
