// Hypotéka AI - JavaScript v6.0
// Plně refaktorovaná verze s AI integrací a dynamickým obsahem

(function() {
    'use strict';

    // Centrální stav aplikace
    const state = {
        ui: {
            currentStep: 1,
            currentMode: 'calculator', // 'calculator' or 'ai'
            isLoading: false,
        },
        calculator: {
            intent: '',
            propertyPrice: 0,
            ownResources: 0,
            loanTerm: 25,
            fixation: 5,
            monthlyIncome: 0,
            otherLoans: 0,
            loanAmount: 0,
            ltv: 0,
            monthlyPayment: 0
        },
        ai: {
            conversation: [],
            suggestions: ["Chci koupit byt za 5M", "Jaké jsou aktuální sazby?", "Spočítej mi refinancování"],
        }
    };

    let loanChart = null;

    // Inicializace po načtení DOM
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        console.log('Hypotéka AI v6.0 - Initializing');
        setupEventListeners();
        updateLiveCounter();
        setInterval(updateLiveCounter, 7000); // Slower interval
        updateDateDisplay();
        render(); // První vykreslení
    }

    // --- SETUP EVENT LISTENERS ---
    function setupEventListeners() {
        // Přepínání módů
        document.querySelector('.mode-switcher').addEventListener('click', handleModeSwitch);
        
        // Navigace v kalkulačce
        document.getElementById('prev-btn').addEventListener('click', () => navigate(-1));
        document.getElementById('next-btn').addEventListener('click', () => navigate(1));

        // Výběr záměru
        document.getElementById('step-1').addEventListener('click', handleIntentSelection);
        
        // Změny v inputech
        const inputs = ['propertyPrice', 'ownResources', 'monthlyIncome', 'otherLoans'];
        inputs.forEach(id => document.getElementById(id).addEventListener('input', handleInputChange));

        const selects = ['loanTerm', 'fixation'];
        selects.forEach(id => document.getElementById(id).addEventListener('change', handleInputChange));

        // Odeslání kontaktního formuláře
        document.getElementById('contact-form').addEventListener('submit', handleFormSubmit);

        // AI Chat
        document.getElementById('send-btn').addEventListener('click', handleAIChatSubmit);
        document.getElementById('chat-input').addEventListener('keypress', e => { if (e.key === 'Enter') handleAIChatSubmit(); });
        document.getElementById('chat-suggestions').addEventListener('click', handleSuggestionClick);
        document.querySelector('.ai-sidebar').addEventListener('click', handleSidebarAction);

        // Modální okna
        setupModal('bank-info-btn', 'bank-modal', 'close-bank-modal');
        setupModal('gdpr-link', 'gdpr-modal', 'close-gdpr-modal');
        setupModal('footer-gdpr-link', 'gdpr-modal', 'close-gdpr-modal');
        setupModal('about-link', 'about-modal', 'close-about-modal');
        setupModal('footer-about-link', 'about-modal', 'close-about-modal');
    }

    function setupModal(triggerId, modalId, closeId) {
        const modal = document.getElementById(modalId);
        document.getElementById(triggerId).addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.remove('hidden');
        });
        document.getElementById(closeId).addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    }

    // --- HANDLERS ---
    function handleModeSwitch(e) {
        if (!e.target.matches('.mode-btn')) return;
        state.ui.currentMode = e.target.dataset.mode;
        render();
    }

    function handleIntentSelection(e) {
        const card = e.target.closest('.intent-card');
        if (!card) return;
        state.calculator.intent = card.dataset.intent;
        document.querySelectorAll('.intent-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        setTimeout(() => navigate(1), 300);
    }
    
    function handleInputChange(e) {
        const id = e.target.id;
        const value = e.target.value;
        const numValue = id === 'intent' ? value : parseAmount(value);
        
        if (state.calculator.hasOwnProperty(id)) {
            state.calculator[id] = numValue;
        }

        calculateLoan();
        render();
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const leadData = {
            contact: {
                name: formData.get('name'),
                phone: formData.get('phone'),
                email: formData.get('email'),
            },
            calculatorState: state.calculator
        };
        console.log("GENERATED LEAD DATA:", JSON.stringify(leadData, null, 2));
        
        document.getElementById('form-success').classList.remove('hidden');
        e.target.style.display = 'none';
    }

    async function handleAIChatSubmit() {
        const input = document.getElementById('chat-input');
        const userMessage = input.value.trim();
        if (!userMessage) return;

        addMessageToConversation('user', userMessage);
        input.value = '';
        state.ai.suggestions = []; // Clear suggestions
        state.ui.isLoading = true;
        render();

        try {
            const response = await fetch('/.netlify/functions/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userMessage,
                    state: state.calculator
                })
            });
            if (!response.ok) throw new Error('Network response was not ok.');
            
            const aiData = await response.json();
            
            addMessageToConversation('ai', aiData.responseText);
            state.ai.suggestions = aiData.suggestions || [];

            if (aiData.updateState) {
                Object.assign(state.calculator, aiData.updateState);
                calculateLoan();
            }
            if (aiData.performCalculation) {
                state.ui.currentMode = 'calculator';
                state.ui.currentStep = 4;
            }

        } catch (error) {
            console.error('AI Fetch Error:', error);
            addMessageToConversation('ai', 'Omlouvám se, došlo k chybě při spojení s mým serverem. Zkuste to prosím znovu později.');
        } finally {
            state.ui.isLoading = false;
            render();
        }
    }
    
    function handleSuggestionClick(e) {
        if (!e.target.matches('.suggestion')) return;
        document.getElementById('chat-input').value = e.target.textContent;
        handleAIChatSubmit();
    }

    function handleSidebarAction(e) {
        if (!e.target.matches('.sidebar-btn')) return;
        const action = e.target.dataset.action;
        if (action === 'calculate') {
            state.ui.currentMode = 'calculator';
        } else if (action === 'contact') {
            state.ui.currentMode = 'calculator';
            state.ui.currentStep = 5;
        }
        render();
    }
    
    // --- CORE LOGIC & CALCULATIONS ---
    function navigate(direction) {
        const newStep = state.ui.currentStep + direction;
        if (newStep < 1) return;
        
        if (newStep > 5) { // Handle reset
            Object.assign(state.calculator, { intent: '', propertyPrice: 0, ownResources: 0, monthlyIncome: 0, otherLoans: 0 });
            state.ui.currentStep = 1;
            render();
            return;
        }

        if (direction > 0 && !validateStep(state.ui.currentStep)) {
            alert('Vyplňte prosím všechny požadované údaje v tomto kroku.');
            return;
        }
        
        state.ui.currentStep = newStep;
        
        if (state.ui.currentStep === 4) {
           generateAnalysis();
        }
        render();
    }
    
    function validateStep(step) {
        const { calculator } = state;
        switch(step) {
            case 1: return !!calculator.intent;
            case 2: return calculator.propertyPrice > 0 && calculator.ownResources >= 0;
            case 3: return calculator.monthlyIncome > 0;
            default: return true;
        }
    }

    function calculateLoan() {
        const { calculator } = state;
        if (calculator.propertyPrice <= 0 || calculator.ownResources < 0) return;
        
        calculator.loanAmount = Math.max(0, calculator.propertyPrice - calculator.ownResources);
        calculator.ltv = (calculator.loanAmount / calculator.propertyPrice) * 100;
        
        const rate = getInterestRate();
        calculator.monthlyPayment = calculateMonthlyPayment(calculator.loanAmount, rate, calculator.loanTerm);
        
        if (calculator.monthlyIncome > 0) {
            calculateDSTI();
        }
    }
    
    // --- ASYNC & DATA SIMULATION ---
    async function generateAnalysis() {
        state.ui.isLoading = true;
        render();
        
        try {
            const rates = await fetchLatestRates();
            const offers = rates.map(bank => {
                const ltvKey = state.calculator.ltv > 80 ? 90 : 80;
                const rate = bank.rates[state.calculator.fixation][ltvKey];
                const payment = calculateMonthlyPayment(state.calculator.loanAmount, rate, state.calculator.loanTerm);
                return { ...bank, rate, payment };
            }).sort((a, b) => a.payment - b.payment);
            
            const top3 = offers.slice(0, 3);
            renderOffers(top3);
            renderMetrics(top3[0]); // Use best offer for metrics
            renderChart();

        } catch (error) {
            console.error("Failed to generate analysis:", error);
            document.getElementById('offers').innerHTML = `<p>Chyba při načítání nabídek. Zkuste to prosím znovu.</p>`;
        } finally {
            state.ui.isLoading = false;
            render();
        }
    }

    // SIMULATED: In a real app, this would be a real API call.
    function fetchLatestRates() {
        console.log("Simulating fetching latest rates...");
        return new Promise(resolve => {
            setTimeout(() => {
                const baseRates = {
                    3: { 80: 4.19, 90: 4.69 },
                    5: { 80: 3.99, 90: 4.49 },
                    7: { 80: 4.09, 90: 4.59 },
                    10: { 80: 4.19, 90: 4.69 }
                };
                
                // Create slightly different rates for different "banks"
                const banks = [
                    { name: 'Česká spořitelna', rates: varyRates(baseRates, -0.1) },
                    { name: 'Hypoteční banka', rates: varyRates(baseRates, 0) },
                    { name: 'Komerční banka', rates: varyRates(baseRates, 0.05) },
                    { name: 'Raiffeisenbank', rates: varyRates(baseRates, 0.15) },
                    { name: 'MONETA', rates: varyRates(baseRates, -0.05) }
                ];
                resolve(banks);
            }, 800);
        });
    }

    // --- RENDER FUNCTIONS ---
    function render() {
        // Loading spinner
        document.getElementById('loading-spinner').classList.toggle('hidden', !state.ui.isLoading);
        
        // Mode views
        document.getElementById('calculator-mode').classList.toggle('hidden', state.ui.currentMode !== 'calculator');
        document.getElementById('ai-mode').classList.toggle('hidden', state.ui.currentMode !== 'ai');
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === state.ui.currentMode));
        
        if (state.ui.currentMode === 'calculator') {
            renderCalculator();
        } else {
            renderAI();
        }
    }

    function renderCalculator() {
        // Timeline
        const progress = ((state.ui.currentStep - 1) / 4) * 100;
        document.getElementById('progress-bar').style.width = `${progress}%`;
        document.querySelectorAll('.timeline-step').forEach((step, i) => {
            const stepNum = i + 1;
            step.classList.toggle('active', stepNum === state.ui.currentStep);
            step.classList.toggle('completed', stepNum < state.ui.currentStep);
            const circle = step.querySelector('.step-circle');
            circle.textContent = (stepNum < state.ui.currentStep) ? '✓' : stepNum;
        });

        // Step content
        document.querySelectorAll('.step-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`step-${state.ui.currentStep}`).classList.add('active');

        // Navigation buttons
        document.getElementById('prev-btn').classList.toggle('hidden', state.ui.currentStep === 1);
        const nextBtn = document.getElementById('next-btn');
        nextBtn.textContent = (state.ui.currentStep === 5) ? 'Začít znovu' : (state.ui.currentStep === 4) ? 'Získat konzultaci' : 'Další →';
        nextBtn.classList.toggle('primary', state.ui.currentStep < 5);

        // Form values
        const { calculator } = state;
        document.getElementById('quickCalc').textContent = formatCurrency(calculator.monthlyPayment) || '-- Kč';
        
        // DSTI
        const dstiCard = document.getElementById('dsti-result');
        if (calculator.monthlyIncome > 0) {
            dstiCard.classList.remove('hidden');
            const dstiData = calculateDSTI();
            document.getElementById('dsti-percent').textContent = `${dstiData.dsti.toFixed(1)}%`;
            document.getElementById('dsti-msg').textContent = dstiData.message;
            dstiCard.style.borderColor = dstiData.color;
        } else {
            dstiCard.classList.add('hidden');
        }
    }

    function renderAI() {
        // Render conversation
        const messagesDiv = document.getElementById('chat-messages');
        messagesDiv.innerHTML = state.ai.conversation.map(msg => `
            <div class="message ${msg.sender}">
                ${msg.sender === 'ai' ? '<strong>🤖 AI Hypoteční Specialista</strong><br>' : ''}
                ${msg.text}
            </div>
        `).join('');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // Render suggestions
        const suggestionsDiv = document.getElementById('chat-suggestions');
        suggestionsDiv.innerHTML = state.ai.suggestions.map(s => `<button class="suggestion">${s}</button>`).join('');

        // Render summary
        const summaryDiv = document.getElementById('ai-summary');
        const { loanAmount, ltv, monthlyPayment } = state.calculator;
        if(loanAmount > 0) {
            summaryDiv.innerHTML = `
                <p><strong>Úvěr:</strong> ${formatCurrency(loanAmount)}</p>
                <p><strong>LTV:</strong> ${ltv.toFixed(1)}%</p>
                <p><strong>Splátka:</strong> ${formatCurrency(monthlyPayment)}</p>
            `;
        } else {
             summaryDiv.innerHTML = `<p>Zatím nebyly zadány žádné parametry.</p>`;
        }
    }

    function renderOffers(offers) {
        const offersDiv = document.getElementById('offers');
        offersDiv.innerHTML = offers.map((offer, index) => `
            <div class="offer-card ${index === 0 ? 'recommended' : ''}">
                ${index === 0 ? '<div class="offer-badge">NEJLEPŠÍ</div>' : ''}
                <h4>${offer.name}</h4>
                <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${offer.rate.toFixed(2)}%</div>
                <div style="margin: 1rem 0;">
                    <div style="color: var(--gray-text);">Měsíční splátka</div>
                    <div style="font-size: 1.5rem; font-weight: 600;">${formatCurrency(offer.payment)}</div>
                </div>
            </div>
        `).join('');
    }

    function renderMetrics(bestOffer) {
        const metricsDiv = document.getElementById('metrics');
        if (!bestOffer) return;
        const totalPaid = bestOffer.payment * state.calculator.loanTerm * 12;
        const totalInterest = totalPaid - state.calculator.loanAmount;

        metricsDiv.innerHTML = `
            <h3>Klíčové metriky</h3>
            <p><strong>Výše úvěru:</strong> ${formatCurrency(state.calculator.loanAmount)}</p>
            <p><strong>LTV:</strong> ${state.calculator.ltv.toFixed(1)}%</p>
            <p><strong>Celkem zaplaceno:</strong> ${formatCurrency(totalPaid)}</p>
            <p><strong>Přeplatek na úrocích:</strong> <strong style="color: #ef4444;">${formatCurrency(totalInterest)}</strong></p>
        `;
    }

    function renderChart() {
        const canvas = document.getElementById('loanChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if (loanChart) {
            loanChart.destroy();
        }

        const years = Array.from({ length: state.calculator.loanTerm + 1 }, (_, i) => i);
        let balance = state.calculator.loanAmount;
        const balances = years.map(() => {
            const currentBalance = balance;
            for(let i=0; i<12; i++) {
                balance -= (state.calculator.monthlyPayment - (balance * (getInterestRate() / 100 / 12)));
            }
            return Math.max(0, currentBalance);
        });

        loanChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Zůstatek úvěru',
                    data: balances,
                    borderColor: 'var(--primary)',
                    backgroundColor: 'rgba(0, 102, 255, 0.1)',
                    fill: true,
                    tension: 0.2
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }


    // --- HELPERS ---
    function addMessageToConversation(sender, text) {
        state.ai.conversation.push({ sender, text });
    }

    function getInterestRate() {
        const rates = {
            3: { 80: 4.19, 90: 4.69 },
            5: { 80: 3.99, 90: 4.49 },
            7: { 80: 4.09, 90: 4.59 },
            10: { 80: 4.19, 90: 4.69 }
        };
        const fixRates = rates[state.calculator.fixation] || rates[5];
        const ltvKey = state.calculator.ltv > 80 ? 90 : 80;
        return fixRates[ltvKey] || 4.5;
    }

    function calculateMonthlyPayment(principal, annualRate, years) {
        if (principal <= 0) return 0;
        const monthlyRate = annualRate / 100 / 12;
        const n = years * 12;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    }
    
    function calculateDSTI() {
        const totalPayments = state.calculator.monthlyPayment + state.calculator.otherLoans;
        const dsti = (totalPayments / state.calculator.monthlyIncome) * 100;
        let message, color;
        if (dsti < 40) {
            message = '✅ Výborné! Hypotéku s největší pravděpodobností získáte.'; color = 'var(--success)';
        } else if (dsti < 50) {
            message = '⚠️ Na hranici. Získání hypotéky je stále reálné.'; color = '#fbbf24';
        } else {
            message = '❌ Příliš vysoké. Doporučujeme konzultaci s poradcem.'; color = '#ef4444';
        }
        return { dsti, message, color };
    }
    
    function varyRates(rates, variation) {
        const newRates = JSON.parse(JSON.stringify(rates));
        for (const fix in newRates) {
            for (const ltv in newRates[fix]) {
                newRates[fix][ltv] = parseFloat((newRates[fix][ltv] + variation).toFixed(2));
            }
        }
        return newRates;
    }
    
    function parseAmount(value) {
        if (!value) return 0;
        const str = value.toString().replace(/[^0-9,.]/g, '').replace(/,/g, '.');
        return parseFloat(str) || 0;
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    }
    
    function updateLiveCounter() {
        const counter = document.getElementById('live-count');
        if (!counter) return;
        const hour = new Date().getHours();
        let count = (hour >= 9 && hour < 17) ? 15 + Math.floor(Math.random() * 5) : 8 + Math.floor(Math.random() * 5);
        counter.textContent = count;
    }

    function updateDateDisplay() {
        const dateEl = document.getElementById('update-date');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('cs-CZ');
        }
    }
    
})();
