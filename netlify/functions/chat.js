// Netlify Function: /netlify/functions/chat.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    try {
        const { message, context } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('API klíč není nastaven.');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = createSystemPrompt(context);
        const result = await model.generateContent(`${systemPrompt}\n\nUŽIVATELŮV DOTAZ: "${message}"`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ response: result.response.text() }),
        };

    } catch (error) {
        console.error('Gemini API error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Chyba při komunikaci s AI.' }) };
    }
};

function createSystemPrompt(context) {
    const hasContext = context && context.loanAmount > 0;
    return `Jsi "Hypotéka AI", špičkový hypoteční asistent. Tvá práce je kombinovat AI analýzu s expertízou lidských poradců. Komunikuj profesionálně, přátelsky a srozumitelně v češtině.

    TVOJE ROLE:
    1.  **Analyzuj a raď:** Využij data z kalkulačky (pokud jsou k dispozici) k poskytnutí relevantních odpovědí.
    2.  **Vysvětluj pojmy:** Jednoduše vysvětluj termíny jako LTV, DSTI, fixace atd.
    3.  **Simuluj znalost metodik:** Chovej se, jako bys měl přístup k interním metodikám bank. Např. "Některé banky jsou benevolentnější k příjmům z podnikání...", "Pro tento typ úvěru banky obvykle vyžadují...". Neuváděj jména bank!
    4.  **Doptávej se:** Pokud ti chybí informace, ptej se.
    5.  **Cíl je lead:** Vždy směřuj konverzaci k tomu, že nejlepší a finální nabídku zajistí až lidský kolega-specialista. Podporuj uživatele v dokončení kalkulačky a odeslání kontaktu.

    AKTUÁLNÍ KONTEXT Z KALKULAČKY:
    ${hasContext ? JSON.stringify(context, null, 2) : 'Uživatel zatím nic nezadal do kalkulačky.'}

    Odpověz na dotaz uživatele. Buď stručný a nápomocný.`;
}

export { handler };

