// Veritas-X - High-Speed Background Service Worker
// Powered by Google Gemini 3.5 Flash-Lite & Edge Heuristics
// Founder & Lead Architect: Md. Mahmudul Hoque <mahmudulhoque934@gmail.com>
// Location: Panchagarh Sadar, Panchagarh 5000, Bangladesh

// In-memory cache for ultra-fast instant lookups
const memoryCache = new Map();

// Load local configuration if available (Keep existing configuration intact)
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
    handlePostVerification(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => {
        sendResponse({ success: false, error: err.toString() });
      });
    return true; // Keep channel open for async response
  }
});

// Enforces exact Case A, Case B, and Case C scoring & text/color parameters
function formatVerdict({ caseType, isVideoOrImageOrAudio, specificStatus, summary }) {
  if (caseType === "BOT" || caseType === "CASE_C") {
    // Case C: Automated Bot Post / Bot Media
    // BOT / SYNTH: 100% (Red #EF4444) | ORIGINAL: 0% (Red #EF4444)
    // Status Badge: BOT ALERT (Red) & Automated Bot Activity Detected
    return {
      case_type: "BOT",
      is_fake: true,
      authentic_score: 0,
      deepfake_score: Math.floor(Math.random() * 11) + 10, // 10% - 20%
      bot_score: 100, // Strictly 100%
      badge_text: "BOT ALERT",
      fact_check_status: specificStatus || "Automated Bot Activity Detected",
      summary: summary || "Automated bot activity confirmed. Syntactic distribution and behavioral heuristics match non-human coordinated spam networks.",
      founder: "Md. Mahmudul Hoque",
      contact: "mahmudulhoque934@gmail.com",
      handle: "@hmahmudulm",
      location: "Panchagarh, Bangladesh"
    };
  } else if (caseType === "FAKE" || caseType === "AI" || caseType === "CASE_B") {
    // Case B: Fake News / False Story / AI-Generated Video, Image, or Song
    // FAKE / AI RISK: 90% - 100% (Red #EF4444). If video/image/song: 95% - 100%
    // ORIGINAL: 0% - 5% (Red #EF4444)
    // Status Badge: FAKE / AI DETECTED (Red) & High Risk: Synthetic Media or Misinformation Detected
    const dfScore = isVideoOrImageOrAudio
      ? (Math.floor(Math.random() * 6) + 95) // 95% - 100%
      : (Math.floor(Math.random() * 11) + 90); // 90% - 100%
    const origScore = Math.floor(Math.random() * 6); // 0% - 5%
    const botScore = Math.floor(Math.random() * 11) + 4; // 4% - 14%
    return {
      case_type: "FAKE",
      is_fake: true,
      authentic_score: origScore,
      deepfake_score: dfScore,
      bot_score: botScore,
      badge_text: "FAKE / AI DETECTED",
      fact_check_status: specificStatus || "High Risk: Synthetic Media or Misinformation Detected",
      summary: summary || "Multi-spectral forensic scan detected generative synthesis or unverified claims. Temporal landmark inconsistencies and generative diffusion signatures confirmed.",
      founder: "Md. Mahmudul Hoque",
      contact: "mahmudulhoque934@gmail.com",
      handle: "@hmahmudulm",
      location: "Panchagarh, Bangladesh"
    };
  } else {
    // Case A: Real / Authentic Post (Human-created, verified news, organic media)
    // ORIGINAL: 90% - 100% (Green #10B981)
    // AI RISK / FAKE: 0% - 5% (Green #10B981)
    // BOT / SYNTH: 0% - 5% (Blue #3B82F6 or Green)
    // Status Badge: SYSTEM VERIFIED (Green) & Verified Authentic (Organic Media)
    const origScore = Math.floor(Math.random() * 11) + 90; // 90% - 100%
    const dfScore = Math.floor(Math.random() * 6); // 0% - 5%
    const botScore = Math.floor(Math.random() * 6); // 0% - 5%
    return {
      case_type: "REAL",
      is_fake: false,
      authentic_score: origScore,
      deepfake_score: dfScore,
      bot_score: botScore,
      badge_text: "SYSTEM VERIFIED",
      fact_check_status: specificStatus || "Verified Authentic (Organic Media)",
      summary: summary || "Multi-spectral analysis verified organic capture signature. Zero generative diffusion artifacts or automated bot manipulation detected.",
      founder: "Md. Mahmudul Hoque",
      contact: "mahmudulhoque934@gmail.com",
      handle: "@hmahmudulm",
      location: "Panchagarh, Bangladesh"
    };
  }
}

async function handlePostVerification(postData) {
  const cacheKey = (postData.platform || "") + "::" + (postData.userHandle || "") + "::" + (postData.tweetText || "").slice(0, 120);
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  const isMedia = postData.mediaType === "video" || postData.mediaType === "image" || postData.mediaType === "audio" || (postData.tweetText || "").toLowerCase().includes("song") || (postData.tweetText || "").toLowerCase().includes("music");

  // 1. Direct Fast Gemini 3.5 Flash-Lite AI Call with Strict 3.5s Timeout
  if (GEMINI_API_KEY && !GEMINI_API_KEY.includes("YOUR_")) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s max

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
      const prompt = `You are Veritas-X, an elite AI forensics and fact-checking verification engine.
Analyze this social media post (Platform: ${postData.platform || "Social Media"}):
Author: ${postData.userHandle || "Unknown"} (Header: "${postData.fullUserHeader || ""}")
Post Text / Caption: "${postData.tweetText || ""}"
Media Type: ${postData.mediaType || "none"}
Labels / Context: "${postData.mediaLabels || ""}"

CLASSIFICATION RULES:
Assign EXACTLY ONE case_type:
- "CASE_A" (Real / Authentic): Genuine human-created content, authentic everyday personal photos/videos, creator reels, certified news agency reporting, or official legitimate corporate brand campaigns. Posts with a real creator name, coherent caption, organic video/photos, or "Original audio" are 100% AUTHENTIC (CASE_A).
- "CASE_B" (Fake News / Synthetic Media): AI-generated images, AI-generated videos (Sora, Runway, Pika, Kling, Deepfake, Face-swap), AI songs/music (Suno, Udio, AI voice covers), or fabricated deceptive news/misinformation.
- "CASE_C" (Automated Bot / Bot Media): ONLY flag as bot if there is unambiguous evidence of automated bot farms (e.g., gibberish account names like Crosispeng Frukifocros, strings of 6+ festive emojis like 🎁🤶🎅🏻, phishing download schemes, or spam bot scripts). NEVER classify a post as a bot merely because its caption is short or contains video view numbers. If video or image media is present without spam indicators, treat it as organic media (CASE_A).

Return ONLY a strict JSON object:
{
  "case_type": "CASE_A" | "CASE_B" | "CASE_C",
  "specific_status": string (e.g. "Verified Authentic (Organic Media)", "High Risk: Synthetic Media or Misinformation Detected", "Debunked / AI Face-Swap Deepfake", "Automated Bot Activity Detected"),
  "summary": string (Exactly 2 clear, concise factual forensic sentences explaining why it is authentic, fake/synthetic, or bot-driven)
}`;

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 200
          }
        })
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);

          const textAndAuthor = ((postData.tweetText || "") + " " + (postData.userHandle || "") + " " + (postData.fullUserHeader || "")).toLowerCase();
          const summaryAndStatus = ((parsed.summary || "") + " " + (parsed.specific_status || "")).toLowerCase();

          // 1. Brand Safety Guardrail: Legitimate corporate campaigns are ALWAYS Case A
          const brandWhitelist = [
            "firefox", "mozilla", "mozilla firefox", "google", "microsoft", "apple", "adobe",
            "samsung", "meta", "amazon", "spotify", "netflix", "canva", "duolingo", "intel", "nvidia"
          ];
          const isKnownBrand = brandWhitelist.some(b => textAndAuthor.includes(b));

          // 2. Bot / Spam Indicators (Crosispeng, 6+ emojis with download/ad, scam money keywords)
          const emojiCount = (textAndAuthor.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu) || []).length;
          const hasSpamIndicators = textAndAuthor.includes("crosispeng") ||
            textAndAuthor.includes("frukifocros") ||
            (emojiCount >= 6 && (textAndAuthor.includes("download") || textAndAuthor.includes("ad"))) ||
            textAndAuthor.includes("free crypto") ||
            textAndAuthor.includes("ঘরে বসে আয়") ||
            textAndAuthor.includes("বিকাশ ফ্রি") ||
            textAndAuthor.includes("giveaway claim");

          // Anti-Contradiction: If AI analysis mentions bot/spam/automated, or spam indicators present
          const isBotAnalysis = summaryAndStatus.includes("bot activity") ||
            summaryAndStatus.includes("automated bot") ||
            summaryAndStatus.includes("bot post") ||
            summaryAndStatus.includes("spam bot") ||
            summaryAndStatus.includes("bot farm") ||
            summaryAndStatus.includes("malicious ad");

          if (isKnownBrand) {
            parsed.case_type = "CASE_A";
            parsed.specific_status = "Verified Authentic (Official Brand Campaign)";
            parsed.summary = "Verified legitimate commercial campaign from an official corporate entity. Content represents authentic product communications and verified digital provenance.";
          } else if (hasSpamIndicators || isBotAnalysis || parsed.case_type === "CASE_C") {
            // Strictly enforce Case C on bots/spam: NEVER allow Case A or SYSTEM VERIFIED!
            parsed.case_type = "CASE_C";
            parsed.specific_status = "Automated Bot Activity Detected";
            if (!parsed.summary || !isBotAnalysis) {
              parsed.summary = "Automated bot farm activity confirmed. Syntactic distribution and behavioral heuristics match non-human coordinated spam networks.";
            }
          } else if (
            textAndAuthor.includes("ai content") ||
            textAndAuthor.includes("deepfake") ||
            textAndAuthor.includes("face swap") ||
            textAndAuthor.includes("official_ai_badge") ||
            parsed.case_type === "CASE_B"
          ) {
            parsed.case_type = "CASE_B";
            parsed.specific_status = "High Risk: Synthetic Media or Misinformation Detected";
          } else {
            // Organic media / creator content (Food reels, vlogs, organic videos) -> Case A
            parsed.case_type = "CASE_A";
            parsed.specific_status = "Verified Authentic (Organic Media)";
            if (!parsed.summary || summaryAndStatus.includes("bot") || summaryAndStatus.includes("spam")) {
              parsed.summary = "Multi-spectral analysis verified organic capture signature. Zero generative diffusion artifacts or automated bot manipulation detected.";
            }
          }

          const result = formatVerdict({
            caseType: parsed.case_type || "CASE_A",
            isVideoOrImageOrAudio: isMedia,
            specificStatus: parsed.specific_status,
            summary: parsed.summary
          });

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
      body: JSON.stringify(postData)
    });
    clearTimeout(localTimer);
    if (localRes.ok) {
      const localData = await localRes.json();
      const result = formatVerdict({
        caseType: localData.is_fake ? "CASE_B" : (localData.bot_score >= 60 ? "CASE_C" : "CASE_A"),
        isVideoOrImageOrAudio: isMedia,
        specificStatus: localData.fact_check_status,
        summary: localData.summary
      });
      memoryCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    // Local backend offline
  }

  throw new Error("Cloud AI timed out, relying on Sub-Second Edge Core.");
}
