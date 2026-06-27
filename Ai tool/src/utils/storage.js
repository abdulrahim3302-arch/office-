const KEY = 'structural-qs-projects';
const ACTIVE_KEY = 'structural-qs-active';

export function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveProject(id, data) {
  const projects = loadProjects();
  projects[id] = { ...data, savedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export function deleteProject(id) {
  const projects = loadProjects();
  delete projects[id];
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export function getActiveProjectId() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function setActiveProjectId(id) {
  localStorage.setItem(ACTIVE_KEY, id);
}
