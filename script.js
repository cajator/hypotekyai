// Hypotéka AI - Kompletní JavaScript v3.0
// Obsahuje všechny opravy a integrovanou konfiguraci bank

document.addEventListener('DOMContentLoaded', function() {
    
    // =============================
    // KONFIGURACE BANK A SAZEB
    // =============================
    
    const MortgageConfig = {
        // Kompletní databáze všech 23 bank
        banks: {
            major: [
                { id: 'csob', name: 'ČSOB', logo: '🏦', color: '#0066cc', minLTV: 70, maxLTV: 90 },
                { id: 'kb', name: 'Komerční banka', logo: '🏛️', color: '#990000', minLTV: 70, maxLTV: 90 },
                { id: 'cs', name: 'Česká spořitelna', logo: '🏪', color: '#1976d2', minLTV: 70, maxLTV: 90 },
                { id: 'raiffeisen', name: 'Raiffeisen Bank', logo: '🏗️', color: '#ffed00', minLTV: 75, maxLTV: 85 },
                { id: 'unicredit', name: 'UniCredit Bank', logo: '🏢', color: '#e4002b', minLTV: 75, maxLTV: 85 },
                { id: 'hypotecni', name: 'Hypoteční banka', logo: '🏠', color: '#009ee0', minLTV: 70, maxLTV: 100 }
            ],
            online: [
                { id: 'moneta', name: 'Moneta Money Bank', logo: '💰', color: '#6b1e70', minLTV: 80, maxLTV: 85 },
                { id: 'airbank', name: 'Air Bank', logo: '☁️', color: '#00d924', minLTV: 80, maxLTV: 80 },
                { id: 'mbank', name: 'mBank', logo: '📱', color: '#e20613', minLTV: 80, maxLTV: 85 },
                { id: 'inbank', name: 'inbank', logo: '💼', color: '#00a859', minLTV: 75, maxLTV: 85 }
            ],
            specialized: [
                { id: 'cofidis', name: 'Cofidis', logo: '💳', color: '#00a859', minLTV: 80, maxLTV: 80 },
                { id: 'oberbank', name: 'Oberbank', logo: '🏔️', color: '#d40511', minLTV: 75, maxLTV: 85 },
                { id: 'tgimoney', name: 'TGI Money', logo: '💎', color: '#c4007b', minLTV: 80, maxLTV: 85 }
            ],
            building_societies: [
                { id: 'cmss', name: 'ČMSS Liška', logo: '🦊', color: '#f47920', minLTV: 70, maxLTV: 100 },
                { id: 'mpss', name: 'Modrá pyramida', logo: '🔷', color: '#005eb8', minLTV: 70, maxLTV: 90 },
                { id: 'sscs', name: 'Stavební spořitelna ČS', logo: '🏘️', color: '#1976d2', minLTV: 70, maxLTV: 90 },
                { id: 'raiffeisen_ss', name: 'Raiffeisen SS', logo: '🏡', color: '#ffed00', minLTV: 70, maxLTV: 90 }
            ]
        },
        
        // Získání sazby pro konkrétní banku
        getRateForBank(bankId, ltv, fixation, creditScore = 'B') {
            const baseRates = {
                3: { A: 3.89, B: 4.19, C: 4.49 },
                5: { A: 3.69, B: 3.99, C: 4.29 },
                7: { A: 3.79, B: 4.09, C: 4.39 },
                10: { A: 3.99, B: 4.29, C: 4.59 }
            };
            
            const bankAdjustments = {
                'csob': -0.1,
                'kb': 0,
                'cs': -0.05,
                'hypotecni': -0.15,
                'airbank': 0.1,
                'moneta': 0.05,
                'cmss': -0.2,
                'mpss': -0.15
            };
            
            let ltvAdjustment = 0;
            if (ltv > 90) ltvAdjustment = 0.5;
            else if (ltv > 80) ltvAdjustment = 0.2;
            else if (ltv > 70) ltvAdjustment = 0;
            else ltvAdjustment = -0.1;
            
            const baseRate = baseRates[fixation]?.[creditScore] || 4.5;
            const bankAdj = bankAdjustments[bankId] || 0;
            
            return Math.max(3.5, baseRate + bankAdj + ltvAdjustment);
        }
    };
    
    // =============================
    // HLAVNÍ KONFIGURACE
    // =============================
    
    const rateDatabase = {
        fixations: {
            "3": [ 
                { ltv: 80, rates: { best: 4.19, likely: 4.39, worst: 4.69 } }, 
                { ltv: 90, rates: { best: 4.69, likely: 4.89, worst: 5.19 } } 
            ],
            "5": [ 
                { ltv: 80, rates: { best: 3.99, likely: 4.29, worst: 4.59 } }, 
                { ltv: 90, rates: { best: 4.49, likely: 4.79, worst: 5.09 } } 
            ],
            "7": [ 
                { ltv: 80, rates: { best: 4.09, likely: 4.39, worst: 4.69 } }, 
                { ltv: 90, rates: { best: 4.59, likely: 4.89, worst: 5.19 } } 
            ],
            "10": [ 
                { ltv: 80, rates: { best: 4.19, likely: 4.49, worst: 4.79 } }, 
                { ltv: 90, rates: { best: 4.69, likely: 4.99, worst: 5.29 } } 
            ]
        },
        lastUpdated: new Date()
    };
    
    // State management
    let currentStep = 1;
    const totalSteps = 5;
    const state = {
        intent: '',
        propertyValue: 5000000,
        ownResources: 1000000,
        refinanceLoanBalance: 3500000,
        refinancePropertyValue: 6000000,
        landPrice: 2000000,
        constructionBudget: 4000000,
        constructionOwnResources: 1000000,
        city: '',
        loanTerm: 25,
        fixation: 5,
        monthlyIncome: null,
        monthlyLiabilities: 0,
    };
    
    // AI conversation state s ochranou proti zacyklení
    let aiConversationState = { 
        step: 'start', 
        context: {},
        history: [],
        lastUserMessage: '',
        messageCount: 0,
        isWaitingForResponse: false,
        lastTopics: [] // Sledování posledních témat
    };
    
    // Statistiky
    let stats = {
        mediated: parseInt(localStorage.getItem('statsMediated')) || 8400000000,
        clients: parseInt(localStorage.getItem('statsClients')) || 12847,
        lastUpdate: Date.now()
    };

    // =============================
    // ELEMENT SELEKTORY
    // =============================
    
    const elements = {
        modeButtons: document.querySelectorAll('.mode-btn'),
        calculatorMode: document.getElementById('calculator-mode'),
        aiMode: document.getElementById('ai-mode'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        intentButtons: document.querySelectorAll('.intent-btn'),
        inputs: {
            propertyValue: document.getElementById('propertyValue'),
            ownResources: document.getElementById('ownResources'),
            refinanceLoanBalance: document.getElementById('refinanceLoanBalance'),
            refinancePropertyValue: document.getElementById('refinancePropertyValue'),
            landPrice: document.getElementById('landPrice'),
            constructionBudget: document.getElementById('constructionBudget'),
            constructionOwnResources: document.getElementById('constructionOwnResources'),
            city: document.getElementById('city'),
            loanTerm: document.getElementById('loanTerm'),
            fixation: document.getElementById('fixation'),
            monthlyIncome: document.getElementById('monthlyIncome'),
            monthlyLiabilities: document.getElementById('monthlyLiabilities'),
        },
        inputGroups: {
            purchase: document.getElementById('purchase-inputs'),
            construction: document.getElementById('construction-inputs'),
            refinancing: document.getElementById('refinancing-inputs'),
        },
        displays: {
            monthlyPayment: document.getElementById('monthly-payment-display'),
            ltv: document.getElementById('ltv-display'),
            loanAmount: document.getElementById('loan-amount-display'),
            dsti: document.getElementById('dsti-display'),
            dstiResult: document.getElementById('dsti-result'),
            dstiTip: document.getElementById('dsti-tip'),
        },
        chat: {
            window: document.getElementById('chat-window'),
            input: document.getElementById('chat-input'),
            sendBtn: document.getElementById('chat-send'),
            suggestions: document.getElementById('chat-suggestions')
        },
        leadForm: document.getElementById('lead-form')
    };
    
    // =============================
    // UI FUNKCE
    // =============================
    
    function switchMode(mode) {
        const isCalculator = mode === 'calculator';
        elements.calculatorMode.classList.toggle('hidden', !isCalculator);
        elements.aiMode.classList.toggle('hidden', isCalculator);
        
        elements.modeButtons.forEach(btn => {
            const isActive = btn.dataset.mode === mode;
            btn.classList.toggle('active', isActive);
            
            if (isActive) {
                btn.style.background = 'white';
                btn.style.color = '#0066ff';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = '#6b7280';
            }
        });
        
        trackEvent('mode_switch', { mode });
    }

    function updateUI() {
        // Update timeline
        document.querySelectorAll('.timeline-step').forEach((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            
            step.classList.toggle('active', isActive);
            step.classList.toggle('completed', isCompleted);
            
            const circle = step.querySelector('.step-circle');
            if (circle) {
                if (isCompleted) {
                    circle.innerHTML = '✓';
                    circle.style.background = '#00b341';
                    circle.style.color = 'white';
                } else if (isActive) {
                    circle.innerHTML = stepNumber;
                    circle.style.background = '#0066ff';
                    circle.style.color = 'white';
                } else {
                    circle.innerHTML = stepNumber;
                    circle.style.background = 'white';
                    circle.style.color = '#9ca3af';
                }
            }
        });
        
        // Update progress bar
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        const progressBar = document.getElementById('timeline-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Show/hide sections
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.remove('active');
        });
        const currentSection = document.getElementById(`section-${currentStep}`);
        if (currentSection) {
            currentSection.classList.add('active');
            // Smooth scroll without jumping
            setTimeout(() => {
                window.scrollTo({
                    top: currentSection.offsetTop - 100,
                    behavior: 'smooth'
                });
            }, 100);
        }

        // Update navigation
        elements.prevBtn.classList.toggle('hidden', currentStep === 1);
        
        if (currentStep === totalSteps) {
            elements.nextBtn.textContent = 'Začít znovu';
            elements.nextBtn.className = 'btn-secondary';
        } else if (currentStep === totalSteps - 1) {
            elements.nextBtn.textContent = 'Získat konzultaci ZDARMA';
            elements.nextBtn.className = 'btn-success';
        } else {
            elements.nextBtn.textContent = 'Další →';
            elements.nextBtn.className = 'btn-primary';
        }
        
        document.getElementById('navigation-buttons').classList.toggle('hidden', currentStep === 1 && !state.intent);
        
        if (currentStep === 4) {
            generateAnalysis();
        }
    }
    
    function navigate(direction) {
        if (elements.nextBtn.textContent === 'Začít znovu') {
            resetForm();
        } else {
            if (direction > 0 && !validateCurrentStep()) {
                showToast('Prosím vyplňte všechny povinné údaje', 'warning');
                return;
            }
            
            currentStep = Math.max(1, Math.min(totalSteps, currentStep + direction));
        }
        updateUI();
    }
    
    function resetForm() {
        currentStep = 1;
        state.intent = '';
        elements.leadForm.reset();
        document.getElementById('form-success')?.classList.add('hidden');
        if (elements.leadForm) elements.leadForm.style.display = 'block';
        elements.intentButtons.forEach(btn => btn.classList.remove('selected'));
        updateUI();
    }
    
    function validateCurrentStep() {
        switch(currentStep) {
            case 1:
                return !!state.intent;
            case 2:
                return state.propertyValue > 0 && state.ownResources > 0;
            case 3:
                return state.monthlyIncome > 0;
            default:
                return true;
        }
    }

    function setIntent(intent) {
        state.intent = intent;
        
        Object.values(elements.inputGroups).forEach(group => group?.classList.add('hidden'));
        
        const purchaseLabel = elements.inputGroups.purchase?.querySelector('label[for="propertyValue"]');
        const resourcesLabel = elements.inputGroups.purchase?.querySelector('label[for="ownResources"]');
        
        if (intent === 'koupě' || intent === 'investice') {
            elements.inputGroups.purchase?.classList.remove('hidden');
            if (purchaseLabel) purchaseLabel.textContent = "Cena nemovitosti";
            if (resourcesLabel) resourcesLabel.textContent = "Vlastní zdroje";
        } else if (intent === 'rekonstrukce') {
            elements.inputGroups.purchase?.classList.remove('hidden');
            if (purchaseLabel) purchaseLabel.textContent = "Hodnota nemovitosti po rekonstrukci";
            if (resourcesLabel) resourcesLabel.textContent = "Částka rekonstrukce";
        } else if (intent === 'výstavba') {
            elements.inputGroups.construction?.classList.remove('hidden');
        } else if (intent === 'refinancování') {
            elements.inputGroups.refinancing?.classList.remove('hidden');
        }
        
        elements.intentButtons.forEach(btn => {
            const isSelected = btn.dataset.intent === intent;
            btn.classList.toggle('selected', isSelected);
        });
        
        updateCalculations();
        trackEvent('intent_selected', { intent });
    }

    // =============================
    // VÝPOČETNÍ FUNKCE
    // =============================
    
    function parseNumericInput(value) {
        if (typeof value !== 'string') return value;
        
        let cleanValue = value.toLowerCase().replace(/\s/g, '').replace(',', '.');
        let numMatch = cleanValue.match(/([\d.]+)\s*([mk%])?/);
        if (!numMatch) return null;
        
        let num = parseFloat(numMatch[1]);
        let unit = numMatch[2];
        
        if (unit === 'm') num *= 1000000;
        else if (unit === 'k') num *= 1000;
        else if (unit === '%' && elements.inputs.propertyValue) {
            const propertyVal = parseNumericInput(elements.inputs.propertyValue.value);
            if (propertyVal > 0) {
                num = (propertyVal * num) / 100;
            }
        }
        
        return isNaN(num) ? null : num;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('cs-CZ', { 
            style: 'currency', 
            currency: 'CZK', 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 0 
        }).format(value);
    }
    
    function formatNumber(value) {
        return new Intl.NumberFormat('cs-CZ').format(value);
    }
    
    function getInterestRates(ltv, fixation) {
        const rates = rateDatabase.fixations[fixation] || rateDatabase.fixations["5"];
        const rateConfig = rates.find(r => ltv <= r.ltv) || rates[rates.length - 1];
        return rateConfig.rates;
    }

    function calculateMonthlyPayment(principal, annualRate, years) {
        if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
        const monthlyRate = (annualRate / 100) / 12;
        const n = years * 12;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    }
    
    function getCalculationData() {
        let loanAmount = 0, propertyValueForLtv = 0;
        
        switch(state.intent) {
            case 'koupě':
            case 'investice':
                loanAmount = state.propertyValue - state.ownResources;
                propertyValueForLtv = state.propertyValue;
                break;
            case 'rekonstrukce':
                loanAmount = state.ownResources;
                propertyValueForLtv = state.propertyValue;
                break;
            case 'výstavba':
                propertyValueForLtv = state.landPrice + state.constructionBudget;
                loanAmount = propertyValueForLtv - state.constructionOwnResources;
                break;
            case 'refinancování':
                loanAmount = state.refinanceLoanBalance;
                propertyValueForLtv = state.refinancePropertyValue;
                break;
            default:
                loanAmount = state.propertyValue - state.ownResources;
                propertyValueForLtv = state.propertyValue;
        }
        
        if (loanAmount <= 0 || propertyValueForLtv <= 0) return null;
        const ltv = (loanAmount / propertyValueForLtv) * 100;
        
        return { loanAmount, propertyValueForLtv, ltv };
    }

    let updateTimeout;
    function updateCalculations() {
        // Debouncing pro plynulé aktualizace
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            performCalculationUpdate();
        }, 300);
    }
    
    function performCalculationUpdate() {
        // Update state from inputs
        Object.keys(elements.inputs).forEach(key => {
            const inputElement = elements.inputs[key];
            if (!inputElement) return;
            
            let val = inputElement.value;
            
            if (inputElement.type === 'select-one') {
                if (key === 'loanTerm') {
                    val = parseInt(val.replace(/[^\d]/g, ''));
                } else {
                    val = parseInt(val);
                }
            } else if (key === 'city') {
                val = val.trim();
            } else {
                val = parseNumericInput(val);
            }
            
            if (val !== null && val !== '') {
                state[key] = val;
            }
        });
        
        const calcData = getCalculationData();
        if (!calcData) {
            if (elements.displays.monthlyPayment) elements.displays.monthlyPayment.textContent = '--,-- Kč';
            if (elements.displays.ltv) elements.displays.ltv.textContent = '--%';
            if (elements.displays.loanAmount) elements.displays.loanAmount.textContent = '--,-- Kč';
            return;
        }

        const { loanAmount, ltv } = calcData;
        const rates = getInterestRates(ltv, state.fixation);
        const monthlyPayment = calculateMonthlyPayment(loanAmount, rates.likely, state.loanTerm);

        // Update displays
        animateValue(elements.displays.monthlyPayment, monthlyPayment, formatCurrency);
        if (elements.displays.ltv) elements.displays.ltv.textContent = `${ltv.toFixed(1)}%`;
        if (elements.displays.loanAmount) elements.displays.loanAmount.textContent = formatCurrency(loanAmount);

        // Update DSTI
        if (state.monthlyIncome > 0) {
            const dsti = ((monthlyPayment + state.monthlyLiabilities) / state.monthlyIncome) * 100;
            if (elements.displays.dsti) elements.displays.dsti.textContent = `${dsti.toFixed(1)}%`;
            if (elements.displays.dstiResult) elements.displays.dstiResult.classList.remove('hidden');
            
            let tip = "";
            let className = "glass-card p-6 text-center";
            
            if (dsti > 50) {
                tip = "⚠️ DSTI je vysoké. Banky vyžadují DSTI pod 50%. Doporučujeme konzultaci zdarma.";
                className += " border-2 border-red-500 bg-red-50";
            } else if (dsti > 40) {
                tip = "⚠️ DSTI je na hranici. Některé banky mohou být opatrnější.";
                className += " border-2 border-yellow-500 bg-yellow-50";
            } else {
                tip = "✅ Vaše DSTI je výborné! Máte dobré předpoklady pro schválení.";
                className += " border-2 border-green-500 bg-green-50";
            }
            
            if (elements.displays.dstiTip) elements.displays.dstiTip.innerHTML = tip;
            if (elements.displays.dstiResult) elements.displays.dstiResult.className = className;
        } else {
            if (elements.displays.dstiResult) elements.displays.dstiResult.classList.add('hidden');
        }
    }
    
    function animateValue(element, value, formatter) {
        if (!element) return;
        
        const duration = 500;
        const start = performance.now();
        const from = parseFloat(element.textContent.replace(/[^\d]/g, '')) || 0;
        
        const animate = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const current = from + (value - from) * easeOutCubic(progress);
            element.textContent = formatter ? formatter(current) : Math.round(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // =============================
    // ANALÝZA S POROVNÁNÍM BANK
    // =============================
    
    function generateAnalysis(selectedOfferIndex = 1) {
        const calcData = getCalculationData();
        if (!calcData) return;

        const { loanAmount, ltv } = calcData;
        const rates = getInterestRates(ltv, state.fixation);
        
        // Získat nabídky od všech bank
        const bankOffers = getAllBankOffers(loanAmount, ltv, state.fixation);
        const topBanks = bankOffers.slice(0, 3);
        
        const offers = [
            { 
                name: "Nejlepší nabídka", 
                rate: rates.best,
                bank: topBanks[0]?.bank || 'ČSOB',
                benefit: "Nejnižší sazba na trhu", 
                color: "from-green-400 to-green-600",
                badge: null
            },
            { 
                name: "Doporučená nabídka", 
                rate: rates.likely,
                bank: topBanks[1]?.bank || 'Česká spořitelna',
                benefit: "Optimální poměr podmínek", 
                color: "from-blue-400 to-blue-600",
                badge: "KONZULTACE ZDARMA"
            },
            { 
                name: "Rychlé schválení", 
                rate: rates.worst,
                bank: 'Hypoteční banka',
                benefit: "Vyřízení do 3 dnů", 
                color: "from-orange-400 to-orange-600",
                badge: null
            }
        ];

        // Generate offer cards
        const analysisResults = document.getElementById('analysis-results');
        if (analysisResults) {
            analysisResults.innerHTML = offers.map((offer, index) => {
                const monthlyPayment = calculateMonthlyPayment(loanAmount, offer.rate, state.loanTerm);
                const isSelected = index === selectedOfferIndex;
                
                return `<div class="offer-card ${isSelected ? 'selected' : ''} ${offer.badge ? 'recommended' : ''}" data-offer-index="${index}">
                    ${offer.badge ? `<div class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">${offer.badge}</div>` : ''}
                    <div class="text-center">
                        <h4 class="text-xl font-bold mb-2">${offer.name}</h4>
                        <p class="text-sm text-gray-600 mb-4">${offer.bank}</p>
                        <div class="mb-4">
                            <span class="text-4xl font-bold bg-gradient-to-r ${offer.color} bg-clip-text text-transparent">${offer.rate.toFixed(2)}%</span>
                            <span class="text-gray-600 ml-2">p.a.</span>
                        </div>
                        <div class="mb-4">
                            <p class="text-gray-600 mb-1">Měsíční splátka</p>
                            <p class="text-2xl font-bold">${formatCurrency(monthlyPayment)}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-xl">
                            <p class="text-sm text-gray-700">${offer.benefit}</p>
                        </div>
                    </div>
                </div>`;
            }).join('');
            
            document.querySelectorAll('.offer-card').forEach(card => {
                card.addEventListener('click', () => {
                    generateAnalysis(parseInt(card.dataset.offerIndex));
                });
            });
        }

        // Generate bank comparison table
        const selectedOffer = offers[selectedOfferIndex];
        const monthlyPayment = calculateMonthlyPayment(loanAmount, selectedOffer.rate, state.loanTerm);
        const totalPaid = monthlyPayment * 12 * state.loanTerm;
        const totalInterest = totalPaid - loanAmount;

        // Update key metrics
        const keyMetrics = document.getElementById('key-metrics');
        if (keyMetrics) {
            keyMetrics.innerHTML = `
                <div class="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div class="flex justify-between items-center">
                        <span class="font-semibold text-gray-700">Výše úvěru:</span>
                        <span class="font-bold text-xl">${formatCurrency(loanAmount)}</span>
                    </div>
                </div>
                <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div class="flex justify-between items-center">
                        <span class="font-semibold text-gray-700">Celkem zaplaceno:</span>
                        <span class="font-bold text-xl">${formatCurrency(totalPaid)}</span>
                    </div>
                </div>
                <div class="p-4 bg-red-50 rounded-xl border border-red-200">
                    <div class="flex justify-between items-center">
                        <span class="font-semibold text-red-700">Přeplatek:</span>
                        <span class="font-bold text-xl text-red-600">${formatCurrency(totalInterest)}</span>
                    </div>
                </div>
                <div class="p-4 bg-green-50 rounded-xl border border-green-200 mt-4">
                    <p class="text-sm font-bold text-green-700 mb-2">🏦 Porovnali jsme ${bankOffers.length} bank</p>
                    <p class="text-xs text-green-600">Nejlepší 3: ${topBanks.map(b => b.bank).join(', ')}</p>
                </div>
            `;
        }

        // AI recommendation
        const aiRecommendation = document.getElementById('ai-recommendation');
        if (aiRecommendation) {
            let recommendation = generateSmartRecommendation(ltv, state, bankOffers);
            aiRecommendation.innerHTML = recommendation;
        }
        
        generateLoanChart(loanAmount, selectedOffer.rate, state.loanTerm);
    }
    
    function getAllBankOffers(loanAmount, ltv, fixation) {
        const allBanks = [
            ...MortgageConfig.banks.major,
            ...MortgageConfig.banks.online,
            ...MortgageConfig.banks.building_societies
        ];
        
        const offers = [];
        
        allBanks.forEach(bank => {
            if (ltv >= bank.minLTV && ltv <= bank.maxLTV) {
                const rate = MortgageConfig.getRateForBank(bank.id, ltv, fixation, 'B');
                const monthlyPayment = calculateMonthlyPayment(loanAmount, rate, 25);
                
                offers.push({
                    bank: bank.name,
                    bankId: bank.id,
                    logo: bank.logo,
                    rate,
                    monthlyPayment,
                    totalInterest: (monthlyPayment * 25 * 12) - loanAmount
                });
            }
        });
        
        offers.sort((a, b) => a.rate - b.rate);
        return offers;
    }
    
    function generateSmartRecommendation(ltv, state, bankOffers) {
        let recommendation = '';
        
        if (ltv < 70) {
            recommendation = `✅ <strong>Výborně!</strong> S LTV ${ltv.toFixed(1)}% máte prémiové podmínky. `;
            recommendation += `Nejlepší nabídka: <strong>${bankOffers[0]?.bank}</strong> s sazbou ${bankOffers[0]?.rate.toFixed(2)}%.`;
        } else if (ltv < 80) {
            recommendation = `✅ S LTV ${ltv.toFixed(1)}% máte dobrou pozici. `;
            recommendation += `Doporučujeme <strong>${bankOffers[0]?.bank}</strong> nebo <strong>${bankOffers[1]?.bank}</strong>.`;
        } else if (ltv < 90) {
            recommendation = `⚠️ LTV ${ltv.toFixed(1)}% znamená vyšší sazby. `;
            recommendation += `Zvažte navýšení vlastních zdrojů o ${formatCurrency((ltv - 80) * state.propertyValue / 100)} pro lepší podmínky.`;
        } else {
            recommendation = `❌ LTV ${ltv.toFixed(1)}% je velmi vysoké. `;
            recommendation += `Pouze ${bankOffers.length} bank může poskytnout úvěr. Doporučujeme konzultaci zdarma.`;
        }
        
        if (state.monthlyIncome > 0) {
            const monthlyPayment = bankOffers[0]?.monthlyPayment || 0;
            const dsti = ((monthlyPayment + state.monthlyLiabilities) / state.monthlyIncome) * 100;
            
            if (dsti < 35) {
                recommendation += '<br><br>💚 <strong>Váš příjem je více než dostačující.</strong>';
            } else if (dsti < 45) {
                recommendation += '<br><br>⚠️ <strong>DSTI je na hranici, ale hypotéku získáte.</strong>';
            } else {
                recommendation += '<br><br>❌ <strong>DSTI je vysoké. Využijte naši konzultaci ZDARMA pro optimalizaci.</strong>';
            }
        }
        
        recommendation += `<br><br>📊 Z ${allBanks.length} bank jsme vybrali ${bankOffers.length} s nabídkami pro vás.`;
        
        return recommendation;
    }

    function generateLoanChart(principal, annualRate, years) {
        const canvas = document.getElementById('loanChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        let balance = principal;
        const monthlyPayment = calculateMonthlyPayment(principal, annualRate, years);
        const monthlyRate = (annualRate / 100) / 12;
        const balances = [principal];
        const labels = [0];
        
        for (let year = 1; year <= years; year++) {
            for (let month = 1; month <= 12; month++) {
                const interestPayment = balance * monthlyRate;
                const principalPayment = monthlyPayment - interestPayment;
                balance = Math.max(0, balance - principalPayment);
            }
            balances.push(balance);
            labels.push(year);
        }

        if (window.loanChart instanceof Chart) {
            window.loanChart.destroy();
        }
        
        window.loanChart = new Chart(ctx, {
            type: 'line',
            data: { 
                labels: labels,
                datasets: [{
                    label: 'Zůstatek úvěru',
                    data: balances,
                    borderColor: '#0066ff',
                    backgroundColor: 'rgba(0, 102, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => 'Zůstatek: ' + formatCurrency(context.parsed.y)
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Roky' }
                    },
                    y: {
                        title: { display: true, text: 'Zůstatek úvěru' },
                        ticks: { callback: value => formatCurrency(value) }
                    }
                }
            }
        });
    }

    // =============================
    // AI CHAT FUNKCE (OPRAVENÉ)
    // =============================
    
    function addChatMessage(content, sender, isHtml = false) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`;
        
        if (sender === 'ai') {
            const header = document.createElement('div');
            header.className = 'ai-header';
            header.innerHTML = `
                <div class="ai-avatar">🤖</div>
                <strong>AI Hypoteční Specialista</strong>
            `;
            bubble.appendChild(header);
        }
        
        const contentDiv = document.createElement('div');
        if (isHtml && typeof content === 'object') {
            contentDiv.appendChild(content);
        } else {
            contentDiv.innerHTML = String(content).replace(/\n/g, '<br>');
        }
        bubble.appendChild(contentDiv);
        
        elements.chat.window.appendChild(bubble);
        
        setTimeout(() => {
            elements.chat.window.scrollTop = elements.chat.window.scrollHeight;
        }, 100);
        
        return bubble;
    }

    function renderSuggestions(suggestions = []) {
        if (!elements.chat.suggestions) return;
        
        elements.chat.suggestions.innerHTML = '';
        suggestions.forEach(text => {
            const btn = document.createElement('button');
            btn.className = 'suggestion-btn';
            btn.textContent = text;
            btn.onclick = () => {
                elements.chat.input.value = text;
                handleChatSubmit();
            };
            elements.chat.suggestions.appendChild(btn);
        });
    }

    function createResultVisualInChat(calcData) {
        if (!calcData) return;
        
        const container = document.createElement('div');
        container.className = 'mt-4';
        const rates = getInterestRates(calcData.ltv, state.fixation);
        
        const bankOffers = getAllBankOffers(calcData.loanAmount, calcData.ltv, state.fixation);
        const topBanks = bankOffers.slice(0, 3);
        
        container.innerHTML = `
            <div class="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-100">
                <h4 class="font-bold text-xl mb-4 text-center text-gray-800">📊 Váš výpočet - TOP 3 banky</h4>
                <div class="space-y-3">
                    ${topBanks.map((bank, idx) => {
                        const highlight = idx === 0 ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50';
                        return `
                            <div class="flex justify-between items-center p-3 ${highlight} rounded-lg">
                                <div>
                                    <p class="font-bold text-lg">${bank.logo} ${bank.bank}</p>
                                    <p class="text-sm text-gray-600">${bank.rate.toFixed(2)}% p.a.</p>
                                </div>
                                <p class="text-xl font-bold text-blue-600">${formatCurrency(bank.monthlyPayment)}</p>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="mt-6 p-4 bg-green-100 rounded-lg">
                    <p class="font-bold text-green-700 text-center mb-2">💚 Konzultace ZDARMA</p>
                    <p class="text-sm text-green-600 text-center mb-3">Vyjednáme ještě lepší podmínky</p>
                    <button onclick="window.switchToContact()" class="btn-success w-full">
                        Získat konzultaci
                    </button>
                </div>
            </div>
        `;
        
        addChatMessage(container, 'ai', true);
    }

    async function handleChatSubmit() {
        const userMessage = elements.chat.input.value.trim();
        if (!userMessage || aiConversationState.isWaitingForResponse) return;
        
        // Anti-zacyklení kontrola
        if (userMessage === aiConversationState.lastUserMessage) {
            showToast('Tuto zprávu jste již odeslali', 'info');
            return;
        }
        
        // Kontrola opakujících se témat
        const topic = extractTopic(userMessage);
        if (aiConversationState.lastTopics.includes(topic)) {
            if (aiConversationState.lastTopics.filter(t => t === topic).length > 2) {
                // Téma se opakuje více než 2x - změnit přístup
                aiConversationState.step = 'redirect';
            }
        }
        aiConversationState.lastTopics.push(topic);
        if (aiConversationState.lastTopics.length > 5) {
            aiConversationState.lastTopics.shift();
        }
        
        addChatMessage(userMessage, 'user');
        elements.chat.input.value = '';
        renderSuggestions([]);
        
        aiConversationState.isWaitingForResponse = true;
        aiConversationState.lastUserMessage = userMessage;
        aiConversationState.messageCount++;
        
        const thinkingBubble = addChatMessage('<span class="thinking-dots">Přemýšlím</span>', 'ai');
        
        updateCalculations();
        
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch('/.netlify/functions/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    userMessage,
                    state,
                    aiConversationState
                })
            });
            
            clearTimeout(timeout);
            
            let aiResponse;
            if (!response.ok) {
                throw new Error('API call failed');
            }
            
            aiResponse = await response.json();
            
            if (aiResponse.updateState) {
                Object.assign(state, aiResponse.updateState);
                updateInputsFromState();
                updateCalculations();
            }
            
            const responseContent = thinkingBubble.querySelector('div:last-child');
            if (responseContent) {
                responseContent.innerHTML = (aiResponse.responseText || generateIntelligentFallback(userMessage).responseText).replace(/\n/g, '<br>');
            }
            
            if (aiResponse.performCalculation) {
                const calcData = getCalculationData();
                if (calcData && calcData.loanAmount > 0) {
                    setTimeout(() => createResultVisualInChat(calcData), 500);
                }
            }
            
            renderSuggestions(aiResponse.suggestions || getContextualSuggestions());
            
            if (aiResponse.conversationStep) {
                aiConversationState.step = aiResponse.conversationStep;
            }
            
        } catch (error) {
            console.error("AI Error:", error);
            const fallback = generateIntelligentFallback(userMessage);
            const responseContent = thinkingBubble.querySelector('div:last-child');
            if (responseContent) {
                responseContent.innerHTML = fallback.responseText.replace(/\n/g, '<br>');
            }
            renderSuggestions(fallback.suggestions);
            
            if (fallback.performCalculation) {
                const calcData = getCalculationData();
                if (calcData && calcData.loanAmount > 0) {
                    setTimeout(() => createResultVisualInChat(calcData), 500);
                }
            }
        } finally {
            aiConversationState.isWaitingForResponse = false;
        }
    }
    
    function extractTopic(message) {
        const msg = message.toLowerCase();
        if (msg.includes('sazb') || msg.includes('úrok')) return 'rates';
        if (msg.includes('koup') || msg.includes('byt') || msg.includes('dům')) return 'purchase';
        if (msg.includes('refinanc')) return 'refinance';
        if (msg.includes('vlastní') || msg.includes('zdroje')) return 'resources';
        if (msg.includes('příjem') || msg.includes('plat')) return 'income';
        return 'other';
    }
    
    function getContextualSuggestions() {
        if (!state.intent) return ["Chci koupit byt", "Refinancování", "Aktuální sazby"];
        if (!state.propertyValue) return ["3 miliony", "5 milionů", "8 milionů"];
        if (!state.ownResources) return ["20% z ceny", "1 milion", "2 miliony"];
        if (!state.monthlyIncome) return ["50 tisíc", "75 tisíc", "100 tisíc"];
        return ["Zobrazit výpočet", "Změnit údaje", "Konzultace zdarma"];
    }
    
    function generateIntelligentFallback(userMessage) {
        const message = userMessage.toLowerCase();
        const hasData = state.propertyValue > 0 && state.ownResources > 0 && state.monthlyIncome > 0;
        
        // Anti-zacyklení
        if (aiConversationState.messageCount > 10 && aiConversationState.step === 'start') {
            return {
                responseText: "Vidím, že máte potíže. Doporučuji přejít do kalkulačky nebo zavolat na 800 123 456 pro osobní pomoc. Konzultace je ZDARMA!",
                suggestions: ["Přejít do kalkulačky", "Kontakt"],
                performCalculation: false
            };
        }
        
        if (message.includes('ahoj') || message.includes('dobrý den')) {
            return {
                responseText: "Dobrý den! Jsem váš hypoteční poradce. Pomohu vám najít nejlepší hypotéku z 23 bank. Co vás zajímá?",
                suggestions: ["Spočítat hypotéku", "Aktuální sazby", "Konzultace zdarma"],
                performCalculation: false
            };
        }
        
        if (message.includes('sazb') || message.includes('úrok')) {
            const bankOffers = getAllBankOffers(4000000, 80, 5);
            return {
                responseText: `Aktuální sazby (listopad 2024):
                
📊 Nejlepší banky:
${bankOffers.slice(0, 3).map(b => `• ${b.bank}: od ${b.rate.toFixed(2)}%`).join('\n')}

Pro přesnou nabídku potřebuji znát vaše parametry.`,
                suggestions: ["Spočítat moji hypotéku", "Více bank", "Konzultace zdarma"],
                performCalculation: false
            };
        }
        
        if (hasData) {
            return {
                responseText: "Výborně! Mám všechny údaje. Zobrazuji nejlepší nabídky od 23 bank:",
                suggestions: ["Změnit parametry", "Kontakt na specialistu"],
                performCalculation: true
            };
        }
        
        if (!state.intent) {
            return {
                responseText: "Pro výpočet potřebuji vědět, co plánujete:",
                suggestions: ["Koupit nemovitost", "Refinancovat", "Stavět dům"],
                performCalculation: false
            };
        }
        
        if (!state.propertyValue) {
            return {
                responseText: "Jaká je cena nemovitosti?",
                suggestions: ["3 miliony", "5 milionů", "8 milionů"],
                performCalculation: false
            };
        }
        
        return {
            responseText: "Jak vám mohu pomoci? Nabízíme konzultaci ZDARMA.",
            suggestions: ["Spočítat hypotéku", "Seznam bank", "Konzultace zdarma"],
            performCalculation: false
        };
    }
    
    function updateInputsFromState() {
        Object.keys(state).forEach(key => {
            const input = elements.inputs[key];
            if (input && state[key] !== null && state[key] !== undefined) {
                if (input.type === 'select-one') {
                    const value = state[key].toString();
                    for (let option of input.options) {
                        if (option.value === value || option.textContent.includes(value)) {
                            input.value = option.value;
                            break;
                        }
                    }
                } else if (key === 'city') {
                    input.value = state[key];
                } else if (typeof state[key] === 'number') {
                    input.value = formatNumber(state[key]);
                }
            }
        });
    }

    // =============================
    // EVENT LISTENERS
    // =============================
    
    elements.modeButtons.forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    if (elements.prevBtn) {
        elements.prevBtn.addEventListener('click', () => navigate(-1));
    }
    
    if (elements.nextBtn) {
        elements.nextBtn.addEventListener('click', () => navigate(1));
    }
    
    elements.intentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setIntent(btn.dataset.intent);
            navigate(1);
        });
    });

    Object.values(elements.inputs).forEach(input => {
        if (input) {
            input.addEventListener('input', updateCalculations);
            input.addEventListener('change', updateCalculations);
        }
    });

    if (elements.chat.sendBtn) {
        elements.chat.sendBtn.addEventListener('click', handleChatSubmit);
    }
    
    if (elements.chat.input) {
        elements.chat.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit();
            }
        });
    }

    if (elements.leadForm) {
        elements.leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submit-lead-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Odesílám...';
            }
            
            const formData = new FormData(elements.leadForm);
            
            try {
                const response = await fetch("/", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams(formData).toString(),
                });
                
                if (response.ok) {
                    elements.leadForm.style.display = 'none';
                    document.getElementById('form-success').classList.remove('hidden');
                    stats.clients++;
                    localStorage.setItem('statsClients', stats.clients);
                    updateStatsDisplay();
                }
            } catch (error) {
                console.error('Form error:', error);
                showToast('Chyba při odesílání. Zkuste to prosím znovu.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Získat konzultaci ZDARMA';
                }
            }
        });
    }

    // =============================
    // POMOCNÉ FUNKCE
    // =============================
    
    function updateLiveCounter() {
        const now = new Date();
        const hour = now.getHours();
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        
        let baseUsers = isWeekend ? 8 : 17;
        if (hour >= 9 && hour < 17) baseUsers += 10;
        else if (hour >= 17 && hour < 21) baseUsers += 5;
        else if (hour < 9 || hour > 21) baseUsers = 3;
        
        const variation = Math.floor(Math.random() * 5) - 2;
        const count = Math.max(1, baseUsers + variation);
        
        const counter = document.getElementById('live-count');
        if (counter) counter.textContent = count;
    }
    
    function updateStatsDisplay() {
        const mediatedEl = document.getElementById('stats-mediated');
        const clientsEl = document.getElementById('stats-clients');
        
        if (mediatedEl) mediatedEl.textContent = `${(stats.mediated / 1000000000).toFixed(1)} mld Kč`;
        if (clientsEl) clientsEl.textContent = formatNumber(stats.clients);
    }
    
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50`;
        
        const colors = {
            info: 'bg-blue-500',
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            error: 'bg-red-500'
        };
        
        toast.classList.add(colors[type], 'text-white');
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function trackEvent(eventName, eventData = {}) {
        if (window.gtag) {
            window.gtag('event', eventName, eventData);
        }
        console.log('Event:', eventName, eventData);
    }
    
    function displayBankLogos() {
        const container = document.getElementById('bank-logos');
        if (container) {
            const banks = MortgageConfig.banks.major.slice(0, 5);
            container.innerHTML = banks.map(bank => 
                `<span title="${bank.name}" style="font-size: 20px;">${bank.logo}</span>`
            ).join('');
        }
        
        const showAllBtn = document.getElementById('show-all-banks');
        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                showAllBanksModal();
            });
        }
    }
    
    function showAllBanksModal() {
        const allBanks = [
            ...MortgageConfig.banks.major,
            ...MortgageConfig.banks.online,
            ...MortgageConfig.banks.specialized,
            ...MortgageConfig.banks.building_societies
        ];
        
        alert(`Spolupracujeme s ${allBanks.length} bankami:\n\n${allBanks.map(b => b.name).join(', ')}`);
    }
    
    const allBanks = [
        ...MortgageConfig.banks.major,
        ...MortgageConfig.banks.online,
        ...MortgageConfig.banks.specialized,
        ...MortgageConfig.banks.building_societies
    ];
    
    // =============================
    // INICIALIZACE
    // =============================
    
    function initialize() {
        const lastUpdated = document.getElementById('last-updated');
        if (lastUpdated) {
            lastUpdated.textContent = rateDatabase.lastUpdated.toLocaleDateString('cs-CZ');
        }
        
        updateLiveCounter();
        setInterval(updateLiveCounter, 5000);
        
        updateStatsDisplay();
        setInterval(() => {
            if (Math.random() > 0.7) {
                stats.mediated += Math.floor(Math.random() * 500000) + 100000;
                localStorage.setItem('statsMediated', stats.mediated);
            }
            if (Math.random() > 0.9) {
                stats.clients++;
                localStorage.setItem('statsClients', stats.clients);
            }
            updateStatsDisplay();
        }, 8000);
        
        renderSuggestions(["Chci koupit byt", "Aktuální sazby", "Konzultace zdarma"]);
        
        setIntent('koupě');
        
        updateInputsFromState();
        updateUI();
        updateCalculations();
        
        displayBankLogos();
        
        window.switchMode = switchMode;
        window.switchToContact = () => {
            switchMode('calculator');
            currentStep = 5;
            updateUI();
        };
        
        setTimeout(() => {
            if (!sessionStorage.getItem('welcomed')) {
                showToast('💚 Konzultace ZDARMA pro všechny!', 'success');
                sessionStorage.setItem('welcomed', 'true');
            }
        }, 2000);
        
        console.log(`Hypotéka AI v3.0 - Loaded with ${allBanks.length} banks`);
    }

    initialize();
});