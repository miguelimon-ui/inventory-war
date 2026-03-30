// Post a comment on an Asana task
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

  const { task_gid, text, author_name } = await req.json();
  if (!task_gid || !text) return new Response(JSON.stringify({ error: "task_gid and text required" }), { status: 400, headers });

  const commentText = author_name ? `[${author_name}]: ${text}` : text;

  try {
    const res = await fetch(`${ASANA_BASE}/tasks/${task_gid}/stories`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { text: commentText } })
    });
    const data = await res.json();
    if (data.data) return new Response(JSON.stringify({ ok: true, comment_id: data.data.gid }), { headers });
    return new Response(JSON.stringify({ error: 'Failed', details: data }), { status: 500, headers });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/asana-comment" };
