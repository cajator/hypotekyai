// Netlify Serverless Function - Gemini AI Integration
// Path: netlify/functions/gemini.js
// Version 2.0 - Using official SDK and modern syntax

import { GoogleGenerativeAI } from "@google/generative-ai";

// Cache pro opakující se dotazy
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minut

const handler = async (event) => {
    // Povolit CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle pre-flight request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers
        };
    }

    // Povolit pouze metodu POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
            headers
        };
    }

    try {
        const { message, context: userContext } = JSON.parse(event.body);

        if (!message || typeof message !== 'string') {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid message' }), headers };
        }

        // Kontrola cache
        const cacheKey = JSON.stringify({ message, userContext });
        const cached = responseCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            return { statusCode: 200, body: JSON.stringify(cached.data), headers };
        }

        // Získání API klíče z proměnných prostředí Netlify
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('Missing GEMINI_API_KEY');
            return { statusCode: 500, body: JSON.stringify({ error: 'AI service is not configured.' }), headers };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = createSystemPrompt(userContext);
        const fullPrompt = `${systemPrompt}\n\nUživatel: ${message}`;

        const result = await model.generateContent(fullPrompt);
        const responseText = result.response.text();
        
        const responsePayload = { response: responseText.trim() };

        // Uložení do cache
        responseCache.set(cacheKey, { data: responsePayload, timestamp: Date.now() });
        cleanCache();
        
        return {
            statusCode: 200,
            body: JSON.stringify(responsePayload),
            headers
        };

    } catch (error) {
        console.error('Gemini API error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An error occurred while communicating with the AI service.' }),
            headers
        };
    }
};

function createSystemPrompt(context) {
    const hasCalculation = context && Object.keys(context).length > 0 && context.loanAmount > 0;
    
    return `Jsi profesionální, přátelský a nápomocný hypoteční poradce pro český trh s názvem "Hypotéka AI".

    PRAVIDLA:
    1. Odpovídej stručně, jasně a věcně v češtině. Formátuj odpovědi pro lepší čitelnost (odrážky, tučné písmo).
    2. Vždy se drž tématu hypoték a financování bydlení.
    3. Pokud znáš kontext od uživatele, aktivně ho využij ve své odpovědi.
    4. Pokud nemáš dost informací, doptávej se.
    5. Nikdy si nevymýšlej konkrétní čísla, pokud nejsou v kontextu. Mluv v obecných rovinách nebo rozmezích.
    
    AKTUÁLNÍ KONTEXT OD UŽIVATELE (z kalkulačky):
    ${hasCalculation ? JSON.stringify(context, null, 2) : 'Uživatel zatím nic nezadal do kalkulačky.'}
    
    Odpověz na dotaz uživatele.`;
}

function cleanCache() {
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            responseCache.delete(key);
        }
    }
}

export { handler };
