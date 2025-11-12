/**
 * 🔍 PDF Layout Analyzer
 * 
 * Analizza visivamente un PDF statico (anche scansionato) e identifica:
 * - Posizioni dove inserire campi di testo (linee vuote, underscore, etc.)
 * - Posizioni di checkbox (caselle quadrate, simboli ☐)
 * - Etichette associate ai campi (es. "Nome:", "Cognome:", "Data:")
 * - Pattern comuni (date, email, telefoni, codici fiscali)
 */

// Dynamic import per supportare ESM in ambiente CommonJS
let pdfjsLib: any = null;

async function loadPdfJs() {
    if (!pdfjsLib) {
        pdfjsLib = await import('pdfjs-dist');
        // Disabilita worker in Node.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
    return pdfjsLib;
}

interface TextItem {
    str: string;
    transform: number[];
    width: number;
    height: number;
}

export interface DetectedField {
    type: 'text' | 'checkbox' | 'date' | 'email' | 'tel' | 'number' | 'textarea';
    label: string;              // Etichetta rilevata (es. "Nome:", "Cognome:")
    x: number;                  // Posizione X
    y: number;                  // Posizione Y
    width: number;              // Larghezza suggerita
    height: number;             // Altezza suggerita
    page: number;               // Numero pagina
    confidence: number;         // Confidenza del rilevamento (0-1)
    nearbyText: string[];       // Testo vicino per contesto
    fieldName: string;          // Nome suggerito per il campo
    required: boolean;          // Se sembra obbligatorio
}

export interface PDFLayoutAnalysis {
    totalPages: number;
    fields: DetectedField[];
    textBlocks: Array<{
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
        page: number;
    }>;
}

/**
 * 🔍 Analizza il layout di un PDF e rileva dove creare i campi
 */
export async function analyzePDFLayout(pdfPath: string): Promise<PDFLayoutAnalysis> {
    console.log('\n🔍 === ANALISI LAYOUT PDF ===');
    console.log('📄 File:', pdfPath);
    
    // Carica pdfjs dinamicamente
    const pdfjs = await loadPdfJs();
    
    const fs = require('fs');
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjs.getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    
    const totalPages = pdfDocument.numPages;
    console.log(`📊 Pagine totali: ${totalPages}`);
    
    const allFields: DetectedField[] = [];
    const allTextBlocks: any[] = [];
    
    // Analizza ogni pagina
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        console.log(`\n📄 Analisi pagina ${pageNum}/${totalPages}...`);
        
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Estrai tutti i blocchi di testo con coordinate
        const textItems = textContent.items.filter((item: any) => item.str && item.transform) as TextItem[];
        
        for (const item of textItems) {
            if (!item.transform || !item.str) continue;
            
            const [scaleX, , , scaleY, x, y] = item.transform;
            const text = item.str.trim();
            
            if (text.length > 0) {
                allTextBlocks.push({
                    text,
                    x: x,
                    y: viewport.height - y, // Inverti Y per coordinate standard
                    width: item.width,
                    height: item.height,
                    page: pageNum
                });
            }
        }
        
        // 🔍 FASE 1: Rileva etichette di campi
        const labels = detectFieldLabels(textItems, viewport);
        console.log(`   ✅ Rilevate ${labels.length} potenziali etichette`);
        
        // 🔍 FASE 2: Rileva linee vuote e underscore (indicano campi di testo)
        const emptyLines = detectEmptyLines(textItems, viewport);
        console.log(`   ✅ Rilevate ${emptyLines.length} linee vuote`);
        
        // 🔍 FASE 3: Rileva checkbox (caselle quadrate, simboli ☐)
        const checkboxes = detectCheckboxes(textItems, viewport);
        console.log(`   ✅ Rilevati ${checkboxes.length} checkbox`);
        
        // 🔍 FASE 4: Abbina etichette → campi
        const pageFields = matchLabelsToFields(labels, emptyLines, checkboxes, pageNum, allTextBlocks);
        allFields.push(...pageFields);
        
        console.log(`   ✅ Creati ${pageFields.length} campi per questa pagina`);
    }
    
    console.log(`\n✅ Analisi completata: ${allFields.length} campi rilevati in totale`);
    
    return {
        totalPages,
        fields: allFields,
        textBlocks: allTextBlocks
    };
}

/**
 * 🏷️ Rileva etichette di campi (es. "Nome:", "Cognome:", "Data di nascita:")
 */
function detectFieldLabels(textItems: TextItem[], viewport: any): Array<{ text: string; x: number; y: number; width: number; height: number }> {
    const labels: Array<{ text: string; x: number; y: number; width: number; height: number }> = [];
    
    for (const item of textItems) {
        if (!item.transform || !item.str) continue;
        
        const text = item.str.trim();
        const [, , , , x, y] = item.transform;
        
        // Pattern comuni per etichette
        const isLabel = 
            text.endsWith(':') ||                                    // "Nome:"
            text.includes('__') ||                                   // "Nome ____"
            /^(nome|cognome|data|codice|telefono|email|indirizzo|comune|cap|provincia|pdr|pod|potenza|consumo|fornitore|agenzia|agente)/i.test(text) ||
            text.match(/\b(di nascita|fiscale|residenza|fornitura|attivazione|scadenza)\b/i);
        
        if (isLabel && text.length > 2 && text.length < 100) {
            labels.push({
                text: text.replace(/[:_]/g, '').trim(),
                x: x,
                y: viewport.height - y,
                width: item.width,
                height: item.height
            });
        }
    }
    
    return labels;
}

/**
 * 📏 Rileva linee vuote (underscore, spazi, linee orizzontali)
 */
function detectEmptyLines(textItems: TextItem[], viewport: any): Array<{ x: number; y: number; width: number; height: number }> {
    const lines: Array<{ x: number; y: number; width: number; height: number }> = [];
    
    for (const item of textItems) {
        if (!item.transform || !item.str) continue;
        
        const text = item.str.trim();
        const [, , , , x, y] = item.transform;
        
        // Rileva sequenze di underscore o spazi
        if (text.match(/^[_\s]{3,}$/) || text.match(/^\.{3,}$/)) {
            lines.push({
                x: x,
                y: viewport.height - y,
                width: item.width || 100, // Default 100px
                height: item.height || 20  // Default 20px
            });
        }
    }
    
    return lines;
}

/**
 * ☑️ Rileva checkbox (caselle quadrate, simboli ☐ ☑ ✓)
 */
function detectCheckboxes(textItems: TextItem[], viewport: any): Array<{ x: number; y: number; label: string }> {
    const checkboxes: Array<{ x: number; y: number; label: string }> = [];
    
    for (let i = 0; i < textItems.length; i++) {
        const item = textItems[i];
        if (!item.transform || !item.str) continue;
        
        const text = item.str.trim();
        const [, , , , x, y] = item.transform;
        
        // Rileva simboli di checkbox
        if (text.match(/^[☐☑✓✔◻◼▢▣□■]$/) || text === '[ ]' || text === '[X]') {
            // Cerca l'etichetta accanto
            let label = '';
            if (i + 1 < textItems.length) {
                const nextItem = textItems[i + 1];
                if (nextItem.str) {
                    label = nextItem.str.trim();
                }
            }
            
            checkboxes.push({
                x: x,
                y: viewport.height - y,
                label: label || 'Checkbox'
            });
        }
    }
    
    return checkboxes;
}

/**
 * 🔗 Abbina etichette ai campi rilevati
 */
function matchLabelsToFields(
    labels: Array<{ text: string; x: number; y: number; width: number; height: number }>,
    emptyLines: Array<{ x: number; y: number; width: number; height: number }>,
    checkboxes: Array<{ x: number; y: number; label: string }>,
    pageNum: number,
    allTextBlocks: any[]
): DetectedField[] {
    const fields: DetectedField[] = [];
    const PROXIMITY_THRESHOLD = 50; // pixel
    
    // 1️⃣ Abbina etichette a linee vuote (campi di testo)
    for (const label of labels) {
        // Cerca la linea vuota più vicina (a destra o sotto)
        let closestLine = null;
        let minDistance = Infinity;
        
        for (const line of emptyLines) {
            // Calcola distanza (privilegia destra e sotto)
            const isRight = line.x > label.x && Math.abs(line.y - label.y) < 20;
            const isBelow = line.y < label.y && Math.abs(line.x - label.x) < 50;
            
            if (isRight || isBelow) {
                const distance = Math.sqrt(Math.pow(line.x - label.x, 2) + Math.pow(line.y - label.y, 2));
                if (distance < minDistance && distance < PROXIMITY_THRESHOLD) {
                    minDistance = distance;
                    closestLine = line;
                }
            }
        }
        
        if (closestLine) {
            const fieldType = inferFieldType(label.text);
            const fieldName = generateFieldName(label.text);
            const nearbyText = getNearbyText(closestLine.x, closestLine.y, pageNum, allTextBlocks);
            
            fields.push({
                type: fieldType,
                label: label.text,
                x: closestLine.x,
                y: closestLine.y,
                width: closestLine.width,
                height: closestLine.height,
                page: pageNum,
                confidence: 0.8,
                nearbyText,
                fieldName,
                required: label.text.includes('*') || /\b(obbligatorio|required)\b/i.test(label.text)
            });
        }
    }
    
    // 2️⃣ Aggiungi checkbox rilevati
    for (const checkbox of checkboxes) {
        const fieldName = generateFieldName(checkbox.label);
        const nearbyText = getNearbyText(checkbox.x, checkbox.y, pageNum, allTextBlocks);
        
        fields.push({
            type: 'checkbox',
            label: checkbox.label || 'Checkbox',
            x: checkbox.x,
            y: checkbox.y,
            width: 15,
            height: 15,
            page: pageNum,
            confidence: 0.9,
            nearbyText,
            fieldName,
            required: false
        });
    }
    
    return fields;
}

/**
 * 🧠 Inferisci il tipo di campo dall'etichetta
 */
function inferFieldType(label: string): 'text' | 'date' | 'email' | 'tel' | 'number' | 'textarea' {
    const lower = label.toLowerCase();
    
    if (lower.match(/\b(data|date|nascita|attivazione|scadenza)\b/)) return 'date';
    if (lower.match(/\b(email|e-mail|pec)\b/)) return 'email';
    if (lower.match(/\b(telefono|cellulare|tel|mobile|phone)\b/)) return 'tel';
    if (lower.match(/\b(consumo|potenza|kwh|smc|kw|numero|quantità|codice)\b/)) return 'number';
    if (lower.match(/\b(note|osservazioni|descrizione|indirizzo completo)\b/)) return 'textarea';
    
    return 'text';
}

/**
 * 📝 Genera nome campo univoco dall'etichetta
 */
function generateFieldName(label: string): string {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
}

/**
 * 📍 Ottieni testo vicino per contesto
 */
function getNearbyText(x: number, y: number, page: number, allTextBlocks: any[]): string[] {
    const RANGE = 100;
    
    return allTextBlocks
        .filter(block => 
            block.page === page &&
            Math.abs(block.x - x) < RANGE &&
            Math.abs(block.y - y) < RANGE
        )
        .map(block => block.text)
        .slice(0, 5);
}

