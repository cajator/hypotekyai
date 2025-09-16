// Tato funkce bude fungovat na Netlify jako "serverless function"
// Její adresa bude: https://nazev-vaseho-webu.netlify.app/api/submit-lead

exports.handler = async function (event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    // Získání URL a autorizačního tokenu pro CRM z proměnných prostředí
    const CRM_ENDPOINT_URL = process.env.CRM_ENDPOINT_URL;
    const CRM_AUTH_TOKEN = process.env.CRM_AUTH_TOKEN;

    if (!CRM_ENDPOINT_URL || !CRM_AUTH_TOKEN) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Nastavení pro CRM není kompletní.' }),
        };
    }

    try {
        const leadData = JSON.parse(event.body);

        // Zde můžete data ještě upravit nebo validovat před odesláním
        const crmPayload = {
            source: 'HypotekaAI-kalkulacka',
            contact: {
                name: leadData.name,
                email: leadData.email,
                phone: leadData.phone,
                city: leadData.city
            },
            mortgageDetails: leadData.calculation,
            timestamp: new Date().toISOString()
        };

        // Odeslání dat do vašeho CRM
        const response = await fetch(CRM_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': CRM_AUTH_TOKEN, // Např. 'Bearer vas-token'
            },
            body: JSON.stringify(crmPayload),
        });

        if (!response.ok) {
            throw new Error(`Chyba při odesílání dat do CRM: ${response.statusText}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Lead úspěšně odeslán.' }),
        };

    } catch (error) {
        console.error('Chyba v serverless funkci (submit-lead):', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

