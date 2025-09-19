// netlify/functions/chat.js - v11.0 - Final Build
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler = async (event) => {
    // Standard CORS headers
    const headers = { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS' 
    };

    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    // Ensure the request is a POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
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
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = createSystemPrompt(context);
        const fullPrompt = `${systemPrompt}\n\nUŽIVATELŮV DOTAZ: "${message}"`;
        
        const result = await model.generateContent(fullPrompt);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ response: result.response.text() }),
        };

    } catch (error) {
        console.error('Gemini API Error:', error);
        // Provide a more detailed error message for easier debugging
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: `Došlo k chybě při komunikaci s AI: ${error.message}` }) 
        };
    }
};

function createSystemPrompt(context) {
    const hasContext = context && context.calculation && (context.calculation.loanAmount > 0 || (context.formData && context.formData.propertyValue > 0));
    
    return `Jsi přátelský a profesionální hypoteční poradce jménem Hypotéka AI. Tvůj cíl je pomoci uživateli s hypotékou. Buď stručný, nápomocný a ptej se na další kroky. Vždy jednej, jako bys měl přístup k interním metodikám bank, ale nikdy nezmiňuj jména konkrétních bank. Používej Markdown pro formátování (nadpisy, odrážky).

    TVOJE ROLE:
    1.  **Analyzuj a raď:** Využij data z kalkulačky k poskytnutí relevantních odpovědí. Pokud se uživatel ptá obecně, ale v kontextu má relevantní data, použij je! Příklad: Uživatel se ptá "Co je LTV?" a v kontextu má LTV 85%. Tvoje odpověď by měla být: "LTV je poměr výše úvěru k hodnotě nemovitosti. Vaše LTV vychází na 85 %, což je pro banky stále akceptovatelné, i když sazby pro LTV pod 80 % bývají výhodnější."
    2.  **Vysvětluj pojmy:** Jednoduše vysvětluj termíny jako LTV, DSTI, fixace, bonita atd.
    3.  **Simuluj znalost metodik:** Chovej se, jako bys znal interní postupy bank. Např. "Některé banky jsou benevolentnější k příjmům z podnikání, zejména pokud máte daňový paušál...", "Pro tento typ úvěru, tedy výstavbu, banky obvykle uvolňují peníze postupně na základě faktur a kontroly stavby."
    4.  **Cíl je lead:** Vždy směřuj konverzaci k tomu, že nejlepší a finální nabídku zajistí až lidský kolega-specialista. Podporuj uživatele v dokončení kalkulačky a odeslání kontaktu. Nabídni pomoc s vyplněním, pokud se zasekne.

    AKTUÁLNÍ KONTEXT Z KALKULAČKY:
    ${hasContext ? JSON.stringify(context, null, 2) : 'Uživatel zatím nic nezadal do kalkulačky.'}

    Odpověz na dotaz uživatele.`;
}

export { handler };

