// Hypotéka AI - v10.0 - Final Build
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
    let state = {
        mode: 'guided', // 'express', 'guided', 'ai'
        currentStep: 1,
        formData: {
            purpose: 'koupě',
            propertyType: 'byt',
            applicants: 1,
            age: 35,
            education: 'vysokoškolské',
            employment: 'zaměstnanec',
            income: 60000,
            liabilities: 0,
            propertyValue: 5000000,
            ownResources: 1000000,
            loanTerm: 25,
            fixation: 5,
        },
        calculation: { loanAmount: 0, ltv: 0, offers: [], selectedOffer: null, approvability: 0 },
        chart: null,
    };

    // --- DOM ELEMENTS ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        liveUsersCounter: document.getElementById('live-users-counter'),
        navLinks: document.querySelectorAll('header a[href^="#"]'),
    };

    // --- TEMPLATES ---
    const templates = {
        express: document.getElementById('template-express').innerHTML,
        ai: document.getElementById('template-ai').innerHTML,
    };
    
    // --- INITIALIZATION ---
    const init = () => {
        setupEventListeners();
        switchMode(state.mode);
        startLiveCounter();
    };

    // --- GLOBAL EVENT LISTENERS ---
    const setupEventListeners = () => {
        DOMElements.modeCards.forEach(card => card.addEventListener('click', () => switchMode(card.dataset.mode)));
        DOMElements.navLinks.forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if(target) target.scrollIntoView({ behavior: 'smooth' });
            });
        });
    };
    
    // --- MODE SWITCHING ---
    const switchMode = (mode) => {
        state.mode = mode;
        DOMElements.modeCards.forEach(card => card.classList.toggle('active', card.dataset.mode === mode));
        DOMElements.contentContainer.innerHTML = ''; // Clear previous content
        
        switch (mode) {
            case 'guided': initGuidedMode(); break;
            case 'express': DOMElements.contentContainer.innerHTML = templates.express; initExpressMode(); break;
            case 'ai': DOMElements.contentContainer.innerHTML = templates.ai; initAiMode(); break;
        }
    };
    
    // =================================================================================
    // GUIDED MODE (PROFESSIONAL ANALYSIS) - The core of the new calculator
    // =================================================================================
    let guidedUI = {};
    const initGuidedMode = () => {
        state.currentStep = 1;
        renderGuidedView();
    };
    
    const renderGuidedView = () => {
        const step = state.currentStep;
        DOMElements.contentContainer.innerHTML = `
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold">Profesionální analýza</h2>
                <p class="text-gray-600">Provedeme vás krok za krokem k nejlepší nabídce.</p>
            </div>
            <div class="timeline">
                <div class="timeline-line"><div id="timeline-progress"></div></div>
                <div class="timeline-step" data-step="1"><div class="step-circle">1</div><p>Záměr</p></div>
                <div class="timeline-step" data-step="2"><div class="step-circle">2</div><p>O vás</p></div>
                <div class="timeline-step" data-step="3"><div class="step-circle">3</div><p>Finance</p></div>
                <div class="timeline-step" data-step="4"><div class="step-circle">4</div><p>Analýza</p></div>
            </div>
            <div id="form-container">${getGuidedStepHTML(step)}</div>
            <div class="flex justify-between mt-12">
                <button id="prev-btn" class="nav-btn bg-gray-500 hover:bg-gray-600">Zpět</button>
                <button id="next-btn" class="nav-btn ml-auto"></button>
            </div>
        `;
        setupGuidedListeners();
        updateGuidedUI();
    };

    const setupGuidedListeners = () => {
        guidedUI = {
            formContainer: DOMElements.contentContainer.querySelector('#form-container'),
            nextBtn: DOMElements.contentContainer.querySelector('#next-btn'),
            prevBtn: DOMElements.contentContainer.querySelector('#prev-btn'),
            timelineProgress: DOMElements.contentContainer.querySelector('#timeline-progress'),
            timelineSteps: DOMElements.contentContainer.querySelectorAll('.timeline-step'),
        };
        guidedUI.nextBtn.addEventListener('click', () => navigateStep(1));
        guidedUI.prevBtn.addEventListener('click', () => navigateStep(-1));
        guidedUI.formContainer.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', syncGuidedFormData); // Use change for radios/selects
            input.addEventListener('input', debounce(syncGuidedFormData, CONFIG.DEBOUNCE_DELAY));
        });
    };

    const getGuidedStepHTML = (step) => {
        const data = state.formData;
        switch(step) {
            case 1: return `
                <div class="form-section active">
                    <h3 class="text-xl font-bold mb-6">1. O jakou nemovitost se jedná?</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="form-label">Účel hypotéky</label>
                            <div class="radio-group">${createRadioGroup('purpose', ['koupě', 'výstavba', 'rekonstrukce', 'refinancování'], data.purpose)}</div>
                        </div>
                        <div>
                            <label class="form-label">Typ nemovitosti</label>
                            <div class="radio-group">${createRadioGroup('propertyType', ['byt', 'rodinný dům', 'pozemek', 'družstevní byt'], data.propertyType)}</div>
                        </div>
                        <div><label class="form-label">Cena / Rozpočet</label><input type="text" data-key="propertyValue" class="modern-input" value="${formatCurrency(data.propertyValue, false)}" placeholder="např. 5 000 000"></div>
                        <div><label class="form-label">Vlastní zdroje</label><input type="text" data-key="ownResources" class="modern-input" value="${formatCurrency(data.ownResources, false)}" placeholder="např. 1 000 000"></div>
                    </div>
                </div>`;
            case 2: return `
                <div class="form-section active">
                     <h3 class="text-xl font-bold mb-6">2. Něco o vás</h3>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="form-label">Počet žadatelů</label>
                            <div class="radio-group">${createRadioGroup('applicants', [1, 2], data.applicants)}</div>
                        </div>
                        <div><label class="form-label">Věk nejstaršího žadatele</label><input type="number" data-key="age" class="modern-input" value="${data.age || ''}" placeholder="např. 35"></div>
                        <div>
                            <label class="form-label">Nejvyšší dosažené vzdělání</label>
                            <select data-key="education" class="modern-select">${createSelectOptions(['základní', 'středoškolské', 'vysokoškolské'], data.education)}</select>
                        </div>
                     </div>
                </div>`;
            case 3: return `
                <div class="form-section active">
                     <h3 class="text-xl font-bold mb-6">3. Vaše finance</h3>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="form-label">Typ vašeho hlavního příjmu</label>
                            <select data-key="employment" class="modern-select">${createSelectOptions(['zaměstnanec', 'OSVČ', 's.r.o.', 'jiné'], data.employment)}</select>
                        </div>
                         <div><label class="form-label">Celkový čistý měsíční příjem</label><input type="text" data-key="income" class="modern-input" value="${formatCurrency(data.income, false)}" placeholder="např. 60 000"></div>
                        <div><label class="form-label">Celkové měsíční splátky</label><input type="text" data-key="liabilities" class="modern-input" value="${formatCurrency(data.liabilities, false)}" placeholder="např. 5 000"></div>
                     </div>
                </div>`;
             case 4: return `<div class="form-section active" id="analysis-container"></div>`;
        }
        return '';
    };

    const syncGuidedFormData = (event) => {
        const el = event.target;
        const key = el.dataset.key || el.name;
        if (!key) return;
        
        let value = el.type === 'radio' ? el.value : el.value;
        state.formData[key] = isNaN(parseInt(value)) ? parseNumber(value) || value : parseInt(value);
    };

    const navigateStep = async (direction) => {
        if (direction > 0 && !validateStep(state.currentStep)) return;
        
        state.currentStep += direction;
        
        if (state.currentStep === 5) {
             renderContactForm(DOMElements.contentContainer);
             return;
        }

        renderGuidedView();
        
        if (state.currentStep === 4) {
             await generateAnalysis(DOMElements.contentContainer.querySelector('#analysis-container'));
        }
    };

    const updateGuidedUI = () => {
        guidedUI.timelineProgress.style.width = `${((state.currentStep - 1) / 3) * 100}%`;
        guidedUI.timelineSteps.forEach((step, i) => {
            step.classList.toggle('active', i + 1 === state.currentStep);
            step.classList.toggle('completed', i + 1 < state.currentStep);
        });
        guidedUI.prevBtn.style.visibility = state.currentStep === 1 ? 'hidden' : 'visible';
        guidedUI.nextBtn.textContent = state.currentStep === 3 ? "Zobrazit analýzu" : "Další krok";
    };

    // =================================================================================
    // EXPRESS MODE LOGIC
    // =================================================================================
    const initExpressMode = () => {
        const ui = {
            formContainer: DOMElements.contentContainer.querySelector('#express-form-container'),
            analysisContainer: DOMElements.contentContainer.querySelector('#express-analysis-container'),
        };
        renderExpressForm(ui.formContainer);
        ui.formContainer.querySelector('#express-calculate-btn').addEventListener('click', async () => {
             syncExpressFormData();
             await generateAnalysis(ui.analysisContainer);
        });
    };

    const renderExpressForm = (container) => {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div><label class="form-label">Cena nemovitosti</label><input type="text" data-key="propertyValue" class="modern-input" value="5 000 000"></div>
                <div><label class="form-label">Vlastní zdroje</label><input type="text" data-key="ownResources" class="modern-input" value="1 000 000"></div>
                <div><label class="form-label">Čistý příjem</label><input type="text" data-key="income" class="modern-input" value="60 000"></div>
                <div><label class="form-label">Fixace</label><select data-key="fixation" class="modern-select">${createSelectOptions([3,5,7,10], 5)}</select></div>
                <button id="express-calculate-btn" class="nav-btn w-full h-[51px]">Spočítat</button>
            </div>`;
    };

     const syncExpressFormData = () => {
        DOMElements.contentContainer.querySelectorAll('[data-key]').forEach(el => {
             state.formData[el.dataset.key] = parseNumber(el.value) || el.value;
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
        
        addChatMessage('Dobrý den! Jsem Hypotéka AI stratég. Ptejte se na cokoliv, nebo si vyberte z témat níže.', 'ai');
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
                body: JSON.stringify({ message, context: { formData: state.formData, calculation: state.calculation } })
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Chyba serveru AI.');
            }
            const data = await res.json();
            updateLastMessage(data.response, 'ai');
        } catch (e) {
            updateLastMessage(`Omlouvám se, mám dočasně technický problém. (${e.message})`, 'ai');
        }
    };
    
    // --- SHARED FUNCTIONS (Analysis, Contact Form, Utilities) ---

    const generateAnalysis = async (container) => {
        container.innerHTML = `<div class="text-center py-10">Analyzuji trh a počítám scoring... <div class="loading-spinner-blue"></div></div>`;
        
        // Ensure loanTerm is set, default if not
        if (!state.formData.loanTerm) state.formData.loanTerm = 25;

        state.calculation.loanAmount = Math.max(0, state.formData.propertyValue - state.formData.ownResources);
        state.calculation.ltv = state.formData.propertyValue > 0 ? (state.calculation.loanAmount / state.formData.propertyValue) * 100 : 0;
        
        try {
            const params = new URLSearchParams(state.formData);
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${params.toString()}`);
            if (!response.ok) throw new Error('Chyba při načítání nabídek.');
            
            const data = await response.json();
            if (!data.offers || data.offers.length === 0) {
                container.innerHTML = `<div class="text-center bg-red-100 p-4 rounded-lg">Bohužel, na základě zadaných parametrů se nám nepodařilo najít vhodnou nabídku. Zkuste prosím upravit vstupní údaje.</div>`;
                return;
            }

            state.calculation.offers = data.offers;
            state.calculation.approvability = data.approvability;
            state.calculation.selectedOffer = data.offers[0] || null;
            
            renderAnalysis(container);

        } catch (error) {
            console.error("Analysis Error:", error);
            container.innerHTML = `<div class="text-center text-red-600 p-4 bg-red-100 rounded-lg"><b>Chyba:</b> ${error.message} Zkuste to prosím znovu, nebo kontaktujte podporu.</div>`;
        }
    };
    
    const renderAnalysis = (container) => {
        const offer = state.calculation.selectedOffer;
        if(!offer) return;

        const totalPaid = offer.monthlyPayment * state.formData.loanTerm * 12;
        const overpayment = totalPaid - state.calculation.loanAmount;

        container.innerHTML = `
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold">Vaše osobní analýza</h2>
                <p class="text-gray-600">Na základě zadaných údajů jsme pro vás připravili odhad.</p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div class="lg:col-span-3 bg-gray-50 p-6 rounded-lg">
                    <h3 class="font-bold text-lg mb-4">Vývoj splácení úvěru</h3>
                    <div class="h-80"><canvas id="loanChart"></canvas></div>
                </div>
                <div class="lg:col-span-2 space-y-4">
                    <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
                        <p class="text-sm text-blue-800 font-semibold">Nejlepší odhad splátky</p>
                        <p class="text-3xl font-bold text-blue-900">${formatCurrency(offer.monthlyPayment)}</p>
                        <p class="text-sm text-blue-700">s úrokem od ${offer.rate.toFixed(2)} %</p>
                    </div>
                     <div class="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                        <p class="text-sm text-green-800 font-semibold">Pravděpodobnost schválení</p>
                        <p class="text-3xl font-bold text-green-900">${state.calculation.approvability}%</p>
                    </div>
                    <div class="text-sm space-y-2 text-gray-600 p-4 bg-gray-50 rounded-lg">
                        <div class="flex justify-between"><p>Výše úvěru (LTV)</p><p class="font-semibold">${formatCurrency(state.calculation.loanAmount)} (${state.calculation.ltv.toFixed(1)}%)</p></div>
                        <div class="flex justify-between"><p>Celkem zaplatíte</p><p class="font-semibold">${formatCurrency(totalPaid)}</p></div>
                        <div class="flex justify-between border-t pt-2 mt-2"><p>Přeplatek na úrocích</p><p class="font-semibold">${formatCurrency(overpayment)}</p></div>
                    </div>
                </div>
            </div>`;
        
        updateLoanChart();
        
        if (state.mode !== 'guided') {
            const contactContainer = document.createElement('div');
            container.appendChild(contactContainer);
            renderContactForm(contactContainer);
        }
    };

    const updateLoanChart = () => {
        const canvas = document.getElementById('loanChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const offer = state.calculation.selectedOffer;
        const loanAmount = state.calculation.loanAmount;
        const term = state.formData.loanTerm;
        
        let balance = loanAmount;
        const dataPrincipal = [];
        const dataInterest = [];
        const labels = [];
        
        for (let year = 0; year <= term; year++) {
            labels.push(`Rok ${year}`);
            dataPrincipal.push(loanAmount - balance);
            dataInterest.push(balance);
            for (let month = 0; month < 12; month++) {
                let interestPayment = balance * (offer.rate / 100 / 12);
                let principalPayment = offer.monthlyPayment - interestPayment;
                balance -= principalPayment;
            }
        }

        if (state.chart) {
            state.chart.destroy();
        }

        state.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Splacená jistina',
                    data: dataPrincipal,
                    backgroundColor: '#2563eb',
                }, {
                    label: 'Zbývající dluh',
                    data: dataInterest,
                    backgroundColor: '#dbeafe',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, ticks: { callback: (value) => `${value / 1000000} mil.` } }
                },
                plugins: { legend: { position: 'bottom' } }
            }
        });
    };

    const renderContactForm = (container) => {
        container.innerHTML = `
            <div class="mt-12 text-center border-t pt-8">
                <h3 class="text-2xl font-bold">Získejte finální nabídku od specialisty</h3>
                <p class="text-gray-600 mb-6">Nechte si zdarma a nezávazně připravit nabídku na míru.</p>
                <a href="mailto:info@hypotekai.cz" class="nav-btn">Chci nabídku od specialisty</a>
            </div>
        `;
    };
    
    const validateStep = (step) => {
        const data = state.formData;
        switch(step) {
            case 1: return data.propertyValue > 0 && data.ownResources >= 0;
            case 2: return data.applicants > 0 && data.age > 17;
            case 3: return data.income > 0;
        }
        return true;
    };
    
    // --- AI MODE HELPERS ---
    const addChatMessage = (message, sender) => {
        if (!aiUI.window) return;
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble-${sender}`;
        if (sender === 'ai-typing') {
            bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        } else {
            bubble.textContent = message;
        }
        aiUI.window.appendChild(bubble);
        aiUI.window.scrollTop = aiUI.window.scrollHeight;
    };

    const updateLastMessage = (message, sender) => {
        if (!aiUI.window) return;
        const lastBubble = aiUI.window.querySelector('.chat-bubble-ai-typing');
        if (lastBubble) {
            lastBubble.className = `chat-bubble-${sender}`;
            lastBubble.innerHTML = message;
        }
    };
    
    const generateAISuggestions = () => {
        if (!aiUI.suggestions) return;
        let html = '';
        for (const category in CONFIG.AI_SUGGESTIONS) {
            html += `<div class="mb-2"><p class="text-xs font-bold text-gray-500 uppercase">${category}</p><div class="flex flex-wrap gap-2 mt-1">`;
            CONFIG.AI_SUGGESTIONS[category].forEach(q => {
                html += `<button class="suggestion-btn">${q}</button>`;
            });
            html += `</div></div>`;
        }
        aiUI.suggestions.innerHTML = html;
        aiUI.suggestions.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => sendChatMessage(btn.textContent));
        });
    };

    // --- UTILITIES ---
    const createRadioGroup = (name, options, selectedValue) => options.map(opt => `<label class="radio-label"><input type="radio" name="${name}" value="${opt}" ${opt == selectedValue ? 'checked' : ''}><span>${String(opt).charAt(0).toUpperCase() + String(opt).slice(1)}</span></label>`).join('');
    const createSelectOptions = (options, selectedValue) => options.map(opt => `<option value="${opt}" ${opt == selectedValue ? 'selected' : ''}>${String(opt).charAt(0).toUpperCase() + String(opt).slice(1)}</option>`).join('');
    
    const startLiveCounter = () => {
        let count = 147;
        setInterval(() => {
            const change = Math.floor(Math.random() * 5) - 2;
            count = Math.max(120, count + change);
            if(DOMElements.liveUsersCounter) DOMElements.liveUsersCounter.textContent = `${count} lidí právě počítá hypotéku`;
        }, 3000);
    };

    const parseNumber = (s) => {
        if (typeof s !== 'string' && typeof s !== 'number') return 0;
        const cleaned = String(s).toLowerCase().replace(/,/g, '.').replace(/\s/g, '').replace('kč','');
        if (cleaned.endsWith('m')) return parseFloat(cleaned) * 1000000;
        if (cleaned.endsWith('k')) return parseFloat(cleaned) * 1000;
        return parseFloat(cleaned) || 0;
    };
    
    const formatCurrency = (n, useSymbol = true) => {
        if (isNaN(n) || n === 0) return '';
        const options = { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 };
        if (!useSymbol) {
            options.style = 'decimal';
        }
        return new Intl.NumberFormat('cs-CZ', options).format(n);
    }
    
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // --- START ---
    init();
});

