// Creates a task in Asana project "Master Data/IT Minden Tasks" under BOM Reviews section
const PROJECT_GID = '1213469898633453';
const ASANA_BASE = 'https://app.asana.com/api/1.0';

export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const token = Netlify.env.get("ASANA_TOKEN");
  if (!token) return new Response(JSON.stringify({ error: "ASANA_TOKEN not configured" }), { status: 500, headers });

  const { title, assignee, kpi, root_cause } = await req.json();

  // Find BOM Reviews section in the project
  let sectionGid = null;
  try {
    const sectionsRes = await fetch(`${ASANA_BASE}/projects/${PROJECT_GID}/sections`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const sections = await sectionsRes.json();
    const bomSection = (sections.data || []).find(s => s.name.toLowerCase().includes('bom review'));
    if (bomSection) sectionGid = bomSection.gid;
  } catch(e) {}

  // Create the task
  const taskData = {
    data: {
      name: title,
      notes: `Root Cause: ${root_cause}\nKPI: ${kpi || 'TBD'}\n\nCreated from Inventory War App`,
      projects: [PROJECT_GID],
      assignee: assignee || null,
    }
  };

  try {
    const taskRes = await fetch(`${ASANA_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    const task = await taskRes.json();

    if (task.data && task.data.gid) {
      // Move to BOM Reviews section if found
      if (sectionGid) {
        await fetch(`${ASANA_BASE}/sections/${sectionGid}/addTask`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { task: task.data.gid } })
        });
      }
      return new Response(JSON.stringify({ ok: true, task_gid: task.data.gid, task_url: task.data.permalink_url }), { headers });
    }
    return new Response(JSON.stringify({ error: 'Failed to create task', details: task }), { status: 500, headers });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/asana-task" };
