document.addEventListener('DOMContentLoaded', function() {
    
    // --- DATABASE & CONFIG ---
    const rateDatabase = {
        fixations: {
            "3": [ { ltv: 80, rates: { best: 4.19, likely: 4.39, worst: 4.69 } }, { ltv: 90, rates: { best: 4.69, likely: 4.89, worst: 5.19 } } ],
            "5": [ { ltv: 80, rates: { best: 3.99, likely: 4.29, worst: 4.59 } }, { ltv: 90, rates: { best: 4.49, likely: 4.79, worst: 5.09 } } ],
            "7": [ { ltv: 80, rates: { best: 4.09, likely: 4.39, worst: 4.69 } }, { ltv: 90, rates: { best: 4.59, likely: 4.89, worst: 5.19 } } ],
            "10": [ { ltv: 80, rates: { best: 4.19, likely: 4.49, worst: 4.79 } }, { ltv: 90, rates: { best: 4.69, likely: 4.99, worst: 5.29 } } ]
        },
        lastUpdated: new Date()
    };
    
    // --- STATE MANAGEMENT ---
    let currentStep = 1;
    const totalSteps = 5;
    const state = {
        intent: 'koupě', propertyValue: 5000000, ownResources: 1000000,
        refinanceLoanBalance: 3500000, refinancePropertyValue: 6000000,
        landPrice: 2000000, constructionBudget: 4000000, constructionOwnResources: 1000000,
        city: '',
        loanTerm: 25, fixation: 5, monthlyIncome: null, monthlyLiabilities: 0,
    };

    // --- ELEMENT SELECTORS ---
    const modeButtons = document.querySelectorAll('.mode-btn');
    const calculatorMode = document.getElementById('calculator-mode');
    const aiMode = document.getElementById('ai-mode');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const intentButtons = document.querySelectorAll('.intent-btn');
    const inputs = {
        propertyValue: document.getElementById('propertyValue'), ownResources: document.getElementById('ownResources'),
        refinanceLoanBalance: document.getElementById('refinanceLoanBalance'), refinancePropertyValue: document.getElementById('refinancePropertyValue'),
        landPrice: document.getElementById('landPrice'), constructionBudget: document.getElementById('constructionBudget'),
        constructionOwnResources: document.getElementById('constructionOwnResources'),
        city: document.getElementById('city'),
        loanTerm: document.getElementById('loanTerm'), fixation: document.getElementById('fixation'),
        monthlyIncome: document.getElementById('monthlyIncome'), monthlyLiabilities: document.getElementById('monthlyLiabilities'),
    };
    const inputGroups = {
        purchase: document.getElementById('purchase-inputs'), construction: document.getElementById('construction-inputs'),
        refinancing: document.getElementById('refinancing-inputs'),
    };
    const displays = {
        monthlyPayment: document.getElementById('monthly-payment-display'), ltv: document.getElementById('ltv-display'),
        loanAmount: document.getElementById('loan-amount-display'), dsti: document.getElementById('dsti-display'),
        dstiResult: document.getElementById('dsti-result'), dstiTip: document.getElementById('dsti-tip'),
    };
    const leadForm = document.getElementById('lead-form');
    
    // --- UI FUNCTIONS ---
    function switchMode(mode) {
        calculatorMode.classList.toggle('hidden', mode !== 'calculator');
        aiMode.classList.toggle('hidden', mode !== 'ai');
        modeButtons.forEach(btn => {
            const isSelected = btn.dataset.mode === mode;
            btn.classList.toggle('border-blue-600', isSelected); btn.classList.toggle('text-blue-600', isSelected);
            btn.classList.toggle('border-transparent', !isSelected); btn.classList.toggle('text-gray-500', !isSelected);
        });
    }

    function updateUI() {
        document.querySelectorAll('.timeline-step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.toggle('active', stepNumber === currentStep);
            step.classList.toggle('completed', stepNumber < currentStep);
        });
        document.getElementById('timeline-progress').style.width = `${((currentStep - 1) / (totalSteps - 1)) * 100}%`;

        document.querySelectorAll('.form-section').forEach(section => section.classList.remove('active'));
        document.getElementById(`section-${currentStep}`)?.classList.add('active');

        prevBtn.classList.toggle('hidden', currentStep === 1);
        nextBtn.textContent = currentStep === totalSteps - 1 ? 'Zobrazit analýzu' : (currentStep === totalSteps ? 'Začít znovu' : 'Další');
        document.getElementById('navigation-buttons').classList.toggle('hidden', currentStep === 1 && state.intent === null);
        
        if (currentStep === totalSteps) {
            prevBtn.classList.remove('hidden');
            nextBtn.textContent = 'Začít znovu';
        }
        if (currentStep === 4) generateAnalysis();
    }
    
    function navigate(direction) {
        if (nextBtn.textContent === 'Začít znovu') {
            currentStep = 1; leadForm.reset(); document.getElementById('form-success').classList.add('hidden');
            leadForm.style.display = 'block';
        } else {
            currentStep = Math.max(1, Math.min(totalSteps, currentStep + direction));
        }
        updateUI();
    }

    function setIntent(intent) {
        state.intent = intent;
        Object.values(inputGroups).forEach(group => group.classList.add('hidden'));
        const purchaseLabel = inputGroups.purchase.querySelector('label[for="propertyValue"]');
        const resourcesLabel = inputGroups.purchase.querySelector('label[for="ownResources"]');
        
        if (intent === 'koupě' || intent === 'investice' || intent === 'rekonstrukce') {
             inputGroups.purchase.classList.remove('hidden');
             if (intent === 'rekonstrukce'){
                purchaseLabel.textContent = "Hodnota nemovitosti po rekonstrukci";
                resourcesLabel.textContent = "Částka rekonstrukce";
             } else {
                purchaseLabel.textContent = "Cena nemovitosti (Kč)";
                resourcesLabel.textContent = "Vlastní zdroje (Kč)";
             }
        } else if (intent === 'výstavba') inputGroups.construction.classList.remove('hidden');
        else if (intent === 'refinancování') inputGroups.refinancing.classList.remove('hidden');
        updateCalculations();
    }

    // --- CALCULATION FUNCTIONS ---
    function parseNumericInput(value) {
        if (typeof value !== 'string') return value;
        let numStr = value.toLowerCase().replace(/\s/g, '').replace(',', '.').match(/[\d.]+/g)?.[0] || '';
        let num = parseFloat(numStr);
        if (value.includes('m')) num *= 1000000;
        else if (value.includes('k')) num *= 1000;
        return isNaN(num) ? null : num;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    }
    
    function getInterestRates(ltv, fixation) {
        const rates = rateDatabase.fixations[fixation] || rateDatabase.fixations["5"];
        return (rates.find(r => ltv <= r.ltv) || rates[rates.length - 1]).rates;
    }

    function calculateMonthlyPayment(principal, annualRate, years) {
        if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
        const monthlyRate = (annualRate / 100) / 12;
        const n = years * 12;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    }
    
    function getCalculationData() {
        let loanAmount = 0, propertyValueForLtv = 0;
        switch(state.intent) {
            case 'koupě': case 'investice':
                loanAmount = state.propertyValue - state.ownResources;
                propertyValueForLtv = state.propertyValue;
                break;
            case 'rekonstrukce':
                loanAmount = state.ownResources; propertyValueForLtv = state.propertyValue;
                break;
            case 'výstavba':
                propertyValueForLtv = state.landPrice + state.constructionBudget;
                loanAmount = propertyValueForLtv - state.constructionOwnResources;
                break;
            case 'refinancování':
                loanAmount = state.refinanceLoanBalance; propertyValueForLtv = state.refinancePropertyValue;
                break;
        }
        if (loanAmount <= 0 || propertyValueForLtv <= 0) return null;
        const ltv = (loanAmount / propertyValueForLtv) * 100;
        return { loanAmount, propertyValueForLtv, ltv };
    }

    function generateAmortizationData(principal, annualRate, years) {
        const monthlyPayment = calculateMonthlyPayment(principal, annualRate, years);
        if (monthlyPayment <= 0) return { balances: [], labels: [] };
        let balance = principal;
        const monthlyRate = (annualRate / 100) / 12;
        const balances = [principal];
        const labels = [0];
        for (let year = 1; year <= years; year++) {
            for (let month = 1; month <= 12; month++) {
                balance -= (monthlyPayment - (balance * monthlyRate));
            }
            balances.push(balance > 0 ? balance : 0);
            labels.push(year);
        }
        return { balances, labels };
    }


    function updateCalculations() {
        Object.keys(inputs).forEach(key => {
            const inputElement = inputs[key];
            if (!inputElement) return;
            const val = inputElement.type === 'select-one' ? parseInt(inputElement.value) : (inputElement.id.toLowerCase().includes('city') ? inputElement.value : parseNumericInput(inputElement.value));
            if (val !== null && val !== '') state[key] = val;
        });
        
        const calcData = getCalculationData();
        if (!calcData) return;

        const { loanAmount, ltv } = calcData;
        const rates = getInterestRates(ltv, state.fixation);
        const monthlyPayment = calculateMonthlyPayment(loanAmount, rates.likely, state.loanTerm);

        displays.monthlyPayment.textContent = formatCurrency(monthlyPayment);
        displays.ltv.textContent = `${ltv.toFixed(1)}%`;
        displays.loanAmount.textContent = formatCurrency(loanAmount);

        if (state.monthlyIncome > 0) {
            const dsti = ((monthlyPayment + state.monthlyLiabilities) / state.monthlyIncome) * 100;
            displays.dsti.textContent = `${dsti.toFixed(1)}%`;
            displays.dstiResult.classList.remove('hidden');
            let tip = "Vaše DSTI je v optimálním rozmezí."; let colors = 'bg-green-100 border-green-300';
            if (dsti > 50) { tip = "Vaše DSTI je vysoké. Banky obvykle vyžadují DSTI pod 50%."; colors = 'bg-red-100 border-red-300'; }
            else if (dsti > 40) { tip = "Vaše DSTI je na hranici. Některé banky mohou být opatrnější."; colors = 'bg-yellow-100 border-yellow-300'; }
            displays.dstiTip.textContent = tip; displays.dstiResult.className = `mt-8 p-4 border rounded-lg text-center ${colors}`;
        } else displays.dstiResult.classList.add('hidden');
    }

    function generateAnalysis(selectedOfferIndex = 1) { // Default to 'likely' offer
        const calcData = getCalculationData();
        if (!calcData) return;

        const { loanAmount, ltv } = calcData;
        const rates = getInterestRates(ltv, state.fixation);
        const offers = [
            { name: "Nejlepší nabídka", rate: rates.best, benefit: "Pro klienty s nejlepší bonitou" },
            { name: "Pravděpodobná nabídka", rate: rates.likely, benefit: "Nejčastější scénář" },
            { name: "Nabídka Jistota", rate: rates.worst, benefit: "Konzervativní odhad" },
        ];

        document.getElementById('analysis-results').innerHTML = offers.map((offer, index) => {
            const monthlyPayment = calculateMonthlyPayment(loanAmount, offer.rate, state.loanTerm);
            const borderClass = index === selectedOfferIndex ? 'border-green-500' : 'border-gray-200';
            const topBanner = index === 1 ? '<div class="text-center font-bold text-green-600 bg-green-100 py-1 rounded-full mb-4 -mt-2">Pravděpodobná</div>' : '';
            return `<div class="offer-card border-2 ${borderClass} rounded-lg p-6 flex flex-col" data-offer-index="${index}">
                    ${topBanner}
                    <h4 class="text-xl font-bold text-center">${offer.name}</h4>
                    <div class="my-4 text-center"><span class="text-4xl font-bold">${offer.rate.toFixed(2)}%</span><span class="text-gray-600"> p.a.</span></div>
                    <div class="text-center mb-4"><p class="text-gray-600">Měsíční splátka</p><p class="text-2xl font-semibold">${formatCurrency(monthlyPayment)}</p></div>
                    <div class="text-center text-sm bg-gray-100 p-3 rounded-md mt-auto"><p>${offer.benefit}</p></div>
                </div>`;
        }).join('');
        
        document.querySelectorAll('.offer-card').forEach(card => {
            card.addEventListener('click', () => {
                generateAnalysis(parseInt(card.dataset.offerIndex));
            });
        });

        const selectedOffer = offers[selectedOfferIndex];
        const monthlyPayment = calculateMonthlyPayment(loanAmount, selectedOffer.rate, state.loanTerm);
        const totalPaid = monthlyPayment * 12 * state.loanTerm;
        const totalInterest = totalPaid - loanAmount;
        const firstPaymentInterest = loanAmount * ((selectedOffer.rate / 100) / 12);
        
        let balance = loanAmount;
        for (let i = 0; i < state.fixation * 12; i++) balance -= (monthlyPayment - (balance * (selectedOffer.rate / 100) / 12));

        document.getElementById('key-metrics').innerHTML = `
            <p><span class="font-semibold">Výše úvěru:</span> <span class="float-right">${formatCurrency(loanAmount)}</span></p>
            <p><span class="font-semibold">Celkem zaplaceno:</span> <span class="float-right">${formatCurrency(totalPaid)}</span></p>
            <p><span class="font-semibold text-red-600">Přeplatek na úrocích:</span> <span class="float-right font-bold text-red-600">${formatCurrency(totalInterest)}</span></p>
            <hr class="my-2">
            <p class="text-sm"><span class="font-semibold">Rozpad 1. splátky:</span> <span class="float-right">${formatCurrency(monthlyPayment - firstPaymentInterest)} (jistina) + ${formatCurrency(firstPaymentInterest)} (úrok)</span></p>
            <p><span class="font-semibold">Zůstatek po fixaci (${state.fixation} let):</span> <span class="float-right font-bold">${formatCurrency(balance)}</span></p>`;

        let recommendation = '';
        if (ltv < 80) recommendation = `S LTV ${ltv.toFixed(1)} % máte vynikající výchozí pozici. Dosáhnete na nejlepší úrokové sazby na trhu.`;
        else if (ltv < 90) recommendation = `Vaše LTV je ${ltv.toFixed(1)} %. Stále máte na výběr z mnoha kvalitních nabídek, i když sazby mohou být mírně vyšší.`;
        else recommendation = `LTV ve výši ${ltv.toFixed(1)} % znamená omezenější nabídku a vyšší sazby. Doporučujeme zvážit navýšení vlastních zdrojů.`;
        document.getElementById('ai-recommendation').textContent = recommendation;
        
        const { balances, labels } = generateAmortizationData(loanAmount, selectedOffer.rate, state.loanTerm);
        if(window.loanChart instanceof Chart) window.loanChart.destroy();
        window.loanChart = new Chart(document.getElementById('loanChart').getContext('2d'), {
            type: 'line',
            data: { 
                labels: labels, 
                datasets: [{ 
                    label: 'Zůstatek úvěru',
                    data: balances,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.1
                }] 
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { ticks: { callback: value => formatCurrency(value) } } }
            }
        });
    }

    // --- EVENT LISTENERS ---
    modeButtons.forEach(btn => btn.addEventListener('click', () => switchMode(btn.dataset.mode)));
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));
    
    intentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setIntent(btn.dataset.intent);
            intentButtons.forEach(b => b.classList.remove('border-blue-500', 'bg-blue-50'));
            btn.classList.add('border-blue-500', 'bg-blue-50');
            navigate(1);
        });
    });

    Object.values(inputs).forEach(input => {
        if(input) {
            input.addEventListener('input', updateCalculations);
            input.addEventListener('change', updateCalculations);
        }
    });
    
    // Netlify form success handling
    const leadFormElement = document.getElementById("lead-form");
    leadFormElement.addEventListener("submit", (e) => {
      e.preventDefault();
      const myForm = e.target;
      const formData = new FormData(myForm);
      
      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData).toString(),
      })
      .then(() => {
          leadForm.style.display = 'none';
          document.getElementById('form-success').classList.remove('hidden');
      })
      .catch((error) => alert(error));
    });


    // --- INITIALIZATION ---
    function initialize() {
        document.getElementById('last-updated').textContent = rateDatabase.lastUpdated.toLocaleDateString('cs-CZ');
        const counter = document.getElementById('live-users-counter');
        let liveUsers = 17;
        setInterval(() => {
            liveUsers += (Math.random() > 0.5 ? 1 : -1);
            if (liveUsers < 12) liveUsers = 12;
            counter.textContent = `${liveUsers} lidí právě počítá hypotéku`;
        }, 3500);

        const stats = {
            mediated: 8400000000,
            clients: 12847,
        }

        setInterval(() => {
            stats.mediated += Math.floor(Math.random() * 50000);
            stats.clients += Math.random() > 0.7 ? 1 : 0;
            document.getElementById('stats-mediated').textContent = `${(stats.mediated / 1000000000).toFixed(3)} mld Kč`;
            document.getElementById('stats-clients').textContent = stats.clients.toLocaleString('cs-CZ');
        }, 2500);

        state.intent = null;
        Object.keys(inputs).forEach(key => {
            const el = inputs[key], val = state[key];
            if (el && val !== null) el.value = el.type === 'select-one' ? val : (el.id === 'city' ? val : new Intl.NumberFormat('cs-CZ', {useGrouping: false}).format(val));
        });
        setIntent('koupě');
        intentButtons[0].classList.add('border-blue-500', 'bg-blue-50');
        currentStep = 1; state.intent = 'koupě';
        updateUI(); updateCalculations();
    }

    initialize();
});

