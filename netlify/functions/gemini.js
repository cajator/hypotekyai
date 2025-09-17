// Opravená Netlify serverless funkce pro Gemini API
// netlify/functions/gemini.js

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { userMessage, state, aiConversationState } = JSON.parse(event.body);
        
        // Check for API key
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        
        if (!apiKey) {
            console.log('API key not found, using intelligent fallback');
            // Use intelligent fallback instead of error
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(generateIntelligentResponse(userMessage, state))
            };
        }

        // Try Gemini API with better error handling
        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: buildPrompt(userMessage, state, aiConversationState)
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500
                    }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('Gemini API error:', error);
                throw new Error('API call failed');
            }

            const result = await response.json();
            const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            // Parse response or use fallback
            try {
                const parsed = JSON.parse(aiText);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(parsed)
                };
            } catch {
                // If not JSON, wrap in response object
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        responseText: aiText || "Jak vám mohu pomoci s hypotékou?",
                        suggestions: getContextualSuggestions(state),
                        performCalculation: shouldCalculate(state),
                        showFreeConsultation: true
                    })
                };
            }
            
        } catch (apiError) {
            console.error('API Error:', apiError);
            // Fallback to intelligent response
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(generateIntelligentResponse(userMessage, state))
            };
        }
        
    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                responseText: "Omlouvám se, nastala technická chyba. Můžete použít kalkulačku nebo mě kontaktovat přímo na telefonu 800 123 456.",
                suggestions: ["Použít kalkulačku", "Zavolat specialistu", "Zkusit znovu"],
                performCalculation: false,
                showFreeConsultation: true
            })
        };
    }
};

// Helper functions
function buildPrompt(userMessage, state, conversationState) {
    return `Jsi hypoteční specialista v ČR. Aktuální data klienta: ${JSON.stringify(state)}.
    
Uživatel řekl: "${userMessage}"

Odpověz stručně a užitečně. Pokud máš všechna data (záměr, cena, vlastní zdroje, příjem), 
nastav performCalculation: true. Odpověz jako JSON:
{
    "responseText": "tvoje odpověď",
    "suggestions": ["návrh 1", "návrh 2", "návrh 3"],
    "updateState": null nebo objekt s daty,
    "performCalculation": true/false,
    "showFreeConsultation": true/false
}`;
}

function generateIntelligentResponse(userMessage, state) {
    const message = userMessage.toLowerCase();
    
    // Analyze message intent
    if (message.includes('ahoj') || message.includes('dobrý den')) {
        return {
            responseText: "Dobrý den! Jsem váš hypoteční poradce. Pomohu vám najít nejlepší hypotéku z 23 bank. Co vás zajímá?",
            suggestions: ["Chci koupit byt", "Refinancování", "Aktuální sazby"],
            performCalculation: false,
            showFreeConsultation: true
        };
    }
    
    if (message.includes('sazb') || message.includes('úrok')) {
        return {
            responseText: `Aktuální úrokové sazby (listopad 2024):
            
📊 LTV do 80%: od 3.99% (5 let fixace)
📊 LTV do 90%: od 4.49% (5 let fixace)

Přesnou sazbu určuje vaše bonita a parametry úvěru. Chcete spočítat vaši konkrétní nabídku?`,
            suggestions: ["Spočítat hypotéku", "Více o sazbách", "Konzultace zdarma"],
            performCalculation: false,
            showFreeConsultation: true
        };
    }
    
    // Check if we have enough data
    const hasData = state.propertyValue > 0 && state.ownResources > 0 && state.monthlyIncome > 0;
    
    if (hasData) {
        return {
            responseText: "Výborně! Mám všechny údaje pro výpočet. Zobrazuji vaši personalizovanou nabídku:",
            suggestions: ["Změnit parametry", "Kontakt na specialistu", "Více informací"],
            performCalculation: true,
            showFreeConsultation: true
        };
    }
    
    // Progressive data collection
    if (!state.intent) {
        return {
            responseText: "Pro přesný výpočet potřebuji vědět, co plánujete:",
            suggestions: ["Koupit nemovitost", "Refinancovat", "Stavět dům"],
            performCalculation: false
        };
    }
    
    if (!state.propertyValue || state.propertyValue === 0) {
        return {
            responseText: "Jaká je cena nemovitosti, kterou zvažujete?",
            suggestions: ["3 miliony", "5 milionů", "8 milionů"],
            performCalculation: false
        };
    }
    
    if (!state.ownResources || state.ownResources === 0) {
        return {
            responseText: "Kolik máte vlastních prostředků?",
            suggestions: ["20% z ceny", "1 milion", "2 miliony"],
            performCalculation: false
        };
    }
    
    if (!state.monthlyIncome || state.monthlyIncome === 0) {
        return {
            responseText: "Jaký je váš čistý měsíční příjem?",
            suggestions: ["50 tisíc", "75 tisíc", "100 tisíc"],
            performCalculation: false
        };
    }
    
    return {
        responseText: "Jak vám mohu pomoci s hypotékou? Nabízíme konzultaci ZDARMA se specialistou.",
        suggestions: ["Spočítat hypotéku", "Aktuální sazby", "Konzultace zdarma"],
        performCalculation: false,
        showFreeConsultation: true
    };
}

function getContextualSuggestions(state) {
    if (!state.intent) return ["Koupit byt", "Refinancovat", "Postavit dům"];
    if (!state.propertyValue) return ["3 miliony", "5 milionů", "8 milionů"];
    if (!state.ownResources) return ["20% z ceny", "1 milion", "2 miliony"];
    if (!state.monthlyIncome) return ["50 tisíc", "75 tisíc", "100 tisíc"];
    return ["Zobrazit výpočet", "Změnit údaje", "Konzultace zdarma"];
}

function shouldCalculate(state) {
    return !!(state.intent && state.propertyValue > 0 && 
             state.ownResources > 0 && state.monthlyIncome > 0);
}