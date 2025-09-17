// Hypotéka AI - Netlify Serverless Function v5.0 (Production Ready)
// Securely communicates with Gemini API and returns structured data.

async function callGeminiAPI(apiKey, systemPrompt, conversation) {
    // Use the latest, most capable model available
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const history = conversation.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const currentUserMessage = history.pop();
    if (!currentUserMessage || currentUserMessage.role !== 'user') {
        throw new Error('The last message in the conversation must be from the user.');
    }

    const payload = {
        contents: [...history, currentUserMessage],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.5, // Lower temperature for more deterministic and reliable JSON output
        }
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Gemini API Error Response:", errorBody);
        throw new Error(`Gemini API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        console.error("Invalid response structure from Gemini API:", JSON.stringify(data, null, 2));
        throw new Error('Invalid or empty response structure from Gemini API');
    }
    
    // Attempt to parse the JSON, which might be wrapped in markdown
    try {
        // Clean potential markdown code block fences
        const cleanedText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error("Failed to parse JSON from Gemini response:", text);
        throw new Error("AI returned a malformed response.");
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*', // IMPORTANT: In a real production environment, restrict this to your actual domain.
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    try {
        const { userMessage, state, conversation } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('FATAL: GEMINI_API_KEY environment variable not set.');
            throw new Error('Server configuration error.');
        }
        
        const systemPrompt = `Jsi "Hypotéka AI", přátelský a profesionální hypoteční specialista v České republice. Tvým úkolem je od uživatele postupně a konverzačně získat 4 klíčové informace: 1. záměr (intent), 2. cena nemovitosti (propertyPrice), 3. vlastní zdroje (ownResources), 4. čistý měsíční příjem (monthlyIncome). Vždy se ptej jen na jednu věc. Buď stručný. Vždy odpovídej POUZE ve formátu JSON podle této striktní struktury:
        {
          "responseText": "Tvoje textová odpověď pro uživatele v češtině.",
          "suggestions": ["Návrh 1", "Návrh 2", "Návrh 3"],
          "updateState": null | {"propertyPrice": 5000000, "intent": "koupe", ...},
          "performCalculation": false
        }
        - "responseText": Milá a srozumitelná odpověď. Pokud uživatel poskytne údaj, zopakuj ho pro potvrzení (např. "Rozumím, cena nemovitosti 5 000 000 Kč. A kolik máte vlastních zdrojů?").
        - "suggestions": Vždy poskytni 3 krátké a relevantní návrhy jako další krok.
        - "updateState": Analyzuj POSLEDNÍ zprávu od uživatele. Pokud z ní lze JEDNOZNAČNĚ odvodit číselnou hodnotu nebo záměr, vlož ji sem. Např. z "chci byt za 5 mega" extrahuj {"propertyPrice": 5000000, "intent": "koupe"}. Buď v extrakci konzervativní. Pokud si nejsi jistý, vrať null.
        - "performCalculation": Nastav na 'true' POUZE pokud jsi právě obdržel POSLEDNÍ chybějící údaj a nyní jsou všechny 4 informace kompletní. Jinak VŽDY 'false'.
        
        Aktuální stav od klienta: ${JSON.stringify(state)}. Analyzuj ho a ptej se na první chybějící údaj.`;

        const fullConversation = [...(conversation || []), { sender: 'user', text: userMessage }];
        const result = await callGeminiAPI(apiKey, systemPrompt, fullConversation);
        
        return { statusCode: 200, headers, body: JSON.stringify(result) };

    } catch (error) {
        console.error('Error in serverless function:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                responseText: "Omlouvám se, nastala technická chyba. Zkuste to prosím za chvíli znovu, nebo použijte naši kalkulačku.",
                suggestions: ["Zkusit znovu", "Přejít na kalkulačku"],
                updateState: null,
                performCalculation: false
            })
        };
    }
};

