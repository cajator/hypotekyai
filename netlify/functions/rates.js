// netlify/functions/rates.js - v11.0 - Final Build
const ALL_OFFERS = {
    'offer-1': { id: 'offer-1', rates: { 3: { base: 4.59, min: 4.39, max: 5.09 }, 5: { base: 4.39, min: 4.19, max: 4.89 }, 7: { base: 4.49, min: 4.29, max: 4.99 }, 10: { base: 4.69, min: 4.49, max: 5.19 } }, requirements: { minIncome: 25000, minLoan: 300000, maxLTV: 90 }, type: "standard" },
    'offer-2': { id: 'offer-2', rates: { 3: { base: 4.49, min: 4.29, max: 4.99 }, 5: { base: 4.29, min: 4.09, max: 4.79 }, 7: { base: 4.39, min: 4.19, max: 4.89 }, 10: { base: 4.59, min: 4.39, max: 5.09 } }, requirements: { minIncome: 20000, minLoan: 200000, maxLTV: 100 }, type: "best-rate" },
    'offer-3': { id: 'offer-3', rates: { 3: { base: 4.69, min: 4.49, max: 5.19 }, 5: { base: 4.49, min: 4.29, max: 4.99 }, 7: { base: 4.59, min: 4.39, max: 5.09 }, 10: { base: 4.79, min: 4.59, max: 5.29 } }, requirements: { minIncome: 30000, minLoan: 500000, maxLTV: 85 }, type: "approvability" },
    'offer-4': { id: 'offer-4', rates: { 3: { base: 4.39, min: 4.19, max: 4.89 }, 5: { base: 4.19, min: 3.99, max: 4.69 }, 7: { base: 4.29, min: 4.09, max: 4.79 }, 10: { base: 4.49, min: 4.29, max: 4.99 } }, requirements: { minIncome: 40000, minLoan: 1000000, maxLTV: 80 }, type: "best-rate" },
    'offer-5': { id: 'offer-5', rates: { 3: { base: 4.54, min: 4.34, max: 5.04 }, 5: { base: 4.34, min: 4.14, max: 4.84 }, 7: { base: 4.44, min: 4.24, max: 4.94 }, 10: { base: 4.64, min: 4.44, max: 5.14 } }, requirements: { minIncome: 25000, minLoan: 500000, maxLTV: 90 }, type: "standard" },
    'offer-6': { id: 'offer-6', rates: { 3: { base: 4.89, min: 4.69, max: 5.39 }, 5: { base: 4.79, min: 4.59, max: 5.29 }, 7: { base: 4.89, min: 4.69, max: 5.39 }, 10: { base: 4.99, min: 4.79, max: 5.49 } }, requirements: { minIncome: 18000, minLoan: 200000, maxLTV: 95 }, type: "approvability" }
};

const calculateMonthlyPayment = (p, r, t) => (p * (r/100/12) * Math.pow(1 + (r/100/12), t*12)) / (Math.pow(1 + (r/100/12), t*12) - 1);

const handler = async (event) => {
    const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    try {
        const params = event.queryStringParameters;
        // Parse all params with defaults
        const purpose = params.purpose || 'koupě';
        let propertyValue = parseInt(params.propertyValue) || 0;
        let ownResources = parseInt(params.ownResources) || 0;
        const income = parseInt(params.income) || 0;
        const liabilities = parseInt(params.liabilities) || 0;
        const fixation = parseInt(params.fixation) || 5;
        const term = parseInt(params.loanTerm) || 25;
        const age = parseInt(params.age) || 35;
        const landValue = parseInt(params.landValue) || 0;
        const constructionBudget = parseInt(params.constructionBudget) || 0;
        const loanBalance = parseInt(params.loanBalance) || 0;
        let finalPropertyValue = propertyValue;
        let loanAmount = 0;

        // Adjust values based on purpose
        switch(purpose) {
            case 'výstavba':
                finalPropertyValue = landValue + constructionBudget;
                ownResources = landValue; 
                loanAmount = constructionBudget;
                break;
            case 'rekonstrukce':
                finalPropertyValue = propertyValue + constructionBudget;
                loanAmount = constructionBudget;
                break;
            case 'refinancování':
                loanAmount = loanBalance;
                break;
            default: // koupě
                loanAmount = propertyValue - ownResources;
                break;
        }
        
        if (loanAmount <= 0 || finalPropertyValue <= 0 || income <=0) {
            return { statusCode: 200, headers, body: JSON.stringify({ offers: [], approvability: 0, dsti: 0 }) };
        }

        const ltv = (loanAmount / finalPropertyValue) * 100;

        const allQualifiedOffers = Object.values(ALL_OFFERS)
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
                    bestFor: `Ideální pro: ${offer.type}`,
                    monthlyPayment: Math.round(monthlyPayment),
                    type: offer.type,
                    dsti: dsti,
                };
            })
            .filter(Boolean);

        const bestRateOffer = allQualifiedOffers.filter(o => o.type === 'best-rate').sort((a,b) => a.rate - b.rate)[0];
        const standardOffer = allQualifiedOffers.filter(o => o.type === 'standard').sort((a,b) => a.rate - b.rate)[0];
        const approvabilityOffer = allQualifiedOffers.filter(o => o.type === 'approvability').sort((a,b) => a.rate - b.rate)[0];

        const finalOffers = [];
        if(bestRateOffer) finalOffers.push({...bestRateOffer, bestFor: "Nejvýhodnější sazba"});
        if(standardOffer) finalOffers.push({...standardOffer, bestFor: "Zlatá střední cesta"});
        if(approvabilityOffer) finalOffers.push({...approvabilityOffer, bestFor: "Nejvyšší schvalitelnost"});

        const uniqueOffers = [...new Map(finalOffers.map(item => [item['id'], item])).values()].slice(0,3);

        const bestOffer = uniqueOffers[0];
        const finalDsti = bestOffer ? bestOffer.dsti : 0;
        
        let approvability = 50;
        if (ltv < 80) approvability += 20; else if (ltv > 90) approvability -= 15;
        if (ltv < 60) approvability += 5;
        if (finalDsti < 40) approvability += 20; else if (finalDsti > 45) approvability -=15;
        if (finalDsti < 30) approvability += 5;
        if (age < 40 && age > 25) approvability += 5;
        approvability = Math.min(99, Math.max(10, Math.round(approvability)));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                offers: uniqueOffers,
                approvability: uniqueOffers.length > 0 ? approvability : 0,
                dsti: finalDsti,
                loanAmount,
                ltv
            }),
        };
    } catch (error) {
        console.error('Rates function error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Internal server error: ${error.message}` }) };
    }
};

export { handler };

