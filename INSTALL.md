# 🚀 Gestionale Energia - Guida Installazione Completa

## 📋 Installazione Rapida (Consigliata)

### Prerequisiti
- **Docker Desktop** installato ([Download qui](https://www.docker.com/products/docker-desktop/))
- **Git** installato ([Download qui](https://git-scm.com/downloads))

### 🎯 Installazione in 4 Passi

```bash
# 1. Clona il repository
git clone https://github.com/okaokay/gestionale-energia.git

# 2. Entra nella cartella
cd gestionale-energia

# 3. Copia il file di configurazione
copy .env.example .env    # Windows
# cp .env.example .env    # Linux/Mac

# 4. Avvia tutto con Docker
docker-compose up --build
```

### ✅ Accesso all'Applicazione

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Credenziali default**: 
  - Email: `admin@gestionale.it`
  - Password: `Admin123!`

---

## 🔧 Configurazione Avanzata

### Modifica Configurazione (.env)

Apri il file `.env` e personalizza le variabili secondo le tue necessità:

```env
# Cambia la chiave JWT per sicurezza
JWT_SECRET=la-tua-chiave-super-segreta

# Configura email (opzionale)
BREVO_API_KEY=la-tua-api-key-brevo
BREVO_SENDER_EMAIL=tua-email@dominio.it

# Configura AI (opzionale)
OPENAI_API_KEY=la-tua-api-key-openai
```

### Modalità Produzione

Per usare in produzione (con Nginx):

```bash
# Avvia in modalità produzione
docker-compose --profile production up app-prod --build

# Accesso: http://localhost (porta 80)
```

---

## 🛠️ Comandi Utili

### Gestione Container

```bash
# Ferma tutto
docker-compose down

# Riavvia tutto
docker-compose up

# Ricostruisci tutto da zero
docker-compose up --build --force-recreate

# Vedi i log
docker-compose logs -f

# Vedi solo i log del backend
docker-compose logs -f app
```

### Aggiornamenti

```bash
# Scarica gli aggiornamenti
git pull

# Riavvia con le modifiche
docker-compose up --build
```

---

## 📊 Database e Dati Demo

Il sistema include automaticamente:
- ✅ Database SQLite preconfigurato
- ✅ Utente admin predefinito
- ✅ 21 clienti privati di esempio
- ✅ Contratti luce e gas di esempio
- ✅ Dati demo per test completi

### Reset Database

Se vuoi ricominciare da capo:

```bash
# Ferma i container
docker-compose down

# Rimuovi i volumi (ATTENZIONE: cancella tutti i dati!)
docker-compose down -v

# Riavvia (ricreerà tutto da zero)
docker-compose up --build
```

---

## 🌐 Installazione Senza Git

Se non hai Git installato:

### Metodo 1: Download ZIP

1. Vai su https://github.com/okaokay/gestionale-energia
2. Clicca su "Code" → "Download ZIP"
3. Estrai il file ZIP
4. Apri il terminale nella cartella estratta
5. Continua dal passo 3 dell'installazione rapida

### Metodo 2: Docker Terminal

Puoi usare direttamente il terminale di Docker Desktop:

1. Apri Docker Desktop
2. Vai su "Images" → "Remote repositories"
3. Cerca `gestionale-energia`
4. Oppure usa il terminale integrato di Docker

---

## 🔍 Risoluzione Problemi

### Errore: "Port already in use"

```bash
# Trova cosa usa la porta 3001 o 5173
netstat -ano | findstr :3001    # Windows
# lsof -i :3001                 # Linux/Mac

# Cambia le porte nel docker-compose.yml se necessario
```

### Errore: "Docker not found"

1. Installa Docker Desktop
2. Assicurati che Docker sia avviato
3. Riavvia il terminale

### Errore: "Permission denied"

```bash
# Su Linux/Mac, potresti aver bisogno di sudo
sudo docker-compose up --build
```

### Container non si avvia

```bash
# Vedi i log dettagliati
docker-compose logs app

# Ricostruisci tutto
docker-compose down
docker-compose up --build --force-recreate
```

---

## 📱 Accesso da Altri Dispositivi

Per accedere da altri PC nella stessa rete:

1. Trova l'IP del PC che esegue Docker:
   ```bash
   ipconfig    # Windows
   # ifconfig  # Linux/Mac
   ```

2. Accedi da altri dispositivi:
   - Frontend: `http://IP-DEL-PC:5173`
   - Backend: `http://IP-DEL-PC:3001`

---

## 🔒 Sicurezza

### Per Uso in Produzione

1. **Cambia JWT_SECRET** nel file `.env`
2. **Usa HTTPS** con un reverse proxy (Nginx/Traefik)
3. **Configura firewall** per limitare l'accesso
4. **Backup regolari** del database
5. **Aggiorna regolarmente** con `git pull`

### Backup Database

```bash
# Il database è in: ./backend/database/database.sqlite
# Copia questo file per fare backup

# Con Docker, il file è persistente nei volumi
docker-compose exec app ls -la /app/backend/database/
```

---

## 🆘 Supporto

### Problemi Comuni

1. **Porte occupate**: Cambia le porte nel `docker-compose.yml`
2. **Memoria insufficiente**: Aumenta la RAM di Docker Desktop
3. **Spazio disco**: Pulisci immagini Docker non usate

### Pulizia Docker

```bash
# Rimuovi immagini non usate
docker system prune -a

# Rimuovi volumi non usati
docker volume prune
```

### Log Dettagliati

```bash
# Log completi dell'applicazione
docker-compose logs -f --tail=100 app

# Log solo errori
docker-compose logs -f app 2>&1 | grep -i error
```

---

## 🎉 Installazione Completata!

Se tutto funziona correttamente, dovresti vedere:

- ✅ Frontend accessibile su http://localhost:5173
- ✅ Backend API su http://localhost:3001
- ✅ Login con admin@gestionale.it / Admin123!
- ✅ Dashboard con dati demo caricati

**Buon lavoro con il Gestionale Energia! 🚀**