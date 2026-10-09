import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

const schemaWithBounds = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: ['open app', 'edit app', 'close app', 'set wallpaper']
    },
    title: { type: Type.STRING },
    width: { type: Type.INTEGER, description: 'Width 300 to 800' },
    height: { type: Type.INTEGER, description: 'Height 300 to 800' },
    html: { type: Type.STRING },
    target: { type: Type.STRING },
    css: { type: Type.STRING }
  },
  required: ['action']
};

console.log('Testing gemini-3.1-flash-lite with bounded schema...');
const t0 = Date.now();
try {
  const res = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: 'User command: "open a notepad"\nOpen windows: []',
    config: {
      systemInstruction: 'Respond with JSON. For open app, provide action, title, width, height, html.',
      responseMimeType: 'application/json',
      responseSchema: schemaWithBounds
    }
  });
  console.log(`Done in ${Date.now() - t0}ms:`, res.text);
} catch (e) {
  console.log('Error:', e.message);
}
