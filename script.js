// Hypotéka AI - Aplikace v5.1 - Stabilní verze
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURACE APLIKACE ---
    const CONFIG = {
        API_RATES_ENDPOINT: '/api/rates',
        API_CHAT_ENDPOINT: '/api/chat',
        DEBOUNCE_DELAY: 400
    };

    // --- STAV APLIKACE ---
    const state = {
        currentStep: 1,
        mode: 'calculator',
        rates: null,
        formData: {
            propertyValue: 0, ownResources: 0, loanAmount: 0,
            loanTerm: 25, fixation: 5, monthlyIncome: 0, monthlyLiabilities: 0,
        },
        calculation: { ltv: 0, offers: [], selectedOffer: null },
        chart: null,
    };

    // --- VÝBĚR DOM ELEMENTŮ ---
    const DOMElements = {
        modeButtons: document.querySelectorAll('[data-mode]'),
        calculatorMode: document.getElementById('calculator-mode'),
        aiMode: document.getElementById('ai-mode'),
        timelineSteps: document.querySelectorAll('.timeline-step'),
        timelineProgress: document.getElementById('timeline-progress'),
        formSections: document.querySelectorAll('.form-section'),
        inputs: {
            propertyValue: document.getElementById('propertyValue'),
            ownResources: document.getElementById('ownResources'),
            loanTerm: document.getElementById('loanTerm'),
            fixation: document.getElementById('fixation'),
            monthlyIncome: document.getElementById('monthlyIncome'),
            monthlyLiabilities: document.getElementById('monthlyLiabilities'),
        },
        loanAmountDisplay: document.getElementById('loan-amount-display'),
        ltvDisplay: document.getElementById('ltv-display'),
        analysisResults: document.getElementById('analysis-results'),
        loanChart: document.getElementById('loanChart'),
        leadForm: document.getElementById('lead-form'),
        formSuccess: document.getElementById('form-success'),
        submitLeadBtn: document.getElementById('submit-lead-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        chat: {
            window: document.getElementById('chat-window'),
            input: document.getElementById('chat-input'),
            sendBtn: document.getElementById('chat-send'),
        }
    };

    // --- INICIALIZACE ---
    const init = async () => {
        setupEventListeners();
        updateUI();
        addChatMessage('Dobrý den! Jsem vaše AI, která vám pomůže s hypotékou. Zeptejte se na cokoliv, nebo vyplňte kalkulačku pro první odhad.', 'ai');
        await fetchRates();
    };

    // --- ZÍSKÁNÍ AKTUÁLNÍCH SAZEB ---
    const fetchRates = async () => {
        try {
            const response = await fetch(CONFIG.API_RATES_ENDPOINT);
            if (!response.ok) throw new Error('Network response was not ok');
            state.rates = await response.json();
        } catch (error) {
            console.error('Nepodařilo se načíst úrokové sazby:', error);
            state.rates = { ltv80: [4.89, 4.99, 5.09], ltv90: [5.19, 5.29, 5.39] }; // Záložní data
        }
    };

    // --- NASTAVENÍ EVENT LISTENERŮ ---
    const setupEventListeners = () => {
        DOMElements.modeButtons.forEach(btn => btn.addEventListener('click', () => switchMode(btn.dataset.mode)));
        DOMElements.nextBtn.addEventListener('click', () => navigateStep(1));
        DOMElements.prevBtn.addEventListener('click', () => navigateStep(-1));
        Object.values(DOMElements.inputs).forEach(input => {
            if (input) input.addEventListener('input', debounce(handleInputChange, CONFIG.DEBOUNCE_DELAY));
        });
        DOMElements.leadForm.addEventListener('submit', handleFormSubmit);
        DOMElements.chat.sendBtn.addEventListener('click', sendChatMessage);
        DOMElements.chat.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
    };

    // --- ZPRACOVÁNÍ VSTUPŮ Z FORMULÁŘE ---
    const handleInputChange = () => {
        const { propertyValue, ownResources, loanTerm, fixation, monthlyIncome, monthlyLiabilities } = state.formData;
        const form = DOMElements.inputs;
        
        state.formData.propertyValue = parseNumber(form.propertyValue.value);
        if (form.ownResources.value.includes('%')) {
            state.formData.ownResources = state.formData.propertyValue * (parseNumber(form.ownResources.value) / 100);
        } else {
            state.formData.ownResources = parseNumber(form.ownResources.value);
        }
        
        state.formData.loanTerm = parseInt(form.loanTerm.value);
        state.formData.fixation = parseInt(form.fixation.value);
        state.formData.monthlyIncome = parseNumber(form.monthlyIncome.value);
        state.formData.monthlyLiabilities = parseNumber(form.monthlyLiabilities.value);
        
        // Okamžitý přepočet LTV a výše úvěru
        state.formData.loanAmount = Math.max(0, state.formData.propertyValue - state.formData.ownResources);
        state.calculation.ltv = state.formData.propertyValue > 0 ? (state.formData.loanAmount / state.formData.propertyValue) * 100 : 0;

        DOMElements.loanAmountDisplay.textContent = formatCurrency(state.formData.loanAmount);
        DOMElements.ltvDisplay.textContent = `LTV ${state.calculation.ltv.toFixed(1)} %`;
    };

    // --- NAVIGACE MEZI KROKY ---
    const navigateStep = (direction) => {
        if (direction > 0 && !validateStep(state.currentStep)) return;
        const newStep = state.currentStep + direction;
        if (newStep > 0 && newStep <= DOMElements.formSections.length) {
            if (newStep === 3) generateAnalysis();
            state.currentStep = newStep;
            updateUI();
        }
    };
    
    // --- VALIDACE KROKŮ ---
    const validateStep = (step) => {
        switch(step) {
            case 1:
                if (state.formData.loanAmount <= 0) {
                    alert('Zadejte prosím platnou cenu nemovitosti a vlastní zdroje.'); return false;
                }
                if (state.calculation.ltv > 95) {
                    alert('LTV (poměr úvěru k ceně nemovitosti) nesmí přesáhnout 95 %. Zvyšte prosím vlastní zdroje.'); return false;
                }
                return true;
            case 2:
                if (state.formData.monthlyIncome <= 0) {
                    alert('Zadejte prosím Váš měsíční příjem.'); return false;
                }
                return true;
            default: return true;
        }
    };

    // --- GENEROVÁNÍ ANALÝZY A GRAFU ---
    const generateAnalysis = () => {
        if (!state.rates) { alert('Sazby ještě nebyly načteny, zkuste to za chvíli znovu.'); return; }
        
        const relevantRates = state.calculation.ltv > 80 ? state.rates.ltv90 : state.rates.ltv80;
        const offerNames = ["Nejvýhodnější splátka", "Zlatá střední cesta", "Flexibilní nabídka"];
        
        state.calculation.offers = relevantRates.map((rate, index) => {
            const monthlyPayment = calculateMonthlyPayment(state.formData.loanAmount, rate, state.formData.loanTerm);
            return { id: index, name: offerNames[index], rate, monthlyPayment };
        });

        state.calculation.selectedOffer = state.calculation.offers[0] || null;
        updateAnalysisUI();
    };

    const updateAnalysisUI = () => {
        const container = DOMElements.analysisResults;
        container.innerHTML = '';
        state.calculation.offers.forEach(offer => {
            const isSelected = offer.id === state.calculation.selectedOffer?.id;
            const card = document.createElement('div');
            card.className = `offer-card p-4 rounded-lg text-center ${isSelected ? 'selected' : ''}`;
            card.innerHTML = `<h4 class="font-bold">${offer.name}</h4><p class="text-2xl font-bold">${formatCurrency(offer.monthlyPayment)}</p><p class="text-sm text-blue-200">Sazba cca ${offer.rate.toFixed(2)} %</p>`;
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
        const data = years.map(() => {
            const p = principal;
            for (let i = 0; i < 12; i++) {
                if (principal <= 0) break;
                principal -= (offer.monthlyPayment - principal * (offer.rate / 100 / 12));
            }
            return Math.max(0, p);
        });

        if (state.chart) state.chart.destroy();
        const ctx = DOMElements.loanChart.getContext('2d');
        state.chart = new Chart(ctx, {
            type: 'line',
            data: { labels: years, datasets: [{ label: 'Zbývající jistina', data, borderColor: '#60a5fa', tension: 0.1, fill: true, backgroundColor: 'rgba(96, 165, 250, 0.2)' }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: 'white', callback: (v) => formatCurrency(v) } }, x: { ticks: { color: 'white' } } }, plugins: { legend: { labels: { color: 'white' } } } }
        });
    };

    // --- ODESLÁNÍ FORMULÁŘE (LEAD) ---
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const btn = DOMElements.submitLeadBtn;
        btn.disabled = true;
        btn.querySelector('.btn-text').classList.add('hidden');
        btn.querySelector('.loading-spinner').classList.remove('hidden');

        document.getElementById('calculation_summary').value = `KLIENTŮV ZÁMĚR:\nÚvěr: ${formatCurrency(state.formData.loanAmount)}\nLTV: ${state.calculation.ltv.toFixed(1)}%\nPříjem: ${formatCurrency(state.formData.monthlyIncome)}\nVybraná nabídka: ${formatCurrency(state.calculation.selectedOffer?.monthlyPayment)}/měs. (sazba ${state.calculation.selectedOffer?.rate}%)`;

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
    
    // --- AI CHAT ---
    const sendChatMessage = async () => {
        const input = DOMElements.chat.input;
        const message = input.value.trim();
        if (!message) return;
        addChatMessage(message, 'user');
        input.value = '';
        try {
            const res = await fetch(CONFIG.API_CHAT_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context: { ...state.formData, ...state.calculation } })
            });
            if (!res.ok) throw new Error('Chyba serveru');
            const data = await res.json();
            addChatMessage(data.response, 'ai');
        } catch (e) {
            addChatMessage('Omlouvám se, umělá inteligence má dočasně výpadek. Zkuste to prosím později.', 'ai');
        }
    };
    
    const addChatMessage = (message, sender) => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble-${sender}`;
        bubble.innerHTML = message.replace(/\n/g, '<br>');
        DOMElements.chat.window.appendChild(bubble);
        DOMElements.chat.window.scrollTop = DOMElements.chat.window.scrollHeight;
    };

    // --- POMOCNÉ FUNKCE A AKTUALIZACE UI ---
    const calculateMonthlyPayment = (p, r, t) => p <= 0 ? 0 : (p * (r/100/12) * Math.pow(1 + (r/100/12), t*12)) / (Math.pow(1 + (r/100/12), t*12) - 1);
    const parseNumber = (s) => parseFloat(String(s).toLowerCase().replace(/[^0-9.]/g, '').replace('m', '000000').replace('k', '000')) || 0;
    const formatCurrency = (n) => n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });
    const debounce = (fn, d) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), d); }};
    const switchMode = (mode) => { state.mode = mode; updateUI(); };
    
    const updateUI = () => {
        // Zobrazení správného módu (kalkulačka/AI)
        DOMElements.calculatorMode.classList.toggle('hidden', state.mode !== 'calculator');
        DOMElements.aiMode.classList.toggle('hidden', state.mode !== 'ai');
        DOMElements.modeButtons.forEach(b => {
            const isActive = b.dataset.mode === state.mode;
            b.classList.toggle('border-white', isActive);
            b.classList.toggle('text-white', isActive);
            b.classList.toggle('border-transparent', !isActive);
            b.classList.toggle('text-blue-100', !isActive);
        });

        // Aktualizace timeline a zobrazení správné sekce formuláře
        if (state.mode === 'calculator') {
            DOMElements.formSections.forEach((s, i) => s.classList.toggle('active', i + 1 === state.currentStep));
            DOMElements.timelineProgress.style.width = `${((state.currentStep - 1) / (DOMElements.timelineSteps.length - 1)) * 100}%`;
            DOMElements.timelineSteps.forEach((s, i) => { 
                s.classList.toggle('active', i + 1 === state.currentStep); 
                s.classList.toggle('completed', i + 1 < state.currentStep); 
            });
            DOMElements.prevBtn.classList.toggle('hidden', state.currentStep === 1);
            DOMElements.nextBtn.classList.toggle('hidden', state.currentStep === DOMElements.formSections.length);
        }
    };

    // --- SPUŠTĚNÍ APLIKACE ---
    init();
});

