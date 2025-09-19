// chat.js - AI Chat modul
// Hypotéka AI - Version 2.0

// Chat odpovědi databáze
const CHAT_RESPONSES = {
    greetings: [
        "Dobrý den! Jsem váš AI hypoteční poradce. Jak vám mohu pomoci?",
        "Vítejte! Rád vám pomohu s hypotékou. Co vás zajímá?",
        "Zdravím! Jsem tu pro všechny vaše dotazy ohledně hypotéky."
    ],
    
    patterns: [
        {
            keywords: ['kolik', 'půjčit', 'dostat', 'maximum'],
            response: `Maximální výše hypotéky závisí na několika faktorech:
• **Příjmy**: Banky obvykle půjčují 8-9 násobek ročního příjmu
• **DSTI**: Všechny splátky nesmí překročit 50% čistého příjmu
• **LTV**: Banky půjčují až 90% hodnoty nemovitosti
• **Věk**: Úvěr musí být splacen do 70 let

Pro přesný výpočet použijte naši kalkulačku.`
        },
        {
            keywords: ['sazba', 'úrok', 'procenta', 'sazby'],
            response: `Aktuální úrokové sazby (leden 2025):
• **3 roky fixace**: 4.29% - 4.79%
• **5 let fixace**: 4.09% - 4.59% (nejpopulárnější)
• **7 let fixace**: 4.19% - 4.69%
• **10 let fixace**: 4.39% - 4.89%

Konkrétní sazba závisí na LTV, bonitě a vybrané bance.`
        },
        {
            keywords: ['dsti', 'bonita', 'příjem'],
            response: `**DSTI (Debt Service to Income)** je klíčový ukazatel:
• Do 40% - výborná bonita ✅
• 40-45% - dobrá bonita ⚠️
• 45-50% - hraniční (limit ČNB)
• Nad 50% - hypotéka nebude schválena ❌

DSTI = (všechny měsíční splátky / čistý příjem) × 100`
        },
        {
            keywords: ['ltv', 'vlastní', 'zdroje'],
            response: `**LTV (Loan to Value)** ovlivňuje podmínky úvěru:
• Do 70% - nejlepší sazby
• 70-80% - standardní sazby
• 80-90% - vyšší sazby (+0.2-0.3%)
• Nad 90% - jen výjimečně

Čím více vlastních zdrojů, tím lepší podmínky.`
        },
        {
            keywords: ['refinanc', 'přefinanc'],
            response: `Refinancování se vyplatí když:
• Rozdíl sazeb je alespoň **0.5%**
• Do konce fixace zbývá **max 6 měsíců**
• Chcete změnit parametry úvěru

Můžete ušetřit tisíce Kč měsíčně!`
        },
        {
            keywords: ['fixace', 'doba', 'roky'],
            response: `Doporučená doba fixace:
• **3 roky** - flexibilita, ale vyšší sazba
• **5 let** - ideální kompromis (nejnižší sazby)
• **7-10 let** - jistota, ale vyšší sazba

Většina klientů volí 5letou fixaci.`
        },
        {
            keywords: ['poplatek', 'náklady', 'kolik stojí'],
            response: `Náklady spojené s hypotékou:
• **Poplatek za vyřízení**: 0-0.5% z úvěru
• **Odhad nemovitosti**: 3000-5000 Kč
• **Poplatek za čerpání**: 0-500 Kč
• **Vedení účtu**: 0-200 Kč/měsíc
• **Pojištění**: cca 0.3% z úvěru ročně`
        },
        {
            keywords: ['proces', 'jak dlouho', 'doba vyřízení'],
            response: `Časová osa vyřízení hypotéky:
1. **Předběžné posouzení**: 1-2 dny
2. **Příslib úvěru**: 3-5 dní
3. **Ocenění nemovitosti**: 3-5 dní
4. **Schválení**: 5-10 dní
5. **Podpis smlouvy**: 1-2 dny
6. **Čerpání**: dle kupní smlouvy

Celkem: **3-4 týdny**`
        },
        {
            keywords: ['dokumenty', 'doklady', 'potřebuju'],
            response: `Potřebné dokumenty:
• **Občanský průkaz**
• **Potvrzení o příjmech** (3 měsíce)
• **Výpisy z účtu** (3-6 měsíců)
• **Daňové přiznání** (OSVČ)
• **Kupní smlouva** / projekt
• **List vlastnictví**
• **Odhad nemovitosti**`
        },
        {
            keywords: ['pojištění', 'pojistit'],
            response: `Typy pojištění hypotéky:
• **Pojištění nemovitosti** - povinné ✅
• **Životní pojištění** - doporučené
• **Pojištění schopnosti splácet** - volitelné

Pojištění může snížit úrokovou sazbu o 0.1-0.2%.`
        }
    ],
    
    fallback: "Děkuji za váš dotaz. Pro přesnou odpověď doporučuji vyplnit naši kalkulačku nebo se zeptat konkrétněji. Mohu vám pomoci s výpočtem hypotéky, vysvětlit pojmy jako DSTI nebo LTV, nebo poradit s výběrem banky."
};

// Chat state
let chatHistory = [];
let isTyping = false;

// Inicializace chatu
export function initChat() {
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const suggestions = document.getElementById('chat-suggestions');
    
    if (!chatWindow) return;
    
    // Welcome message
    addMessage(CHAT_RESPONSES.greetings[0], 'ai');
    
    // Setup listeners
    if (chatSend) {
        chatSend.addEventListener('click', handleSendMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }
    
    // Add suggestions
    if (suggestions) {
        const quickQuestions = [
            'Kolik si můžu půjčit?',
            'Jaké jsou aktuální sazby?',
            'Co je to DSTI?',
            'Jaké dokumenty potřebuji?'
        ];
        
        suggestions.innerHTML = '';
        quickQuestions.forEach(question => {
            const btn = document.createElement('button');
            btn.className = 'px-4 py-2 bg-white rounded-lg text-sm hover:bg-blue-50 transition-colors border border-gray-200';
            btn.textContent = question;
            btn.onclick = () => {
                document.getElementById('chat-input').value = question;
                handleSendMessage();
            };
            suggestions.appendChild(btn);
        });
    }
}

// Odeslat zprávu
function handleSendMessage() {
    const input = document.getElementById('chat-input');
    const message = input?.value.trim();
    
    if (!message || isTyping) return;
    
    // Clear input
    input.value = '';
    
    // Add user message
    addMessage(message, 'user');
    
    // Show typing indicator
    showTyping();
    
    // Get response
    setTimeout(() => {
        const response = generateResponse(message);
        hideTyping();
        addMessage(response, 'ai');
    }, 1000 + Math.random() * 1000);
}

// Generovat odpověď
function generateResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // Najít odpovídající pattern
    for (const pattern of CHAT_RESPONSES.patterns) {
        const hasKeyword = pattern.keywords.some(keyword => 
            lowerMessage.includes(keyword)
        );
        
        if (hasKeyword) {
            return pattern.response;
        }
    }
    
    // Speciální případy
    if (lowerMessage.match(/ahoj|dobrý den|zdravím/)) {
        return CHAT_RESPONSES.greetings[Math.floor(Math.random() * CHAT_RESPONSES.greetings.length)];
    }
    
    if (lowerMessage.match(/děkuj|díky/)) {
        return "Rádo se stalo! Je ještě něco, s čím vám mohu pomoci?";
    }
    
    // Fallback response
    return CHAT_RESPONSES.fallback;
}

// Přidat zprávu do chatu
function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-bubble chat-bubble-${sender} animate-slideIn`;
    
    if (sender === 'ai') {
        // Parse markdown-like formatting
        text = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/• /g, '<br>• ')
            .replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = `
            <div class="flex items-start gap-3 mb-2">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span class="text-white text-sm">🤖</span>
                </div>
                <div>
                    <strong class="text-gray-700 text-sm">AI Hypoteční Poradce</strong>
                    <div class="mt-1 text-gray-800">${text}</div>
                </div>
            </div>
        `;
    } else {
        messageDiv.textContent = text;
    }
    
    chatWindow.appendChild(messageDiv);
    
    // Save to history
    chatHistory.push({ text, sender, timestamp: new Date() });
    
    // Scroll to bottom
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Typing indicator
function showTyping() {
    isTyping = true;
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'chat-bubble chat-bubble-ai animate-slideIn';
    typingDiv.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span class="text-white text-sm">🤖</span>
            </div>
            <div class="flex gap-1">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        </div>
    `;
    
    chatWindow.appendChild(typingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function hideTyping() {
    isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    indicator?.remove();
}

// Export API pro externí volání
export async function askAI(question, context = {}) {
    // Simulace API volání
    return new Promise((resolve) => {
        setTimeout(() => {
            const response = generateResponse(question);
            resolve(response);
        }, 500);
    });
}

// Export default
export default {
    initChat,
    askAI,
    addMessage
};