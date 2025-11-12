# Guida Deployment VPS Hostinger - gmgestionale.cloud

## 📋 Prerequisiti
- VPS Hostinger attivo
- Dominio `gmgestionale.cloud` configurato
- Accesso SSH al VPS
- Repository GitHub: `https://github.com/okaokay/gestionale-energia.git`

## 🚀 Deployment Completo su VPS

### Opzione: Solo Docker con SSL automatico (Traefik)

Questa opzione consente di deployare tutto via Docker Manager usando soltanto il file Compose da GitHub, con SSL Let's Encrypt automatico gestito da Traefik. Non serve installare Nginx o Certbot sul VPS.

Prerequisiti:
- Il dominio `gmgestionale.cloud` (e `www.gmgestionale.cloud`) deve puntare all'IP del VPS (record A)
- Le porte `80` e `443` devono essere aperte verso il VPS

#### Versione Semplificata (Consigliata per Docker Manager)

Passi:
1) Hostinger → Docker → Docker Manager → Create project → From compose file
2) Incolla il link raw del compose semplificato:
   - `https://raw.githubusercontent.com/okaokay/gestionale-energia/main/docker-compose.vps-simple.yml`
3) Imposta Project name: `gestionale-energia`
4) Avvia il deployment

#### Versione Completa (se la semplificata non funziona)

Passi:
1) Hostinger → Docker → Docker Manager → Create project → From compose file
2) Incolla il link raw del compose Traefik:
   - `https://raw.githubusercontent.com/okaokay/gestionale-energia/main/docker-compose.vps-traefik.yml`
3) Imposta Project name: `gestionale-energia`
4) Avvia il deployment

### Configurazione Variabili d'Ambiente

**IMPORTANTE**: Prima del deployment, configura le variabili d'ambiente nel Docker Manager:

```bash
# Database (se usi MySQL esterno)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=gestionale_energia

# JWT Secret - CAMBIA QUESTO!
JWT_SECRET=your-super-secret-jwt-key-change-this

# Email (opzionale)
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=noreply@gmgestionale.cloud
```

### Differenze tra le Versioni

**Versione Semplificata (`docker-compose.vps-simple.yml`):**
- ✅ Non usa mount di file locali (compatibile con Docker Manager)
- ✅ App serve sia frontend che backend
- ✅ Configurazione più semplice
- ✅ Meno problemi di permessi

**Versione Completa (`docker-compose.vps-traefik.yml`):**
- ⚠️ Usa Nginx separato per servire il frontend
- ⚠️ Richiede mount di file locali (può causare problemi)
- ✅ Separazione più netta tra frontend e backend

Cosa succede:
- `traefik` espone `80/443`, verifica il dominio e genera i certificati SSL in automatico
- `traefik` instrada le richieste verso l'app che serve sia frontend che backend
- **Database SQLite** viene inizializzato automaticamente (se non usi MySQL)

Verifica:
- Dopo 30–120 secondi apri `https://gmgestionale.cloud` (lucchetto SSL attivo)
- API salute: `https://gmgestionale.cloud/api/health` e `https://gmgestionale.cloud/api/v1/status` (se presente)

Note:
- Email ACME usata: `admin@gmgestionale.cloud` (puoi cambiarla modificando il valore in `docker-compose.vps-traefik.yml`)
- I certificati sono persistiti nel volume `./traefik/letsencrypt`

Se non funziona il certificato:
- Verifica DNS del dominio e raggiungibilità sulla porta 80
- Assicurati che non ci siano servizi esterni (fuori da Docker) in ascolto su `80/443` sul VPS

### Passo 1: Connessione e Preparazione VPS

```bash
# Connettiti al VPS
ssh root@srv1072066.hstgr.cloud

# Aggiorna il sistema
apt update && apt upgrade -y

# Installa dipendenze essenziali
apt install -y curl wget git nano htop ufw
```

### Passo 2: Installazione Docker

```bash
# Rimuovi eventuali installazioni precedenti
apt remove -y docker docker-engine docker.io containerd runc

# Installa Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Installa Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verifica installazione
docker --version
docker-compose --version
```

### Passo 3: Configurazione Firewall

```bash
# Configura UFW
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable
ufw status
```

### Passo 4: Clone del Repository

```bash
# Vai nella directory home
cd /root

# Clone del repository
git clone https://github.com/okaokay/gestionale-energia.git
cd gestionale-energia

# Verifica contenuto
ls -la
```

### Passo 5: Configurazione Environment

```bash
# Copia il file di esempio per VPS
cp .env.hostinger.example .env

# Modifica le variabili d'ambiente
nano .env
```

**Configurazione .env per VPS:**
```env
# Database
DATABASE_URL="file:./database.db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Email (opzionale)
BREVO_API_KEY="your-brevo-api-key"

# AI (opzionale)
OPENAI_API_KEY="your-openai-api-key"

# Server
NODE_ENV="production"
PORT=3000

# Trust proxy per SSL
TRUST_PROXY=true

# Frontend URL
FRONTEND_URL="https://gmgestionale.cloud"
```

### Passo 6: Deployment con Docker

```bash
# Build e avvio dei container
docker-compose -f docker-compose.prod.yml up -d

# Verifica che i container siano attivi
docker ps

# Verifica i log
docker-compose -f docker-compose.prod.yml logs -f
```

### Passo 7: Installazione e Configurazione Nginx

```bash
# Installa Nginx
apt install -y nginx

# Backup configurazione default
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Crea configurazione per il dominio
nano /etc/nginx/sites-available/gmgestionale.cloud
```

**Configurazione Nginx (/etc/nginx/sites-available/gmgestionale.cloud):**
```nginx
server {
    listen 80;
    server_name gmgestionale.cloud www.gmgestionale.cloud;
    
    # Redirect temporaneo per Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Abilita il sito
ln -s /etc/nginx/sites-available/gmgestionale.cloud /etc/nginx/sites-enabled/

# Disabilita il sito default
rm /etc/nginx/sites-enabled/default

# Test configurazione
nginx -t

# Riavvia Nginx
systemctl restart nginx
systemctl enable nginx
```

### Passo 8: Configurazione SSL con Let's Encrypt

```bash
# Installa Certbot
apt install -y certbot python3-certbot-nginx

# Genera certificato SSL
certbot --nginx -d gmgestionale.cloud -d www.gmgestionale.cloud

# Verifica rinnovo automatico
certbot renew --dry-run
```

### Passo 9: Verifica Deployment

```bash
# Test connessione locale
curl http://localhost:8080/api/health

# Test connessione esterna
curl https://gmgestionale.cloud/api/health

# Verifica container Docker
docker ps
docker-compose -f docker-compose.prod.yml logs --tail=50
```

## 🔧 Script di Deployment Automatico

Crea uno script per automatizzare il deployment:

```bash
# Crea script di deployment
nano /root/deploy.sh
```

**Contenuto deploy.sh:**
```bash
#!/bin/bash

echo "🚀 Avvio deployment gestionale-energia..."

# Vai nella directory del progetto
cd /root/gestionale-energia

# Pull delle ultime modifiche
echo "📥 Aggiornamento codice da GitHub..."
git pull origin main

# Rebuild dei container
echo "🔨 Rebuild container Docker..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Attendi che i servizi si avviino
echo "⏳ Attesa avvio servizi..."
sleep 30

# Test health check
echo "🔍 Test health check..."
curl -f http://localhost:8080/api/health || echo "❌ Health check fallito"

# Verifica container
echo "📊 Stato container:"
docker ps

echo "✅ Deployment completato!"
echo "🌐 Applicazione disponibile su: https://gmgestionale.cloud"
```

```bash
# Rendi eseguibile lo script
chmod +x /root/deploy.sh

# Esegui il deployment
./deploy.sh
```

## 📊 Monitoraggio e Manutenzione

### Comandi Utili

```bash
# Stato servizi
systemctl status nginx
systemctl status docker

# Log in tempo reale
docker-compose -f docker-compose.prod.yml logs -f
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Riavvio servizi
systemctl restart nginx
docker-compose -f docker-compose.prod.yml restart

# Aggiornamento applicazione
cd /root/gestionale-energia
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build

# Backup database
docker exec gestionale-energia-backend-1 cp /app/database.db /app/backup-$(date +%Y%m%d).db
```

### Configurazione Backup Automatico

```bash
# Crea script backup
nano /root/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker exec gestionale-energia-backend-1 cp /app/database.db /app/backup-$DATE.db
docker cp gestionale-energia-backend-1:/app/backup-$DATE.db $BACKUP_DIR/

# Mantieni solo gli ultimi 7 backup
find $BACKUP_DIR -name "backup-*.db" -mtime +7 -delete

echo "Backup completato: $BACKUP_DIR/backup-$DATE.db"
```

```bash
# Rendi eseguibile
chmod +x /root/backup.sh

# Aggiungi al crontab per backup giornaliero
crontab -e
# Aggiungi: 0 2 * * * /root/backup.sh
```

## 🔍 Troubleshooting

### Problemi Comuni

1. **Container non si avvia:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs
   docker system prune -f
   ```

2. **Nginx errore 502:**
   ```bash
   curl http://localhost:8080/api/health
   systemctl restart nginx
   ```

3. **SSL non funziona:**
   ```bash
   certbot certificates
   nginx -t
   systemctl restart nginx
   ```

4. **Database corrotto:**
   ```bash
   # Ripristina backup
   docker cp /root/backups/backup-YYYYMMDD.db gestionale-energia-backend-1:/app/database.db
   docker-compose -f docker-compose.prod.yml restart
   ```

## 📞 Supporto

- **Test SSL**: https://www.ssllabs.com/ssltest/
- **Verifica sito**: https://gmgestionale.cloud
- **API Health**: https://gmgestionale.cloud/api/health
- **Log Nginx**: `tail -f /var/log/nginx/error.log`
- **Log Docker**: `docker-compose -f docker-compose.prod.yml logs -f`

## 🎯 Checklist Post-Deployment

- [ ] VPS configurato e aggiornato
- [ ] Docker e Docker Compose installati
- [ ] Repository clonato
- [ ] File .env configurato
- [ ] Container Docker avviati
- [ ] Nginx installato e configurato
- [ ] SSL attivato con Let's Encrypt
- [ ] Firewall configurato
- [ ] Test https://gmgestionale.cloud funzionante
- [ ] Test API https://gmgestionale.cloud/api/health
- [ ] Backup automatico configurato
- [ ] Script di deployment creato