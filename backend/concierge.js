// Real Gemini call if GEMINI_API_KEY set, else deterministic mock matching demo script.
const MODEL = "gemini-3-flash-preview";

async function concierge({ message, budget_remaining, catalog }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return mock(message, budget_remaining, catalog);

  const system = `You are a friendly benefits concierge for Perx, an employee benefits marketplace in Albania.
The employee has ${budget_remaining} ALL remaining this month.
Catalog: ${JSON.stringify(catalog)}
Recommend exactly 2-3 offers. Stay within budget. One warm sentence then recommendations.
Respond ONLY in JSON:
{ "message": string, "recommendations": [{ "offer_id", "title", "provider", "price_all", "reason" }] }`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("concierge real call failed, falling back to mock:", e.message);
    return mock(message, budget_remaining, catalog);
  }
}

// ponytail: keyword heuristic, swap for the real API by setting ANTHROPIC_API_KEY
function mock(message, budget, catalog) {
  const m = (message || "").toLowerCase();
  const cap = budgetCap(m, budget);
  const affordable = catalog.filter((o) => o.price_all <= cap);

  const score = (o) => {
    let s = 0;
    const t = (o.title + " " + o.category + " " + o.provider).toLowerCase();
    if (/(relax|spa|massage|wellness|calm|stress)/.test(m) && /(spa|wellness|massage|🧘)/.test(t)) s += 10;
    if (/(fit|gym|sport|train|active)/.test(m) && /(gym|fitness|💪)/.test(t)) s += 10;
    if (/(food|eat|lunch|dinner|hungry|restaurant)/.test(m) && /(food|lunch|dinner|🍽)/.test(t)) s += 10;
    if (/(travel|trip|holiday|vacation|weekend)/.test(m) && /(travel|trip|✈)/.test(t)) s += 10;
    if (/(data|phone|mobile|internet|telecom)/.test(m) && /(telecom|data|📱)/.test(t)) s += 10;
    if (/(learn|course|study|skill|education)/.test(m) && /(education|course|📚)/.test(t)) s += 10;
    return s;
  };

  let picks = affordable
    .map((o) => ({ o, s: score(o) }))
    .sort((a, b) => b.s - a.s || a.o.price_all - b.o.price_all)
    .filter((x) => x.s > 0)
    .slice(0, 3)
    .map((x) => x.o);

  if (picks.length === 0) picks = affordable.sort((a, b) => a.price_all - b.price_all).slice(0, 3);

  return {
    message: picks.length
      ? `Here are a few perks I think you'll love, all within your ${budget.toLocaleString()} ALL budget:`
      : `Your budget is a little tight right now, but here are the closest options I found.`,
    recommendations: picks.map((o) => ({
      offer_id: o.id,
      title: o.title,
      provider: o.provider,
      price_all: o.price_all,
      reason: reasonFor(o, m),
    })),
  };
}

function budgetCap(m, budget) {
  const match = m.match(/under\s*([\d,\.]+)\s*(k|thousand|all)?/);
  if (match) {
    let n = parseFloat(match[1].replace(/,/g, ""));
    if (/k|thousand/.test(match[2] || "")) n *= 1000;
    return Math.min(n, budget);
  }
  return budget;
}

function reasonFor(o, m) {
  if (/(relax|spa|massage|wellness)/.test(m) && /(spa|wellness|massage|🧘)/.test((o.title+o.category).toLowerCase()))
    return "Perfect for unwinding after a long week, and easily within your budget.";
  return `Great value at ${o.price_all.toLocaleString()} ALL and one of our most popular picks.`;
}

module.exports = { concierge };
