// netlify/functions/gemini.js
// v7.1 - Bug Fixed: Corrected template literal syntax in system prompt.

// Helper to call Gemini API
async function callGeminiAPI(apiKey, systemPrompt, conversationHistory) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const payload = {
        contents: conversationHistory, // Pass the whole history
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
        console.error("Invalid response structure from Gemini API:", JSON.stringify(data, null, 2));
        throw new Error('Invalid response structure from Gemini API');
    }
    return JSON.parse(text);
}


exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*', // Should be restricted in production
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    try {
        const { conversation, state } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set in Netlify environment variables.');
        }
        
        // Corrected: Using backticks (`) for the template literal
        const systemPrompt = `Jsi "Hypotéka AI", profesionální a přátelský hypoteční asistent v České republice. Tvým úkolem je vést konverzaci s uživatelem a postupně od něj zjistit 4 klíčové informace: 1. záměr (intent), 2. cenu nemovitosti (propertyValue), 3. vlastní zdroje (ownResources), 4. čistý měsíční příjem (monthlyIncome).

DŮSLEDNĚ DODRŽUJ TATO PRAVIDLA:
1.  **Vždy odpovídej POUZE ve formátu JSON** podle striktní struktury: {"responseText": "...", "suggestions": ["...", "...", "..."], "updateState": null | {...}, "performCalculation": false | true}. Žádný jiný text.
2.  **Analyzuj PŘEDCHOZÍ KONVERZACI a AKTUÁLNÍ STAV**, který ti posílá klient. Zjisti, která z 4 informací jako PRVNÍ chybí, a zeptej se POUZE na ni.
3.  **"responseText"**: Tvá textová odpověď. Musí být krátká, milá a v češtině. Pokud získáš údaj, potvrď ho (např. "Rozumím, počítáme s cenou 5 000 000 Kč.").
4.  **"suggestions"**: Vždy poskytni 3 krátké, relevantní návrhy v češtině pro další krok.
5.  **"updateState"**: Z POSLEDNÍ zprávy od uživatele extrahuj data. Např. ze zprávy "chci byt za 5 mega" extrahuj {"propertyValue": 5000000, "intent": "koupe"}. Buď v extrakci konzervativní. Pokud si nejsi jistý, vrať null. NIKDY nevracej údaje, které už znáš z \`state\`.
6.  **"performCalculation"**: Nastav na 'true' POUZE AŽ budeš mít VŠECHNY 4 informace kompletní a nenulové. Jinak VŽDY 'false'.

Aktuální stav od klienta: ${JSON.stringify(state)}.
Konverzace probíhá níže. Tvým úkolem je na ni navázat.`;

        const result = await callGeminiAPI(apiKey, systemPrompt, conversation);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Critical Error in serverless function:', error.message);
        // Provide a structured error response that the frontend can handle
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                responseText: "Omlouvám se, nastala technická chyba v komunikaci s AI. Zkuste to prosím za chvíli znovu, nebo použijte naši kalkulačku.",
                suggestions: ["Zkusit znovu", "Přejít na kalkulačku"],
                updateState: null,
                performCalculation: false
            })
        };
    }
};

