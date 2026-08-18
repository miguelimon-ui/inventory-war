// Reads Picking Gantt board from Monday.com and returns formatted data
const BOARD_ID = '18405028071';
const MONDAY_API = 'https://api.monday.com/v2';

const groupColors = {
  'Phase 1': '#EF5350',
  'Phase 2B': '#FFA726',
  'Phase 2A': '#7E57C2',
  'Phase 3': '#00B2A9',
  'Manintaining': '#4CAF50',
  'Maintaining': '#4CAF50',
};

export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  const token = Netlify.env.get("MONDAY_API_TOKEN");
  if (!token) return new Response(JSON.stringify({ error: "MONDAY_API_TOKEN not configured" }), { status: 500, headers });

  try {
    const query = `query { boards(ids: [${BOARD_ID}]) { items_page(limit: 50) { items { id name group { title } column_values(ids: ["timerange_mm1qehrm","numeric_mm1r21aq","color_mm1q70gr","multiple_person_mm1q30hv"]) { id text } } } } }`;

    const res = await fetch(MONDAY_API, {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json', 'API-Version': '2024-10' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    const items = data.data?.boards?.[0]?.items_page?.items || [];

    const gantt = items.map(item => {
      const cv = {};
      item.column_values.forEach(c => { cv[c.id] = c.text; });

      const timeline = cv.timerange_mm1qehrm || '';
      const [start, end] = timeline.split(' - ').map(d => d?.trim() || null);
      const group = item.group?.title || '';
      const colorKey = Object.keys(groupColors).find(k => group.includes(k));
      const status = cv.color_mm1q70gr || 'Pending';

      return {
        id: item.id,
        name: item.name,
        group: group,
        owner: cv.multiple_person_mm1q30hv || '',
        status: status,
        start: start || null,
        end: end || null,
        duration: parseInt(cv.numeric_mm1r21aq) || null,
        color: groupColors[colorKey] || '#00B2A9',
        milestone: !start || start === end && parseInt(cv.numeric_mm1r21aq) === 0,
        critical: group.includes('Phase 3') || (group.includes('Phase 1') && status !== 'Done'),
      };
    });

    return new Response(JSON.stringify(gantt), { headers });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
};

export const config = { path: "/api/monday-gantt" };
