// Netlify serverless function for AI chat
// Uložte jako: netlify/functions/gemini.js

export default async (request, context) => {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { userMessage, state, aiConversationState } = await request.json();

        // Get the API key from environment variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ 
                responseText: "Omlouvám se, AI služba není správně nakonfigurována.",
                suggestions: ["Spočítat hypotéku", "Aktuální sazby"],
                conversationStep: 'start',
                performCalculation: false,
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // Simplified but effective system prompt
        const systemPrompt = `Jsi profesionální hypoteční poradce pro český trh. Tvým úkolem je pomoct uživateli s hypotékou.

PRAVIDLA:
1. Vždy odpovídej v JSON formátu: {"responseText": string, "suggestions": string[], "updateState": object|null, "conversationStep": string, "performCalculation": boolean}
2. Buď stručný ale užitečný
3. Ptej se postupně - jedna otázka za druhou
4. Když máš všechny potřebné údaje, nastav "performCalculation": true
5. Nabízej vždy 2-4 návrhy odpovědí v poli "suggestions"
6. Pro výpočet potřebuješ: záměr, cena nemovitosti, vlastní zdroje, měsíční příjem
7. Pokud uživatel chce kontakt na specialistu, doporuč mu vyplnit formulář

AKTUÁLNÍ STAV UŽIVATELE: ${JSON.stringify(state)}
KONVERZACE: ${JSON.stringify(aiConversationState)}`;
        
        const fullQuery = `Uživatel řekl: "${userMessage}". Odpověz v JSON formátu.`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ parts: [{ text: fullQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { 
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 1000
            }
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error("Gemini API Error:", errorBody);
            
            // Return fallback response
            return new Response(JSON.stringify({ 
                responseText: "Omlouvám se, nastala chyba s AI službou. Můžete pokračovat pomocí kalkulačky.",
                suggestions: ["Otevřít kalkulačku", "Zkusit znovu"],
                conversationStep: 'start',
                performCalculation: false,
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await apiResponse.json();
        let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        // Try to parse as JSON, if it fails, create a fallback response
        try {
            const parsedResponse = JSON.parse(responseText);
            
            // Validate required fields
            if (!parsedResponse.responseText) {
                parsedResponse.responseText = "Jak vám mohu pomoci s hypotékou?";
            }
            if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
                parsedResponse.suggestions = ["Spočítat hypotéku", "Aktuální sazby"];
            }
            if (!parsedResponse.conversationStep) {
                parsedResponse.conversationStep = 'start';
            }
            if (parsedResponse.performCalculation === undefined) {
                parsedResponse.performCalculation = false;
            }
            
            return new Response(JSON.stringify(parsedResponse), {
                headers: { 'Content-Type': 'application/json' },
            });
            
        } catch (parseError) {
            console.error("JSON parsing error:", parseError, "Raw response:", responseText);
            
            // Generate intelligent fallback based on user message
            const fallbackResponse = generateIntelligentFallback(userMessage, state, aiConversationState);
            
            return new Response(JSON.stringify(fallbackResponse), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

    } catch (error) {
        console.error("Function error:", error);
        return new Response(JSON.stringify({ 
            responseText: "Omlouvám se, nastala technická chyba. Zkuste to prosím znovu.",
            suggestions: ["Zkusit znovu", "Otevřít kalkulačku"],
            conversationStep: 'start',
            performCalculation: false,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

// Intelligent fallback function
function generateIntelligentFallback(userMessage, state, aiConversationState) {
    const message = userMessage.toLowerCase();
    
    // Check if user wants to calculate mortgage
    if (message.includes('spočítat') || message.includes('hypotéku') || message.includes('kalkulace')) {
        // If we don't have enough data, ask for more
        if (!state.intent) {
            return {
                responseText: "Výborně! Pro výpočet hypotéky potřebuji znát váš záměr. Co plánujete?",
                suggestions: ["Koupě", "Výstavba", "Refinancování", "Rekonstrukce"],
                conversationStep: 'asking_intent',
                performCalculation: false
            };
        }
        
        if (!state.propertyValue || state.propertyValue <= 0) {
            return {
                responseText: "Kolik stojí nemovitost, kterou zvažujete?",
                suggestions: ["3 miliony", "5 milionů", "8 milionů", "Více než 10 mil."],
                conversationStep: 'asking_property_value',
                performCalculation: false
            };
        }
        
        if (!state.ownResources || state.ownResources <= 0) {
            return {
                responseText: "Kolik máte vlastních prostředků?",
                suggestions: ["500 tisíc", "1 milion", "20%", "30%"],
                conversationStep: 'asking_own_resources',
                performCalculation: false
            };
        }
        
        if (!state.monthlyIncome || state.monthlyIncome <= 0) {
            return {
                responseText: "Jaký je váš měsíční čistý příjem domácnosti?",
                suggestions: ["40 tisíc", "60 tisíc", "80 tisíc", "100+ tisíc"],
                conversationStep: 'asking_income',
                performCalculation: false
            };
        }
        
        // We have enough data, show calculation
        return {
            responseText: "Perfektně! Mám všechny potřebné údaje. Zobrazuji výpočet hypotéky:",
            suggestions: ["Změnit parametry", "Detailní analýza", "Spojit se specialistou"],
            conversationStep: 'calculation_done',
            performCalculation: true
        };
    }
    
    // Handle specific intents
    if (message.includes('koupě') || message.includes('koupit')) {
        return {
            responseText: "Koupě nemovitosti je skvělá volba! Kolik stojí nemovitost, kterou zvažujete?",
            suggestions: ["3 miliony", "5 milionů", "8 milionů", "Více než 10 mil."],
            updateState: { intent: 'koupě' },
            conversationStep: 'asking_property_value',
            performCalculation: false
        };
    }
    
    if (message.includes('výstavba') || message.includes('stavět')) {
        return {
            responseText: "Výstavba vlastního domu je skvělá! Jaký je celkový rozpočet na projekt?",
            suggestions: ["4 miliony", "6 milionů", "8 milionů", "10+ milionů"],
            updateState: { intent: 'výstavba' },
            conversationStep: 'asking_budget',
            performCalculation: false
        };
    }
    
    if (message.includes('refinanc')) {
        return {
            responseText: "Refinancování může ušetřit značné peníze! Jaký je zůstatek vašeho současného úvěru?",
            suggestions: ["2 miliony", "4 miliony", "6 milionů", "Více než 8 mil."],
            updateState: { intent: 'refinancování' },
            conversationStep: 'asking_current_balance',
            performCalculation: false
        };
    }
    
    // Handle numeric inputs
    const numMatch = message.match(/(\d+(?:\.\d+)?)\s*(mil|milion|tisíc|k|%)/i);
    if (numMatch) {
        const num = parseFloat(numMatch[1]);
        const unit = numMatch[2].toLowerCase();
        let value = num;
        
        if (unit.includes('mil')) value *= 1000000;
        else if (unit.includes('tisíc') || unit === 'k') value *= 1000;
        
        // Determine what this number refers to based on conversation state
        if (aiConversationState.step === 'asking_property_value') {
            return {
                responseText: `Cena ${formatCurrency(value)} je v pořádku. Kolik máte vlastních prostředků?`,
                suggestions: ["500 tisíc", "1 milion", "20%", "30%"],
                updateState: { propertyValue: value },
                conversationStep: 'asking_own_resources',
                performCalculation: false
            };
        }
        
        if (aiConversationState.step === 'asking_own_resources') {
            let ownResources = value;
            if (unit === '%' && state.propertyValue) {
                ownResources = (state.propertyValue * value) / 100;
            }
            return {
                responseText: `Vlastní zdroje ${formatCurrency(ownResources)} jsou dobré. Jaký je váš měsíční čistý příjem?`,
                suggestions: ["40 tisíc", "60 tisíc", "80 tisíc", "100+ tisíc"],
                updateState: { ownResources: ownResources },
                conversationStep: 'asking_income',
                performCalculation: false
            };
        }
        
        if (aiConversationState.step === 'asking_income') {
            return {
                responseText: `Příjem ${formatCurrency(value)} je výborný. Máte nějaké jiné úvěry? (měsíční splátky)`,
                suggestions: ["Nemám žádné", "5 tisíc", "10 tisíc", "15+ tisíc"],
                updateState: { monthlyIncome: value },
                conversationStep: 'asking_liabilities',
                performCalculation: false
            };
        }
    }
    
    // Handle "no debts" responses
    if (message.includes('nemám') || message.includes('žádné') || message.includes('0')) {
        if (aiConversationState.step === 'asking_liabilities') {
            return {
                responseText: "Perfektně! Nyní mám všechny potřebné údaje. Zobrazuji výpočet:",
                suggestions: ["Změnit parametry", "Detailní analýza", "Spojit se specialistou"],
                updateState: { monthlyLiabilities: 0 },
                conversationStep: 'calculation_done',
                performCalculation: true
            };
        }
    }
    
    // Handle interest rate questions
    if (message.includes('sazby') || message.includes('úrok')) {
        return {
            responseText: "Aktuální úrokové sazby se pohybují podle LTV a fixace:\n\n• Pro LTV do 80%: od 3.99% (5 let fixace)\n• Pro LTV do 90%: od 4.49% (5 let fixace)\n\nChcete spočítat konkrétní nabídku?",
            suggestions: ["Spočítat hypotéku", "Více o sazbách", "Jak snížit LTV"],
            conversationStep: 'info_provided',
            performCalculation: false
        };
    }
    
    // Handle contact requests
    if (message.includes('specialista') || message.includes('kontakt') || message.includes('spojit')) {
        return {
            responseText: "Skvělé! Pro kontakt se specialistou vyplňte prosím formulář v kalkulačce. Získáte tak personalizovanou analýzu a naši odborníci se vám ozvou s nejlepšími nabídkami na trhu.",
            suggestions: ["Otevřít formulář", "Spočítat hypotéku", "Více informací"],
            conversationStep: 'redirect_to_form',
            performCalculation: false
        };
    }
    
    // Default response
    return {
        responseText: "Jsem tu, abych vám pomohl s hypotékou. Můžu vám spočítat nejlepší nabídky, poradit se sazbami nebo odpovědět na jakékoliv dotazy týkající se hypotéky.",
        suggestions: ["Spočítat hypotéku", "Aktuální sazby", "Jak na refinancování", "Spojit se specialistou"],
        conversationStep: 'start',
        performCalculation: false
    };
}

// Helper function for currency formatting
function formatCurrency(value) {
    return new Intl.NumberFormat('cs-CZ', { 
        style: 'currency', 
        currency: 'CZK', 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    }).format(value);
}