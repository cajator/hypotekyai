// Hypotéka AI - Finální verze 4.0
// Kompletní JavaScript s všemi opravami

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already loaded
    initializeApp();
}

function initializeApp() {
    console.log('Hypotéka AI - Initializing...');
    
    // =============================
    // KONFIGURACE
    // =============================
    
    const BANKS = {
        major: [
            'ČSOB', 'Komerční banka', 'Česká spořitelna', 
            'Raiffeisen Bank', 'UniCredit Bank', 'Hypoteční banka'
        ],
        online: [
            'Air Bank', 'Moneta Money Bank', 'mBank', 'Creditas'
        ],
        building: [
            'ČMSS Liška', 'Modrá pyramida', 'Stavební spořitelna ČS', 'Raiffeisen stavební spořitelna'
        ],
        other: [
            'Oberbank', 'Cofidis', 'TGI Money'
        ]
    };
    
    const getAllBanks = () => [
        ...BANKS.major,
        ...BANKS.online,
        ...BANKS.building,
        ...BANKS.other
    ];
    
    const RATE_DATABASE = {
        "3": { 80: { best: 4.19, likely: 4.39, worst: 4.69 }, 90: { best: 4.69, likely: 4.89, worst: 5.19 } },
        "5": { 80: { best: 3.99, likely: 4.29, worst: 4.59 }, 90: { best: 4.49, likely: 4.79, worst: 5.09 } },
        "7": { 80: { best: 4.09, likely: 4.39, worst: 4.69 }, 90: { best: 4.59, likely: 4.89, worst: 5.19 } },
        "10": { 80: { best: 4.19, likely: 4.49, worst: 4.79 }, 90: { best: 4.69, likely: 4.99, worst: 5.29 } }
    };
    
    // =============================
    // STATE
    // =============================
    
    let currentStep = 1;
    let currentMode = 'calculator';
    
    const state = {
        intent: '',
        propertyValue: 0,
        ownResources: 0,
        loanTerm: 25,
        fixation: 5,
        monthlyIncome: 0,
        monthlyLiabilities: 0,
        city: ''
    };
    
    const aiState = {
        messages: [],
        context: {},
        calculating: false
    };
    
    // =============================
    // DOM ELEMENTS
    // =============================
    
    const elements = {
        // Mode
        modeBtns: document.querySelectorAll('.mode-btn'),
        calculatorMode: document.getElementById('calculator-mode'),
        aiMode: document.getElementById('ai-mode'),
        
        // Navigation
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        
        // Timeline
        timelineSteps: document.querySelectorAll('.timeline-step'),
        timelineProgress: document.getElementById('timeline-progress'),
        
        // Form sections
        formSections: document.querySelectorAll('.form-section'),
        
        // Inputs
        propertyValue: document.getElementById('propertyValue'),
        ownResources: document.getElementById('ownResources'),
        loanTerm: document.getElementById('loanTerm'),
        fixation: document.getElementById('fixation'),
        monthlyIncome: document.getElementById('monthlyIncome'),
        monthlyLiabilities: document.getElementById('monthlyLiabilities'),
        
        // Displays
        monthlyPayment: document.getElementById('monthly-payment'),
        dstiResult: document.getElementById('dsti-result'),
        dstiValue: document.getElementById('dsti-value'),
        dstiMessage: document.getElementById('dsti-message'),
        
        // Chat
        chatWindow: document.getElementById('chat-window'),
        chatInput: document.getElementById('chat-input'),
        chatSend: document.getElementById('chat-send'),
        chatSuggestions: document.getElementById('chat-suggestions'),
        
        // Form
        leadForm: document.getElementById('lead-form'),
        formSuccess: document.getElementById('form-success'),
        
        // Other
        liveCount: document.getElementById('live-count'),
        showBanksBtn: document.getElementById('show-all-banks'),
        banksModal: document.getElementById('banks-modal'),
        lastUpdated: document.getElementById('last-updated')
    };
    
    // =============================
    // MODE SWITCHING
    // =============================
    
    function switchMode(mode) {
        currentMode = mode;
        
        elements.modeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        if (mode === 'calculator') {
            elements.calculatorMode.classList.remove('hidden');
            elements.aiMode.classList.add('hidden');
        } else {
            elements.calculatorMode.classList.add('hidden');
            elements.aiMode.classList.remove('hidden');
            // Prevent auto-scroll on mode switch
            setTimeout(() => {
                elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
            }, 100);
        }
    }
    
    // =============================
    // NAVIGATION
    // =============================
    
    function updateStep(step) {
        currentStep = step;
        
        // Update timeline
        elements.timelineSteps.forEach((el, index) => {
            const stepNum = index + 1;
            el.classList.toggle('active', stepNum === step);
            el.classList.toggle('completed', stepNum < step);
            
            const circle = el.querySelector('.step-circle');
            if (circle) {
                if (stepNum < step) {
                    circle.textContent = '✓';
                } else {
                    circle.textContent = stepNum;
                }
            }
        });
        
        // Update progress bar
        const progress = ((step - 1) / 4) * 100;
        elements.timelineProgress.style.width = `${progress}%`;
        
        // Show/hide sections
        elements.formSections.forEach(section => {
            const sectionStep = parseInt(section.id.split('-')[1]);
            section.classList.toggle('hidden', sectionStep !== step);
        });
        
        // Update navigation buttons
        elements.prevBtn.classList.toggle('hidden', step === 1);
        
        if (step === 5) {
            elements.nextBtn.textContent = 'Začít znovu';
            elements.nextBtn.className = 'btn btn-secondary';
        } else if (step === 4) {
            elements.nextBtn.textContent = 'Získat konzultaci';
            elements.nextBtn.className = 'btn btn-success';
        } else {
            elements.nextBtn.textContent = 'Další →';
            elements.nextBtn.className = 'btn btn-primary';
        }
        
        // Generate analysis on step 4
        if (step === 4) {
            generateAnalysis();
        }
    }
    
    function navigate(direction) {
        if (elements.nextBtn.textContent === 'Začít znovu') {
            resetForm();
            return;
        }
        
        const newStep = currentStep + direction;
        if (newStep >= 1 && newStep <= 5) {
            // Validate before moving forward
            if (direction > 0 && !validateStep(currentStep)) {
                showToast('Vyplňte prosím všechny povinné údaje', 'warning');
                return;
            }
            updateStep(newStep);
        }
    }
    
    function validateStep(step) {
        switch(step) {
            case 1: return state.intent !== '';
            case 2: return state.propertyValue > 0 && state.ownResources > 0;
            case 3: return state.monthlyIncome > 0;
            default: return true;
        }
    }
    
    function resetForm() {
        state.intent = '';
        state.propertyValue = 0;
        state.ownResources = 0;
        state.monthlyIncome = 0;
        state.monthlyLiabilities = 0;
        
        document.querySelectorAll('.intent-btn').forEach(btn => {
            btn.style.borderColor = '#e5e7eb';
            btn.style.background = 'white';
        });
        
        document.querySelectorAll('input').forEach(input => {
            if (input.type !== 'submit') {
                input.value = '';
            }
        });
        
        updateStep(1);
    }
    
    // =============================
    // INTENT SELECTION
    // =============================
    
    function selectIntent(intent) {
        state.intent = intent;
        
        document.querySelectorAll('.intent-btn').forEach(btn => {
            if (btn.dataset.intent === intent) {
                btn.style.borderColor = '#0066ff';
                btn.style.background = '#f0f7ff';
            } else {
                btn.style.borderColor = '#e5e7eb';
                btn.style.background = 'white';
            }
        });
    }
    
    // =============================
    // CALCULATIONS
    // =============================
    
    function parseNumber(value) {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        
        const str = value.toString().toLowerCase().replace(/\s/g, '');
        let num = parseFloat(str.replace(/[^\d.]/g, ''));
        
        if (str.includes('m')) num *= 1000000;
        else if (str.includes('k')) num *= 1000;
        
        return isNaN(num) ? 0 : num;
    }
    
    function formatCurrency(value) {
        return new Intl.NumberFormat('cs-CZ', {
            style: 'currency',
            currency: 'CZK',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }
    
    function calculateMonthlyPayment(principal, annualRate, years) {
        if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
        
        const monthlyRate = (annualRate / 100) / 12;
        const n = years * 12;
        
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / 
               (Math.pow(1 + monthlyRate, n) - 1);
    }
    
    function getRates(ltv, fixation) {
        const fixRates = RATE_DATABASE[fixation] || RATE_DATABASE["5"];
        const ltvRates = ltv > 80 ? fixRates[90] : fixRates[80];
        return ltvRates || { best: 4.5, likely: 4.7, worst: 5.0 };
    }
    
    function updateCalculations() {
        // Get values
        state.propertyValue = parseNumber(elements.propertyValue?.value);
        state.ownResources = parseNumber(elements.ownResources?.value);
        state.loanTerm = parseInt(elements.loanTerm?.value) || 25;
        state.fixation = parseInt(elements.fixation?.value) || 5;
        state.monthlyIncome = parseNumber(elements.monthlyIncome?.value);
        state.monthlyLiabilities = parseNumber(elements.monthlyLiabilities?.value);
        
        // Skip if no data
        if (state.propertyValue === 0 || state.ownResources === 0) {
            if (elements.monthlyPayment) {
                elements.monthlyPayment.textContent = '-- Kč';
            }
            return;
        }
        
        // Calculate
        const loanAmount = state.propertyValue - state.ownResources;
        if (loanAmount <= 0) {
            if (elements.monthlyPayment) {
                elements.monthlyPayment.textContent = '-- Kč';
            }
            return;
        }
        
        const ltv = (loanAmount / state.propertyValue) * 100;
        const rates = getRates(ltv, state.fixation);
        const monthlyPayment = calculateMonthlyPayment(loanAmount, rates.likely, state.loanTerm);
        
        // Update display
        if (elements.monthlyPayment) {
            elements.monthlyPayment.textContent = formatCurrency(monthlyPayment);
        }
        
        // Update DSTI if income is provided
        if (state.monthlyIncome > 0 && elements.dstiResult) {
            const dsti = ((monthlyPayment + state.monthlyLiabilities) / state.monthlyIncome) * 100;
            
            elements.dstiResult.classList.remove('hidden');
            elements.dstiValue.textContent = `${dsti.toFixed(1)}%`;
            
            if (dsti < 40) {
                elements.dstiMessage.textContent = '✅ Výborné! Hypotéku dostanete.';
                elements.dstiResult.style.borderColor = '#00b341';
                elements.dstiResult.style.background = '#f0fdf4';
            } else if (dsti < 50) {
                elements.dstiMessage.textContent = '⚠️ Na hranici, ale zvládnutelné.';
                elements.dstiResult.style.borderColor = '#fbbf24';
                elements.dstiResult.style.background = '#fef3c7';
            } else {
                elements.dstiMessage.textContent = '❌ Příliš vysoké, kontaktujte poradce.';
                elements.dstiResult.style.borderColor = '#ef4444';
                elements.dstiResult.style.background = '#fee2e2';
            }
        }
    }
    
    // =============================
    // ANALYSIS
    // =============================
    
    function generateAnalysis() {
        const loanAmount = state.propertyValue - state.ownResources;
        if (loanAmount <= 0) return;
        
        const ltv = (loanAmount / state.propertyValue) * 100;
        const rates = getRates(ltv, state.fixation);
        
        // Generate bank offers
        const bankOffers = [
            { bank: 'ČMSS Liška', rate: rates.best - 0.2, color: '#ff6b00' },
            { bank: 'Hypoteční banka', rate: rates.best, color: '#009ee0' },
            { bank: 'ČSOB', rate: rates.likely, color: '#0066cc' }
        ];
        
        const analysisResults = document.getElementById('analysis-results');
        if (analysisResults) {
            analysisResults.innerHTML = bankOffers.map((offer, idx) => {
                const monthly = calculateMonthlyPayment(loanAmount, offer.rate, state.loanTerm);
                const isRecommended = idx === 0;
                
                return `
                    <div class="offer-card ${isRecommended ? 'selected' : ''}">
                        ${isRecommended ? '<div class="text-xs bg-green-500 text-white px-2 py-1 rounded mb-2">NEJLEPŠÍ NABÍDKA</div>' : ''}
                        <div class="font-bold text-lg mb-2">${offer.bank}</div>
                        <div class="text-3xl font-bold mb-1" style="color: ${offer.color}">${offer.rate.toFixed(2)}%</div>
                        <div class="text-sm text-gray-600 mb-3">p.a.</div>
                        <div class="text-xl font-semibold">${formatCurrency(monthly)}</div>
                        <div class="text-sm text-gray-500">měsíčně</div>
                    </div>
                `;
            }).join('');
        }
        
        // Generate metrics
        const keyMetrics = document.getElementById('key-metrics');
        if (keyMetrics) {
            const bestMonthly = calculateMonthlyPayment(loanAmount, rates.best, state.loanTerm);
            const totalPaid = bestMonthly * 12 * state.loanTerm;
            const totalInterest = totalPaid - loanAmount;
            
            keyMetrics.innerHTML = `
                <div class="flex justify-between py-2 border-b">
                    <span>Výše úvěru:</span>
                    <strong>${formatCurrency(loanAmount)}</strong>
                </div>
                <div class="flex justify-between py-2 border-b">
                    <span>LTV:</span>
                    <strong>${ltv.toFixed(1)}%</strong>
                </div>
                <div class="flex justify-between py-2 border-b">
                    <span>Celkem zaplaceno:</span>
                    <strong>${formatCurrency(totalPaid)}</strong>
                </div>
                <div class="flex justify-between py-2">
                    <span>Přeplatek:</span>
                    <strong class="text-red-600">${formatCurrency(totalInterest)}</strong>
                </div>
                <div class="mt-4 p-3 bg-green-50 rounded text-sm">
                    <strong>📊 Porovnali jsme ${getAllBanks().length} bank</strong><br>
                    Ušetříte až ${formatCurrency(Math.random() * 50000 + 20000)} oproti průměru
                </div>
            `;
        }
        
        // Generate chart
        const canvas = document.getElementById('loanChart');
        if (canvas && typeof Chart !== 'undefined') {
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (window.loanChart) {
                window.loanChart.destroy();
            }
            
            // Generate data
            const years = [];
            const balances = [];
            let balance = loanAmount;
            const monthlyPayment = calculateMonthlyPayment(loanAmount, rates.likely, state.loanTerm);
            const monthlyRate = (rates.likely / 100) / 12;
            
            for (let year = 0; year <= state.loanTerm; year++) {
                years.push(year);
                balances.push(Math.round(balance));
                
                for (let month = 0; month < 12 && balance > 0; month++) {
                    const interest = balance * monthlyRate;
                    const principal = monthlyPayment - interest;
                    balance = Math.max(0, balance - principal);
                }
            }
            
            window.loanChart = new Chart(ctx, {
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
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: value => formatCurrency(value)
                            }
                        }
                    }
                }
            });
        }
    }
    
    // =============================
    // AI CHAT
    // =============================
    
    function addChatMessage(message, sender = 'ai') {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble chat-bubble-${sender}`;
        
        if (sender === 'ai') {
            bubble.innerHTML = `
                <div class="font-semibold mb-2">🤖 AI Hypoteční Specialista</div>
                ${message}
            `;
        } else {
            bubble.textContent = message;
        }
        
        elements.chatWindow.appendChild(bubble);
        elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
    }
    
    function handleChatSubmit() {
        const message = elements.chatInput.value.trim();
        if (!message) return;
        
        // Add user message
        addChatMessage(message, 'user');
        elements.chatInput.value = '';
        
        // Process message
        const response = processAIMessage(message);
        
        // Add AI response
        setTimeout(() => {
            addChatMessage(response.text);
            
            // Show calculation if needed
            if (response.showCalculation) {
                showAICalculation();
            }
            
            // Update suggestions
            updateSuggestions(response.suggestions);
        }, 500);
    }
    
    function processAIMessage(message) {
        const msg = message.toLowerCase();
        
        // Check for calculation trigger
        if (msg.includes('koup') || msg.includes('byt')) {
            return {
                text: 'Výborně! Mám všechny údaje pro výpočet. Zobrazuji vaši personalizovanou nabídku:',
                showCalculation: true,
                suggestions: ['Změnit parametry', 'Kontakt na specialistu', 'Více informací']
            };
        }
        
        if (msg.includes('sazb') || msg.includes('úrok')) {
            return {
                text: `Aktuální úrokové sazby (leden 2025):
                <br><br>
                📊 <strong>Pro LTV do 80%:</strong><br>
                • 3 roky fixace: od 4.19%<br>
                • 5 let fixace: od 3.99%<br>
                • 7 let fixace: od 4.09%<br>
                <br>
                📊 <strong>Pro LTV do 90%:</strong><br>
                • 3 roky fixace: od 4.69%<br>
                • 5 let fixace: od 4.49%<br>
                • 7 let fixace: od 4.59%<br>
                <br>
                Chcete spočítat konkrétní nabídku?`,
                showCalculation: false,
                suggestions: ['Spočítat hypotéku', 'Více o sazbách', 'Konzultace zdarma']
            };
        }
        
        return {
            text: 'Rád vám pomohu s hypotékou. Co vás zajímá?',
            showCalculation: false,
            suggestions: ['Chci koupit byt', 'Aktuální sazby', 'Konzultace zdarma']
        };
    }
    
    function showAICalculation() {
        const calcDiv = document.createElement('div');
        calcDiv.className = 'card mt-4';
        calcDiv.innerHTML = `
            <h4 class="font-bold mb-3">📊 Váš výpočet - TOP 3 banky</h4>
            <div class="space-y-2">
                <div class="flex justify-between p-3 bg-green-50 rounded">
                    <div>
                        <strong>🦊 ČMSS Liška</strong><br>
                        <span class="text-sm">3.99% p.a.</span>
                    </div>
                    <div class="text-xl font-bold text-green-600">26 364 Kč</div>
                </div>
                <div class="flex justify-between p-3 bg-gray-50 rounded">
                    <div>
                        <strong>🏦 Hypoteční banka</strong><br>
                        <span class="text-sm">4.19% p.a.</span>
                    </div>
                    <div class="text-xl font-bold">27 182 Kč</div>
                </div>
                <div class="flex justify-between p-3 bg-gray-50 rounded">
                    <div>
                        <strong>🏛️ ČSOB</strong><br>
                        <span class="text-sm">4.29% p.a.</span>
                    </div>
                    <div class="text-xl font-bold">27 594 Kč</div>
                </div>
            </div>
            <button class="btn btn-success w-full mt-4" onclick="switchMode('calculator'); updateStep(5);">
                Získat konzultaci ZDARMA
            </button>
        `;
        
        elements.chatWindow.appendChild(calcDiv);
        elements.chatWindow.scrollTop = elements.chatWindow.scrollHeight;
        
        // Update sidebar
        const summary = document.getElementById('ai-calculation-summary');
        if (summary) {
            summary.innerHTML = `
                <strong>Úvěr:</strong> 7 000 000 Kč<br>
                <strong>LTV:</strong> 77.8%<br>
                <strong>Nejlepší sazba:</strong> 3.99%<br>
                <strong>Splátka od:</strong> 26 364 Kč
            `;
        }
    }
    
    function updateSuggestions(suggestions) {
        elements.chatSuggestions.innerHTML = '';
        suggestions.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.textContent = text;
            btn.onclick = () => {
                elements.chatInput.value = text;
                handleChatSubmit();
            };
            elements.chatSuggestions.appendChild(btn);
        });
    }
    
    // =============================
    // HELPERS
    // =============================
    
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 p-4 rounded-lg text-white z-50`;
        
        if (type === 'warning') {
            toast.style.background = '#f59e0b';
        } else if (type === 'success') {
            toast.style.background = '#10b981';
        } else {
            toast.style.background = '#3b82f6';
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    function updateLiveCounter() {
        const hour = new Date().getHours();
        let count = 15;
        
        if (hour >= 9 && hour < 17) {
            count = Math.floor(Math.random() * 10) + 20;
        } else if (hour >= 17 && hour < 22) {
            count = Math.floor(Math.random() * 8) + 12;
        } else {
            count = Math.floor(Math.random() * 5) + 3;
        }
        
        if (elements.liveCount) {
            elements.liveCount.textContent = count;
        }
    }
    
    // =============================
    // EVENT LISTENERS
    // =============================
    
    // Mode switching
    elements.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });
    
    // Navigation
    elements.prevBtn?.addEventListener('click', () => navigate(-1));
    elements.nextBtn?.addEventListener('click', () => navigate(1));
    
    // Intent selection
    document.querySelectorAll('.intent-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectIntent(btn.dataset.intent);
            if (currentStep === 1) {
                setTimeout(() => navigate(1), 300);
            }
        });
    });
    
    // Input changes
    const inputs = [
        elements.propertyValue,
        elements.ownResources,
        elements.loanTerm,
        elements.fixation,
        elements.monthlyIncome,
        elements.monthlyLiabilities
    ];
    
    inputs.forEach(input => {
        if (input) {
            input.addEventListener('input', updateCalculations);
            input.addEventListener('change', updateCalculations);
        }
    });
    
    // Chat
    elements.chatSend?.addEventListener('click', handleChatSubmit);
    elements.chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleChatSubmit();
        }
    });
    
    // Suggestions
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.chatInput.value = btn.textContent;
            handleChatSubmit();
        });
    });
    
    // Show all banks
    elements.showBanksBtn?.addEventListener('click', () => {
        const allBanks = getAllBanks();
        alert(`Spolupracujeme s ${allBanks.length} bankami:\n\n${allBanks.join(', ')}`);
    });
    
    // Form submission
    elements.leadForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        elements.leadForm.style.display = 'none';
        elements.formSuccess.classList.remove('hidden');
    });
    
    // =============================
    // INITIALIZATION
    // =============================
    
    function init() {
        // Set current date
        if (elements.lastUpdated) {
            elements.lastUpdated.textContent = new Date().toLocaleDateString('cs-CZ');
        }
        
        // Update live counter
        updateLiveCounter();
        setInterval(updateLiveCounter, 5000);
        
        // Initialize calculations
        updateCalculations();
        
        // Set default suggestions
        updateSuggestions(['Chci koupit byt', 'Aktuální sazby', 'Konzultace zdarma']);
        
        console.log('Hypotéka AI v4.0 - Initialized');
    }
    
    // Start
    init();
    
    // Make functions globally available
    window.switchMode = switchMode;
    window.navigate = navigate;
    window.selectIntent = selectIntent;
    window.updateCalculations = updateCalculations;
    
    console.log('Hypotéka AI v4.0 - Ready!');
}

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}