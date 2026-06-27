import { useApp } from '../../context/AppContext.jsx';
import { BeamSection } from './BeamSection.jsx';

export function GroundBeams() {
  const { state } = useApp();
  const members = state.sections.groundBeams.members;

  return (
    <BeamSection
      title="Ground Beams / Footing Beams"
      subtitle="Grade beams and tie beams at foundation level."
      members={members}
      addAction="ADD_GROUND_BEAM"
      updateAction="UPDATE_GROUND_BEAM"
      deleteAction="DELETE_GROUND_BEAM"
    />
  );
}
