# Multi-stage build per ottimizzare le dimensioni dell'immagine

# Stage 1: Build del frontend
FROM node:22 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build del backend
FROM node:22 AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY backend/ ./backend/
COPY tsconfig.json ./
RUN npx tsc -p tsconfig.json

# Stage 3: Immagine finale di produzione
FROM node:22 AS production
WORKDIR /app

# Installa SQLite3, Python, curl e strumenti di build necessari per better-sqlite3
RUN apt-get update && apt-get install -y \
    sqlite3 \
    python3 \
    curl \
    make \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    libpixman-1-dev \
    && rm -rf /var/lib/apt/lists/*

# Configura Python per node-gyp
RUN ln -sf /usr/bin/python3 /usr/bin/python
ENV PYTHON=/usr/bin/python3
ENV npm_config_python=/usr/bin/python3

# Copia le dipendenze di produzione
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copia il backend compilato
COPY --from=backend-builder /app/dist ./dist

# Copia il frontend buildato
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copia i file necessari
COPY backend/database/schema.sql ./backend/database/
COPY scripts ./scripts
COPY seed_data ./seed_data

# Crea le directory necessarie
RUN mkdir -p uploads/temp uploads/contracts uploads/documenti uploads/clienti backend/database

# La migrazione DB verrà eseguita all'avvio tramite scripts/start-with-migrate.js

# Espone la porta del backend
EXPOSE 3001

# Variabili d'ambiente di produzione
ENV NODE_ENV=production
ENV PORT=3001

# Comando di avvio con migrazione automatica (se necessario)
CMD ["node", "scripts/start-with-migrate.js"]