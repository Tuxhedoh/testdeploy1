
import { GoogleGenAI, Type } from "@google/genai";
import { Suggestion } from "../types";

// Note: API key is automatically injected via process.env.API_KEY
// But we also check localStorage to allow user-provided keys for deployment.
const getAI = () => {
  const userKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
  return new GoogleGenAI({ apiKey: userKey || process.env.API_KEY || '' });
};

/**
 * Helper to extract mime type and base64 data from a data URL.
 */
function parseBase64Image(dataUrl: string) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    return { mimeType: matches[1], data: matches[2] };
  }
  // Fallback for raw base64 strings if any
  return { mimeType: 'image/jpeg', data: dataUrl };
}

/**
 * Suggests 5 funny captions based on the image content, including styling suggestions.
 */
export async function suggestCaptions(base64Image: string, tone: string = 'sarcastic'): Promise<Suggestion[]> {
  const ai = getAI();
  const { mimeType, data } = parseBase64Image(base64Image);

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: data,
          },
        },
        {
          text: `Analyze this image and suggest 5 pairs of hilarious, relevant meme captions (Top text and Bottom text) in a "${tone}" tone. Return ONLY a JSON array of objects with 'top' and 'bottom' properties.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            top: { type: Type.STRING },
            bottom: { type: Type.STRING },
          },
          required: ["top", "bottom"],
        },
      },
    },
  });

  try {
    const text = response.text || '[]';
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse AI response", error);
    return [];
  }
}

/**
 * Generates a brand new meme background from a prompt.
 */
export async function generateMemeBackground(prompt: string): Promise<string | null> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [
        {
          text: `Create a cinematic, meme-worthy, high-resolution background image based on this description: ${prompt}. Do not include any text in the image.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "4:3",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  return null;
}

/**
 * Performs image editing using text prompts.
 */
export async function editMemeImage(base64Image: string, prompt: string): Promise<string | null> {
  const ai = getAI();
  const { mimeType, data } = parseBase64Image(base64Image);

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [
        {
          inlineData: {
            data: data,
            mimeType: mimeType,
          },
        },
        {
          text: `Modify this image based on the following instruction: "${prompt}". Respond with ONLY the modified image.`,
        },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  return null;
}
