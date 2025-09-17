document.addEventListener('DOMContentLoaded', function() {
    
    // --- DATABASE & CONFIG ---
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
    
    // --- STATE MANAGEMENT ---
    let currentStep = 1;
    const totalSteps = 5;
    const state = {
        intent: 'koupě', 
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
    
    let aiConversationState = { step: 'start', context: {} };
    
    // Vylepšené statistiky s sessionStorage pro trvalost během session
    let stats = {
        mediated: parseInt(sessionStorage.getItem('statsMediated')) || 8400000000,
        clients: parseInt(sessionStorage.getItem('statsClients')) || 12847
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
    
    // --- UI FUNCTIONS ---
    function switchMode(mode) {
        elements.calculatorMode.classList.toggle('hidden', mode !== 'calculator');
        elements.aiMode.classList.toggle('hidden', mode !== 'ai');
        elements.modeButtons.forEach(btn => {
            const isSelected = btn.dataset.mode === mode;
            btn.classList.toggle('border-white', isSelected);
            btn.classList.toggle('text-white', isSelected);
            btn.classList.toggle('border-transparent', !isSelected);
            btn.classList.toggle('text-blue-100', !isSelected);
        });
    }

    function updateUI() {
        // Update timeline
        document.querySelectorAll('.timeline-step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.toggle('active', stepNumber === currentStep);
            step.classList.toggle('completed', stepNumber < currentStep);
        });
        
        // Update progress bar
        const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
        document.getElementById('timeline-progress').style.width = `${progress}%`;

        // Show/hide sections
        document.querySelectorAll('.form-section').forEach(section => section.classList.remove('active'));
        document.getElementById(`section-${currentStep}`)?.classList.add('active');

        // Update navigation
        elements.prevBtn.classList.toggle('hidden', currentStep === 1);
        if (currentStep === totalSteps) {
            elements.nextBtn.textContent = 'Začít znovu';
        } else if (currentStep === totalSteps - 1) {
            elements.nextBtn.textContent = 'Zobrazit analýzu';
        } else {
            elements.nextBtn.textContent = 'Další';
        }
        
        document.getElementById('navigation-buttons').classList.toggle('hidden', currentStep === 1 && !state.intent);
        
        if (currentStep === 4) {
            generateAnalysis();
        }
    }
    
    function navigate(direction) {
        if (elements.nextBtn.textContent === 'Začít znovu') {
            currentStep = 1;
            elements.leadForm.reset();
            document.getElementById('form-success').classList.add('hidden');
            elements.leadForm.style.display = 'block';
        } else {
            currentStep = Math.max(1, Math.min(totalSteps, currentStep + direction));
        }
        updateUI();
    }

    function setIntent(intent) {
        state.intent = intent;
        
        // Show/hide input groups based on intent
        Object.values(elements.inputGroups).forEach(group => group.classList.add('hidden'));
        
        const purchaseLabel = elements.inputGroups.purchase.querySelector('label[for="propertyValue"]');
        const resourcesLabel = elements.inputGroups.purchase.querySelector('label[for="ownResources"]');
        
        if (intent === 'koupě' || intent === 'investice') {
            elements.inputGroups.purchase.classList.remove('hidden');
            purchaseLabel.textContent = "Cena nemovitosti (Kč)";
            resourcesLabel.textContent = "Vlastní zdroje (Kč)";
        } else if (intent === 'rekonstrukce') {
            elements.inputGroups.purchase.classList.remove('hidden');
            purchaseLabel.textContent = "Hodnota nemovitosti po rekonstrukci (Kč)";
            resourcesLabel.textContent = "Částka rekonstrukce (Kč)";
        } else if (intent === 'výstavba') {
            elements.inputGroups.construction.classList.remove('hidden');
        } else if (intent === 'refinancování') {
            elements.inputGroups.refinancing.classList.remove('hidden');
        }
        
        // Update button states
        elements.intentButtons.forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.intent === intent) {
                btn.classList.add('selected');
            }
        });
        
        updateCalculations();
    }

    // --- CALCULATION FUNCTIONS ---
    function parseNumericInput(value) {
        if (typeof value !== 'string') return value;
        let numStr = value.toLowerCase().replace(/\s/g, '').replace(',', '.').match(/[\d.]+/g)?.[0] || '';
        let num = parseFloat(numStr);
        if (value.includes('m')) num *= 1000000;
        else if (value.includes('k')) num *= 1000;
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
    
    function getInterestRates(ltv, fixation) {
        const rates = rateDatabase.fixations[fixation] || rateDatabase.fixations["5"];
        return (rates.find(r => ltv <= r.ltv) || rates[rates.length - 1]).rates;
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
        }
        
        if (loanAmount <= 0 || propertyValueForLtv <= 0) return null;
        const ltv = (loanAmount / propertyValueForLtv) * 100;
        return { loanAmount, propertyValueForLtv, ltv };
    }

    function generateAmortizationData(principal, annualRate, years) {
        const monthlyPayment = calculateMonthlyPayment(principal, annualRate, years);
        if (monthlyPayment <= 0) return { balances: [], labels: [] };
        
        let balance = principal;
        const monthlyRate = (annualRate / 100) / 12;
        const balances = [principal];
        const labels = [0];
        
        for (let year = 1; year <= years; year++) {
            for (let month = 1; month <= 12; month++) {
                const interestPayment = balance * monthlyRate;
                const principalPayment = monthlyPayment - interestPayment;
                balance -= principalPayment;
                if (balance < 0) balance = 0;
            }
            balances.push(balance);
            labels.push(year);
        }
        return { balances, labels };
    }

    function updateCalculations() {
        // Update state from inputs
        Object.keys(elements.inputs).forEach(key => {
            const inputElement = elements.inputs[key];
            if (!inputElement) return;
            
            let val = inputElement.value;
            
            // Handle percentage input for own resources
            if (inputElement.id === 'ownResources' && typeof val === 'string' && val.includes('%')) {
                const percentage = parseFloat(val.replace('%', '').trim());
                const propertyVal = parseNumericInput(elements.inputs.propertyValue.value);
                if (!isNaN(percentage) && propertyVal > 0) {
                    state.ownResources = (propertyVal * percentage) / 100;
                    inputElement.value = new Intl.NumberFormat('cs-CZ', {useGrouping: false}).format(state.ownResources);
                }
            } else {
                val = inputElement.type === 'select-one' ? parseInt(val) : 
                     (inputElement.id.toLowerCase().includes('city') ? val : parseNumericInput(val));
                if (val !== null && val !== '') state[key] = val;
            }
        });
        
        const calcData = getCalculationData();
        if (!calcData) return;

        const { loanAmount, ltv } = calcData;
        const rates = getInterestRates(ltv, state.fixation);
        const monthlyPayment = calculateMonthlyPayment(loanAmount, rates.likely, state.loanTerm);

        // Update displays
        elements.displays.monthlyPayment.textContent = formatCurrency(monthlyPayment);
        elements.displays.ltv.textContent = `${ltv.toFixed(1)}%`;
        elements.displays.loanAmount.textContent = formatCurrency(loanAmount);

        // Update DSTI if income is provided
        if (state.monthlyIncome > 0) {
            const dsti = ((monthlyPayment + state.monthlyLiabilities) / state.monthlyIncome) * 100;
            elements.displays.dsti.textContent = `${dsti.toFixed(1)}%`;
            elements.displays.dstiResult.classList.remove('hidden');
            
            let tip = "Vaše DSTI je v optimálním rozmezí.";
            let colors = 'glass-card';
            if (dsti > 50) {
                tip = "Vaše DSTI je vysoké. Banky obvykle vyžadují DSTI pod 50%.";
                colors = 'mt-8 p-6 bg-red-100 border border-red-300 rounded-lg text-center';
            } else if (dsti > 40) {
                tip = "Vaše DSTI je na hranici. Některé banky mohou být opatrnější.";
                colors = 'mt-8 p-6 bg-yellow-100 border border-yellow-300 rounded-lg text-center';
            }
            elements.displays.dstiTip.textContent = tip;
            elements.displays.dstiResult.className = colors;
        } else {
            elements.displays.dstiResult.classList.add('hidden');
        }
    }

    function generateAnalysis(selectedOfferIndex = 1) {
        const calcData = getCalculationData();
        if (!calcData) return;

        const { loanAmount, ltv } = calcData;
        const rates = getInterestRates(ltv, state.fixation);
        const offers = [
            { name: "Nejlepší nabídka", rate: rates.best, benefit: "Pro klienty s nejlepší bonitou", color: "from-green-400 to-green-600" },
            { name: "Pravděpodobná nabídka", rate: rates.likely, benefit: "Nejčastější scénář", color: "from-blue-400 to-blue-600" },
            { name: "Konzervativní odhad", rate: rates.worst, benefit: "Bezpečný odhad", color: "from-orange-400 to-orange-600" },
        ];

        // Generate offer cards
        document.getElementById('analysis-results').innerHTML = offers.map((offer, index) => {
            const monthlyPayment = calculateMonthlyPayment(loanAmount, offer.rate, state.loanTerm);
            const isSelected = index === selectedOfferIndex;
            const selectedClass = isSelected ? 'selected' : '';
            // Změněný banner text - motivační místo zavádějícího "doporučeno"
            const topBanner = index === 1 ? '<div class="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-400 to-red-500 text-white px-4 py-1 rounded-full text-sm font-bold">ZDARMA KONZULTACE</div>' : '';
            
            return `<div class="offer-card ${selectedClass} relative border-2 rounded-2xl p-8" data-offer-index="${index}">
                    ${topBanner}
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

        // Generate metrics and chart for selected offer
        const selectedOffer = offers[selectedOfferIndex];
        const monthlyPayment = calculateMonthlyPayment(loanAmount, selectedOffer.rate, state.loanTerm);
        const totalPaid = monthlyPayment * 12 * state.loanTerm;
        const totalInterest = totalPaid - loanAmount;
        const firstPaymentInterest = loanAmount * ((selectedOffer.rate / 100) / 12);

        // Calculate balance after fixation period
        let balance = loanAmount;
        const monthlyRate = (selectedOffer.rate / 100) / 12;
        for (let i = 0; i < state.fixation * 12; i++) {
            const interestPayment = balance * monthlyRate;
            const principalPayment = monthlyPayment - interestPayment;
            balance -= principalPayment;
            if (balance < 0) balance = 0;
        }

        // Update key metrics
        document.getElementById('key-metrics').innerHTML = `
            <div class="bg-white bg-opacity-20 p-4 rounded-xl">
                <div class="flex justify-between items-center">
                    <span class="font-semibold text-white">Výše úvěru:</span>
                    <span class="font-bold text-white">${formatCurrency(loanAmount)}</span>
                </div>
            </div>
            <div class="bg-white bg-opacity-20 p-4 rounded-xl">
                <div class="flex justify-between items-center">
                    <span class="font-semibold text-white">Celkem zaplaceno:</span>
                    <span class="font-bold text-white">${formatCurrency(totalPaid)}</span>
                </div>
            </div>
            <div class="bg-red-500 bg-opacity-20 p-4 rounded-xl border border-red-300">
                <div class="flex justify-between items-center">
                    <span class="font-semibold text-red-100">Přeplatek na úrocích:</span>
                    <span class="font-bold text-red-100">${formatCurrency(totalInterest)}</span>
                </div>
            </div>
            <hr class="my-2 border-white border-opacity-20">
            <p class="text-sm text-blue-100"><span class="font-semibold">Rozpad 1. splátky:</span><br>
            ${formatCurrency(monthlyPayment - firstPaymentInterest)} (jistina) + ${formatCurrency(firstPaymentInterest)} (úrok)</p>
            <p class="text-blue-100"><span class="font-semibold">Zůstatek po fixaci (${state.fixation} let):</span><br>
            <span class="font-bold text-white">${formatCurrency(balance)}</span></p>
        `;

        // Generate AI recommendation
        let recommendation = '';
        if (ltv < 80) {
            recommendation = `S LTV ${ltv.toFixed(1)}% máte vynikající výchozí pozici. Dosáhnete na nejlepší úrokové sazby na trhu.`;
        } else if (ltv < 90) {
            recommendation = `Vaše LTV je ${ltv.toFixed(1)}%. Stále máte na výběr z mnoha kvalitních nabídek, i když sazby mohou být mírně vyšší.`;
        } else {
            recommendation = `LTV ve výši ${ltv.toFixed(1)}% znamená omezenější nabídku a vyšší sazby. Doporučujeme zvážit navýšení vlastních zdrojů.`;
        }
        
        document.getElementById('ai-recommendation').textContent = recommendation;
        
        // Generate chart - OPRAVENÝ graf bez rolování
        generateLoanChart(loanAmount, selectedOffer.rate, state.loanTerm);
    }

    // OPRAVENÁ funkce pro graf - pevná výška, bez automatického rolování
    function generateLoanChart(principal, annualRate, years) {
        const canvas = document.getElementById('loanChart');
        const ctx = canvas.getContext('2d');
        
        // Nastavit pevnou výška canvasu
        canvas.style.height = '300px';
        
        const { balances, labels } = generateAmortizationData(principal, annualRate, years);

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
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(255, 255, 255, 1)',
                    pointBorderColor: 'rgba(255, 255, 255, 1)',
                    pointHoverBackgroundColor: 'rgba(255, 255, 255, 1)',
                    pointHoverBorderColor: 'rgba(255, 255, 255, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // KLÍČOVÉ - zabrání změně velikosti
                interaction: {
                    intersect: false
                },
                animation: {
                    duration: 1000
                },
                plugins: { 
                    legend: { 
                        display: false 
                    } 
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Roky',
                            color: 'rgba(255, 255, 255, 0.8)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.8)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Zůstatek úvěru',
                            color: 'rgba(255, 255, 255, 0.8)'
                        },
                        ticks: {
                            callback: value => formatCurrency(value),
                            color: 'rgba(255, 255, 255, 0.8)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    // --- AI CHAT FUNCTIONS ---
    function addChatMessage(content, sender, isHtml = false) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`;
        
        if (sender === 'ai') {
            const header = document.createElement('div');
            header.className = 'flex items-center gap-3 mb-3';
            header.innerHTML = `
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">🤖</div>
                <strong class="text-gray-700">AI Poradce</strong>
            `;
            bubble.appendChild(header);
        }
        
        const contentDiv = document.createElement('div');
        if (isHtml) {
            contentDiv.appendChild(content);
        } else {
            contentDiv.innerHTML = content.replace(/\n/g, '<br>');
        }
        bubble.appendChild(contentDiv);
        
        elements.chat.window.appendChild(bubble);
        // OPRAVENÉ - bez automatického scrollování, které způsobuje problémy
        // bubble.scrollIntoView({ behavior: "smooth", block: "end" });
        
        // Místo toho pouze scrollovat chat okno dolů
        elements.chat.window.scrollTop = elements.chat.window.scrollHeight;
        
        return bubble;
    }

    function renderSuggestions(suggestions = []) {
        elements.chat.suggestions.innerHTML = '';
        if (suggestions.length > 0) {
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
    }

    function createResultVisualInChat(calcData) {
        const container = document.createElement('div');
        container.className = 'mt-4';
        const rates = getInterestRates(calcData.ltv, state.fixation);
        
        container.innerHTML = `
            <div class="bg-white rounded-xl p-6 shadow-lg">
                <h4 class="font-bold text-xl mb-4 text-center text-gray-800">Přehled variant pro váš úvěr</h4>
                <div class="space-y-4">
                    ${Object.entries(rates).map(([type, rate]) => {
                        const monthlyPayment = calculateMonthlyPayment(calcData.loanAmount, rate, state.loanTerm);
                        const typeLabel = type === 'best' ? 'Nejlepší' : (type === 'likely' ? 'Pravděpodobná' : 'Konzervativní');
                        return `
                            <div class="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                                <div>
                                    <p class="font-bold text-lg">${typeLabel}</p>
                                    <p class="text-sm text-gray-600">${rate.toFixed(2)}% p.a.</p>
                                </div>
                                <p class="text-xl font-bold text-blue-600">${formatCurrency(monthlyPayment)}</p>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="mt-4 text-center">
                    <button onclick="window.switchToCalculatorAnalysis()" class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition">
                        Zobrazit detailní analýzu
                    </button>
                </div>
            </div>
        `;
        
        addChatMessage(container, 'ai', true);
    }

    async function handleChatSubmit() {
        const userMessage = elements.chat.input.value.trim();
        if (!userMessage) return;

        addChatMessage(userMessage, 'user');
        elements.chat.input.value = '';
        renderSuggestions([]);
        
        const thinkingBubble = addChatMessage('<span class="thinking-dots">Přemýšlím</span>', 'ai');
        
        updateCalculations();
        
        try {
            const response = await fetch('/.netlify/functions/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userMessage,
                    state,
                    aiConversationState
                })
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }
            
            const aiResponse = await response.json();

            // Update state if AI provided updates
            if (aiResponse.updateState) {
                Object.assign(state, aiResponse.updateState);
                Object.keys(aiResponse.updateState).forEach(key => {
                    if (elements.inputs[key]) {
                        elements.inputs[key].value = state[key];
                    }
                });
                updateCalculations();
            }
            
            // Update thinking bubble with response
            thinkingBubble.innerHTML = thinkingBubble.innerHTML.replace('<span class="thinking-dots">Přemýšlím</span>', '') + 
                                     (aiResponse.responseText || "Omlouvám se, nastala chyba.").replace(/\n/g, '<br>');
            
            // Show calculation results if requested
            if (aiResponse.performCalculation) {
                const calcData = getCalculationData();
                if (calcData && calcData.loanAmount > 0) {
                    createResultVisualInChat(calcData);
                } else {
                    addChatMessage("Bohužel chybí klíčové údaje pro výpočet. Zkuste prosím začít znovu.", 'ai');
                }
            }

            renderSuggestions(aiResponse.suggestions || []);
            if (aiResponse.conversationStep) aiConversationState.step = aiResponse.conversationStep;
            
            // Handle special commands
            if (userMessage.toLowerCase().includes('spojit se specialistou') || userMessage.toLowerCase().includes('kontakt')) {
                switchMode('calculator');
                currentStep = 5;
                updateUI();
            }

        } catch (error) {
            console.error("Error processing AI response:", error);
            // Fallback to simple responses
            const fallbackResponse = generateFallbackResponse(userMessage);
            thinkingBubble.innerHTML = thinkingBubble.innerHTML.replace('<span class="thinking-dots">Přemýšlím</span>', fallbackResponse.responseText);
            renderSuggestions(fallbackResponse.suggestions);
            
            if (fallbackResponse.performCalculation) {
                const calcData = getCalculationData();
                if (calcData && calcData.loanAmount > 0) {
                    setTimeout(() => createResultVisualInChat(calcData), 100);
                }
            }
        }
    }

    function generateFallbackResponse(userMessage) {
        const message = userMessage.toLowerCase();
        
        if (message.includes('spočítat') || message.includes('kalkulace') || message.includes('hypotéku')) {
            if (!state.monthlyIncome) {
                return {
                    responseText: 'Pro přesný výpočet hypotéky potřebuji pár základních údajů. Co plánujete?',
                    suggestions: ['Koupě bytu', 'Výstavba domu', 'Refinancování'],
                    performCalculation: false
                };
            } else {
                return {
                    responseText: 'Na základě vašich údajů jsem připravil výpočet hypotéky:',
                    suggestions: ['Změnit parametry', 'Začít znovu', 'Spojit se specialistou'],
                    performCalculation: true
                };
            }
        } else if (message.includes('sazby') || message.includes('úrok')) {
            return {
                responseText: 'Aktuální úrokové sazby se pohybují podle LTV a fixace:\n\n• Pro LTV do 80%: od 3.99% (5 let fixace)\n• Pro LTV do 90%: od 4.49% (5 let fixace)\n\nChcete spočítat konkrétní nabídku?',
                suggestions: ['Spočítat hypotéku', 'Více o sazbách', 'Jak snížit sazbu'],
                performCalculation: false
            };
        } else if (message.includes('specialista') || message.includes('kontakt')) {
            setTimeout(() => {
                switchMode('calculator');
                currentStep = 5;
                updateUI();
            }, 100);
            return {
                responseText: 'Skvělé! Přesunul jsem vás na formulář, kde můžete zadat kontaktní údaje. Náš specialista se vám brzy ozve s nejlepšími nabídkami.',
                suggestions: [],
                performCalculation: false
            };
        }
        
        return {
            responseText: 'Jsem tu, abych vám pomohl s hypotékou. Můžu vám spočítat hypotéku, poradit se sazbami nebo odpovědět na jakékoliv dotazy.',
            suggestions: ['Spočítat hypotéku', 'Aktuální sazby', 'Jak na refinancování'],
            performCalculation: false
        };
    }

    // --- EVENT LISTENERS ---
    elements.modeButtons.forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    elements.prevBtn.addEventListener('click', () => navigate(-1));
    elements.nextBtn.addEventListener('click', () => navigate(1));
    
    elements.intentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setIntent(btn.dataset.intent);
            navigate(1);
        });
    });

    // Add input listeners
    Object.values(elements.inputs).forEach(input => {
        if (input) {
            input.addEventListener('input', updateCalculations);
            input.addEventListener('change', updateCalculations);
        }
    });

    // Special handler for own resources percentage
    if (elements.inputs.ownResources) {
        elements.inputs.ownResources.addEventListener('blur', updateCalculations);
    }

    // Chat listeners
    elements.chat.sendBtn.addEventListener('click', handleChatSubmit);
    elements.chat.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatSubmit();
    });

    // Form submission
    elements.leadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const myForm = e.target;
        const formData = new FormData(myForm);
        
        fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData).toString(),
        })
        .then(() => {
            elements.leadForm.style.display = 'none';
            document.getElementById('form-success').classList.remove('hidden');
        })
        .catch((error) => {
            console.error('Form submission error:', error);
            alert('Nastala chyba při odesílání formuláře. Zkuste to prosím znovu.');
        });
    });

    // --- VYLEPŠENÉ LIVE COUNTER & STATISTICS ---
    function getDynamicUserCount() {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay(); // 0=neděle, 1=pondělí...
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        let baseUsers;
        
        if (isWeekend) {
            // Víkend - méně aktivní
            if (hour >= 10 && hour < 16) baseUsers = 12; // dopoledne/odpoledne
            else if (hour >= 16 && hour < 21) baseUsers = 18; // večer
            else baseUsers = 4; // noc/ráno
        } else {
            // Pracovní den
            if (hour >= 8 && hour < 10) baseUsers = 28; // ranní špička
            else if (hour >= 10 && hour < 17) baseUsers = 32; // pracovní doba
            else if (hour >= 17 && hour < 22) baseUsers = 25; // večer
            else if (hour >= 22 || hour < 6) baseUsers = 3; // noc
            else baseUsers = 8; // časné ráno
        }
        
        // Přidat náhodnou variaci ±3
        const randomFactor = Math.floor(Math.random() * 7) - 3;
        return Math.max(1, baseUsers + randomFactor);
    }

    function updateLiveUsers() {
        const count = getDynamicUserCount();
        const counter = document.getElementById('live-users-counter');
        if (counter) {
            counter.textContent = `${count} lidí právě počítá hypotéku`;
        }
    }

    // --- INITIALIZATION ---
    function initialize() {
        document.getElementById('last-updated').textContent = rateDatabase.lastUpdated.toLocaleDateString('cs-CZ');
        
        // Vylepšené live counter s dynamickou maticí
        updateLiveUsers();
        setInterval(updateLiveUsers, 3500); // Každé 3.5 sekundy

        // Statistiky s sessionStorage pro trvalost během session
        function updateStats() {
            document.getElementById('stats-mediated').textContent = `${(stats.mediated / 1000000000).toFixed(2)} mld Kč`;
            document.getElementById('stats-clients').textContent = stats.clients.toLocaleString('cs-CZ');
        }
        
        updateStats();

        setInterval(() => {
            // Realistické přírůstky
            stats.mediated += Math.floor(Math.random() * 75000) + 25000; // 25k-100k
            if (Math.random() > 0.8) stats.clients += 1; // 20% šance na nového klienta
            
            // Uložit do sessionStorage
            sessionStorage.setItem('statsMediated', stats.mediated);
            sessionStorage.setItem('statsClients', stats.clients);
            
            updateStats();
        }, 4000);

        // Initialize chat suggestions
        renderSuggestions(["Spočítat hypotéku", "Aktuální sazby", "Jak na refinancování"]);
        
        // Set initial intent
        setIntent('koupě');
        elements.intentButtons[0].classList.add('selected');
        
        // Initialize form values
        Object.keys(elements.inputs).forEach(key => {
            const el = elements.inputs[key];
            const val = state[key];
            if (el && val !== null && val !== undefined) {
                if (el.type === 'select-one') {
                    el.value = val;
                } else if (el.id === 'city') {
                    el.value = val;
                } else if (typeof val === 'number') {
                    el.value = new Intl.NumberFormat('cs-CZ', {useGrouping: false}).format(val);
                }
            }
        });
        
        updateUI();
        updateCalculations();
    }

    // Make functions globally accessible for inline event handlers
    window.switchMode = switchMode;
    window.switchToCalculatorAnalysis = function() {
        switchMode('calculator');
        currentStep = 4;
        updateUI();
    };

    initialize();
});