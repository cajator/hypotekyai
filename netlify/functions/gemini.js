// Netlify Serverless Function - Gemini AI Integration
// Path: netlify/functions/gemini.js

// Cache pro opakující se dotazy
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minut

export default async (request, context) => {
    // CORS headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    // Only allow POST
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ 
            error: 'Method not allowed' 
        }), { 
            status: 405, 
            headers 
        });
    }

    try {
        // Parse request body
        const { message, context: userContext } = await request.json();

        // Validate input
        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ 
                error: 'Invalid message' 
            }), { 
                status: 400, 
                headers 
            });
        }

        // Check cache
        const cacheKey = `${message}_${JSON.stringify(userContext)}`;
        const cached = responseCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return new Response(JSON.stringify(cached.data), { 
                status: 200, 
                headers 
            });
        }

        // Get API key
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

        // Prepare system prompt
        const systemPrompt = createSystemPrompt(userContext);
        
        // Call Gemini API
        const apiResponse = await callGeminiAPI(apiKey, message, systemPrompt);
        
        // Parse and validate response
        const result = parseGeminiResponse(apiResponse);
        
        // Cache successful response
        responseCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });
        
        // Clean old cache entries
        cleanCache();
        
        return new Response(JSON.stringify(result), { 
            status: 200, 
            headers 
        });

    } catch (error) {
        console.error('Gemini API error:', error);
        
        // Return fallback response
        return new Response(JSON.stringify({
            response: getFallbackResponse(request.message),
            fallback: true,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }), { 
            status: 200, 
            headers 
        });
    }
};

/**
 * Create system prompt based on context
 */
function createSystemPrompt(context) {
    const hasCalculation = context && Object.keys(context).length > 0;
    
    return `Jsi profesionální hypoteční poradce pro český trh.

AKTUÁLNÍ KONTEXT:
${hasCalculation ? JSON.stringify(context, null, 2) : 'Žádný výpočet'}

PRAVIDLA:
1. Odpovídej stručně a věcně v češtině
2. Používej aktuální sazby bank (4.09% - 5.49% pro 5letou fixaci)
3. Při výpočtech zohledni DSTI limit 50% a LTV do 90%
4. Pokud nemáš dost informací, požádej o doplnění
5. Vždy buď profesionální ale přátelský

DŮLEŽITÉ INFORMACE:
- Minimální výše hypotéky: 300 000 Kč
- Maximální výše: 20 000 000 Kč
- Standardní doba splatnosti: 20-30 let
- Poplatek za vyřízení: 0-0.5% z úvěru
- Odhad nemovitosti: 3000-5000 Kč

Odpověz na dotaz uživatele s ohledem na kontext.`;
}

/**
 * Call Gemini API with retry logic
 */
async function callGeminiAPI(apiKey, message, systemPrompt, retries = 3) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{
            parts: [{
                text: `${systemPrompt}\n\nUživatel: ${message}\n\nOdpověz:`
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10000) // 10s timeout
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error(`Gemini API attempt ${i + 1} failed:`, error.message);
            
            if (i === retries - 1) {
                throw error;
            }
            
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
}

/**
 * Parse and validate Gemini response
 */
function parseGeminiResponse(apiResponse) {
    try {
        // Extract text from Gemini response
        const text = apiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!text) {
            throw new Error('Empty response from Gemini');
        }
        
        // Clean and return
        return {
            response: text.trim(),
            success: true
        };
        
    } catch (error) {
        console.error('Failed to parse Gemini response:', error);
        throw error;
    }
}

/**
 * Get fallback response for common queries
 */
function getFallbackResponse(message) {
    const msg = message.toLowerCase();
    
    // Sazby
    if (msg.includes('sazb') || msg.includes('úrok')) {
        return `Aktuální úrokové sazby hypoték:
• 3 roky: 4.29% - 4.79%
• 5 let: 4.09% - 4.59%
• 7 let: 4.19% - 4.69%
• 10 let: 4.39% - 4.89%

Konkrétní sazba závisí na vaší bonitě, výši úvěru a LTV.`;
    }
    
    // Kolik si můžu půjčit
    if (msg.includes('kolik') && (msg.includes('půjč') || msg.includes('dost'))) {
        return `Maximální výše hypotéky závisí na:
• Čistém měsíčním příjmu (max. 50% na splátky)
• Hodnotě nemovitosti (až 90% LTV)
• Věku a době splatnosti
• Dalších závazcích

Pro přesný výpočet vyplňte naši kalkulačku.`;
    }
    
    // Refinancování
    if (msg.includes('refinanc')) {
        return `Refinancování se vyplatí když:
• Současná sazba je o 0.5% a více vyšší
• Do konce fixace zbývá max. 6 měsíců
• Chcete změnit parametry úvěru

Ušetřit můžete tisíce korun měsíčně!`;
    }
    
    // DSTI
    if (msg.includes('dsti') || msg.includes('bonit')) {
        return `DSTI (poměr splátek k příjmu):
• Do 40% - výborná bonita
• 40-45% - dobrá bonita
• 45-50% - hraniční
• Nad 50% - problematické

Banky mají limit 50% DSTI.`;
    }
    
    // Default
    return `Pro zodpovězení vašeho dotazu potřebuji více informací. 
Můžete mi prosím upřesnit váš dotaz nebo vyplnit kalkulačku pro přesný výpočet?`;
}

/**
 * Clean old cache entries
 */
function cleanCache() {
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            responseCache.delete(key);
        }
    }
}

// Health check endpoint
export const health = async (request, context) => {
    return new Response(JSON.stringify({ 
        status: 'ok',
        timestamp: new Date().toISOString()
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};