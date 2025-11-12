# 🚀 AVVIO RAPIDO - Gestionale Energia con SQLite

## ✅ Tutto Pronto!

Il sistema è **completamente configurato** e usa **SQLite** (nessuna installazione richiesta)!

### 📁 Database Creato
- **File**: `gestionale_energia.db` 
- **Tipo**: SQLite (locale, nessun server)
- **Utente Admin**: ✅ Già creato
- **Email**: `admin@gestionale.it`
- **Password**: `Admin123!`

---

## 🎯 AVVIO IN 2 PASSI

### 1. Ferma tutti i processi Node attivi
```powershell
# In PowerShell (Windows)
taskkill /F /IM node.exe
```

### 2. Avvia l'applicazione
```powershell
npm run dev
```

Aspetta 10-15 secondi per l'avvio completo.

---

## 🌐 Accesso all'Applicazione

### Frontend
**URL**: http://localhost:5177 (o 5176/5173)

### Backend API
**URL**: http://localhost:3001

### Credenziali Login
- **Email**: admin@gestionale.it
- **Password**: Admin123!

---

## 🎉 Funzionalità Disponibili

### ✅ Gestione Clienti
- Aggiungi clienti privati e aziende
- Visualizza anagrafica completa
- Gestisci contratti associati

### ✅ Contratti Luce e Gas
- Crea e monitora contratti
- Alert scadenze automatici
- Storico completo

### ✅ Offerte & AI Matching
- Carica PDF offerte (Super Admin)
- Analisi automatica con Ollama AI
- Match intelligente clienti-offerte
- Calcolo risparmio stimato

### ✅ Email Marketing
- Template personalizzati
- Campagne targetizzate
- Tracking aperture

### ✅ Dashboard
- KPI real-time
- Grafici e statistiche
- Hot leads AI

---

## 🔧 Risoluzione Problemi

### Frontend non carica
```powershell
cd frontend
npm install
npm run dev
```

### Backend non risponde
```powershell
# Verifica il database
node test-db-direct.js

# Se OK, riavvia
npm run server
```

### Errore "Port already in use"
```powershell
# Ferma processi Node
taskkill /F /IM node.exe

# Riavvia
npm run dev
```

### Reset database
```powershell
# Elimina il vecchio database
del gestionale_energia.db

# Ricrea
npm run db:migrate
```

---

## 📊 Struttura Database SQLite

**Tabelle create:**
- `users` - Utenti con ruoli (super_admin, admin, operatore, visualizzatore)
- `clienti_privati` - Anagrafica clienti privati
- `clienti_aziende` - Anagrafica aziende con codici ATECO
- `contratti_luce` - Contratti luce con POD
- `contratti_gas` - Contratti gas con PDR
- `offerte` - Offerte caricate (anche da PDF con AI)

**Vantaggi SQLite:**
- ✅ Nessuna installazione server richiesta
- ✅ Database in un singolo file
- ✅ Veloce per gestione fino a 10.000 clienti
- ✅ Facile backup (copia file .db)

---

## 🤖 Integrazione AI (Ollama)

L'AI per analisi PDF è configurata su:
- **URL**: http://185.31.67.249/api/chat
- **Modello**: llama3:8b

**Come funziona:**
1. Super Admin carica PDF offerta
2. Ollama analizza automaticamente il contenuto
3. Sistema trova clienti eligibili
4. Calcola risparmio per ogni cliente
5. Categorizza in hot/warm/cold leads

---

## 📝 Note Tecniche

**Stack:**
- Backend: Node.js + Express + TypeScript
- Database: SQLite (better-sqlite3)
- Frontend: React + TypeScript + Tailwind CSS
- AI: Ollama (llama3:8b)

**Porte utilizzate:**
- Backend: 3001
- Frontend: 5177 (o 5176/5173)

**File importanti:**
- `.env` - Configurazione
- `gestionale_energia.db` - Database SQLite
- `package.json` - Dipendenze e script

---

## 🎯 Prossimi Passi

1. **Accedi**: http://localhost:5177
2. **Esplora la Dashboard**: Vedi tutte le funzionalità
3. **Aggiungi Clienti**: Crea alcuni clienti di test
4. **Crea Contratti**: Associa contratti ai clienti
5. **Testa AI**: Carica un PDF offerta come Super Admin

---

## 💡 Tips

- **Backup**: Copia semplicemente il file `gestionale_energia.db`
- **Performance**: SQLite è velocissimo per <10K record
- **Sicurezza**: Password hashate con bcrypt
- **GDPR**: Sistema compliant con audit log

---

## 🆘 Supporto

**Test rapidi:**
```powershell
# Test database
node test-db-direct.js

# Test backend
node test-login.js
```

**Se qualcosa non funziona:**
1. Ferma tutti i processi: `taskkill /F /IM node.exe`
2. Riavvia: `npm run dev`
3. Attendi 15 secondi
4. Accedi a http://localhost:5177

---

**Tutto pronto! Buon lavoro! 🚀**

