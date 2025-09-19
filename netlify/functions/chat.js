<<<<<<< HEAD
// netlify/functions/chat.js - v11.0 - Final Build
import { GoogleGenerativeAI } from "@google/generative-ai";
=======
// netlify/functions/chat.js
// Serverless funkce pro AI chat s Gemini API
>>>>>>> 66ce2cecf5e96217a9f405406dd54416f39144d7

export default async (request, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    // Only POST allowed
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ 
            error: 'Method not allowed' 
        }), { 
            status: 405, 
            headers 
        });
    }

    try {
<<<<<<< HEAD
        const { message, context } = JSON.parse(event.body);
        
        // --- CRITICAL: API Key Check ---
        // This is the most common point of failure.
        // Ensure GEMINI_API_KEY is set in Netlify's environment variables.
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('CRITICAL ERROR: GEMINI_API_KEY environment variable is not set.');
            return { 
                statusCode: 500, 
                headers, 
                body: JSON.stringify({ error: 'Konfigurace AI na serveru chybí. API klíč nebyl nalezen. Kontaktujte prosím správce webu.' }) 
            };
=======
        const { message, context: userContext } = await request.json();

        if (!message) {
            return new Response(JSON.stringify({ 
                error: 'Message is required' 
            }), { 
                status: 400, 
                headers 
            });
>>>>>>> 66ce2cecf5e96217a9f405406dd54416f39144d7
        }

        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            // Fallback na lokální odpovědi když není API klíč
            const response = getLocalResponse(message, userContext);
            return new Response(JSON.stringify({ 
                response,
                fallback: true 
            }), { 
                status: 200, 
                headers 
            });
        }

        // Detailní system prompt pro Gemini
        const systemPrompt = `Jsi profesionální hypoteční poradce v České republice.

TVOJE ROLE:
- Poskytuj přesné a aktuální informace o hypotékách
- Vysvětluj složité pojmy jednoduše
- Doporučuj optimální řešení na základě situace klienta
- Buď přátelský ale profesionální

KONTEXT KLIENTA:
${userContext ? JSON.stringify(userContext, null, 2) : 'Zatím žádné údaje'}

AKTUÁLNÍ SAZBY (leden 2025):
- 1 rok fixace: 5.09% - 5.39%
- 3 roky fixace: 4.29% - 4.69%
- 5 let fixace: 4.09% - 4.49% (nejpopulárnější)
- 7 let fixace: 4.19% - 4.59%
- 10 let fixace: 4.39% - 4.79%

DŮLEŽITÉ LIMITY:
- Maximální LTV: 90% (výjimečně 100%)
- Maximální DSTI: 50% (ČNB limit)
- Minimální úvěr: 300 000 Kč
- Maximální úvěr: 30 000 000 Kč
- Maximální doba splatnosti: 30 let
- Věk při doplacení: max 70 let

BANKY V SYSTÉMU:
1. Česká spořitelna - univerzální, dobré podmínky
2. ČSOB - až 100% LTV, rychlé vyřízení
3. Komerční banka - pro vyšší příjmy
4. UniCredit Bank - prémiové služby
5. Raiffeisenbank - online proces
6. Hypoteční banka - specialista, nejnižší sazby

PRAVIDLA KOMUNIKACE:
1. Odpovídej stručně a věcně (max 3-4 věty)
2. Používej české termíny
3. Pokud nemáš dost informací, zeptej se
4. Vždy zohledni aktuální kontext klienta
5. Doporuč konkrétní kroky`;

        // Volání Gemini API
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                parts: [{
                    text: `${systemPrompt}

Klient se ptá: ${message}

Odpověz profesionálně a užitečně:`
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            throw new Error(`Gemini API error: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();
        const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Omlouvám se, nemůžu nyní odpovědět.';
        
        return new Response(JSON.stringify({ 
            response: aiResponse,
            success: true 
        }), { 
            status: 200, 
            headers 
        });

    } catch (error) {
        console.error('Chat API error:', error);
        
        // Fallback response
        const fallbackResponse = getLocalResponse(request.message);
        return new Response(JSON.stringify({
            response: fallbackResponse,
            error: error.message,
            fallback: true
        }), { 
            status: 200, 
            headers 
        });
    }
};

<<<<<<< HEAD
function createSystemPrompt(context) {
    const hasContext = context && context.calculation && (context.calculation.loanAmount > 0 || (context.formData && context.formData.propertyValue > 0));
    
    return `Jsi přátelský a profesionální hypoteční poradce jménem Hypotéka AI. Tvůj cíl je pomoci uživateli s hypotékou. Buď stručný, nápomocný a ptej se na další kroky. Vždy jednej, jako bys měl přístup k interním metodikám bank, ale nikdy nezmiňuj jména konkrétních bank. Používej Markdown pro formátování (nadpisy, odrážky).
=======
// Lokální odpovědi když API není dostupné
function getLocalResponse(message, context) {
    const msg = message.toLowerCase();
    
    // Sazby
    if (msg.includes('sazb') || msg.includes('úrok')) {
        return `Aktuální úrokové sazby hypotéky (leden 2025):
>>>>>>> 66ce2cecf5e96217a9f405406dd54416f39144d7

**3 roky fixace:** 4.29% - 4.69%
**5 let fixace:** 4.09% - 4.49% (doporučujeme)
**7 let fixace:** 4.19% - 4.59%
**10 let fixace:** 4.39% - 4.79%

Konkrétní sazba závisí na vaší bonitě, výši vlastních zdrojů a vybrané bance.`;
    }
    
    // Kolik si můžu půjčit
    if (msg.includes('kolik') && (msg.includes('půjč') || msg.includes('dost'))) {
        if (context?.monthlyIncome) {
            const maxLoan = context.monthlyIncome * 12 * 9; // 9x roční příjem
            return `S příjmem ${context.monthlyIncome} Kč měsíčně můžete dostat hypotéku až ${Math.round(maxLoan / 1000000)} mil. Kč. Záleží ale také na vašich závazcích a DSTI.`;
        }
        
        return `Maximální výše hypotéky závisí na:

1. **Příjmech** - banky půjčují cca 9x roční příjem
2. **DSTI** - splátky nesmí překročit 50% příjmu
3. **LTV** - úvěr může být max 90% hodnoty nemovitosti
4. **Věku** - úvěr musí být splacen do 70 let

Pro přesný výpočet použijte naši kalkulačku nebo mi řekněte váš měsíční příjem.`;
    }
    
    // DSTI
    if (msg.includes('dsti') || msg.includes('bonit')) {
        const dsti = context?.dsti;
        if (dsti) {
            if (dsti < 40) {
                return `Vaše DSTI je ${dsti}% - to je výborné! Máte vynikající bonitu a banky vám rády půjčí za nejlepší podmínky.`;
            } else if (dsti < 45) {
                return `Vaše DSTI je ${dsti}% - dobrá bonita. Splňujete podmínky většiny bank.`;
            } else if (dsti < 50) {
                return `Vaše DSTI je ${dsti}% - hraniční hodnota. Některé banky mohou váhat, doporučuji snížit požadovanou částku nebo najít banku s benevolentnějším přístupem.`;
            } else {
                return `Vaše DSTI je ${dsti}% - překračuje limit ČNB! Musíte snížit úvěr nebo zvýšit příjem. Případně splatit jiné závazky.`;
            }
        }
        
        return `**DSTI (Debt Service to Income)** je poměr vašich splátek k příjmu:

✅ Do 40% - výborná bonita
⚠️ 40-45% - dobrá bonita
⚠️ 45-50% - hraniční (limit ČNB)
❌ Nad 50% - úvěr nebude schválen

Vypočítá se: (všechny splátky / čistý příjem) × 100`;
    }
    
    // LTV
    if (msg.includes('ltv') || msg.includes('vlastní zdroje')) {
        return `**LTV (Loan to Value)** je poměr úvěru k hodnotě nemovitosti:

✅ Do 70% - nejlepší sazby
✅ 70-80% - standardní sazby
⚠️ 80-90% - vyšší sazby (+0.2-0.3%)
❌ Nad 90% - jen výjimečně (ČSOB)

Čím více vlastních zdrojů (nižší LTV), tím lepší podmínky dostanete.`;
    }
    
    // Refinancování
    if (msg.includes('refinanc')) {
        return `Refinancování se vyplatí když:

✅ Rozdíl sazeb je **alespoň 0.5%**
✅ Do konce fixace zbývá **max 6 měsíců**
✅ Chcete změnit parametry úvěru
✅ Potřebujete peníze navíc

Můžete ušetřit tisíce Kč měsíčně! Řekněte mi vaši současnou sazbu a spočítám úsporu.`;
    }
    
    // Dokumenty
    if (msg.includes('dokument') || msg.includes('doklad')) {
        return `Pro vyřízení hypotéky potřebujete:

**Základní dokumenty:**
• Občanský průkaz
• Potvrzení o příjmu (3 měsíce)
• Výpisy z účtu (3-6 měsíců)

**Podle situace:**
• Daňové přiznání (OSVČ)
• Pracovní smlouva
• Kupní smlouva
• List vlastnictví
• Odhad nemovitosti

Vše vám pomůžeme připravit.`;
    }
    
    // Proces
    if (msg.includes('jak dlouho') || msg.includes('proces')) {
        return `Časová osa vyřízení hypotéky:

📋 **Příprava** (2-3 dny) - sběr dokumentů
🏦 **Žádost** (3-5 dní) - podání do banky
🏠 **Ocenění** (3-5 dní) - odhad nemovitosti
✅ **Schválení** (5-10 dní) - rozhodnutí banky
📝 **Podpis** (1-2 dny) - smlouva
💰 **Čerpání** - dle kupní smlouvy

**Celkem: 3-4 týdny**`;
    }
    
    // Poplatky
    if (msg.includes('poplatek') || msg.includes('náklad')) {
        return `Náklady spojené s hypotékou:

💰 **Poplatek za vyřízení**: 0-0.5% z úvěru (často zdarma)
🏠 **Odhad nemovitosti**: 3000-5000 Kč
📄 **Vklad do katastru**: 2000 Kč
🛡️ **Pojištění nemovitosti**: cca 0.3% z úvěru ročně
📊 **Vedení účtu**: 0-200 Kč/měsíc

Celkové náklady: cca 10-20 000 Kč`;
    }
    
    // Default
    return `Děkuji za váš dotaz. Pro přesnou odpověď mi prosím řekněte více o vaší situaci nebo použijte naši kalkulačku pro okamžitý výpočet.

Můžete se zeptat na:
• Kolik si můžu půjčit?
• Jaké jsou aktuální sazby?
• Co je DSTI nebo LTV?
• Jaké dokumenty potřebuji?`;
}
