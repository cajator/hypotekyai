// FinanceAI Pro - v8.0 - Professional Build
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/.netlify/functions/chat',
        API_RATES_ENDPOINT: '/.netlify/functions/rates',
        DEBOUNCE_DELAY: 500,
        AI_SUGGESTIONS: {
            "Začínáme": ["Jak celý proces funguje?", "Co je to LTV?", "Jaké dokumenty budu potřebovat?"],
            "Moje situace": ["Co když jsem OSVČ?", "Mám záznam v registru, vadí to?", "Chceme si půjčit s partnerem?"],
            "Detaily produktu": ["Jaký je rozdíl mezi fixacemi?", "Můžu hypotéku splatit dříve?", "Co se stane, když nebudu moct splácet?"],
        }
    };

    // --- STATE MANAGEMENT ---
    const state = {
        mode: 'guided', // 'express', 'guided', 'ai'
        currentStep: 1,
        formData: { propertyValue: 0, ownResources: 0, loanTerm: 25, fixation: 5, monthlyIncome: 0, monthlyLiabilities: 0 },
        calculation: { loanAmount: 0, ltv: 0, offers: [], selectedOffer: null },
        chart: null,
    };

    // --- DOM ELEMENTS ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        liveUsersCounter: document.getElementById('live-users-counter'),
    };

    // --- TEMPLATES ---
    const templates = {
        guided: document.getElementById('template-guided').innerHTML,
        express: document.getElementById('template-express').innerHTML,
        ai: document.getElementById('template-ai').innerHTML,
    };
    
    // --- INITIALIZATION ---
    const init = () => {
        switchMode(state.mode);
        setInterval(() => {
            const current = parseInt(DOMElements.liveUsersCounter.textContent);
            const change = Math.random() > 0.5 ? 1 : -1;
            DOMElements.liveUsersCounter.textContent = `${Math.max(140, current + change)} lidí právě počítá hypotéku`;
        }, 3000);
    };

    // --- MODE SWITCHING ---
    const switchMode = (mode) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        DOMElements.contentContainer.innerHTML = templates[mode];
        
        switch (mode) {
            case 'guided': initGuidedMode(); break;
            case 'express': initExpressMode(); break;
            case 'ai': initAiMode(); break;
        }
    };

    // --- EVENT LISTENERS ---
    const addEventListeners = () => {
        DOMElements.modeCards.forEach(card => card.addEventListener('click', () => switchMode(card.dataset.mode)));
    };
    
    // =================================================================================
    // GUIDED MODE LOGIC
    // =================================================================================
    let guidedUI = {};
    const initGuidedMode = () => {
        // Build the UI from a template
        const guidedContainer = DOMElements.contentContainer;
        guidedContainer.querySelector('.timeline-step');
        
        const timelineHTML = `
            <div id="timeline" class="mb-12">
                <div class="relative w-full">
                    <div class="timeline-line"><div id="timeline-progress" style="width: 0%;"></div></div>
                    <div class="flex justify-between relative">
                        <div class="timeline-step active" data-step="1"><div class="step-circle">1</div><p>Nemovitost</p></div>
                        <div class="timeline-step" data-step="2"><div class="step-circle">2</div><p>Příjmy</p></div>
                        <div class="timeline-step" data-step="3"><div class="step-circle">3</div><p>Analýza</p></div>
                        <div class="timeline-step" data-step="4"><div class="step-circle">4</div><p>Kontakt</p></div>
                    </div>
                </div>
            </div>`;

        const formHTML = `<div id="form-container">${getFormStepHTML(1)}</div>`;
        const navHTML = `
            <div id="navigation-buttons" class="flex justify-between mt-12">
                <button id="prev-btn" class="nav-btn bg-gray-500 hover:bg-gray-600 hidden">Zpět</button>
                <button id="next-btn" class="nav-btn ml-auto">Další krok</button>
            </div>`;

        guidedContainer.insertAdjacentHTML('beforeend', timelineHTML + formHTML + navHTML);

        // Cache UI elements for this mode
        guidedUI = {
            timelineSteps: guidedContainer.querySelectorAll('.timeline-step'),
            timelineProgress: guidedContainer.querySelector('#timeline-progress'),
            formContainer: guidedContainer.querySelector('#form-container'),
            nextBtn: guidedContainer.querySelector('#next-btn'),
            prevBtn: guidedContainer.querySelector('#prev-btn'),
        };
        
        // Setup event listeners
        guidedUI.nextBtn.addEventListener('click', () => navigateStep(1));
        guidedUI.prevBtn.addEventListener('click', () => navigateStep(-1));
        setupInputListeners();
    };
    
    const getFormStepHTML = (step) => {
        switch(step) {
            case 1: return `
                <div class="form-section active">
                    <h3 class="text-xl font-bold mb-6">Základní parametry hypotéky</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label class="font-semibold block mb-1">Cena nemovitosti</label><input type="text" id="propertyValue" class="modern-input" placeholder="např. 5 000 000, 5m"></div>
                        <div><label class="font-semibold block mb-1">Vlastní zdroje</label><input type="text" id="ownResources" class="modern-input" placeholder="např. 1 000 000 Kč nebo 20%"></div>
                    </div>
                </div>`;
            case 2: return `
                <div class="form-section active">
                     <h3 class="text-xl font-bold mb-6">Vaše finanční situace</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label class="font-semibold block mb-1">Čistý měsíční příjem domácnosti</label><input type="text" id="monthlyIncome" class="modern-input" placeholder="např. 60 000, 60k"></div>
                        <div><label class="font-semibold block mb-1">Měsíční splátky jiných úvěrů</label><input type="text" id="monthlyLiabilities" class="modern-input" placeholder="např. 5 000 Kč" value="0"></div>
                        <div><label class="font-semibold block mb-1">Doba splatnosti (roky)</label><select id="loanTerm" class="modern-input"><option>20</option><option selected>25</option><option>30</option></select></div>
                        <div><label class="font-semibold block mb-1">Fixace (roky)</label><select id="fixation" class="modern-input"><option>3</option><option selected>5</option><option>7</option><option>10</option></select></div>
                    </div>
                </div>`;
             case 3: return `<div class="form-section active" id="analysis-section"></div>`;
             case 4: return `<div class="form-section active" id="contact-section"></div>`;
        }
        return '';
    };
    
    const setupInputListeners = () => {
        const inputs = guidedUI.formContainer.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', debounce(handleInputChange, CONFIG.DEBOUNCE_DELAY));
        });
    };
    
    const handleInputChange = () => {
        const container = guidedUI.formContainer;
        state.formData.propertyValue = parseNumber(container.querySelector('#propertyValue')?.value || state.formData.propertyValue);
        const ownResourcesValue = container.querySelector('#ownResources')?.value || state.formData.ownResources;
        state.formData.ownResources = String(ownResourcesValue).includes('%') 
            ? state.formData.propertyValue * (parseNumber(ownResourcesValue) / 100)
            : parseNumber(ownResourcesValue);
        state.formData.loanTerm = parseInt(container.querySelector('#loanTerm')?.value || state.formData.loanTerm);
        state.formData.fixation = parseInt(container.querySelector('#fixation')?.value || state.formData.fixation);
        state.formData.monthlyIncome = parseNumber(container.querySelector('#monthlyIncome')?.value || state.formData.monthlyIncome);
        state.formData.monthlyLiabilities = parseNumber(container.querySelector('#monthlyLiabilities')?.value || state.formData.monthlyLiabilities);
        
        state.calculation.loanAmount = Math.max(0, state.formData.propertyValue - state.formData.ownResources);
        state.calculation.ltv = state.formData.propertyValue > 0 ? (state.calculation.loanAmount / state.formData.propertyValue) * 100 : 0;
    };
    
    const navigateStep = async (direction) => {
        if (direction > 0 && !validateStep(state.currentStep)) return;
        
        state.currentStep += direction;
        guidedUI.formContainer.innerHTML = getFormStepHTML(state.currentStep);
        setupInputListeners();
        updateGuidedUI();

        if (state.currentStep === 3) {
            await generateAnalysis(guidedUI.formContainer.querySelector('#analysis-section'));
        }
        if (state.currentStep === 4) {
            renderContactForm(guidedUI.formContainer.querySelector('#contact-section'));
        }
    };

    const validateStep = (step) => {
        switch(step) {
            case 1:
                if (state.calculation.loanAmount <= 0) { alert('Zadejte prosím platnou cenu nemovitosti a vlastní zdroje.'); return false; }
                return true;
            case 2:
                if (state.formData.monthlyIncome <= 0) { alert('Zadejte prosím Váš měsíční příjem.'); return false; }
                return true;
            default: return true;
        }
    };
    
    const updateGuidedUI = () => {
        guidedUI.timelineProgress.style.width = `${((state.currentStep - 1) / (guidedUI.timelineSteps.length -1)) * 100}%`;
        guidedUI.timelineSteps.forEach((step, i) => {
            step.classList.toggle('active', i + 1 === state.currentStep);
            step.classList.toggle('completed', i + 1 < state.currentStep);
        });
        guidedUI.prevBtn.classList.toggle('hidden', state.currentStep === 1);
        guidedUI.nextBtn.textContent = state.currentStep === 3 ? "Získat nabídku" : "Další krok";
        guidedUI.nextBtn.classList.toggle('hidden', state.currentStep === 4);
    };

    // =================================================================================
    // EXPRESS MODE LOGIC
    // =================================================================================
    let expressUI = {};
    const initExpressMode = () => {
        expressUI = {
            formContainer: DOMElements.contentContainer.querySelector('#express-form-container'),
            analysisContainer: DOMElements.contentContainer.querySelector('#express-analysis-container'),
        };
        renderExpressForm();
    };

    const renderExpressForm = () => {
        expressUI.formContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div><label class="font-semibold block mb-1 text-sm">Cena nemovitosti</label><input type="text" id="propertyValue" class="modern-input" value="5000000"></div>
                <div><label class="font-semibold block mb-1 text-sm">Vlastní zdroje</label><input type="text" id="ownResources" class="modern-input" value="1000000"></div>
                <div><label class="font-semibold block mb-1 text-sm">Čistý příjem</label><input type="text" id="monthlyIncome" class="modern-input" value="60000"></div>
                <div><label class="font-semibold block mb-1 text-sm">Fixace</label><select id="fixation" class="modern-input"><option>3</option><option selected>5</option><option>7</option><option>10</option></select></div>
                <button id="express-calculate-btn" class="nav-btn w-full">Spočítat</button>
            </div>`;
        
        expressUI.formContainer.querySelector('#express-calculate-btn').addEventListener('click', async () => {
             handleInputChange(); // Sync state
             await generateAnalysis(expressUI.analysisContainer);
        });
    };
    
    // =================================================================================
    // AI MODE LOGIC
    // =================================================================================
    let aiUI = {};
    const initAiMode = () => {
        aiUI = {
            window: DOMElements.contentContainer.querySelector('#chat-window'),
            input: DOMElements.contentContainer.querySelector('#chat-input'),
            sendBtn: DOMElements.contentContainer.querySelector('#chat-send'),
            suggestions: DOMElements.contentContainer.querySelector('#ai-suggestions'),
        };
        
        aiUI.sendBtn.addEventListener('click', () => sendChatMessage());
        aiUI.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
        
        addChatMessage('Dobrý den! Jsem FinanceAI stratég. Ptejte se na cokoliv, nebo si vyberte z témat níže.', 'ai');
        generateAISuggestions();
    };

    const sendChatMessage = async (messageText) => {
        const message = typeof messageText === 'string' ? messageText : aiUI.input.value.trim();
        if (!message) return;
        
        addChatMessage(message, 'user');
        if (typeof messageText !== 'string') aiUI.input.value = '';
        
        addChatMessage('...', 'ai-typing');

        try {
            const res = await fetch(CONFIG.API_CHAT_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, context: { ...state.formData, calculation: state.calculation } })
            });
            if (!res.ok) throw new Error('Chyba serveru');
            const data = await res.json();
            updateLastMessage(data.response, 'ai');
        } catch (e) {
            updateLastMessage('Omlouvám se, mám dočasně technický problém.', 'ai');
        }
    };

    const generateAISuggestions = () => {
        const container = aiUI.suggestions;
        container.innerHTML = '';
        Object.entries(CONFIG.AI_SUGGESTIONS).forEach(([category, questions]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'mb-2';
            categoryDiv.innerHTML = `<h4 class="text-xs font-bold text-gray-500 mb-2">${category}</h4>`;
            
            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'flex flex-wrap gap-2';
            questions.forEach(text => {
                const button = document.createElement('button');
                button.className = 'bg-gray-200 text-gray-700 text-sm py-1 px-3 rounded-full hover:bg-gray-300 transition-colors';
                button.textContent = text;
                button.onclick = () => sendChatMessage(text);
                buttonWrapper.appendChild(button);
            });
            categoryDiv.appendChild(buttonWrapper);
            container.appendChild(categoryDiv);
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
        aiUI.window.appendChild(bubble);
        aiUI.window.scrollTop = aiUI.window.scrollHeight;
    };
    
    const updateLastMessage = (message, sender) => {
        const lastBubble = aiUI.window.lastElementChild;
        if (lastBubble && lastBubble.classList.contains('chat-bubble-ai-typing')) {
            lastBubble.className = `chat-bubble-${sender}`;
            lastBubble.innerHTML = message.replace(/\n/g, '<br>');
        } else {
            addChatMessage(message, sender);
        }
    };


    // =================================================================================
    // SHARED FUNCTIONS (Analysis, Contact Form, Utilities)
    // =================================================================================
    const generateAnalysis = async (container) => {
        container.innerHTML = `<div class="text-center">Analyzuji trh... <div class="loading-spinner inline-block ml-2"></div></div>`;
        try {
            const params = new URLSearchParams({
                loanAmount: state.calculation.loanAmount, propertyValue: state.formData.propertyValue,
                income: state.formData.monthlyIncome, fixation: state.formData.fixation,
            });
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${params}`);
            if (!response.ok) throw new Error('Chyba při načítání nabídek.');
            
            const offers = await response.json();
            if (offers.length === 0) {
                container.innerHTML = `<div class="text-center bg-red-100 p-4 rounded-lg">Bohužel, na základě zadaných parametrů se nám nepodařilo najít vhodnou nabídku.</div>`;
                return;
            }

            state.calculation.offers = offers.map(offer => ({
                ...offer,
                monthlyPayment: calculateMonthlyPayment(state.calculation.loanAmount, offer.rate, state.formData.loanTerm)
            }));
            state.calculation.selectedOffer = state.calculation.offers[0] || null;
            
            renderAnalysis(container);

        } catch (error) {
            container.innerHTML = `<div class="text-center text-red-600">Chyba: ${error.message}</div>`;
        }
    };
    
    const renderAnalysis = (container) => {
        const offer = state.calculation.selectedOffer;
        const totalPaid = offer.monthlyPayment * state.formData.loanTerm * 12;
        const overpayment = totalPaid - state.calculation.loanAmount;

        container.innerHTML = `
            <h3 class="text-xl font-bold mb-6 text-center">Vaše orientační analýza</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <div class="grid grid-cols-2 gap-4 text-center">
                        <div class="bg-gray-100 p-4 rounded-lg">
                            <p class="text-sm text-gray-500">Měsíční splátka</p>
                            <p class="text-2xl font-bold">${formatCurrency(offer.monthlyPayment)}</p>
                        </div>
                        <div class="bg-gray-100 p-4 rounded-lg">
                            <p class="text-sm text-gray-500">Úroková sazba</p>
                            <p class="text-2xl font-bold">${offer.rate.toFixed(2)} %</p>
                        </div>
                    </div>
                    <div class="mt-4 bg-gray-100 p-4 rounded-lg">
                        <div class="flex justify-between text-sm"><p>Celkem zaplatíte</p><p class="font-semibold">${formatCurrency(totalPaid)}</p></div>
                        <div class="flex justify-between text-sm"><p>Přeplatek na úrocích</p><p class="font-semibold">${formatCurrency(overpayment)}</p></div>
                    </div>
                    <p class="text-xs text-gray-500 mt-4 text-center">${offer.bestFor}. Výpočet je orientační. Finální nabídku pro vás zajistí náš specialista.</p>
                </div>
                <div class="bg-gray-100 p-4 rounded-lg h-64"><canvas id="loanChart"></canvas></div>
            </div>`;
        
        updateLoanChart();
    };
    
    const updateLoanChart = () => {
        const offer = state.calculation.selectedOffer;
        if (!offer) return;
        const years = Array.from({ length: state.formData.loanTerm + 1 }, (_, i) => i);
        let principal = state.calculation.loanAmount;
        const data = years.map(() => {
            const p = principal;
            for (let i = 0; i < 12; i++) {
                if (principal <= 0) break;
                principal -= (offer.monthlyPayment - principal * (offer.rate / 100 / 12));
            }
            return Math.max(0, p);
        });

        if (state.chart) state.chart.destroy();
        const ctx = document.getElementById('loanChart').getContext('2d');
        state.chart = new Chart(ctx, {
            type: 'line', data: { labels: years, datasets: [{ label: 'Zbývající jistina', data, borderColor: '#2563eb', tension: 0.1, fill: true, backgroundColor: 'rgba(59, 130, 246, 0.1)' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    };

    const renderContactForm = (container) => {
        container.innerHTML = `
            <div class="text-center max-w-xl mx-auto">
                <h3 class="text-xl font-bold mb-4">Poslední krok k nejlepší hypotéce</h3>
                <p class="text-gray-600 mb-6">Zanechte nám kontakt a náš specialista pro vás **zdarma** vyjedná finální podmínky.</p>
                <form id="lead-form" name="lead-form" class="space-y-4" netlify>
                    <input type="hidden" name="form-name" value="lead-form" />
                    <input type="hidden" name="calculation_summary" id="calculation_summary" />
                    <input type="text" name="name" required class="modern-input" placeholder="Jméno a příjmení">
                    <input type="email" name="email" required class="modern-input" placeholder="E-mail">
                    <input type="tel" name="phone" required class="modern-input" placeholder="Telefon">
                    <button type="submit" class="nav-btn w-full">Chci nejlepší nabídku</button>
                </form>
                <div id="form-success" class="hidden mt-6 bg-green-100 p-4 rounded-lg">
                    <h3 class="font-bold text-green-800">Skvěle! Ozveme se.</h3>
                </div>
            </div>`;
        
        const form = container.querySelector('#lead-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            form.querySelector('button').disabled = true;
            form.querySelector('button').textContent = 'Odesílám...';
            document.getElementById('calculation_summary').value = `KLIENTŮV ZÁMĚR:\nÚvěr: ${formatCurrency(state.calculation.loanAmount)}\nLTV: ${state.calculation.ltv.toFixed(1)}%\nPříjem: ${formatCurrency(state.formData.monthlyIncome)}\nVybraná nabídka: ${formatCurrency(state.calculation.selectedOffer?.monthlyPayment)}/měs. (sazba ${state.calculation.selectedOffer?.rate}%)`;
            try {
                await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() });
                form.classList.add('hidden');
                container.querySelector('#form-success').classList.remove('hidden');
            } catch (error) {
                alert('Chyba při odesílání.');
                form.querySelector('button').disabled = false;
                form.querySelector('button').textContent = 'Chci nejlepší nabídku';
            }
        });
    };

    // --- UTILITIES ---
    const calculateMonthlyPayment = (p, r, t) => p <= 0 ? 0 : (p * (r/100/12) * Math.pow(1 + (r/100/12), t*12)) / (Math.pow(1 + (r/100/12), t*12) - 1);
    const parseNumber = (s) => {
        const cleaned = String(s).toLowerCase().replace(/,/g, '.').replace(/\s/g, '').replace('kč','');
        if (cleaned.endsWith('m')) return parseFloat(cleaned) * 1000000;
        if (cleaned.endsWith('k')) return parseFloat(cleaned) * 1000;
        return parseFloat(cleaned) || 0;
    };
    const formatCurrency = (n) => n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });
    const debounce = (fn, d) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), d); }};

    // --- START ---
    addEventListeners();
    init();
});

