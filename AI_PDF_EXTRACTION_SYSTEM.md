# 🔥 Sistema Avanzato di Estrazione PDF con AI

## 📌 Overview

Sistema ispirato a **Ai-pdf-form-filler** che usa AI (Ollama/Groq) per analizzare e mappare automaticamente i campi dei PDF usando il **contesto posizionale reale** estratto dal documento.

## 🎯 Vantaggi rispetto al sistema precedente

### ❌ Sistema Vecchio:
- Usava solo i **nomi dei campi** (es. "DATA_2", "N", "undefined_13")
- Non capiva a cosa servivano i campi
- Mapping generico e spesso sbagliato

### ✅ Sistema Nuovo:
- **Estrae il testo vicino** ad ogni campo (label, etichette)
- **Analizza la posizione** (sopra, sotto, a sinistra, a destra)
- **L'AI capisce il contesto** e mappa correttamente
- **Fallback intelligente** se l'AI fallisce

## 🏗️ Architettura

```
📄 PDF Template
    ↓
🔍 pdfContextExtractor.ts
    ├─ Estrae coordinate testo (pdf2json)
    ├─ Trova testo vicino ad ogni campo
    └─ Ritorna: campi + contesto
    ↓
🤖 aiFieldAnalyzer.ts
    ├─ Invia contesto a Ollama
    ├─ AI genera mappatura intelligente
    └─ Ritorna: campi con label, categoria, mapping
    ↓
💾 Database
    └─ Salva in `contract_templates.campi_estratti`
```

## 📂 File Creati

### 1. `backend/services/pdfContextExtractor.ts`
Estrae campi PDF con contesto posizionale:

```typescript
export interface FieldContext {
  fieldName: string;
  fieldType: string;
  x, y, width, height: number;
  page: number;
  contextBefore: string;   // "Cognome:"
  contextAfter: string;    // ""
  contextAbove: string;    // "Dati Anagrafici"
  contextBelow: string;    // ""
  nearbyText: string[];    // ["Cognome", "Nome", ...]
}
```

**Funzione principale:**
```typescript
extractPDFFieldsWithContext(pdfPath: string): Promise<ExtractedPDFData>
```

### 2. `backend/services/aiFieldAnalyzer.ts`
Analizza campi con AI usando il contesto:

```typescript
interface AnalyzedField {
  fieldName: string;
  label: string;           // "Cognome" (da AI)
  dataType: string;        // "text", "email", "date", etc.
  category: string;        // "anagrafica", "indirizzo_residenza", etc.
  description: string;     // Descrizione generata da AI
  required: boolean;       // Inferito da AI
  mappingSuggestion: string; // "cognome", "data_nascita", etc.
}
```

**Funzione principale:**
```typescript
analyzeFieldsWithAI(fields: FieldContext[]): Promise<AnalyzedField[]>
```

### 3. `backend/routes/contratti-gestione.ts` (Modificato)
Integrato il nuovo sistema con doppio fallback:

```typescript
async function estraiCampiPDF(pdfPath: string) {
  try {
    // 1. Estrai con contesto
    const extracted = await extractPDFFieldsWithContext(pdfPath);
    
    // 2. Analizza con AI
    const analyzed = await analyzeFieldsWithAI(extracted.fields);
    
    // 3. Trasforma e salva
    return formatted;
  } catch (error) {
    // Fallback al sistema precedente
    return estraiCampiPDFFallback(pdfPath);
  }
}
```

## 🧪 Come Testare

### 1. Upload un PDF
```
POST /api/contratti-gestione/templates/upload
```

### 2. Controlla i Log
Dovresti vedere:
```
🔥 === ANALISI AVANZATA PDF CON CONTESTO E AI ===
🔍 Estrazione campi con contesto posizionale...
✅ Estratti 70 campi con contesto
📋 Primi 5 campi: Cognome (label: "Cognome:"), ...
🤖 Analisi AI con contesto reale del PDF...
✅ Analizzati 70 campi con AI
✅ Analisi completata: 70 campi mappati con AI
📊 Categorie: anagrafica, residenza, fornitura, ...
```

### 3. Verifica nel Database
```sql
SELECT campi_estratti FROM contract_templates WHERE id = '...';
```

Dovresti vedere:
```json
{
  "campi": {
    "Cognome": {
      "nome_descrittivo": "Cognome",
      "categoria": "anagrafica",
      "descrizione": "Cognome del titolare",
      "dataType": "text",
      "required": true,
      "mappingSuggestion": "cognome",
      "contextBefore": "Cognome:",
      "etichetta_pdf": "Cognome:"
    },
    "DATA_2": {
      "nome_descrittivo": "Data di Nascita",
      "categoria": "anagrafica",
      "descrizione": "Data di nascita del titolare",
      "dataType": "date",
      "contextAbove": "Data di nascita",
      ...
    }
  }
}
```

## ⚙️ Configurazione AI

### Ollama (Default)
```env
AI_PROVIDER=ollama
OLLAMA_API_URL=http://185.31.67.249/api/generate
OLLAMA_MODEL=llama3:8b
```

### Groq (Alternativa)
```env
AI_PROVIDER=groq
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.1-70b-versatile
```

## 🔄 Sistema di Fallback

Il sistema ha **3 livelli di fallback**:

1. **Livello 1**: Estrazione con contesto + AI
2. **Livello 2**: Estrazione standard + AI generica
3. **Livello 3**: Euristiche intelligenti (no AI)

Garantisce sempre un risultato, anche se l'AI è offline!

## 📊 Confronto Risultati

### Prima (Sistema Vecchio):
```json
{
  "DATA_2": {
    "nome_descrittivo": "Data 2",
    "categoria": "date",
    "descrizione": "(Campo Aggiuntivo)"
  }
}
```

### Dopo (Sistema Nuovo):
```json
{
  "DATA_2": {
    "nome_descrittivo": "Data di Nascita",
    "categoria": "anagrafica",
    "descrizione": "Data di nascita del titolare del contratto",
    "contextAbove": "Data di nascita",
    "mappingSuggestion": "data_nascita"
  }
}
```

## 🚀 Performance

- **Estrazione campi**: ~1-2 secondi
- **Analisi AI**: ~5-10 secondi (dipende da Ollama)
- **Totale**: ~10-15 secondi per PDF (una tantum all'upload)

## 🛠️ Troubleshooting

### Errore: "Cannot find module 'pdf2json'"
```bash
npm install pdf2json --save
```

### AI timeout o errori
Il sistema userà automaticamente il fallback euristico.

### Campi non riconosciuti correttamente
1. Verifica che il PDF abbia campi interattivi
2. Controlla i log per vedere il contesto estratto
3. Migliora il prompt AI in `aiFieldAnalyzer.ts`

## 📝 Licenza & Credits

- Ispirato a: **Ai-pdf-form-filler** (GitHub)
- Librerie: `pdf-lib`, `pdf2json`, `axios`
- AI: Ollama (llama3:8b)


