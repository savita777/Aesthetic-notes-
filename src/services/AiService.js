/**
 * AiService.js — Lumina Notes
 * ─────────────────────────────────────────────────────────────────────────────
 * Google Gemini AI integration using the official @google/generative-ai SDK.
 *
 * SETUP:
 *   1. npm install @google/generative-ai
 *   2. Replace YOUR_GEMINI_API_KEY_HERE with your actual key.
 *
 * SECURITY NOTE FOR PRODUCTION:
 *   Never ship a real API key in client-side code. In production, proxy all
 *   Gemini calls through your own backend (Node/Firebase Function) so the key
 *   stays server-side and can be rate-limited per user.
 *   For this local prototype, inline key is fine.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Replace this with your actual Gemini API key ──────────────────────────────
const GEMINI_API_KEY = 'AQ.Ab8RN6KAWpSjEBDcRvbB0UjbnCde2PK1937HUUp-e2dUJhm2Sg';

// ── Model config ──────────────────────────────────────────────────────────────
const MODEL_NAME = 'gemini-1.5-flash';        // fast, free-tier friendly
const MAX_OUTPUT_TOKENS = 1024;

// ── Init client (lazy singleton) ─────────────────────────────────────────────
let _genAI = null;
const getClient = () => {
  if (!_genAI) _genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return _genAI;
};

// ─── System prompts per action type ──────────────────────────────────────────
const SYSTEM_PROMPTS = {

  summarize: `You are a smart, friendly study assistant inside an aesthetic study app called Lumina Notes.
The user has shared their raw study notes with you. Your job is to produce a clean, concise TL;DR summary.

OUTPUT FORMAT (strict):
- Start with one short sentence summarising the core idea (max 20 words).
- Then list exactly 5 bullet points (use • as the bullet character).
- Each bullet must be one tight, clear sentence.
- End with one encouraging line starting with "💡 Quick Tip:"

TONE: Warm, clear, student-friendly. No jargon. No markdown headers. Plain text only.`,

  flashcards: `You are a smart study assistant inside Lumina Notes helping a student prepare for exams.
The user has shared their notes. Generate exactly 5 flashcard-style Q&A pairs.

OUTPUT FORMAT (strict):
Q1: [question]
A1: [concise answer]

Q2: [question]
A2: [concise answer]

...and so on up to Q5/A5.

Rules:
- Questions must test genuine understanding, not trivial recall.
- Answers must be 1–2 sentences maximum.
- No markdown formatting. Plain text only.
- If the notes are too short to generate 5 questions, generate as many as possible and add a note at the end.`,

  aesthetic: `You are a professional editor and study coach inside Lumina Notes.
The user wants their raw notes cleaned up, grammar-fixed, and beautifully reformatted.

OUTPUT FORMAT (strict):
- Fix all spelling and grammar errors silently (do not mention what you fixed).
- Reorganise the content into clear short paragraphs.
- If there are lists buried in the text, format them as proper bullet points using •.
- Preserve ALL the original information — do not summarise or remove content.
- End with a one-line "✨ Note by Lumina AI:" comment about the topic.

TONE: Clean, academic, elegant. No markdown headers. Plain text only.`,

};

// ─── Core function ────────────────────────────────────────────────────────────
/**
 * generateAiSpark(noteContent, actionType)
 *
 * @param {string} noteContent  — raw text from the user's note
 * @param {string} actionType   — 'summarize' | 'flashcards' | 'aesthetic'
 * @returns {Promise<string>}   — AI-generated result text
 * @throws  {AiServiceError}    — structured error with a user-facing message
 */
export async function generateAiSpark(noteContent, actionType) {
  // ── Guard: API key not set ──
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new AiServiceError(
      'API_KEY_MISSING',
      'Gemini API key is not configured. Open AiService.js and paste your key.'
    );
  }

  // ── Guard: empty notes ──
  const trimmed = noteContent?.trim() ?? '';
  if (trimmed.length < 20) {
    throw new AiServiceError(
      'CONTENT_TOO_SHORT',
      'Your note is too short for AI analysis. Write a bit more and try again! ✍️'
    );
  }

  // ── Guard: unknown action ──
  const systemPrompt = SYSTEM_PROMPTS[actionType];
  if (!systemPrompt) {
    throw new AiServiceError(
      'UNKNOWN_ACTION',
      `Unknown AI action: "${actionType}". Expected summarize, flashcards, or aesthetic.`
    );
  }

  try {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt,
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.7,       // balanced creativity
        topP: 0.9,
      },
    });

    // Build the user turn — include note length as context hint
    const userPrompt = `Here are my study notes (${trimmed.length} characters):\n\n${trimmed}`;

    const result = await model.generateContent(userPrompt);
    const response = result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      throw new AiServiceError('EMPTY_RESPONSE', 'Gemini returned an empty response. Please try again.');
    }

    return text.trim();

  } catch (err) {
    // Re-throw our own errors as-is
    if (err instanceof AiServiceError) throw err;

    // Map common Gemini SDK errors to friendly messages
    const message = err?.message ?? '';

    if (message.includes('API_KEY_INVALID') || message.includes('403')) {
      throw new AiServiceError('INVALID_KEY', 'Your Gemini API key is invalid. Please check and update AiService.js.');
    }
    if (message.includes('QUOTA') || message.includes('429')) {
      throw new AiServiceError('QUOTA_EXCEEDED', 'Daily Gemini quota reached. Try again tomorrow or upgrade your API plan.');
    }
    if (message.includes('SAFETY')) {
      throw new AiServiceError('SAFETY_BLOCK', 'Gemini blocked this content for safety reasons. Try rephrasing your notes.');
    }
    if (message.includes('network') || message.includes('fetch')) {
      throw new AiServiceError('NETWORK_ERROR', 'No internet connection. Check your network and try again.');
    }

    // Fallback
    throw new AiServiceError('UNKNOWN', `AI request failed: ${message}`);
  }
}

// ─── Structured error class ───────────────────────────────────────────────────
export class AiServiceError extends Error {
  constructor(code, userMessage) {
    super(userMessage);
    this.name  = 'AiServiceError';
    this.code  = code;
    this.userMessage = userMessage;
  }
}

// ─── Action metadata (used by NoteScreen to render the result modal header) ───
export const AI_ACTION_META = {
  summarize:  { label: 'TL;DR Summary',     icon: '📝', color: '#FFB3BA' },
  flashcards: { label: 'Flashcards',         icon: '🃏', color: '#FFD700' },
  aesthetic:  { label: 'Formatted Notes',    icon: '🪄', color: '#B5E5D8' },
};

