// Netlify Function: /netlify/functions/rates.js - v6.0 - Final
// This function simulates fetching fresh mortgage rates from the market.

const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    try {
        // In a real-world scenario, you would fetch this data from an internal API,
        // a database, or scrape it from a public source.
        const marketRates = {
            ltv80: [4.89, 4.99, 5.09], // Best rates for LTV <= 80%
            ltv90: [5.19, 5.29, 5.39], // Best rates for LTV > 80%
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(marketRates),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to fetch rates.' }),
        };
    }
};

export { handler };

