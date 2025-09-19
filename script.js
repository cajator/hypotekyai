<<<<<<< HEAD
// Hypotéka AI - v11.0 - Final Build
=======
// script.js - Hypotéka AI - Hlavní aplikační logika
>>>>>>> 66ce2cecf5e96217a9f405406dd54416f39144d7
'use strict';

// ===== KONFIGURACE =====
const CONFIG = {
    VERSION: '2.0.0',
    API: {
        CHAT: '/.netlify/functions/chat',
        RATES: '/.netlify/functions/rates'
    },
    DEBOUNCE_DELAY: 500,
    ANIMATION_SPEED: 300
};

// ===== GLOBÁLNÍ STAV =====
const AppState = {
    currentStep: 1,
    maxSteps: 5,
    currentMode: 'calculator',
    selectedIntent: '',
    formData: {
        propertyValue: 0,
        ownResources: 0,
        loanAmount: 0,
        loanTerm: 25,
        fixation: 5,
        monthlyIncome: 0,
        monthlyLiabilities: 0,
        ltv: 0,
        dsti: 0,
        monthlyPayment: 0
    },
    offers: [],
    selectedBank: null,
    isLoading: false
};

// ===== INICIALIZACE =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏡 Hypotéka AI v' + CONFIG.VERSION + ' - Inicializace...');
    
<<<<<<< HEAD
    // --- CONFIGURATION ---
    const CONFIG = {
        API_CHAT_ENDPOINT: '/.netlify/functions/chat',
        API_RATES_ENDPOINT: '/.netlify/functions/rates',
        DEBOUNCE_DELAY: 500,
        SLIDER_STEPS: {
            propertyValue: 100000,
            ownResources: 50000,
            income: 1000,
            landValue: 50000,
            constructionBudget: 100000,
            loanBalance: 50000,
        },
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
            education: 'středoškolské s maturitou',
            employment: 'zaměstnanec',
            income: 60000,
            liabilities: 0,
            propertyValue: 5000000,
            ownResources: 1000000,
            landValue: 1500000,
            constructionBudget: 4000000,
            loanBalance: 3000000,
            loanTerm: 25,
            fixation: 5,
        },
        calculation: { loanAmount: 0, ltv: 0, dsti: 0, offers: [], selectedOffer: null, approvability: 0 },
        chart: null,
    };

    // --- DOM ELEMENTS ---
    const DOMElements = {
        contentContainer: document.getElementById('content-container'),
        modeCards: document.querySelectorAll('.mode-card'),
        liveUsersCounter: document.getElementById('live-users-counter'),
        navLinks: document.querySelectorAll('header a[href^="#"]'),
        leadForm: document.getElementById('lead-form'),
    };

    // --- TEMPLATES ---
    const templates = {
        express: document.getElementById('template-express').innerHTML,
        ai: document.getElementById('template-ai').innerHTML,
    };
    
    // --- INITIALIZATION ---
    const init = () => {
=======
    try {
        initializeApp();
>>>>>>> 66ce2cecf5e96217a9f405406dd54416f39144d7
        setupEventListeners();
        loadCurrentRates();
        startLiveCounter();
<<<<<<< HEAD
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
        DOMElements.leadForm.addEventListener('submit', handleFormSubmit);
    };
    
    const handleFormSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner"></span> Odesílám...';

        fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(new FormData(form)).toString(),
        })
        .then(() => {
            form.style.display = 'none';
            document.getElementById('form-success').style.display = 'block';
        })
        .catch((error) => alert(error));
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
    // GUIDED MODE (PROFESSIONAL ANALYSIS)
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
            <div id="timeline-container"></div>
            <div id="form-container"></div>
            <div class="flex justify-between mt-12">
                <button id="prev-btn" class="nav-btn bg-gray-500 hover:bg-gray-600">Zpět</button>
                <button id="next-btn" class="nav-btn ml-auto"></button>
            </div>
        `;
        renderTimeline();
        renderGuidedStep();
        setupGuidedListeners();
        updateGuidedUI();
    };
    
    const renderTimeline = () => {
        const container = DOMElements.contentContainer.querySelector('#timeline-container');
        if(!container) return;
        container.innerHTML = `
         <div class="timeline">
                <div class="timeline-line"><div id="timeline-progress"></div></div>
                <div class="timeline-step" data-step="1"><div class="step-circle">1</div><p>Záměr</p></div>
                <div class="timeline-step" data-step="2"><div class="step-circle">2</div><p>O vás</p></div>
                <div class="timeline-step" data-step="3"><div class="step-circle">3</div><p>Finance</p></div>
                <div class="timeline-step" data-step="4"><div class="step-circle">4</div><p>Analýza</p></div>
            </div>`;
    };

    const renderGuidedStep = () => {
        const container = DOMElements.contentContainer.querySelector('#form-container');
        if(!container) return;
        container.innerHTML = getGuidedStepHTML(state.currentStep);
        container.querySelectorAll('.slider-container').forEach(initSlider);
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
        guidedUI.formContainer.addEventListener('input', syncGuidedFormData);
    };

    const getGuidedStepHTML = (step) => {
        const data = state.formData;
        let purposeSpecificHTML = '';

        if(step === 1) {
            switch(data.purpose) {
                case 'výstavba':
                    purposeSpecificHTML = createSliderInput('landValue', 'Cena pozemku', 0, 10000000, data.landValue) + createSliderInput('constructionBudget', 'Rozpočet na výstavbu', 1000000, 20000000, data.constructionBudget);
                    break;
                case 'rekonstrukce':
                    purposeSpecificHTML = createSliderInput('propertyValue', 'Hodnota nemovitosti před', 1000000, 20000000, data.propertyValue) + createSliderInput('constructionBudget', 'Rozpočet na rekonstrukci', 100000, 5000000, data.constructionBudget);
                    break;
                 case 'refinancování':
                    purposeSpecificHTML = createSliderInput('propertyValue', 'Aktuální hodnota nemovitosti', 1000000, 20000000, data.propertyValue) + createSliderInput('loanBalance', 'Zůstatek úvěru k refinancování', 100000, 20000000, data.loanBalance);
                    break;
                default: // koupě
                    purposeSpecificHTML = createSliderInput('propertyValue', 'Cena nemovitosti', 1000000, 20000000, data.propertyValue) + createSliderInput('ownResources', 'Vlastní zdroje', 0, 10000000, data.ownResources);
                    break;
            }
        }
        
        if (step === 3) {
            const tempDSTI = calculateDSTI(data.income, data.liabilities);
            const dstiColor = tempDSTI <= 40 ? 'green' : tempDSTI <= 50 ? 'orange' : 'red';
            purposeSpecificHTML = `<div class="md:col-span-2 mt-4"><p class="text-sm text-center">Vaše orientační DSTI je <strong style="color:${dstiColor}">${tempDSTI.toFixed(1)}%</strong> (poměr výdajů k příjmům). Limit bank je 50%.</p></div>`;
        }

        switch(step) {
            case 1: return `
                <div class="form-section active">
                    <h3 class="text-xl font-bold mb-6">1. Jaký je váš záměr?</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="form-label">Účel hypotéky</label>
                            <div class="radio-group">${createRadioGroup('purpose', ['koupě', 'výstavba', 'rekonstrukce', 'refinancování'], data.purpose)}</div>
                        </div>
                        <div class="space-y-6">${purposeSpecificHTML}</div>
                    </div>
                </div>`;
            case 2: return `
                <div class="form-section active">
                     <h3 class="text-xl font-bold mb-6">2. Něco o vás</h3>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="form-label">Počet žadatelů</label>
                            <div class="radio-group">${createRadioGroup('applicants', [1, 2], data.applicants)}</div>
                        </div>
                        <div><label class="form-label">Věk nejstaršího žadatele</label><input type="number" data-key="age" class="modern-input" value="${data.age || ''}" placeholder="např. 35"></div>
                        <div class="md:col-span-2">
                            <label class="form-label">Nejvyšší dosažené vzdělání</label>
                            <select data-key="education" class="modern-select">${createSelectOptions(['základní', 'vyučen/odborné', 'středoškolské bez maturity', 'středoškolské s maturitou', 'vysokoškolské'], data.education)}</select>
                        </div>
                     </div>
                </div>`;
            case 3: return `
                <div class="form-section active">
                     <h3 class="text-xl font-bold mb-6">3. Vaše finance</h3>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="form-label">Typ vašeho hlavního příjmu</label>
                            <select data-key="employment" class="modern-select">${createSelectOptions(['zaměstnanec', 'OSVČ', 's.r.o.', 'jiné'], data.employment)}</select>
                        </div>
                        <div></div>
                        ${createSliderInput('income', 'Celkový čistý měsíční příjem', 20000, 200000, data.income)}
                        ${createSliderInput('liabilities', 'Celkové měsíční splátky', 0, 100000, data.liabilities)}
                        ${purposeSpecificHTML}
                     </div>
                </div>`;
             case 4: return `<div class="form-section active" id="analysis-container"></div>`;
        }
        return '';
    };
    
    const calculateDSTI = (income, liabilities) => {
        if (!income || income === 0) return 0;
        updateFinalLoanDetails(); // Make sure loan amount is current
        const estimatedPayment = state.calculation.loanAmount * 0.005; 
        return ((liabilities + estimatedPayment) / income) * 100;
    }

    const syncGuidedFormData = (event) => {
        const el = event.target;
        const key = el.dataset.key || el.name;
        if (!key) return;
        
        let value = el.type === 'radio' ? el.value : el.value;
        if (el.type !== 'range') { // prevent slider from overwriting text input with unparsed value
            state.formData[key] = isNaN(parseInt(value)) ? (el.type === 'text' ? parseNumber(value) : value) : parseInt(value);
        }
        
        if (key === 'purpose' && el.type === 'radio') {
             renderGuidedStep();
        }
        if (state.currentStep === 3) {
            const dstiContainer = DOMElements.contentContainer.querySelector('.md\\:col-span-2.mt-4');
            if(dstiContainer) {
                 const tempDSTI = calculateDSTI(state.formData.income, state.formData.liabilities);
                 const dstiColor = tempDSTI <= 40 ? 'green' : tempDSTI <= 50 ? 'orange' : 'red';
                 dstiContainer.innerHTML = `<p class="text-sm text-center">Vaše orientační DSTI je <strong style="color:${dstiColor}">${tempDSTI.toFixed(1)}%</strong> (poměr výdajů k příjmům). Limit bank je 50%.</p>`;
            }
        }
    };

    const navigateStep = async (direction) => {
        if (direction > 0 && !validateStep(state.currentStep)) {
            alert("Prosím, vyplňte všechna povinná pole.");
            return;
        }
        
        state.currentStep += direction;
        
        if (state.currentStep > 4) {
            state.currentStep = 4; // cap at analysis
            const kontakt = document.getElementById('kontakt');
            if (kontakt) kontakt.scrollIntoView({behavior: 'smooth'});
            return;
        }

        renderGuidedView();
        
        if (state.currentStep === 4) {
             await generateAnalysis(DOMElements.contentContainer.querySelector('#analysis-container'));
        }
    };

    const updateGuidedUI = () => {
        if(!guidedUI.timelineProgress) return;
        guidedUI.timelineProgress.style.width = `${((state.currentStep - 1) / 3) * 100}%`;
        guidedUI.timelineSteps.forEach((step, i) => {
            step.classList.toggle('active', i + 1 === state.currentStep);
            step.classList.toggle('completed', i + 1 < state.currentStep);
        });
        guidedUI.prevBtn.style.visibility = state.currentStep === 1 ? 'hidden' : 'visible';
        const nextButtonText = {
            1: "Další krok",
            2: "Další krok",
            3: "Zobrazit analýzu",
            4: "Kontaktovat specialistu"
        };
        guidedUI.nextBtn.textContent = nextButtonText[state.currentStep];
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
        
        updateFinalLoanDetails();
        
        try {
            const params = new URLSearchParams(state.formData);
            const response = await fetch(`${CONFIG.API_RATES_ENDPOINT}?${params.toString()}`);
            if (!response.ok) throw new Error('Chyba při načítání nabídek.');
            
            const data = await response.json();
            if (!data.offers || data.offers.length === 0) {
                container.innerHTML = `<div class="text-center bg-red-100 p-4 rounded-lg">Bohužel, na základě zadaných parametrů se nám nepodařilo najít vhodnou nabídku. Zkuste prosím upravit vstupní údaje.</div>`;
                return;
            }

            state.calculation = { ...state.calculation, ...data };
            
            renderAnalysis(container);
            
            const analysisDetails = document.getElementById('analysis-details');
            if (analysisDetails) {
                 analysisDetails.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

        } catch (error) {
            console.error("Analysis Error:", error);
            container.innerHTML = `<div class="text-center text-red-600 p-4 bg-red-100 rounded-lg"><b>Chyba:</b> ${error.message} Zkuste to prosím znovu, nebo kontaktujte podporu.</div>`;
        }
    };
    
    const updateFinalLoanDetails = () => {
         const data = state.formData;
         switch(data.purpose) {
            case 'výstavba':
                data.propertyValue = data.landValue + data.constructionBudget;
                data.ownResources = data.landValue;
                break;
            case 'rekonstrukce':
                // propertyValue is already set as "before", so we add the budget to get the "after" value for LTV
                state.calculation.finalPropertyValue = data.propertyValue + data.constructionBudget;
                state.calculation.loanAmount = data.constructionBudget; // Loan is just for reconstruction
                state.calculation.ltv = state.calculation.finalPropertyValue > 0 ? (state.calculation.loanAmount / state.calculation.finalPropertyValue) * 100 : 0;
                return; // Early exit to prevent standard calculation override
            case 'refinancování':
                state.calculation.loanAmount = data.loanBalance;
                state.calculation.ltv = data.propertyValue > 0 ? (data.loanBalance / data.propertyValue) * 100 : 0;
                return;
        }
        state.calculation.loanAmount = Math.max(0, data.propertyValue - data.ownResources);
        state.calculation.ltv = data.propertyValue > 0 ? (state.calculation.loanAmount / data.propertyValue) * 100 : 0;
    }
    
    const renderAnalysis = (container) => {
        const { offers } = state.calculation;
        if(!offers || offers.length === 0) return;

        container.innerHTML = `
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold">Vaše osobní analýza</h2>
                <p class="text-gray-600">Na základě zadaných údajů jsme pro vás připravili 3 nejlepší scénáře.</p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                ${offers.map((offer, index) => createOfferCard(offer, index)).join('')}
            </div>
            <div id="analysis-details" class="grid grid-cols-1 lg:grid-cols-5 gap-8"></div>
        `;
        
        DOMElements.contentContainer.querySelectorAll('.offer-card').forEach(card => {
            card.addEventListener('click', () => {
                const selectedId = card.dataset.offerId;
                state.calculation.selectedOffer = state.calculation.offers.find(o => o.id === selectedId);
                DOMElements.contentContainer.querySelectorAll('.offer-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                renderAnalysisDetails();
            });
        });

        const firstCard = DOMElements.contentContainer.querySelector('.offer-card');
        if(firstCard) firstCard.click();
    };
    
    const renderAnalysisDetails = () => {
        const container = DOMElements.contentContainer.querySelector('#analysis-details');
        if(!container || !state.calculation.selectedOffer) return;

        const offer = state.calculation.selectedOffer;
        const totalPaid = offer.monthlyPayment * state.formData.loanTerm * 12;
        const overpayment = totalPaid - state.calculation.loanAmount;

        container.innerHTML = `
            <div class="lg:col-span-3 bg-gray-50 p-6 rounded-lg">
                <h3 class="font-bold text-lg mb-4">Vývoj splácení úvěru</h3>
                <div class="h-80"><canvas id="loanChart"></canvas></div>
            </div>
            <div class="lg:col-span-2 space-y-4">
                 <div class="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                    <p class="text-sm text-green-800 font-semibold">Pravděpodobnost schválení</p>
                    <p class="text-3xl font-bold text-green-900">${state.calculation.approvability}%</p>
                </div>
                <div class="text-sm space-y-2 text-gray-600 p-4 bg-gray-50 rounded-lg">
                    <div class="flex justify-between"><p>Výše úvěru (LTV)</p><p class="font-semibold">${formatCurrency(state.calculation.loanAmount, true)} (${state.calculation.ltv.toFixed(1)}%)</p></div>
                    <div class="flex justify-between"><p>Vaše DSTI</p><p class="font-semibold">${state.calculation.dsti.toFixed(1)}%</p></div>
                    <div class="flex justify-between"><p>Celkem zaplatíte</p><p class="font-semibold">${formatCurrency(totalPaid, true)}</p></div>
                    <div class="flex justify-between border-t pt-2 mt-2"><p>Přeplatek na úrocích</p><p class="font-semibold text-red-600">${formatCurrency(overpayment, true)}</p></div>
                </div>
            </div>`;
        updateLoanChart();
    };

    const createOfferCard = (offer, index) => {
        return `
        <div class="offer-card p-6 rounded-lg text-center" data-offer-id="${offer.id}">
            <h4 class="font-bold text-lg">${offer.bestFor}</h4>
            <p class="text-3xl font-bold text-blue-600">${offer.rate.toFixed(2)} %</p>
            <p class="text-gray-700 font-semibold">${formatCurrency(offer.monthlyPayment, true)} / měsíc</p>
        </div>`;
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
            if (year < term && balance > 0) {
                 for (let month = 0; month < 12; month++) {
                    let interestPayment = balance * (offer.rate / 100 / 12);
                    let principalPayment = offer.monthlyPayment - interestPayment;
                    balance = Math.max(0, balance - principalPayment);
                }
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
    
    const validateStep = (step) => {
        const data = state.formData;
        switch(step) {
            case 1: 
                if(data.purpose === 'koupě') return data.propertyValue > 0 && data.ownResources >= 0;
                if(data.purpose === 'výstavba') return data.constructionBudget > 0;
                if(data.purpose === 'rekonstrukce') return data.propertyValue > 0 && data.constructionBudget > 0;
                if(data.purpose === 'refinancování') return data.propertyValue > 0 && data.loanBalance > 0;
                return false;
            case 2: return data.applicants > 0 && data.age > 17 && data.age < 70;
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
            lastBubble.innerHTML = message.replace(/\n/g, '<br>');
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
    const createSliderInput = (key, label, min, max, value) => `
        <div class="md:col-span-1 slider-container">
            <label class="form-label flex justify-between"><span>${label}</span><strong id="${key}-val">${formatCurrency(value, true)}</strong></label>
            <input type="range" data-key="${key}-slider" min="${min}" max="${max}" value="${value}" step="${CONFIG.SLIDER_STEPS[key] || 10000}" class="range-slider">
            <input type="text" data-key="${key}" class="modern-input mt-2" value="${formatCurrency(value, false)}">
        </div>
    `;
    const initSlider = (container) => {
        const range = container.querySelector('input[type="range"]');
        const text = container.querySelector('input[type="text"]');
        const label = container.querySelector('strong');
        if(!range || !text || !label) return;
        
        const syncValues = (sourceElement) => {
            const val = parseNumber(sourceElement.value);
            if (sourceElement.type === 'range') {
                text.value = formatCurrency(val, false);
            } else { // text input
                range.value = Math.min(Math.max(val, range.min), range.max);
            }
            label.textContent = formatCurrency(val, true);
            // This is the key part to update the main state object
            const key = text.dataset.key;
            state.formData[key] = val;

            // Trigger re-render of DSTI if in step 3
             if (state.currentStep === 3) {
                const dstiContainer = DOMElements.contentContainer.querySelector('.md\\:col-span-2.mt-4');
                if(dstiContainer) {
                    const tempDSTI = calculateDSTI(state.formData.income, state.formData.liabilities);
                    const dstiColor = tempDSTI <= 40 ? 'green' : tempDSTI <= 50 ? 'orange' : 'red';
                    dstiContainer.innerHTML = `<p class="text-sm text-center">Vaše orientační DSTI je <strong style="color:${dstiColor}">${tempDSTI.toFixed(1)}%</strong> (poměr výdajů k příjmům). Limit bank je 50%.</p>`;
                }
            }
        };

        range.addEventListener('input', () => syncValues(range));
        text.addEventListener('input', debounce(() => syncValues(text), CONFIG.DEBOUNCE_DELAY));
    };
    
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
        const cleaned = String(s).toLowerCase().replace(/,/g, '.').replace(/\s|kč/g, '');
        if (cleaned.endsWith('m')) return parseFloat(cleaned) * 1000000;
        if (cleaned.endsWith('k')) return parseFloat(cleaned) * 1000;
        return parseFloat(cleaned) || 0;
    };
    
    const formatCurrency = (n, useSymbol = true) => {
        if (isNaN(n) || n === null) return '';
        const options = { currency: 'CZK', maximumFractionDigits: 0 };
        if (useSymbol) {
            options.style = 'currency';
        } else {
            options.style = 'decimal';
        }
        return new Intl.NumberFormat('cs-CZ', options).format(n);
=======
        setupChatSuggestions();
        
        console.log('✅ Aplikace připravena');
    } catch (error) {
        console.error('❌ Chyba při inicializaci:', error);
>>>>>>> 66ce2cecf5e96217a9f405406dd54416f39144d7
    }
});

// ===== HLAVNÍ FUNKCE =====
function initializeApp() {
    // Reset stavu
    AppState.currentStep = 1;
    AppState.currentMode = 'calculator';
    
    // Zobrazit první krok
    showStep(1);
    updateTimeline(1);
    updateNavigationButtons();
    
    // Nastavit výchozí mód
    setMode('calculator');
    
    // Načíst uložená data
    loadSavedData();
    
    // Aktualizovat datum
    document.getElementById('last-updated').textContent = new Date().toLocaleDateString('cs-CZ');
}

function setupEventListeners() {
    // Intent buttons
    document.querySelectorAll('.intent-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            selectIntent(this.dataset.intent);
        });
    });
    
    // Mode switcher
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            setMode(this.dataset.mode);
        });
    });
    
    // Timeline steps
    document.querySelectorAll('.timeline-step').forEach((step, index) => {
        step.addEventListener('click', function(e) {
            e.preventDefault();
            const stepNum = index + 1;
            if (stepNum <= AppState.currentStep) {
                goToStep(stepNum);
            }
        });
    });
    
    // Navigation buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateStep(-1);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateStep(1);
        });
    }
    
    // Form inputs with debouncing
    const debouncedCalculate = debounce(calculateAndFetchRates, CONFIG.DEBOUNCE_DELAY);
    
    ['propertyValue', 'ownResources', 'loanTerm', 'fixation', 'monthlyIncome', 'monthlyLiabilities'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', debouncedCalculate);
            element.addEventListener('change', debouncedCalculate);
        }
    });
    
    // Chat
    const chatSend = document.getElementById('chat-send');
    const chatInput = document.getElementById('chat-input');
    
    if (chatSend) {
        chatSend.addEventListener('click', sendChatMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
    
    // Lead form
    const leadForm = document.getElementById('lead-form');
    if (leadForm) {
        leadForm.addEventListener('submit', handleFormSubmit);
    }
}

// ===== NAVIGACE =====
function selectIntent(intent) {
    AppState.selectedIntent = intent;
    AppState.formData.intent = intent;
    
    // Update UI
    document.querySelectorAll('.intent-btn').forEach(btn => {
        const isSelected = btn.dataset.intent === intent;
        btn.classList.toggle('selected', isSelected);
        btn.classList.toggle('border-blue-500', isSelected);
        btn.classList.toggle('bg-blue-50', isSelected);
    });
    
    // Auto navigate to next step
    setTimeout(() => {
        navigateStep(1);
    }, 300);
}

function navigateStep(direction) {
    const newStep = AppState.currentStep + direction;
    
    if (newStep < 1 || newStep > AppState.maxSteps) {
        return;
    }
    
    // Validace před přechodem na další krok
    if (direction > 0 && !validateStep(AppState.currentStep)) {
        return;
    }
    
    goToStep(newStep);
}

function goToStep(step) {
    if (step < 1 || step > AppState.maxSteps) return;
    
    AppState.currentStep = step;
    
    showStep(step);
    updateTimeline(step);
    updateNavigationButtons();
    
    // Smooth scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // Load offers when reaching step 4
    if (step === 4 && AppState.offers.length > 0) {
        displayOffers(AppState.offers);
    }
}

function showStep(step) {
    // Hide all sections
    document.querySelectorAll('.form-section').forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });
    
    // Show current section
    const currentSection = document.getElementById(`section-${step}`);
    if (currentSection) {
        currentSection.classList.remove('hidden');
        currentSection.classList.add('active');
    }
}

function updateTimeline(step) {
    const steps = document.querySelectorAll('.timeline-step');
    const progress = document.getElementById('timeline-progress');
    
    steps.forEach((stepEl, index) => {
        const stepNum = index + 1;
        const circle = stepEl.querySelector('.step-circle');
        
        // Remove all classes
        stepEl.classList.remove('active', 'completed');
        
        // Add appropriate classes
        if (stepNum === step) {
            stepEl.classList.add('active');
            if (circle) {
                circle.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
                circle.classList.remove('bg-green-500', 'bg-white/50', 'border-white/50');
            }
        } else if (stepNum < step) {
            stepEl.classList.add('completed');
            if (circle) {
                circle.classList.add('bg-green-500', 'text-white', 'border-green-500');
                circle.classList.remove('bg-blue-500', 'bg-white/50', 'border-white/50');
            }
        } else {
            if (circle) {
                circle.classList.add('bg-white/50', 'border-white/50');
                circle.classList.remove('bg-blue-500', 'bg-green-500', 'text-white');
            }
        }
    });
    
    // Update progress bar
    if (progress) {
        const percentage = ((step - 1) / (AppState.maxSteps - 1)) * 100;
        progress.style.width = `${percentage}%`;
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        prevBtn.classList.toggle('hidden', AppState.currentStep === 1);
    }
    
    if (nextBtn) {
        if (AppState.currentStep === AppState.maxSteps) {
            nextBtn.classList.add('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            nextBtn.textContent = AppState.currentStep === 4 ? 'Dokončit' : 'Další →';
        }
    }
}

// ===== MODE SWITCHING =====
function setMode(mode) {
    AppState.currentMode = mode;
    
    // Update buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
        const isActive = btn.dataset.mode === mode;
        btn.classList.toggle('border-white', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('border-transparent', !isActive);
        btn.classList.toggle('text-blue-100', !isActive);
    });
    
    // Update content
    document.getElementById('calculator-mode')?.classList.toggle('hidden', mode !== 'calculator');
    document.getElementById('ai-mode')?.classList.toggle('hidden', mode !== 'ai');
    
    // Initialize chat if switching to AI mode
    if (mode === 'ai') {
        initializeChat();
    }
}

// ===== KALKULACE =====
async function calculateAndFetchRates() {
    // Parse values
    const propertyValue = parseAmount(document.getElementById('propertyValue')?.value);
    const ownResources = parseAmount(document.getElementById('ownResources')?.value);
    const loanTerm = parseInt(document.getElementById('loanTerm')?.value) || 25;
    const fixation = parseInt(document.getElementById('fixation')?.value) || 5;
    const monthlyIncome = parseAmount(document.getElementById('monthlyIncome')?.value);
    const monthlyLiabilities = parseAmount(document.getElementById('monthlyLiabilities')?.value);
    
    // Update state
    AppState.formData = {
        ...AppState.formData,
        propertyValue,
        ownResources,
        loanTerm,
        fixation,
        monthlyIncome,
        monthlyLiabilities
    };
    
    if (!propertyValue) return;
    
    const loanAmount = Math.max(0, propertyValue - ownResources);
    const ltv = propertyValue > 0 ? (loanAmount / propertyValue * 100) : 0;
    
    AppState.formData.loanAmount = loanAmount;
    AppState.formData.ltv = ltv;
    
    // Update displays
    updateDisplay('loan-amount-display', formatCurrency(loanAmount) + ' Kč');
    updateDisplay('ltv-display', ltv.toFixed(0) + '%');
    
    // Fetch offers from API
    if (loanAmount > 0) {
        try {
            const params = new URLSearchParams({
                endpoint: 'calculate',
                amount: loanAmount,
                value: propertyValue,
                term: loanTerm,
                fixation: fixation,
                income: monthlyIncome || 0
            });
            
            const response = await fetch(`${CONFIG.API.RATES}?${params}`);
            const data = await response.json();
            
            if (data.offers) {
                AppState.offers = data.offers;
                
                // Update displays
                if (data.bestOffer) {
                    AppState.formData.monthlyPayment = data.bestOffer.monthlyPayment;
                    updateDisplay('monthly-payment-display', formatCurrency(data.bestOffer.monthlyPayment) + ' Kč');
                    
                    if (data.bestOffer.dsti && monthlyIncome) {
                        AppState.formData.dsti = parseFloat(data.bestOffer.dsti);
                        updateDisplay('dsti-display', data.bestOffer.dsti + '%');
                        updateDSTIIndicator(parseFloat(data.bestOffer.dsti));
                    }
                }
                
                // Show offers in step 4
                if (AppState.currentStep === 4) {
                    displayOffers(data.offers);
                    createChart(loanAmount, loanTerm, data.bestOffer.rate);
                }
            }
        } catch (error) {
            console.error('Chyba při výpočtu:', error);
            // Fallback na lokální výpočet
            const rate = getLocalRate(ltv, fixation);
            const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
            
            AppState.formData.monthlyPayment = monthlyPayment;
            updateDisplay('monthly-payment-display', formatCurrency(monthlyPayment) + ' Kč');
            
            if (monthlyIncome > 0) {
                const dsti = ((monthlyPayment + monthlyLiabilities) / monthlyIncome * 100);
                AppState.formData.dsti = dsti;
                updateDisplay('dsti-display', dsti.toFixed(0) + '%');
                updateDSTIIndicator(dsti);
            }
        }
    }
    
    // Save data
    saveData();
}

function getLocalRate(ltv, fixation) {
    const baseRates = {
        1: 5.29,
        3: 4.59,
        5: 4.39,
        7: 4.49,
        10: 4.69
    };
    
    let rate = baseRates[fixation] || 4.5;
    
    // LTV adjustments
    if (ltv > 90) rate += 0.5;
    else if (ltv > 80) rate += 0.2;
    else if (ltv < 70) rate -= 0.1;
    
    return rate;
}

function calculateMonthlyPayment(principal, annualRate, years) {
    if (principal <= 0) return 0;
    
    const monthlyRate = annualRate / 100 / 12;
    const n = years * 12;
    
    if (monthlyRate === 0) return principal / n;
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / 
           (Math.pow(1 + monthlyRate, n) - 1);
}

function displayOffers(offers) {
    const container = document.getElementById('bank-offers');
    if (!container) return;
    
    container.innerHTML = '';
    
    offers.slice(0, 3).forEach((offer, index) => {
        const card = document.createElement('div');
        card.className = 'p-6 bg-white/10 rounded-xl text-center transition-all hover:bg-white/20';
        
        if (index === 0) {
            card.className += ' border-2 border-green-400';
        }
        
        card.innerHTML = `
            <div class="text-3xl mb-2">${offer.bankLogo || '🏦'}</div>
            <h3 class="text-xl font-bold text-white mb-2">${offer.bankName}</h3>
            <p class="text-3xl font-bold text-white">${offer.rate.toFixed(2)}%</p>
            <p class="text-blue-100 mb-4">úroková sazba</p>
            <p class="text-2xl font-semibold text-white">${formatCurrency(offer.monthlyPayment)} Kč</p>
            <p class="text-blue-100 mb-4">měsíční splátka</p>
            ${offer.bestFor ? `<p class="text-sm text-blue-200">${offer.bestFor}</p>` : ''}
            ${index === 0 ? '<div class="mt-4 text-green-400 font-bold">✓ Doporučujeme</div>' : ''}
            <button onclick="selectBank('${offer.bankId}')" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                Vybrat
            </button>
        `;
        
        container.appendChild(card);
    });
}

function createChart(loanAmount, loanTerm, interestRate) {
    const canvas = document.getElementById('loanChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (window.loanChart) {
        window.loanChart.destroy();
    }
    
    // Calculate data
    const years = [];
    const principal = [];
    const interest = [];
    const remaining = [];
    
    const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, loanTerm);
    let balance = loanAmount;
    
    for (let year = 0; year <= loanTerm; year++) {
        years.push(year);
        remaining.push(Math.round(balance));
        
        if (year > 0) {
            const yearlyPayment = monthlyPayment * 12;
            const yearlyInterest = balance * (interestRate / 100);
            const yearlyPrincipal = yearlyPayment - yearlyInterest;
            
            principal.push(Math.round(yearlyPrincipal));
            interest.push(Math.round(yearlyInterest));
            balance = Math.max(0, balance - yearlyPrincipal);
        } else {
            principal.push(0);
            interest.push(0);
        }
    }
    
    window.loanChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years.map(y => `${y}. rok`),
            datasets: [{
                label: 'Zůstatek úvěru',
                data: remaining,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'white'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'white',
                        callback: function(value) {
                            return formatCurrency(value) + ' Kč';
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: 'white'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// ===== CHAT =====
function initializeChat() {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow || chatWindow.children.length > 0) return;
    
    // Welcome message
    addChatMessage('Dobrý den! Jsem váš AI hypoteční poradce. Jak vám mohu pomoci?', 'ai');
}

function setupChatSuggestions() {
    const suggestions = document.getElementById('chat-suggestions');
    if (!suggestions) return;
    
    const questions = [
        'Kolik si můžu půjčit?',
        'Jaké jsou aktuální sazby?',
        'Co je to DSTI?',
        'Jaké dokumenty potřebuji?'
    ];
    
    suggestions.innerHTML = '';
    questions.forEach(question => {
        const btn = document.createElement('button');
        btn.className = 'px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition text-sm';
        btn.textContent = question;
        btn.onclick = () => {
            document.getElementById('chat-input').value = question;
            sendChatMessage();
        };
        suggestions.appendChild(btn);
    });
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input?.value.trim();
    
    if (!message) return;
    
    // Clear input
    input.value = '';
    
    // Add user message
    addChatMessage(message, 'user');
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        const response = await fetch(CONFIG.API.CHAT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                context: AppState.formData
            })
        });
        
        const data = await response.json();
        hideTypingIndicator();
        addChatMessage(data.response || 'Omlouvám se, nemůžu nyní odpovědět.', 'ai');
        
    } catch (error) {
        console.error('Chat error:', error);
        hideTypingIndicator();
        
        // Fallback response
        const fallbackResponse = getLocalChatResponse(message);
        addChatMessage(fallbackResponse, 'ai');
    }
}

function getLocalChatResponse(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('kolik') && (msg.includes('půjč') || msg.includes('dost'))) {
        return 'Maximální výše hypotéky závisí na vašich příjmech. Banky obvykle půjčují 8-9 násobek ročního příjmu, ale musíte splnit DSTI limit 50%. Vyplňte kalkulačku pro přesný výpočet.';
    }
    
    if (msg.includes('sazb') || msg.includes('úrok')) {
        return 'Aktuální úrokové sazby se pohybují od 4.09% do 5.49% v závislosti na fixaci. Nejnižší sazby jsou u 5leté fixace.';
    }
    
    if (msg.includes('dsti')) {
        return 'DSTI je poměr všech vašich splátek k příjmu. Limit je 50%. Čím nižší DSTI, tím lepší podmínky dostanete.';
    }
    
    return 'Děkuji za váš dotaz. Pro přesnou odpověď prosím vyplňte kalkulačku nebo mi položte konkrétnější otázku.';
}

function addChatMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `p-4 rounded-lg mb-4 chat-message ${
        sender === 'user' 
            ? 'bg-blue-500 text-white ml-auto max-w-xs' 
            : 'bg-white/20 text-white mr-auto max-w-md'
    }`;
    
    if (sender === 'ai') {
        // Parse markdown-like formatting
        text = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = `
            <div class="flex items-start gap-3">
                <span class="text-2xl flex-shrink-0">🤖</span>
                <div>${text}</div>
            </div>
        `;
    } else {
        messageDiv.textContent = text;
    }
    
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTypingIndicator() {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'bg-white/10 p-3 rounded-lg max-w-xs mr-auto mb-4';
    indicator.innerHTML = '🤖 Přemýšlím...';
    
    chatWindow.appendChild(indicator);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function hideTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
}

// ===== VALIDACE =====
function validateStep(step) {
    switch(step) {
        case 1:
            if (!AppState.selectedIntent) {
                showAlert('Prosím vyberte, co plánujete');
                return false;
            }
            break;
            
        case 2:
            if (!AppState.formData.propertyValue || AppState.formData.propertyValue <= 0) {
                showAlert('Prosím vyplňte cenu nemovitosti');
                return false;
            }
            break;
            
        case 3:
            if (!AppState.formData.monthlyIncome || AppState.formData.monthlyIncome <= 0) {
                showAlert('Prosím vyplňte váš měsíční příjem');
                return false;
            }
            break;
    }
    
    return true;
}

// ===== FORM HANDLING =====
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Odesílám...';
    }
    
    // Simulate form submission (in production, this would send to Netlify)
    setTimeout(() => {
        form.classList.add('hidden');
        const success = document.getElementById('form-success');
        if (success) {
            success.classList.remove('hidden');
        }
    }, 1500);
}

// ===== HELPER FUNKCE =====
function parseAmount(value) {
    if (!value) return 0;
    
    value = value.toString().toLowerCase();
    
    // Handle percentage
    if (value.includes('%')) {
        const percentage = parseFloat(value.replace('%', ''));
        const propertyValue = AppState.formData.propertyValue;
        return propertyValue * (percentage / 100);
    }
    
    // Handle shortcuts
    if (value.includes('m')) {
        return parseFloat(value.replace(/[^\d.]/g, '')) * 1000000;
    }
    if (value.includes('k')) {
        return parseFloat(value.replace(/[^\d.]/g, '')) * 1000;
    }
    
    // Parse normal number
    return parseInt(value.replace(/\D/g, '')) || 0;
}

function formatCurrency(amount) {
    return Math.round(amount).toLocaleString('cs-CZ');
}

function updateDisplay(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateDSTIIndicator(dsti) {
    const dstiResult = document.getElementById('dsti-result');
    const dstiTip = document.getElementById('dsti-tip');
    
    if (dstiResult) {
        dstiResult.classList.remove('hidden');
    }
    
    if (dstiTip) {
        if (dsti < 40) {
            dstiTip.textContent = 'Výborná bonita! Banky vám rády půjčí za nejlepší podmínky.';
            dstiTip.className = 'text-sm mt-2 text-green-400';
        } else if (dsti < 45) {
            dstiTip.textContent = 'Dobrá bonita. Splňujete podmínky většiny bank.';
            dstiTip.className = 'text-sm mt-2 text-blue-400';
        } else if (dsti < 50) {
            dstiTip.textContent = 'Hraniční hodnota. Některé banky mohou váhat.';
            dstiTip.className = 'text-sm mt-2 text-yellow-400';
        } else {
            dstiTip.textContent = 'Překračuje limit ČNB! Musíte snížit úvěr nebo zvýšit příjem.';
            dstiTip.className = 'text-sm mt-2 text-red-400';
        }
    }
}

function showAlert(message) {
    const alert = document.createElement('div');
    alert.className = 'fixed top-4 right-4 px-6 py-4 bg-red-500 text-white rounded-lg shadow-lg z-50';
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== DATA PERSISTENCE =====
function saveData() {
    try {
        localStorage.setItem('hypotekaData', JSON.stringify(AppState.formData));
    } catch (e) {
        console.error('Nelze uložit data:', e);
    }
}

function loadSavedData() {
    try {
        const saved = localStorage.getItem('hypotekaData');
        if (saved) {
            const data = JSON.parse(saved);
            AppState.formData = { ...AppState.formData, ...data };
            
            // Restore form values
            Object.keys(data).forEach(key => {
                const element = document.getElementById(key);
                if (element && data[key]) {
                    element.value = data[key];
                }
            });
        }
    } catch (e) {
        console.error('Nelze načíst data:', e);
    }
}

// ===== API =====
async function loadCurrentRates() {
    try {
        const response = await fetch(`${CONFIG.API.RATES}?endpoint=best-offers&fixation=5`);
        const data = await response.json();
        
        if (data.lowestRate) {
            // Update metric card if exists
            const rateCard = document.querySelector('.metric-card:nth-child(3) p:first-child');
            if (rateCard) {
                rateCard.textContent = `${data.lowestRate}%`;
            }
        }
    } catch (error) {
        console.error('Chyba při načítání sazeb:', error);
    }
}

// ===== LIVE COUNTER =====
function startLiveCounter() {
    const counter = document.getElementById('live-counter');
    if (!counter) return;
    
    const updateCounter = () => {
        const count = 15 + Math.floor(Math.random() * 8);
        counter.innerHTML = `${count} lidí právě počítá`;
    };
    
    updateCounter();
    setInterval(updateCounter, 5000);
}

// ===== PUBLIC API =====
window.selectBank = function(bankId) {
    AppState.selectedBank = bankId;
    navigateStep(1);
};
