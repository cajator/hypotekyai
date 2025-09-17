// Vylepšená Netlify serverless funkce pro AI chat
// netlify/functions/gemini.js

export default async (request, context) => {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { userMessage, state, aiConversationState } = await request.json();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ 
                responseText: "Omlouvám se, AI služba není správně nakonfigurována. Mezitím můžete použít kalkulačku nebo nás kontaktovat přímo.",
                suggestions: ["Použít kalkulačku", "Kontaktovat specialistu"],
                conversationStep: 'error',
                performCalculation: false,
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Analyzovat uživatelský vstup pro extrakci dat
        const extractedData = extractDataFromMessage(userMessage, state);
        
        // Vylepšený prompt s kontextovým učením
        const systemPrompt = `Jsi profesionální hypoteční poradce pro český trh s 15letými zkušenostmi.

TVOJE ROLE:
- Poskytuj přesné a aktuální informace o hypotékách
- Buď přátelský ale profesionální
- Vždy se snaž pomoci uživateli najít nejlepší řešení
- Ptej se na důležité informace postupně, ne všechno najednou

SOUČASNÁ DATA UŽIVATELE:
${JSON.stringify(state, null, 2)}

KONVERZAČNÍ KONTEXT:
${JSON.stringify(aiConversationState, null, 2)}

PRAVIDLA ODPOVĚDI:
1. Odpověz VŽDY v JSON formátu
2. Pokud uživatel poskytl nové informace, ulož je do updateState
3. Když máš všechny potřebné údaje (záměr, cena, vlastní zdroje, příjem), nastav performCalculation: true
4. Nabízej relevantní návrhy dalších kroků
5. NIKDY se neptej na informace, které už znáš
6. Pokud uživatel chce konzultaci zdarma, zdůrazni že je ZDARMA a bez závazků

STRUKTURA ODPOVĚDI:
{
    "responseText": "tvoje odpověď",
    "suggestions": ["návrh 1", "návrh 2", "návrh 3"],
    "updateState": null nebo objekt s novými daty,
    "conversationStep": "current_step",
    "performCalculation": true/false,
    "showFreeConsultation": true/false
}`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ 
                parts: [{ 
                    text: `Systémová instrukce: ${systemPrompt}\n\nUživatel řekl: "${userMessage}"\n\nOdpověz profesionálně a užitečně v JSON formátu.` 
                }] 
            }],
            generationConfig: { 
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 1000
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error("Gemini API Error:", errorText);
            // Použít inteligentní fallback
            return new Response(JSON.stringify(
                generateSmartFallback(userMessage, state, aiConversationState, extractedData)
            ), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await apiResponse.json();
        let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        try {
            let parsedResponse = JSON.parse(responseText);
            
            // Sloučit extrahovaná data s odpovědí
            if (extractedData && Object.keys(extractedData).length > 0) {
                parsedResponse.updateState = {
                    ...extractedData,
                    ...(parsedResponse.updateState || {})
                };
            }
            
            // Validace a doplnění chybějících polí
            parsedResponse = validateAndEnhanceResponse(parsedResponse, state, userMessage);
            
            return new Response(JSON.stringify(parsedResponse), {
                headers: { 'Content-Type': 'application/json' },
            });
            
        } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            return new Response(JSON.stringify(
                generateSmartFallback(userMessage, state, aiConversationState, extractedData)
            ), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

    } catch (error) {
        console.error("Function error:", error);
        return new Response(JSON.stringify({ 
            responseText: "Omlouvám se, nastala technická chyba. Můžete použít kalkulačku nebo zkusit znovu.",
            suggestions: ["Použít kalkulačku", "Zkusit znovu", "Kontakt na specialistu"],
            conversationStep: 'error',
            performCalculation: false,
            showFreeConsultation: true
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

// Extrakce dat z uživatelské zprávy
function extractDataFromMessage(message, currentState) {
    const extracted = {};
    const lowerMessage = message.toLowerCase();
    
    // Extrakce částek
    const amountRegex = /(\d+(?:[.,]\d+)?)\s*(mil(?:ion)?|tis(?:íc)?|k|m)\b/gi;
    const matches = [...message.matchAll(amountRegex)];
    
    if (matches.length > 0) {
        const [, num, unit] = matches[0];
        let value = parseFloat(num.replace(',', '.'));
        
        if (unit.match(/mil|m/i)) value *= 1000000;
        else if (unit.match(/tis|k/i)) value *= 1000;
        
        // Určení typu hodnoty podle kontextu
        if (lowerMessage.includes('cena') || lowerMessage.includes('stojí') || lowerMessage.includes('hodnot')) {
            extracted.propertyValue = value;
        } else if (lowerMessage.includes('vlastní') || lowerMessage.includes('našetřen') || lowerMessage.includes('mám')) {
            extracted.ownResources = value;
        } else if (lowerMessage.includes('příjem') || lowerMessage.includes('vydělávám') || lowerMessage.includes('plat')) {
            extracted.monthlyIncome = value;
        } else if (lowerMessage.includes('dluh') || lowerMessage.includes('splác') || lowerMessage.includes('úvěr')) {
            extracted.monthlyLiabilities = value;
        }
    }
    
    // Extrakce procentuálních hodnot
    const percentRegex = /(\d+(?:[.,]\d+)?)\s*%/g;
    const percentMatch = percentRegex.exec(message);
    if (percentMatch && currentState.propertyValue > 0) {
        const percent = parseFloat(percentMatch[1].replace(',', '.'));
        if (lowerMessage.includes('vlastní') || lowerMessage.includes('mám')) {
            extracted.ownResources = (currentState.propertyValue * percent) / 100;
        }
    }
    
    // Extrakce záměru
    if (lowerMessage.includes('koupit') || lowerMessage.includes('koupě') || lowerMessage.includes('byt') || lowerMessage.includes('dům')) {
        extracted.intent = 'koupě';
    } else if (lowerMessage.includes('stavět') || lowerMessage.includes('výstavb') || lowerMessage.includes('postavit')) {
        extracted.intent = 'výstavba';
    } else if (lowerMessage.includes('refinanc')) {
        extracted.intent = 'refinancování';
    } else if (lowerMessage.includes('rekonstruk') || lowerMessage.includes('oprav')) {
        extracted.intent = 'rekonstrukce';
    } else if (lowerMessage.includes('investic') || lowerMessage.includes('pronájem')) {
        extracted.intent = 'investice';
    }
    
    // Extrakce doby splatnosti
    const yearsRegex = /(\d+)\s*(?:let|rok)/gi;
    const yearsMatch = yearsRegex.exec(message);
    if (yearsMatch && (lowerMessage.includes('splatnost') || lowerMessage.includes('splác'))) {
        extracted.loanTerm = parseInt(yearsMatch[1]);
    }
    
    // Extrakce fixace
    if (lowerMessage.includes('fixac')) {
        const fixMatch = /(\d+)\s*(?:let|rok)/gi.exec(message);
        if (fixMatch) {
            extracted.fixation = parseInt(fixMatch[1]);
        }
    }
    
    return extracted;
}

// Vylepšený smart fallback
function generateSmartFallback(userMessage, state, aiConversationState, extractedData) {
    const message = userMessage.toLowerCase();
    let response = {
        responseText: "",
        suggestions: [],
        updateState: extractedData,
        conversationStep: aiConversationState.step || 'start',
        performCalculation: false,
        showFreeConsultation: false
    };
    
    // Kontrola kompletnosti dat
    const hasCompleteData = state.intent && 
                           state.propertyValue > 0 && 
                           state.ownResources > 0 && 
                           state.monthlyIncome > 0;
    
    // Různé konverzační scénáře
    if (message.includes('ahoj') || message.includes('dobrý den') || message.includes('zdravím')) {
        response.responseText = "Dobrý den! 👋 Jsem váš hypoteční specialista s přístupem k nabídkám 23 bank. Rád vám pomohu najít nejlepší hypotéku. Co vás přivádí?";
        response.suggestions = ["Chci koupit byt", "Potřebuji refinancovat", "Zajímají mě sazby", "Konzultace zdarma"];
        response.conversationStep = 'greeting';
        response.showFreeConsultation = true;
        
    } else if (message.includes('konzultac') || message.includes('zdarma') || message.includes('specialista')) {
        response.responseText = "Výborně! Nabízíme KONZULTACI ZDARMA a nezávazně. Náš specialista vám:\n\n✓ Porovná nabídky 23 bank\n✓ Zajistí nejlepší sazbu\n✓ Vyřídí vše za vás\n✓ Ušetří průměrně 286 000 Kč\n\nStačí vyplnit krátký formulář a ozvu se vám do 24 hodin.";
        response.suggestions = ["Vyplnit formulář", "Spočítat hypotéku nejdřív", "Více informací"];
        response.showFreeConsultation = true;
        response.conversationStep = 'free_consultation';
        
    } else if (message.includes('sazb') || message.includes('úrok')) {
        const ltvInfo = state.propertyValue > 0 && state.ownResources > 0 ? 
            `\n\nPro váš případ (LTV ${((state.propertyValue - state.ownResources) / state.propertyValue * 100).toFixed(0)}%) očekávám sazbu kolem 4.3-4.5% při 5leté fixaci.` : "";
        
        response.responseText = `Aktuální úrokové sazby (listopad 2024):\n\n📊 Pro LTV do 80%:\n• 3 roky fixace: od 4.19%\n• 5 let fixace: od 3.99%\n• 7 let fixace: od 4.09%\n\n📊 Pro LTV do 90%:\n• 3 roky fixace: od 4.69%\n• 5 let fixace: od 4.49%\n• 7 let fixace: od 4.59%${ltvInfo}\n\nChcete přesný výpočet pro váš případ?`;
        response.suggestions = ["Spočítat moji hypotéku", "Jak snížit sazbu", "Konzultace zdarma"];
        response.conversationStep = 'rates_info';
        
    } else if (!state.intent && (message.includes('koup') || message.includes('byt') || message.includes('dům'))) {
        response.responseText = "Rozumím, chcete koupit nemovitost. To je skvělé rozhodnutí! 🏡\n\nJakou nemovitost plánujete koupit a za kolik?";
        response.suggestions = ["Byt do 5 mil.", "Byt 5-8 mil.", "Dům do 8 mil.", "Dražší nemovitost"];
        response.updateState = { ...extractedData, intent: 'koupě' };
        response.conversationStep = 'asking_property_value';
        
    } else if (state.intent && !state.propertyValue) {
        response.responseText = "Výborně! Teď potřebuji znát cenu nemovitosti, kterou zvažujete. Jaká je orientační cena?";
        response.suggestions = ["3 miliony", "5 milionů", "8 milionů", "Více než 10 mil."];
        response.conversationStep = 'asking_property_value';
        
    } else if (state.propertyValue && !state.ownResources) {
        response.responseText = `Cena ${formatCurrency(state.propertyValue)} je v pořádku. Kolik máte vlastních prostředků na koupi?\n\n💡 Tip: Banky obvykle vyžadují alespoň 10-20% z ceny nemovitosti.`;
        response.suggestions = ["10% z ceny", "20% z ceny", "1 milion", "2 miliony"];
        response.conversationStep = 'asking_own_resources';
        
    } else if (state.ownResources && !state.monthlyIncome) {
        const ltv = ((state.propertyValue - state.ownResources) / state.propertyValue * 100).toFixed(0);
        response.responseText = `Skvěle! S vlastními zdroji ${formatCurrency(state.ownResources)} budete mít LTV ${ltv}%, což je ${ltv < 80 ? 'výborné pro získání nejlepších sazeb' : ltv < 90 ? 'dobré, získáte standardní sazby' : 'na hranici, ale dá se to zařídit'}.\n\nJaký je váš čistý měsíční příjem domácnosti?`;
        response.suggestions = ["40-60 tisíc", "60-80 tisíc", "80-100 tisíc", "Více než 100 tisíc"];
        response.conversationStep = 'asking_income';
        
    } else if (state.monthlyIncome && typeof state.monthlyLiabilities === 'undefined') {
        response.responseText = "Výborně! Poslední otázka - máte nějaké stávající úvěry nebo jiné měsíční splátky?\n\n(leasing, kreditní karty, spotřebitelské úvěry apod.)";
        response.suggestions = ["Nemám žádné", "Do 5 tisíc", "5-10 tisíc", "Více než 10 tisíc"];
        response.conversationStep = 'asking_liabilities';
        
    } else if (hasCompleteData) {
        // Vypočítat základní metriky
        const loanAmount = state.propertyValue - state.ownResources;
        const ltv = (loanAmount / state.propertyValue * 100).toFixed(0);
        const estimatedPayment = calculateMonthlyPayment(loanAmount, 4.3, state.loanTerm || 25);
        const dsti = ((estimatedPayment + (state.monthlyLiabilities || 0)) / state.monthlyIncome * 100).toFixed(0);
        
        response.responseText = `Perfektní! Mám všechny údaje pro výpočet:\n\n📊 Váš profil:\n• Úvěr: ${formatCurrency(loanAmount)}\n• LTV: ${ltv}%\n• Odhadovaná splátka: ${formatCurrency(estimatedPayment)}\n• DSTI: ${dsti}%\n\n${dsti < 45 ? '✅ Váš příjem je dostačující' : dsti < 50 ? '⚠️ DSTI je na hranici, ale dá se to zařídit' : '❌ DSTI je vysoké, budeme muset optimalizovat podmínky'}\n\nZobrazuji detailní nabídky:`;
        response.suggestions = ["Zobrazit detailní analýzu", "Změnit parametry", "Konzultace se specialistou"];
        response.performCalculation = true;
        response.showFreeConsultation = true;
        response.conversationStep = 'calculation_ready';
        
    } else {
        // Obecná odpověď
        response.responseText = "Jsem tu, abych vám pomohl s hypotékou. Můžu pro vás:\n\n✓ Spočítat optimální hypotéku\n✓ Porovnat aktuální nabídky bank\n✓ Poradit s refinancováním\n✓ Zajistit konzultaci zdarma\n\nCo vás nejvíce zajímá?";
        response.suggestions = ["Spočítat hypotéku", "Aktuální sazby", "Refinancování", "Konzultace zdarma"];
        response.showFreeConsultation = true;
        response.conversationStep = 'menu';
    }
    
    return response;
}

// Validace a vylepšení AI odpovědi
function validateAndEnhanceResponse(response, state, userMessage) {
    // Zajistit všechny povinné klíče
    response.responseText = response.responseText || "Jak vám mohu pomoci s hypotékou?";
    response.suggestions = response.suggestions?.length > 0 ? response.suggestions : ["Spočítat hypotéku", "Konzultace zdarma"];
    response.conversationStep = response.conversationStep || 'conversation';
    response.performCalculation = response.performCalculation || false;
    response.showFreeConsultation = response.showFreeConsultation !== false;
    
    // Kontrola zacyklení - pokud se ptá na stejnou věc
    if (userMessage.toLowerCase().includes('zacyklen') || userMessage.toLowerCase().includes('pořád')) {
        response.responseText = "Omlouvám se za zmatení. Pojďme začít znovu. Co je pro vás teď nejdůležitější?";
        response.suggestions = ["Spočítat novou hypotéku", "Zobrazit výsledky", "Konzultace se specialistou"];
        response.conversationStep = 'reset';
    }
    
    // Přidat call-to-action pro konzultaci zdarma
    if (response.showFreeConsultation && !response.responseText.includes('zdarma') && Math.random() > 0.5) {
        response.responseText += "\n\n💚 Nezapomeňte - konzultace s naším specialistou je ZDARMA a nezávazná!";
    }
    
    return response;
}

// Helper funkce pro formátování měny
function formatCurrency(value) {
    return new Intl.NumberFormat('cs-CZ', { 
        style: 'currency', 
        currency: 'CZK', 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    }).format(value);
}

// Výpočet měsíční splátky
function calculateMonthlyPayment(principal, annualRate, years) {
    const monthlyRate = (annualRate / 100) / 12;
    const n = years * 12;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
}