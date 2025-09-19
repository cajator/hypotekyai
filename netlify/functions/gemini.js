// Netlify Serverless Function - Gemini AI Integration
// Path: netlify/functions/gemini.js
// Version 3.0 - Using official SDK
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }), headers };
    }

    try {
        const { message, context: userContext } = JSON.parse(event.body);
        if (!message) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid message' }), headers };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'AI service is not configured.' }), headers };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = createSystemPrompt(userContext);
        const fullPrompt = `${systemPrompt}\n\nUživatel: ${message}`;

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();
        
        return {
            statusCode: 200,
            body: JSON.stringify({ response: responseText.trim() }),
            headers
        };

    } catch (error) {
        console.error('Gemini API error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Error communicating with AI service.' }), headers };
    }
};

function createSystemPrompt(context) {
    const hasContext = context && context.loanAmount > 0;
    return `Jsi profesionální a přátelský hypoteční poradce "Hypotéka AI" pro český trh.
    PRAVIDLA: Odpovídej stručně a jasně v češtině. Využij kontext od uživatele, pokud existuje.
    AKTUÁLNÍ KONTEXT z kalkulačky:
    ${hasContext ? JSON.stringify(context, null, 2) : 'Uživatel zatím nic nezadal.'}
    Odpověz na dotaz uživatele.`;
}

export { handler };

