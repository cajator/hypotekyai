// rates.js - Databáze bank a úrokových sazeb
// Hypotéka AI - Version 2.0

export const BANKS_DATA = {
    'ceska-sporitelna': {
        id: 'ceska-sporitelna',
        name: 'Česká spořitelna',
        logo: '🏦',
        color: '#0066CC',
        rates: {
            1: { base: 5.29, min: 5.09, max: 5.79 },
            3: { base: 4.59, min: 4.39, max: 5.09 },
            5: { base: 4.39, min: 4.19, max: 4.89 },
            7: { base: 4.49, min: 4.29, max: 4.99 },
            10: { base: 4.69, min: 4.49, max: 5.19 }
        },
        ltvAdjustments: {
            50: -0.2,
            60: -0.1,
            70: 0,
            80: 0.1,
            90: 0.3,
            100: 0.5
        },
        minLoan: 300000,
        maxLoan: 20000000,
        minLTV: 0,
        maxLTV: 90,
        fees: {
            arrangement: 0.005, // 0.5% z úvěru
            valuation: 4000,
            administration: 150 // měsíčně
        }
    },
    'csob': {
        id: 'csob',
        name: 'ČSOB',
        logo: '🏛️',
        color: '#E60000',
        rates: {
            1: { base: 5.19, min: 4.99, max: 5.69 },
            3: { base: 4.49, min: 4.29, max: 4.99 },
            5: { base: 4.29, min: 4.09, max: 4.79 },
            7: { base: 4.39, min: 4.19, max: 4.89 },
            10: { base: 4.59, min: 4.39, max: 5.09 }
        },
        ltvAdjustments: {
            50: -0.15,
            60: -0.1,
            70: 0,
            80: 0.15,
            90: 0.35,
            100: 0.6
        },
        minLoan: 200000,
        maxLoan: 25000000,
        minLTV: 0,
        maxLTV: 100,
        fees: {
            arrangement: 0,
            valuation: 3500,
            administration: 200
        }
    },
    'kb': {
        id: 'kb',
        name: 'Komerční banka',
        logo: '🏢',
        color: '#F37021',
        rates: {
            1: { base: 5.39, min: 5.19, max: 5.89 },
            3: { base: 4.69, min: 4.49, max: 5.19 },
            5: { base: 4.49, min: 4.29, max: 4.99 },
            7: { base: 4.59, min: 4.39, max: 5.09 },
            10: { base: 4.79, min: 4.59, max: 5.29 }
        },
        ltvAdjustments: {
            50: -0.25,
            60: -0.15,
            70: 0,
            80: 0.2,
            90: 0.4,
            100: 0.7
        },
        minLoan: 250000,
        maxLoan: 30000000,
        minLTV: 0,
        maxLTV: 85,
        fees: {
            arrangement: 0.007,
            valuation: 4500,
            administration: 150
        }
    },
    'unicredit': {
        id: 'unicredit',
        name: 'UniCredit Bank',
        logo: '🏪',
        color: '#FF7A00',
        rates: {
            1: { base: 5.09, min: 4.89, max: 5.59 },
            3: { base: 4.39, min: 4.19, max: 4.89 },
            5: { base: 4.19, min: 3.99, max: 4.69 },
            7: { base: 4.29, min: 4.09, max: 4.79 },
            10: { base: 4.49, min: 4.29, max: 4.99 }
        },
        ltvAdjustments: {
            50: -0.3,
            60: -0.2,
            70: -0.1,
            80: 0.1,
            90: 0.3,
            100: 0.5
        },
        minLoan: 500000,
        maxLoan: 15000000,
        minLTV: 0,
        maxLTV: 80,
        fees: {
            arrangement: 0.01,
            valuation: 5000,
            administration: 0
        }
    },
    'raiffeisen': {
        id: 'raiffeisen',
        name: 'Raiffeisenbank',
        logo: '🏗️',
        color: '#FFE500',
        rates: {
            1: { base: 5.24, min: 5.04, max: 5.74 },
            3: { base: 4.54, min: 4.34, max: 5.04 },
            5: { base: 4.34, min: 4.14, max: 4.84 },
            7: { base: 4.44, min: 4.24, max: 4.94 },
            10: { base: 4.64, min: 4.44, max: 5.14 }
        },
        ltvAdjustments: {
            50: -0.2,
            60: -0.1,
            70: 0,
            80: 0.15,
            90: 0.35,
            100: 0.55
        },
        minLoan: 300000,
        maxLoan: 20000000,
        minLTV: 0,
        maxLTV: 90,
        fees: {
            arrangement: 0.004,
            valuation: 3800,
            administration: 180
        }
    },
    'hypotecni-banka': {
        id: 'hypotecni-banka',
        name: 'Hypoteční banka',
        logo: '🏠',
        color: '#0033A0',
        rates: {
            1: { base: 4.99, min: 4.79, max: 5.49 },
            3: { base: 4.29, min: 4.09, max: 4.79 },
            5: { base: 4.09, min: 3.89, max: 4.59 },
            7: { base: 4.19, min: 3.99, max: 4.69 },
            10: { base: 4.39, min: 4.19, max: 4.89 }
        },
        ltvAdjustments: {
            50: -0.25,
            60: -0.15,
            70: 0,
            80: 0.2,
            90: 0.4,
            100: 0.6
        },
        minLoan: 300000,
        maxLoan: 30000000,
        minLTV: 0,
        maxLTV: 90,
        fees: {
            arrangement: 0,
            valuation: 4000,
            administration: 150
        }
    }
};

// Funkce pro výpočet úrokové sazby
export function calculateInterestRate(bankId, fixation, ltv, amount, income) {
    const bank = BANKS_DATA[bankId];
    if (!bank || !bank.rates[fixation]) return null;
    
    // Základní sazba
    let rate = bank.rates[fixation].base;
    
    // LTV adjustment
    const ltvKey = Math.ceil(ltv / 10) * 10; // Round up to nearest 10
    const ltvAdjustment = bank.ltvAdjustments[Math.min(ltvKey, 100)] || 0;
    rate += ltvAdjustment;
    
    // Amount adjustment
    if (amount < 1000000) {
        rate += 0.2; // Malé úvěry jsou dražší
    } else if (amount > 5000000) {
        rate -= 0.1; // Velké úvěry mohou mít slevu
    }
    
    // Income/bonita adjustment
    const monthlyPayment = calculateMonthlyPayment(amount, rate, 25);
    const dsti = (monthlyPayment / income) * 100;
    
    if (dsti < 30) {
        rate -= 0.1; // Výborná bonita
    } else if (dsti > 45) {
        rate += 0.2; // Horší bonita
    }
    
    // Ensure rate is within min/max bounds
    const rateInfo = bank.rates[fixation];
    rate = Math.max(rateInfo.min, Math.min(rateInfo.max, rate));
    
    return rate;
}

// Pomocná funkce pro výpočet měsíční splátky
export function calculateMonthlyPayment(principal, annualRate, years) {
    const monthlyRate = annualRate / 100 / 12;
    const n = years * 12;
    
    if (monthlyRate === 0) return principal / n;
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / 
           (Math.pow(1 + monthlyRate, n) - 1);
}

// Získat nejlepší nabídky
export function getBestOffers(loanAmount, propertyValue, loanTerm, fixation, monthlyIncome) {
    const ltv = (loanAmount / propertyValue) * 100;
    const offers = [];
    
    for (const [bankId, bank] of Object.entries(BANKS_DATA)) {
        // Kontrola limitů
        if (loanAmount < bank.minLoan || loanAmount > bank.maxLoan) continue;
        if (ltv > bank.maxLTV) continue;
        
        const rate = calculateInterestRate(bankId, fixation, ltv, loanAmount, monthlyIncome);
        if (!rate) continue;
        
        const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
        const totalPaid = monthlyPayment * loanTerm * 12;
        const totalInterest = totalPaid - loanAmount;
        const arrangementFee = loanAmount * bank.fees.arrangement;
        const totalCost = totalPaid + arrangementFee + bank.fees.valuation;
        
        offers.push({
            bankId,
            bankName: bank.name,
            bankLogo: bank.logo,
            bankColor: bank.color,
            rate,
            monthlyPayment,
            totalPaid,
            totalInterest,
            arrangementFee,
            valuationFee: bank.fees.valuation,
            administrationFee: bank.fees.administration,
            totalCost,
            ltv,
            dsti: (monthlyPayment / monthlyIncome) * 100
        });
    }
    
    // Seřadit podle nejnižší sazby
    offers.sort((a, b) => a.rate - b.rate);
    
    return offers;
}

// Export default pro kompatibilitu
export default {
    BANKS_DATA,
    calculateInterestRate,
    calculateMonthlyPayment,
    getBestOffers
};