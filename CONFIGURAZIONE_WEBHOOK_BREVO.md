# 🎯 Configurazione Webhook Brevo per Tracking Real-Time

## 📋 Panoramica

Il sistema Email Marketing include **tracking real-time** per:
- ✅ **Consegna email** (delivered)
- ✅ **Aperture email** (opened)
- ✅ **Click sui link** (click)
- ✅ **Bounce** (email respinte)
- ✅ **Unsubscribe** (disiscrizioni)

Questi eventi vengono comunicati da Brevo al tuo backend tramite **webhook HTTP**.

---

## ⚙️ PARTE 1: Configurazione Webhook su Brevo

### Step 1: Accedi alla Dashboard Brevo

1. Vai su **https://app.brevo.com**
2. Effettua il login con le tue credenziali

### Step 2: Naviga alle Impostazioni Webhook

1. Clicca sul tuo nome in alto a destra → **"Settings"**
2. Nel menu laterale sinistro, vai su **"Transactional" → "Webhooks"**
3. Clicca su **"Add a new webhook"**

### Step 3: Configura il Webhook

Compila il form con questi dati:

#### 📌 **URL Webhook:**
```
https://tuo-dominio.it/api/emails/webhook/brevo
```

**⚠️ IMPORTANTE:**
- Sostituisci `tuo-dominio.it` con il dominio effettivo del tuo backend
- Il webhook **DEVE essere pubblico** (accessibile da Internet)
- Se stai testando in locale, usa **ngrok** o **localtunnel** (vedi Parte 2)

#### 📌 **Eventi da tracciare:**
Seleziona **TUTTI** questi eventi:

- ✅ **Email sent** (inviata)
- ✅ **Email delivered** (consegnata)
- ✅ **Email opened** (aperta)
- ✅ **Email clicked** (link cliccato)
- ✅ **Soft bounce** (errore temporaneo)
- ✅ **Hard bounce** (errore permanente)
- ✅ **Spam** (segnalata come spam)
- ✅ **Blocked** (bloccata)
- ✅ **Unsubscribe** (disiscrizione)

#### 📌 **Altre impostazioni:**
- **HTTP Method**: `POST`
- **Content-Type**: `application/json`
- **Authentication**: Nessuna (il backend non richiede autenticazione per webhook)

### Step 4: Salva e Testa

1. Clicca **"Save"**
2. Brevo mostrerà lo stato del webhook come **"Active"**
3. Clicca su **"Test webhook"** per verificare la connessione

**✅ Risposta attesa dal backend:**
```json
{
  "success": true,
  "message": "Webhook processato"
}
```

---

## 🧪 PARTE 2: Test Locale con ngrok (Opzionale)

Se vuoi testare il webhook in locale (su `localhost`), devi esporre il tuo backend a Internet.

### Metodo 1: ngrok (Consigliato)

**Step 1: Installa ngrok**
```bash
# Windows
choco install ngrok

# Mac
brew install ngrok

# Linux
snap install ngrok

# Oppure scarica da: https://ngrok.com/download
```

**Step 2: Registra account**
```bash
# Vai su https://ngrok.com e registrati (gratis)
# Copia il tuo authtoken dalla dashboard
ngrok config add-authtoken IL_TUO_TOKEN
```

**Step 3: Avvia tunnel**
```bash
# Avvia il backend sulla porta 3001
npm run server

# In un altro terminale, avvia ngrok
ngrok http 3001
```

**Step 4: Copia URL pubblico**
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3001
```

**Step 5: Configura webhook Brevo**
```
URL Webhook: https://abc123.ngrok.io/api/emails/webhook/brevo
```

**⚠️ ATTENZIONE:**
- L'URL ngrok cambia ad ogni riavvio (con account free)
- Devi aggiornare il webhook su Brevo ogni volta
- Per URL fissi, usa ngrok PRO (a pagamento)

### Metodo 2: localtunnel (Alternativa)

```bash
# Installa localtunnel
npm install -g localtunnel

# Avvia tunnel
lt --port 3001 --subdomain miogestionale

# URL webhook:
# https://miogestionale.loca.lt/api/emails/webhook/brevo
```

---

## 📊 PARTE 3: Verifica Funzionamento

### Test 1: Invia Email di Test

1. Accedi al gestionale
2. Vai su **Email Marketing** → Tab **"Statistiche"**
3. Clicca **"Setup Brevo"** e completa il wizard
4. Inserisci la tua email personale e clicca **"Invia Email di Test"**

### Test 2: Controlla Log Backend

Osserva il terminale del backend. Quando apri l'email, dovresti vedere:

```
📨 Webhook Brevo ricevuto: delivered per tua-email@gmail.com
📨 Webhook Brevo ricevuto: opened per tua-email@gmail.com
```

### Test 3: Verifica Database

```sql
-- Controlla log email
SELECT * FROM email_logs 
WHERE email_destinatario = 'tua-email@gmail.com' 
ORDER BY created_at DESC 
LIMIT 1;

-- Verifica che opened_at sia popolato dopo apertura
-- Verifica che clicked_at sia popolato dopo click link
```

### Test 4: Dashboard Frontend

1. Vai su **Email Marketing** → Tab **"Campagne"**
2. Se hai una campagna attiva, vedrai i contatori aggiornarsi in real-time:
   - **Inviate**: Incrementa quando email consegnata
   - **Aperture**: Incrementa quando destinatario apre
   - **Click**: Incrementa quando clicca su link

---

## 🔧 PARTE 4: Troubleshooting

### Problema 1: Webhook non riceve eventi

**Sintomi:**
- Invii email di test ma non vedi log `📨 Webhook Brevo ricevuto`
- Database non si aggiorna con aperture/click

**Cause possibili:**
1. URL webhook errato su Brevo
2. Backend non raggiungibile pubblicamente
3. Firewall/proxy blocca richieste da Brevo

**Soluzioni:**
```bash
# 1. Verifica che il backend sia raggiungibile
curl https://tuo-dominio.it/api/emails/webhook/brevo
# Dovresti ricevere 404 o 400 (non 502/503)

# 2. Controlla log Brevo
# Dashboard Brevo → Settings → Webhooks → View Logs
# Cerca errori HTTP (400, 500, timeout)

# 3. Testa ngrok
# Verifica che ngrok sia attivo: ngrok http 3001
# Copia URL pubblico e aggiornalo su Brevo
```

### Problema 2: Email non matchano nel database

**Sintomi:**
- Vedi log `⚠️ Email log non trovato per message ID: xxx`
- Eventi webhook non aggiornano statistiche

**Cause:**
- `brevo_message_id` non salvato correttamente nell'email_logs

**Soluzione:**
```sql
-- Verifica se message ID è salvato
SELECT brevo_message_id FROM email_logs 
WHERE email_destinatario = 'test@example.com';

-- Se NULL, controlla che emailService.ts salvi il message ID:
-- await pool.query('INSERT INTO email_logs ... VALUES (?, ?, ?, ... info.messageId)');
```

### Problema 3: Webhook risponde 401 Unauthorized

**Sintomi:**
- Log Brevo mostra errore 401
- Backend rifiuta richiesta webhook

**Causa:**
- Webhook endpoint richiede autenticazione (errore configurazione)

**Soluzione:**
```typescript
// Verifica in backend/routes/emails.ts che webhook sia PRIMA di router.use(authenticate)

// ✅ CORRETTO:
router.post('/webhook/brevo', async (req, res) => { ... });
router.use(authenticate); // Autenticazione DOPO webhook

// ❌ SBAGLIATO:
router.use(authenticate); // Autenticazione PRIMA webhook
router.post('/webhook/brevo', async (req, res) => { ... });
```

### Problema 4: Contatori campagne non si aggiornano

**Sintomi:**
- Aperture registrate in `email_logs.opened_at`
- Ma `email_campaigns.opened_count` rimane a 0

**Soluzione:**
```sql
-- Ricalcola manualmente contatori campagna
UPDATE email_campaigns 
SET opened_count = (
    SELECT COUNT(*) FROM email_logs 
    WHERE campaign_id = email_campaigns.id 
    AND opened_at IS NOT NULL
),
clicked_count = (
    SELECT COUNT(*) FROM email_logs 
    WHERE campaign_id = email_campaigns.id 
    AND clicked_at IS NOT NULL
)
WHERE id = 'ID_CAMPAGNA';
```

---

## 📝 PARTE 5: Eventi Webhook Dettagliati

### 📧 **delivered** (Email consegnata)
```json
{
  "event": "delivered",
  "email": "destinatario@example.com",
  "message-id": "<abc123@smtp-relay.brevo.com>",
  "date": "2025-10-01 14:30:00",
  "tag": "campaign_123"
}
```
**Azione backend:**
- Aggiorna `email_logs.stato = 'inviato'`
- Aggiorna `email_logs.delivered_at = NOW()`
- Incrementa `email_campaigns.delivered_count`

### 👁️ **opened** (Email aperta)
```json
{
  "event": "opened",
  "email": "destinatario@example.com",
  "message-id": "<abc123@smtp-relay.brevo.com>",
  "date": "2025-10-01 14:35:00",
  "tag": "campaign_123"
}
```
**Azione backend:**
- Aggiorna `email_logs.opened_at = NOW()` (se NULL)
- Incrementa `email_campaigns.opened_count`

### 🖱️ **click** (Link cliccato)
```json
{
  "event": "click",
  "email": "destinatario@example.com",
  "message-id": "<abc123@smtp-relay.brevo.com>",
  "link": "https://tuo-dominio.it/offerte/123",
  "date": "2025-10-01 14:37:00",
  "tag": "campaign_123"
}
```
**Azione backend:**
- Aggiorna `email_logs.clicked_at = NOW()` (se NULL)
- Incrementa `email_campaigns.clicked_count`

### ⚠️ **hard_bounce** (Email respinta definitivamente)
```json
{
  "event": "hard_bounce",
  "email": "invalida@dominio-non-esistente.com",
  "message-id": "<abc123@smtp-relay.brevo.com>",
  "reason": "invalid_email",
  "date": "2025-10-01 14:30:10"
}
```
**Azione backend:**
- Aggiorna `email_logs.stato = 'fallito'`
- Aggiorna `email_logs.errore = 'hard_bounce: invalid_email'`
- Incrementa `email_campaigns.failed_count`

### 🚫 **unsubscribe** (Disiscrizione)
```json
{
  "event": "unsubscribe",
  "email": "destinatario@example.com",
  "message-id": "<abc123@smtp-relay.brevo.com>",
  "date": "2025-10-01 14:40:00"
}
```
**Azione backend:**
- Aggiorna `email_logs.unsubscribed_at = NOW()`
- Aggiorna `clienti_privati.newsletter_attiva = 0` (o `clienti_aziende`)

---

## 🎉 Conclusione

Una volta configurato correttamente il webhook Brevo, il sistema traccia automaticamente **tutte le interazioni email in tempo reale**!

**Vantaggi:**
- ✅ Statistiche aggiornate istantaneamente
- ✅ Nessun polling o controllo manuale
- ✅ Gestione automatica bounce e unsubscribe
- ✅ Dashboard sempre sincronizzata

**Prossimi step:**
1. Configura webhook su Brevo (Parte 1)
2. Testa con email personale (Parte 3)
3. Monitora per qualche giorno
4. Se tutto ok, passa alla produzione!

---

**Supporto:**
- 📧 Email: support@gestionale-energia.it
- 📚 Documentazione Brevo Webhooks: https://developers.brevo.com/docs/webhooks
- 🐛 Segnala bug: GitHub Issues

**Made with ❤️ by Gestionale Energia Team**

