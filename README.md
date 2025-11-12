# Gestionale Energia - Sistema Import Unificato

Un gestionale completo per il settore energia con sistema di import avanzato per CSV/Excel.

## 🚀 Caratteristiche Principali

### Sistema Import Unificato
- **Rilevamento Automatico**: Identifica automaticamente il tipo di record (clienti privati, aziende, contratti luce/gas)
- **Gestione UPSERT**: Inserimento intelligente con aggiornamento automatico dei record esistenti
- **Preview Intelligente**: Anteprima dati con validazione preventiva
- **Compensi Automatici**: Calcolo automatico commissioni per nuovi contratti
- **Dashboard Risultati**: Visualizzazione completa statistiche e errori

### Gestionale Completo
- **Gestione Clienti**: Clienti privati e aziende con anagrafica completa
- **Contratti**: Gestione contratti luce e gas con dettagli tecnici
- **Agenti**: Sistema agenti con gestione commissioni
- **Compensi**: Calcolo e tracciamento compensi automatici
- **Dashboard**: Panoramica completa con statistiche e grafici

## 📋 Prerequisiti

- **Node.js**: v20.19+ o v22.12+
- **MySQL**: v8.0+
- **npm**: v9.0+

## 🛠️ Installazione

### 1. Clona il Repository
```bash
git clone <repository-url>
cd gestionale-energia
```

### 2. Installa Dipendenze Backend
```bash
cd backend
npm install
```

### 3. Installa Dipendenze Frontend
```bash
cd ../frontend
npm install
```

### 4. Configurazione Database
```bash
# Crea il database MySQL
mysql -u root -p
CREATE DATABASE gestionale_energia;
```

### 5. Configurazione Ambiente
Crea il file `.env` nella cartella `backend`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=gestionale_energia
PORT=3001
JWT_SECRET=your_jwt_secret
```

### 6. Inizializzazione Database
```bash
cd backend
npm run migrate
npm run seed
```

## 🚀 Avvio Applicazione

### Sviluppo
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Produzione
```bash
# Build frontend
cd frontend
npm run build

# Avvia backend
cd ../backend
npm run start:prod
```

## 📊 Sistema Import Unificato

### Tipi di Record Supportati

#### 1. Clienti Privati
```csv
nome,cognome,codice_fiscale,email_principale,telefono,assigned_agent_email
Mario,Rossi,RSSMRA80A01H501Z,mario.rossi@email.com,3331234567,agente@test.com
```

#### 2. Clienti Aziende
```csv
ragione_sociale,partita_iva,email_referente,telefono_referente,assigned_agent_email
Acme SRL,12345678901,info@acme.com,0612345678,agente@test.com
```

#### 3. Contratti Luce
```csv
tipo_contratto,pod,codice_fiscale,potenza_impegnata,consumo_annuo_stimato
luce,IT001E12345678,RSSMRA80A01H501Z,3.0,3000
```

#### 4. Contratti Gas
```csv
tipo_contratto,pdr,partita_iva,consumo_annuo_stimato,prezzo_gas
gas,IT001G87654321,12345678901,5000,0.85
```

### File Misto
Il sistema supporta file con record misti:
```csv
nome,cognome,codice_fiscale,ragione_sociale,partita_iva,tipo_contratto,pod,pdr
Mario,Rossi,RSSMRA80A01H501Z,,,luce,IT001E12345678,
,,,Acme SRL,12345678901,gas,,IT001G87654321
```

## 🔧 API Endpoints

### Import Unificato
```
POST /api/unified-import/upload          # Caricamento file
POST /api/unified-import/preview         # Anteprima dati
GET  /api/unified-import/progress/:id    # Stato progresso
GET  /api/unified-import/result/:id      # Risultato import
```

### Gestionale
```
GET  /api/clienti                        # Lista clienti
GET  /api/contratti                      # Lista contratti
GET  /api/agenti                         # Lista agenti
GET  /api/compensi                       # Lista compensi
GET  /api/dashboard/stats                # Statistiche dashboard
```

## 🏗️ Architettura

### Backend (`/backend`)
```
├── services/
│   ├── unifiedImportService.ts          # Servizio principale import
│   ├── recordTypeDetector.ts            # Rilevamento tipo record
│   ├── unifiedCsvParser.ts              # Parser CSV/Excel
│   ├── recordValidator.ts               # Validazione record
│   └── recordAssociator.ts              # Associazione record
├── routes/
│   ├── unified-import.ts                # API import unificato
│   ├── clienti.ts                       # API clienti
│   ├── contratti.ts                     # API contratti
│   └── dashboard.ts                     # API dashboard
└── models/                              # Modelli database
```

### Frontend (`/frontend`)
```
├── src/
│   ├── components/
│   │   ├── SuperImportModal.tsx         # Modal import principale
│   │   ├── ImportResultsDashboard.tsx   # Dashboard risultati
│   │   └── Dashboard.tsx                # Dashboard principale
│   ├── pages/                           # Pagine applicazione
│   └── services/                        # Servizi API
```

## 🧪 Testing

### Test Automatici
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Test Manuali
1. Usa il file `test-unified-import.csv` per testare l'import
2. Verifica la dashboard risultati
3. Controlla i compensi automatici
4. Testa la gestione errori

## 📈 Monitoraggio

### Metriche Disponibili
- **Performance Import**: Tempo elaborazione, throughput
- **Statistiche Database**: Record inseriti/aggiornati
- **Errori**: Tracciamento errori con dettagli
- **Utilizzo Sistema**: CPU, memoria, connessioni DB

### Log
```bash
# Visualizza log backend
tail -f backend/logs/app.log

# Visualizza log import
tail -f backend/logs/import.log
```

## 🔒 Sicurezza

### Autenticazione
- JWT tokens per API
- Sessioni sicure frontend
- Validazione input rigorosa

### Validazione File
- Controllo tipo MIME
- Limite dimensione (50MB)
- Sanitizzazione contenuto

## 🚀 Deploy

### Docker (Raccomandato)
```bash
# Build immagini
docker-compose build

# Avvia servizi
docker-compose up -d
```

### Deploy Manuale
```bash
# Build frontend
cd frontend
npm run build

# Copia file statici
cp -r dist/* /var/www/html/

# Avvia backend con PM2
cd ../backend
pm2 start ecosystem.config.js
```

## 📚 Documentazione

- **Documentazione Completa**: `DOCUMENTAZIONE_IMPORT_UNIFICATO.md`
- **API Docs**: `http://localhost:3001/api/docs`
- **Esempi**: Cartella `/examples`

## 🤝 Contribuire

1. Fork del repository
2. Crea branch feature (`git checkout -b feature/nuova-funzionalita`)
3. Commit modifiche (`git commit -am 'Aggiunge nuova funzionalità'`)
4. Push branch (`git push origin feature/nuova-funzionalita`)
5. Crea Pull Request

## 📝 Changelog

### v1.0.0 (Ottobre 2024)
- ✅ Sistema import unificato completo
- ✅ Rilevamento automatico tipo record
- ✅ Gestione UPSERT intelligente
- ✅ Compensi automatici
- ✅ Dashboard risultati avanzata
- ✅ Preview intelligente
- ✅ Gestione errori robusta

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per dettagli.

## 🆘 Supporto

- **Issues**: Usa GitHub Issues per bug e richieste
- **Email**: supporto@gestionale-energia.com
- **Documentazione**: Consulta la documentazione completa

---

**Sviluppato con ❤️ per il settore energia**

