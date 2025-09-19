// netlify/functions/rates.js - v8.0 - Professional Build
// This function simulates a smart market analysis engine with more detailed data.

const ALL_OFFERS = {
    // Offer data based on user-provided inspiration
    'offer-1': { id: 'offer-1', rates: { 3: { base: 4.59, min: 4.39, max: 5.09 }, 5: { base: 4.39, min: 4.19, max: 4.89 }, 7: { base: 4.49, min: 4.29, max: 4.99 }, 10: { base: 4.69, min: 4.49, max: 5.19 } }, requirements: { minIncome: 25000, minLoan: 300000, maxLTV: 90 }, bestFor: 'Optimální poměr cena/výkon' },
    'offer-2': { id: 'offer-2', rates: { 3: { base: 4.49, min: 4.29, max: 4.99 }, 5: { base: 4.29, min: 4.09, max: 4.79 }, 7: { base: 4.39, min: 4.19, max: 4.89 }, 10: { base: 4.59, min: 4.39, max: 5.09 } }, requirements: { minIncome: 20000, minLoan: 200000, maxLTV: 100 }, bestFor: 'Nejlepší sazba na trhu' },
    'offer-3': { id: 'offer-3', rates: { 3: { base: 4.69, min: 4.49, max: 5.19 }, 5: { base: 4.49, min: 4.29, max: 4.99 }, 7: { base: 4.59, min: 4.39, max: 5.09 }, 10: { base: 4.79, min: 4.59, max: 5.29 } }, requirements: { minIncome: 30000, minLoan: 500000, maxLTV: 85 }, bestFor: 'Ideální pro stabilitu' },
    'offer-4': { id: 'offer-4', rates: { 3: { base: 4.39, min: 4.19, max: 4.89 }, 5: { base: 4.19, min: 3.99, max: 4.69 }, 7: { base: 4.29, min: 4.09, max: 4.79 }, 10: { base: 4.49, min: 4.29, max: 4.99 } }, requirements: { minIncome: 40000, minLoan: 1000000, maxLTV: 80 }, bestFor: 'Prémiová volba pro náročné' },
    'offer-5': { id: 'offer-5', rates: { 3: { base: 4.54, min: 4.34, max: 5.04 }, 5: { base: 4.34, min: 4.14, max: 4.84 }, 7: { base: 4.44, min: 4.24, max: 4.94 }, 10: { base: 4.64, min: 4.44, max: 5.14 } }, requirements: { minIncome: 25000, minLoan: 500000, maxLTV: 90 }, bestFor: 'Rychlé online vyřízení' },
    'offer-6': { id: 'offer-6', rates: { 3: { base: 4.29, min: 4.09, max: 4.79 }, 5: { base: 4.09, min: 3.89, max: 4.59 }, 7: { base: 4.19, min: 3.99, max: 4.69 }, 10: { base: 4.39, min: 4.19, max: 4.89 } }, requirements: { minIncome: 25000, minLoan: 300000, maxLTV: 90 }, bestFor: 'Specialisté na hypotéky' }
};

const handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    try {
        const params = event.queryStringParameters;
        const loanAmount = parseInt(params.loanAmount) || 0;
        const propertyValue = parseInt(params.propertyValue) || 0;
        const income = parseInt(params.income) || 0;
        const fixation = parseInt(params.fixation) || 5;

        if (!loanAmount || !propertyValue) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required parameters' }) };
        }

        const ltv = (loanAmount / propertyValue) * 100;

        const qualifiedOffers = Object.values(ALL_OFFERS)
            .filter(offer => {
                const req = offer.requirements;
                return ltv <= req.maxLTV && loanAmount >= req.minLoan && income >= req.minIncome && offer.rates[fixation];
            })
            .map(offer => {
                const rateInfo = offer.rates[fixation];
                let calculatedRate = rateInfo.base;
                if (ltv <= 70) calculatedRate = rateInfo.min;
                else if (ltv > 80 && ltv <= 90) calculatedRate = Math.min(rateInfo.max, rateInfo.base + 0.3);
                else if (ltv > 90) calculatedRate = rateInfo.max;

                return {
                    id: offer.id,
                    rate: parseFloat(calculatedRate.toFixed(2)),
                    bestFor: offer.bestFor
                };
            })
            .sort((a, b) => a.rate - b.rate);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(qualifiedOffers.slice(0, 3)), // Return top 3 qualified offers
        };
    } catch (error) {
        console.error('Rates function error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};

export { handler };

