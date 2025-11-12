# Guida al Deployment su Hostinger VPS

## Prerequisiti

1. **VPS Hostinger attivo** con accesso SSH
2. **Docker e Docker Compose installati** sul VPS
3. **Dominio configurato** (opzionale ma consigliato)

## Preparazione del VPS

### 1. Connessione SSH
```bash
ssh root@your-vps-ip
```

### 2. Aggiornamento del sistema
```bash
apt update && apt upgrade -y
```

### 3. Installazione Docker
```bash
# Installa Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installa Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verifica l'installazione
docker --version
docker-compose --version
```

### 4. Configurazione Firewall
```bash
# Consenti le porte necessarie
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

## Deployment dell'Applicazione

### 1. Trasferimento dei file
Puoi utilizzare diversi metodi:

#### Opzione A: Git (Consigliato)
```bash
# Sul VPS
cd /opt
git clone https://github.com/your-username/gestionale-energia.git
cd gestionale-energia
```

#### Opzione B: SCP/SFTP
```bash
# Dal tuo computer locale
scp -r ./gestionale-energia root@your-vps-ip:/opt/
```

### 2. Configurazione delle variabili d'ambiente
```bash
# Sul VPS
cd /opt/gestionale-energia
cp .env.hostinger.example .env

# Modifica le variabili d'ambiente
nano .env
```

**Variabili importanti da modificare:**
- `JWT_SECRET`: Genera una chiave sicura lunga e casuale
- `FRONTEND_URL`: Il tuo dominio (es: https://yourdomain.com)
- `BACKEND_URL`: Il tuo dominio + /api (es: https://yourdomain.com/api)
- `CORS_ORIGIN`: Il tuo dominio

### 3. Preparazione del database (SQLite persistente)
Il container usa un file SQLite persistito nel volume Docker `database_data` montato su `/app`. Alla prima esecuzione viene creato e migrato automaticamente se `INIT_DB=true`.

```bash
# Verifica volume e file DB dopo il primo avvio
docker volume ls
docker-compose exec gestionale-energia ls -la /app | grep gestionale_energia.db
```

### 4. Build e avvio dell'applicazione
Usa la configurazione pronta per Hostinger (`docker-compose.yml`).

```bash
# Build dell'immagine Docker e avvio
docker-compose up -d --build

# Verifica che il container sia in esecuzione
docker-compose ps
```

### 5. Verifica del deployment
```bash
# Controlla i log
docker-compose logs -f

# Testa l'endpoint di health del backend
curl http://localhost:8080/health

# API di test
curl http://localhost:8080/api/auth/status
```

## Configurazione del Dominio

### 1. DNS Configuration
Nel pannello di controllo del tuo dominio, configura:
- **A Record**: `@` → IP del tuo VPS
- **A Record**: `www` → IP del tuo VPS

### 2. SSL Certificate (Let's Encrypt)
```bash
# Installa Certbot
apt install certbot python3-certbot-nginx -y

# Ottieni il certificato SSL
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Il certificato si rinnoverà automaticamente
```

### 3. Opzione Nginx come reverse proxy (facoltativa)
La configurazione attuale `docker-compose.yml` espone direttamente la porta `8080` del container applicativo. Se preferisci usare Nginx come reverse proxy e/o servire i file statici, usa `docker-compose.prod.yml` che include il servizio `nginx` e aggiorna `nginx.conf` con il tuo dominio.

```bash
# Usa compose con nginx
docker-compose -f docker-compose.prod.yml up -d --build

# Assicurati che il frontend sia buildato in ./frontend/dist se montato da host
```

## Monitoraggio e Manutenzione

### 1. Backup del Database
```bash
# Script di backup automatico
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# Backup del database
cp /opt/gestionale-energia/backend/database/database.sqlite $BACKUP_DIR/database_$DATE.sqlite

# Mantieni solo gli ultimi 7 backup
find $BACKUP_DIR -name "database_*.sqlite" -mtime +7 -delete
EOF

chmod +x /opt/backup-db.sh

# Aggiungi al crontab per backup giornaliero
echo "0 2 * * * /opt/backup-db.sh" | crontab -
```

### 2. Aggiornamento dell'applicazione
```bash
# Ferma i servizi
docker-compose down

# Aggiorna il codice (se usi Git)
git pull origin main

# Rebuild e riavvio (compose Hostinger)
docker-compose up -d --build

# Rebuild e riavvio (con nginx)
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Monitoraggio dei log
```bash
# Log in tempo reale
docker-compose logs -f

# Log specifici di un servizio
docker-compose logs -f app
docker-compose logs -f nginx
```

### 4. Pulizia del sistema
```bash
# Rimuovi immagini Docker non utilizzate
docker system prune -a

# Rimuovi volumi non utilizzati
docker volume prune
```

## Risoluzione Problemi Comuni

### 1. Container non si avvia
```bash
# Controlla i log dettagliati
docker-compose logs app

# Verifica la configurazione
docker-compose config
```

### 2. Problemi di connessione al database
```bash
# Verifica i permessi del file database
ls -la backend/database/database.sqlite
chmod 664 backend/database/database.sqlite
```

### 3. Errori 502 Bad Gateway
```bash
# Verifica che l'app sia in ascolto sulla porta corretta
docker-compose exec app netstat -tlnp
```

### 4. Problemi di memoria
```bash
# Monitora l'uso delle risorse
docker stats

# Se necessario, aggiungi limiti di memoria nel docker-compose.yml
```

## Configurazione Avanzata

### 1. Reverse Proxy con Nginx esterno
Se preferisci usare Nginx installato direttamente sul VPS:

```bash
# Installa Nginx
apt install nginx -y

# Copia la configurazione
cp nginx.conf /etc/nginx/sites-available/gestionale-energia
ln -s /etc/nginx/sites-available/gestionale-energia /etc/nginx/sites-enabled/

# Usa il compose Hostinger senza il servizio nginx e pubblica la porta 8080
```

### 2. Database esterno
Per utilizzare un database PostgreSQL o MySQL esterno, modifica:
- Le variabili d'ambiente nel `.env`
- La configurazione database in `backend/config/database.ts`
- Rimuovi il volume SQLite dal `docker-compose.yml`

## Sicurezza

### 1. Configurazione Firewall avanzata
```bash
# Blocca tutto tranne le porte necessarie
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
```

### 2. Fail2Ban per protezione SSH
```bash
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

### 3. Aggiornamenti automatici di sicurezza
```bash
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

## Supporto

Per problemi specifici:
1. Controlla sempre i log: `docker-compose logs -f`
2. Verifica la configurazione: `docker-compose config`
3. Testa la connettività: `curl -I http://localhost/health`

## Costi Stimati Hostinger

- **VPS 1**: ~4€/mese (1 vCPU, 1GB RAM) - Adatto per test
- **VPS 2**: ~8€/mese (2 vCPU, 2GB RAM) - Consigliato per produzione
- **VPS 3**: ~16€/mese (4 vCPU, 4GB RAM) - Per carichi elevati

**Nota**: I prezzi possono variare, controlla sempre il sito Hostinger per le tariffe aggiornate.