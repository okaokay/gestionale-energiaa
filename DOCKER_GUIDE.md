# Guida Docker per Gestionale Energia

## Modalità Sviluppo (equivalente a `npm run dev`)

Per avviare l'applicazione in modalità sviluppo con Docker:

```bash
# Build e avvio
docker-compose up --build

# Oppure in background
docker-compose up --build -d
```

Questo comando:
- Avvia il backend su `http://localhost:3001` con hot-reload
- Avvia il frontend su `http://localhost:5173` con Vite dev server
- Monta il codice sorgente per modifiche in tempo reale
- Persiste database e uploads

### Comandi utili per sviluppo:

```bash
# Fermare i container
docker-compose down

# Vedere i logs
docker-compose logs -f

# Accedere al container
docker-compose exec app sh

# Ricostruire solo se necessario
docker-compose up --build --force-recreate
```

## Modalità Produzione

Per la produzione, usa il file docker-compose separato:

```bash
# Build e avvio produzione
docker-compose -f docker-compose.prod.yml up --build -d
```

## File Docker

- `docker-compose.yml` - Configurazione per sviluppo
- `docker-compose.prod.yml` - Configurazione per produzione  
- `Dockerfile` - Build per produzione
- `Dockerfile.dev` - Build per sviluppo

## Porte

- **Backend**: 3001
- **Frontend (dev)**: 5173
- **Nginx (prod)**: 80, 443

## Volumi

- Codice sorgente montato per hot-reload
- Database persistente in `./backend/database`
- Uploads persistenti in `./uploads`

## Troubleshooting

Se hai problemi:

1. Ferma tutto: `docker-compose down`
2. Pulisci: `docker system prune -f`
3. Ricostruisci: `docker-compose up --build --force-recreate`