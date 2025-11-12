# 📧 Tutorial Completo: Setup Email Marketing con Brevo

## 🎯 Panoramica Sistema

Il **Gestionale Energia** include un sistema completo di Email Marketing che permette di:

- ✅ **Inviare campagne email promozionali** personalizzate
- ✅ **Alert automatici scadenze contratti** (60, 30, 15, 7 giorni prima)
- ✅ **Template email personalizzabili** con placeholder dinamici
- ✅ **Tracking aperture e click** email
- ✅ **Gestione GDPR compliant** con unsubscribe automatico
- ✅ **Rate limiting intelligente** per rispettare limiti provider

---

## 📋 PREREQUISITI

Prima di iniziare, assicurati di avere:

1. ✅ **Account Brevo gratuito** (300 email/giorno)
2. ✅ **Redis installato e avviato** (per BullMQ queue)
3. ✅ **Database migrato** con tabelle email

---

## 🚀 PARTE 1: Registrazione Brevo (5 minuti)

### Step 1: Crea Account Brevo

1. Vai su **https://www.brevo.com** (ex Sendinblue)
2. Clicca su **"Registrati Gratis"**
3. Compila il form con:
   - Email aziendale (o personale per test)
   - Password sicura
   - Nome azienda
4. Conferma email ricevuta nella tua casella
5. Completa l'onboarding guidato di Brevo

### Step 2: Verifica Dominio (Opzionale ma Consigliato)

Per inviare email dal tuo dominio personalizzato:

1. Vai su **Settings → Domains**
2. Clicca **"Add a domain"**
3. Inserisci il tuo dominio (es. `gestionale-energia.it`)
4. Copia i record DNS forniti da Brevo:
   - **TXT record** (per verifica)
   - **DKIM record** (per autenticazione)
   - **MX record** (opzionale)
5. Aggiungi questi record nel pannello DNS del tuo hosting
6. Attendi verifica (può richiedere 24-48h)

**⚠️ NOTA:** Per test, puoi saltare questo step e usare l'email Brevo di default.

---

## 🔑 PARTE 2: Ottieni Credenziali SMTP (3 minuti)

### Step 1: Accedi alle Impostazioni SMTP

1. Nella dashboard Brevo, vai su **Settings** (in alto a destra)
2. Nel menu laterale, clicca su **SMTP & API**
3. Nella sezione **SMTP**, troverai:
   - 📧 **Login (email)**: la tua email Brevo
   - 🔐 **Master Password**: chiave SMTP

### Step 2: Copia Credenziali

Prendi nota di:

```
SMTP Server: smtp-relay.brevo.com
SMTP Port: 587
SMTP Login: la-tua-email-brevo@esempio.it
SMTP Master Password: xsmtpsib-xxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxx
```

### Step 3 (Opzionale): Ottieni API Key

Se vuoi tracking avanzato (aperture, click):

1. Sempre in **SMTP & API**, vai alla tab **"API"**
2. Clicca **"Create a new API key"**
3. Dai un nome (es. "Gestionale Energia API")
4. Copia la chiave generata (inizia con `xkeysib-`)
5. **IMPORTANTE:** Salvala subito, non potrai rivederla dopo!

---

## ⚙️ PARTE 3: Configurazione Backend (2 minuti)

### Step 1: Crea/Modifica file `.env`

Nella root del progetto, crea (o modifica) il file `.env`:

```bash
# ═══════════════════════════════════════════════════════
# BREVO SMTP CONFIGURATION
# ═══════════════════════════════════════════════════════
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=la-tua-email-brevo@esempio.it
BREVO_SMTP_PASS=xsmtpsib-xxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxx

# API Key (opzionale, per tracking avanzato)
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxx

# ═══════════════════════════════════════════════════════
# EMAIL SENDER CONFIGURATION
# ═══════════════════════════════════════════════════════
EMAIL_SENDER_NAME=Gestionale Energia
EMAIL_SENDER_ADDRESS=noreply@gestionale-energia.it

# ═══════════════════════════════════════════════════════
# AGENZIA INFO (usate nei template email)
# ═══════════════════════════════════════════════════════
AGENZIA_NOME=La Tua Agenzia Energia
AGENZIA_EMAIL=info@tua-agenzia.it
AGENZIA_TELEFONO=+39 02 1234567
AGENZIA_WEBSITE=https://tua-agenzia.it

# ═══════════════════════════════════════════════════════
# URLS
# ═══════════════════════════════════════════════════════
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001

# ═══════════════════════════════════════════════════════
# CRON JOB (alert scadenze automatici)
# ═══════════════════════════════════════════════════════
CRON_ENABLED=true
CRON_EXPIRY_ALERTS=0 9 * * *  # Ogni giorno alle 09:00
```

### Step 2: Verifica Configurazione

Avvia il server backend:

```bash
npm run server
```

Se tutto è configurato correttamente, vedrai nel terminale:

```
✅ Email transporter (Brevo) inizializzato
⏰ Avvio cron job alert scadenze: 0 9 * * *
✅ Cron job email scheduler attivo
```

---

## 🧪 PARTE 4: Test Invio Email (3 minuti)

### Metodo 1: Test API Diretto (Consigliato)

Usa un client REST (Postman, Insomnia, o cURL):

```bash
curl -X POST http://localhost:3001/api/emails/test \
  -H "Authorization: Bearer TUO_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "tua-email-personale@gmail.com"}'
```

**Response attesa:**

```json
{
  "success": true,
  "message": "Email di test inviata a tua-email-personale@gmail.com",
  "data": {
    "success": true,
    "message": "Email inviata con successo",
    "logId": "uuid-del-log"
  }
}
```

### Metodo 2: Test da Frontend

1. Avvia il frontend: `npm run client`
2. Accedi al gestionale (login: `admin@gestionale.it` / password: `Admin123!`)
3. Vai su **Email Marketing** → Tab **"Statistiche"**
4. (Funzionalità in sviluppo: pulsante "Invia Email Test")

### Metodo 3: Test Cron Job Manuale

Nel terminale del backend:

```bash
# Esegui manualmente il controllo scadenze
ts-node backend/cron/emailScheduler.ts
```

Oppure aspetta le 09:00 del giorno successivo per l'esecuzione automatica.

---

## 📊 PARTE 5: Monitoraggio e Statistiche

### Dashboard Email Marketing

Nel frontend, vai su **Email Marketing**:

- **Tab Campagne**: Visualizza tutte le campagne create
- **Tab Scadenze Automatiche**: Info sui controlli automatici
- **Tab Template**: Gestisci i template email
- **Tab Statistiche**: Vedi email inviate oggi e limiti rimanenti

### Brevo Dashboard

Accedi alla dashboard Brevo per:

- 📊 **Statistics**: Tassi apertura, click, bounce
- 📧 **Logs**: Storico di tutte le email inviate
- 📈 **Reports**: Report dettagliati per campagna
- 🚫 **Blocklist**: Gestione email bloccate/unsubscribe

### Database SQLite

Controlla i log nel database:

```sql
-- Tutte le email inviate oggi
SELECT * FROM email_logs 
WHERE DATE(sent_at) = DATE('now');

-- Statistiche campagna specifica
SELECT 
  COUNT(*) as totale_inviate,
  SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as aperture,
  SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as click
FROM email_logs
WHERE campaign_id = 'UUID_CAMPAGNA';
```

---

## 🎨 PARTE 6: Personalizzazione Template Email

### Template Predefiniti

Il sistema include 3 template predefiniti:

1. **Promozionale Standard**: Per campagne marketing
2. **Alert Scadenza Contratto**: Per scadenze automatiche
3. **Benvenuto Cliente**: Per nuovi clienti

### Modifica Template

Puoi modificare i template direttamente nel database:

```sql
-- Visualizza template esistente
SELECT * FROM email_templates WHERE tipo = 'promozionale';

-- Aggiorna HTML content
UPDATE email_templates 
SET html_content = 'IL TUO HTML QUI',
    subject = 'Nuovo subject'
WHERE tipo = 'promozionale';
```

### Placeholder Disponibili

Usa questi placeholder nei template (sostituiti automaticamente):

```html
<!-- Cliente -->
{{nome_cliente}}
{{email_cliente}}

<!-- Contratto -->
{{tipo_energia}}
{{fornitore}}
{{numero_contratto}}
{{data_scadenza}}
{{giorni_scadenza}}
{{codice_fornitura}}

<!-- Offerta -->
{{nome_offerta}}
{{prezzo}}
{{risparmio_annuo}}
{{risparmio_percentuale}}

<!-- Agenzia -->
{{nome_agenzia}}
{{email_contatto}}
{{telefono_contatto}}

<!-- Links -->
{{link_offerte}}
{{link_dashboard}}
{{unsubscribe_link}}  <!-- OBBLIGATORIO per GDPR -->
```

**Esempio Template HTML:**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{subject}}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0;">{{nome_agenzia}}</h1>
    </div>
    
    <div style="padding: 30px;">
        <h2>Ciao {{nome_cliente}}!</h2>
        
        <p style="font-size: 16px; line-height: 1.6;">
            Il tuo contratto di fornitura <strong>{{tipo_energia}}</strong> con 
            {{fornitore}} scadrà tra <strong>{{giorni_scadenza}} giorni</strong> 
            (il {{data_scadenza}}).
        </p>
        
        <div style="background: #f7fafc; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">📋 Dettagli Contratto:</p>
            <p style="margin: 5px 0 0 0;">Numero: {{numero_contratto}}</p>
            <p style="margin: 5px 0 0 0;">POD/PDR: {{codice_fornitura}}</p>
        </div>
        
        <p>
            <a href="{{link_offerte}}" 
               style="display: inline-block; background: #667eea; color: white; 
                      padding: 15px 30px; text-decoration: none; border-radius: 5px; 
                      font-weight: bold;">
                Scopri le Nuove Offerte
            </a>
        </p>
        
        <p style="font-size: 14px; color: #718096; margin-top: 40px;">
            Per assistenza, contattaci al {{telefono_contatto}} o 
            <a href="mailto:{{email_contatto}}">{{email_contatto}}</a>
        </p>
        
        <p style="font-size: 12px; color: #a0aec0; margin-top: 20px;">
            Non vuoi più ricevere queste email? 
            <a href="{{unsubscribe_link}}" style="color: #a0aec0;">Disiscriviti</a>
        </p>
    </div>
</body>
</html>
```

---

## ⚠️ TROUBLESHOOTING COMMON ISSUES

### Problema 1: "Errore autenticazione SMTP"

**Causa:** Credenziali Brevo errate

**Soluzione:**
1. Verifica che `BREVO_SMTP_USER` sia la tua email Brevo
2. Verifica che `BREVO_SMTP_PASS` sia il **Master Password** (non la password login!)
3. Rigenera il Master Password se necessario (Settings → SMTP & API → Reset)

### Problema 2: "Email non arrivano"

**Cause possibili:**
- Email finite in SPAM/Junk
- Dominio non verificato su Brevo
- Limiti giornalieri raggiunti (300/giorno su free tier)

**Soluzione:**
1. Controlla cartella SPAM del destinatario
2. Verifica il dominio su Brevo (vedi Parte 1, Step 2)
3. Controlla statistiche Brevo per errori di invio
4. Verifica log database: `SELECT * FROM email_logs WHERE stato = 'fallito'`

### Problema 3: "Rate limit exceeded"

**Causa:** Superato limite 300 email/giorno

**Soluzione:**
- Attendi il giorno successivo (limite si resetta a mezzanotte UTC)
- Oppure: Upgrade al piano Business di Brevo (20.000 email/mese)

### Problema 4: "Cron job non funziona"

**Verifica:**
1. `CRON_ENABLED=true` nel .env
2. Backend avviato e in ascolto
3. Contratti con scadenza nei prossimi 60 giorni esistenti

**Test manuale:**
```bash
# Esegui cron job immediatamente (per test)
ts-node backend/cron/emailScheduler.ts
```

### Problema 5: "Redis connection refused"

**Causa:** Redis non avviato o non installato

**Soluzione:**

**Windows:**
```bash
# Scarica Redis da: https://github.com/tporadowski/redis/releases
# Estrai e avvia redis-server.exe
redis-server.exe
```

**Linux/Mac:**
```bash
# Installa Redis
sudo apt-get install redis-server  # Ubuntu/Debian
brew install redis  # Mac

# Avvia Redis
redis-server
```

---

## 🎓 BEST PRACTICES

### 1. Gestione Limiti Email

- **Monitora** costantemente le statistiche giornaliere
- **Pianifica** campagne grandi in giorni diversi
- **Prioritizza** email scadenze urgenti (7 giorni) rispetto a promozioni

### 2. Ottimizzazione Deliverability

- **Verifica sempre il dominio** su Brevo
- **Mantieni lista email pulita** (rimuovi bounce/invalid)
- **Usa oggetti email chiari** (evita SPAM words: "GRATIS!!!", "CLICCA ORA!!!")
- **Includi sempre unsubscribe link** (GDPR obbligatorio)

### 3. Personalizzazione

- **Usa placeholder dinamici** per rendere email personali
- **Segmenta campagne** per privati vs aziende
- **A/B test** su oggetti email per migliorare tassi apertura

### 4. Monitoraggio

- **Controlla ogni giorno** le statistiche Brevo
- **Analizza tassi apertura** e click
- **Identifica email problematiche** (alto bounce rate)

---

## 📚 RISORSE UTILI

- **Brevo Documentation**: https://developers.brevo.com/
- **Brevo Support**: https://help.brevo.com/
- **Email Design Best Practices**: https://www.emailonacid.com/blog/
- **GDPR Compliance**: https://gdpr.eu/email-encryption/

---

## 🎉 CONCLUSIONE

Congratulazioni! Hai configurato con successo il sistema Email Marketing del Gestionale Energia!

**Prossimi step consigliati:**

1. ✅ Crea i tuoi primi 5 contratti demo con scadenze vicine
2. ✅ Testa l'invio automatico email scadenza
3. ✅ Personalizza i template email con i tuoi colori aziendali
4. ✅ Carica una offerta e crea la tua prima campagna promozionale
5. ✅ Monitora statistiche per ottimizzare conversioni

**Serve aiuto?**

- 📧 Email: support@gestionale-energia.it
- 💬 GitHub Issues: [link-repo]
- 📚 Documentazione completa: [link-docs]

---

**Made with ❤️ by Gestionale Energia Team**

*Versione: 1.0.0 | Data: Ottobre 2025*

