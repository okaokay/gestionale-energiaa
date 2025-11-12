# 🚀 ISTRUZIONI COMPLETE PER IL DEPLOY

## ✅ STATO ATTUALE
- ✅ Codice preparato per il deploy
- ✅ File di configurazione Render creati
- ✅ Git inizializzato e commit effettuato
- ⏳ **PROSSIMO PASSO**: Creare repository GitHub

## 📋 PASSO 1: Crea Repository GitHub

### 1.1 Vai su GitHub
1. Apri https://github.com/okaokay
2. Clicca "New repository" (pulsante verde)

### 1.2 Configura Repository
- **Repository name**: `gestionale-energia`
- **Description**: `Sistema di gestione energia con CRM, contratti, email marketing e automazioni. Deploy-ready per Render.com`
- **Visibility**: ✅ Public (necessario per deploy gratuito)
- **Initialize**: ❌ NON selezionare "Add a README file"

### 1.3 Crea Repository
Clicca "Create repository"

## 📋 PASSO 2: Push del Codice

Dopo aver creato il repository, esegui questi comandi:

```bash
# Aggiungi il remote origin (sostituisci con il tuo URL)
git remote add origin https://github.com/okaokay/gestionale-energia.git

# Imposta il branch principale
git branch -M main

# Push del codice
git push -u origin main
```

## 📋 PASSO 3: Deploy su Render.com

### 3.1 Registrati su Render
1. Vai su https://render.com
2. Clicca "Get Started for Free"
3. Registrati con GitHub (consigliato)

### 3.2 Connetti Repository
1. Nel dashboard Render, clicca "New +"
2. Seleziona "Blueprint"
3. Connetti il tuo account GitHub
4. Seleziona il repository `gestionale-energia`
5. Clicca "Connect"

### 3.3 Deploy Automatico
Render leggerà automaticamente il file `render.yaml` e:
- ✅ Configurerà il servizio web
- ✅ Imposterà le variabili d'ambiente
- ✅ Avvierà il build con Docker
- ✅ Assegnerà un URL pubblico

## 🔧 CONFIGURAZIONE RENDER

### Variabili d'Ambiente (già configurate in render.yaml)
```
NODE_ENV=production
PORT=3001
TZ=Europe/Rome
DATABASE_PATH=/app/gestionale_energia.db
JWT_SECRET=[generato automaticamente]
JWT_EXPIRES_IN=7d
```

### Configurazioni Email (opzionali)
Se vuoi abilitare l'email marketing, aggiungi:
```
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=tua-email-brevo
BREVO_SMTP_PASS=tua-password-brevo
```

## 🎯 RISULTATO FINALE

Dopo il deploy avrai:

### 🌐 URL Applicazione
```
https://gestionale-energia.onrender.com
```

### ✅ Funzionalità Attive
- 🏠 **Frontend React**: Interfaccia utente completa
- 🔧 **Backend API**: Tutte le API funzionanti
- 💾 **Database SQLite**: Persistente su disco Render
- 📧 **Email Marketing**: Sistema campagne (se configurato)
- 🕐 **Cron Jobs**: Automazioni attive
- 🇮🇹 **Timezone Italia**: Europe/Rome configurato

### 🔄 Deploy Automatico
Ogni push su `main` attiverà automaticamente un nuovo deploy.

## 🔍 VERIFICA DEPLOY

### Test Rapidi
1. **Homepage**: Apri l'URL e verifica il caricamento
2. **Login**: Testa il sistema di autenticazione
3. **API Health**: Vai su `/api/health` per verificare il backend
4. **Database**: Verifica che i dati siano persistenti

### Log e Debug
- **Render Dashboard**: Visualizza log in tempo reale
- **Build Logs**: Controlla eventuali errori di build
- **Runtime Logs**: Monitora l'applicazione in esecuzione

## ⚠️ Note Importanti

- **Timezone**: L'applicazione è configurata per il fuso orario italiano (`Europe/Rome`)
- **Database**: Utilizza SQLite con persistenza automatica
- **Email**: Le configurazioni email sono opzionali ma raccomandate per il sistema di campagne
- **Sicurezza**: JWT_SECRET viene generato automaticamente da Render
- **⚠️ LIMITAZIONE PIANO GRATUITO**: I file caricati (PDF, documenti) NON sono persistenti nel piano gratuito. Verranno persi ad ogni restart del servizio. Per la persistenza dei file, è necessario un piano a pagamento con disco persistente.

## 🚨 TROUBLESHOOTING

### Build Failed
- Verifica che `package.json` contenga tutte le dipendenze
- Controlla i log di build per errori specifici

### Database Error
- Il database SQLite viene creato automaticamente
- I dati sono persistenti tramite disco Render

### Port Error
- Render assegna automaticamente la porta
- L'app usa `process.env.PORT` (già configurato)

### Email Non Funzionano
- Aggiungi le credenziali Brevo nelle variabili d'ambiente
- Verifica la configurazione SMTP

## 📞 SUPPORTO

Se hai problemi:
1. Controlla i log su Render Dashboard
2. Verifica le variabili d'ambiente
3. Testa localmente con Docker
4. Consulta la documentazione Render

## 🎉 CONGRATULAZIONI!

Una volta completati questi passi, avrai un'applicazione web completa deployata e accessibile pubblicamente! 🚀