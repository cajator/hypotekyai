// Hypotéka AI - JavaScript v9.0 (Production Ready)
// Focused on stability, user experience, and AI reliability.

(function() {
    'use strict';

    // Central application state
    const state = {
        ui: { currentStep: 1, currentMode: 'calculator', isLoading: false },
        calculator: { intent: '', propertyPrice: 0, ownResources: 0, loanTerm: 25, fixation: 5, monthlyIncome: 0, otherLoans: 0, loanAmount: 0, ltv: 0, monthlyPayment: 0 },
        ai: { conversation: [], suggestions: ["Chci koupit byt za 5M Kč", "Jaké jsou aktuální sazby?", "Spočítej mi refinancování"] }
    };

    let loanChart = null;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        console.log('Hypotéka AI v9.0 - Initializing Production Build');
        setupEventListeners();
        updateLiveCounter();
        setInterval(updateLiveCounter, 7000);
        updateDateDisplay();
        render();
    }

    // --- EVENT LISTENER SETUP ---
    function setupEventListeners() {
        document.querySelector('.mode-switcher').addEventListener('click', handleModeSwitch);
        document.getElementById('prev-btn').addEventListener('click', () => navigate(-1));
        document.getElementById('next-btn').addEventListener('click', () => navigate(1));
        document.getElementById('step-1').addEventListener('click', handleIntentSelection);
        document.getElementById('contact-form').addEventListener('submit', handleFormSubmit);

        ['propertyPrice', 'ownResources', 'monthlyIncome', 'otherLoans'].forEach(id => document.getElementById(id).addEventListener('input', handleInputChange));
        ['loanTerm', 'fixation'].forEach(id => document.getElementById(id).addEventListener('change', handleInputChange));

        document.getElementById('send-btn').addEventListener('click', handleAIChatSubmit);
        document.getElementById('chat-input').addEventListener('keypress', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIChatSubmit(); } });
        document.getElementById('chat-suggestions').addEventListener('click', handleSuggestionClick);
        document.querySelector('.ai-sidebar').addEventListener('click', handleSidebarAction);
        
        const contactNav = document.getElementById('contact-nav-link');
        const footerContact = document.getElementById('footer-contact-link');
        if(contactNav) contactNav.addEventListener('click', (e) => { e.preventDefault(); navigateToContact(); });
        if(footerContact) footerContact.addEventListener('click', (e) => { e.preventDefault(); navigateToContact(); });

        setupModal('bank-info-btn', 'bank-modal', 'close-bank-modal');
        setupModal('gdpr-link', 'gdpr-modal', 'close-gdpr-modal');
        setupModal('footer-gdpr-link', 'gdpr-modal', 'close-gdpr-modal');
        setupModal('about-link', 'about-modal', 'close-about-modal');
        setupModal('footer-about-link', 'about-modal', 'close-about-modal');
    }

    function setupModal(triggerId, modalId, closeId) {
        const modal = document.getElementById(modalId);
        const closeBtn = document.getElementById(closeId);
        const openBtn = document.getElementById(triggerId);
        const openModal = (e) => { e.preventDefault(); modal.classList.remove('hidden'); closeBtn.focus(); };
        const closeModal = () => modal.classList.add('hidden');
        if (openBtn) openBtn.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (modal) {
            modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
            document.addEventListener('keydown', (e) => { if (e.key === "Escape" && !modal.classList.contains('hidden')) closeModal(); });
        }
    }

    // --- EVENT HANDLERS ---
    function handleModeSwitch(e) {
        if (!e.target.matches('.mode-btn')) return;
        state.ui.currentMode = e.target.dataset.mode;
        render();
    }

    function handleIntentSelection(e) {
        const card = e.target.closest('.intent-card');
        if (!card) return;
        state.calculator.intent = card.dataset.intent;
        setTimeout(() => navigate(1), 300);
    }
    
    function handleInputChange(e) {
        const { id, value } = e.target;
        if (state.calculator.hasOwnProperty(id)) {
            state.calculator[id] = (id === 'intent') ? value : parseAmount(value);
            calculateLoan();
            render();
        }
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const leadData = { contact: Object.fromEntries(formData.entries()), calculatorState: state.calculator };
        console.log("GENERATED LEAD DATA:", JSON.stringify(leadData, null, 2));
        document.getElementById('form-success').classList.remove('hidden');
        e.target.style.display = 'none';
    }

    async function handleAIChatSubmit() {
        const input = document.getElementById('chat-input');
        const userMessage = input.value.trim();
        if (!userMessage || state.ui.isLoading) return;

        addMessageToConversation('user', userMessage);
        input.value = '';
        input.disabled = true;
        state.ai.suggestions = [];
        state.ui.isLoading = true;
        render();

        try {
            const response = await fetch('/.netlify/functions/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userMessage, state: state.calculator, conversation: state.ai.conversation })
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            
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
                await generateAnalysis();
            }
        } catch (error) {
            console.error('AI Fetch Error:', error);
            addMessageToConversation('ai', 'Omlouvám se, došlo k technické chybě. Zkuste to prosím znovu, nebo použijte naši kalkulačku.');
        } finally {
            state.ui.isLoading = false;
            input.disabled = false;
            render();
            input.focus();
        }
    }
    
    function handleSuggestionClick(e) {
        if (e.target.matches('.suggestion')) {
            document.getElementById('chat-input').value = e.target.textContent;
            handleAIChatSubmit();
        }
    }

    function handleSidebarAction(e) {
        if (!e.target.matches('.sidebar-btn')) return;
        const action = e.target.dataset.action;
        const chatInput = document.getElementById('chat-input');
        
        switch(action) {
            case 'calculate': state.ui.currentMode = 'calculator'; break;
            case 'contact': navigateToContact(); break;
            case 'refinance': chatInput.value = "Chci refinancovat hypotéku"; handleAIChatSubmit(); break;
            case 'rates': chatInput.value = "Jaké jsou teď nejlepší úrokové sazby?"; handleAIChatSubmit(); break;
        }
        render();
    }
    
    // --- CORE LOGIC & NAVIGATION ---
    function navigate(direction) {
        let newStep = state.ui.currentStep + direction;
        if (newStep > 5) {
            Object.assign(state.calculator, { intent: '', propertyPrice: 0, ownResources: 0, loanTerm: 25, fixation: 5, monthlyIncome: 0, otherLoans: 0, loanAmount: 0, ltv: 0, monthlyPayment: 0 });
            newStep = 1;
        }
        if (newStep < 1) return;
        if (direction > 0 && !validateStep(state.ui.currentStep)) {
            alert('Vyplňte prosím všechny povinné údaje v tomto kroku.');
            return;
        }
        state.ui.currentStep = newStep;
        if (state.ui.currentStep === 4) generateAnalysis();
        render();
    }
    
    function navigateToContact() {
        state.ui.currentMode = 'calculator';
        state.ui.currentStep = 5;
        render();
        setTimeout(() => document.getElementById('name')?.focus(), 100);
    }
    
    function validateStep(step) {
        const { calculator } = state;
        switch(step) {
            case 1: return !!calculator.intent;
            case 2: return calculator.propertyPrice > 0 && calculator.ownResources >= 0 && calculator.propertyPrice > calculator.ownResources;
            case 3: return calculator.monthlyIncome > 0;
            default: return true;
        }
    }

    function calculateLoan() {
        const { calculator } = state;
        if (calculator.propertyPrice <= 0) return;
        calculator.loanAmount = Math.max(0, calculator.propertyPrice - calculator.ownResources);
        calculator.ltv = calculator.propertyPrice > 0 ? (calculator.loanAmount / calculator.propertyPrice) * 100 : 0;
        calculator.monthlyPayment = calculateMonthlyPayment(calculator.loanAmount, getInterestRate(), calculator.loanTerm);
    }
    
    async function generateAnalysis() {
        state.ui.isLoading = true;
        render();
        try {
            const rates = await fetchLatestRates();
            const offers = rates.map(bank => {
                const ltvKey = state.calculator.ltv > 80 ? 90 : 80;
                const rate = bank.rates[state.calculator.fixation]?.[ltvKey] ?? bank.rates[5][ltvKey];
                const payment = calculateMonthlyPayment(state.calculator.loanAmount, rate, state.calculator.loanTerm);
                return { ...bank, rate, payment };
            }).sort((a, b) => a.payment - b.payment);
            state.analysis = { top3: offers.slice(0, 3) };
        } catch (error) {
            console.error("Failed to generate analysis:", error);
            state.analysis = { error: "Chyba při načítání nabídek." };
        } finally {
            state.ui.isLoading = false;
            render();
        }
    }

    function fetchLatestRates() {
        return new Promise(resolve => setTimeout(() => resolve([
            { name: 'Nejvýhodnější nabídka', rates: varyRates({ 3: { 80: 4.19, 90: 4.69 }, 5: { 80: 3.99, 90: 4.49 }, 7: { 80: 4.09, 90: 4.59 }, 10: { 80: 4.19, 90: 4.69 } }, -0.1) },
            { name: 'Optimální varianta', rates: varyRates({ 3: { 80: 4.19, 90: 4.69 }, 5: { 80: 3.99, 90: 4.49 }, 7: { 80: 4.09, 90: 4.59 }, 10: { 80: 4.19, 90: 4.69 } }, 0) },
            { name: 'Rychlé schválení', rates: varyRates({ 3: { 80: 4.19, 90: 4.69 }, 5: { 80: 3.99, 90: 4.49 }, 7: { 80: 4.09, 90: 4.59 }, 10: { 80: 4.19, 90: 4.69 } }, 0.05) },
        ]), 800));
    }

    // --- RENDER FUNCTIONS (Update UI based on state) ---
    function render() {
        document.getElementById('loading-spinner').classList.toggle('hidden', !state.ui.isLoading);
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === state.ui.currentMode));
        document.getElementById('calculator-mode').classList.toggle('hidden', state.ui.currentMode !== 'calculator');
        document.getElementById('ai-mode').classList.toggle('hidden', state.ui.currentMode !== 'ai');
        if (state.ui.currentMode === 'calculator') renderCalculator(); else renderAI();
    }

    function renderCalculator() {
        const { ui, calculator, analysis } = state;
        document.getElementById('progress-bar').style.width = `${((ui.currentStep - 1) / 4) * 100}%`;
        document.querySelectorAll('.timeline-step').forEach((step, i) => {
            const stepNum = i + 1;
            step.classList.toggle('active', stepNum === ui.currentStep);
            step.classList.toggle('completed', stepNum < ui.currentStep);
            step.querySelector('.step-circle').textContent = (stepNum < ui.currentStep) ? '✓' : stepNum;
        });
        document.querySelectorAll('.intent-card').forEach(c => c.classList.toggle('selected', c.dataset.intent === calculator.intent));
        document.querySelectorAll('.step-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`step-${ui.currentStep}`).classList.add('active');
        document.getElementById('prev-btn').classList.toggle('hidden', ui.currentStep === 1);
        document.getElementById('next-btn').textContent = (ui.currentStep === 5) ? 'Začít znovu' : (ui.currentStep === 4) ? 'Získat konzultaci' : 'Další →';
        document.getElementById('quickCalc').textContent = formatCurrency(calculator.monthlyPayment) || '-- Kč';
        const dstiCard = document.getElementById('dsti-result');
        if (calculator.monthlyIncome > 0 && calculator.monthlyPayment > 0) {
            dstiCard.classList.remove('hidden');
            const dstiData = calculateDSTI();
            document.getElementById('dsti-percent').textContent = `${dstiData.dsti.toFixed(1)}%`;
            document.getElementById('dsti-msg').textContent = dstiData.message;
            dstiCard.style.borderColor = dstiData.color;
        } else { dstiCard.classList.add('hidden'); }
        if (ui.currentStep === 4 && analysis) {
            renderOffers(analysis); renderMetrics(analysis); renderChart();
        }
    }

    function renderAI() {
        const { conversation, suggestions } = state.ai;
        const messagesDiv = document.getElementById('chat-messages');
        messagesDiv.innerHTML = conversation.map(msg => `<div class="message ${msg.sender}">${msg.sender === 'ai' ? '<strong>🤖 AI Poradce</strong><br>' : ''}${msg.text.replace(/\n/g, '<br>')}</div>`).join('');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        document.getElementById('chat-suggestions').innerHTML = suggestions.map(s => `<button class="suggestion">${s}</button>`).join('');
        const { loanAmount, ltv, monthlyPayment } = state.calculator;
        document.getElementById('ai-summary').innerHTML = loanAmount > 0 ? `<p><strong>Úvěr:</strong> ${formatCurrency(loanAmount)}</p><p><strong>LTV:</strong> ${ltv.toFixed(1)}%</p><p><strong>Splátka:</strong> ${formatCurrency(monthlyPayment)}</p>` : `<p>Zadejte parametry do chatu.</p>`;
    }

    function renderOffers({ top3, error }) {
        const offersDiv = document.getElementById('offers');
        if (error) { offersDiv.innerHTML = `<p class="error">${error}</p>`; return; }
        offersDiv.innerHTML = top3.map((offer, index) => `<div class="offer-card ${index === 0 ? 'recommended' : ''}">${index === 0 ? '<div class="offer-badge">NEJVÝHODNĚJŠÍ</div>' : ''}<h4>${offer.name}</h4><div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${offer.rate.toFixed(2)}%</div><div style="margin: 1rem 0;"><div class="quick-label">Měsíční splátka</div><div style="font-size: 1.5rem; font-weight: 600;">${formatCurrency(offer.payment)}</div></div></div>`).join('');
    }

    function renderMetrics({ top3, error }) {
        const metricsDiv = document.getElementById('metrics');
        if (error || !top3 || top3.length === 0) { metricsDiv.innerHTML = '<h3>Klíčové metriky</h3><p>Data nejsou k dispozici.</p>'; return; }
        const bestOffer = top3[0];
        const totalPaid = bestOffer.payment * state.calculator.loanTerm * 12;
        const totalInterest = totalPaid - state.calculator.loanAmount;
        metricsDiv.innerHTML = `<h3>Klíčové metriky</h3><p><strong>Výše úvěru:</strong> ${formatCurrency(state.calculator.loanAmount)}</p><p><strong>LTV:</strong> ${state.calculator.ltv.toFixed(1)}%</p><p><strong>Celkem zaplaceno:</strong> ${formatCurrency(totalPaid)}</p><p><strong>Přeplatek na úrocích:</strong> <strong style="color: #ef4444;">${formatCurrency(totalInterest)}</strong></p>`;
    }

    function renderChart() {
        if (loanChart) loanChart.destroy();
        const years = Array.from({ length: state.calculator.loanTerm + 1 }, (_, i) => i);
        let balance = state.calculator.loanAmount;
        const monthlyRate = getInterestRate() / 100 / 12;
        const balances = years.map(() => {
            const currentBalance = balance > 0 ? balance : 0;
            for (let month = 0; month < 12 && balance > 0; month++) {
                balance -= (state.calculator.monthlyPayment - (balance * monthlyRate));
            }
            return currentBalance;
        });
        balances[balances.length - 1] = 0;
        loanChart = new Chart('loanChart', { type: 'line', data: { labels: years, datasets: [{ label: 'Zůstatek úvěru', data: balances, borderColor: 'var(--primary)', backgroundColor: 'rgba(0, 102, 255, 0.1)', fill: true, tension: 0.2 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
    }

    // --- HELPER FUNCTIONS ---
    function addMessageToConversation(sender, text) { state.ai.conversation.push({ sender, text }); }
    function getInterestRate() {
        const rates = { 3: { 80: 4.19, 90: 4.69 }, 5: { 80: 3.99, 90: 4.49 }, 7: { 80: 4.09, 90: 4.59 }, 10: { 80: 4.19, 90: 4.69 } };
        const fixRates = rates[state.calculator.fixation] || rates[5];
        return fixRates[state.calculator.ltv > 80 ? 90 : 80] || 4.5;
    }
    function calculateMonthlyPayment(p, r, t) { if (p <= 0) return 0; const mRate = r / 100 / 12, n = t * 12; return p * (mRate * Math.pow(1 + mRate, n)) / (Math.pow(1 + mRate, n) - 1); }
    function calculateDSTI() {
        const totalPayments = state.calculator.monthlyPayment + state.calculator.otherLoans;
        const dsti = (totalPayments / state.calculator.monthlyIncome) * 100;
        let message, color;
        if (dsti < 40) { message = '✅ Výborné! Schválení je velmi pravděpodobné.'; color = 'var(--success)'; }
        else if (dsti < 50) { message = '⚠️ Na hranici. Schválení je stále reálné.'; color = '#fbbf24'; }
        else { message = '❌ Příliš vysoké. Doporučujeme konzultaci.'; color = '#ef4444'; }
        return { dsti, message, color };
    }
    function varyRates(rates, v) { const n = JSON.parse(JSON.stringify(rates)); for (const f in n) for (const l in n[f]) n[f][l] = parseFloat((n[f][l] + v).toFixed(2)); return n; }
    function parseAmount(value) { return parseFloat(String(value).replace(/[^0-9,.]/g, '').replace(',', '.')) || 0; }
    function formatCurrency(amount) { return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount); }
    function updateLiveCounter() { const el = document.getElementById('live-count'); if (el) el.textContent = new Date().getHours() >= 9 && new Date().getHours() < 17 ? 15 + Math.floor(Math.random() * 5) : 8 + Math.floor(Math.random() * 5); }
    function updateDateDisplay() { const el = document.getElementById('update-date'); if (el) el.textContent = new Date().toLocaleDateString('cs-CZ'); }
})();

