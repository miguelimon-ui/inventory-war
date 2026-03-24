// Reads tasks from Asana project "Master Data/IT Minden Tasks" — BOM Reviews section
const PROJECT_GID = '1213469898633453';
const ASANA_BASE = 'https://app.asana.com/api/1.0';

export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  const token = Netlify.env.get("ASANA_TOKEN");
  if (!token) return new Response(JSON.stringify({ error: "ASANA_TOKEN not configured" }), { status: 500, headers });

  try {
    // Find BOM Reviews section
    const sectionsRes = await fetch(`${ASANA_BASE}/projects/${PROJECT_GID}/sections`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const sections = await sectionsRes.json();
    const bomSection = (sections.data || []).find(s => s.name.toLowerCase().includes('bom review'));

    let tasks = [];
    if (bomSection) {
      // Get tasks from BOM Reviews section
      const tasksRes = await fetch(`${ASANA_BASE}/sections/${bomSection.gid}/tasks?opt_fields=name,completed,due_on,assignee.name,notes,permalink_url`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tasksData = await tasksRes.json();
      tasks = tasksData.data || [];
    } else {
      // Fallback: get all tasks from project
      const tasksRes = await fetch(`${ASANA_BASE}/projects/${PROJECT_GID}/tasks?opt_fields=name,completed,due_on,assignee.name,notes,permalink_url`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tasksData = await tasksRes.json();
      tasks = tasksData.data || [];
    }

    return new Response(JSON.stringify({ tasks, section: bomSection ? bomSection.name : 'All Tasks' }), { headers });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/asana-tasks" };
