// Hypotéka AI - JavaScript v5.0
// Kompletní funkční verze

(function() {
    'use strict';
    
    // State
    let currentStep = 1;
    let currentMode = 'calculator';
    let selectedIntent = '';
    
    const data = {
        propertyPrice: 0,
        ownResources: 0,
        loanTerm: 25,
        fixation: 5,
        monthlyIncome: 0,
        otherLoans: 0,
        loanAmount: 0,
        ltv: 0,
        monthlyPayment: 0
    };
    
    // Rate database (anonymizované)
    const rates = {
        3: { 80: 4.19, 90: 4.69 },
        5: { 80: 3.99, 90: 4.49 },
        7: { 80: 4.09, 90: 4.59 },
        10: { 80: 4.19, 90: 4.69 }
    };
    
    // Initialize
    document.addEventListener('DOMContentLoaded', init);
    
    function init() {
        console.log('Hypotéka AI v5.0 - Initializing');
        
        setupEventListeners();
        updateLiveCounter();
        setInterval(updateLiveCounter, 5000);
        updateDateDisplay();
    }
    
    // Event Listeners
    function setupEventListeners() {
        // Mode switcher
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => switchMode(btn.dataset.mode));
        });
        
        // Intent cards
        document.querySelectorAll('.intent-card').forEach(card => {
            card.addEventListener('click', () => selectIntentCard(card));
        });
        
        // Navigation
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));
        
        // Form inputs
        const inputs = ['propertyPrice', 'ownResources', 'monthlyIncome', 'otherLoans'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => handleInputChange(id, input.value));
            }
        });
        
        // Selects
        const selects = ['loanTerm', 'fixation'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.addEventListener('change', () => handleSelectChange(id, select.value));
            }
        });
        
        // Contact form
        const form = document.getElementById('contact-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
        
        // Bank info button
        const bankBtn = document.getElementById('bank-info-btn');
        if (bankBtn) {
            bankBtn.addEventListener('click', showBankModal);
        }
        
        // AI Chat
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');
        
        if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendChatMessage();
            });
        }
        
        // Chat suggestions
        document.querySelectorAll('.suggestion').forEach(btn => {
            btn.addEventListener('click', () => {
                if (chatInput) chatInput.value = btn.textContent;
                sendChatMessage();
            });
        });
        
        // Sidebar buttons
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.addEventListener('click', () => handleSidebarAction(btn.textContent));
        });
    }
    
    // Mode Switching
    function switchMode(mode) {
        currentMode = mode;
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        document.getElementById('calculator-mode').classList.toggle('hidden', mode !== 'calculator');
        document.getElementById('ai-mode').classList.toggle('hidden', mode !== 'ai');
    }
    
    // Intent Selection
    function selectIntentCard(card) {
        selectedIntent = card.dataset.intent;
        
        document.querySelectorAll('.intent-card').forEach(c => {
            c.classList.toggle('selected', c === card);
        });
        
        // Auto advance after selection
        setTimeout(() => navigate(1), 300);
    }
    
    // Navigation
    function navigate(direction) {
        const newStep = currentStep + direction;
        
        if (newStep < 1 || newStep > 5) return;
        
        // Validation
        if (direction > 0 && !validateStep(currentStep)) {
            showMessage('Vyplňte prosím všechny údaje');
            return;
        }
        
        currentStep = newStep;
        updateStepDisplay();
        
        // Generate analysis on step 4
        if (currentStep === 4) {
            generateAnalysis();
        }
    }
    
    function validateStep(step) {
        switch(step) {
            case 1:
                return selectedIntent !== '';
            case 2:
                return data.propertyPrice > 0 && data.ownResources > 0;
            case 3:
                return data.monthlyIncome > 0;
            default:
                return true;
        }
    }
    
    function updateStepDisplay() {
        // Update timeline
        const progress = ((currentStep - 1) / 4) * 100;
        document.getElementById('progress-bar').style.width = progress + '%';
        
        // Update step states
        document.querySelectorAll('.timeline-step').forEach((step, i) => {
            const stepNum = i + 1;
            step.classList.toggle('active', stepNum === currentStep);
            step.classList.toggle('completed', stepNum < currentStep);
            
            const circle = step.querySelector('.step-circle');
            if (circle && stepNum < currentStep) {
                circle.textContent = '✓';
            } else if (circle) {
                circle.textContent = stepNum;
            }
        });
        
        // Show/hide content
        document.querySelectorAll('.step-content').forEach((content, i) => {
            content.classList.toggle('active', i + 1 === currentStep);
        });
        
        // Update navigation
        document.getElementById('prev-btn').classList.toggle('hidden', currentStep === 1);
        
        const nextBtn = document.getElementById('next-btn');
        if (currentStep === 5) {
            nextBtn.textContent = 'Začít znovu';
            nextBtn.classList.remove('primary');
        } else if (currentStep === 4) {
            nextBtn.textContent = 'Získat konzultaci';
            nextBtn.classList.add('primary');
        } else {
            nextBtn.textContent = 'Další →';
            nextBtn.classList.add('primary');
        }
    }
    
    // Input Handling
    function handleInputChange(field, value) {
        const numValue = parseAmount(value);
        data[field] = numValue;
        
        if (field === 'propertyPrice' || field === 'ownResources') {
            calculateLoan();
        }
        
        if (field === 'monthlyIncome' || field === 'otherLoans') {
            calculateDSTI();
        }
    }
    
    function handleSelectChange(field, value) {
        data[field] = parseInt(value);
        calculateLoan();
    }
    
    function parseAmount(value) {
        if (!value) return 0;
        const str = value.toString().replace(/\s/g, '').replace(/,/g, '.');
        return parseFloat(str) || 0;
    }
    
    // Calculations
    function calculateLoan() {
        if (data.propertyPrice === 0) {
            document.getElementById('quickCalc').textContent = '-- Kč';
            return;
        }
        
        data.loanAmount = Math.max(0, data.propertyPrice - data.ownResources);
        data.ltv = (data.loanAmount / data.propertyPrice) * 100;
        
        const rate = getInterestRate();
        data.monthlyPayment = calculateMonthlyPayment(data.loanAmount, rate, data.loanTerm);
        
        document.getElementById('quickCalc').textContent = formatCurrency(data.monthlyPayment);
    }
    
    function getInterestRate() {
        const fixRates = rates[data.fixation] || rates[5];
        const ltvKey = data.ltv > 80 ? 90 : 80;
        return fixRates[ltvKey] || 4.5;
    }
    
    function calculateMonthlyPayment(principal, annualRate, years) {
        if (principal <= 0) return 0;
        
        const monthlyRate = annualRate / 100 / 12;
        const n = years * 12;
        
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / 
               (Math.pow(1 + monthlyRate, n) - 1);
    }
    
    function calculateDSTI() {
        if (data.monthlyIncome === 0) return;
        
        const totalPayments = data.monthlyPayment + data.otherLoans;
        const dsti = (totalPayments / data.monthlyIncome) * 100;
        
        const dstiCard = document.getElementById('dsti-result');
        const dstiPercent = document.getElementById('dsti-percent');
        const dstiMsg = document.getElementById('dsti-msg');
        
        if (dstiCard && dstiPercent && dstiMsg) {
            dstiCard.classList.remove('hidden');
            dstiPercent.textContent = dsti.toFixed(1) + '%';
            
            if (dsti < 40) {
                dstiMsg.textContent = '✅ Výborné! Hypotéku získáte.';
                dstiCard.style.borderColor = '#00b341';
            } else if (dsti < 50) {
                dstiMsg.textContent = '⚠️ Na hranici, ale dostupné.';
                dstiCard.style.borderColor = '#fbbf24';
            } else {
                dstiMsg.textContent = '❌ Příliš vysoké, kontaktujte poradce.';
                dstiCard.style.borderColor = '#ef4444';
            }
        }
    }
    
    // Analysis
    function generateAnalysis() {
        const offersDiv = document.getElementById('offers');
        const metricsDiv = document.getElementById('metrics');
        
        if (!offersDiv || !metricsDiv) return;
        
        // Generate offers
        const baseRate = getInterestRate();
        const offers = [
            { name: 'Nejlepší nabídka', rate: baseRate - 0.2, badge: 'NEJLEPŠÍ' },
            { name: 'Doporučená', rate: baseRate, badge: null },
            { name: 'Rychlé schválení', rate: baseRate + 0.3, badge: null }
        ];
        
        offersDiv.innerHTML = offers.map(offer => {
            const payment = calculateMonthlyPayment(data.loanAmount, offer.rate, data.loanTerm);
            return `
                <div class="offer-card ${offer.badge ? 'recommended' : ''}">
                    ${offer.badge ? `<div class="offer-badge">${offer.badge}</div>` : ''}
                    <h4>${offer.name}</h4>
                    <div style="font-size: 2rem; font-weight: 700; color: #0066ff;">
                        ${offer.rate.toFixed(2)}%
                    </div>
                    <div style="margin: 1rem 0;">
                        <div style="color: #6b7280;">Měsíční splátka</div>
                        <div style="font-size: 1.5rem; font-weight: 600;">
                            ${formatCurrency(payment)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Generate metrics
        const totalPaid = data.monthlyPayment * data.loanTerm * 12;
        const totalInterest = totalPaid - data.loanAmount;
        
        metricsDiv.innerHTML = `
            <div style="padding: 1rem 0; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Výše úvěru:</span>
                    <strong>${formatCurrency(data.loanAmount)}</strong>
                </div>
            </div>
            <div style="padding: 1rem 0; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between;">
                    <span>LTV:</span>
                    <strong>${data.ltv.toFixed(1)}%</strong>
                </div>
            </div>
            <div style="padding: 1rem 0; border-bottom: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Celkem zaplaceno:</span>
                    <strong>${formatCurrency(totalPaid)}</strong>
                </div>
            </div>
            <div style="padding: 1rem 0;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Přeplatek:</span>
                    <strong style="color: #ef4444;">${formatCurrency(totalInterest)}</strong>
                </div>
            </div>
        `;
        
        // Generate chart
        generateChart();
    }
    
    function generateChart() {
        const canvas = document.getElementById('loanChart');
        if (!canvas || !window.Chart) return;
        
        const ctx = canvas.getContext('2d');
        
        // Simple chart data
        const years = [];
        const balances = [];
        let balance = data.loanAmount;
        
        for (let i = 0; i <= data.loanTerm; i++) {
            years.push(i);
            balances.push(Math.round(balance));
            balance = balance * 0.95; // Simplified calculation
        }
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Zůstatek úvěru',
                    data: balances,
                    borderColor: '#0066ff',
                    backgroundColor: 'rgba(0, 102, 255, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
    
    // AI Chat (simplified)
    function sendChatMessage() {
        const input = document.getElementById('chat-input');
        const messagesDiv = document.getElementById('chat-messages');
        
        if (!input || !messagesDiv || !input.value) return;
        
        const userMessage = input.value;
        input.value = '';
        
        // Add user message
        messagesDiv.innerHTML += `
            <div class="message user">${userMessage}</div>
        `;
        
        // Generate AI response
        setTimeout(() => {
            const response = getAIResponse(userMessage);
            messagesDiv.innerHTML += `
                <div class="message ai">
                    <strong>🤖 AI Hypoteční Specialista</strong><br>
                    ${response}
                </div>
            `;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Update summary if calculation done
            if (data.loanAmount > 0) {
                updateAISummary();
            }
        }, 500);
    }
    
    function getAIResponse(message) {
        const msg = message.toLowerCase();
        
        if (msg.includes('sazb') || msg.includes('úrok')) {
            return 'Aktuální sazby se pohybují od 3.99% do 4.69% v závislosti na LTV a fixaci. Pro přesnou nabídku použijte kalkulačku.';
        }
        
        if (msg.includes('koup') || msg.includes('byt')) {
            return 'Pro koupi bytu doporučuji mít alespoň 20% vlastních zdrojů. Přepněte do kalkulačky pro přesný výpočet.';
        }
        
        return 'Rád vám pomohu s hypotékou. Použijte kalkulačku nebo mi napište konkrétní dotaz.';
    }
    
    function updateAISummary() {
        const summary = document.getElementById('ai-summary');
        if (summary) {
            summary.innerHTML = `
                <p><strong>Úvěr:</strong> ${formatCurrency(data.loanAmount)}</p>
                <p><strong>LTV:</strong> ${data.ltv.toFixed(1)}%</p>
                <p><strong>Splátka:</strong> ${formatCurrency(data.monthlyPayment)}</p>
            `;
        }
    }
    
    function handleSidebarAction(action) {
        if (action.includes('parametry')) {
            switchMode('calculator');
        } else if (action.includes('specialistu')) {
            currentStep = 5;
            switchMode('calculator');
            updateStepDisplay();
        }
    }
    
    // Form Submit
    function handleFormSubmit(e) {
        e.preventDefault();
        
        const successDiv = document.getElementById('form-success');
        if (successDiv) {
            successDiv.classList.remove('hidden');
            e.target.style.display = 'none';
        }
    }
    
    // Bank Modal
    function showBankModal() {
        const modal = document.getElementById('bank-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
    
    window.closeBankModal = function() {
        const modal = document.getElementById('bank-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };
    
    // Helpers
    function formatCurrency(amount) {
        return new Intl.NumberFormat('cs-CZ', {
            style: 'currency',
            currency: 'CZK',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    function updateLiveCounter() {
        const counter = document.getElementById('live-count');
        if (counter) {
            const hour = new Date().getHours();
            let count = 10;
            
            if (hour >= 9 && hour < 17) {
                count = Math.floor(Math.random() * 5) + 15;
            } else if (hour >= 17 && hour < 22) {
                count = Math.floor(Math.random() * 5) + 10;
            } else {
                count = Math.floor(Math.random() * 3) + 3;
            }
            
            counter.textContent = count;
        }
    }
    
    function updateDateDisplay() {
        const dateEl = document.getElementById('update-date');
        if (dateEl) {
            const date = new Date();
            dateEl.textContent = date.toLocaleDateString('cs-CZ');
        }
    }
    
    function showMessage(msg) {
        alert(msg); // Simple for now, can be replaced with better UI
    }
    
    console.log('Hypotéka AI v5.0 - Ready');
})();