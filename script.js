// Hypotéka AI - JavaScript v6.0 (Production Ready)
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- STATE MANAGEMENT ---
    const state = {
        currentStep: 1,
        mode: 'calculator', // 'calculator' or 'ai'
        intent: null, // 'koupe', 'vystavba', etc.
        propertyValue: 0,
        constructionCost: 0,
        landValue: 0,
        ownResources: 0,
        loanAmount: 0,
        loanTerm: 30,
        fixation: 5,
        monthlyIncome: 0,
        otherLoans: 0,
        refinanceAmount: 0,
        extraLoan: 0,
        ltv: 0,
        monthlyPayment: 0,
        chartInstance: null,
        aiConversation: [],
        isAiThinking: false,
    };

    // --- DOM ELEMENTS ---
    const DOMElements = {
        modeBtnCalculator: document.getElementById('mode-btn-calculator'),
        modeBtnAi: document.getElementById('mode-btn-ai'),
        calculatorModeDiv: document.getElementById('calculator-mode'),
        aiModeDiv: document.getElementById('ai-mode'),
        timelineSteps: document.querySelectorAll('.timeline-step'),
        stepContents: document.querySelectorAll('.step-content'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        intentGrid: document.querySelector('.intent-grid'),
        parametersFormContainer: document.getElementById('parameters-form-container'),
        quickCalcValue: document.getElementById('quick-calc-value'),
        monthlyIncomeInput: document.getElementById('monthlyIncome'),
        otherLoansInput: document.getElementById('otherLoans'),
        dstiResultDiv: document.getElementById('dsti-result'),
        dstiValueSpan: document.getElementById('dsti-value'),
        dstiMessageDiv: document.getElementById('dsti-message'),
        offersContainer: document.getElementById('offers-container'),
        metricsContainer: document.getElementById('metrics-container'),
        amortizationChartCanvas: document.getElementById('amortization-chart'),
        contactForm: document.getElementById('contact-form'),
        formSuccessMessage: document.getElementById('form-success-message'),
        aiChatMessages: document.getElementById('ai-chat-messages'),
        aiChatInput: document.getElementById('ai-chat-input'),
        aiChatSendBtn: document.getElementById('ai-chat-send'),
        aiChatSuggestions: document.getElementById('ai-chat-suggestions'),
        aiSummary: document.getElementById('ai-summary'),
        // Navigation buttons
        navCalculator: document.getElementById('nav-calculator'),
        navAbout: document.getElementById('nav-about'),
        navGdpr: document.getElementById('nav-gdpr'),
        navContact: document.getElementById('nav-contact'),
        footerAbout: document.getElementById('footer-about'),
        footerGdpr: document.getElementById('footer-gdpr'),
        // Sidebar actions
        sidebarCalculatorBtn: document.querySelector('.sidebar-btn[data-action="switch-to-calculator"]'),
        sidebarContactBtn: document.querySelector('.sidebar-btn[data-action="request-contact"]'),
        // Modal
        modal: document.getElementById('modal'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        modalClose: document.getElementById('modal-close'),
    };

    // --- UTILITY FUNCTIONS ---
    const formatCurrency = (value) => {
        const num = Number(value);
        if (isNaN(num)) return "0 Kč";
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
    };

    const parseCurrency = (value) => {
        if (typeof value !== 'string') return Number(value) || 0;
        return Number(value.replace(/[^0-9]/g, '')) || 0;
    };

    const debounce = (func, delay) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // --- UI RENDERING ---
    const render = () => {
        // Mode switcher
        DOMElements.calculatorModeDiv.classList.toggle('hidden', state.mode !== 'calculator');
        DOMElements.aiModeDiv.classList.toggle('hidden', state.mode !== 'ai');
        DOMElements.modeBtnCalculator.classList.toggle('active', state.mode === 'calculator');
        DOMElements.modeBtnAi.classList.toggle('active', state.mode === 'ai');

        // Timeline and steps
        DOMElements.timelineSteps.forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.toggle('active', stepNum === state.currentStep);
            step.classList.toggle('completed', stepNum < state.currentStep);
            step.querySelector('.step-circle').textContent = stepNum < state.currentStep ? '✓' : stepNum;
        });

        DOMElements.stepContents.forEach((content, index) => {
            content.classList.toggle('active', (index + 1) === state.currentStep);
        });

        // Navigation buttons
        DOMElements.prevBtn.classList.toggle('hidden', state.currentStep === 1);
        DOMElements.nextBtn.textContent = state.currentStep === 5 ? 'Začít znovu' : (state.currentStep === 4 ? 'Získat nabídky' : 'Další →');
    };

    // --- CALCULATOR LOGIC ---
    const calculateLoan = () => {
        const { intent, propertyValue, constructionCost, landValue, ownResources, refinanceAmount, extraLoan, loanTerm } = state;
        let baseValue = 0;
        let loan = 0;

        switch (intent) {
            case 'vystavba':
                baseValue = landValue + constructionCost;
                loan = baseValue - ownResources;
                break;
            case 'refinancovani':
                baseValue = propertyValue;
                loan = refinanceAmount + extraLoan;
                break;
            default: // koupe, rekonstrukce, investice
                baseValue = propertyValue;
                loan = propertyValue - ownResources;
                break;
        }

        state.loanAmount = Math.max(0, loan);
        state.ltv = baseValue > 0 ? (state.loanAmount / baseValue) * 100 : 0;
        
        const rate = getInterestRate();
        state.monthlyPayment = calculateMonthlyPayment(state.loanAmount, rate, loanTerm);
        
        DOMElements.quickCalcValue.textContent = formatCurrency(state.monthlyPayment);
    };

    const getInterestRate = () => {
        // Simplified rate logic. In reality, this would be a complex lookup.
        const baseRate = 4.29;
        let rate = baseRate;
        if (state.ltv > 80) rate += 0.4;
        if (state.ltv > 90) rate += 0.6;
        if (state.fixation === 3) rate += 0.1;
        if (state.fixation === 7) rate -= 0.1;
        if (state.fixation === 10) rate -= 0.2;
        return Math.max(2.99, rate); // a floor for the rate
    };

    const calculateMonthlyPayment = (principal, annualRate, years) => {
        if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
        const monthlyRate = annualRate / 100 / 12;
        const numberOfPayments = years * 12;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    };

    const calculateDSTI = () => {
        const { monthlyIncome, otherLoans, monthlyPayment } = state;
        if (monthlyIncome === 0) {
            DOMElements.dstiResultDiv.classList.add('hidden');
            return;
        }
        
        const totalPayments = monthlyPayment + otherLoans;
        const dsti = (totalPayments / monthlyIncome) * 100;

        DOMElements.dstiResultDiv.classList.remove('hidden');
        DOMElements.dstiValueSpan.textContent = `${dsti.toFixed(1)}%`;
        
        if (dsti < 40) {
            DOMElements.dstiMessageDiv.textContent = '✅ Skvělé! Váš příjem je pro získání úvěru více než dostatečný.';
            DOMElements.dstiMessageDiv.style.color = 'var(--success-green)';
        } else if (dsti < 50) {
            DOMElements.dstiMessageDiv.textContent = '⚠️ Dobré. Váš příjem je dostatečný, ale s menší rezervou.';
            DOMElements.dstiMessageDiv.style.color = 'var(--warning-yellow)';
        } else {
            DOMElements.dstiMessageDiv.textContent = '❌ Vysoké. Dle regulací ČNB může být získání úvěru obtížné.';
            DOMElements.dstiMessageDiv.style.color = 'var(--danger-red)';
        }
    };
    
    // --- DYNAMIC FORM RENDERING (Step 2) ---
    const renderParametersForm = () => {
        let html = '';
        const { intent } = state;
        
        const commonFields = `
            <div class="form-group">
                <label for="loanTerm">Doba splatnosti</label>
                <select id="loanTerm">
                    <option value="20">20 let</option>
                    <option value="25">25 let</option>
                    <option value="30" selected>30 let</option>
                </select>
            </div>
            <div class="form-group">
                <label for="fixation">Fixace úroku</label>
                <select id="fixation">
                    <option value="3">3 roky</option>
                    <option value="5" selected>5 let</option>
                    <option value="7">7 let</option>
                    <option value="10">10 let</option>
                </select>
            </div>
        `;

        if (intent === 'koupe' || intent === 'rekonstrukce' || intent === 'investice') {
            html = `
                <div class="form-group">
                    <label for="propertyValue">Cena nemovitosti</label>
                    <input type="text" id="propertyValue" class="input-currency" placeholder="např. 5 000 000 Kč">
                </div>
                <div class="form-group">
                    <label for="ownResources">Vlastní zdroje</label>
                    <input type="text" id="ownResources" class="input-currency" placeholder="např. 1 000 000 Kč">
                </div>
                ${commonFields}
            `;
        } else if (intent === 'vystavba') {
            html = `
                <div class="form-group">
                    <label for="landValue">Hodnota pozemku</label>
                    <input type="text" id="landValue" class="input-currency" placeholder="např. 2 000 000 Kč">
                </div>
                <div class="form-group">
                    <label for="constructionCost">Cena výstavby</label>
                    <input type="text" id="constructionCost" class="input-currency" placeholder="např. 4 000 000 Kč">
                </div>
                <div class="form-group">
                    <label for="ownResources">Vlastní zdroje</label>
                    <input type="text" id="ownResources" class="input-currency" placeholder="např. 1 500 000 Kč">
                </div>
                ${commonFields}
            `;
        } else if (intent === 'refinancovani') {
            html = `
                <div class="form-group">
                    <label for="propertyValue">Nová hodnota nemovitosti</label>
                    <input type="text" id="propertyValue" class="input-currency" placeholder="např. 6 000 000 Kč">
                </div>
                 <div class="form-group">
                    <label for="refinanceAmount">Zbývá doplatit</label>
                    <input type="text" id="refinanceAmount" class="input-currency" placeholder="např. 3 000 000 Kč">
                </div>
                 <div class="form-group">
                    <label for="extraLoan">Chcete půjčit navíc?</label>
                    <input type="text" id="extraLoan" class="input-currency" placeholder="např. 500 000 Kč" value="0 Kč">
                </div>
                ${commonFields}
            `;
        }
        
        DOMElements.parametersFormContainer.innerHTML = html;
        addInputEventListeners(); // Re-attach listeners to new inputs
    };

    // --- ANALYSIS & CHART (Step 4) ---
    const generateAnalysis = () => {
        // 1. Generate Offers
        const baseRate = getInterestRate();
        const offers = [
            { name: 'Nejvýhodnější nabídka', rate: baseRate - 0.15, best: true },
            { name: 'Optimální varianta', rate: baseRate, best: false },
            { name: 'Nabídka s bonusem', rate: baseRate + 0.1, best: false },
        ];
        DOMElements.offersContainer.innerHTML = offers.map(offer => {
            const payment = calculateMonthlyPayment(state.loanAmount, offer.rate, state.loanTerm);
            return `
                <div class="offer-card ${offer.best ? 'best-offer' : ''}">
                    ${offer.best ? '<div class="badge">NEJLEPŠÍ</div>' : ''}
                    <h3>${offer.name}</h3>
                    <div class="rate">${offer.rate.toFixed(2)} %</div>
                    <div class="label">Měsíční splátka</div>
                    <div class="payment">${formatCurrency(payment)}</div>
                </div>
            `;
        }).join('');

        // 2. Generate Metrics
        const totalPaid = state.monthlyPayment * state.loanTerm * 12;
        const totalInterest = totalPaid - state.loanAmount;
        DOMElements.metricsContainer.innerHTML = `
            <h3>Klíčové parametry</h3>
            <div class="metric-item"><span>Výše úvěru:</span> <span>${formatCurrency(state.loanAmount)}</span></div>
            <div class="metric-item"><span>LTV:</span> <span>${state.ltv.toFixed(1)} %</span></div>
            <div class="metric-item"><span>Celkem zaplaceno:</span> <span>${formatCurrency(totalPaid)}</span></div>
            <div class="metric-item"><span>Přeplatek na úrocích:</span> <span style="color:var(--danger-red)">${formatCurrency(totalInterest)}</span></div>
        `;

        // 3. Generate Chart
        generateAmortizationChart();
    };

    const generateAmortizationChart = () => {
        if (state.chartInstance) {
            state.chartInstance.destroy();
        }
        const { loanAmount, loanTerm } = state;
        const rate = getInterestRate();
        
        const labels = [];
        const data = [];
        let balance = loanAmount;
        const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);

        if(loanAmount <= 0) return;

        for (let year = 0; year <= loanTerm; year++) {
            labels.push(`Rok ${year}`);
            data.push(Math.round(balance));
            for (let month = 0; month < 12; month++) {
                const interest = balance * (rate / 100 / 12);
                balance -= (monthlyPayment - interest);
            }
            balance = Math.max(0, balance);
        }

        state.chartInstance = new Chart(DOMElements.amortizationChartCanvas, {
            type: 'line',
            data: { labels, datasets: [{
                label: 'Zbývající dluh',
                data,
                borderColor: 'var(--primary-blue)',
                backgroundColor: 'rgba(0, 102, 255, 0.1)',
                fill: true,
                tension: 0.2,
            }]},
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { ticks: { callback: (value) => formatCurrency(value) } },
                }
            }
        });
    };

    // --- NAVIGATION LOGIC ---
    const navigate = (direction) => {
        const newStep = state.currentStep + direction;
        
        if (direction > 0 && !validateStep(state.currentStep)) return;

        if (newStep > 5) {
            // Reset and start over
            Object.assign(state, { currentStep: 1, intent: null, propertyValue: 0, /*... reset all relevant fields ...*/ });
            document.querySelectorAll('.intent-card').forEach(c => c.classList.remove('selected'));
            DOMElements.contactForm.reset();
            DOMElements.formSuccessMessage.classList.add('hidden');
            DOMElements.contactForm.style.display = 'grid';
        } else {
            state.currentStep = newStep;
        }

        if (state.currentStep === 4) {
            generateAnalysis();
        }
        
        render();
    };

    const validateStep = (step) => {
        // Basic validation, can be improved
        if (step === 1) return state.intent !== null;
        if (step === 2) return state.loanAmount > 0;
        if (step === 3) return state.monthlyIncome > 0;
        return true;
    };


    // --- AI CHAT LOGIC ---
    const sendAiChatMessage = async () => {
        const userMessage = DOMElements.aiChatInput.value.trim();
        if (!userMessage || state.isAiThinking) return;

        state.isAiThinking = true;
        DOMElements.aiChatInput.value = '';
        DOMElements.aiChatInput.disabled = true;
        DOMElements.aiChatSendBtn.disabled = true;

        addMessageToChat('user', userMessage);
        addMessageToChat('loading');

        try {
            const response = await fetch('/.netlify/functions/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userMessage,
                    state: { // Send only necessary state
                        intent: state.intent,
                        propertyValue: state.propertyValue,
                        ownResources: state.ownResources,
                        monthlyIncome: state.monthlyIncome
                    },
                    aiConversationState: state.aiConversation
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const aiData = await response.json();
            
            removeLoadingMessage();
            addMessageToChat('ai', aiData.responseText);
            
            if(aiData.updateState) {
                Object.assign(state, aiData.updateState);
                updateAiSummary();
            }

            renderAiSuggestions(aiData.suggestions);
            
            if(aiData.performCalculation) {
                calculateLoan();
                calculateDSTI();
                updateAiSummary();
            }

        } catch (error) {
            console.error("AI Chat Error:", error);
            removeLoadingMessage();
            addMessageToChat('ai', "Omlouvám se, došlo k technické chybě. Zkuste to prosím znovu.");
        } finally {
            state.isAiThinking = false;
            DOMElements.aiChatInput.disabled = false;
            DOMElements.aiChatSendBtn.disabled = false;
            DOMElements.aiChatInput.focus();
        }
    };
    
    const addMessageToChat = (sender, text = '') => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${sender}`;
        
        if (sender === 'loading') {
            messageDiv.innerHTML = `<div class="message-content"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
        } else {
             messageDiv.innerHTML = `<div class="message-content"><p>${sender === 'ai' ? '<strong>🤖 AI Poradce</strong><br>' : ''}${text}</p></div>`;
        }
        
        DOMElements.aiChatMessages.appendChild(messageDiv);
        DOMElements.aiChatMessages.scrollTop = DOMElements.aiChatMessages.scrollHeight;

        // Add to conversation history
        if (sender !== 'loading') {
            state.aiConversation.push({ sender, text });
        }
    };
    
    const removeLoadingMessage = () => {
        const loadingMsg = DOMElements.aiChatMessages.querySelector('.message-loading');
        if (loadingMsg) loadingMsg.remove();
    };

    const renderAiSuggestions = (suggestions = []) => {
        DOMElements.aiChatSuggestions.innerHTML = suggestions.map(s => `<button class="suggestion-btn">${s}</button>`).join('');
    };

    const updateAiSummary = () => {
        if (state.loanAmount > 0) {
            DOMElements.aiSummary.innerHTML = `
                <p><strong>Úvěr:</strong> ${formatCurrency(state.loanAmount)}</p>
                <p><strong>LTV:</strong> ${state.ltv.toFixed(1)}%</p>
                <p><strong>Splátka:</strong> ${formatCurrency(state.monthlyPayment)}</p>
            `;
        } else {
            DOMElements.aiSummary.innerHTML = `<p>Zatím nemáme dostatek údajů pro výpočet.</p>`;
        }
    };
    

    // --- EVENT LISTENERS ---
    const addInputEventListeners = () => {
        const inputs = DOMElements.parametersFormContainer.querySelectorAll('input.input-currency');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => handleCurrencyInput(e.target));
            input.addEventListener('blur', (e) => handleCurrencyBlur(e.target));
        });

        const selects = DOMElements.parametersFormContainer.querySelectorAll('select');
        selects.forEach(select => {
            select.addEventListener('change', handleSelectChange);
        });
    };

    const handleCurrencyInput = (input) => {
        const value = parseCurrency(input.value);
        const key = input.id;
        if (key in state) {
            state[key] = value;
        }
        debouncedCalculateLoan();
    };
    
    const handleCurrencyBlur = (input) => {
        input.value = formatCurrency(input.value);
    };

    const handleSelectChange = (e) => {
        const key = e.target.id;
        if(key in state) {
            state[key] = Number(e.target.value);
        }
        calculateLoan();
    };

    const setupEventListeners = () => {
        DOMElements.modeBtnCalculator.addEventListener('click', () => { state.mode = 'calculator'; render(); });
        DOMElements.modeBtnAi.addEventListener('click', () => { state.mode = 'ai'; render(); renderAiSuggestions(['Chci koupit byt', 'Chci refinancovat', 'Jaké jsou sazby?']); });
        
        DOMElements.prevBtn.addEventListener('click', () => navigate(-1));
        DOMElements.nextBtn.addEventListener('click', () => navigate(1));

        DOMElements.intentGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.intent-card');
            if (card) {
                state.intent = card.dataset.intent;
                document.querySelectorAll('.intent-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                renderParametersForm();
                setTimeout(() => navigate(1), 200);
            }
        });

        const debouncedDsti = debounce(calculateDSTI, 500);
        DOMElements.monthlyIncomeInput.addEventListener('input', () => { state.monthlyIncome = parseCurrency(DOMElements.monthlyIncomeInput.value); debouncedDsti(); });
        DOMElements.otherLoansInput.addEventListener('input', () => { state.otherLoans = parseCurrency(DOMElements.otherLoansInput.value); debouncedDsti(); });
        DOMElements.monthlyIncomeInput.addEventListener('blur', (e) => e.target.value = formatCurrency(e.target.value));
        DOMElements.otherLoansInput.addEventListener('blur', (e) => e.target.value = formatCurrency(e.target.value));
        
        DOMElements.contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            DOMElements.contactForm.style.display = 'none';
            DOMElements.formSuccessMessage.classList.remove('hidden');
        });
        
        // AI Chat Listeners
        DOMElements.aiChatSendBtn.addEventListener('click', sendAiChatMessage);
        DOMElements.aiChatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAiChatMessage(); });
        DOMElements.aiChatSuggestions.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-btn')) {
                DOMElements.aiChatInput.value = e.target.textContent;
                sendAiChatMessage();
            }
        });

        // Sidebar and Nav/Footer Listeners
        const setupActionButtons = () => {
             const switchAndGoToStep = (step) => {
                state.mode = 'calculator';
                state.currentStep = step;
                render();
            };
            DOMElements.navCalculator.addEventListener('click', (e) => { e.preventDefault(); switchAndGoToStep(state.currentStep || 1); });
            DOMElements.navContact.addEventListener('click', (e) => { e.preventDefault(); switchAndGoToStep(5); });
            DOMElements.sidebarCalculatorBtn.addEventListener('click', () => switchAndGoToStep(state.currentStep || 1));
            DOMElements.sidebarContactBtn.addEventListener('click', () => switchAndGoToStep(5));
            
            const showModal = (title, content) => {
                DOMElements.modalTitle.textContent = title;
                DOMElements.modalBody.innerHTML = content;
                DOMElements.modal.classList.remove('hidden');
            };
            DOMElements.navAbout.addEventListener('click', (e) => { e.preventDefault(); showModal('O nás', modalContent.about);});
            DOMElements.footerAbout.addEventListener('click', (e) => { e.preventDefault(); showModal('O nás', modalContent.about);});
            DOMElements.navGdpr.addEventListener('click', (e) => { e.preventDefault(); showModal('Zásady ochrany osobních údajů', modalContent.gdpr);});
            DOMElements.footerGdpr.addEventListener('click', (e) => { e.preventDefault(); showModal('Zásady ochrany osobních údajů', modalContent.gdpr);});
            
            DOMElements.modalClose.addEventListener('click', () => DOMElements.modal.classList.add('hidden'));
            DOMElements.modal.addEventListener('click', (e) => { if(e.target === DOMElements.modal) DOMElements.modal.classList.add('hidden'); });
        };
        setupActionButtons();
    };

    const modalContent = {
        about: `<p>Jsme tým finančních specialistů a technologických nadšenců, kteří věří, že získání hypotéky může být jednoduchý a transparentní proces. Naše platforma Hypotéka AI kombinuje nejmodernější umělou inteligenci s osobním přístupem zkušených poradců, abychom pro vás našli tu nejlepší nabídku na trhu.</p>`,
        gdpr: `<p>Vaše soukromí je pro nás na prvním místě. Veškeré údaje, které nám poskytnete, jsou zpracovávány v souladu s nařízením GDPR. Používáme je výhradně za účelem přípravy a zprostředkování nabídky hypotečního úvěru. Vaše data jsou bezpečně uložena a nikdy je neposkytujeme třetím stranám bez vašeho výslovného souhlasu.</p>`
    };
    
    // --- INITIALIZATION ---
    const debouncedCalculateLoan = debounce(calculateLoan, 400);
    setupEventListeners();
    render();
});

