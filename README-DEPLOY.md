# 🚀 Deploy su Render.com

Questa guida spiega come fare il deploy del Gestionale Energia su Render.com.

## 📋 Prerequisiti

1. Account GitHub (già configurato su `https://github.com/okaokay`)
2. Account Render.com (gratuito)
3. Repository GitHub con il codice

## 🔧 Configurazione

### 1. File di Deploy

Il progetto include i seguenti file per il deploy:

- `Dockerfile.render` - Dockerfile ottimizzato per Render
- `render.yaml` - Configurazione automatica per Render
- `.env.example` - Variabili d'ambiente di esempio

### 2. Variabili d'Ambiente Richieste

Su Render.com, configura le seguenti variabili:

```bash
NODE_ENV=production
PORT=3001
TZ=Europe/Rome
DATABASE_PATH=/app/gestionale_energia.db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### 3. Configurazione Email (Opzionale)

Per abilitare l'invio email, aggiungi:

```bash
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=your-brevo-email
BREVO_SMTP_PASS=your-brevo-password
```

## 🚀 Deploy Automatico

### Opzione 1: Deploy con render.yaml (Consigliato)

1. Fai push del codice su GitHub
2. Su Render.com, clicca "New" → "Blueprint"
3. Connetti il repository GitHub
4. Render leggerà automaticamente `render.yaml`
5. Clicca "Apply" per iniziare il deploy

### Opzione 2: Deploy Manuale

1. Su Render.com, clicca "New" → "Web Service"
2. Connetti il repository GitHub
3. Configura:
   - **Name**: gestionale-energia
   - **Environment**: Docker
   - **Dockerfile Path**: ./Dockerfile.render
   - **Plan**: Free
4. Aggiungi le variabili d'ambiente
5. Clicca "Create Web Service"

## 🔍 Verifica Deploy

Dopo il deploy, verifica che:

1. ✅ L'applicazione si avvia senza errori
2. ✅ Il database SQLite è inizializzato
3. ✅ Il frontend è servito correttamente
4. ✅ Le API rispondono su `/api/health`
5. ✅ Il timezone è configurato su Europe/Rome

## 🔧 Troubleshooting

### Errori Comuni

1. **Build Failed**: Verifica che tutte le dipendenze siano in `package.json`
2. **Database Error**: Il database SQLite viene creato automaticamente
3. **Port Error**: Render assegna automaticamente la porta, usa `process.env.PORT`

### Log e Debug

- Visualizza i log su Render Dashboard
- Usa `console.log` per debug temporaneo
- Verifica le variabili d'ambiente nel dashboard

## 📱 URL dell'Applicazione

Dopo il deploy, l'applicazione sarà disponibile su:
```
https://gestionale-energia.onrender.com
```

## 🔄 Deploy Automatico

Ogni push su `main` branch attiverà automaticamente un nuovo deploy.

## 🔧 Caratteristiche del Deploy

- **Docker Ottimizzato**: Build multi-stage per ridurre le dimensioni
- **Timezone Italiana**: Configurato per `Europe/Rome`
- **Database Persistente**: SQLite con persistenza automatica
- **Sistema Email**: Integrazione con Brevo per campagne email
- **Auto-Deploy**: Deploy automatico da GitHub
- **Piano Gratuito**: Compatibile con il tier gratuito di Render
- **⚠️ Limitazione**: I file caricati non sono persistenti nel piano gratuito

## 💾 Persistenza Dati

- Database SQLite: persistente tramite disco Render
- Upload files: persistenti tramite disco Render
- Configurazioni: salvate nel database

## 🛡️ Sicurezza

- JWT_SECRET viene generato automaticamente da Render
- HTTPS abilitato di default
- Variabili d'ambiente sicure