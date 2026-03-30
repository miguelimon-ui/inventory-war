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
    const sectionGid = bomSection ? bomSection.gid : null;
    const tasksUrl = sectionGid
      ? `${ASANA_BASE}/sections/${sectionGid}/tasks?opt_fields=name,completed,due_on,assignee.name,notes,permalink_url,num_subtasks`
      : `${ASANA_BASE}/projects/${PROJECT_GID}/tasks?opt_fields=name,completed,due_on,assignee.name,notes,permalink_url,num_subtasks`;

    const tasksRes = await fetch(tasksUrl, { headers: { 'Authorization': `Bearer ${token}` } });
    const tasksData = await tasksRes.json();
    tasks = tasksData.data || [];

    // Fetch stories (comments) for each task
    for (const task of tasks) {
      try {
        const storiesRes = await fetch(`${ASANA_BASE}/tasks/${task.gid}/stories?opt_fields=text,created_by.name,created_at,type`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const storiesData = await storiesRes.json();
        task.comments = (storiesData.data || [])
          .filter(s => s.type === 'comment')
          .map(s => ({ text: s.text, author: s.created_by?.name || 'Unknown', date: s.created_at }));
      } catch(e) { task.comments = []; }
    }

    return new Response(JSON.stringify({ tasks, section: bomSection ? bomSection.name : 'All Tasks' }), { headers });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/asana-tasks" };
