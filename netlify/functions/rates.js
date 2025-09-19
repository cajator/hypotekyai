// netlify/functions/rates.js - v10.0 - Final Build
const ALL_OFFERS = {
    'offer-1': { id: 'offer-1', rates: { 3: { base: 4.59, min: 4.39, max: 5.09 }, 5: { base: 4.39, min: 4.19, max: 4.89 }, 7: { base: 4.49, min: 4.29, max: 4.99 }, 10: { base: 4.69, min: 4.49, max: 5.19 } }, requirements: { minIncome: 25000, minLoan: 300000, maxLTV: 90 }, bestFor: 'Optimální poměr cena/výkon' },
    'offer-2': { id: 'offer-2', rates: { 3: { base: 4.49, min: 4.29, max: 4.99 }, 5: { base: 4.29, min: 4.09, max: 4.79 }, 7: { base: 4.39, min: 4.19, max: 4.89 }, 10: { base: 4.59, min: 4.39, max: 5.09 } }, requirements: { minIncome: 20000, minLoan: 200000, maxLTV: 100 }, bestFor: 'Nejlepší sazba na trhu' },
    'offer-3': { id: 'offer-3', rates: { 3: { base: 4.69, min: 4.49, max: 5.19 }, 5: { base: 4.49, min: 4.29, max: 4.99 }, 7: { base: 4.59, min: 4.39, max: 5.09 }, 10: { base: 4.79, min: 4.59, max: 5.29 } }, requirements: { minIncome: 30000, minLoan: 500000, maxLTV: 85 }, bestFor: 'Ideální pro stabilitu' },
    'offer-4': { id: 'offer-4', rates: { 3: { base: 4.39, min: 4.19, max: 4.89 }, 5: { base: 4.19, min: 3.99, max: 4.69 }, 7: { base: 4.29, min: 4.09, max: 4.79 }, 10: { base: 4.49, min: 4.29, max: 4.99 } }, requirements: { minIncome: 40000, minLoan: 1000000, maxLTV: 80 }, bestFor: 'Prémiová volba pro náročné' },
    'offer-5': { id: 'offer-5', rates: { 3: { base: 4.54, min: 4.34, max: 5.04 }, 5: { base: 4.34, min: 4.14, max: 4.84 }, 7: { base: 4.44, min: 4.24, max: 4.94 }, 10: { base: 4.64, min: 4.44, max: 5.14 } }, requirements: { minIncome: 25000, minLoan: 500000, maxLTV: 90 }, bestFor: 'Rychlé online vyřízení' },
    'offer-6': { id: 'offer-6', rates: { 3: { base: 4.29, min: 4.09, max: 4.79 }, 5: { base: 4.09, min: 3.89, max: 4.59 }, 7: { base: 4.19, min: 3.99, max: 4.69 }, 10: { base: 4.39, min: 4.19, max: 4.89 } }, requirements: { minIncome: 25000, minLoan: 300000, maxLTV: 90 }, bestFor: 'Specialisté na hypotéky' }
};

const calculateMonthlyPayment = (p, r, t) => (p * (r/100/12) * Math.pow(1 + (r/100/12), t*12)) / (Math.pow(1 + (r/100/12), t*12) - 1);

const handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    try {
        const params = event.queryStringParameters;
        const propertyValue = parseInt(params.propertyValue) || 0;
        const ownResources = parseInt(params.ownResources) || 0;
        const income = parseInt(params.income) || 0;
        const liabilities = parseInt(params.liabilities) || 0;
        const fixation = parseInt(params.fixation) || 5;
        const term = parseInt(params.loanTerm) || 25;
        const age = parseInt(params.age) || 35;
        
        const loanAmount = propertyValue - ownResources;

        if (loanAmount <= 0 || propertyValue <= 0 || income <=0) {
            return { statusCode: 200, headers, body: JSON.stringify({ offers: [], approvability: 0 }) };
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

                const monthlyPayment = calculateMonthlyPayment(loanAmount, calculatedRate, term);
                const dsti = ((monthlyPayment + liabilities) / income) * 100;
                if (dsti > 50) return null;

                return {
                    id: offer.id,
                    rate: parseFloat(calculatedRate.toFixed(2)),
                    bestFor: offer.bestFor,
                    monthlyPayment: Math.round(monthlyPayment)
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.rate - b.rate);
            
        // Simple approvability score
        let approvability = 50;
        if (ltv < 80) approvability += 20; else if (ltv > 90) approvability -= 15;
        if (ltv < 60) approvability += 5;
        const dsti = qualifiedOffers.length > 0 ? ((qualifiedOffers[0].monthlyPayment + liabilities) / income) * 100 : 100;
        if (dsti < 40) approvability += 20; else if (dsti > 45) approvability -=15;
        if (dsti < 30) approvability += 5;
        if (age < 40 && age > 25) approvability += 5;
        approvability = Math.min(99, Math.max(10, Math.round(approvability)));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                offers: qualifiedOffers.slice(0, 3),
                approvability: qualifiedOffers.length > 0 ? approvability : 0
            }),
        };
    } catch (error) {
        console.error('Rates function error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};

export { handler };

