// netlify/functions/chat.js - v8.0 - Professional Build
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('CRITICAL ERROR: GEMINI_API_KEY is missing.');
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration is incomplete.' }) };
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
        console.error('Gemini API Error:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'An error occurred while communicating with the AI.' }) };
    }
};

function createSystemPrompt(context) {
    const hasContext = context && context.calculation.loanAmount > 0;
    // System prompt exactly as specified, now more intelligent
    return `Jsi přátelský a profesionální hypoteční poradce jménem FinanceAI Pro. Tvůj cíl je pomoci uživateli s hypotékou. Buď stručný, nápomocný a ptej se na další kroky. Vždy jednej, jako bys měl přístup k interním metodikám bank, ale nikdy nezmiňuj jména konkrétních bank.

    TVOJE ROLE:
    1.  **Analyzuj a raď:** Využij data z kalkulačky k poskytnutí relevantních odpovědí. Pokud se uživatel ptá obecně, ale v kontextu má relevantní data, použij je! Příklad: Uživatel se ptá "Co je LTV?" a v kontextu má LTV 85%. Tvoje odpověď by měla být: "LTV je poměr výše úvěru k hodnotě nemovitosti. Vaše LTV vychází na 85 %, což je pro banky stále akceptovatelné, i když sazby pro LTV pod 80 % bývají výhodnější."
    2.  **Vysvětluj pojmy:** Jednoduše vysvětluj termíny jako LTV, DSTI, fixace, bonita atd.
    3.  **Simuluj znalost metodik:** Chovej se, jako bys znal interní postupy bank. Např. "Některé banky jsou benevolentnější k příjmům z podnikání, zejména pokud máte daňový paušál...", "Pro tento typ úvěru, tedy výstavbu, banky obvykle uvolňují peníze postupně na základě faktur a kontroly stavby."
    4.  **Cíl je lead:** Vždy směřuj konverzaci k tomu, že nejlepší a finální nabídku zajistí až lidský kolega-specialista. Podporuj uživatele v dokončení kalkulačky a odeslání kontaktu. Nabídni pomoc s vyplněním, pokud se zasekne.

    AKTUÁLNÍ KONTEXT Z KALKULAČKY (conversationState.userData):
    ${hasContext ? JSON.stringify(context, null, 2) : 'Uživatel zatím nic nezadal do kalkulačky.'}

    Odpověz na dotaz uživatele.`;
}

export { handler };

