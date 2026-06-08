/**
 * AiService.js — Self-Healing Auto-Discovery Method 🚀
 */

// ── APNI ASLI GOOGLE API KEY YAHAN DAALEIN ('AQ...' wali) ──
const GEMINI_API_KEY = 'AQ.Ab8RN6KAWpSjEBDcRvbB0UjbnCde2PK1937HUUp-e2dUJhm2Sg';

// ── System Prompts ──────────────────────────────────────────────
const SYSTEM_PROMPTS = {
  summarize: `You are a smart, friendly study assistant inside Lumina Notes.
The user has shared their raw study notes. Produce a clean, concise TL;DR summary.
OUTPUT FORMAT:
- Start with one short sentence summarising the core idea.
- Then list exactly 5 bullet points (use •).
- End with one encouraging line starting with "💡 Quick Tip:"
TONE: Warm, clear. Plain text only.`,

  flashcards: `You are a smart study assistant inside Lumina Notes.
Generate exactly 5 flashcard-style Q&A pairs from the notes.
OUTPUT FORMAT:
Q1: [question]
A1: [concise answer]
(continue up to Q5/A5)
Rules: Plain text only, no markdown. 1-2 sentence answers maximum.`,

  aesthetic: `You are a professional editor inside Lumina Notes.
Clean up the notes, fix grammar, and format into short bullet points if needed.
Preserve ALL original information.
End with "✨ Note by Lumina AI:"
TONE: Clean, academic. Plain text only.`
};

// ── Core Function (Using Native Fetch) ───────────────────────────
export async function generateAiSpark(noteContent, actionType) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new AiServiceError('API_KEY_MISSING', 'API key is missing! Please paste your key in AiService.js');
  }

  const trimmed = noteContent?.trim() ?? '';
  if (trimmed.length < 20) {
    throw new AiServiceError('CONTENT_TOO_SHORT', 'Your note is too short. Write a bit more! ✍️');
  }

  // ── ✨ THE CTO MASTERSTROKE: AUTO-DISCOVERY ENGINE ──
  // Hum naam guess nahi karenge, seedha Google se active model ki list mangwayenge!
  let modelName = '';
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();

    if (!listRes.ok) {
      throw new Error(listData.error?.message || 'Could not fetch models');
    }

    // Aise models filter karo jo text generate kar sakte hain
    const models = listData.models?.filter(m => m.supportedGenerationMethods?.includes('generateContent')) || [];
    
    // Pehle 'flash' dhoondo, na mile toh 'pro', na mile toh jo bhi pehla available ho!
    const bestModel = models.find(m => m.name.includes('flash')) || 
                      models.find(m => m.name.includes('pro')) || 
                      models[0];

    if (bestModel) {
      modelName = bestModel.name; // Automatically detect ho gaya (e.g., 'models/gemini-something')
    } else {
      throw new Error('Aapki key par koi compatible text model nahi mila!');
    }
  } catch (err) {
    throw new AiServiceError('AUTO_DISCOVERY_FAILED', `Google ne models ki list nahi di: ${err.message}`);
  }

  // ── Final Generation Request ──
  const systemPrompt = SYSTEM_PROMPTS[actionType] || SYSTEM_PROMPTS.summarize;
  const finalPrompt = `${systemPrompt}\n\n=== USER NOTES ===\n${trimmed}`;

  // Jo model auto-discover hua hai, usey URL mein lagao
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: finalPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Google API rejected the request.');
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Gemini returned an empty response.');
    }

    return text.trim();

  } catch (err) {
    if (err instanceof AiServiceError) throw err;
    throw new AiServiceError('NETWORK_ERROR', `Generation failed: ${err.message}`);
  }
}

// ── Error Handler & UI Meta ──────────────────────────────────────
export class AiServiceError extends Error {
  constructor(code, userMessage) {
    super(userMessage);
    this.code = code;
    this.userMessage = userMessage;
  }
}

export const AI_ACTION_META = {
  summarize:  { label: 'TL;DR Summary',     icon: '📝', color: '#FFB3BA' },
  flashcards: { label: 'Flashcards',         icon: '🃏', color: '#FFD700' },
  aesthetic:  { label: 'Formatted Notes',    icon: '🪄', color: '#B5E5D8' },
};
