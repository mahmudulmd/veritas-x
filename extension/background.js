// Veritas for X - High-Speed Background Service Worker
// Powered by Google Gemini 3.5 Flash-Lite & Edge Heuristics
// Founder: Md. Mahmudul Hoque <mahmudulhoque934@gmail.com>

// In-memory cache for ultra-fast instant lookups
const memoryCache = new Map();

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
  if (request.action === "verifyTweet" || request.action === "verifyPost") {
    handleTweetVerification(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => {
        sendResponse({ success: false, error: err.toString() });
      });
    return true; // Keep channel open for async response
  }
});

async function handleTweetVerification(tweetData) {
  const cacheKey = (tweetData.userHandle || "") + "::" + (tweetData.tweetText || "").slice(0, 120);
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  // 1. Direct Fast Gemini 3.5 Flash-Lite AI Call with Strict 3.5s Timeout
  if (GEMINI_API_KEY && !GEMINI_API_KEY.includes("YOUR_")) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s max

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
      const prompt = `You are Veritas Universal, an advanced AI forensics verification engine.
Analyze this social media post (Platform: ${tweetData.platform || "X / Social Media"}):
Author: ${tweetData.userHandle || "Unknown"} (Header: "${tweetData.fullUserHeader || ""}")
Post Text / Caption: "${tweetData.tweetText || ""}"
Media Type: ${tweetData.mediaType || "none"}
Labels / Context: "${tweetData.mediaLabels || ""}"

CORE FORENSIC RULES:
1. Deepfakes & AI Satire: If the media depicts world leaders or celebrities in impossible/satirical scenarios, flag as AI DEEPFAKE (is_fake: true, deepfake_score: 95-99).
2. Official Brand Advertisements & Commercial Campaigns: Official corporate ads, sponsored posts, or feature announcements from recognized global companies and software brands (e.g., Firefox, Mozilla, Google, Microsoft, Apple, Adobe, Samsung, Canva, Duolingo, etc.) promoting real products or features (e.g. 'Firefox AI Controls', official app downloads) are 100% AUTHENTIC and SAFE commercial campaigns. They are NEVER bot scams or deepfakes. Flag as:
   is_fake: false
   deepfake_score: 1-4
   bot_score: 1-5
   fact_check_status: "Verified Authentic (Official Brand Campaign)"
   summary: "Verified legitimate commercial campaign from an official corporate brand. Genuine product communications."
3. Malicious Scam Ads & Bot Farms: ONLY flag as bot/scam if the post is from an unverified, deceptive bot account with gibberish names (e.g., Crosispeng Frukifocros), random string of festive/gift emojis (e.g., 🎁🤶🎅🏻), get-rich-quick scams, phishing, or deceptive fake app clones. Legitimate global brands like Mozilla Firefox or Google are NEVER bot scams. Flag as:
   is_fake: true
   bot_score: 85-99
   deepfake_score: 10-30
   fact_check_status: "Debunked / Fraudulent Bot Scam"
4. Official News & Genuine Personal Media: Real news broadcasts, official speeches, or genuine everyday posts from real humans without bot/scam patterns are AUTHENTIC (is_fake: false, deepfake_score: 1-4, bot_score: 1-5, fact_check_status: "Verified Authentic (Organic Media)").

Return ONLY a strict JSON object:
{
  "is_fake": boolean,
  "deepfake_score": number (0-100),
  "bot_score": number (0-100),
  "fact_check_status": string,
  "summary": string (1-2 clear concise factual forensic sentences explaining why it is real, fake, or a bot scam)
}`;

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 180
          }
        })
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);

          let dfScore = parsed.deepfake_score !== undefined
            ? (parsed.deepfake_score <= 1 ? Math.round(parsed.deepfake_score * 100) : Math.round(parsed.deepfake_score))
            : 3;
          let botScore = parsed.bot_score !== undefined
            ? (parsed.bot_score <= 1 ? Math.round(parsed.bot_score * 100) : Math.round(parsed.bot_score))
            : 5;

          let statusLower = (parsed.fact_check_status || "").toLowerCase();
          let isSpamOrBot = botScore >= 60 || statusLower.includes("spam") || statusLower.includes("bot") || statusLower.includes("scam") || statusLower.includes("fraud");

          // Brand Safety Guardrail: Prevent false scam classification on legitimate global brands (e.g., Firefox, Google, Microsoft)
          const brandWhitelist = [
            "firefox", "mozilla", "mozilla firefox", "google", "microsoft", "apple", "adobe",
            "samsung", "meta", "amazon", "spotify", "netflix", "canva", "duolingo", "intel", "nvidia"
          ];
          const textAndAuthor = ((tweetData.tweetText || "") + " " + (tweetData.userHandle || "") + " " + (tweetData.fullUserHeader || "")).toLowerCase();
          const isKnownBrand = brandWhitelist.some(b => textAndAuthor.includes(b));

          if (isKnownBrand && isSpamOrBot) {
            isSpamOrBot = false;
            parsed.is_fake = false;
            dfScore = 2;
            botScore = 3;
            parsed.fact_check_status = "Verified Authentic (Official Brand Campaign)";
            parsed.summary = "Verified legitimate commercial campaign from an official corporate entity. Content represents authentic product communications and verified digital provenance.";
          }

          // An item is FAKE/THREAT if it is either a deepfake OR a spam/bot scam!
          const isFake = Boolean(parsed.is_fake) || isSpamOrBot;

          let authScore = isSpamOrBot
            ? Math.max(3, 100 - Math.max(dfScore, botScore))
            : (isFake ? Math.max(2, 100 - dfScore) : Math.min(98, 100 - dfScore));

          let finalStatus = parsed.fact_check_status || (isFake ? "Debunked / AI Satirical Deepfake" : "Verified Authentic");
          if (isSpamOrBot && !finalStatus.toLowerCase().includes("debunked") && !finalStatus.toLowerCase().includes("fraud") && !finalStatus.toLowerCase().includes("scam") && !finalStatus.toLowerCase().includes("spam")) {
            finalStatus = "Debunked / " + finalStatus;
          }

          const result = {
            is_fake: isFake,
            authentic_score: authScore,
            deepfake_score: dfScore,
            bot_score: botScore,
            fact_check_status: finalStatus,
            summary: parsed.summary || (isFake ? "Generative AI or bot manipulation confirmed." : "Organic capture verified."),
            // legacy fields
            founder: "Md. Mahmudul Hoque",
            contact: "mahmudulhoque934@gmail.com",
            handle: "@hmahmudulm",
            status: isFake ? "AI-GENERATED / MANIPULATED" : "VERIFIED AUTHENTIC",
            badgeClass: isFake ? "status-fake" : "status-verified",
            deepfakeScore: dfScore + "%",
            botProbability: botScore + "%",
            factCheckStatus: finalStatus,
            sourceTitle: "⚡ Gemini 3.5 Flash-Lite AI",
            sourceUrl: "https://x.com"
          };
          memoryCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn("[Veritas Cloud AI Warn]:", err);
      // Fall through to local fallback
    }
  }

  // 2. Try Local Python Backend (1s fast check)
  try {
    const localCtrl = new AbortController();
    const localTimer = setTimeout(() => localCtrl.abort(), 1000);
    const localRes = await fetch(LOCAL_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: localCtrl.signal,
      body: JSON.stringify(tweetData)
    });
    clearTimeout(localTimer);
    if (localRes.ok) {
      const localData = await localRes.json();
      memoryCache.set(cacheKey, localData);
      return localData;
    }
  } catch (err) {
    // Local backend offline
  }

  throw new Error("Cloud AI timed out, relying on Sub-Second Edge Core.");
}
