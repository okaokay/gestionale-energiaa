#!/bin/bash

# Script di Deployment Automatico per VPS Hostinger
# Gestionale Energia - gmgestionale.cloud

set -e  # Exit on any error

echo "🚀 Avvio deployment gestionale-energia su VPS..."
echo "================================================"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzione per log colorati
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verifica se siamo root
if [ "$EUID" -ne 0 ]; then
    log_error "Questo script deve essere eseguito come root"
    exit 1
fi

# Aggiorna sistema
log_info "Aggiornamento sistema..."
apt update && apt upgrade -y
log_success "Sistema aggiornato"

# Installa dipendenze base
log_info "Installazione dipendenze base..."
apt install -y curl wget git nano htop ufw
log_success "Dipendenze installate"

# Installa Docker se non presente
if ! command -v docker &> /dev/null; then
    log_info "Installazione Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    log_success "Docker installato"
else
    log_success "Docker già installato"
fi

# Installa Docker Compose se non presente
if ! command -v docker-compose &> /dev/null; then
    log_info "Installazione Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose installato"
else
    log_success "Docker Compose già installato"
fi

# Configura firewall
log_info "Configurazione firewall..."
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable
log_success "Firewall configurato"

# Clone repository se non esiste
if [ ! -d "/root/gestionale-energia" ]; then
    log_info "Clone repository da GitHub..."
    cd /root
    git clone https://github.com/okaokay/gestionale-energia.git
    log_success "Repository clonato"
else
    log_info "Aggiornamento repository..."
    cd /root/gestionale-energia
    git pull origin main
    log_success "Repository aggiornato"
fi

cd /root/gestionale-energia

# Crea file .env se non esiste
if [ ! -f ".env" ]; then
    log_info "Creazione file .env..."
    cp .env.hostinger.example .env
    
    # Genera JWT secret casuale
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
    
    log_success "File .env creato"
    log_warning "IMPORTANTE: Modifica il file .env con le tue API keys:"
    log_warning "nano /root/gestionale-energia/.env"
else
    log_success "File .env già presente"
fi

# Installa Nginx se non presente
if ! command -v nginx &> /dev/null; then
    log_info "Installazione Nginx..."
    apt install -y nginx
    systemctl enable nginx
    log_success "Nginx installato"
else
    log_success "Nginx già installato"
fi

# Configura Nginx
log_info "Configurazione Nginx..."
cat > /etc/nginx/sites-available/gmgestionale.cloud << 'EOF'
server {
    listen 80;
    server_name gmgestionale.cloud www.gmgestionale.cloud;
    
    # Per Let's Encrypt
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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Abilita sito
ln -sf /etc/nginx/sites-available/gmgestionale.cloud /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test configurazione Nginx
if nginx -t; then
    systemctl restart nginx
    log_success "Nginx configurato e riavviato"
else
    log_error "Errore nella configurazione Nginx"
    exit 1
fi

# Avvia applicazione Docker
log_info "Avvio container Docker..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d --build

# Attendi avvio servizi
log_info "Attesa avvio servizi (30 secondi)..."
sleep 30

# Test health check
log_info "Test health check..."
if curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    log_success "Health check OK"
else
    log_warning "Health check fallito - verifica i log"
    docker-compose -f docker-compose.prod.yml logs --tail=20
fi

# Installa Certbot se non presente
if ! command -v certbot &> /dev/null; then
    log_info "Installazione Certbot per SSL..."
    apt install -y certbot python3-certbot-nginx
    log_success "Certbot installato"
else
    log_success "Certbot già installato"
fi

# Crea script di backup
log_info "Creazione script di backup..."
cat > /root/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker exec gestionale-energia-backend-1 cp /app/database.db /app/backup-$DATE.db 2>/dev/null || true
docker cp gestionale-energia-backend-1:/app/backup-$DATE.db $BACKUP_DIR/ 2>/dev/null || true

# Mantieni solo gli ultimi 7 backup
find $BACKUP_DIR -name "backup-*.db" -mtime +7 -delete 2>/dev/null || true

echo "Backup completato: $BACKUP_DIR/backup-$DATE.db"
EOF

chmod +x /root/backup.sh
log_success "Script di backup creato"

# Crea script di update
log_info "Creazione script di update..."
cat > /root/update.sh << 'EOF'
#!/bin/bash
echo "🔄 Aggiornamento applicazione..."

cd /root/gestionale-energia
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build

echo "✅ Aggiornamento completato"
EOF

chmod +x /root/update.sh
log_success "Script di update creato"

# Verifica stato finale
log_info "Verifica stato servizi..."
echo "Docker containers:"
docker ps

echo ""
echo "Nginx status:"
systemctl status nginx --no-pager -l

echo ""
echo "================================================"
log_success "DEPLOYMENT COMPLETATO!"
echo ""
log_info "Prossimi passi:"
echo "1. Modifica il file .env se necessario:"
echo "   nano /root/gestionale-energia/.env"
echo ""
echo "2. Configura SSL con Let's Encrypt:"
echo "   certbot --nginx -d gmgestionale.cloud -d www.gmgestionale.cloud"
echo ""
echo "3. Test l'applicazione:"
echo "   http://gmgestionale.cloud (temporaneo)"
echo "   https://gmgestionale.cloud (dopo SSL)"
echo ""
log_info "Script utili creati:"
echo "   /root/backup.sh - Backup database"
echo "   /root/update.sh - Aggiorna applicazione"
echo ""
log_info "Log utili:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo "   tail -f /var/log/nginx/error.log"
echo ""
log_success "Deployment VPS completato con successo! 🎉"