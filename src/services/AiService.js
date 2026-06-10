/**
 * AiService.js — Cloud Secure Version + Auto-Discovery Preserved 🚀
 */

// 👇 Yeh line add karni zaroori hai taaki Supabase se connect ho sake
// (Apne folder structure ke hisaab se path '../supabase' theek kar lena agar alag ho)
import { supabase } from '../supabase'; 

// ── API KEY CLOUD MEIN HAI AB (Frontend se hata di) ──
const GEMINI_API_KEY = '';

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

// ── Core Function (Using Supabase Edge Functions) ───────────────────
export async function generateAiSpark(noteContent, actionType) {
  const trimmed = noteContent?.trim() ?? '';
  if (trimmed.length < 20) {
    throw new AiServiceError('CONTENT_TOO_SHORT', 'Your note is too short. Write a bit more! ✍️');
  }

  // Frontend par prompt banayenge, lekin call cloud ko karenge
  const systemPrompt = SYSTEM_PROMPTS[actionType] || SYSTEM_PROMPTS.summarize;
  const finalPrompt = `${systemPrompt}\n\n=== USER NOTES ===\n${trimmed}`;

  // ── ✨ NEW SECURE CLOUD CALL (Option C) ──
  try {
    const { data, error } = await supabase.functions.invoke('ask-gemini', {
      body: { 
        prompt: finalPrompt,
        actionId: actionType 
      }
    });

    if (error) {
      throw error;
    }

    // Edge function se aaya hua answer return karo
    return data.answer || data.text || data;

  } catch (err) {
    console.error("AI Service Error:", err);
    throw new AiServiceError('NETWORK_ERROR', `Cloud Generation failed: ${err.message}`);
  }

  // =======================================================================
  // ── ✨ THE CTO MASTERSTROKE: AUTO-DISCOVERY ENGINE (PRESERVED) ──
  // Rule: "Purana kuch mat hatana". Isliye aapka Auto-Discovery logic 
  // yahan comment block mein ekdum safe rakha hai future reference ke liye!
  // =======================================================================
  /*
  let modelName = '';
  try {
    const listUrl = \`https://generativelanguage.googleapis.com/v1beta/models?key=\${GEMINI_API_KEY}\`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();

    if (!listRes.ok) {
      throw new Error(listData.error?.message || 'Could not fetch models');
    }

    const models = listData.models?.filter(m => m.supportedGenerationMethods?.includes('generateContent')) || [];
    const bestModel = models.find(m => m.name.includes('flash')) || 
                      models.find(m => m.name.includes('pro')) || 
                      models[0];

    if (bestModel) {
      modelName = bestModel.name; 
    } else {
      throw new Error('Aapki key par koi compatible text model nahi mila!');
    }
  } catch (err) {
    throw new AiServiceError('AUTO_DISCOVERY_FAILED', \`Google ne models ki list nahi di: \${err.message}\`);
  }
  
  const url = \`https://generativelanguage.googleapis.com/v1beta/\${modelName}:generateContent?key=\${GEMINI_API_KEY}\`;
  */
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
