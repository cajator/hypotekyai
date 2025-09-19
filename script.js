// Hypotéka AI - Main JavaScript
// Version 2.0

'use strict';

// Globální proměnné
let currentStep = 1;
let selectedIntent = '';
let calculationData = {};
let currentMode = 'calculator';

// Inicializace při načtení
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏡 Hypotéka AI - Inicializace...');
    
    initializeApp();
    setupEventListeners();
    updateLiveCounter();
    loadLastCalculations();
    
    console.log('✅ Aplikace připravena');
});

// Hlavní inicializace
function initializeApp() {
    // Nastavení výchozích hodnot
    currentStep = 1;
    currentMode = 'calculator';
    
    // Zobrazit první sekci
    showStep(1);
    
    // Nastavit aktivní mód
    updateMode('calculator');
    
    // Aktualizovat datum
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
        const date = new Date();
        lastUpdated.textContent = date.toLocaleDateString('cs-CZ');
    }
}

// Event listeners
function setupEventListeners() {
    // Intent tlačítka
    document.querySelectorAll('.intent-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectIntent(this);
        });
    });
    
    // Mode switcher
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const mode = this.dataset.mode;
            switchMode(mode);
        });
    });
    
    // Timeline steps
    document.querySelectorAll('.timeline-step').forEach(step => {
        step.addEventListener('click', function() {
            const stepNum = parseInt(this.id.replace('step-', ''));
            if (stepNum <= currentStep) {
                goToStep(stepNum);
            }
        });
    });
    
    // Navigační tlačítka
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => navigateStep(-1));
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => navigateStep(1));
    }
    
    // Input fieldy
    setupInputListeners();
    
    // Chat
    setupChatListeners();
    
    // Formulář
    setupFormListener();
}

// Intent selection
function selectIntent(btn) {
    // Odstranit předchozí výběr
    document.querySelectorAll('.intent-btn').forEach(b => {
        b.classList.remove('selected', 'border-blue-500', 'bg-blue-50');
    });
    
    // Přidat nový výběr
    btn.classList.add('selected', 'border-blue-500', 'bg-blue-50');
    
    // Uložit výběr
    selectedIntent = btn.dataset.intent;
    
    // Přejít na další krok
    setTimeout(() => {
        navigateStep(1);
        updateIntentInputs();
    }, 300);
}

// Update inputs based on intent
function updateIntentInputs() {
    const purchaseInputs = document.getElementById('purchase-inputs');
    const constructionInputs = document.getElementById('construction-inputs');
    const refinancingInputs = document.getElementById('refinancing-inputs');
    
    // Skrýt všechny
    [purchaseInputs, constructionInputs, refinancingInputs].forEach(el => {
        if (el) el.classList.add('hidden');
    });
    
    // Zobrazit relevantní
    if (selectedIntent === 'koupě' || selectedIntent === 'investice') {
        if (purchaseInputs) purchaseInputs.classList.remove('hidden');
    } else if (selectedIntent === 'výstavba' || selectedIntent === 'rekonstrukce') {
        if (constructionInputs) constructionInputs.classList.remove('hidden');
    } else if (selectedIntent === 'refinancování') {
        if (refinancingInputs) refinancingInputs.classList.remove('hidden');
    }
}

// Mode switching
function switchMode(mode) {
    currentMode = mode;
    updateMode(mode);
}

function updateMode(mode) {
    // Update buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('border-white', 'text-white');
            btn.classList.remove('border-transparent', 'text-blue-100');
        } else {
            btn.classList.remove('border-white', 'text-white');
            btn.classList.add('border-transparent', 'text-blue-100');
        }
    });
    
    // Update content
    const calculatorMode = document.getElementById('calculator-mode');
    const aiMode = document.getElementById('ai-mode');
    
    if (mode === 'calculator') {
        if (calculatorMode) calculatorMode.classList.remove('hidden');
        if (aiMode) aiMode.classList.add('hidden');
    } else {
        if (calculatorMode) calculatorMode.classList.add('hidden');
        if (aiMode) aiMode.classList.remove('hidden');
        initializeChat();
    }
}

// Step navigation
function navigateStep(direction) {
    const newStep = currentStep + direction;
    
    if (newStep >= 1 && newStep <= 5) {
        if (direction > 0 && !validateCurrentStep()) {
            return;
        }
        goToStep(newStep);
    }
}

function goToStep(step) {
    currentStep = step;
    showStep(step);
    updateTimeline(step);
    updateNavigationButtons();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showStep(step) {
    // Skrýt všechny sekce
    document.querySelectorAll('.form-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Zobrazit aktuální sekci
    const activeSection = document.getElementById(`section-${step}`);
    if (activeSection) {
        activeSection.classList.add('active');
    }
}

function updateTimeline(step) {
    // Update timeline steps
    document.querySelectorAll('.timeline-step').forEach((stepEl, index) => {
        const stepNum = index + 1;
        
        stepEl.classList.remove('active', 'completed');
        
        if (stepNum === step) {
            stepEl.classList.add('active');
        } else if (stepNum < step) {
            stepEl.classList.add('completed');
        }
        
        // Update step circle
        const circle = stepEl.querySelector('.step-circle');
        if (circle) {
            if (stepNum === step) {
                circle.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
                circle.classList.remove('bg-green-500', 'border-green-500', 'bg-white');
            } else if (stepNum < step) {
                circle.classList.add('bg-green-500', 'text-white', 'border-green-500');
                circle.classList.remove('bg-blue-500', 'border-blue-500', 'bg-white');
            } else {
                circle.classList.add('bg-white');
                circle.classList.remove('bg-blue-500', 'bg-green-500', 'text-white');
            }
        }
    });
    
    // Update progress bar
    const progress = document.getElementById('timeline-progress');
    if (progress) {
        const percentage = ((step - 1) / 4) * 100;
        progress.style.width = `${percentage}%`;
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        if (currentStep === 1) {
            prevBtn.classList.add('hidden');
        } else {
            prevBtn.classList.remove('hidden');
        }
    }
    
    if (nextBtn) {
        if (currentStep === 5) {
            nextBtn.classList.add('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            nextBtn.textContent = currentStep === 4 ? 'Dokončit' : 'Další';
        }
    }
}

// Validation
function validateCurrentStep() {
    if (currentStep === 1 && !selectedIntent) {
        showAlert('Prosím vyberte, co plánujete', 'warning');
        return false;
    }
    
    if (currentStep === 2) {
        const propertyValue = document.getElementById('propertyValue');
        if (!propertyValue || !propertyValue.value) {
            showAlert('Prosím vyplňte cenu nemovitosti', 'warning');
            return false;
        }
    }
    
    return true;
}

// Input listeners
function setupInputListeners() {
    const inputs = [
        'propertyValue', 'ownResources', 'loanTerm', 'fixation',
        'monthlyIncome', 'monthlyLiabilities', 'landPrice',
        'constructionBudget', 'constructionOwnResources',
        'refinanceLoanBalance', 'refinancePropertyValue'
    ];
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', function() {
                calculateQuickResults();
            });
            
            element.addEventListener('change', function() {
                calculateQuickResults();
            });
        }
    });
}

// Quick calculation
function calculateQuickResults() {
    const propertyValue = parseAmount(document.getElementById('propertyValue')?.value);
    const ownResources = parseAmount(document.getElementById('ownResources')?.value);
    const loanTerm = parseInt(document.getElementById('loanTerm')?.value) || 25;
    const fixation = parseInt(document.getElementById('fixation')?.value) || 5;
    const monthlyIncome = parseAmount(document.getElementById('monthlyIncome')?.value);
    const monthlyLiabilities = parseAmount(document.getElementById('monthlyLiabilities')?.value);
    
    if (propertyValue && ownResources !== null) {
        const loanAmount = Math.max(0, propertyValue - ownResources);
        const ltv = (loanAmount / propertyValue * 100).toFixed(0);
        const monthlyPayment = calculateMonthlyPayment(loanAmount, getInterestRate(ltv, fixation), loanTerm);
        
        // Update displays
        updateDisplay('monthly-payment-display', formatCurrency(monthlyPayment));
        updateDisplay('ltv-display', `${ltv}%`);
        updateDisplay('loan-amount-display', formatCurrency(loanAmount));
        
        // DSTI calculation
        if (monthlyIncome) {
            const totalLiabilities = monthlyPayment + (monthlyLiabilities || 0);
            const dsti = (totalLiabilities / monthlyIncome * 100).toFixed(0);
            
            updateDisplay('dsti-display', `${dsti}%`);
            
            const dstiResult = document.getElementById('dsti-result');
            if (dstiResult) {
                dstiResult.classList.remove('hidden');
                
                const dstiTip = document.getElementById('dsti-tip');
                if (dstiTip) {
                    if (dsti < 40) {
                        dstiTip.textContent = 'Výborná bonita! Banky vám rády půjčí.';
                        dstiTip.className = 'text-sm mt-2 text-green-600';
                    } else if (dsti < 45) {
                        dstiTip.textContent = 'Dobrá bonita. Splňujete podmínky většiny bank.';
                        dstiTip.className = 'text-sm mt-2 text-blue-600';
                    } else if (dsti < 50) {
                        dstiTip.textContent = 'Hraniční bonita. Některé banky mohou váhat.';
                        dstiTip.className = 'text-sm mt-2 text-yellow-600';
                    } else {
                        dstiTip.textContent = 'Vysoké DSTI. Doporučujeme snížit úvěr nebo zvýšit vlastní zdroje.';
                        dstiTip.className = 'text-sm mt-2 text-red-600';
                    }
                }
            }
        }
    }
}

// Calculate monthly payment
function calculateMonthlyPayment(principal, annualRate, years) {
    const monthlyRate = annualRate / 100 / 12;
    const n = years * 12;
    
    if (monthlyRate === 0) return principal / n;
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / 
           (Math.pow(1 + monthlyRate, n) - 1);
}

// Get interest rate
function getInterestRate(ltv, fixation) {
    const baseRates = {
        3: 4.29,
        5: 4.09,
        7: 4.19,
        10: 4.39
    };
    
    let rate = baseRates[fixation] || 4.29;
    
    // LTV adjustments
    if (ltv > 90) rate += 0.5;
    else if (ltv > 80) rate += 0.2;
    else if (ltv < 70) rate -= 0.1;
    
    return rate;
}

// Chat functionality
function setupChatListeners() {
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const suggestions = document.getElementById('chat-suggestions');
    
    if (chatSend) {
        chatSend.addEventListener('click', sendChatMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
    
    // Add suggestion buttons
    if (suggestions) {
        const suggestionTexts = [
            'Kolik si můžu půjčit?',
            'Jaké jsou aktuální sazby?',
            'Co je to DSTI?',
            'Kdy se vyplatí refinancování?'
        ];
        
        suggestionTexts.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'px-4 py-2 bg-white rounded-lg text-sm hover:bg-blue-50 transition';
            btn.textContent = text;
            btn.addEventListener('click', function() {
                const input = document.getElementById('chat-input');
                if (input) {
                    input.value = text;
                    sendChatMessage();
                }
            });
            suggestions.appendChild(btn);
        });
    }
}

function initializeChat() {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow && chatWindow.children.length === 1) {
        // Already has welcome message
    }
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input?.value.trim();
    
    if (!message) return;
    
    // Clear input
    input.value = '';
    
    // Add user message
    addChatMessage(message, 'user');
    
    // Simulate AI response
    setTimeout(() => {
        const response = getAIResponse(message);
        addChatMessage(response, 'ai');
    }, 1000);
}

function addChatMessage(message, sender) {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-bubble chat-bubble-${sender}`;
    
    if (sender === 'ai') {
        messageDiv.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    🤖
                </div>
                <strong class="text-gray-700">AI Hypoteční Poradce</strong>
            </div>
            ${message}
        `;
    } else {
        messageDiv.textContent = message;
    }
    
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function getAIResponse(message) {
    const msg = message.toLowerCase();
    
    if (msg.includes('kolik') && (msg.includes('půjč') || msg.includes('dost'))) {
        return 'Maximální výše hypotéky závisí na vašich příjmech a schopnosti splácet. Obecně banky půjčují až 9-násobek ročního příjmu, ale musíte splnit DSTI limit 50% (poměr všech splátek k příjmu). Vyplňte kalkulačku pro přesný výpočet.';
    }
    
    if (msg.includes('sazb') || msg.includes('úrok')) {
        return 'Aktuální úrokové sazby se pohybují mezi 4.09% - 5.49% v závislosti na fixaci. Nejnižší sazby jsou obvykle u 5leté fixace. Konkrétní sazba závisí na vaší bonitě, výši vlastních zdrojů (LTV) a vybrané bance.';
    }
    
    if (msg.includes('dsti')) {
        return 'DSTI (Debt Service to Income) je poměr všech vašich měsíčních splátek k čistému měsíčnímu příjmu. ČNB stanovila limit 50%, některé banky jsou přísnější. Čím nižší DSTI, tím lépe pro schválení hypotéky.';
    }
    
    if (msg.includes('refinanc')) {
        return 'Refinancování se vyplatí, pokud je rozdíl mezi vaší současnou a novou sazbou alespoň 0.5%. Ideální je refinancovat 3-6 měsíců před koncem fixace. Můžeme vám pomoci s výpočtem úspor.';
    }
    
    return 'Děkuji za váš dotaz. Pro přesnou odpověď prosím vyplňte naši kalkulačku nebo mi položte konkrétnější otázku. Rád vám pomohu s čímkoliv ohledně hypotéky.';
}

// Form submission
function setupFormListener() {
    const form = document.getElementById('lead-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simulate form submission
            const submitBtn = document.getElementById('submit-lead-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Odesílám...';
            }
            
            setTimeout(() => {
                const formSuccess = document.getElementById('form-success');
                if (formSuccess) {
                    form.classList.add('hidden');
                    formSuccess.classList.remove('hidden');
                }
            }, 1500);
        });
    }
}

// Helper functions
function parseAmount(value) {
    if (!value) return 0;
    
    // Handle percentage
    if (value.includes('%')) {
        const percentage = parseFloat(value.replace('%', ''));
        const propertyValue = parseAmount(document.getElementById('propertyValue')?.value);
        return propertyValue * (percentage / 100);
    }
    
    // Handle shortcuts (1m = 1000000, 500k = 500000)
    value = value.toString().toLowerCase();
    if (value.includes('m')) {
        return parseFloat(value.replace('m', '')) * 1000000;
    }
    if (value.includes('k')) {
        return parseFloat(value.replace('k', '')) * 1000;
    }
    
    // Remove non-numeric characters
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

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
        type === 'warning' ? 'bg-yellow-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-blue-500'
    } text-white`;
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    // Auto remove
    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

// Live counter
function updateLiveCounter() {
    const counter = document.getElementById('live-users-counter');
    if (counter) {
        setInterval(() => {
            const count = 15 + Math.floor(Math.random() * 8);
            counter.innerHTML = `${count} lidí právě počítá hypotéku`;
        }, 5000);
    }
}

// Load last calculations
function loadLastCalculations() {
    const container = document.getElementById('latest-calculations');
    if (container) {
        // Already populated in HTML
    }
}