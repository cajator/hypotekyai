# 🏡 Hypotéka AI

Chytrá hypoteční kalkulačka s AI poradcem pro český trh. Srovnání 6 bank, real-time výpočty, AI chat.

## ✨ Funkce

- 📊 **Hypoteční kalkulačka** - Okamžitý výpočet splátek
- 🤖 **AI Poradce** - Chat s Gemini API
- 🏦 **6 bank** - Česká spořitelna, ČSOB, KB, UniCredit, Raiffeisen, Hypoteční banka
- 📈 **Real-time sazby** - Aktuální úrokové sazby
- 💯 **DSTI/LTV kontrola** - Automatická kontrola bonity
- 📱 **Responzivní design** - Funguje na všech zařízeních
- 🔒 **Bezpečné** - API klíče na serveru, HTTPS

## 🚀 Rychlý start

### Požadavky

- Node.js 18+
- Netlify CLI
- Gemini API klíč

### Instalace

1. **Naklonujte repozitář**
```bash
git clone https://github.com/yourusername/hypoteka-ai.git
cd hypoteka-ai
```

2. **Nainstalujte závislosti**
```bash
npm install
```

3. **Vytvořte .env soubor**
```bash
cp .env.example .env
# Upravte .env a přidejte váš GEMINI_API_KEY
```

4. **Spusťte lokálně**
```bash
npm start
# Otevře se na http://localhost:8888
```

## 📁 Struktura projektu

```
hypoteka-ai/
├── index.html              # Hlavní HTML soubor
├── style.css              # Styly (Tailwind kompatibilní)
├── script.js              # Hlavní aplikační logika
├── netlify.toml           # Netlify konfigurace
├── package.json           # NPM závislosti
├── .env                   # Proměnné prostředí (není v gitu)
├── .env.example           # Šablona pro .env
├── .gitignore             # Git ignore pravidla
├── README.md              # Tento soubor
└── netlify/
    └── functions/
        ├── chat.js        # Serverless funkce pro AI chat
        └── rates.js       # Serverless funkce pro sazby

```

## 🛠️ Technologie

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend**: Netlify Functions (serverless)
- **AI**: Google Gemini API
- **Hosting**: Netlify
- **Charts**: Chart.js
- **Fonts**: Inter (Google Fonts)

## 📝 API Endpoints

### Chat API
```javascript
POST /.netlify/functions/chat
{
  "message": "Kolik si můžu půjčit?",
  "context": { /* aktuální data z kalkulačky */ }
}
```

### Rates API
```javascript
GET /.netlify/functions/rates?endpoint=calculate&amount=4000000&value=5000000&term=25&fixation=5&income=60000
GET /.netlify/functions/rates?endpoint=banks
GET /.netlify/functions/rates?endpoint=best-offers&fixation=5
```

## 🔧 Konfigurace

### Environment Variables

Vytvořte `.env` soubor s:
```env
GEMINI_API_KEY=your_actual_api_key_here
NODE_ENV=production
```

### Netlify Environment

V Netlify Dashboard → Settings → Environment variables přidejte:
- `GEMINI_API_KEY` - váš Gemini API klíč

## 🚢 Deployment

### Automatický deployment (doporučeno)

1. Pushněte na GitHub
2. Propojte s Netlify
3. Automatický deploy při každém commitu

### Manuální deployment

```bash
# Preview deployment
npm run deploy:preview

# Production deployment
npm run deploy
```

## 📊 Kalkulační logika

### LTV (Loan to Value)
```
LTV = (výše úvěru / cena nemovitosti) × 100
```

### DSTI (Debt Service to Income)
```
DSTI = (měsíční splátky / čistý příjem) × 100
```

### Měsíční splátka
```javascript
M = P × [r(1+r)^n] / [(1+r)^n - 1]
```
Kde:
- M = měsíční splátka
- P = výše úvěru
- r = měsíční úroková sazba
- n = počet měsíců

## 🏦 Podporované banky

1. **Česká spořitelna** - Univerzální podmínky
2. **ČSOB** - Až 100% LTV
3. **Komerční banka** - Pro vyšší příjmy
4. **UniCredit Bank** - Prémiové služby
5. **Raiffeisenbank** - Online proces
6. **Hypoteční banka** - Nejnižší sazby

## 🔒 Bezpečnost

- API klíče pouze na serveru (serverless funkce)
- HTTPS vynuceno
- Security headers v netlify.toml
- Input validace
- Rate limiting (v produkci)

## 🐛 Troubleshooting

### Chat nefunguje
- Zkontrolujte GEMINI_API_KEY v .env
- Ověřte, že API klíč je platný

### Sazby se nenačítají
- Zkontrolujte připojení k internetu
- Ověřte, že serverless funkce běží

### Kalkulačka nepočítá
- Zkontrolujte konzoli prohlížeče (F12)
- Ověřte, že všechny vstupy jsou číselné

## 📈 Budoucí vylepšení

- [ ] Integrace s bankovními API
- [ ] Historie výpočtů
- [ ] Export do PDF
- [ ] Mobilní aplikace
- [ ] Více jazyků
- [ ] Dark mode
- [ ] PWA podpora

## 📄 Licence

MIT License - viz LICENSE soubor

## 👥 Kontakt

- Web: [hypoteka-ai.cz](https://hypoteka-ai.cz)
- Email: info@hypoteka-ai.cz
- GitHub: [github.com/hypoteka-ai](https://github.com/hypoteka-ai)

## 🙏 Poděkování

- Google Gemini za AI API
- Netlify za hosting
- Tailwind CSS za styling framework
- Chart.js za grafy

---

**Vytvořeno s ❤️ pro české hypotéky**
