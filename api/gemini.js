// This file acts as a secure backend function on Netlify.
// It receives the user's message, adds the secret API key,
// and then communicates with the Google Gemini API.

export default async (req, context) => {
    try {
        const { userMessage, state, aiConversationState } = await req.json();

        // Get the secret API key from Netlify's environment variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ 
                responseText: "Omlouvám se, AI Poradce není správně nakonfigurován. Chybí API klíč.",
                suggestions: [],
                conversationStep: 'start',
                performCalculation: false,
             }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const systemPrompt = `Jsi FinanceAI, hypoteční expert v ČR. Tvým úkolem je striktně a přesně vést uživatele kalkulací hypotéky.
- PRAVIDLO 1: NIKDY si nevymýšlej žádná data ani hodnoty. Pokud uživatel řekne "Spočítat hypotéku", neber data z kalkulačky, ale ZAČNI SE PTÁT OD ZAČÁTKU na záměr.
- PRAVIDLO 2: NEPTEJ se na detaily výdajů. Ptej se pouze na jednu souhrnnou částku pro 'měsíční splátky jiných úvěrů'.
- Sleduj pečlivě 'conversationStep'. Ptej se na jednu věc po druhé. Neopakuj otázky.
- Než zobrazíš finální výsledek (krok 'performCalculation'), MUSÍŠ nejprve projít krokem 'awaiting_confirmation'. V tomto kroku shrň VŠECHNY zadané údaje a zeptej se, zda jsou v pořádku. Nabídni tlačítka "Ano, spočítat" a "Ne, chci něco změnit".
- Když je 'conversationStep' nastaven na 'calculation_done' a uživatel napíše 'počítej'/'výsledek', NEZAČÍNEJ ZNOVU. Jen potvrď, že máš všechna data a že výsledek zobrazíš. V JSONu nastav "performCalculation": true. Po zobrazení výsledku nabídni ["Změnit parametry", "Začít znovu", "Spojit se specialistou"].
- Vždy nabízej návrhy odpovědí v poli 'suggestions'. Např. u záměru nabídni ["Koupě", "Výstavba", "Refinancování"]. U výdajů nabídni ["0 Kč", "3 000 Kč", "5 000 Kč", "10 000 Kč", "20 000 Kč"].
- Tvoje odpověď MUSÍ být JSON: { "responseText": string, "suggestions": string[], "updateState": object, "conversationStep": string, "performCalculation": boolean }`;
        
        const fullQuery = `Uživatel napsal: "${userMessage}". Aktuální stav kalkulace: ${JSON.stringify(state)}. Stav konverzace: ${JSON.stringify(aiConversationState)}. Odpověz v požadovaném JSON formátu.`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ parts: [{ text: fullQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" }
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error("Gemini API Error:", errorBody);
            return new Response(JSON.stringify({ 
                responseText: `Omlouvám se, došlo k chybě v komunikaci s AI službou (Stav: ${apiResponse.status}). Zkuste to prosím znovu.`,
                suggestions: [],
                conversationStep: 'start',
                performCalculation: false,
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await apiResponse.json();
        const rawResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        return new Response(rawResponseText, {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error in Netlify function:", error);
        return new Response(JSON.stringify({ 
             responseText: `Omlouvám se, nastala kritická chyba na serveru: ${error.message}. Zkuste to prosím později.`,
             suggestions: [],
             conversationStep: 'start',
             performCalculation: false,
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

