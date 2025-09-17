// Hypotéka AI - Netlify Serverless Function v2.0
// Zpracovává dotazy z frontendu, komunikuje s Gemini API a vrací strukturovaná data.

// Helper funkce pro generování inteligentní odpovědi bez API (fallback)
function generateSmartFallbackResponse(userMessage, state) {
    const message = userMessage.toLowerCase();

    // Progresivní dotazování na chybějící data
    if (!state.intent) {
        return {
            responseText: "Dobrý den! Jsem Váš AI hypoteční asistent. Co plánujete? Koupit, stavět, nebo refinancovat?",
            suggestions: ["Chci koupit byt", "Plánuji stavět", "Chci refinancovat"],
            updateState: null
        };
    }
    if (!state.propertyPrice || state.propertyPrice === 0) {
        return {
            responseText: `Rozumím, ${state.intent}. Jaká je přibližná cena nemovitosti?`,
            suggestions: ["3 000 000 Kč", "5 000 000 Kč", "8 000 000 Kč"],
            updateState: null
        };
    }
    if (!state.ownResources && state.ownResources !== 0) {
        return {
            responseText: `Dobře, počítám s cenou ${state.propertyPrice.toLocaleString('cs-CZ')} Kč. Kolik máte vlastních zdrojů?`,
            suggestions: ["10% z ceny", "20% z ceny", "1 000 000 Kč"],
            updateState: null
        };
    }
     if (!state.monthlyIncome || state.monthlyIncome === 0) {
        return {
            responseText: `Super. A jaký je Váš čistý měsíční příjem? To je poslední údaj, který potřebuji.`,
            suggestions: ["50 000 Kč", "70 000 Kč", "100 000 Kč"],
            updateState: null
        };
    }

    // Pokud máme všechna data, spustíme kalkulaci
    return {
        responseText: "Děkuji! Mám všechny potřebné informace. Přepínám do kalkulačky, kde vám ukážu 3 nejlepší nabídky na trhu.",
        suggestions: ["Zobrazit nabídky", "Změnit parametry"],
        performCalculation: true
    };
}


exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed', headers };
    }

    try {
        const { userMessage, state } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.log('API key for Gemini not found, using intelligent fallback response.');
            const fallbackResponse = generateSmartFallbackResponse(userMessage, state);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(fallbackResponse)
            };
        }
        
        // Zde by normálně následovala komunikace s Gemini API
        // Pro demonstrační účely použijeme stejnou fallback logiku,
        // jako by API nebylo dostupné. V reálném provozu by se zde
        // sestavil prompt a odeslal na API.

        console.log('Simulating Gemini API call with prompt for message:', userMessage);
        
        const systemPrompt = `Jsi "Hypotéka AI", přátelský a profesionální hypoteční specialista v ČR. Tvým cílem je od uživatele postupně získat všechny potřebné informace (záměr, cena nemovitosti, vlastní zdroje, měsíční příjem) a poté spustit kalkulaci. Komunikuj stručně. Vždy odpovídej pouze ve formátu JSON.
        
        Aktuální stav od klienta: ${JSON.stringify(state)}
        
        Pokud nějaký údaj chybí, zeptej se na něj. Pokud máš všechny údaje, potvrď to a nastav performCalculation na true. Analyzuj poslední zprávu od uživatele: "${userMessage}" a podle toho aktualizuj stav.`;

        // Simulace API volání - v reálném světě byste zde volali `fetch`
        // const response = await fetch(GEMINI_URL, { ... });
        // const data = await response.json();
        // const result = JSON.parse(data.candidates[0].content.parts[0].text);
        
        // Pro teď použijeme fallback
        const simulatedResult = generateSmartFallbackResponse(userMessage, state);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(simulatedResult)
        };


    } catch (error) {
        console.error('Error in serverless function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                responseText: "Omlouvám se, nastala technická chyba. Zkuste to prosím později.",
                suggestions: [],
            })
        };
    }
};
