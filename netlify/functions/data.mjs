import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const store = getStore("inventory-war");
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // List all keys
  if (req.method === "GET" && !key) {
    const { blobs } = await store.list();
    return new Response(JSON.stringify({ keys: blobs.map(b => b.key) }), { headers });
  }

  // Get a specific key
  if (req.method === "GET" && key) {
    const data = await store.get(key, { type: "json" });
    if (!data) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers });
    }
    return new Response(JSON.stringify(data), { headers });
  }

  // Write a key
  if (req.method === "PUT" && key) {
    const body = await req.json();
    await store.setJSON(key, body);
    return new Response(JSON.stringify({ ok: true, key }), { headers });
  }

  return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers });
};

export const config = {
  path: "/api/data",
};
