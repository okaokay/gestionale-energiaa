#!/bin/bash

# ═══════════════════════════════════════════════════════
# GESTIONALE ENERGIA - SCRIPT DEPLOYMENT AUTOMATICO
# ═══════════════════════════════════════════════════════

set -e  # Esce se c'è un errore

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzioni di utilità
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════"
echo "🚀 GESTIONALE ENERGIA - DEPLOYMENT AUTOMATICO"
echo "═══════════════════════════════════════════════════════"
echo -e "${NC}"

# Verifica prerequisiti
print_step "Verifico prerequisiti..."

# Verifica Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker non trovato! Installa Docker Desktop da https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Verifica Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose non trovato! Assicurati che Docker Desktop sia installato correttamente."
    exit 1
fi

# Verifica Git (opzionale)
if ! command -v git &> /dev/null; then
    print_warning "Git non trovato. Puoi comunque usare il deployment se hai già i file."
fi

print_success "Prerequisiti verificati!"

# Verifica se siamo nella directory corretta
if [ ! -f "docker-compose.yml" ]; then
    print_error "File docker-compose.yml non trovato! Assicurati di essere nella directory del progetto."
    exit 1
fi

# Crea file .env se non esiste
print_step "Configuro ambiente..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success "File .env creato da .env.example"
    else
        print_error "File .env.example non trovato!"
        exit 1
    fi
else
    print_warning "File .env già esistente, non sovrascritto."
fi

# Chiedi modalità di deployment
echo ""
echo "Scegli modalità di deployment:"
echo "1) Sviluppo (porta 5173 + 3001)"
echo "2) Produzione (porta 80 + 3001)"
echo ""
read -p "Inserisci scelta (1 o 2): " choice

case $choice in
    1)
        COMPOSE_COMMAND="docker-compose up app --build"
        MODE="sviluppo"
        FRONTEND_URL="http://localhost:5173"
        ;;
    2)
        COMPOSE_COMMAND="docker-compose --profile production up app-prod --build"
        MODE="produzione"
        FRONTEND_URL="http://localhost"
        ;;
    *)
        print_error "Scelta non valida!"
        exit 1
        ;;
esac

# Ferma container esistenti
print_step "Fermo container esistenti..."
docker-compose down 2>/dev/null || true

# Pulisci immagini vecchie (opzionale)
read -p "Vuoi pulire le immagini Docker vecchie? (y/N): " clean_images
if [[ $clean_images =~ ^[Yy]$ ]]; then
    print_step "Pulisco immagini Docker vecchie..."
    docker system prune -f
fi

# Avvia deployment
print_step "Avvio deployment in modalità $MODE..."
echo ""
echo -e "${YELLOW}Comando eseguito:${NC} $COMPOSE_COMMAND"
echo ""

# Esegui il comando in background per poter mostrare info
$COMPOSE_COMMAND &
DOCKER_PID=$!

# Aspetta che i container si avviino
print_step "Attendo avvio container..."
sleep 10

# Verifica se i container sono attivi
if docker-compose ps | grep -q "Up"; then
    print_success "Container avviati correttamente!"
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 DEPLOYMENT COMPLETATO CON SUCCESSO!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}📱 ACCESSO APPLICAZIONE:${NC}"
    echo -e "   Frontend: $FRONTEND_URL"
    echo -e "   Backend:  http://localhost:3001"
    echo ""
    echo -e "${BLUE}🔑 CREDENZIALI DEFAULT:${NC}"
    echo -e "   Email:    admin@gestionale.it"
    echo -e "   Password: Admin123!"
    echo ""
    echo -e "${BLUE}🛠️  COMANDI UTILI:${NC}"
    echo -e "   Ferma:    docker-compose down"
    echo -e "   Log:      docker-compose logs -f"
    echo -e "   Riavvia:  docker-compose up --build"
    echo ""
    echo -e "${YELLOW}💡 Il deployment è in esecuzione in background.${NC}"
    echo -e "${YELLOW}   Premi Ctrl+C per fermarlo quando hai finito.${NC}"
    echo ""
    
    # Aspetta che l'utente prema Ctrl+C
    wait $DOCKER_PID
    
else
    print_error "Errore durante l'avvio dei container!"
    echo ""
    echo "Log degli errori:"
    docker-compose logs --tail=20
    exit 1
fi