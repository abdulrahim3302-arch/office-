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

export function exportProjectsFile() {
  const projects = loadProjects();
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `structural-qs-projects-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProjectsFile(file) {
  return file.text().then((text) => {
    const incoming = JSON.parse(text);
    const existing = loadProjects();
    const merged = { ...existing, ...incoming };
    localStorage.setItem(KEY, JSON.stringify(merged));
    return Object.keys(incoming).length;
  });
}
