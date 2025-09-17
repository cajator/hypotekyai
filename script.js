// Hypotéka AI - Vylepšený JavaScript s opravenými chybami
// Version 2.0 - Professional Edition

document.addEventListener('DOMContentLoaded', function() {
    
    // --- ENHANCED DATABASE & CONFIG ---
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
    
    // --- ENHANCED STATE MANAGEMENT ---
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
    
    // Vylepšený AI conversation state s historií
    let aiConversationState = { 
        step: 'start', 
        context: {},
        history: [],
        lastUserMessage: '',
        messageCount: 0,
        isWaitingForResponse: false
    };
    
    // Statistics with better persistence
    let stats = {
        mediated: parseInt(localStorage.getItem('statsMediated')) || 8400000000,
        clients: parseInt(localStorage.getItem('statsClients')) || 12847,
        lastUpdate: Date.now()
    };

    // --- ELEMENT SELECTORS ---
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
    
    // --- ENHANCED UI FUNCTIONS ---
    function switchMode(mode) {
        const isCalculator = mode === 'calculator';
        elements.calculatorMode.classList.toggle('hidden', !isCalculator);
        elements.aiMode.classList.toggle('hidden', isCalculator);
        
        elements.modeButtons.forEach(btn => {
            const isActive = btn.dataset.mode === mode;
            btn.classList.toggle('active', isActive);
            
            // Update button styling
            if (isActive) {
                btn.style.background = 'white';
                btn.style.color = '#0066ff';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = '#6b7280';
            }
        });
        
        // Track mode switch
        trackEvent('mode_switch', { mode });
    }

    function updateUI() {
        // Update timeline with smooth animation
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
        
        // Update progress bar with easing
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        const progressBar = document.getElementById('timeline-progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Show/hide sections with animation
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.remove('active');
        });
        const currentSection = document.getElementById(`section-${currentStep}`);
        if (currentSection) {
            currentSection.classList.add('active');
            // Smooth scroll to top of section
            currentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Update navigation buttons
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
        
        // Generate analysis on step 4
        if (currentStep === 4) {
            generateAnalysis();
        }
    }
    
    function navigate(direction) {
        if (elements.nextBtn.textContent === 'Začít znovu') {
            resetForm();
        } else {
            // Validate before moving forward
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
        document.getElementById('form-success').classList.add('hidden');
        elements.leadForm.style.display = 'block';
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
        
        // Update UI for different intents
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
        
        // Update button states with animation
        elements.intentButtons.forEach(btn => {
            const isSelected = btn.dataset.intent === intent;
            btn.classList.toggle('selected', isSelected);
            
            if (isSelected) {
                btn.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    btn.style.transform = '';
                }, 200);
            }
        });
        
        updateCalculations();
        trackEvent('intent_selected', { intent });
    }

    // --- CALCULATION FUNCTIONS ---
    function parseNumericInput(value) {
        if (typeof value !== 'string') return value;
        
        // Remove spaces and replace comma with dot
        let cleanValue = value.toLowerCase().replace(/\s/g, '').replace(',', '.');
        
        // Extract numeric part
        let numMatch = cleanValue.match(/([\d.]+)\s*([mk%])?/);
        if (!numMatch) return null;
        
        let num = parseFloat(numMatch[1]);
        let unit = numMatch[2];
        
        // Apply multiplier based on unit
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
                loanAmount = state.ownResources; // In reconstruction, ownResources is the loan amount
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

    function updateCalculations() {
        // Update state from inputs
        Object.keys(elements.inputs).forEach(key => {
            const inputElement = elements.inputs[key];
            if (!inputElement) return;
            
            let val = inputElement.value;
            
            if (inputElement.type === 'select-one') {
                // Handle select elements
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
            // Clear displays if no valid data
            elements.displays.monthlyPayment.textContent = '--,-- Kč';
            elements.displays.ltv.textContent = '--%';
            elements.displays.loanAmount.textContent = '--,-- Kč';
            return;
        }

        const { loanAmount, ltv } = calcData;
        const rates = getInterestRates(ltv, state.fixation);
        const monthlyPayment = calculateMonthlyPayment(loanAmount, rates.likely, state.loanTerm);

        // Update displays with animation
        animateValue(elements.displays.monthlyPayment, monthlyPayment, formatCurrency);
        elements.displays.ltv.textContent = `${ltv.toFixed(1)}%`;
        elements.displays.loanAmount.textContent = formatCurrency(loanAmount);

        // Update DSTI if income is provided
        if (state.monthlyIncome > 0) {
            const dsti = ((monthlyPayment + state.monthlyLiabilities) / state.monthlyIncome) * 100;
            elements.displays.dsti.textContent = `${dsti.toFixed(1)}%`;
            elements.displays.dstiResult.classList.remove('hidden');
            
            // Update DSTI styling and message
            let tip = "";
            let className = "glass-card p-6 text-center";
            
            if (dsti > 50) {
                tip = "⚠️ Vaše DSTI je vysoké. Banky obvykle vyžadují DSTI pod 50%. Doporučujeme konzultaci s naším specialistou.";
                className += " border-2 border-red-500 bg-red-50";
            } else if (dsti > 40) {
                tip = "⚠️ Vaše DSTI je na hranici. Některé banky mohou být opatrnější.";
                className += " border-2 border-yellow-500 bg-yellow-50";
            } else {
                tip = "✅ Vaše DSTI je v optimálním rozmezí. Máte dobré předpoklady pro získání hypotéky.";
                className += " border-2 border-green-500 bg-green-50";
            }
            
            elements.displays.dstiTip.innerHTML = tip;
            elements.displays.dstiResult.className = className;
        } else {
            elements.displays.dstiResult.classList.add('hidden');
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

    function generateAnalysis(selectedOfferIndex = 1) {
        const calcData = getCalculationData();
        if (!calcData) return;

        const { loanAmount, ltv } = calcData;
        const rates = getInterestRates(ltv, state.fixation);
        const offers = [
            { 
                name: "Nejlepší nabídka", 
                rate: rates.best, 
                benefit: "Pro klienty s nejlepší bonitou", 
                color: "from-green-400 to-green-600",
                badge: null
            },
            { 
                name: "Pravděpodobná nabídka", 
                rate: rates.likely, 
                benefit: "Nejčastější scénář", 
                color: "from-blue-400 to-blue-600",
                badge: "KONZULTACE ZDARMA"
            },
            { 
                name: "Konzervativní odhad", 
                rate: rates.worst, 
                benefit: "Bezpečný odhad", 
                color: "from-orange-400 to-orange-600",
                badge: null
            },
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
                        <h4 class="text-2xl font-bold mb-4">${offer.name}</h4>
                        <div class="mb-6">
                            <span class="text-5xl font-bold bg-gradient-to-r ${offer.color} bg-clip-text text-transparent">${offer.rate.toFixed(2)}%</span>
                            <span class="text-gray-600 ml-2">p.a.</span>
                        </div>
                        <div class="mb-6">
                            <p class="text-gray-600 mb-2">Měsíční splátka</p>
                            <p class="text-3xl font-bold">${formatCurrency(monthlyPayment)}</p>
                        </div>
                        <div class="bg-gray-50 p-4 rounded-xl">
                            <p class="text-sm text-gray-700">${offer.benefit}</p>
                        </div>
                    </div>
                </div>`;
            }).join('');
            
            // Add click handlers
            document.querySelectorAll('.offer-card').forEach(card => {
                card.addEventListener('click', () => {
                    generateAnalysis(parseInt(card.dataset.offerIndex));
                });
            });
        }

        // Generate metrics and chart for selected offer
        const selectedOffer = offers[selectedOfferIndex];
        const monthlyPayment = calculateMonthlyPayment(loanAmount, selectedOffer.rate, state.loanTerm);
        const totalPaid = monthlyPayment * 12 * state.loanTerm;
        const totalInterest = totalPaid - loanAmount;
        const firstPaymentInterest = loanAmount * ((selectedOffer.rate / 100) / 12);

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
                        <span class="font-semibold text-red-700">Přeplatek na úrocích:</span>
                        <span class="font-bold text-xl text-red-600">${formatCurrency(totalInterest)}</span>
                    </div>
                </div>
            `;
        }

        // Generate AI recommendation
        const aiRecommendation = document.getElementById('ai-recommendation');
        if (aiRecommendation) {
            let recommendation = '';
            
            if (ltv < 70) {
                recommendation = `✅ Výborně! S LTV ${ltv.toFixed(1)}% máte vynikající vyjednávací pozici. Dosáhnete na nejlepší sazby a podmínky na trhu.`;
            } else if (ltv < 80) {
                recommendation = `✅ S LTV ${ltv.toFixed(1)}% máte dobrou pozici. Získáte příznivé sazby od většiny bank.`;
            } else if (ltv < 90) {
                recommendation = `⚠️ S LTV ${ltv.toFixed(1)}% jsou sazby vyšší, ale stále máte na výběr z mnoha nabídek.`;
            } else {
                recommendation = `⚠️ LTV ${ltv.toFixed(1)}% je vysoké. Doporučujeme zvážit navýšení vlastních zdrojů nebo konzultaci s naším specialistou pro optimalizaci podmínek.`;
            }
            
            if (state.monthlyIncome > 0) {
                const dsti = ((monthlyPayment + state.monthlyLiabilities) / state.monthlyIncome * 100);
                if (dsti < 40) {
                    recommendation += '\n\n💚 Váš příjem je více než dostačující pro získání hypotéky.';
                } else if (dsti < 50) {
                    recommendation += '\n\n⚠️ Váš příjem je na hranici, ale hypotéku získat můžete.';
                } else {
                    recommendation += '\n\n❌ DSTI je vysoké. Náš specialista vám pomůže najít řešení.';
                }
            }
            
            aiRecommendation.innerHTML = recommendation.replace(/\n/g, '<br>');
        }
        
        // Generate chart
        generateLoanChart(loanAmount, selectedOffer.rate, state.loanTerm);
    }

    function generateLoanChart(principal, annualRate, years) {
        const canvas = document.getElementById('loanChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Generate amortization data
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

        // Destroy existing chart if it exists
        if (window.loanChart instanceof Chart) {
            window.loanChart.destroy();
        }
        
        // Create new chart
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
                    tension: 0.4,
                    pointBackgroundColor: '#0066ff',
                    pointBorderColor: '#0066ff',
                    pointHoverBackgroundColor: '#0066ff',
                    pointHoverBorderColor: '#0066ff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false
                },
                plugins: { 
                    legend: { 
                        display: false 
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Zůstatek: ' + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Roky',
                            color: '#6b7280'
                        },
                        ticks: {
                            color: '#6b7280'
                        },
                        grid: {
                            color: 'rgba(107, 114, 128, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Zůstatek úvěru',
                            color: '#6b7280'
                        },
                        ticks: {
                            callback: value => formatCurrency(value),
                            color: '#6b7280'
                        },
                        grid: {
                            color: 'rgba(107, 114, 128, 0.1)'
                        }
                    }
                }
            }
        });
    }

    // --- ENHANCED AI CHAT FUNCTIONS ---
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
            contentDiv.innerHTML = content.replace(/\n/g, '<br>');
        }
        bubble.appendChild(contentDiv);
        
        elements.chat.window.appendChild(bubble);
        
        // Smooth scroll to bottom
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
        
        container.innerHTML = `
            <div class="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-100">
                <h4 class="font-bold text-xl mb-4 text-center text-gray-800">📊 Váš výpočet hypotéky</h4>
                <div class="space-y-4">
                    ${Object.entries(rates).map(([type, rate]) => {
                        const monthlyPayment = calculateMonthlyPayment(calcData.loanAmount, rate, state.loanTerm);
                        const typeLabel = type === 'best' ? '🏆 Nejlepší' : (type === 'likely' ? '⭐ Pravděpodobná' : '🛡️ Konzervativní');
                        const highlight = type === 'likely' ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50';
                        
                        return `
                            <div class="flex justify-between items-center p-4 ${highlight} rounded-lg">
                                <div>
                                    <p class="font-bold text-lg">${typeLabel}</p>
                                    <p class="text-sm text-gray-600">${rate.toFixed(2)}% p.a.</p>
                                </div>
                                <p class="text-xl font-bold text-blue-600">${formatCurrency(monthlyPayment)}</p>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="mt-6 p-4 bg-green-100 rounded-lg">
                    <p class="font-bold text-green-700 text-center mb-2">💚 Chcete lepší podmínky?</p>
                    <p class="text-sm text-green-600 text-center mb-3">Náš specialista vám pomůže získat ještě výhodnější nabídku</p>
                    <button onclick="window.switchToContact()" class="btn-success w-full">
                        Získat konzultaci ZDARMA
                    </button>
                </div>
            </div>
        `;
        
        addChatMessage(container, 'ai', true);
    }

    async function handleChatSubmit() {
        const userMessage = elements.chat.input.value.trim();
        if (!userMessage || aiConversationState.isWaitingForResponse) return;
        
        // Check for duplicate message (anti-spam)
        if (userMessage === aiConversationState.lastUserMessage) {
            showToast('Tuto zprávu jste již odeslali', 'info');
            return;
        }
        
        addChatMessage(userMessage, 'user');
        elements.chat.input.value = '';
        renderSuggestions([]);
        
        // Set waiting state
        aiConversationState.isWaitingForResponse = true;
        aiConversationState.lastUserMessage = userMessage;
        aiConversationState.messageCount++;
        aiConversationState.history.push({ role: 'user', content: userMessage });
        
        const thinkingBubble = addChatMessage('<span class="thinking-dots">Přemýšlím</span>', 'ai');
        
        // Update calculations before AI response
        updateCalculations();
        
        try {
            // Try API call with timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
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
            
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }
            
            const aiResponse = await response.json();
            
            // Update state if AI provided updates
            if (aiResponse.updateState) {
                Object.assign(state, aiResponse.updateState);
                updateInputsFromState();
                updateCalculations();
            }
            
            // Update thinking bubble with response
            const responseContent = thinkingBubble.querySelector('div:last-child');
            if (responseContent) {
                responseContent.innerHTML = (aiResponse.responseText || "Omlouvám se, nastala chyba.").replace(/\n/g, '<br>');
            }
            
            // Show calculation results if requested
            if (aiResponse.performCalculation) {
                const calcData = getCalculationData();
                if (calcData && calcData.loanAmount > 0) {
                    setTimeout(() => createResultVisualInChat(calcData), 500);
                }
            }
            
            // Show free consultation reminder
            if (aiResponse.showFreeConsultation && Math.random() > 0.7) {
                setTimeout(() => {
                    addChatMessage('💚 Připomínám, že konzultace s naším specialistou je zcela ZDARMA a nezávazná!', 'ai');
                }, 2000);
            }
            
            renderSuggestions(aiResponse.suggestions || getDefaultSuggestions());
            
            if (aiResponse.conversationStep) {
                aiConversationState.step = aiResponse.conversationStep;
            }
            
            // Add to history
            aiConversationState.history.push({ 
                role: 'assistant', 
                content: aiResponse.responseText 
            });
            
            // Handle special commands
            if (aiResponse.conversationStep === 'redirect_to_form' || 
                userMessage.toLowerCase().includes('kontakt') || 
                userMessage.toLowerCase().includes('specialista')) {
                setTimeout(() => {
                    switchMode('calculator');
                    currentStep = 5;
                    updateUI();
                }, 1500);
            }
            
        } catch (error) {
            console.error("Error processing AI response:", error);
            
            // Use enhanced fallback
            const fallbackResponse = generateEnhancedFallback(userMessage, state, aiConversationState);
            const responseContent = thinkingBubble.querySelector('div:last-child');
            if (responseContent) {
                responseContent.innerHTML = fallbackResponse.responseText.replace(/\n/g, '<br>');
            }
            
            renderSuggestions(fallbackResponse.suggestions);
            
            if (fallbackResponse.performCalculation) {
                const calcData = getCalculationData();
                if (calcData && calcData.loanAmount > 0) {
                    setTimeout(() => createResultVisualInChat(calcData), 500);
                }
            }
        } finally {
            aiConversationState.isWaitingForResponse = false;
        }
    }
    
    function getDefaultSuggestions() {
        if (!state.intent) {
            return ["Chci koupit byt", "Potřebuji refinancovat", "Zajímají mě sazby"];
        } else if (!state.propertyValue) {
            return ["3 miliony", "5 milionů", "8 milionů"];
        } else if (!state.ownResources) {
            return ["20% z ceny", "1 milion", "2 miliony"];
        } else if (!state.monthlyIncome) {
            return ["50 tisíc", "75 tisíc", "100 tisíc"];
        } else {
            return ["Spočítat hypotéku", "Změnit parametry", "Konzultace zdarma"];
        }
    }
    
    function generateEnhancedFallback(userMessage, state, conversationState) {
        const message = userMessage.toLowerCase();
        const hasCompleteData = state.intent && state.propertyValue > 0 && 
                               state.ownResources > 0 && state.monthlyIncome > 0;
        
        // Anti-repetition check
        if (conversationState.messageCount > 10 && conversationState.step === 'start') {
            return {
                responseText: "Zdá se, že máte potíže s nastavením. Doporučuji přejít do kalkulačky nebo rovnou kontaktovat našeho specialistu pro osobní pomoc. Konzultace je ZDARMA!",
                suggestions: ["Přejít do kalkulačky", "Kontaktovat specialistu"],
                performCalculation: false
            };
        }
        
        // Smart responses based on context
        if (message.includes('ahoj') || message.includes('dobrý den')) {
            return {
                responseText: "Dobrý den! 👋 Vítejte v Hypotéka AI. Jsem tu, abych vám pomohl najít nejlepší hypotéku ze všech 23 bank. Co vás zajímá?",
                suggestions: ["Spočítat hypotéku", "Aktuální sazby", "Konzultace zdarma"],
                performCalculation: false
            };
        }
        
        if (message.includes('konzultac') || message.includes('zdarma')) {
            return {
                responseText: "Výborně! Nabízíme KONZULTACI ZCELA ZDARMA a nezávazně.\n\nNáš specialista:\n✅ Porovná všech 23 bank\n✅ Vyjedná nejlepší podmínky\n✅ Vyřídí vše za vás\n✅ Ušetří vám průměrně 286 000 Kč\n\nStačí vyplnit krátký formulář.",
                suggestions: ["Vyplnit formulář", "Nejdřív spočítat hypotéku"],
                performCalculation: false
            };
        }
        
        if (hasCompleteData) {
            return {
                responseText: "Perfektní! Mám všechny potřebné údaje. Zde je váš výpočet hypotéky:",
                suggestions: ["Změnit parametry", "Kontakt na specialistu", "Více informací"],
                performCalculation: true
            };
        }
        
        // Progressive data collection
        if (!state.intent) {
            return {
                responseText: "Pro výpočet hypotéky potřebuji vědět, co plánujete. Vyberte si:",
                suggestions: ["Koupit byt/dům", "Refinancovat", "Stavět", "Rekonstruovat"],
                performCalculation: false
            };
        }
        
        if (!state.propertyValue) {
            return {
                responseText: "Výborně! Teď mi řekněte, jaká je cena nemovitosti?",
                suggestions: ["Do 3 milionů", "3-5 milionů", "5-8 milionů", "Více než 8 mil."],
                performCalculation: false
            };
        }
        
        if (!state.ownResources) {
            return {
                responseText: `Pro nemovitost za ${formatCurrency(state.propertyValue)} - kolik máte vlastních prostředků?`,
                suggestions: ["10% z ceny", "20% z ceny", "30% z ceny", "Jiná částka"],
                performCalculation: false
            };
        }
        
        if (!state.monthlyIncome) {
            return {
                responseText: "Skvěle! Poslední důležitý údaj - jaký je váš čistý měsíční příjem?",
                suggestions: ["Do 50 tisíc", "50-75 tisíc", "75-100 tisíc", "Více než 100 tisíc"],
                performCalculation: false
            };
        }
        
        return {
            responseText: "Jsem tu, abych vám pomohl s hypotékou. Co vás zajímá?",
            suggestions: ["Spočítat hypotéku", "Aktuální sazby", "Konzultace zdarma"],
            performCalculation: false
        };
    }
    
    function updateInputsFromState() {
        Object.keys(state).forEach(key => {
            const input = elements.inputs[key];
            if (input && state[key] !== null && state[key] !== undefined) {
                if (input.type === 'select-one') {
                    // For select elements, find matching option
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
                } else {
                    input.value = state[key];
                }
            }
        });
    }

    // --- ENHANCED EVENT LISTENERS ---
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

    // Enhanced input listeners with debouncing
    let updateTimeout;
    Object.values(elements.inputs).forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                clearTimeout(updateTimeout);
                updateTimeout = setTimeout(updateCalculations, 300);
            });
            input.addEventListener('change', updateCalculations);
            
            // Add focus effects
            input.addEventListener('focus', () => {
                input.parentElement?.classList.add('focused');
            });
            input.addEventListener('blur', () => {
                input.parentElement?.classList.remove('focused');
            });
        }
    });

    // Chat listeners
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

    // Form submission
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
                    trackEvent('lead_submitted', Object.fromEntries(formData));
                    
                    // Update statistics
                    stats.clients++;
                    localStorage.setItem('statsClients', stats.clients);
                    updateStatsDisplay();
                } else {
                    throw new Error('Form submission failed');
                }
            } catch (error) {
                console.error('Form submission error:', error);
                showToast('Nastala chyba při odesílání. Zkuste to prosím znovu.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Získat konzultaci ZDARMA';
                }
            }
        });
    }

    // --- LIVE COUNTER & STATISTICS ---
    function updateLiveCounter() {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        let baseUsers = 17;
        
        if (isWeekend) {
            if (hour >= 10 && hour < 18) baseUsers = 12;
            else if (hour >= 18 && hour < 22) baseUsers = 8;
            else baseUsers = 3;
        } else {
            if (hour >= 8 && hour < 10) baseUsers = 25;
            else if (hour >= 10 && hour < 17) baseUsers = 28;
            else if (hour >= 17 && hour < 22) baseUsers = 22;
            else if (hour >= 22 || hour < 6) baseUsers = 5;
            else baseUsers = 10;
        }
        
        // Add random variation
        const variation = Math.floor(Math.random() * 7) - 3;
        const count = Math.max(1, baseUsers + variation);
        
        const counter = document.getElementById('live-count');
        if (counter) {
            animateValue(counter, count, (v) => Math.round(v).toString());
        }
    }
    
    function updateStatsDisplay() {
        const mediatedEl = document.getElementById('stats-mediated');
        const clientsEl = document.getElementById('stats-clients');
        
        if (mediatedEl) {
            mediatedEl.textContent = `${(stats.mediated / 1000000000).toFixed(1)} mld Kč`;
        }
        if (clientsEl) {
            clientsEl.textContent = formatNumber(stats.clients);
        }
    }
    
    function simulateStats() {
        // Realistic increments
        if (Math.random() > 0.7) {
            stats.mediated += Math.floor(Math.random() * 500000) + 100000;
            localStorage.setItem('statsMediated', stats.mediated);
        }
        
        if (Math.random() > 0.9) {
            stats.clients++;
            localStorage.setItem('statsClients', stats.clients);
        }
        
        updateStatsDisplay();
    }
    
    // --- UTILITY FUNCTIONS ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 animate-slideInUp`;
        
        const colors = {
            info: 'bg-blue-500 text-white',
            success: 'bg-green-500 text-white',
            warning: 'bg-yellow-500 text-white',
            error: 'bg-red-500 text-white'
        };
        
        toast.classList.add(...colors[type].split(' '));
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('animate-fadeOut');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function trackEvent(eventName, eventData = {}) {
        // Analytics tracking placeholder
        if (window.gtag) {
            window.gtag('event', eventName, eventData);
        }
        console.log('Event tracked:', eventName, eventData);
    }
    
    // --- INITIALIZATION ---
    function initialize() {
        // Set last updated date
        const lastUpdated = document.getElementById('last-updated');
        if (lastUpdated) {
            lastUpdated.textContent = rateDatabase.lastUpdated.toLocaleDateString('cs-CZ');
        }
        
        // Initialize live counter
        updateLiveCounter();
        setInterval(updateLiveCounter, 5000);
        
        // Initialize statistics
        updateStatsDisplay();
        setInterval(simulateStats, 8000);
        
        // Initialize chat suggestions
        renderSuggestions(["Chci koupit byt", "Aktuální sazby", "Konzultace zdarma"]);
        
        // Set default intent
        setIntent('koupě');
        
        // Initialize form values
        updateInputsFromState();
        
        // Initial UI update
        updateUI();
        updateCalculations();
        
        // Initialize tooltips
        document.querySelectorAll('.tooltip').forEach(tooltip => {
            tooltip.setAttribute('tabindex', '0');
        });
        
        // Make functions globally accessible
        window.switchMode = switchMode;
        window.switchToContact = () => {
            switchMode('calculator');
            currentStep = 5;
            updateUI();
        };
        
        // Show welcome message after short delay
        setTimeout(() => {
            if (!sessionStorage.getItem('welcomed')) {
                showToast('💚 Konzultace zdarma pro všechny nové klienty!', 'success');
                sessionStorage.setItem('welcomed', 'true');
            }
        }, 2000);
    }

    // Start the application
    initialize();
});