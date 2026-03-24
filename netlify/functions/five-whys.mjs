// 5 Whys Root Cause Analysis assistant
export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const { problem, whys_so_far, root_cause_context } = await req.json();

  const whyCount = (whys_so_far || []).length;
  const whysText = (whys_so_far || []).map((w, i) => `Why ${i+1}: ${w.question}\nAnswer: ${w.answer}`).join('\n');

  const prompt = `You are a manufacturing process improvement expert helping a team find the TRUE root cause of inventory discrepancies.

The team is working on a $447K inventory gap from a wall-to-wall count. They have 4 main categories: Process (45%), Data (36%), Transactions (15%), Execution (4%).

PROBLEM: ${problem}
${root_cause_context ? `CONTEXT: ${root_cause_context}` : ''}

${whysText ? `PREVIOUS WHYS:\n${whysText}\n` : ''}

${whyCount >= 4 ? `We have done ${whyCount} whys. Based on the answers, identify the TRUE root cause and suggest a specific, measurable corrective action.

Reply in JSON:
{"root_cause": "the true root cause identified", "suggested_action": "specific corrective action", "kpi": "how to measure if it's working", "confidence": "high/medium/low", "reasoning": "why this is the root cause"}` :

`Ask the next "Why?" question (Why #${whyCount + 1}) to dig deeper into the real cause. Make it specific to manufacturing/inventory context.

Reply in JSON:
{"why_number": ${whyCount + 1}, "question": "the why question to ask", "hint": "a hint to help them think about the answer", "depth_assessment": "how close are we to root cause: surface/getting_closer/almost_there"}`}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Netlify.env.get("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: await response.text() }), { status: 500, headers });
  }

  const data = await response.json();
  try {
    const match = data.content[0].text.match(/\{[\s\S]*\}/);
    return new Response(match[0], { headers });
  } catch(e) {
    return new Response(JSON.stringify({ question: data.content[0].text }), { headers });
  }
};

export const config = { path: "/api/five-whys" };
