import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set in environment variables.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemInstruction = `You are an expert real estate blog content generator. 
Your task is to generate a blog post based on the user's prompt. 
You must respond with a JSON object containing three fields:
1. "title": A catchy and professional title for the blog post.
2. "summary": A short summary (1-2 sentences) of the blog post.
3. "contentHtml": The full content of the blog post formatted as HTML. Use appropriate heading tags (<h2>, <h3>), paragraphs (<p>), and lists (<ul>, <li>). Do not include the <h1> title in the HTML. Make the content engaging, informative, and well-structured.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'OBJECT',
                properties: {
                    title: { type: 'STRING' },
                    summary: { type: 'STRING' },
                    contentHtml: { type: 'STRING' }
                },
                required: ['title', 'summary', 'contentHtml']
            }
        }
    });

    const jsonText = response.text;
    
    if (!jsonText) {
        return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
    }
    
    const parsedData = JSON.parse(jsonText);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error generating blog content:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
