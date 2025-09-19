// script.js - Hlavní aplikační logika
// Hypotéka AI - Version 2.0
// Kompletní revize s modulární strukturou

'use strict';

// Import modulů (pro moderní prohlížeče)
// V produkci budou tyto moduly načteny jako <script> tagy

// ===== KONFIGURACE =====
const CONFIG = {
    VERSION: '2.0.0',
    DEBUG: location.hostname === 'localhost',
    API_ENDPOINT: '/.netlify/functions/gemini',
    ANIMATION_SPEED: 300,
    DEBOUNCE_DELAY: 500,
    CURRENCY: 'Kč',
    LOCALE: 'cs-CZ'
};

// ===== GLOBÁLNÍ STAV =====
const AppState = {
    currentStep: 1,
    maxSteps: 5,
    currentMode: 'calculator',
    selectedIntent: '',
    formData: {
        // Step 1 - Záměr
        intent: '',
        
        // Step 2 - Základní parametry
        propertyValue: 0,
        ownResources: 0,
        loanAmount: 0,
        loanTerm: 25,
        fixation: 5,
        
        // Step 3 - Finance
        monthlyIncome: 0,
        monthlyLiabilities: 0,
        
        // Vypočítané hodnoty
        ltv: 0,
        dsti: 0,
        monthlyPayment: 0,
        interestRate: 0
    },
    offers: [],
    selectedBank: null,
    isLoading: false
};

// ===== INICIALIZACE =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏡 Hypotéka AI v' + CONFIG.VERSION + ' - Inicializace...');
    
    try {
        initializeApp();
        setupEventListeners();
        setupValidation();
        initializeAnimations();
        
        // Import modulů
        if (typeof initChat !== 'undefined') {
            initChat();
        }
        
        console.log('✅ Aplikace úspěšně načtena');
    } catch (error) {
        console.error('❌ Chyba při inicializaci:', error);
        showError('Aplikace se nepodařilo načíst. Zkuste obnovit stránku.');
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
    updateLastUpdatedDate();
    
    // Spustit live counter
    startLiveCounter();
}

function setupEventListeners() {
    // Intent buttons (Step 1)
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
    
    // Timeline
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
    const inputs = [
        'propertyValue', 'ownResources', 
        'monthlyIncome', 'monthlyLiabilities',
        'loanTerm', 'fixation'
    ];
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const debouncedCalculate = debounce(calculateQuickResults, CONFIG.DEBOUNCE_DELAY);
            element.addEventListener('input', debouncedCalculate);
            element.addEventListener('change', debouncedCalculate);
        }
    });
    
    // Lead form
    const leadForm = document.getElementById('lead-form');
    if (leadForm) {
        leadForm.addEventListener('submit', handleFormSubmit);
    }
}

// ===== NAVIGACE =====
function selectIntent(intent) {
    // Update state
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
        updateFormVisibility();
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
    
    // Analytics
    if (CONFIG.DEBUG) {
        console.log('📍 Navigace na krok:', step);
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
        
        // Animate
        animateElement(currentSection, 'fadeIn');
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
                circle.classList.remove('bg-green-500', 'bg-white');
            }
        } else if (stepNum < step) {
            stepEl.classList.add('completed');
            if (circle) {
                circle.classList.add('bg-green-500', 'text-white', 'border-green-500');
                circle.classList.remove('bg-blue-500', 'bg-white');
            }
        } else {
            if (circle) {
                circle.classList.add('bg-white');
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
            nextBtn.textContent = AppState.currentStep === 4 ? 'Dokončit' : 'Další';
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
    if (mode === 'ai' && typeof initChat !== 'undefined') {
        initChat();
    }
}

// ===== KALKULACE =====
function calculateQuickResults() {
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
    
    // Calculate loan amount and LTV
    if (propertyValue > 0) {
        const loanAmount = Math.max(0, propertyValue - ownResources);
        const ltv = propertyValue > 0 ? (loanAmount / propertyValue * 100) : 0;
        
        AppState.formData.loanAmount = loanAmount;
        AppState.formData.ltv = ltv;
        
        // Get interest rate
        const rate = getBaseInterestRate(ltv, fixation);
        AppState.formData.interestRate = rate;
        
        // Calculate monthly payment
        const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, loanTerm);
        AppState.formData.monthlyPayment = monthlyPayment;
        
        // Update displays
        updateDisplay('monthly-payment-display', formatCurrency(monthlyPayment) + ' ' + CONFIG.CURRENCY);
        updateDisplay('ltv-display', ltv.toFixed(0) + '%');
        updateDisplay('loan-amount-display', formatCurrency(loanAmount) + ' ' + CONFIG.CURRENCY);
        
        // DSTI calculation
        if (monthlyIncome > 0) {
            const totalLiabilities = monthlyPayment + monthlyLiabilities;
            const dsti = (totalLiabilities / monthlyIncome * 100);
            AppState.formData.dsti = dsti;
            
            updateDisplay('dsti-display', dsti.toFixed(0) + '%');
            updateDSTIIndicator(dsti);
        }
    }
    
    // Save data
    saveData();
}

function getBaseInterestRate(ltv, fixation) {
    // Base rates by fixation period
    const baseRates = {
        1: 5.29,
        3: 4.59,
        5: 4.39,
        7: 4.49,
        10: 4.69
    };
    
    let rate = baseRates[fixation] || 4.5;
    
    // LTV adjustments
    if (ltv > 90) {
        rate += 0.5;
    } else if (ltv > 80) {
        rate += 0.2;
    } else if (ltv < 70) {
        rate -= 0.1;
    }
    
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

function updateDSTIIndicator(dsti) {
    const dstiResult = document.getElementById('dsti-result');
    const dstiTip = document.getElementById('dsti-tip');
    
    if (dstiResult) {
        dstiResult.classList.remove('hidden');
    }
    
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
            dstiTip.textContent = 'Vysoké DSTI! Snižte úvěr nebo zvyšte příjem.';
            dstiTip.className = 'text-sm mt-2 text-red-600';
        }
    }
}

// ===== VALIDACE =====
function setupValidation() {
    // Add validation to required fields
    const requiredFields = [
        'propertyValue',
        'monthlyIncome',
        'name',
        'email',
        'phone'
    ];
    
    requiredFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener('blur', function() {
                validateField(this);
            });
        }
    });
}

function validateStep(step) {
    switch(step) {
        case 1:
            if (!AppState.selectedIntent) {
                showAlert('Prosím vyberte, co plánujete', 'warning');
                return false;
            }
            break;
            
        case 2:
            if (!AppState.formData.propertyValue || AppState.formData.propertyValue <= 0) {
                showAlert('Prosím vyplňte cenu nemovitosti', 'warning');
                return false;
            }
            break;
            
        case 3:
            if (!AppState.formData.monthlyIncome || AppState.formData.monthlyIncome <= 0) {
                showAlert('Prosím vyplňte váš měsíční příjem', 'warning');
                return false;
            }
            break;
    }
    
    return true;
}

function validateField(field) {
    const value = field.value.trim();
    const isValid = value !== '';
    
    field.classList.toggle('border-red-500', !isValid);
    field.classList.toggle('border-gray-300', isValid);
    
    return isValid;
}

// ===== FORM HANDLING =====
function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Validate all fields
    let isValid = true;
    form.querySelectorAll('input[required]').forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    if (!isValid) {
        showAlert('Prosím vyplňte všechna povinná pole', 'error');
        return;
    }
    
    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Odesílám...';
    }
    
    // Simulate form submission
    setTimeout(() => {
        form.classList.add('hidden');
        const success = document.getElementById('form-success');
        if (success) {
            success.classList.remove('hidden');
            animateElement(success, 'fadeIn');
        }
    }, 1500);
}

function updateFormVisibility() {
    const intent = AppState.selectedIntent;
    
    // Hide all intent-specific inputs
    ['purchase-inputs', 'construction-inputs', 'refinancing-inputs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // Show relevant inputs
    if (intent === 'koupě' || intent === 'investice') {
        document.getElementById('purchase-inputs')?.classList.remove('hidden');
    } else if (intent === 'výstavba' || intent === 'rekonstrukce') {
        document.getElementById('construction-inputs')?.classList.remove('hidden');
    } else if (intent === 'refinancování') {
        document.getElementById('refinancing-inputs')?.classList.remove('hidden');
    }
}

// ===== HELPER FUNKCE =====
function parseAmount(value) {
    if (!value) return 0;
    
    value = value.toString().toLowerCase();
    
    // Handle percentage (for own resources)
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
    return Math.round(amount).toLocaleString(CONFIG.LOCALE);
}

function updateDisplay(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
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

// ===== NOTIFIKACE =====
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 animate-slideIn ${
        type === 'warning' ? 'bg-yellow-500' : 
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-green-500' :
        'bg-blue-500'
    } text-white`;
    alert.textContent = message;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.add('animate-fadeOut');
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

function showError(message) {
    showAlert(message, 'error');
}

// ===== ANIMACE =====
function initializeAnimations() {
    // Add animation classes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease; }
        .animate-fadeOut { animation: fadeOut 0.3s ease; }
        .animate-slideIn { animation: slideIn 0.3s ease; }
    `;
    document.head.appendChild(style);
}

function animateElement(element, animation) {
    if (!element) return;
    element.classList.add(`animate-${animation}`);
    setTimeout(() => {
        element.classList.remove(`animate-${animation}`);
    }, CONFIG.ANIMATION_SPEED);
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

// ===== UTILITY FUNKCE =====
function updateLastUpdatedDate() {
    const element = document.getElementById('last-updated');
    if (element) {
        element.textContent = new Date().toLocaleDateString(CONFIG.LOCALE);
    }
}

function startLiveCounter() {
    const counter = document.getElementById('live-users-counter');
    if (!counter) return;
    
    const updateCounter = () => {
        const count = 15 + Math.floor(Math.random() * 8);
        counter.innerHTML = `${count} lidí právě počítá hypotéku`;
    };
    
    updateCounter();
    setInterval(updateCounter, 5000);
}

// ===== EXPORT PRO MODULY =====
window.HypotekaAI = {
    state: AppState,
    config: CONFIG,
    calculateQuickResults,
    showAlert,
    formatCurrency,
    parseAmount
};