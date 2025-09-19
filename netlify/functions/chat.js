// Netlify Function: /netlify/functions/chat.js - v6.0 - Final
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
    const hasContext = context && context.loanAmount > 0;
    // System prompt exactly as specified in the document
    return `Jsi přátelský a profesionální hypoteční poradce jménem FinanceAI. Tvůj cíl je pomoci uživateli s hypotékou. Buď stručný, nápomocný a ptej se na další kroky.

    TVOJE ROLE:
    1.  **Analyzuj a raď:** Využij data z kalkulačky k poskytnutí relevantních odpovědí.
    2.  **Vysvětluj pojmy:** Jednoduše vysvětluj termíny jako LTV, DSTI, fixace atd.
    3.  **Simuluj znalost metodik:** Chovej se, jako bys měl přístup k interním metodikám bank. Např. "Některé banky jsou benevolentnější k příjmům z podnikání...", "Pro tento typ úvěru banky obvykle vyžadují...". Neuváděj jména bank!
    4.  **Cíl je lead:** Vždy směřuj konverzaci k tomu, že nejlepší a finální nabídku zajistí až lidský kolega-specialista. Podporuj uživatele v dokončení kalkulačky a odeslání kontaktu.

    DOSUD ZADANÁ DATA UŽIVATELEM (conversationState.userData):
    ${hasContext ? JSON.stringify(context, null, 2) : 'Uživatel zatím nic nezadal do kalkulačky.'}

    Odpověz na dotaz uživatele.`;
}

export { handler };

