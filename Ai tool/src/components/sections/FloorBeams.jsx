import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { BEAM_FLOORS_2, BEAM_FLOORS_3 } from '../../utils/constants.js';
import { BeamSection } from './BeamSection.jsx';

export function FloorBeams() {
  const [activeFloor, setActiveFloor] = useState('groundFloor');
  const { state } = useApp();
  const storeys = state.project?.storeys || 2;
  const floors = storeys >= 3 ? BEAM_FLOORS_3 : BEAM_FLOORS_2;
  const activeId = floors.find(f => f.id === activeFloor) ? activeFloor : floors[0].id;
  const floorData = state.sections.floorBeams.floorData[activeId];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-100">Floor Beams</h2>
        <p className="text-xs text-gray-500 mt-0.5">Internal floor beams (B1, B2, Z-beams). Input running meters per beam type.</p>
      </div>

      <div className="flex gap-1 bg-gray-900 rounded-xl p-1 flex-wrap">
        {floors.map((floor) => (
          <button
            key={floor.id}
            className={`flex-1 text-xs font-semibold py-2 px-3 rounded-lg transition-colors ${
              activeId === floor.id ? 'bg-blue-700 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveFloor(floor.id)}
          >
            {floor.label}
          </button>
        ))}
      </div>

      <BeamSection
        key={activeId}
        title={`Floor Beams — ${floorData.name}`}
        subtitle="Different beam types per floor. Input running meters."
        members={floorData.members}
        addAction="ADD_FLOOR_BEAM"
        updateAction="UPDATE_FLOOR_BEAM"
        deleteAction="DELETE_FLOOR_BEAM"
        floorId={activeId}
      />
    </div>
  );
}
