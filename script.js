// script.js - Hypotéka AI - Hlavní aplikační logika
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
    
    try {
        initializeApp();
        setupEventListeners();
        loadCurrentRates();
        startLiveCounter();
        setupChatSuggestions();
        
        console.log('✅ Aplikace připravena');
    } catch (error) {
        console.error('❌ Chyba při inicializaci:', error);
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
    
    // Pre-fill demo data for testing
    if (!localStorage.getItem('hypotekaData')) {
        document.getElementById('propertyValue').value = '5000000';
        document.getElementById('ownResources').value = '1000000';
        document.getElementById('monthlyIncome').value = '60000';
        calculateAndFetchRates();
    }
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
    if (step === 4) {
        // Always recalculate when entering step 4
        calculateAndFetchRates().then(() => {
            if (AppState.offers && AppState.offers.length > 0) {
                displayOffers(AppState.offers);
            } else {
                // If no offers from API, create mock offers for demo
                createMockOffers();
            }
        });
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
        
        if (btn.dataset.mode === 'calculator') {
            btn.classList.toggle('border-blue-500', isActive);
            btn.classList.toggle('text-blue-600', isActive);
            btn.classList.toggle('border-transparent', !isActive);
            btn.classList.toggle('text-gray-500', !isActive);
        } else {
            btn.classList.toggle('border-green-500', isActive);
            btn.classList.toggle('text-green-600', isActive);
            btn.classList.toggle('border-transparent', !isActive);
            btn.classList.toggle('text-gray-500', !isActive);
        }
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
            
            if (data.offers && data.offers.length > 0) {
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
            } else {
                // No offers from API, use mock data
                createMockOffers();
            }
        } catch (error) {
            console.error('Chyba při výpočtu:', error);
            // Fallback na lokální výpočet
            createMockOffers();
        }
    }
    
    // Save data
    saveData();
}

// Create mock offers when API fails
function createMockOffers() {
    const loanAmount = AppState.formData.loanAmount;
    const loanTerm = AppState.formData.loanTerm;
    const ltv = AppState.formData.ltv;
    const monthlyIncome = AppState.formData.monthlyIncome;
    
    // Calculate base rate based on LTV
    let baseRate = 4.39;
    if (ltv > 90) baseRate = 4.89;
    else if (ltv > 80) baseRate = 4.59;
    else if (ltv < 70) baseRate = 4.19;
    
    // Create mock offers
    const mockOffers = [
        {
            bankId: 'hypotecni-banka',
            bankName: 'Hypoteční banka',
            bankLogo: '🏠',
            rate: baseRate - 0.2,
            monthlyPayment: calculateMonthlyPayment(loanAmount, baseRate - 0.2, loanTerm),
            totalPaid: calculateMonthlyPayment(loanAmount, baseRate - 0.2, loanTerm) * loanTerm * 12,
            totalInterest: (calculateMonthlyPayment(loanAmount, baseRate - 0.2, loanTerm) * loanTerm * 12) - loanAmount,
            ltv: ltv.toFixed(1),
            dsti: monthlyIncome ? ((calculateMonthlyPayment(loanAmount, baseRate - 0.2, loanTerm) / monthlyIncome) * 100).toFixed(1) : null,
            bestFor: 'Nejnižší sazba'
        },
        {
            bankId: 'ceska-sporitelna',
            bankName: 'Česká spořitelna',
            bankLogo: '🏦',
            rate: baseRate,
            monthlyPayment: calculateMonthlyPayment(loanAmount, baseRate, loanTerm),
            totalPaid: calculateMonthlyPayment(loanAmount, baseRate, loanTerm) * loanTerm * 12,
            totalInterest: (calculateMonthlyPayment(loanAmount, baseRate, loanTerm) * loanTerm * 12) - loanAmount,
            ltv: ltv.toFixed(1),
            dsti: monthlyIncome ? ((calculateMonthlyPayment(loanAmount, baseRate, loanTerm) / monthlyIncome) * 100).toFixed(1) : null,
            bestFor: 'Rychlé vyřízení'
        },
        {
            bankId: 'csob',
            bankName: 'ČSOB',
            bankLogo: '🏛️',
            rate: baseRate + 0.1,
            monthlyPayment: calculateMonthlyPayment(loanAmount, baseRate + 0.1, loanTerm),
            totalPaid: calculateMonthlyPayment(loanAmount, baseRate + 0.1, loanTerm) * loanTerm * 12,
            totalInterest: (calculateMonthlyPayment(loanAmount, baseRate + 0.1, loanTerm) * loanTerm * 12) - loanAmount,
            ltv: ltv.toFixed(1),
            dsti: monthlyIncome ? ((calculateMonthlyPayment(loanAmount, baseRate + 0.1, loanTerm) / monthlyIncome) * 100).toFixed(1) : null,
            bestFor: '100% financování'
        }
    ];
    
    AppState.offers = mockOffers;
    
    // Update display with best offer
    const bestOffer = mockOffers[0];
    AppState.formData.monthlyPayment = bestOffer.monthlyPayment;
    updateDisplay('monthly-payment-display', formatCurrency(bestOffer.monthlyPayment) + ' Kč');
    
    if (bestOffer.dsti && monthlyIncome) {
        AppState.formData.dsti = parseFloat(bestOffer.dsti);
        updateDisplay('dsti-display', bestOffer.dsti + '%');
        updateDSTIIndicator(parseFloat(bestOffer.dsti));
    }
    
    // Display offers if on step 4
    if (AppState.currentStep === 4) {
        displayOffers(mockOffers);
        createChart(loanAmount, loanTerm, bestOffer.rate);
    }
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
    if (!container) {
        console.error('Container bank-offers not found');
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // If no offers, show message
    if (!offers || offers.length === 0) {
        container.innerHTML = '<div class="col-span-3 text-center text-gray-600 py-8">Žádné nabídky k zobrazení. Vyplňte prosím všechny údaje.</div>';
        return;
    }
    
    // Display top 3 offers
    offers.slice(0, 3).forEach((offer, index) => {
        const card = document.createElement('div');
        card.className = 'p-6 bg-white rounded-xl text-center transition-all hover:shadow-xl border-2';
        
        if (index === 0) {
            card.className += ' border-green-500 shadow-lg transform scale-105';
        } else {
            card.className += ' border-gray-200';
        }
        
        card.innerHTML = `
            <div class="text-4xl mb-3">${offer.bankLogo || '🏦'}</div>
            <h3 class="text-xl font-bold text-gray-800 mb-3">${offer.bankName}</h3>
            <div class="mb-4">
                <p class="text-3xl font-bold text-blue-600">${offer.rate.toFixed(2)}%</p>
                <p class="text-sm text-gray-600">úroková sazba</p>
            </div>
            <div class="mb-4">
                <p class="text-2xl font-bold text-gray-800">${formatCurrency(offer.monthlyPayment)} Kč</p>
                <p class="text-sm text-gray-600">měsíční splátka</p>
            </div>
            <div class="border-t pt-4 mb-4">
                <div class="text-sm text-gray-600">
                    <p>Celkem zaplatíte: <span class="font-semibold">${formatCurrency(offer.totalPaid)} Kč</span></p>
                    <p>Přeplatek: <span class="font-semibold">${formatCurrency(offer.totalInterest)} Kč</span></p>
                </div>
            </div>
            ${offer.bestFor ? `<p class="text-sm text-blue-600 italic mb-3">${offer.bestFor}</p>` : ''}
            ${index === 0 ? '<div class="mb-3"><span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">✓ DOPORUČUJEME</span></div>' : ''}
            <button onclick="selectBank('${offer.bankId}')" class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold">
                Vybrat tuto banku
            </button>
        `;
        
        container.appendChild(card);
    });
    
    // Update summary section
    const bestOffer = offers[0];
    if (bestOffer) {
        updateDisplay('summary-loan', formatCurrency(AppState.formData.loanAmount) + ' Kč');
        updateDisplay('summary-payment', formatCurrency(bestOffer.monthlyPayment) + ' Kč');
        updateDisplay('summary-interest', formatCurrency(bestOffer.totalInterest) + ' Kč');
    }
    
    // Create chart after displaying offers
    if (offers[0]) {
        const loanAmount = AppState.formData.loanAmount;
        const loanTerm = AppState.formData.loanTerm;
        const rate = offers[0].rate;
        
        setTimeout(() => {
            createChart(loanAmount, loanTerm, rate);
        }, 100);
    }
}

function createChart(loanAmount, loanTerm, interestRate) {
    const canvas = document.getElementById('loanChart');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (window.loanChart && typeof window.loanChart.destroy === 'function') {
        window.loanChart.destroy();
    }
    
    // Calculate data
    const labels = [];
    const principalData = [];
    const interestData = [];
    const remainingData = [];
    
    const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, loanTerm);
    let balance = loanAmount;
    const monthlyRate = interestRate / 100 / 12;
    
    // Calculate year by year
    for (let year = 0; year <= Math.min(loanTerm, 30); year++) {
        labels.push(year === 0 ? 'Start' : `${year}. rok`);
        remainingData.push(Math.round(balance));
        
        if (year > 0) {
            let yearlyPrincipal = 0;
            let yearlyInterest = 0;
            
            for (let month = 1; month <= 12; month++) {
                if (balance > 0) {
                    const interestPayment = balance * monthlyRate;
                    const principalPayment = Math.min(monthlyPayment - interestPayment, balance);
                    
                    yearlyInterest += interestPayment;
                    yearlyPrincipal += principalPayment;
                    balance -= principalPayment;
                }
            }
            
            principalData.push(Math.round(yearlyPrincipal));
            interestData.push(Math.round(yearlyInterest));
        } else {
            principalData.push(0);
            interestData.push(0);
        }
    }
    
    // Create chart
    try {
        window.loanChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Zůstatek úvěru',
                        data: remainingData,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Roční jistina',
                        data: principalData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        hidden: true
                    },
                    {
                        label: 'Roční úroky',
                        data: interestData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        hidden: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#1e293b',
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = formatCurrency(context.raw) + ' Kč';
                                return label + ': ' + value;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#64748b',
                            callback: function(value) {
                                if (value >= 1000000) {
                                    return (value / 1000000).toFixed(1) + ' mil. Kč';
                                } else if (value >= 1000) {
                                    return (value / 1000).toFixed(0) + ' tis. Kč';
                                }
                                return value + ' Kč';
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#64748b'
                        }
                    }
                }
            }
        });
        
        console.log('Chart created successfully');
    } catch (error) {
        console.error('Error creating chart:', error);
    }
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
        btn.className = 'px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition text-sm';
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
            : 'bg-gray-100 text-gray-800 mr-auto max-w-md border border-gray-200'
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
    indicator.className = 'bg-gray-100 p-3 rounded-lg max-w-xs mr-auto mb-4 border border-gray-200';
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
                document.getElementById('propertyValue')?.focus();
                return false;
            }
            if (AppState.formData.loanAmount <= 0) {
                showAlert('Výše úvěru musí být větší než 0. Zkontrolujte vlastní zdroje.');
                document.getElementById('ownResources')?.focus();
                return false;
            }
            break;
            
        case 3:
            if (!AppState.formData.monthlyIncome || AppState.formData.monthlyIncome <= 0) {
                showAlert('Prosím vyplňte váš měsíční příjem');
                document.getElementById('monthlyIncome')?.focus();
                return false;
            }
            // Check DSTI
            if (AppState.formData.dsti > 50) {
                if (!confirm('Vaše DSTI překračuje limit 50%. Chcete přesto pokračovat?')) {
                    return false;
                }
            }
            break;
            
        case 4:
            // Ensure we have all necessary data
            if (!AppState.formData.loanAmount || !AppState.formData.propertyValue || !AppState.formData.monthlyIncome) {
                showAlert('Prosím vyplňte všechny údaje v předchozích krocích');
                goToStep(2); // Go back to step 2
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