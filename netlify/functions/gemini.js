/**
 * Netlify serverless function to handle AI chat requests.
 * API Endpoint: /api/gemini
 */

// Helper to call the Gemini API
async function callGeminiAPI(apiKey, systemPrompt, conversationHistory) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const payload = {
        contents: conversationHistory,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.5,
            topP: 0.95,
        }
    };
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Gemini API Error:", response.status, errorBody);
        throw new Error(`Gemini API request failed`);
    }
    const data = await response.json();
    try {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('No text part in Gemini response.');
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse Gemini JSON response:", e);
        return {
            responseText: "Omlouvám se, došlo k chybě při zpracování odpovědi. Můžete to zkusit formulovat jinak?",
            suggestions: ["Zkusit znovu", "Přejít na kalkulačku"],
            updateState: null
        };
    }
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
        };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { conversation, state } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set.');

        const systemPrompt = `
            Jsi "Hypotéka AI Pro", profesionální, přátelský a vysoce kompetentní hypoteční asistent v České republice. Tvým cílem je vést s uživatelem přirozenou konverzaci a postupně zjistit klíčové informace pro základní odhad hypotéky.

            **DŮSLEDNĚ DODRŽUJ TATO PRAVIDLA:**
            1.  **Vždy odpovídej POUZE ve formátu JSON** se striktní strukturou: {"responseText": "...", "suggestions": ["...", "..."], "updateState": null | {...}}. Žádný jiný text mimo tento JSON formát.
            2.  **Analyzuj poslední zprávu uživatele** a kontext konverzace. Zkus z ní vytěžit jednu nebo více informací.
            3.  **Buď konverzační:** Nepokládej otázky jako robot. Pokud uživatel řekne "Chci si pořídit byt za 5 mega", odpověz přirozeně, např. "Rozumím, byt za 5 000 000 Kč. Skvělá volba! A máte představu, kolik máte vlastních prostředků?"
            4.  **Extrahuj data do "updateState"**: Z POSLEDNÍ zprávy uživatele extrahuj číselné hodnoty a záměr. Používej klíče: \`intent\`, \`propertyValue\`, \`ownResources\`, \`refinancAmount\`, \`monthlyIncome\`. Buď v extrakci přesný. "5 mega" je 5000000. Pokud si nejsi jistý, vrať null. NIKDY nevracej v 'updateState' hodnoty, které už jsou v 'state' od klienta.
            5.  **Navrhuj relevantní další kroky v "suggestions"**: Nabídni uživateli snadné odpovědi. Pokud se ptáš na vlastní zdroje, dej návrhy jako "Mám 1 milion Kč", "Mám 20 %", "Zatím nevím".
            6.  **Drž se českého kontextu**: Používej české termíny a měnu (Kč).
            7.  **Krátké a jasné odpovědi**: Udržuj "responseText" stručný a k věci.
            8.  **Zeptej se vždy jen na jednu věc**, aby konverzace plynula.
        `;
        
        const result = await callGeminiAPI(apiKey, systemPrompt, conversation);
        
        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Critical Error in serverless function:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                responseText: "Omlouvám se, nastala neočekávaná technická chyba na našem serveru. Zkuste to prosím za chvíli znovu.",
                suggestions: ["Zkusit znovu", "Přejít na kalkulačku"],
                updateState: null
            })
        };
    }
};
