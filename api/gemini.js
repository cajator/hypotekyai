// Tato funkce bude fungovat na Netlify jako "serverless function"
// Její adresa bude: https://nazev-vaseho-webu.netlify.app/api/gemini

exports.handler = async function (event, context) {
    // Povolení pro volání z jakékoliv domény (pro vývoj)
    // V produkci byste měli omezit na vaši doménu
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Netlify vyžaduje zpracování OPTIONS požadavku pro CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    // Získání API klíče z bezpečných proměnných prostředí Netlify
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'API klíč pro Gemini není nastaven.' }),
        };
    }

    // API endpoint pro Gemini
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

    try {
        // Přeposlání dat od klienta na Gemini API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: event.body, // Tělo požadavku od klienta
        });

        if (!response.ok) {
            throw new Error(`Chyba při volání Gemini API: ${response.statusText}`);
        }

        const data = await response.json();

        // Odeslání odpovědi od Gemini zpět klientovi
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Chyba v serverless funkci (gemini):', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

