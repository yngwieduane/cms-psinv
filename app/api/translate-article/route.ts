import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { title, h2, h3, content, targetLanguages } = await request.json();

    if (!targetLanguages || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      return NextResponse.json({ error: 'Target languages are required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Assuming targetLanguages is an array of objects like { code: "ar", name: "Arabic" }
    const languagesString = targetLanguages.map((l: any) => `${l.name} (${l.code})`).join(', ');

    const systemInstruction = `You are an expert translator specializing in real estate localized content. 
You will be provided with English content (title, h2, h3, and HTML content).
Your task is to translate ALL of these fields into the following languages: ${languagesString}.
CRITICAL REQUIREMENTS:
1. For the "content" field, it contains HTML. You MUST preserve the exact HTML structure, tags, classes, and attributes. Only translate the text nodes within the HTML.
2. Return a JSON object where the keys are the language codes (e.g., "ar", "zh") and the values are objects containing the translated "title", "h2", "h3", and "content".
3. Do not include any english explanations.`;

    const promptText = JSON.stringify({ title, h2, h3, content }, null, 2);

    const propertiesSchema: any = {};
    for (const lang of targetLanguages) {
        propertiesSchema[lang.code] = {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING' },
                h2: { type: 'STRING' },
                h3: { type: 'STRING' },
                content: { type: 'STRING' }
            },
            required: ['title', 'content']
        };
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'OBJECT',
                properties: propertiesSchema,
                required: targetLanguages.map((l: any) => l.code)
            }
        }
    });

    const jsonText = response.text;
    
    if (!jsonText) {
        return NextResponse.json({ error: 'Failed to generate translations' }, { status: 500 });
    }
    
    const parsedData = JSON.parse(jsonText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error translating content:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
