# 🚀 Setup Repository GitHub

## 📋 Istruzioni per creare il repository su GitHub

### 1. Crea il Repository su GitHub

1. Vai su https://github.com/okaokay
2. Clicca su "New repository" (pulsante verde)
3. Configura il repository:
   - **Repository name**: `gestionale-energia`
   - **Description**: `Sistema di gestione energia con CRM, contratti, email marketing e automazioni. Deploy-ready per Render.com`
   - **Visibility**: Public (per deploy gratuito su Render)
   - **Initialize**: NON selezionare "Add a README file" (abbiamo già i nostri file)
4. Clicca "Create repository"

### 2. Comandi Git per il Push

Dopo aver creato il repository, esegui questi comandi nella directory del progetto:

```bash
# Inizializza git (se non già fatto)
git init

# Aggiungi il remote origin
git remote add origin https://github.com/okaokay/gestionale-energia.git

# Aggiungi tutti i file (rispettando .gitignore)
git add .

# Fai il primo commit
git commit -m "Initial commit: Gestionale Energia with Render deployment config"

# Imposta il branch principale
git branch -M main

# Push del codice
git push -u origin main
```

### 3. Verifica Upload

Dopo il push, verifica su GitHub che siano presenti:

✅ **File di Deploy**:
- `Dockerfile.render`
- `render.yaml`
- `README-DEPLOY.md`

✅ **Codice Sorgente**:
- `backend/` (codice TypeScript)
- `frontend/` (codice React)
- `package.json`

✅ **Configurazione**:
- `.env.example`
- `.gitignore` (aggiornato)

❌ **File Esclusi** (correttamente):
- `node_modules/`
- `.env`
- `*.db` files
- File di test (`test-*.js`, `debug-*.js`, etc.)

### 4. Prossimi Passi

Dopo il push su GitHub:

1. 🔗 **Connetti a Render.com**
2. 🚀 **Deploy automatico**
3. ✅ **Test dell'applicazione**

## 🔧 Troubleshooting

### Errore: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/okaokay/gestionale-energia.git
```

### Errore: "nothing to commit"
Verifica che `.gitignore` non escluda troppi file:
```bash
git status
git add . --force
```

### File troppo grandi
Se ci sono file > 100MB, usa Git LFS:
```bash
git lfs track "*.db"
git add .gitattributes
```