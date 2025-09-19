// netlify/functions/rates.js
// Serverless funkce pro poskytování aktuálních úrokových sazeb a výpočty

// Databáze bank a sazeb
const BANKS_DATA = {
    'ceska-sporitelna': {
        id: 'ceska-sporitelna',
        name: 'Česká spořitelna',
        logo: '🏦',
        color: '#0066CC',
        contact: {
            phone: '800 207 207',
            web: 'www.csas.cz'
        },
        rates: {
            1: { base: 5.29, min: 5.09, max: 5.79 },
            3: { base: 4.59, min: 4.39, max: 5.09 },
            5: { base: 4.39, min: 4.19, max: 4.89 },
            7: { base: 4.49, min: 4.29, max: 4.99 },
            10: { base: 4.69, min: 4.49, max: 5.19 }
        },
        requirements: {
            minIncome: 25000,
            minLoan: 300000,
            maxLoan: 20000000,
            maxLTV: 90,
            maxDSTI: 50
        }
    },
    'csob': {
        id: 'csob',
        name: 'ČSOB',
        logo: '🏛️',
        color: '#E60000',
        contact: {
            phone: '800 300 300',
            web: 'www.csob.cz'
        },
        rates: {
            1: { base: 5.19, min: 4.99, max: 5.69 },
            3: { base: 4.49, min: 4.29, max: 4.99 },
            5: { base: 4.29, min: 4.09, max: 4.79 },
            7: { base: 4.39, min: 4.19, max: 4.89 },
            10: { base: 4.59, min: 4.39, max: 5.09 }
        },
        requirements: {
            minIncome: 20000,
            minLoan: 200000,
            maxLoan: 25000000,
            maxLTV: 100,
            maxDSTI: 50
        }
    },
    'kb': {
        id: 'kb',
        name: 'Komerční banka',
        logo: '🏢',
        color: '#F37021',
        contact: {
            phone: '955 559 559',
            web: 'www.kb.cz'
        },
        rates: {
            1: { base: 5.39, min: 5.19, max: 5.89 },
            3: { base: 4.69, min: 4.49, max: 5.19 },
            5: { base: 4.49, min: 4.29, max: 4.99 },
            7: { base: 4.59, min: 4.39, max: 5.09 },
            10: { base: 4.79, min: 4.59, max: 5.29 }
        },
        requirements: {
            minIncome: 30000,
            minLoan: 500000,
            maxLoan: 30000000,
            maxLTV: 85,
            maxDSTI: 45
        }
    },
    'unicredit': {
        id: 'unicredit',
        name: 'UniCredit Bank',
        logo: '🏪',
        color: '#FF7A00',
        contact: {
            phone: '955 960 960',
            web: 'www.unicreditbank.cz'
        },
        rates: {
            1: { base: 5.09, min: 4.89, max: 5.59 },
            3: { base: 4.39, min: 4.19, max: 4.89 },
            5: { base: 4.19, min: 3.99, max: 4.69 },
            7: { base: 4.29, min: 4.09, max: 4.79 },
            10: { base: 4.49, min: 4.29, max: 4.99 }
        },
        requirements: {
            minIncome: 40000,
            minLoan: 1000000,
            maxLoan: 15000000,
            maxLTV: 80,
            maxDSTI: 40
        }
    },
    'raiffeisen': {
        id: 'raiffeisen',
        name: 'Raiffeisenbank',
        logo: '🏗️',
        color: '#FFE500',
        contact: {
            phone: '800 900 900',
            web: 'www.rb.cz'
        },
        rates: {
            1: { base: 5.24, min: 5.04, max: 5.74 },
            3: { base: 4.54, min: 4.34, max: 5.04 },
            5: { base: 4.34, min: 4.14, max: 4.84 },
            7: { base: 4.44, min: 4.24, max: 4.94 },
            10: { base: 4.64, min: 4.44, max: 5.14 }
        },
        requirements: {
            minIncome: 25000,
            minLoan: 500000,
            maxLoan: 20000000,
            maxLTV: 90,
            maxDSTI: 50
        }
    },
    'hypotecni-banka': {
        id: 'hypotecni-banka',
        name: 'Hypoteční banka',
        logo: '🏠',
        color: '#0033A0',
        contact: {
            phone: '800 100 111',
            web: 'www.hypotecnibanka.cz'
        },
        rates: {
            1: { base: 4.99, min: 4.79, max: 5.49 },
            3: { base: 4.29, min: 4.09, max: 4.79 },
            5: { base: 4.09, min: 3.89, max: 4.59 },
            7: { base: 4.19, min: 3.99, max: 4.69 },
            10: { base: 4.39, min: 4.19, max: 4.89 }
        },
        requirements: {
            minIncome: 25000,
            minLoan: 300000,
            maxLoan: 30000000,
            maxLTV: 90,
            maxDSTI: 50
        }
    }
};

// Hlavní handler
export default async (request, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    try {
        const url = new URL(request.url);
        const params = url.searchParams;
        
        // Různé endpointy
        const endpoint = params.get('endpoint') || 'rates';
        
        switch(endpoint) {
            case 'rates':
                return getRates(params, headers);
            
            case 'calculate':
                return calculateOffers(params, headers);
            
            case 'banks':
                return getBanks(headers);
            
            case 'best-offers':
                return getBestOffers(params, headers);
            
            default:
                return getRates(params, headers);
        }
        
    } catch (error) {
        console.error('Rates API error:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), { 
            status: 500, 
            headers 
        });
    }
};

// Získat aktuální sazby
function getRates(params, headers) {
    const bankId = params.get('bank');
    const fixation = params.get('fixation');
    
    let result = {
        lastUpdated: new Date().toISOString(),
        rates: {}
    };
    
    if (bankId && BANKS_DATA[bankId]) {
        // Konkrétní banka
        const bank = BANKS_DATA[bankId];
        if (fixation && bank.rates[fixation]) {
            result.rates = bank.rates[fixation];
        } else {
            result.rates = bank.rates;
        }
    } else {
        // Všechny banky
        Object.keys(BANKS_DATA).forEach(id => {
            const bank = BANKS_DATA[id];
            result.rates[id] = {
                name: bank.name,
                rates: fixation ? bank.rates[fixation] : bank.rates
            };
        });
    }
    
    return new Response(JSON.stringify(result), { 
        status: 200, 
        headers 
    });
}

// Vypočítat nabídky
function calculateOffers(params, headers) {
    const loanAmount = parseInt(params.get('amount')) || 0;
    const propertyValue = parseInt(params.get('value')) || 0;
    const term = parseInt(params.get('term')) || 25;
    const fixation = parseInt(params.get('fixation')) || 5;
    const income = parseInt(params.get('income')) || 0;
    
    if (!loanAmount || !propertyValue) {
        return new Response(JSON.stringify({
            error: 'Missing required parameters'
        }), { 
            status: 400, 
            headers 
        });
    }
    
    const ltv = (loanAmount / propertyValue) * 100;
    const offers = [];
    
    Object.values(BANKS_DATA).forEach(bank => {
        // Kontrola požadavků banky
        if (ltv > bank.requirements.maxLTV) return;
        if (loanAmount < bank.requirements.minLoan) return;
        if (loanAmount > bank.requirements.maxLoan) return;
        if (income && income < bank.requirements.minIncome) return;
        
        // Získat sazbu
        const rateInfo = bank.rates[fixation];
        if (!rateInfo) return;
        
        // Výpočet sazby podle LTV a bonity
        let rate = rateInfo.base;
        
        // LTV adjustment
        if (ltv < 60) {
            rate = rateInfo.min;
        } else if (ltv > 80) {
            rate = Math.min(rateInfo.max, rate + 0.3);
        }
        
        // Income adjustment
        if (income > 100000) {
            rate -= 0.1;
        } else if (income < 30000) {
            rate += 0.1;
        }
        
        // Ensure rate is within bounds
        rate = Math.max(rateInfo.min, Math.min(rateInfo.max, rate));
        
        // Výpočet splátky
        const monthlyRate = rate / 100 / 12;
        const n = term * 12;
        const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / 
                               (Math.pow(1 + monthlyRate, n) - 1);
        
        // DSTI výpočet
        const dsti = income ? (monthlyPayment / income * 100) : null;
        
        // Doporučení
        let bestFor = '';
        if (rate === rateInfo.min) {
            bestFor = 'Nejnižší sazba';
        } else if (ltv <= 70) {
            bestFor = 'Nízké LTV';
        } else if (income > 80000) {
            bestFor = 'Vysoké příjmy';
        } else if (bank.requirements.maxLTV === 100) {
            bestFor = '100% financování';
        } else {
            bestFor = 'Standardní hypotéka';
        }
        
        offers.push({
            bankId: bank.id,
            bankName: bank.name,
            bankLogo: bank.logo,
            bankColor: bank.color,
            rate: parseFloat(rate.toFixed(2)),
            monthlyPayment: Math.round(monthlyPayment),
            totalPaid: Math.round(monthlyPayment * n),
            totalInterest: Math.round(monthlyPayment * n - loanAmount),
            ltv: ltv.toFixed(1),
            dsti: dsti ? dsti.toFixed(1) : null,
            approved: !dsti || dsti <= bank.requirements.maxDSTI,
            contact: bank.contact,
            bestFor: bestFor
        });
    });
    
    // Seřadit podle sazby
    offers.sort((a, b) => a.rate - b.rate);
    
    return new Response(JSON.stringify({
        parameters: {
            loanAmount,
            propertyValue,
            ltv: ltv.toFixed(1),
            term,
            fixation,
            income
        },
        offers: offers.slice(0, 5), // Top 5 nabídek
        bestOffer: offers[0],
        totalOffers: offers.length
    }), { 
        status: 200, 
        headers 
    });
}

// Seznam bank
function getBanks(headers) {
    const banks = Object.values(BANKS_DATA).map(bank => ({
        id: bank.id,
        name: bank.name,
        logo: bank.logo,
        color: bank.color,
        contact: bank.contact,
        requirements: bank.requirements
    }));
    
    return new Response(JSON.stringify({
        banks,
        total: banks.length,
        lastUpdated: new Date().toISOString()
    }), { 
        status: 200, 
        headers 
    });
}

// Nejlepší nabídky
function getBestOffers(params, headers) {
    const fixation = parseInt(params.get('fixation')) || 5;
    const offers = [];
    
    Object.values(BANKS_DATA).forEach(bank => {
        const rateInfo = bank.rates[fixation];
        if (!rateInfo) return;
        
        offers.push({
            bankName: bank.name,
            rate: rateInfo.min,
            contact: bank.contact
        });
    });
    
    offers.sort((a, b) => a.rate - b.rate);
    
    return new Response(JSON.stringify({
        fixation,
        topOffers: offers.slice(0, 3),
        lowestRate: offers[0]?.rate || null,
        averageRate: (offers.reduce((sum, o) => sum + o.rate, 0) / offers.length).toFixed(2)
    }), { 
        status: 200, 
        headers 
    });
}
