### **7️⃣ gemini.js (v netlify/functions/)**
```javascript
// Netlify Function - Gemini AI Integration
// Path: netlify/functions/gemini.js

const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export default async (request, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ 
            error: 'Method not allowed' 
        }), { 
            status: 405, 
            headers 
        });
    }

    try {
        const { message, context: userContext } = await request.json();

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ 
                error: 'Invalid message' 
            }), { 
                status: 400, 
                headers 
            });
        }

        const cacheKey = `${message}_${JSON.stringify(userContext)}`;
        const cached = responseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return new Response(JSON.stringify(cached.data), { 
                status: 200, 
                headers 
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('Missing GEMINI_API_KEY');
            return new Response(JSON.stringify({ 
                response: 'AI služba není momentálně dostupná. Použijte prosím kalkulačku.',
                fallback: true
            }), { 
                status: 200, 
                headers 
            });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const systemPrompt = `Jsi profesionální hypoteční poradce pro český trh.
        
KONTEXT: ${userContext ? JSON.stringify(userContext) : 'Žádný'}

PRAVIDLA:
1. Odpovídej stručně a věcně v češtině
2. Používej aktuální sazby bank (4.09% - 5.49%)
3. Zohledni DSTI limit 50% a LTV do 90%
4. Buď profesionální ale přátelský`;

        const payload = {
            contents: [{
                parts: [{
                    text: `${systemPrompt}\n\nUživatel: ${message}\n\nOdpověď:`
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            throw new Error(`API error: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        const result = {
            response: text.trim() || 'Omlouvám se, nedokážu nyní odpovědět. Zkuste to prosím znovu.',
            success: true
        };

        responseCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });
        
        return new Response(JSON.stringify(result), { 
            status: 200, 
            headers 
        });

    } catch (error) {
        console.error('Gemini API error:', error);
        
        return new Response(JSON.stringify({
            response: 'Omlouvám se, došlo k chybě. Použijte prosím kalkulačku nebo zkuste znovu později.',
            fallback: true
        }), { 
            status: 200, 
            headers 
        });
    }
};