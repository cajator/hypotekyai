// netlify/functions/gemini.js
// Robustní serverless funkce s inteligentní fallback logikou

// Helper function to call the Gemini API
async function callGeminiAPI(apiKey, systemPrompt, conversationHistory) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const contents = conversationHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const payload = {
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.5,
        }
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Gemini API Error:", errorBody);
        throw new Error(`Gemini API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error('Invalid response structure from Gemini API');
    }
    return JSON.parse(text);
}


// Fallback logic for when API call fails or key is missing
function generateFallbackResponse(state, userMessage) {
    const msg = userMessage.toLowerCase();
    
    // Simple intent detection
    if (msg.includes('koup') || msg.includes('byt') || msg.includes('dům')) state.intent = 'koupe';
    if (msg.includes('refinanc')) state.intent = 'refinancovani';
    if (msg.includes('stavět') || msg.includes('vystavba')) state.intent = 'vystavba';
    
    // Ask for the first missing piece of information
    if (!state.intent) {
        return {
            responseText: "Dobrý den! Co plánujete? Chcete koupit nemovitost, stavět, nebo refinancovat?",
            suggestions: ["Koupit byt", "Postavit dům", "Refinancovat hypotéku"],
            updateState: null,
            performCalculation: false
        };
    }
    if (!state.propertyValue) {
        return {
            responseText: `Rozumím, plánujete ${state.intent}. Jaká je přibližná hodnota nemovitosti?`,
            suggestions: ["3 000 000 Kč", "5 000 000 Kč", "8 000 000 Kč"],
            updateState: { intent: state.intent },
            performCalculation: false
        };
    }
     if (!state.ownResources) {
        return {
            responseText: `Dobře, počítáme s hodnotou ${state.propertyValue.toLocaleString('cs-CZ')} Kč. Kolik máte vlastních prostředků?`,
            suggestions: ["20% z ceny", "1 000 000 Kč", "Nic, chci 100% hypotéku"],
            updateState: { propertyValue: state.propertyValue },
            performCalculation: false
        };
    }
    if (!state.monthlyIncome) {
        return {
            responseText: `Chápu. A jaký je váš přibližný čistý měsíční příjem?`,
            suggestions: ["50 000 Kč", "70 000 Kč", "100 000 Kč"],
             updateState: { ownResources: state.ownResources },
            performCalculation: false
        };
    }

    // If all data is present
    return {
        responseText: "Mám všechny potřebné informace. Chcete, abych provedl výpočet a zobrazil vám nabídky?",
        suggestions: ["Ano, spočítat", "Změnit údaje", "Chci mluvit s člověkem"],
        updateState: { monthlyIncome: state.monthlyIncome },
        performCalculation: true
    };
}


exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*', // Adjust for production
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    try {
        const { userMessage, state, aiConversationState } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        // If no API key, use fallback
        if (!apiKey) {
            console.warn('GEMINI_API_KEY not found. Using fallback logic.');
            const fallbackResponse = generateFallbackResponse(state, userMessage);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(fallbackResponse)
            };
        }
        
        const systemPrompt = `Jsi "Hypotéka AI", přátelský a profesionální hypoteční specialista v ČR. Tvým cílem je postupně a konverzačně od uživatele získat 4 klíčové informace: 1. záměr (intent), 2. cena nemovitosti (propertyValue), 3. vlastní zdroje (ownResources), 4. čistý měsíční příjem (monthlyIncome). Komunikuj stručně, mile a lidsky. Vždy se ptej jen na jednu věc. Důsledně dodržuj formát JSON.
        
        Pravidla:
        - Vždy odpovídej POUZE ve formátu JSON: {"responseText": "...", "suggestions": ["...", "...", "..."], "updateState": null | {...}, "performCalculation": false | true}.
        - "responseText": Milá odpověď. Potvrď přijatý údaj (např. "Rozumím, cena nemovitosti 5 000 000 Kč.").
        - "suggestions": Vždy poskytni 3 krátké relevantní návrhy.
        - "updateState": Z poslední zprávy uživatele extrahuj data. Např. z "chci byt za 5 mega" extrahuj {"propertyValue": 5000000, "intent": "koupe"}. Buď konzervativní. Pokud si nejsi jistý, vrať null.
        - "performCalculation": Nastav na 'true' POUZE AŽ máš VŠECHNY 4 informace. Jinak VŽDY 'false'.
        
        Aktuální stav od klienta: ${JSON.stringify(state)}. Analyzuj ho a ptej se na první chybějící údaj.`;

        const result = await callGeminiAPI(apiKey, systemPrompt, [...aiConversationState, { sender: 'user', text: userMessage }]);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Error in serverless function:', error);
        // On API error, also use fallback
        try {
            const { userMessage, state } = JSON.parse(event.body);
            const fallbackResponse = generateFallbackResponse(state, userMessage);
             return {
                statusCode: 200, // Return 200 so the client can handle the fallback gracefully
                headers,
                body: JSON.stringify(fallbackResponse)
            };
        } catch (fallbackError) {
             return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ responseText: "Omlouvám se, nastala kritická chyba.", suggestions: [], updateState: null, performCalculation: false })
            };
        }
    }
};

