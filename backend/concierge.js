// Real Gemini call if GEMINI_API_KEY set, else deterministic mock matching demo script.
const MODEL = "gemini-3-flash-preview";

async function concierge({ message, budget_remaining, catalog, lang }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return mock(message, budget_remaining, catalog, lang);

  const system = `You are Exodus, a friendly benefits concierge for Perx, an employee benefits marketplace in Albania.
The employee has ${budget_remaining} ALL remaining this month.
Catalog: ${JSON.stringify(catalog)}

CRITICAL POLICY: You are an AI assistant designed solely for the Perx app. You must ONLY answer queries related to the Perx app, employee benefits, perks, and the offers catalog.
- If the user is greeting you (e.g. "hello", "hi", "përshëndetje", "si je", etc.) or asking general questions about what you can do/how to get help, respond with a warm, friendly welcome introducing yourself as the Perx benefits concierge, briefly list the categories of perks available (Wellness, Fitness, Food, Travel, Telecom, Education), and return an empty recommendations array [].
- If the user asks about their remaining budget, explain how much they have left (${budget_remaining} ALL) and return an empty recommendations array [].
- If the user asks general knowledge questions, coding questions, general conversation, or any topic unrelated to Perx, benefits, or the catalog, politely decline to answer and return an empty recommendations array [].
- Only return recommended offers (2-3 items) when the user specifically asks to find, list, suggest, or recommend benefits, deals, or items.

Respond ONLY in this JSON format:
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
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    // Enrich the recommendations with image_url and category from the catalog
    if (parsed && Array.isArray(parsed.recommendations)) {
      parsed.recommendations = parsed.recommendations.map((rec) => {
        const item = catalog.find((c) => String(c.id) === String(rec.offer_id));
        return {
          ...rec,
          image_url: item?.image_url || null,
          category: item?.category || null,
        };
      });
    }
    return parsed;
  } catch (e) {
    console.error("concierge real call failed, falling back to mock:", e.message);
    return mock(message, budget_remaining, catalog, lang);
  }
}

// ponytail: keyword heuristic, swap for the real API by setting ANTHROPIC_API_KEY
function mock(message, budget, catalog, lang) {
  const m = (message || "").toLowerCase();

  // Check if query is related to the app or categories
  const onTopicKeywords = [
    "hello", "hi", "hey", "tung", "përshëndetje", "dita", "how", "what", "help", "ndihm",
    "perx", "exodus", "benefit", "perk", "offer", "budget", "money", "all", "lek", "buxhet",
    "relax", "spa", "massage", "wellness", "calm", "stress", "relaks", "masazh",
    "fit", "gym", "sport", "train", "active", "palestër", "stërvit", "vrap",
    "food", "eat", "lunch", "dinner", "hungry", "restaurant", "ushqim", "ngrën", "drek", "dark",
    "travel", "trip", "holiday", "vacation", "weekend", "udhëtime", "pushim", "fundjav",
    "data", "phone", "mobile", "internet", "telecom", "telefon", "internet", "valë",
    "learn", "course", "study", "skill", "education", "mëso", "studim", "shkoll", "kurs"
  ];

  const hasKeyword = onTopicKeywords.some(kw => m.includes(kw));

  // If the query is completely unrelated to benefits/app (e.g. general trivia, unrelated requests)
  if (m.trim().length > 0 && !hasKeyword) {
    return {
      message: lang === "sq"
        ? "Më falni, por unë mund t'u përgjigjem vetëm pyetjeve që lidhen me aplikacionin Perx, përfitimet tuaja të punonjësve dhe katalogun e ofertave."
        : "I'm sorry, but I can only answer questions related to the Perx app, your employee benefits, and the offers catalog.",
      recommendations: []
    };
  }

  const categoryKeywords = [
    "relax", "spa", "massage", "wellness", "calm", "stress", "relaks", "masazh",
    "fit", "gym", "sport", "train", "active", "palestër", "stërvit", "vrap",
    "food", "eat", "lunch", "dinner", "hungry", "restaurant", "ushqim", "ngrën", "drek", "dark",
    "travel", "trip", "holiday", "vacation", "weekend", "udhëtime", "pushim", "fundjav",
    "data", "phone", "mobile", "internet", "telecom", "telefon", "valë",
    "learn", "course", "study", "skill", "education", "mëso", "studim", "shkoll", "kurs"
  ];
  const hasCategory = categoryKeywords.some(kw => m.includes(kw));
  const hasBudgetLimit = m.includes("under") || m.includes("nën");
  const hasBudgetQuery = ["budget", "money", "buxhet", "lek", "all", "remaining", "mbetur"].some(kw => m.includes(kw));

  // If the query is related to budget
  if (hasKeyword && !hasCategory && !hasBudgetLimit && hasBudgetQuery) {
    return {
      message: lang === "sq"
        ? `Ju keni ${budget.toLocaleString()} ALL të mbetura në buxhetin tuaj Perx për këtë muaj. Mund t'i shpenzoni ato në cilëndo nga ofertat në katalogun tonë.`
        : `You have ${budget.toLocaleString()} ALL remaining in your Perx budget for this month. You can spend it on any of the offers in our catalog!`,
      recommendations: []
    };
  }

  // If the query is a general greeting or help request
  if (hasKeyword && !hasCategory && !hasBudgetLimit) {
    const isHelp = m.includes("help") || m.includes("ndihm") || m.includes("what") || m.includes("how");
    if (isHelp) {
      return {
        message: lang === "sq"
          ? "Unë mund t'ju ndihmoj të kërkoni, krahasoni dhe përfitoni nga ofertat tona të punonjësve. Provoni të pyesni për diçka si 'paketa spa nën 5,000 ALL', 'anëtarësime në palestër' ose 'oferta udhëtimi'!"
          : "I can help you search, compare, and redeem your employee benefits. Try asking for something like 'spa packages under 5,000 ALL', 'gym memberships', or 'travel deals'!",
        recommendations: []
      };
    }

    return {
      message: lang === "sq"
        ? "Përshëndetje! Unë jam Exodus, ndihmësi juaj i përfitimeve Perx. Unë mund t'ju rekomandoj paketa spa, anëtarësime në palestër, kuponë ushqimi, paketa interneti dhe më shumë. Si mund t'ju ndihmoj sot?"
        : "Hello! I am Exodus, your Perx benefits concierge. I can recommend spa packages, gym memberships, food vouchers, internet bundles, and more. How can I help you explore your employee benefits today?",
      recommendations: []
    };
  }

  const cap = budgetCap(m, budget);
  const affordable = catalog.filter((o) => o.price_all <= cap);

  const score = (o) => {
    let s = 0;
    const t = (o.title + " " + o.category + " " + o.provider).toLowerCase();
    if (/(relax|spa|massage|wellness|calm|stress|relaks|masazh)/.test(m) && /(spa|wellness|massage|🧘)/.test(t)) s += 10;
    if (/(fit|gym|sport|train|active|palestër|stërvit)/.test(m) && /(gym|fitness|💪)/.test(t)) s += 10;
    if (/(food|eat|lunch|dinner|hungry|restaurant|ushqim|ngrën|drek)/.test(m) && /(food|lunch|dinner|🍽)/.test(t)) s += 10;
    if (/(travel|trip|holiday|vacation|weekend|udhëtime|pushim|fundjav)/.test(m) && /(travel|trip|✈)/.test(t)) s += 10;
    if (/(data|phone|mobile|internet|telecom|telefon|valë)/.test(m) && /(telecom|data|📱)/.test(t)) s += 10;
    if (/(learn|course|study|skill|education|mëso|studim|shkoll|kurs)/.test(m) && /(education|course|📚)/.test(t)) s += 10;
    return s;
  };

  let picks = affordable
    .map((o) => ({ o, s: score(o) }))
    .sort((a, b) => b.s - a.s || a.o.price_all - b.o.price_all)
    .filter((x) => x.s > 0)
    .slice(0, 3)
    .map((x) => x.o);

  if (picks.length === 0) picks = affordable.sort((a, b) => a.price_all - b.price_all).slice(0, 3);

  const greeting = lang === "sq"
    ? `Këtu janë disa përfitime që mendoj se do t'ju pëlqejnë, të gjitha brenda buxhetit tuaj prej ${budget.toLocaleString()} ALL:`
    : `Here are a few perks I think you'll love, all within your ${budget.toLocaleString()} ALL budget:`;

  const tightGreeting = lang === "sq"
    ? `Buxheti juaj është pak i kufizuar momentalisht, por këtu janë opsionet më të afërta që gjeta.`
    : `Your budget is a little tight right now, but here are the closest options I found.`;

  return {
    message: picks.length ? greeting : tightGreeting,
    recommendations: picks.map((o) => ({
      offer_id: o.id,
      title: o.title,
      provider: o.provider,
      price_all: o.price_all,
      reason: reasonFor(o, m, lang),
      image_url: o.image_url,
      category: o.category,
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

function reasonFor(o, m, lang) {
  const isSq = lang === "sq";
  if (/(relax|spa|massage|wellness|relaks|masazh)/.test(m) && /(spa|wellness|massage|🧘)/.test((o.title+o.category).toLowerCase())) {
    return isSq 
      ? "E përkryer për t'u çlodhur pas një jave të gjatë, dhe lehtësisht brenda buxhetit tuaj."
      : "Perfect for unwinding after a long week, and easily within your budget.";
  }
  return isSq
    ? `Vlerë e shkëlqyer me ${o.price_all.toLocaleString()} ALL dhe një nga zgjedhjet tona më të njohura.`
    : `Great value at ${o.price_all.toLocaleString()} ALL and one of our most popular picks.`;
}

module.exports = { concierge };
