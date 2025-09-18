// Hypotéka AI - Production Ready Script
// Version 1.0.0

// Strict mode pro lepší error handling
'use strict';

// Konfigurace
const CONFIG = {
    API_ENDPOINT: '/.netlify/functions/gemini',
    BANKS: [
        { id: 'cs', name: 'Česká spořitelna', rates: { 1: 5.29, 3: 4.59, 5: 4.39, 7: 4.49, 10: 4.69 } },
        { id: 'csob', name: 'ČSOB', rates: { 1: 5.19, 3: 4.49, 5: 4.29, 7: 4.39, 10: 4.59 } },
        { id: 'kb', name: 'Komerční banka', rates: { 1: 5.39, 3: 4.69, 5: 4.49, 7: 4.59, 10: 4.79 } },
        { id: 'uni', name: 'UniCredit', rates: { 1: 5.09, 3: 4.39, 5: 4.19, 7: 4.29, 10: 4.49 } },
        { id: 'rb', name: 'Raiffeisenbank', rates: { 1: 5.24, 3: 4.54, 5: 4.34, 7: 4.44, 10: 4.64 } },
        { id: 'hb', name: 'Hypoteční banka', rates: { 1: 4.99, 3: 4.29, 5: 4.09, 7: 4.19, 10: 4.39 } }
    ],
    CALCULATION_DEFAULTS: {
        loanTerm: 25,
        fixation: 5,
        minLTV: 0,
        maxLTV: 100,
        optimalLTV: 80,
        dstiLimit: 50,
        dstiWarning: 45
    },
    DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 300
};

// Hlavní aplikační objekt
class HypotekaAI {
    constructor() {
        this.state = {
            currentStep: 1,
            calculation: {},
            selectedBank: null,
            isLoading: false,
            chatHistory: []
        };
        
        this.init();
    }
    
    init() {
        console.log('🏡 Hypotéka AI - Initializing...');
        
        // Načtení uložených dat
        this.loadSavedData();
        
        // Inicializace event listenerů
        this.setupEventListeners();
        
        // Inicializace komponent
        this.initComponents();
        
        // Kontrola dostupnosti API
        this.checkApiStatus();
        
        console.log('✅ Hypotéka AI - Ready');
    }
    
    loadSavedData() {
        try {
            const saved = localStorage.getItem('hypotekaCalculation');
            if (saved) {
                this.state.calculation = JSON.parse(saved);
                this.updateUI();
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }
    
    saveData() {
        try {
            localStorage.setItem('hypotekaCalculation', JSON.stringify(this.state.calculation));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }
    
    setupEventListeners() {
        // Form inputs s debouncing
        const inputs = ['propertyPrice', 'downPayment', 'monthlyIncome', 'loanAmount'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', this.debounce(() => {
                    this.handleInputChange(id, element.value);
                }, CONFIG.DEBOUNCE_DELAY));
                
                // Format on blur
                element.addEventListener('blur', () => {
                    this.formatCurrency(element);
                });
            }
        });
        
        // Select elementy
        const selects = ['loanTerm', 'fixation', 'purpose'];
        selects.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.handleSelectChange(id, element.value);
                });
            }
        });
        
        // Tlačítka
        const calculateBtn = document.getElementById('calculateBtn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculate());
        }
        
        // AI Chat
        const chatInput = document.getElementById('chatInput');
        const chatSend = document.getElementById('chatSend');
        
        if (chatInput && chatSend) {
            chatSend.addEventListener('click', () => this.sendChatMessage());
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });
        }
        
        // Timeline steps
        document.querySelectorAll('.timeline-step').forEach(step => {
            step.addEventListener('click', () => {
                const stepNum = parseInt(step.dataset.step);
                if (stepNum <= this.state.currentStep) {
                    this.goToStep(stepNum);
                }
            });
        });
        
        // Mobile menu
        const mobileToggle = document.getElementById('mobileMenuToggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                document.getElementById('mobileMenu')?.classList.toggle('active');
            });
        }
    }
    
    initComponents() {
        // Smooth scroll pro anchory
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        });
        
        // Lazy loading obrázků
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.add('loaded');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
    
    handleInputChange(field, value) {
        // Parsování hodnoty
        const numValue = this.parseNumber(value);
        
        // Aktualizace state
        this.state.calculation[field] = numValue;
        
        // Real-time výpočty
        this.performCalculations();
        
        // Uložení
        this.saveData();
        
        // Update UI
        this.updateUI();
    }
    
    handleSelectChange(field, value) {
        this.state.calculation[field] = value;
        this.performCalculations();
        this.saveData();
        this.updateUI();
    }
    
    performCalculations() {
        const calc = this.state.calculation;
        
        // Výpočet výše úvěru
        if (calc.propertyPrice && calc.downPayment) {
            calc.loanAmount = Math.max(0, calc.propertyPrice - calc.downPayment);
            calc.ltv = (calc.loanAmount / calc.propertyPrice * 100).toFixed(1);
        }
        
        // Výpočet měsíční splátky
        if (calc.loanAmount && calc.loanTerm && calc.fixation) {
            const rate = this.getInterestRate(calc.ltv, calc.fixation);
            calc.interestRate = rate;
            calc.monthlyPayment = this.calculateMonthlyPayment(
                calc.loanAmount,
                rate,
                calc.loanTerm
            );
        }
        
        // DSTI výpočet
        if (calc.monthlyPayment && calc.monthlyIncome) {
            calc.dsti = ((calc.monthlyPayment / calc.monthlyIncome) * 100).toFixed(1);
        }
    }
    
    getInterestRate(ltv, fixation) {
        // Průměrná sazba z bank
        let totalRate = 0;
        let count = 0;
        
        CONFIG.BANKS.forEach(bank => {
            if (bank.rates[fixation]) {
                let rate = bank.rates[fixation];
                
                // LTV adjustment
                if (ltv > 90) rate += 0.5;
                else if (ltv > 80) rate += 0.2;
                else if (ltv < 70) rate -= 0.1;
                
                totalRate += rate;
                count++;
            }
        });
        
        return count > 0 ? totalRate / count : 4.5;
    }
    
    calculateMonthlyPayment(principal, annualRate, years) {
        const monthlyRate = annualRate / 100 / 12;
        const n = years * 12;
        
        if (monthlyRate === 0) return principal / n;
        
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / 
               (Math.pow(1 + monthlyRate, n) - 1);
    }
    
    async calculate() {
        // Validace
        if (!this.validateForm()) return;
        
        // Loading state
        this.setLoading(true);
        
        try {
            // Získání nabídek
            const offers = this.generateOffers();
            
            // Zobrazení výsledků
            this.displayResults(offers);
            
            // Přechod na další krok
            this.goToStep(2);
            
            // Analytics
            this.trackEvent('calculation_complete', {
                loanAmount: this.state.calculation.loanAmount,
                ltv: this.state.calculation.ltv
            });
            
        } catch (error) {
            console.error('Calculation error:', error);
            this.showNotification('Chyba při výpočtu. Zkuste to prosím znovu.', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    generateOffers() {
        const calc = this.state.calculation;
        const offers = [];
        
        CONFIG.BANKS.forEach(bank => {
            if (bank.rates[calc.fixation]) {
                let rate = bank.rates[calc.fixation];
                
                // Adjust for LTV
                if (calc.ltv > 90) rate += 0.5;
                else if (calc.ltv > 80) rate += 0.2;
                else if (calc.ltv < 70) rate -= 0.1;
                
                const monthlyPayment = this.calculateMonthlyPayment(
                    calc.loanAmount,
                    rate,
                    calc.loanTerm
                );
                
                offers.push({
                    bankId: bank.id,
                    bankName: bank.name,
                    rate: rate,
                    monthlyPayment: monthlyPayment,
                    totalPaid: monthlyPayment * calc.loanTerm * 12,
                    overpayment: (monthlyPayment * calc.loanTerm * 12) - calc.loanAmount
                });
            }
        });
        
        // Sort by rate
        offers.sort((a, b) => a.rate - b.rate);
        
        return offers;
    }
    
    displayResults(offers) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;
        
        // Clear previous results
        container.innerHTML = '';
        
        // Display top 3 offers
        offers.slice(0, 3).forEach((offer, index) => {
            const card = this.createOfferCard(offer, index === 0);
            container.appendChild(card);
        });
        
        // Show results section
        document.getElementById('resultsSection')?.classList.remove('hidden');
        
        // Scroll to results
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    createOfferCard(offer, isRecommended) {
        const card = document.createElement('div');
        card.className = `result-card ${isRecommended ? 'recommended' : ''}`;
        
        card.innerHTML = `
            <div class="bank-header">
                <h3>${offer.bankName}</h3>
                ${isRecommended ? '<span class="badge-recommended">Doporučujeme</span>' : ''}
            </div>
            <div class="rate-display">
                <span class="rate-value">${offer.rate.toFixed(2)}%</span>
                <span class="rate-label">úrok p.a.</span>
            </div>
            <div class="payment-display">
                <span class="payment-value">${this.formatNumber(offer.monthlyPayment)} Kč</span>
                <span class="payment-label">měsíčně</span>
            </div>
            <div class="offer-details">
                <div class="detail-row">
                    <span>Celkem zaplatíte:</span>
                    <span>${this.formatNumber(offer.totalPaid)} Kč</span>
                </div>
                <div class="detail-row">
                    <span>Přeplatek:</span>
                    <span class="text-danger">${this.formatNumber(offer.overpayment)} Kč</span>
                </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="app.selectOffer('${offer.bankId}')">
                Vybrat tuto nabídku
            </button>
        `;
        
        return card;
    }
    
    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input?.value.trim();
        
        if (!message) return;
        
        // Clear input
        input.value = '';
        
        // Add user message
        this.addChatMessage(message, 'user');
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Call AI API
            const response = await this.callAIChat(message);
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Add AI response
            this.addChatMessage(response, 'ai');
            
        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addChatMessage('Omlouvám se, došlo k chybě. Zkuste to prosím znovu.', 'ai');
        }
    }
    
    async callAIChat(message) {
        // Pokud API není dostupné, použít lokální odpovědi
        if (!navigator.onLine) {
            return this.getLocalResponse(message);
        }
        
        try {
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    context: this.state.calculation
                })
            });
            
            if (!response.ok) throw new Error('API error');
            
            const data = await response.json();
            return data.response;
            
        } catch (error) {
            // Fallback na lokální odpovědi
            return this.getLocalResponse(message);
        }
    }
    
    getLocalResponse(message) {
        const msg = message.toLowerCase();
        
        if (msg.includes('sazb') || msg.includes('úrok')) {
            return 'Aktuální úrokové sazby se pohybují od 4.09% do 5.49% v závislosti na fixaci a bonitě klienta.';
        }
        
        if (msg.includes('kolik')) {
            return 'Maximální výše hypotéky závisí na vašich příjmech. Obecně banky půjčují až 9-násobek ročního příjmu při splnění DSTI limitu 50%.';
        }
        
        return 'Děkuji za váš dotaz. Pro přesnou odpověď prosím vyplňte kalkulačku nebo kontaktujte našeho specialistu.';
    }
    
    addChatMessage(message, sender) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message message-${sender}`;
        messageDiv.textContent = message;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        
        document.getElementById('chatMessages')?.appendChild(indicator);
    }
    
    hideTypingIndicator() {
        document.getElementById('typingIndicator')?.remove();
    }
    
    selectOffer(bankId) {
        this.state.selectedBank = bankId;
        this.saveData();
        
        // Přechod na kontaktní formulář
        this.goToStep(3);
        
        // Analytics
        this.trackEvent('offer_selected', { bankId });
    }
    
    goToStep(stepNumber) {
        this.state.currentStep = stepNumber;
        
        // Update timeline
        document.querySelectorAll('.timeline-step').forEach(step => {
            const num = parseInt(step.dataset.step);
            step.classList.toggle('active', num === stepNumber);
            step.classList.toggle('completed', num < stepNumber);
        });
        
        // Show/hide sections
        document.querySelectorAll('[data-step]').forEach(section => {
            const num = parseInt(section.dataset.step);
            section.classList.toggle('hidden', num !== stepNumber);
        });
    }
    
    validateForm() {
        const errors = [];
        const calc = this.state.calculation;
        
        if (!calc.propertyPrice) errors.push('Zadejte cenu nemovitosti');
        if (!calc.monthlyIncome) errors.push('Zadejte měsíční příjem');
        
        if (errors.length > 0) {
            this.showNotification(errors.join('<br>'), 'error');
            return false;
        }
        
        return true;
    }
    
    updateUI() {
        const calc = this.state.calculation;
        
        // Update summary
        const elements = {
            'summaryLoan': calc.loanAmount ? this.formatNumber(calc.loanAmount) + ' Kč' : '--',
            'summaryLTV': calc.ltv ? calc.ltv + '%' : '--',
            'summaryPayment': calc.monthlyPayment ? this.formatNumber(calc.monthlyPayment) + ' Kč' : '--',
            'summaryDSTI': calc.dsti ? calc.dsti + '%' : '--'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
        
        // Update DSTI indicator
        if (calc.dsti) {
            const indicator = document.getElementById('dstiIndicator');
            if (indicator) {
                const status = calc.dsti < 40 ? 'good' : calc.dsti < 45 ? 'warning' : 'danger';
                indicator.className = `dsti-indicator dsti-${status}`;
            }
        }
    }
    
    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        
        const btn = document.getElementById('calculateBtn');
        if (btn) {
            btn.disabled = isLoading;
            btn.innerHTML = isLoading ? 
                '<span class="loading-spinner"></span> Počítám...' : 
                'Spočítat hypotéku';
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.innerHTML = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    checkApiStatus() {
        // Kontrola dostupnosti API
        fetch(CONFIG.API_ENDPOINT + '/health')
            .then(res => res.ok && console.log('✅ API is available'))
            .catch(() => console.log('⚠️ API offline - using local mode'));
    }
    
    trackEvent(event, params = {}) {
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', event, params);
        }
        
        // Console log pro development
        if (location.hostname === 'localhost') {
            console.log('📊 Event:', event, params);
        }
    }
    
    // Utility funkce
    formatNumber(num) {
        return Math.round(num).toLocaleString('cs-CZ');
    }
    
    parseNumber(str) {
        return parseInt(str.toString().replace(/\D/g, '')) || 0;
    }
    
    formatCurrency(input) {
        const value = this.parseNumber(input.value);
        if (value > 0) {
            input.value = this.formatNumber(value) + ' Kč';
        }
    }
    
    debounce(func, wait) {
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
}

// Inicializace aplikace
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HypotekaAI();
    
    // Expose pro debugging
    window.app = app;
});

// Service Worker pro offline podporu (pokud je potřeba)
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Export pro testování
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HypotekaAI;
}