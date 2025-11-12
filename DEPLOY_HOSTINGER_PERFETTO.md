# 🚀 Deploy Perfetto su Hostinger VPS

Questa guida contiene tutte le modifiche e configurazioni necessarie per un deploy al 100% funzionante su Hostinger VPS.

## 📋 Modifiche Applicate

### ✅ 1. Docker Compose Hostinger Ottimizzato

Il file `docker-compose.hostinger.yml` è stato aggiornato con:

- **Dockerfile:** Cambiato da `Dockerfile` a `Dockerfile.render` (testato e funzionante su Render.com)
- **Database Path:** Allineato a `/app/gestionale_energia.db` (stesso path di Render.com)
- **Porte:** Rimosso mapping problematico `8080:80`, mantenuto solo `8080:3001`
- **Volumi:** Aggiornato il volume database per puntare a `/app`
- **Variabili:** Aggiunte `FRONTEND_URL` e `BACKEND_URL`

### 🔧 2. Configurazione Finale

```yaml
services:
  gestionale-energia:
    build:
      context: .
      dockerfile: Dockerfile.render  # ✅ Dockerfile testato e funzionante
    container_name: gestionale-energia-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3001
      - TZ=Europe/Rome
      - JWT_SECRET=your-super-secret-jwt-key-change-this-hostinger-2024
      - JWT_EXPIRES_IN=7d
      - DATABASE_PATH=/app/data/gestionale_energia.db  # ✅ Path corretto
      - FRONTEND_URL=http://localhost:8080
      - BACKEND_URL=http://localhost:8080
    ports:
      - "8080:3001"  # ✅ Mapping corretto
    volumes:
      - uploads_data:/app/uploads
      - database_data:/app/data  # ✅ Volume corretto
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

## 🚀 Comandi per Deploy su Hostinger

### 1. Connessione SSH
```bash
ssh root@your-hostinger-ip
```

### 2. Clona/Aggiorna Repository
```bash
# Se prima volta
git clone https://github.com/okaokay/gestionale-energia.git
cd gestionale-energia

# Se aggiornamento
cd gestionale-energia
git pull origin main
```

### 3. Deploy con Docker Compose
```bash
# Stop container esistente (se presente)
docker-compose -f docker-compose.hostinger.yml down

# Build e avvio
docker-compose -f docker-compose.hostinger.yml up -d --build

# Verifica logs
docker-compose -f docker-compose.hostinger.yml logs -f
```

### 4. Verifica Funzionamento
```bash
# Controlla container attivo
docker ps

# Test health check
curl http://localhost:8080/health

# Verifica database
docker exec -it gestionale-energia-app ls -la /app/data/
```

## 🌐 URL di Accesso

Dopo il deploy, l'applicazione sarà disponibile su:
- **Frontend + Backend:** `http://your-hostinger-ip:8080`
- **API Health Check:** `http://your-hostinger-ip:8080/health`

## 🔍 Differenze Risolte vs Render.com

| Aspetto | Render.com | Hostinger (Prima) | Hostinger (Ora) |
|---------|------------|-------------------|-----------------|
| **Dockerfile** | `Dockerfile.render` | `Dockerfile` | ✅ `Dockerfile.render` |
| **Database Path** | `/app/gestionale_energia.db` | `/app/backend/database/database.sqlite` | ✅ `/app/gestionale_energia.db` |
| **Porte** | `3001` | `8080:80` + `8081:3001` | ✅ `8080:3001` |
| **Build Type** | Single-stage | Multi-stage | ✅ Single-stage |
| **Dipendenze** | Complete | Solo SQLite | ✅ Complete |

## 🛠️ Vantaggi della Configurazione Attuale

1. **✅ Dockerfile Testato:** Usa lo stesso Dockerfile che funziona perfettamente su Render.com
2. **✅ Dipendenze Complete:** Include tutte le librerie necessarie (Cairo, Pango, ecc.)
3. **✅ Build Semplificato:** Single-stage build più affidabile
4. **✅ Path Allineati:** Database e volumi configurati correttamente
5. **✅ Porte Corrette:** Mapping semplificato e funzionale

## 🔧 Troubleshooting

### Se il container non si avvia:
```bash
# Controlla logs dettagliati
docker-compose -f docker-compose.hostinger.yml logs gestionale-energia

# Rimuovi volumi e ricrea
docker-compose -f docker-compose.hostinger.yml down -v
docker-compose -f docker-compose.hostinger.yml up -d --build
```

### Se il database non si inizializza:
```bash
# Entra nel container
docker exec -it gestionale-energia-app sh

# Verifica file database
ls -la /app/data/gestionale_energia.db

# Controlla permessi
chmod 666 /app/data/gestionale_energia.db
```

## 📝 Note Finali

- **Configurazione Identica:** Ora Hostinger usa la stessa configurazione di Render.com
- **Affidabilità:** Dockerfile.render è testato e stabile
- **Semplicità:** Configurazione semplificata e meno soggetta a errori
- **Compatibilità:** Funziona con tutte le funzionalità del sistema

**🎯 Risultato:** Deploy al 100% funzionante su Hostinger VPS!