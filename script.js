// --- STATE MANAGEMENT ---
const state = {
    currentStep: 1, maxSteps: 5, mode: 'calculator', intent: null, propertyValue: 0,
    ownResources: 0, constructionCost: 0, landValue: 0, refinanceAmount: 0, extraLoan: 0,
    loanTerm: 30, monthlyIncome: 0, otherLoans: 0, loanAmount: 0, ltv: 0, monthlyPayment: 0,
    chartInstance: null, aiConversation: [], isAiThinking: false,
};

// --- DOM ELEMENT SELECTORS ---
const DOMElements = {
    headerWrapper: document.querySelector('.header-wrapper'),
    headerSpacer: document.getElementById('header-spacer'),
    calculatorModeDiv: document.getElementById('calculator-mode'),
    aiModeDiv: document.getElementById('ai-mode'),
    modeBtnCalculator: document.getElementById('mode-btn-calculator'),
    modeBtnAi: document.getElementById('mode-btn-ai'),
    stepContentWrapper: document.querySelector('.step-content-wrapper'),
    timelineSteps: document.querySelectorAll('.timeline-step'),
    timelineProgressBar: document.querySelector('.timeline-progress-bar .progress'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    navigationButtons: document.querySelector('.navigation-buttons'),
    infoModal: document.getElementById('info-modal'),
    infoModalTitle: document.getElementById('info-modal-title'),
    infoModalBody: document.getElementById('info-modal-body'),
    contactModal: document.getElementById('contact-modal'),
    contactFormWrapper: document.getElementById('contact-form-wrapper'),
    contactForm: document.getElementById('contact-form'),
    modalFormSuccess: document.getElementById('modal-form-success'),
    aiChatMessages: document.getElementById('ai-chat-messages'),
    aiChatSuggestions: document.getElementById('ai-chat-suggestions'),
    aiChatInput: document.getElementById('ai-chat-input'),
    aiChatSendBtn: document.getElementById('ai-chat-send'),
    aiSummary: document.getElementById('ai-summary'),
};

// --- UTILITY FUNCTIONS ---
const formatCurrency = (val) => val || val === 0 ? new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val) : '-- Kč';
const parseCurrency = (val) => Number(String(val).replace(/[^0-9\.]/g, '')) || 0;
const debounce = (func, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), delay); }; };

// --- CALCULATIONS ---
const calculateMonthlyPayment = (p, r, y) => { if (p <= 0 || r <= 0 || y <= 0) return 0; const mR = r / 100 / 12; const n = y * 12; return p * (mR * Math.pow(1 + mR, n)) / (Math.pow(1 + mR, n) - 1); };
const getInterestRate = () => { const baseRate = 5.09; let rate = baseRate; if (state.ltv > 80 && state.ltv <= 90) rate += 0.45; if (state.ltv > 90) rate += 0.70; return Math.max(3.99, rate); };

function performCalculations() {
    let loan = 0, pValue = state.propertyValue || 0;
    switch (state.intent) {
        case 'vystavba': pValue = (state.landValue || 0) + (state.constructionCost || 0); loan = pValue - (state.ownResources || 0); break;
        case 'refinancovani': loan = (state.refinancAmount || 0) + (state.extraLoan || 0); break;
        default: loan = pValue - (state.ownResources || 0); break;
    }
    state.loanAmount = loan > 0 ? loan : 0;
    state.ltv = pValue > 0 ? (state.loanAmount / pValue) * 100 : 0;
    const rate = getInterestRate();
    state.monthlyPayment = calculateMonthlyPayment(state.loanAmount, rate, state.loanTerm);
}
const debouncedCalculateAndUpdate = debounce(() => { performCalculations(); updateQuickCalc(); }, 300);

// --- UI RENDERING ---
function renderStepContent(step) {
    let html = `<div class="step-content">`;
    switch (step) {
        case 1: html += `<h2>Co plánujete?</h2><div class="intent-grid"><div class="intent-card" data-intent="koupe"><div class="intent-icon">🏡</div><h3>Koupě</h3></div><div class="intent-card" data-intent="vystavba"><div class="intent-icon">🏗️</div><h3>Výstavba</h3></div><div class="intent-card" data-intent="rekonstrukce"><div class="intent-icon">🛠️</div><h3>Rekonstrukce</h3></div><div class="intent-card" data-intent="refinancovani"><div class="intent-icon">🔄</div><h3>Refinancování</h3></div><div class="intent-card" data-intent="investice"><div class="intent-icon">📈</div><h3>Investice</h3></div></div>`; break;
        case 2: html += `<h2>Zadejte parametry</h2><div id="parameters-form-container" class="form-grid">${renderParametersForm()}</div><div class="quick-calc"><div>Odhadovaná měsíční splátka</div><div class="quick-calc-value" id="quick-calc-value">${formatCurrency(state.monthlyPayment)}</div></div>`; break;
        case 3: html += `<h2>Vaše finanční situace</h2><div class="form-grid-center"><div class="form-group"><label for="monthlyIncome">Čistý měsíční příjem</label><input type="text" id="monthlyIncome" class="form-group-input" placeholder="60 000 Kč" value="${state.monthlyIncome > 0 ? state.monthlyIncome.toLocaleString('cs-CZ') : ''}"></div><div class="form-group"><label for="otherLoans">Měsíční splátky jiných úvěrů</label><input type="text" id="otherLoans" class="form-group-input" value="${state.otherLoans > 0 ? state.otherLoans.toLocaleString('cs-CZ') : '0 Kč'}"></div></div>`; break;
        case 4: html += `<h2>Personalizovaná analýza</h2><p class="subtitle-center">Na základě vašich údajů jsme připravili 3 modelové scénáře.</p><div id="offers-container" class="offers-grid"></div><div class="analysis-details"><div id="metrics-container" class="metrics-card"></div><div class="chart-card"><h3>Průběh splácení</h3><canvas id="amortization-chart"></canvas></div></div>`; break;
        case 5: html += `<h2>Získejte kompletní srovnání zdarma</h2><p class="subtitle-center">Náš specialista vám do 24 hodin zašle finální nabídky a probere s vámi všechny detaily.</p><form id="final-contact-form" style="max-width: 450px; margin: 0 auto;"><div class="form-group"><label for="final-contact-name">Jméno a příjmení *</label><input type="text" id="final-contact-name" class="form-group-input" required></div><div class="form-group"><label for="final-contact-phone">Telefon *</label><input type="tel" id="final-contact-phone" class="form-group-input" required></div><div class="form-group"><label for="final-contact-email">E-mail *</label><input type="email" id="final-contact-email" class="form-group-input" required></div><button type="submit" class="btn-submit">Získat analýzu zdarma</button></form><div id="final-form-success" class="success-message hidden" style="margin-top:24px; max-width: 450px; margin-left: auto; margin-right: auto;"><h3>Děkujeme!</h3><p>Brzy se vám ozve náš specialista.</p></div>`; break;
    }
    html += `</div>`;
    return html;
}

function renderParametersForm() {
    const common = `<div class="form-group"><label for="loanTerm">Doba splatnosti</label><select id="loanTerm" class="form-group-select"><option value="30" ${state.loanTerm === 30 ? 'selected' : ''}>30 let</option><option value="25" ${state.loanTerm === 25 ? 'selected' : ''}>25 let</option><option value="20" ${state.loanTerm === 20 ? 'selected' : ''}>20 let</option></select></div>`;
    const val = (v) => v > 0 ? v.toLocaleString('cs-CZ') : '';
    let formHtml = '';
    switch (state.intent) {
        case 'vystavba': formHtml = `<div class="form-group"><label for="landValue">Hodnota pozemku</label><input type="text" id="landValue" class="form-group-input" placeholder="2 000 000 Kč" value="${val(state.landValue)}"></div><div class="form-group"><label for="constructionCost">Cena výstavby</label><input type="text" id="constructionCost" class="form-group-input" placeholder="4 000 000 Kč" value="${val(state.constructionCost)}"></div><div class="form-group"><label for="ownResources">Vlastní zdroje</label><input type="text" id="ownResources" class="form-group-input" placeholder="1 500 000 Kč" value="${val(state.ownResources)}"></div>${common}`; break;
        case 'refinancovani': formHtml = `<div class="form-group"><label for="propertyValue">Nová hodnota nemovitosti</label><input type="text" id="propertyValue" class="form-group-input" placeholder="6 000 000 Kč" value="${val(state.propertyValue)}"></div><div class="form-group"><label for="refinancAmount">Zbývá doplatit</label><input type="text" id="refinancAmount" class="form-group-input" placeholder="3 000 000 Kč" value="${val(state.refinancAmount)}"></div><div class="form-group"><label for="extraLoan">Chci půjčit navíc</label><input type="text" id="extraLoan" class="form-group-input" placeholder="0 Kč" value="${val(state.extraLoan)}"></div>${common}`; break;
        default: formHtml = `<div class="form-group"><label for="propertyValue">Cena nemovitosti</label><input type="text" id="propertyValue" class="form-group-input" placeholder="5 000 000 Kč" value="${val(state.propertyValue)}"></div><div class="form-group"><label for="ownResources">Vlastní zdroje</label><input type="text" id="ownResources" class="form-group-input" placeholder="1 000 000 Kč" value="${val(state.ownResources)}"></div>${common}`; break;
    }
    return formHtml;
}

function renderCurrentStep() {
    const current = DOMElements.stepContentWrapper.querySelector('.step-content.active');
    if (current) { current.classList.add('exiting'); current.addEventListener('transitionend', () => current.remove(), { once: true }); }
    DOMElements.stepContentWrapper.insertAdjacentHTML('beforeend', renderStepContent(state.currentStep));
    setTimeout(() => DOMElements.stepContentWrapper.querySelector('.step-content:last-child').classList.add('active'), 10);
}

function updateTimeline() {
    DOMElements.timelineProgressBar.style.width = `${((state.currentStep - 1) / (state.maxSteps - 1)) * 100}%`;
    DOMElements.timelineSteps.forEach((step, i) => {
        step.classList.toggle('active', (i + 1) === state.currentStep);
        step.classList.toggle('completed', (i + 1) < state.currentStep);
        step.querySelector('.step-circle').textContent = (i + 1) < state.currentStep ? '✓' : i + 1;
    });
}
function updateQuickCalc() { const el = document.getElementById('quick-calc-value'); if (el) el.textContent = formatCurrency(state.monthlyPayment); }

function renderAnalysis() {
    const offersContainer = document.getElementById('offers-container');
    const metricsContainer = document.getElementById('metrics-container');
    const baseRate = getInterestRate();
    const offers = [{ name: 'Nejvýhodnější sazba', rate: baseRate - 0.15, best: true }, { name: 'Optimální varianta', rate: baseRate, best: false }, { name: 'Nabídka s bonusem', rate: baseRate + 0.1, best: false }];
    offersContainer.innerHTML = offers.map(o => `<div class="offer-card ${o.best ? 'best-offer' : ''}"><h3>${o.name}</h3><div class="rate">${o.rate.toFixed(2)}%</div><div class="label">Měsíční splátka</div><div class="payment">${formatCurrency(calculateMonthlyPayment(state.loanAmount, o.rate, state.loanTerm))}</div></div>`).join('');
    const totalPaid = state.monthlyPayment * state.loanTerm * 12, totalInterest = totalPaid - state.loanAmount;
    metricsContainer.innerHTML = `<h3>Klíčové parametry</h3><div class="metric-item"><span>Výše úvěru:</span> <span class="metric-item-value">${formatCurrency(state.loanAmount)}</span></div><div class="metric-item"><span>LTV:</span> <span class="metric-item-value">${state.ltv.toFixed(1)} %</span></div><div class="metric-item"><span>Celkem zaplaceno:</span> <span class="metric-item-value">${formatCurrency(totalPaid)}</span></div><div class="metric-item"><span>Přeplatek na úrocích:</span> <span class="metric-item-value">${formatCurrency(totalInterest)}</span></div>`;
    generateAmortizationChart();
}

function generateAmortizationChart() {
    if (state.chartInstance) state.chartInstance.destroy();
    const canvas = document.getElementById('amortization-chart'); if (!canvas) return;
    const labels = [], data = []; let balance = state.loanAmount; const rate = getInterestRate(); const payment = calculateMonthlyPayment(state.loanAmount, rate, state.loanTerm);
    for (let y = 0; y <= state.loanTerm; y++) { labels.push(`Rok ${y}`); data.push(Math.round(balance)); if (y < state.loanTerm) { for (let m = 0; m < 12; m++) { const i = balance * (rate / 100 / 12); balance -= (payment - i); } } balance = Math.max(0, balance); } data[data.length - 1] = 0;
    state.chartInstance = new Chart(canvas, { type: 'line', data: { labels, datasets: [{ label: 'Zbývající dluh', data, borderColor: 'var(--primary-blue)', backgroundColor: 'var(--primary-blue-light)', fill: true, tension: 0.1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v) => formatCurrency(v / 1000) + 'k' } } } } });
}

// --- NAVIGATION & VALIDATION ---
function navigate(dir) {
    if (dir > 0 && !validateStep(state.currentStep)) { alert("Prosím, vyplňte správně všechna povinná pole."); return; }
    if (dir > 0 && state.currentStep === 3) performCalculations();
    const newStep = state.currentStep + dir;
    if (newStep > 0 && newStep <= state.maxSteps) {
        state.currentStep = newStep;
        renderCurrentStep(); updateTimeline(); updateNavigationButtons();
        if (state.currentStep === 4) setTimeout(renderAnalysis, 50);
    }
}

function validateStep(step) {
    switch (step) {
        case 1: return state.intent !== null;
        case 2:
            if (state.intent === 'refinancovani') return state.propertyValue > 0 && state.refinancAmount > 0;
            if (state.intent === 'vystavba') return state.landValue > 0 && state.constructionCost > 0;
            return state.propertyValue > 0 && state.propertyValue >= (state.ownResources || 0);
        case 3: return parseCurrency(document.getElementById('monthlyIncome').value) > 0;
        default: return true;
    }
}
function updateNavigationButtons() { DOMElements.prevBtn.classList.toggle('hidden', state.currentStep === 1); DOMElements.nextBtn.textContent = state.currentStep === 4 ? 'Zobrazit finální krok' : (state.currentStep === 3 ? 'Spočítat analýzu' : 'Další →'); DOMElements.navigationButtons.style.display = state.currentStep === state.maxSteps ? 'none' : 'flex'; }

// --- AI CHAT ---
function initAiChat() {
    DOMElements.aiChatMessages.innerHTML = '';
    const welcomeText = "Dobrý den! Jsem váš osobní hypoteční asistent. Jak vám mohu pomoci s financováním bydlení?";
    addMessageToChat('ai', welcomeText);
    state.aiConversation.push({ role: 'model', parts: [{ text: welcomeText }] });
    renderAiSuggestions(['Chci koupit byt', 'Potřebuji refinancovat', 'Jaké jsou úrokové sazby?']);
    updateAiSummary();
}
async function sendAiChatMessage() {
    const userMessage = DOMElements.aiChatInput.value.trim();
    if (!userMessage || state.isAiThinking) return;
    state.isAiThinking = true; DOMElements.aiChatInput.value = ''; DOMElements.aiChatSendBtn.disabled = true; renderAiSuggestions([]);
    addMessageToChat('user', userMessage);
    state.aiConversation.push({ role: 'user', parts: [{ text: userMessage }] });
    try {
        const res = await fetch('/netlify/functions/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation: state.aiConversation, state }) });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const aiData = await res.json();
        state.aiConversation.push({ role: 'model', parts: [{ text: aiData.responseText }] });
        addMessageToChat('ai', aiData.responseText);
        if (aiData.updateState) { Object.assign(state, aiData.updateState); updateAiSummary(); }
        renderAiSuggestions(aiData.suggestions);
    } catch (error) { console.error("AI Chat Error:", error); addMessageToChat('ai', "Omlouvám se, došlo k technické chybě."); }
    finally { state.isAiThinking = false; DOMElements.aiChatSendBtn.disabled = false; DOMElements.aiChatInput.focus(); }
}
function addMessageToChat(sender, text) { const el = document.createElement('div'); el.className = `message message-${sender}`; el.innerHTML = `<div class="message-icon">${sender === 'ai' ? '🤖' : '👤'}</div><div class="message-content">${text.replace(/\n/g, '<br>')}</div>`; DOMElements.aiChatMessages.appendChild(el); DOMElements.aiChatMessages.scrollTop = DOMElements.aiChatMessages.scrollHeight; }
function renderAiSuggestions(suggs = []) { DOMElements.aiChatSuggestions.innerHTML = suggs.map(s => `<button class="suggestion-btn">${s}</button>`).join(''); }
function updateAiSummary() {
    let html = '';
    if (state.intent) html += `<div class="metric-item"><span>Záměr:</span> <span class="metric-item-value">${state.intent}</span></div>`;
    if (state.propertyValue) html += `<div class="metric-item"><span>Cena:</span> <span class="metric-item-value">${formatCurrency(state.propertyValue)}</span></div>`;
    if (state.ownResources) html += `<div class="metric-item"><span>Vlastní zdroje:</span> <span class="metric-item-value">${formatCurrency(state.ownResources)}</span></div>`;
    if (state.refinancAmount) html += `<div class="metric-item"><span>Refinancování:</span> <span class="metric-item-value">${formatCurrency(state.refinancAmount)}</span></div>`;
    DOMElements.aiSummary.innerHTML = html || '<p>Zatím nemáme dostatek údajů.</p>';
}

// --- MODALS ---
function showModal(modal) { modal.classList.remove('hidden'); }
function hideModal(modal) { modal.classList.add('hidden'); }
function showInfoModal(title, content) { DOMElements.infoModalTitle.textContent = title; DOMElements.infoModalBody.innerHTML = content; showModal(DOMElements.infoModal); }

// --- EVENT LISTENERS & INITIALIZATION ---
function initialize() {
    renderCurrentStep(); updateTimeline(); updateNavigationButtons();
    DOMElements.headerSpacer.style.height = DOMElements.headerWrapper.offsetHeight + 'px';
    window.addEventListener('scroll', () => document.body.classList.toggle('scrolled', window.scrollY > 50));
    
    // Global listeners
    DOMElements.modeBtnCalculator.addEventListener('click', handleModeSwitch);
    DOMElements.modeBtnAi.addEventListener('click', handleModeSwitch);
    DOMElements.prevBtn.addEventListener('click', () => navigate(-1));
    DOMElements.nextBtn.addEventListener('click', () => navigate(1));
    DOMElements.stepContentWrapper.addEventListener('click', handleIntentSelection);
    DOMElements.stepContentWrapper.addEventListener('input', handleFormInput);
    DOMElements.stepContentWrapper.addEventListener('focusout', handleFormBlur);
    DOMElements.stepContentWrapper.addEventListener('submit', handleFinalFormSubmit);
    DOMElements.aiChatSendBtn.addEventListener('click', sendAiChatMessage);
    DOMElements.aiChatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAiChatMessage(); });
    DOMElements.aiChatSuggestions.addEventListener('click', (e) => { if (e.target.classList.contains('suggestion-btn')) { DOMElements.aiChatInput.value = e.target.textContent; sendAiChatMessage(); } });
    
    // Modals
    document.querySelectorAll('.modal-overlay').forEach(m => { m.addEventListener('click', (e) => { if (e.target === m) hideModal(m); }); m.querySelector('.modal-close-btn').addEventListener('click', () => hideModal(m)); });
    DOMElements.contactForm.addEventListener('submit', e => { e.preventDefault(); DOMElements.contactFormWrapper.style.display = 'none'; DOMElements.modalFormSuccess.classList.remove('hidden'); });
    const modalContent = { about: `<p>Jsme tým certifikovaných finančních specialistů a technologických inovátorů... Spojením lidské expertízy a AI přinášíme transparentní, rychlé a výhodné řešení financování bydlení.</p>`, gdpr: `<h4>Zásady ochrany osobních údajů (GDPR)</h4><p>Vaše soukromí je naší prioritou. Veškeré osobní údaje jsou zpracovávány v souladu s nařízením (EU) 2016/679 (GDPR) a slouží výhradně k přípravě hypoteční analýzy...</p>` };
    document.getElementById('nav-about').addEventListener('click', (e) => { e.preventDefault(); showInfoModal('O nás', modalContent.about); });
    document.getElementById('footer-about').addEventListener('click', (e) => { e.preventDefault(); showInfoModal('O nás', modalContent.about); });
    document.getElementById('footer-gdpr').addEventListener('click', (e) => { e.preventDefault(); showInfoModal('Ochrana osobních údajů', modalContent.gdpr); });
    document.getElementById('nav-contact').addEventListener('click', (e) => { e.preventDefault(); showModal(DOMElements.contactModal); });
}

function handleModeSwitch(e) {
    state.mode = e.currentTarget.id === 'mode-btn-calculator' ? 'calculator' : 'ai';
    DOMElements.calculatorModeDiv.classList.toggle('hidden', state.mode !== 'calculator');
    DOMElements.aiModeDiv.classList.toggle('hidden', state.mode !== 'ai');
    DOMElements.modeBtnCalculator.classList.toggle('active', state.mode === 'calculator');
    DOMElements.modeBtnAi.classList.toggle('active', state.mode === 'ai');
    if (state.mode === 'ai' && state.aiConversation.length === 0) initAiChat();
}

function handleIntentSelection(e) {
    const card = e.target.closest('.intent-card'); if (!card) return;
    state.intent = card.dataset.intent;
    Object.assign(state, { propertyValue: 0, ownResources: 0, constructionCost: 0, landValue: 0, refinanceAmount: 0, extraLoan: 0, loanAmount: 0, ltv: 0, monthlyPayment: 0 });
    setTimeout(() => navigate(1), 200);
}

function handleFormInput(e) {
    if (e.target.matches('input[type="text"]')) {
        const key = e.target.id; const value = parseCurrency(e.target.value);
        if (key in state) state[key] = value;
        e.target.value = value.toLocaleString('cs-CZ');
        debouncedCalculateAndUpdate();
    } else if (e.target.matches('select')) {
        state.loanTerm = Number(e.target.value); performCalculations(); updateQuickCalc();
    }
}

function handleFormBlur(e) {
    if (e.target.matches('input[type="text"]')) {
        const key = e.target.id;
        if (key in state) e.target.value = formatCurrency(state[key]);
        else e.target.value = formatCurrency(parseCurrency(e.target.value));
    }
}

function handleFinalFormSubmit(e) {
    if (e.target.id === 'final-contact-form') {
        e.preventDefault();
        e.target.style.display = 'none';
        document.getElementById('final-form-success').classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', initialize);
