// Hypotéka AI - v11.0 - Final Build
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    
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

