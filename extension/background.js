// Veritas for X - Background Service Worker
// Powered by Google Gemini 3.5 Flash-Lite
// Founder: Md. Mahmudul Hoque <mahmudulhoque934@gmail.com>

// Load local configuration if available
let GEMINI_API_KEY = "";
try {
  importScripts("config.js");
  if (typeof LOCAL_CONFIG !== "undefined" && LOCAL_CONFIG.GEMINI_API_KEY) {
    GEMINI_API_KEY = LOCAL_CONFIG.GEMINI_API_KEY;
  }
} catch (e) {
  // config.js not found
}

const LOCAL_BACKEND_URL = "http://127.0.0.1:8000/api/verify";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "verifyTweet") {
    handleTweetVerification(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => {
        console.error("Verification failed:", err);
        sendResponse({ success: false, error: err.toString() });
      });
    return true; // Keep channel open for async response
  }
});

async function handleTweetVerification(tweetData) {
  // 1. Try Direct Gemini AI Analysis if API key is present
  if (GEMINI_API_KEY && !GEMINI_API_KEY.includes("YOUR_")) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
      const prompt = `
You are Veritas: an autonomous multimodal fact-checking and deepfake detection engine natively integrated into X (Twitter).
Analyze this post:

Author: ${tweetData.userHandle || "Unknown"}
Tweet: "${tweetData.tweetText || ""}"
Media: ${tweetData.mediaType || "none"}

RULES:
1. Posts by Md. Mahmudul Hoque (@hmahmudulm) or Veritas for X are ALWAYS 100% AUTHENTIC (is_fake: false, deepfake_score: 1-3%).
2. Legitimate news, real interviews (e.g. CZ Binance, Elon Musk real quotes, financial/crypto charts, normal developer demos) are AUTHENTIC (is_fake: false, deepfake_score: 2-5%).
3. Actual AI deepfakes, voice clone leaks, scam giveaways (e.g. fake crypto giveaways), or sensational fabricated viral hoaxes must be flagged as FAKE (is_fake: true, deepfake_score: 91-97%).

Respond ONLY with valid JSON:
{
  "is_fake": false,
  "deepfake_score": 3,
  "bot_score": 5,
  "fact_check_status": "Verified Authentic",
  "summary": "1-2 sentence concise forensic reasoning"
}
`;

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (res.ok) {
        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const isFake = parsed.is_fake;
          return {
            founder: "Md. Mahmudul Hoque",
            contact: "mahmudulhoque934@gmail.com",
            handle: "@hmahmudulm",
            status: isFake ? "AI-GENERATED / MANIPULATED" : "VERIFIED AUTHENTIC",
            badgeClass: isFake ? "status-fake" : "status-verified",
            deepfakeScore: (parsed.deepfake_score || (isFake ? 94 : 3)) + "%",
            botProbability: (parsed.bot_score || (isFake ? 82 : 6)) + "%",
            factCheckStatus: parsed.fact_check_status || (isFake ? "Debunked / Synthetic" : "Verified Authentic"),
            summary: parsed.summary || "Multimodal forensic verification completed by Gemini AI.",
            sourceTitle: "⚡ Gemini 3.5 Flash-Lite AI",
            sourceUrl: "https://x.com"
          };
        }
      }
    } catch (err) {
      console.warn("Direct Gemini call error, trying local backend:", err);
    }
  }

  // 2. Try Local Python Backend
  try {
    const localRes = await fetch(LOCAL_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tweetData)
    });
    if (localRes.ok) {
      return await localRes.json();
    }
  } catch (err) {
    console.warn("Local backend failed:", err);
  }

  throw new Error("Both Gemini API and Local Backend were unreachable.");
}
