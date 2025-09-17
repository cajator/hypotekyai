// netlify/functions/gemini.js
// Opravená serverless funkce s fallback logikou

exports.handler = async (event, context) => {
    // CORS headers pro všechny requesty
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only accept POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { userMessage, state, aiConversationState } = JSON.parse(event.body);
        
        // Get API key from environment
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        
        if (!apiKey) {
            console.log('API key not found, using intelligent fallback');
            // Return intelligent response without API
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(generateSmartResponse(userMessage, state))
            };
        }

        // Try Gemini API
        try {
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
            
            const systemPrompt = createSystemPrompt(state, aiConversationState);
            const fullPrompt = `${systemPrompt}\n\nUživatel: ${userMessage}\n\nOdpověz jako JSON.`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: fullPrompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API error:', errorText);
                throw new Error('API call failed');
            }

            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            // Try to parse as JSON
            try {
                const parsed = JSON.parse(aiText.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(parsed)
                };
            } catch (parseError) {
                // If not JSON, create structured response
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        responseText: aiText || generateSmartResponse(userMessage, state).responseText,
                        suggestions: getContextualSuggestions(state),
                        performCalculation: shouldPerformCalculation(state),
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
                body: JSON.stringify(generateSmartResponse(userMessage, state))
            };
        }
        
    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                responseText: "Omlouvám se, nastala chyba. Zkuste prosím použít kalkulačku nebo zavolejte na 800 123 456.",
                suggestions: ["Použít kalkulačku", "Kontaktovat specialistu", "Zkusit znovu"],
                performCalculation: false,
                showFreeConsultation: true
            })
        };
    }
};

// Helper functions
function createSystemPrompt(state, conversationState) {
    return `Jsi hypoteční specialista v České republice. Máš přístup k nabídkám 23 bank.
    
Aktuální data klienta:
- Záměr: ${state.intent || 'neurčeno'}
- Cena nemovitosti: ${state.propertyValue || 0} Kč
- Vlastní zdroje: ${state.ownResources || 0} Kč
- Příjem: ${state.monthlyIncome || 0} Kč/měsíc
- Závazky: ${state.monthlyLiabilities || 0} Kč/měsíc
- Požadovaná doba: ${state.loanTerm || 25} let
- Fixace: ${state.fixation || 5} let

Aktuální sazby (leden 2025):
- 3 roky: 4.19% (LTV 80%), 4.69% (LTV 90%)
- 5 let: 3.99% (LTV 80%), 4.49% (LTV 90%)
- 7 let: 4.09% (LTV 80%), 4.59% (LTV 90%)

Odpovídej stručně, přímo k věci. Pokud máš všechna data, nastav performCalculation: true.
Odpověz POUZE jako JSON objekt s touto strukturou:
{
    "responseText": "tvoje odpověď",
    "suggestions": ["návrh 1", "návrh 2", "návrh 3"],
    "performCalculation": true/false,
    "updateState": null nebo objekt s novými hodnotami,
    "showFreeConsultation": true/false
}`;
}

function generateSmartResponse(userMessage, state) {
    const message = userMessage.toLowerCase();
    
    // Greeting
    if (message.includes('ahoj') || message.includes('dobrý den') || message.includes('zdravím')) {
        return {
            responseText: "Dobrý den! Jsem váš hypoteční poradce s přístupem k 23 bankám. Pomohu vám najít nejlepší hypotéku. Co vás zajímá?",
            suggestions: ["Chci koupit byt", "Aktuální sazby", "Refinancování"],
            performCalculation: false,
            showFreeConsultation: true
        };
    }
    
    // Interest rates
    if (message.includes('sazb') || message.includes('úrok')) {
        return {
            responseText: `Aktuální úrokové sazby (leden 2025):
            
📊 **Nejlepší nabídky:**
• ČMSS Liška: od 3.79% (5 let fixace)
• Hypoteční banka: od 3.89% (5 let fixace)  
• ČSOB: od 3.99% (5 let fixace)

Sazby závisí na LTV, bonitě a fixaci. Pro přesnou nabídku potřebuji znát vaše parametry.`,
            suggestions: ["Spočítat hypotéku", "Více o bankách", "Konzultace zdarma"],
            performCalculation: false,
            showFreeConsultation: true
        };
    }
    
    // Property purchase
    if (message.includes('koupit') || message.includes('byt') || message.includes('dům')) {
        if (state.propertyValue > 0 && state.ownResources > 0) {
            return {
                responseText: "Výborně! Mám všechny údaje. Připravuji pro vás nejlepší nabídky z 23 bank:",
                suggestions: ["Změnit parametry", "Kontaktovat specialistu", "Více informací"],
                performCalculation: true,
                showFreeConsultation: true
            };
        }
        return {
            responseText: "Pomohu vám s koupí nemovitosti. Jaká je přibližná cena nemovitosti?",
            suggestions: ["3 miliony", "5 milionů", "8 milionů"],
            performCalculation: false,
            updateState: { intent: 'koupě' }
        };
    }
    
    // Refinancing
    if (message.includes('refinanc')) {
        return {
            responseText: `Refinancování může ušetřit tisíce měsíčně! 
            
S aktuálními sazbami od 3.79% můžete ušetřit 3-5 tisíc měsíčně.
Bezplatně prověříme vaše možnosti u všech 23 bank.`,
            suggestions: ["Spočítat úsporu", "Zavolat specialistu", "Více informací"],
            performCalculation: false,
            updateState: { intent: 'refinancování' },
            showFreeConsultation: true
        };
    }
    
    // Numbers in message - try to parse them
    const numbers = message.match(/\d+/g);
    if (numbers) {
        const num = parseInt(numbers[0]);
        
        if (num > 100000) {
            if (!state.propertyValue) {
                return {
                    responseText: `Cena nemovitosti ${formatNumber(num)} Kč. Kolik máte vlastních zdrojů?`,
                    suggestions: ["20% z ceny", "1 milion", "2 miliony"],
                    performCalculation: false,
                    updateState: { propertyValue: num }
                };
            } else if (!state.ownResources) {
                return {
                    responseText: `Vlastní zdroje ${formatNumber(num)} Kč. Jaký je váš čistý měsíční příjem?`,
                    suggestions: ["50 tisíc", "75 tisíc", "100 tisíc"],
                    performCalculation: false,
                    updateState: { ownResources: num }
                };
            }
        } else if (num > 10000 && !state.monthlyIncome) {
            return {
                responseText: `Příjem ${formatNumber(num)} Kč měsíčně. Výborně, mám vše pro výpočet!`,
                suggestions: ["Zobrazit nabídky", "Změnit údaje", "Kontakt"],
                performCalculation: true,
                updateState: { monthlyIncome: num }
            };
        }
    }
    
    // Check if we have enough data
    const hasData = state.propertyValue > 0 && state.ownResources > 0 && state.monthlyIncome > 0;
    
    if (hasData) {
        const ltv = ((state.propertyValue - state.ownResources) / state.propertyValue) * 100;
        return {
            responseText: `Skvěle! Podle vašich parametrů (LTV ${ltv.toFixed(1)}%) jsem našel nejlepší nabídky:`,
            suggestions: ["Změnit parametry", "Kontakt na specialistu", "PDF report"],
            performCalculation: true,
            showFreeConsultation: true
        };
    }
    
    // Progressive data collection
    if (!state.intent) {
        return {
            responseText: "Začněme tím, co plánujete:",
            suggestions: ["Koupit nemovitost", "Refinancovat", "Stavět dům"],
            performCalculation: false
        };
    }
    
    if (!state.propertyValue) {
        return {
            responseText: "Jaká je cena nemovitosti?",
            suggestions: ["3 miliony", "5 milionů", "8 milionů"],
            performCalculation: false
        };
    }
    
    if (!state.ownResources) {
        return {
            responseText: "Kolik máte vlastních prostředků?",
            suggestions: ["20% z ceny", "1 milion", "2 miliony"],
            performCalculation: false
        };
    }
    
    if (!state.monthlyIncome) {
        return {
            responseText: "Jaký je váš čistý měsíční příjem?",
            suggestions: ["50 tisíc", "75 tisíc", "100 tisíc"],
            performCalculation: false
        };
    }
    
    // Default response
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

function shouldPerformCalculation(state) {
    return state.intent && 
           state.propertyValue > 0 && 
           state.ownResources > 0 && 
           state.monthlyIncome > 0;
}

function formatNumber(num) {
    return new Intl.NumberFormat('cs-CZ').format(num);
}