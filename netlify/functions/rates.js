// Netlify Function: /netlify/functions/rates.js
// Tato funkce simuluje scrapování aktuálních dat z trhu.
const handler = async () => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

    // Simulovaná data, která by se dynamicky měnila.
    const baseRateLTV80 = 4.79;
    const baseRateLTV90 = 5.09;
    const randomFactor = () => (Math.random() - 0.5) * 0.1; // +/- 0.05%

    const rates = {
        ltv80: [
            baseRateLTV80 + randomFactor(),
            baseRateLTV80 + 0.1 + randomFactor(),
            baseRateLTV80 + 0.2 + randomFactor()
        ].sort((a,b) => a-b).map(r => parseFloat(r.toFixed(2))),
        ltv90: [
            baseRateLTV90 + randomFactor(),
            baseRateLTV90 + 0.1 + randomFactor(),
            baseRateLTV90 + 0.2 + randomFactor()
        ].sort((a,b) => a-b).map(r => parseFloat(r.toFixed(2))),
        lastUpdated: new Date().toISOString()
    };
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(rates)
    };
};

export { handler };

