# 🚀 Guida Setup Gestionale Energia

## Prerequisiti

1. **Node.js 18+** ✅ (già installato)
2. **PostgreSQL 14+** (da installare se non presente)
3. **Git** (opzionale)

## Setup PostgreSQL

### Windows:
1. Scarica PostgreSQL da: https://www.postgresql.org/download/windows/
2. Installa con le impostazioni di default
3. Ricorda la password dell'utente `postgres`

### Verifica installazione:
```bash
psql --version
```

## Setup Database

### 1. Crea il database:
```bash
# Accedi a PostgreSQL (usa la password impostata durante installazione)
psql -U postgres

# All'interno di psql, crea il database:
CREATE DATABASE gestionale_energia;

# Esci da psql:
\q
```

### Oppure usa pgAdmin (GUI):
- Apri pgAdmin
- Crea nuovo database chiamato `gestionale_energia`

## Configurazione Progetto

### 1. Configura variabili ambiente:
Il file `.env` è già stato creato nella root del progetto. Aggiorna questi valori se necessario:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gestionale_energia
DB_USER=postgres
DB_PASSWORD=LA_TUA_PASSWORD_POSTGRES  # IMPORTANTE: Modifica questa
```

### 2. Esegui migrations database:
```bash
npm run db:migrate
```

Questo comando:
- Crea tutte le tabelle
- Inserisce i template email
- Crea l'utente Super Admin di default

## Avvio Applicazione

### Opzione 1: Avvio completo automatico
```bash
npm run dev
```

Questo avvia sia backend che frontend contemporaneamente.

### Opzione 2: Avvio separato (per debugging)

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

## Accesso all'applicazione

Una volta avviato:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Credenziali di accesso:
- **Email**: admin@gestionale.it
- **Password**: Admin123!

## Test Funzionalità

### 1. Dashboard
- Visualizza KPI e statistiche generali
- Vedi scadenze urgenti
- Monitora hot leads da AI

### 2. Gestione Clienti
- Crea clienti privati e aziende
- Visualizza anagrafica completa
- Gestisci contratti associati

### 3. Contratti
- Visualizza tutti i contratti luce e gas
- Monitora scadenze
- Aggiungi nuovi contratti

### 4. Offerte & AI
- **SUPER ADMIN**: Carica PDF offerte
- L'AI Ollama analizza automaticamente il PDF
- Trova clienti eligibili con matching intelligente
- Visualizza hot leads con risparmio stimato

### 5. Email Marketing
- Visualizza campagne email
- Crea nuove campagne
- Monitora statistiche aperture

## Risoluzione Problemi

### Database non si connette
1. Verifica che PostgreSQL sia avviato:
   ```bash
   # Windows: Cerca "Services" e verifica postgresql-x64-XX sia avviato
   ```
2. Controlla le credenziali in `.env`
3. Verifica che il database `gestionale_energia` esista

### Porta già in uso
Se la porta 3001 o 5173 è già occupata:
1. Modifica `PORT` in `.env` per il backend
2. Modifica `vite.config.ts` per il frontend

### Errori Ollama AI
Se l'analisi PDF fallisce:
1. Verifica che l'URL Ollama sia raggiungibile
2. In alternativa, crea offerte manualmente senza PDF
3. Il matching AI funzionerà comunque

## Struttura Database

Il sistema crea automaticamente:
- ✅ 13 tabelle principali (clienti, contratti, offerte, email, AI matches, ecc.)
- ✅ 2 viste SQL per query ottimizzate
- ✅ 7 template email preconfigurati
- ✅ 1 utente Super Admin
- ✅ Trigger automatici per updated_at
- ✅ Indici ottimizzati per performance

## Note Importanti

### GDPR Compliance
- Tutti gli accessi ai dati sono tracciati in `audit_logs`
- Gestione consensi privacy e marketing
- Possibilità di export dati cliente
- Sistema opt-out email automatico

### Sicurezza
- Password hashate con bcrypt
- Autenticazione JWT con ruoli
- Middleware di autorizzazione
- Validazione input su tutte le API

### Performance
- Pool connessioni database (max 20)
- Indici ottimizzati su tutte le query frequenti
- Compressione risposte API
- Caching headers

## Supporto

Per problemi o domande:
1. Verifica i log del backend nel terminal
2. Controlla la console del browser (F12) per errori frontend
3. Rivedi questa guida per verificare di aver seguito tutti i passaggi

## Prossimi Passi

Una volta che l'applicazione funziona:

1. **Configura Email**: Aggiorna le credenziali SMTP in `.env` per invii email reali
2. **Aggiungi Clienti**: Crea alcuni clienti di test (privati e aziende)
3. **Crea Contratti**: Associa contratti ai clienti con scadenze diverse
4. **Carica Offerta**: Come Super Admin, carica un PDF di offerta per testare l'AI
5. **Matching AI**: Visualizza i clienti eligibili trovati automaticamente
6. **Email Marketing**: Crea una campagna email di test

Buon lavoro! 🎉

