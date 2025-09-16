// This file would handle secure calls to the Gemini API.
// It's a serverless function that runs on Netlify.

exports.handler = async function(event, context) {
    // We only accept POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { userQuery, state, aiConversationState } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY; // Securely access the API key

        if (!apiKey) {
            throw new Error('API key is not configured.');
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        // The system prompt is the "brain" of our AI assistant
        const systemPrompt = `Jsi FinanceAI, hypoteční expert v ČR. Tvým úkolem je striktně a přesně vést uživatele kalkulací hypotéky.
- PRAVIDLO 1: NIKDY si nevymýšlej žádná data ani hodnoty. Pokud uživatel řekne "Spočítat hypotéku", neber data z kalkulačky, ale ZAČNI SE PTÁT OD ZAČÁTKU na záměr.
- PRAVIDLO 2: NEPTEJ se na detaily výdajů. Ptej se pouze na jednu souhrnnou částku pro 'měsíční splátky jiných úvěrů'.
- Sleduj pečlivě 'conversationStep'. Ptej se na jednu věc po druhé. Neopakuj otázky.
- Než zobrazíš finální výsledek (krok 'performCalculation'), MUSÍŠ nejprve projít krokem 'awaiting_confirmation'. V tomto kroku shrň VŠECHNY zadané údaje a zeptej se, zda jsou v pořádku. Nabídni tlačítka "Ano, spočítat" a "Ne, chci něco změnit".
- Když je 'conversationStep' nastaven na 'calculation_done' a uživatel napíše 'počítej'/'výsledek', NEZAČÍNEJ ZNOVU. Jen potvrď, že máš všechna data a že výsledek zobrazíš. V JSONu nastav "performCalculation": true. Po zobrazení výsledku nabídni ["Změnit parametry", "Začít znovu", "Spojit se specialistou"].
- Vždy nabízej návrhy odpovědí v poli 'suggestions'. Např. u záměru nabídni ["Koupě", "Výstavba", "Refinancování"]. U výdajů nabídni ["0 Kč", "3 000 Kč", "5 000 Kč", "10 000 Kč", "20 000 Kč"].
- Tvoje odpověď MUSÍ být JSON: { "responseText": string, "suggestions": string[], "updateState": object, "conversationStep": string, "performCalculation": boolean }`;

        const fullQuery = `Uživatel napsal: "${userQuery}". Aktuální stav kalkulace: ${JSON.stringify(state)}. Stav konverzace: ${JSON.stringify(aiConversationState)}. Odpověz v požadovaném JSON formátu.`;

        const payload = {
            contents: [{ parts: [{ text: fullQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error('Gemini API response not OK:', await response.text());
            throw new Error(`Gemini API error! status: ${response.status}`);
        }

        const result = await response.json();
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: responseText,
        };

    } catch (error) {
        console.error('Error in Gemini function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                responseText: "Omlouvám se, došlo k technické chybě na našem serveru. Zkuste to prosím znovu později.",
                suggestions: ["Zkusit znovu"],
                conversationStep: "start"
            }),
        };
    }
};

