// Hypotéka AI - Production Ready Script
// Version 4.0 - Refactored and Stabilized
'use strict';

document.addEventListener('DOMContentLoaded', () => {

    const CONFIG = {
        API_ENDPOINT: '/.netlify/functions/gemini',
        BANKS: [
            { id: 'hb', name: 'Hypoteční banka', rate: 4.09 },
            { id: 'uni', name: 'UniCredit', rate: 4.19 },
            { id: 'csob', name: 'ČSOB', rate: 4.29 },
            { id: 'cs', name: 'Česká spořitelna', rate: 4.39 },
            { id: 'kb', name: 'Komerční banka', rate: 4.49 },
        ],
        LIMITS: { dstiWarning: 40, dstiMax: 50, ltvMax: 90, ltvOptimal: 80 },
        DEBOUNCE_DELAY: 400
    };

    const state = {
        currentStep: 1,
        mode: 'calculator',
        formData: {
            intent: null, propertyValue: 0, ownResources: 0, loanAmount: 0,
            loanTerm: 25, fixation: 5, monthlyIncome: 0, monthlyLiabilities: 0,
        },
        calculation: { ltv: 0, monthlyPayment: 0, dsti: 0, offers: [], selectedOffer: null },
        chart: null,
    };

    const DOMElements = {
        modeButtons: document.querySelectorAll('.mode-btn'),
        calculatorMode: document.getElementById('calculator-mode'),
        aiMode: document.getElementById('ai-mode'),
        intentButtons: document.querySelectorAll('.intent-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        formSections: document.querySelectorAll('.form-section'),
        timelineSteps: document.querySelectorAll('.timeline-step'),
        timelineProgress: document.getElementById('timeline-progress'),
        inputs: {
            propertyValue: document.getElementById('propertyValue'),
            ownResources: document.getElementById('ownResources'),
            loanTerm: document.getElementById('loanTerm'),
            fixation: document.getElementById('fixation'),
            monthlyIncome: document.getElementById('monthlyIncome'),
            monthlyLiabilities: document.getElementById('monthlyLiabilities'),
        },
        quickResults: {
            monthlyPayment: document.getElementById('monthly-payment-display'),
        },
        dstiResult: {
            container: document.getElementById('dsti-result'),
            display: document.getElementById('dsti-display'),
            tip: document.getElementById('dsti-tip'),
        },
        analysis: {
            resultsContainer: document.getElementById('analysis-results'),
            loanChart: document.getElementById('loanChart'),
        },
        leadForm: document.getElementById('lead-form'),
        formSuccess: document.getElementById('form-success'),
        submitLeadBtn: document.getElementById('submit-lead-btn'),
        chat: {
            window: document.getElementById('chat-window'),
            input: document.getElementById('chat-input'),
            sendBtn: document.getElementById('chat-send'),
        },
    };

    const init = () => {
        setupEventListeners();
        updateUI();
        addChatMessage('Dobrý den! Jsem váš AI hypoteční poradce. Na co se chcete zeptat?', 'ai');
    };

    const setupEventListeners = () => {
        DOMElements.modeButtons.forEach(btn => btn.addEventListener('click', () => switchMode(btn.dataset.mode)));
        DOMElements.intentButtons.forEach(btn => btn.addEventListener('click', () => selectIntent(btn.dataset.intent, btn)));
        DOMElements.nextBtn.addEventListener('click', () => navigateStep(1));
        DOMElements.prevBtn.addEventListener('click', () => navigateStep(-1));
        Object.values(DOMElements.inputs).forEach(input => {
            if (input) input.addEventListener('input', debounce(handleInputChange, CONFIG.DEBOUNCE_DELAY));
        });
        DOMElements.leadForm.addEventListener('submit', handleFormSubmit);
        DOMElements.chat.sendBtn.addEventListener('click', sendChatMessage);
        DOMElements.chat.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
    };

    const parseNumber = (str) => {
        if (typeof str !== 'string' || !str) return 0;
        let value = str.toLowerCase().replace(/[^0-9km.]/g, '');
        if (value.includes('m')) value = parseFloat(value.replace('m', '')) * 1000000;
        else if (value.includes('k')) value = parseFloat(value.replace('k', '')) * 1000;
        return parseFloat(value) || 0;
    };
    const formatCurrency = (num) => num.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const switchMode = (newMode) => {
        state.mode = newMode;
        updateUIVisibility();
    };

    const selectIntent = (intent, selectedBtn) => {
        state.formData.intent = intent;
        DOMElements.intentButtons.forEach(btn => btn.classList.remove('selected'));
        selectedBtn.classList.add('selected');
        setTimeout(() => navigateStep(1), 300);
    };

    const navigateStep = (direction) => {
        const newStep = state.currentStep + direction;
        if (newStep > 0 && newStep <= DOMElements.formSections.length) {
            if (newStep === 4) generateAnalysis();
            state.currentStep = newStep;
            updateUI();
        }
    };
    
    const handleInputChange = () => {
        const { propertyValue, ownResources, loanTerm, fixation, monthlyIncome, monthlyLiabilities } = DOMElements.inputs;
        
        state.formData.propertyValue = parseNumber(propertyValue.value);
        if (ownResources.value.includes('%')) {
            const percentage = parseFloat(ownResources.value.replace('%', '')) || 0;
            state.formData.ownResources = state.formData.propertyValue * (percentage / 100);
        } else {
            state.formData.ownResources = parseNumber(ownResources.value);
        }
        
        state.formData.loanTerm = parseInt(loanTerm.value);
        state.formData.fixation = parseInt(fixation.value);
        state.formData.monthlyIncome = parseNumber(monthlyIncome.value);
        state.formData.monthlyLiabilities = parseNumber(monthlyLiabilities.value);
        
        calculateQuickResults();
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const btn = DOMElements.submitLeadBtn;
        btn.disabled = true;
        btn.querySelector('.btn-text').classList.add('hidden');
        btn.querySelector('.loading-spinner').classList.remove('hidden');

        document.getElementById('calculation_summary').value = `Úvěr: ${formatCurrency(state.formData.loanAmount)}, Splátka: ${formatCurrency(state.calculation.selectedOffer?.monthlyPayment || 0)}`;

        try {
            await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(new FormData(DOMElements.leadForm)).toString()
            });
            DOMElements.leadForm.classList.add('hidden');
            DOMElements.formSuccess.classList.remove('hidden');
        } catch (error) {
            alert('Chyba při odesílání.');
            btn.disabled = false;
            btn.querySelector('.btn-text').classList.remove('hidden');
            btn.querySelector('.loading-spinner').classList.add('hidden');
        }
    };

    const calculateQuickResults = () => {
        const { propertyValue, ownResources, loanTerm, monthlyIncome, monthlyLiabilities } = state.formData;
        state.formData.loanAmount = Math.max(0, propertyValue - ownResources);
        state.calculation.ltv = propertyValue > 0 ? (state.formData.loanAmount / propertyValue) * 100 : 0;
        
        const avgRate = CONFIG.BANKS.reduce((acc, b) => acc + b.rate, 0) / CONFIG.BANKS.length;
        state.calculation.monthlyPayment = calculateMonthlyPayment(state.formData.loanAmount, avgRate, loanTerm);
        
        const totalLiabilities = state.calculation.monthlyPayment + monthlyLiabilities;
        state.calculation.dsti = monthlyIncome > 0 ? (totalLiabilities / monthlyIncome) * 100 : 0;
        
        updateResultsUI();
    };

    const calculateMonthlyPayment = (principal, annualRate, years) => {
        if (principal <= 0) return 0;
        const monthlyRate = annualRate / 100 / 12;
        const n = years * 12;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    };

    const generateAnalysis = () => {
        const { loanAmount, ltv, loanTerm, fixation } = state.formData;
        state.calculation.offers = CONFIG.BANKS.map(bank => {
            let rate = bank.rate;
            if (ltv > CONFIG.LIMITS.ltvOptimal) rate += 0.2;
            const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
            return { id: bank.id, name: bank.name, rate: rate.toFixed(2), monthlyPayment: Math.round(monthlyPayment) };
        }).sort((a, b) => a.monthlyPayment - b.monthlyPayment);
        state.calculation.selectedOffer = state.calculation.offers[0] || null;
        updateAnalysisUI();
    };

    const updateUIVisibility = () => {
        DOMElements.calculatorMode.classList.toggle('hidden', state.mode !== 'calculator');
        DOMElements.aiMode.classList.toggle('hidden', state.mode !== 'ai');
        DOMElements.modeButtons.forEach(btn => {
            const isActive = btn.dataset.mode === state.mode;
            btn.classList.toggle('border-white', isActive);
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('border-transparent', !isActive);
            btn.classList.toggle('text-blue-100', !isActive);
        });
    };

    const updateUI = () => {
        DOMElements.formSections.forEach((s, i) => s.classList.toggle('active', i + 1 === state.currentStep));
        const progress = ((state.currentStep - 1) / (DOMElements.timelineSteps.length - 1)) * 100;
        DOMElements.timelineProgress.style.width = `${progress}%`;
        DOMElements.timelineSteps.forEach((step, i) => {
            step.classList.toggle('active', i + 1 === state.currentStep);
            step.classList.toggle('completed', i + 1 < state.currentStep);
        });
        DOMElements.prevBtn.classList.toggle('hidden', state.currentStep === 1);
        DOMElements.nextBtn.textContent = state.currentStep === DOMElements.formSections.length - 1 ? 'Dokončit' : 'Další';
        DOMElements.nextBtn.classList.toggle('hidden', state.currentStep === DOMElements.formSections.length);
        updateUIVisibility();
    };
    
    const updateResultsUI = () => {
        DOMElements.quickResults.monthlyPayment.textContent = formatCurrency(state.calculation.monthlyPayment);
        const { dsti } = state.calculation;
        const dstiContainer = DOMElements.dstiResult.container;
        if (state.formData.monthlyIncome > 0) {
            dstiContainer.classList.remove('hidden');
            DOMElements.dstiResult.display.textContent = `${dsti.toFixed(1)}%`;
            DOMElements.dstiResult.tip.textContent = dsti > CONFIG.LIMITS.dstiMax ? 'Příliš vysoké.' : dsti > CONFIG.LIMITS.dstiWarning ? 'Hraniční.' : 'V pořádku.';
        } else {
            dstiContainer.classList.add('hidden');
        }
    };

    const updateAnalysisUI = () => {
        const container = DOMElements.analysis.resultsContainer;
        container.innerHTML = '';
        state.calculation.offers.forEach(offer => {
            const isSelected = offer.id === state.calculation.selectedOffer?.id;
            const card = document.createElement('div');
            card.className = `offer-card p-4 rounded-lg cursor-pointer ${isSelected ? 'selected' : ''}`;
            card.innerHTML = `<h4 class="font-bold">${offer.name}</h4><p class="text-2xl font-bold">${formatCurrency(offer.monthlyPayment)}</p><p>Sazba ${offer.rate}%</p>`;
            card.addEventListener('click', () => {
                state.calculation.selectedOffer = offer;
                updateAnalysisUI();
            });
            container.appendChild(card);
        });
        if (state.calculation.selectedOffer) updateLoanChart(state.calculation.selectedOffer);
    };

    const updateLoanChart = (offer) => {
        const years = Array.from({ length: state.formData.loanTerm + 1 }, (_, i) => i);
        let principal = state.formData.loanAmount;
        const data = years.map((_, year) => {
            const p = principal;
            for (let i = 0; i < 12; i++) principal -= (offer.monthlyPayment - principal * (offer.rate / 100 / 12));
            return p > 0 ? p : 0;
        });
        if (state.chart) state.chart.destroy();
        state.chart = new Chart(DOMElements.analysis.loanChart, {
            type: 'line',
            data: { labels: years, datasets: [{ label: 'Zbývající jistina', data, borderColor: '#60a5fa', tension: 0.1, fill: true, backgroundColor: 'rgba(96, 165, 250, 0.2)' }] },
            options: { scales: { y: { ticks: { color: 'white' } }, x: { ticks: { color: 'white' } } }, plugins: { legend: { labels: { color: 'white' } } } }
        });
    };

    const sendChatMessage = async () => {
        const input = DOMElements.chat.input;
        const message = input.value.trim();
        if (!message) return;
        addChatMessage(message, 'user');
        input.value = '';
        try {
            const res = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context: state.formData })
            });
            const data = await res.json();
            addChatMessage(data.response, 'ai');
        } catch (e) {
            addChatMessage('Omlouvám se, došlo k chybě.', 'ai');
        }
    };
    
    const addChatMessage = (message, sender) => {
        const bubble = document.createElement('div');
        bubble.className = `p-3 rounded-lg max-w-[80%] w-fit chat-bubble-${sender}`;
        bubble.textContent = message;
        DOMElements.chat.window.appendChild(bubble);
        DOMElements.chat.window.scrollTop = DOMElements.chat.window.scrollHeight;
    };
    
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    init();
});

