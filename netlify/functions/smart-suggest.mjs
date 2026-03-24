export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const { title, root_cause, kpi, context } = await req.json();

  const prompt = `You are helping a manufacturing inventory team write SMART action items.

Root cause category: ${root_cause}
Current action title: "${title}"
${kpi ? `KPI they want to measure: ${kpi}` : 'No KPI defined yet.'}
${context || ''}

Rewrite this action as a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound). Also suggest a KPI if none was provided.

Reply in JSON format only:
{"smart_title": "the rewritten SMART action", "suggested_kpi": "suggested KPI metric", "reasoning": "one sentence why this is better"}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Netlify.env.get("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return new Response(JSON.stringify({ error: err }), { status: 500, headers });
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Parse JSON from response
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const suggestion = JSON.parse(match[0]);
    return new Response(JSON.stringify(suggestion), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ smart_title: text, suggested_kpi: "", reasoning: "" }), { headers });
  }
};

export const config = { path: "/api/smart-suggest" };
