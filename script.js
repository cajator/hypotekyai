// Hypotéka AI - Production Ready Script
// Version 3.0 - Refactored and Improved
'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- KONFIGURACE ---
    const CONFIG = {
        // API endpoint pro Netlify funkci
        API_ENDPOINT: '/.netlify/functions/gemini',
        // Simulovaná data bank pro kalkulaci
        BANKS: [
            { id: 'hb', name: 'Hypoteční banka', logo: '🏦', rates: { 3: 4.29, 5: 4.09, 7: 4.19, 10: 4.39 }, bonus: 'Pojištění zdarma' },
            { id: 'uni', name: 'UniCredit', logo: '🏛️', rates: { 3: 4.39, 5: 4.19, 7: 4.29, 10: 4.49 }, bonus: 'Odhad zdarma' },
            { id: 'csob', name: 'ČSOB', logo: '🏨', rates: { 3: 4.49, 5: 4.29, 7: 4.39, 10: 4.59 }, bonus: 'Sleva za aktivní účet' },
            { id: 'cs', name: 'Česká spořitelna', logo: '🏢', rates: { 3: 4.59, 5: 4.39, 7: 4.49, 10: 4.69 }, bonus: 'Zelený bonus' },
            { id: 'kb', name: 'Komerční banka', logo: '🏤', rates: { 3: 4.69, 5: 4.49, 7: 4.59, 10: 4.79 }, bonus: 'Flexibilní splátky' },
        ],
        // Limity a doporučení
        LIMITS: {
            dstiWarning: 40, // %
            dstiMax: 50,     // %
            ltvMax: 90,      // %
            ltvOptimal: 80 // %
        },
        DEBOUNCE_DELAY: 400 // ms
    };

    // --- STAV APLIKACE ---
    const state = {
        currentStep: 1,
        mode: 'calculator', // 'calculator' or 'ai'
        formData: {
            intent: null,
            propertyValue: 0,
            ownResources: 0,
            loanAmount: 0,
            loanTerm: 25,
            fixation: 5,
            monthlyIncome: 0,
            monthlyLiabilities: 0,
        },
        calculation: {
            ltv: 0,
            monthlyPayment: 0,
            dsti: 0,
            offers: [],
            selectedOffer: null,
        },
        chart: null,
    };

    // --- VÝBĚR DOM ELEMENTŮ ---
    const DOMElements = {
        // Přepínače
        modeButtons: document.querySelectorAll('.mode-btn'),
        calculatorMode: document.getElementById('calculator-mode'),
        aiMode: document.getElementById('ai-mode'),
        // Tlačítka
        intentButtons: document.querySelectorAll('.intent-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        // Formulářové sekce a kontejnery
        formSections: document.querySelectorAll('.form-section'),
        timelineSteps: document.querySelectorAll('.timeline-step'),
        timelineProgress: document.getElementById('timeline-progress'),
        // Vstupní pole
        inputs: {
            propertyValue: document.getElementById('propertyValue'),
            ownResources: document.getElementById('ownResources'),
            landPrice: document.getElementById('landPrice'),
            constructionBudget: document.getElementById('constructionBudget'),
            constructionOwnResources: document.getElementById('constructionOwnResources'),
            refinanceLoanBalance: document.getElementById('refinanceLoanBalance'),
            refinancePropertyValue: document.getElementById('refinancePropertyValue'),
            loanTerm: document.getElementById('loanTerm'),
            fixation: document.getElementById('fixation'),
            monthlyIncome: document.getElementById('monthlyIncome'),
            monthlyLiabilities: document.getElementById('monthlyLiabilities'),
        },
        // Skupiny vstupních polí
        inputGroups: {
            purchase: document.getElementById('purchase-inputs'),
            construction: document.getElementById('construction-inputs'),
            refinancing: document.getElementById('refinancing-inputs'),
        },
        // Zobrazení výsledků
        quickResults: {
            monthlyPayment: document.getElementById('monthly-payment-display'),
            ltv: document.getElementById('ltv-display'),
            loanAmount: document.getElementById('loan-amount-display'),
        },
        dstiResult: {
            container: document.getElementById('dsti-result'),
            display: document.getElementById('dsti-display'),
            tip: document.getElementById('dsti-tip'),
        },
        analysis: {
            resultsContainer: document.getElementById('analysis-results'),
            loanChart: document.getElementById('loanChart'),
            keyMetrics: document.getElementById('key-metrics'),
            aiRecommendation: document.getElementById('ai-recommendation'),
        },
        // Kontaktní formulář
        leadForm: document.getElementById('lead-form'),
        formSuccess: document.getElementById('form-success'),
        submitLeadBtn: document.getElementById('submit-lead-btn'),
        // AI Chat
        chat: {
            window: document.getElementById('chat-window'),
            input: document.getElementById('chat-input'),
            sendBtn: document.getElementById('chat-send'),
            suggestions: document.getElementById('chat-suggestions'),
        },
    };

    // --- INICIALIZACE ---
    const init = () => {
        setupEventListeners();
        updateUI();
        updateLastUpdatedDate();
        animateMetrics();
        generateChatSuggestions();
        console.log('Hypotéka AI v3.0 inicializována.');
    };

    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        // Přepínání módů Kalkulačka / AI
        DOMElements.modeButtons.forEach(btn => {
            btn.addEventListener('click', () => switchMode(btn.dataset.mode));
        });

        // Výběr záměru (koupě, stavba, ...)
        DOMElements.intentButtons.forEach(btn => {
            btn.addEventListener('click', () => selectIntent(btn.dataset.intent, btn));
        });

        // Navigační tlačítka
        DOMElements.nextBtn.addEventListener('click', () => navigateStep(1));
        DOMElements.prevBtn.addEventListener('click', () => navigateStep(-1));

        // Dynamické přepočítávání při změně vstupů
        Object.values(DOMElements.inputs).forEach(input => {
            if (input) {
                input.addEventListener('input', debounce(handleInputChange, CONFIG.DEBOUNCE_DELAY));
            }
        });

        // Odeslání formuláře
        DOMElements.leadForm.addEventListener('submit', handleFormSubmit);

        // Odeslání zprávy v chatu
        DOMElements.chat.sendBtn.addEventListener('click', sendChatMessage);
        DOMElements.chat.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    };

    // --- PARSOVÁNÍ A FORMÁTOVÁNÍ ---
    const parseNumber = (str) => {
        if (typeof str !== 'string' || str.trim() === '') return 0;
        let value = str.toLowerCase().replace(/[^0-9km.]/g, '');
        if (value.includes('m')) {
            value = parseFloat(value.replace('m', '')) * 1000000;
        } else if (value.includes('k')) {
            value = parseFloat(value.replace('k', '')) * 1000;
        }
        return parseFloat(value) || 0;
    };

    const formatCurrency = (num) => {
        return num.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    // --- LOGIKA APLIKACE ---

    // Přepínání mezi kalkulačkou a AI poradcem
    const switchMode = (newMode) => {
        state.mode = newMode;
        DOMElements.calculatorMode.classList.toggle('hidden', newMode !== 'calculator');
        DOMElements.aiMode.classList.toggle('hidden', newMode !== 'ai');
        DOMElements.modeButtons.forEach(btn => {
            const isActive = btn.dataset.mode === newMode;
            btn.classList.toggle('border-white', isActive);
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('border-transparent', !isActive);
            btn.classList.toggle('text-blue-100', !isActive);
        });
    };
    
    // Výběr záměru
    const selectIntent = (intent, selectedBtn) => {
        state.formData.intent = intent;
        DOMElements.intentButtons.forEach(btn => btn.classList.remove('selected'));
        selectedBtn.classList.add('selected');
        
        // Zobrazit správnou sadu inputů pro krok 2
        Object.values(DOMElements.inputGroups).forEach(group => group.classList.add('hidden'));
        
        const isPurchaseLike = ['koupe', 'rekonstrukce', 'investice'].includes(intent);
        if (isPurchaseLike) DOMElements.inputGroups.purchase.classList.remove('hidden');
        if (intent === 'vystavba') DOMElements.inputGroups.construction.classList.remove('hidden');
        if (intent === 'refinancovani') DOMElements.inputGroups.refinancing.classList.remove('hidden');
        
        // Po výběru automaticky přejít na další krok
        setTimeout(() => navigateStep(1), 300);
    };

    // Navigace mezi kroky formuláře
    const navigateStep = (direction) => {
        if (direction > 0 && !validateStep(state.currentStep)) return;
        const newStep = state.currentStep + direction;
        if (newStep > 0 && newStep <= DOMElements.formSections.length) {
            if (newStep === 4) { // Před vstupem do kroku Analýza
                generateAnalysis();
            }
            state.currentStep = newStep;
            updateUI();
        }
    };
    
    // Zpracování změn vstupních polí
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        
        if (id === 'ownResources' && value.includes('%')) {
            const percentage = parseFloat(value.replace('%', '')) || 0;
            const propertyValue = parseNumber(DOMElements.inputs.propertyValue.value);
            state.formData.ownResources = propertyValue * (percentage / 100);
        } else if (id in DOMElements.inputs) {
            state.formData[id] = id.includes('Term') || id.includes('fixation') ? parseInt(value) : parseNumber(value);
        }
        
        calculateQuickResults();
    };

    // Validace kroků
    const validateStep = (step) => {
        switch(step) {
            case 1:
                if (!state.formData.intent) {
                    alert('Prosím, vyberte co plánujete.');
                    return false;
                }
                return true;
            case 2:
                if (state.formData.loanAmount <= 0) {
                     alert('Prosím, zadejte platné částky pro výpočet úvěru.');
                    return false;
                }
                return true;
            case 3:
                 if (state.formData.monthlyIncome <= 0) {
                     alert('Prosím, zadejte váš čistý měsíční příjem.');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    // Odeslání formuláře na Netlify
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const btn = DOMElements.submitLeadBtn;
        btn.disabled = true;
        btn.querySelector('.btn-text').classList.add('hidden');
        btn.querySelector('.loading-spinner').classList.remove('hidden');

        // Připravit data k odeslání
        const formData = new FormData(DOMElements.leadForm);
        const summary = `
            Záměr: ${state.formData.intent}
            Úvěr: ${formatCurrency(state.formData.loanAmount)}
            LTV: ${state.calculation.ltv}%
            Splatnost: ${state.formData.loanTerm} let
            Fixace: ${state.formData.fixation} let
            Splátka: ${formatCurrency(state.calculation.selectedOffer?.monthlyPayment || state.calculation.monthlyPayment)}
            Banka: ${state.calculation.selectedOffer?.name || 'Nespecifikováno'}
        `;
        document.getElementById('calculation_summary').value = summary;

        try {
            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(formData).toString()
            });
            if (response.ok) {
                DOMElements.leadForm.classList.add('hidden');
                DOMElements.formSuccess.classList.remove('hidden');
            } else {
                throw new Error('Chyba při odesílání formuláře.');
            }
        } catch (error) {
            console.error(error);
            alert('Omlouváme se, došlo k chybě. Zkuste to prosím znovu.');
            btn.disabled = false;
            btn.querySelector('.btn-text').classList.remove('hidden');
            btn.querySelector('.loading-spinner').classList.add('hidden');
        }
    };


    // --- VÝPOČTY ---

    const calculateQuickResults = () => {
        const { intent, propertyValue, ownResources, loanTerm, fixation, monthlyIncome, monthlyLiabilities } = state.formData;
        let loanAmount = 0;
        let ltv = 0;
        let effectivePropertyValue = propertyValue;

        // Výpočet výše úvěru a LTV dle záměru
        switch (intent) {
            case 'vystavba':
                const { landPrice, constructionBudget, constructionOwnResources } = state.formData;
                effectivePropertyValue = landPrice + constructionBudget;
                loanAmount = effectivePropertyValue - constructionOwnResources;
                break;
            case 'refinancovani':
                const { refinanceLoanBalance, refinancePropertyValue } = state.formData;
                loanAmount = refinanceLoanBalance;
                effectivePropertyValue = refinancePropertyValue;
                break;
            default: // koupě, rekonstrukce, investice
                loanAmount = propertyValue - ownResources;
                break;
        }
        
        if (effectivePropertyValue > 0) {
            ltv = (loanAmount / effectivePropertyValue) * 100;
        }
        
        state.formData.loanAmount = loanAmount > 0 ? loanAmount : 0;
        state.calculation.ltv = ltv > 0 ? parseFloat(ltv.toFixed(1)) : 0;

        // Výpočet orientační splátky
        const avgRate = getAverageRate(fixation);
        state.calculation.monthlyPayment = calculateMonthlyPayment(loanAmount, avgRate, loanTerm);
        
        // Výpočet DSTI
        const totalLiabilities = state.calculation.monthlyPayment + monthlyLiabilities;
        state.calculation.dsti = (monthlyIncome > 0) ? (totalLiabilities / monthlyIncome) * 100 : 0;
        
        updateQuickResultsUI();
        updateDstiUI();
    };
    
    const calculateMonthlyPayment = (principal, annualRate, years) => {
        if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
        const monthlyRate = annualRate / 100 / 12;
        const numberOfPayments = years * 12;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    };

    const getAverageRate = (fixation) => {
        const rates = CONFIG.BANKS.map(b => b.rates[fixation]).filter(Boolean);
        return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 4.5;
    };
    
    // --- GENEROVÁNÍ ANALÝZY (KROK 4) ---
    
    const generateAnalysis = () => {
        const { loanAmount, ltv, loanTerm, fixation } = state.formData;
        
        state.calculation.offers = CONFIG.BANKS.map(bank => {
            let rate = bank.rates[fixation] || getAverageRate(fixation);
            // Jednoduchá úprava sazby podle LTV
            if (ltv > CONFIG.LIMITS.ltvOptimal) rate += 0.2;
            if (ltv > CONFIG.LIMITS.ltvMax) rate += 0.5; // Banky obvykle nepůjčí, ale pro simulaci
            
            const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
            const totalPaid = monthlyPayment * loanTerm * 12;
            
            return {
                id: bank.id,
                name: bank.name,
                logo: bank.logo,
                rate: parseFloat(rate.toFixed(2)),
                monthlyPayment: Math.round(monthlyPayment),
                totalPaid: Math.round(totalPaid),
                overpayment: Math.round(totalPaid - loanAmount),
                bonus: bank.bonus
            };
        }).sort((a, b) => a.monthlyPayment - b.monthlyPayment);
        
        state.calculation.selectedOffer = state.calculation.offers[0] || null;
        updateAnalysisUI();
    };

    // --- AKTUALIZACE UI ---

    const updateUI = () => {
        // Zobrazit správnou sekci
        DOMElements.formSections.forEach((section, index) => {
            section.classList.toggle('active', index + 1 === state.currentStep);
        });

        // Aktualizovat časovou osu
        const progress = ((state.currentStep - 1) / (DOMElements.timelineSteps.length - 1)) * 100;
        DOMElements.timelineProgress.style.width = `${progress}%`;
        DOMElements.timelineSteps.forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.toggle('active', stepNum === state.currentStep);
            step.classList.toggle('completed', stepNum < state.currentStep);
            step.querySelector('p').classList.toggle('text-white', stepNum === state.currentStep);
            step.querySelector('p').classList.toggle('text-blue-100', stepNum !== state.currentStep);
        });

        // Zobrazit navigační tlačítka
        DOMElements.prevBtn.classList.toggle('hidden', state.currentStep === 1);
        DOMElements.nextBtn.textContent = state.currentStep === DOMElements.formSections.length - 1 ? 'Dokončit' : 'Další';
        DOMElements.nextBtn.classList.toggle('hidden', state.currentStep === DOMElements.formSections.length);
    };
    
    const updateQuickResultsUI = () => {
        DOMElements.quickResults.monthlyPayment.textContent = formatCurrency(state.calculation.monthlyPayment);
        DOMElements.quickResults.ltv.textContent = `${state.calculation.ltv}%`;
        DOMElements.quickResults.loanAmount.textContent = formatCurrency(state.formData.loanAmount);
    };

    const updateDstiUI = () => {
        const dsti = state.calculation.dsti;
        const container = DOMElements.dstiResult.container;

        if (state.formData.monthlyIncome > 0) {
            container.classList.remove('hidden');
            DOMElements.dstiResult.display.textContent = `${dsti.toFixed(1)}%`;
            
            let tipText = '';
            let colorClass = '';
            if (dsti > CONFIG.LIMITS.dstiMax) {
                tipText = 'Vaše DSTI je příliš vysoké. Banka vám pravděpodobně nepůjčí.';
                colorClass = 'text-red-400';
            } else if (dsti > CONFIG.LIMITS.dstiWarning) {
                tipText = 'Vaše DSTI je hraniční. Některé banky mohou mít přísnější podmínky.';
                colorClass = 'text-yellow-400';
            } else {
                tipText = 'Vaše DSTI je v pořádku. Měli byste na hypotéku dosáhnout.';
                 colorClass = 'text-green-400';
            }
            DOMElements.dstiResult.tip.textContent = tipText;
            DOMElements.dstiResult.tip.className = `text-sm mt-2 ${colorClass}`;
        } else {
            container.classList.add('hidden');
        }
    };

    const updateAnalysisUI = () => {
        const container = DOMElements.analysis.resultsContainer;
        container.innerHTML = ''; // Vyčistit předchozí nabídky

        state.calculation.offers.forEach((offer, index) => {
            const isSelected = offer.id === state.calculation.selectedOffer?.id;
            const card = document.createElement('div');
            card.className = `offer-card p-6 rounded-2xl cursor-pointer transition-all duration-300 ${isSelected ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-xl font-bold">${offer.logo} ${offer.name}</h4>
                    ${index === 0 ? '<span class="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">NEJLEPŠÍ</span>' : ''}
                </div>
                <p class="text-4xl font-bold text-gray-800">${formatCurrency(offer.monthlyPayment)}</p>
                <p class="text-sm text-gray-600 mb-4">měsíčně</p>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Sazba</span>
                    <span class="font-semibold">${offer.rate.toFixed(2)} %</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Přeplatíte</span>
                    <span class="font-semibold">${formatCurrency(offer.overpayment)}</span>
                </div>
            `;
            card.addEventListener('click', () => {
                state.calculation.selectedOffer = offer;
                updateAnalysisUI();
            });
            container.appendChild(card);
        });

        // Aktualizovat graf a metriky podle vybrané nabídky
        if (state.calculation.selectedOffer) {
            updateLoanChart(state.calculation.selectedOffer);
            updateKeyMetrics(state.calculation.selectedOffer);
            updateAiRecommendation(state.calculation.selectedOffer);
        }
    };

    const updateLoanChart = (offer) => {
        const { loanTerm } = state.formData;
        const years = Array.from({ length: loanTerm + 1 }, (_, i) => i);
        
        let remainingPrincipal = state.formData.loanAmount;
        const principalData = [remainingPrincipal];

        for (let year = 1; year <= loanTerm; year++) {
            for (let month = 1; month <= 12; month++) {
                const interestPayment = remainingPrincipal * (offer.rate / 100 / 12);
                const principalPayment = offer.monthlyPayment - interestPayment;
                remainingPrincipal -= principalPayment;
            }
            principalData.push(remainingPrincipal > 0 ? remainingPrincipal : 0);
        }

        if (state.chart) {
            state.chart.destroy();
        }
        
        const ctx = DOMElements.analysis.loanChart.getContext('2d');
        state.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Zbývající jistina',
                    data: principalData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { ticks: { callback: (value) => formatCurrency(value) } }
                }
            }
        });
    };
    
    const updateKeyMetrics = (offer) => {
        const container = DOMElements.analysis.keyMetrics;
        container.innerHTML = `
            <div class="flex justify-between items-center bg-white/10 p-4 rounded-lg">
                <span class="font-medium text-white">Vybraná banka</span>
                <span class="text-lg font-bold text-white">${offer.logo} ${offer.name}</span>
            </div>
             <div class="flex justify-between items-center bg-white/10 p-4 rounded-lg">
                <span class="font-medium text-white">Měsíční splátka</span>
                <span class="text-lg font-bold text-white">${formatCurrency(offer.monthlyPayment)}</span>
            </div>
            <div class="flex justify-between items-center bg-white/10 p-4 rounded-lg">
                <span class="font-medium text-white">Úroková sazba</span>
                <span class="text-lg font-bold text-white">${offer.rate.toFixed(2)} %</span>
            </div>
            <div class="flex justify-between items-center bg-white/10 p-4 rounded-lg">
                <span class="font-medium text-white">Celkem zaplatíte</span>
                <span class="text-lg font-bold text-white">${formatCurrency(offer.totalPaid)}</span>
            </div>
        `;
    };
    
    const updateAiRecommendation = (offer) => {
        const { dsti, ltv } = state.calculation;
        let recommendation = `Nabídka od <strong>${offer.name}</strong> se jeví jako nejvýhodnější s měsíční splátkou <strong>${formatCurrency(offer.monthlyPayment)}</strong>. `;
        if(offer.bonus) recommendation += `Jako bonus získáte <strong>${offer.bonus}</strong>. `;
        if (dsti > CONFIG.LIMITS.dstiWarning) {
            recommendation += `Vaše DSTI (${dsti.toFixed(1)}%) je hraniční, ale u této banky byste měl/a projít. `;
        } else {
            recommendation += `Vaše bonita je s DSTI ${dsti.toFixed(1)}% vynikající. `;
        }
        if (ltv > CONFIG.LIMITS.ltvOptimal) {
            recommendation += `Zvažte navýšení vlastních zdrojů pro získání ještě lepší sazby.`;
        }
        DOMElements.analysis.aiRecommendation.innerHTML = recommendation;
    };


    // --- AI CHAT ---
    const sendChatMessage = async () => {
        const input = DOMElements.chat.input;
        const message = input.value.trim();
        if (!message) return;

        addChatMessage(message, 'user');
        input.value = '';
        toggleChatLoading(true);

        try {
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context: state.formData })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            addChatMessage(data.response, 'ai');

        } catch (error) {
            console.error('Chyba při komunikaci s AI:', error);
            addChatMessage('Omlouvám se, došlo k chybě. Zkuste to prosím znovu.', 'ai');
        } finally {
            toggleChatLoading(false);
        }
    };

    const addChatMessage = (message, sender) => {
        const bubble = document.createElement('div');
        bubble.className = `p-4 max-w-[80%] w-fit chat-bubble-${sender}`;
        
        if (sender === 'ai') {
            bubble.innerHTML = `
                 <div class="flex items-start gap-3">
                    <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0 text-white"><strong>AI</strong></div>
                    <div class="flex-1">
                        <strong class="text-gray-700 block mb-1">AI Poradce</strong>
                        <p>${message.replace(/\n/g, '<br>')}</p>
                    </div>
                </div>`;
        } else {
             bubble.innerHTML = `<p>${message}</p>`;
             bubble.classList.add('ml-auto');
        }
        DOMElements.chat.window.appendChild(bubble);
        DOMElements.chat.window.scrollTop = DOMElements.chat.window.scrollHeight;
    };
    
    const toggleChatLoading = (isLoading) => {
        const btn = DOMElements.chat.sendBtn;
        btn.disabled = isLoading;
        btn.querySelector('.btn-text').classList.toggle('hidden', isLoading);
        btn.querySelector('.loading-spinner').classList.toggle('hidden', !isLoading);
    };
    
    const generateChatSuggestions = () => {
        const suggestions = [
            'Jaké jsou aktuální sazby?',
            'Co je to LTV a DSTI?',
            'Vyplatí se mi refinancování?',
            'Jaké dokumenty potřebuji?'
        ];
        DOMElements.chat.suggestions.innerHTML = '';
        suggestions.forEach(text => {
            const button = document.createElement('button');
            button.className = 'bg-white/20 text-white text-sm px-3 py-1 rounded-full hover:bg-white/40 transition';
            button.textContent = text;
            button.onclick = () => {
                DOMElements.chat.input.value = text;
                sendChatMessage();
            };
            DOMElements.chat.suggestions.appendChild(button);
        });
    };

    // --- POMOCNÉ FUNKCE ---
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };
    
    const updateLastUpdatedDate = () => {
        const dateElement = document.getElementById('last-updated');
        if(dateElement) {
            dateElement.textContent = new Date().toLocaleDateString('cs-CZ');
        }
    };
    
    const animateMetrics = () => {
        const counters = document.querySelectorAll('.metric-card p:first-child');
        counters.forEach(counter => {
            const updateCount = () => {
                const targetText = counter.innerText;
                const isCurrency = targetText.includes('Kč');
                const isRating = targetText.includes('/');
                
                if(isCurrency || isRating) return; // Skip animation for text-based values

                const target = +targetText.replace(/ /g, '');
                let count = 0;
                const speed = 200; // lower is faster
                const inc = target / speed;

                const animate = () => {
                    count += inc;
                    if (count < target) {
                        counter.innerText = Math.ceil(count).toLocaleString('cs-CZ');
                        requestAnimationFrame(animate);
                    } else {
                        counter.innerText = target.toLocaleString('cs-CZ');
                    }
                };
                animate();
            };
            // Start animation when element is in view
            new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        updateCount();
                        observer.unobserve(entry.target);
                    }
                });
            }).observe(counter);
        });
    };

    // Spuštění aplikace
    init();
});
