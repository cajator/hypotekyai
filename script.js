// FinanceAI Calculator v6.0 - All-in-One Final Build
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- APPLICATION CONFIGURATION FROM SPECIFICATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/.netlify/functions/chat', // Correct path for Netlify functions
        API_RATES_ENDPOINT: '/.netlify/functions/rates', // Correct path for Netlify functions
        DEBOUNCE_DELAY: 500,
        AI_SUGGESTIONS: [
            "Jaké jsou výhody delší fixace?",
            "Co když jsem OSVČ?",
            "Můžu si půjčit i na rekonstrukci?",
            "Jak banka posuzuje mé příjmy?"
        ]
    };

    // --- CENTRAL APPLICATION STATE ---
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

    // --- DOM ELEMENT SELECTOR ---
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
            suggestions: document.getElementById('ai-suggestions'),
        },
        ltvTip: document.getElementById('ltv-tip'),
    };

    // --- INITIALIZATION ---
    const init = async () => {
        setupEventListeners();
        updateUI();
        addChatMessage('Dobrý den! Jsem FinanceAI, váš osobní hypoteční poradce. Můžete se mě na cokoliv zeptat, nebo rovnou vyplňte kalkulačku pro rychlý odhad.', 'ai');
        generateAISuggestions();
        await fetchRates();
    };

    // --- FETCH CURRENT RATES ---
    const fetchRates = async () => {
        try {
            const response = await fetch(CONFIG.API_RATES_ENDPOINT);
            if (!response.ok) throw new Error('Network response was not ok');
            state.rates = await response.json();
        } catch (error) {
            console.error('Nepodařilo se načíst úrokové sazby:', error);
            state.rates = { ltv80: [4.89, 4.99, 5.09], ltv90: [5.19, 5.29, 5.39] }; // Fallback data
        }
    };

    // --- SETUP EVENT LISTENERS ---
    const setupEventListeners = () => {
        DOMElements.modeButtons.forEach(btn => btn.addEventListener('click', () => switchMode(btn.dataset.mode)));
        DOMElements.nextBtn.addEventListener('click', () => navigateStep(1));
        DOMElements.prevBtn.addEventListener('click', () => navigateStep(-1));
        
        Object.values(DOMElements.inputs).forEach(input => {
            if (input) {
                input.addEventListener('input', debounce(handleInputChange, CONFIG.DEBOUNCE_DELAY));
                input.addEventListener('blur', (e) => handleInputBlur(e.target));
            }
        });

        DOMElements.leadForm.addEventListener('submit', handleFormSubmit);
        DOMElements.chat.sendBtn.addEventListener('click', () => sendChatMessage());
        DOMElements.chat.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
    };

    // --- INTELLIGENT INPUT PROCESSING (from specification) ---
    const handleInputBlur = (input) => {
        let value = parseNumber(input.value);
        if (input.id === 'propertyValue' && value > 0 && value < 1000) {
            if (confirm(`Mysleli jste ${formatCurrency(value * 1000000)}?`)) {
                value *= 1000000;
                input.value = formatCurrency(value);
                handleInputChange(); // Recalculate with new value
            }
        } else if (input.id === 'monthlyIncome' && value > 0 && value < 1000) {
            value *= 1000;
            input.value = formatCurrency(value);
            handleInputChange(); // Recalculate with new value
        }
    };

    const handleInputChange = () => {
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
        
        state.formData.loanAmount = Math.max(0, state.formData.propertyValue - state.formData.ownResources);
        state.calculation.ltv = state.formData.propertyValue > 0 ? (state.formData.loanAmount / state.formData.propertyValue) * 100 : 0;
        
        // --- CONTEXTUAL LTV TIP (from specification) ---
        if (state.calculation.ltv > 80 && state.calculation.ltv < 85) {
            const neededResources = Math.ceil((state.formData.loanAmount - (state.formData.propertyValue * 0.8)) / 1000) * 1000;
            DOMElements.ltvTip.innerHTML = `💡 <b>Tip:</b> Vaše LTV je ${state.calculation.ltv.toFixed(1)} %. Kdybyste navýšili vlastní zdroje o <b>${formatCurrency(neededResources)}</b>, dosáhli byste na LTV pod 80 % a získali byste výrazně lepší úrokovou sazbu.`;
            DOMElements.ltvTip.classList.remove('hidden');
        } else {
            DOMElements.ltvTip.classList.add('hidden');
        }

        DOMElements.loanAmountDisplay.textContent = formatCurrency(state.formData.loanAmount);
        DOMElements.ltvDisplay.textContent = `LTV ${state.calculation.ltv.toFixed(1)} %`;
    };

    // --- STEP NAVIGATION ---
    const navigateStep = (direction) => {
        if (direction > 0 && !validateStep(state.currentStep)) return;
        const newStep = state.currentStep + direction;
        if (newStep > 0 && newStep <= DOMElements.formSections.length) {
            if (newStep === 3) generateAnalysis();
            state.currentStep = newStep;
            updateUI();
        }
    };
    
    // --- STEP VALIDATION ---
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

    // --- ANALYSIS & CHART GENERATION ---
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
        
        // Scroll into view (from specification)
        setTimeout(() => {
            DOMElements.analysisResults.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
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

    // --- FORM SUBMISSION (LEAD GENERATION) ---
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
            DOMElements.leadForm.parentElement.classList.add('hidden');
            DOMElements.formSuccess.classList.remove('hidden');
        } catch (error) {
            alert('Chyba při odesílání.');
            btn.disabled = false;
            btn.querySelector('.btn-text').classList.remove('hidden');
            btn.querySelector('.loading-spinner').classList.add('hidden');
        }
    };
    
    // --- AI CHAT ---
    const sendChatMessage = async (messageText) => {
        const message = typeof messageText === 'string' ? messageText : DOMElements.chat.input.value.trim();
        if (!message) return;
        
        addChatMessage(message, 'user');
        if (typeof messageText !== 'string') {
            DOMElements.chat.input.value = '';
        }
        
        addChatMessage('...', 'ai-typing');

        try {
            const res = await fetch(CONFIG.API_CHAT_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context: { ...state.formData, ...state.calculation } })
            });
            if (!res.ok) { 
                const err = await res.json();
                throw new Error(err.error || 'Chyba serveru');
            }
            const data = await res.json();
            updateLastMessage(data.response, 'ai');
        } catch (e) {
            console.error("Chyba AI chatu:", e);
            updateLastMessage('Omlouvám se, mám dočasně technický problém. Zkuste to prosím za chvíli.', 'ai');
        }
    };

    const generateAISuggestions = () => {
        const container = DOMElements.chat.suggestions;
        container.innerHTML = '';
        CONFIG.AI_SUGGESTIONS.forEach(text => {
            const button = document.createElement('button');
            button.className = 'bg-white/10 text-white text-sm py-2 px-3 rounded-full hover:bg-white/20 transition-colors';
            button.textContent = text;
            button.onclick = () => sendChatMessage(text);
            container.appendChild(button);
        });
    };
    
    const addChatMessage = (message, sender) => {
        const bubble = document.createElement('div');
        if (sender === 'ai-typing') {
            bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        } else {
            bubble.innerHTML = message.replace(/\n/g, '<br>');
        }
        bubble.className = `chat-bubble-${sender}`;
        DOMElements.chat.window.appendChild(bubble);
        DOMElements.chat.window.scrollTop = DOMElements.chat.window.scrollHeight;
    };

    const updateLastMessage = (message, sender) => {
        const lastBubble = DOMElements.chat.window.lastElementChild;
        if (lastBubble && lastBubble.classList.contains('chat-bubble-ai-typing')) {
            lastBubble.className = `chat-bubble-${sender}`;
            lastBubble.innerHTML = message.replace(/\n/g, '<br>');
        } else {
            addChatMessage(message, sender);
        }
    };

    // --- UTILITY FUNCTIONS & UI UPDATES ---
    const calculateMonthlyPayment = (p, r, t) => p <= 0 ? 0 : (p * (r/100/12) * Math.pow(1 + (r/100/12), t*12)) / (Math.pow(1 + (r/100/12), t*12) - 1);
    const parseNumber = (s) => {
        const cleaned = String(s).toLowerCase().replace(/,/g, '.').replace(/\s/g, '').replace('kč','');
        if (cleaned.endsWith('m')) return parseFloat(cleaned) * 1000000;
        if (cleaned.endsWith('k')) return parseFloat(cleaned) * 1000;
        return parseFloat(cleaned) || 0;
    };
    const formatCurrency = (n) => n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });
    const debounce = (fn, d) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), d); }};
    const switchMode = (mode) => { state.mode = mode; updateUI(); };
    
    const updateUI = () => {
        DOMElements.calculatorMode.classList.toggle('hidden', state.mode !== 'calculator');
        DOMElements.aiMode.classList.toggle('hidden', state.mode !== 'ai');
        DOMElements.modeButtons.forEach(b => {
            const isActive = b.dataset.mode === state.mode;
            b.classList.toggle('border-white', isActive); b.classList.toggle('text-white', isActive);
            b.classList.toggle('border-transparent', !isActive); b.classList.toggle('text-blue-100', !isActive);
        });

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

    // --- START THE APPLICATION ---
    init();
});

