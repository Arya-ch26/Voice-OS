import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

console.log('Testing generating HTML for Notepad if omitted...');
const t0 = Date.now();
const res = await ai.models.generateContent({
  model: 'gemini-3.5-flash-lite',
  contents: 'Generate a self-contained single-file HTML app for Notepad with dark theme inline CSS and JS. Under 50 lines. Return only HTML.',
  config: {
    systemInstruction: 'Return only valid HTML document starting with <!DOCTYPE html>'
  }
});

console.log(`Generated in ${Date.now() - t0}ms:`, res.text?.slice(0, 100));
