/**
 * 🏷️ PDF Label Reader
 * 
 * Legge le etichette vicino ai campi PDF per capire cosa rappresentano.
 * Non crea campi, solo legge il testo per dare contesto.
 */

import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';

// Dynamic import per pdfjs
let pdfjsLib: any = null;

async function loadPdfJs() {
    if (!pdfjsLib) {
        pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
    return pdfjsLib;
}

interface FieldWithLabel {
    fieldName: string;
    fieldType: string;
    label: string;
    nearbyText: string[];  // Testo vicino al campo
    suggestedLabel: string; // Etichetta suggerita dall'OCR
}

/**
 * 🔍 Legge il PDF e associa etichette ai campi esistenti
 */
export async function readFieldLabels(pdfPath: string): Promise<FieldWithLabel[]> {
    console.log('\n🏷️ === LETTURA ETICHETTE PDF ===');
    
    try {
        // 1️⃣ Estrai campi esistenti con pdf-lib
        const pdfBytes = await fs.readFile(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        
        console.log(`📋 Trovati ${fields.length} campi nel PDF`);
        
        // 2️⃣ Leggi tutto il testo del PDF con coordinate
        const pdfjs = await loadPdfJs();
        const fsSync = require('fs');
        const data = new Uint8Array(fsSync.readFileSync(pdfPath));
        const loadingTask = pdfjs.getDocument({ data });
        const pdfDocument = await loadingTask.promise;
        
        const allText: Array<{text: string, x: number, y: number, page: number}> = [];
        
        for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });
            
            for (const item of textContent.items) {
                if ((item as any).str && (item as any).transform) {
                    const transform = (item as any).transform;
                    const text = (item as any).str.trim();
                    if (text.length > 0) {
                        allText.push({
                            text,
                            x: transform[4],
                            y: viewport.height - transform[5],
                            page: pageNum
                        });
                    }
                }
            }
        }
        
        console.log(`📝 Estratte ${allText.length} porzioni di testo dal PDF`);
        
        // 3️⃣ Per ogni campo, trova il testo più vicino
        const fieldsWithLabels: FieldWithLabel[] = [];
        
        for (const field of fields) {
            const fieldName = field.getName();
            const fieldType = field.constructor.name;
            const widgets = (field as any).acroField.getWidgets();
            
            let suggestedLabel = fieldName;
            let nearbyText: string[] = [];
            
            if (widgets.length > 0) {
                const widget = widgets[0];
                const rect = widget.getRectangle();
                const fieldX = rect.x;
                const fieldY = rect.y;
                
                // Trova testo a sinistra o sopra il campo (tipicamente l'etichetta)
                const nearby = allText
                    .filter(t => {
                        const distance = Math.sqrt(Math.pow(t.x - fieldX, 2) + Math.pow(t.y - fieldY, 2));
                        return distance < 150; // Entro 150 punti
                    })
                    .sort((a, b) => {
                        const distA = Math.sqrt(Math.pow(a.x - fieldX, 2) + Math.pow(a.y - fieldY, 2));
                        const distB = Math.sqrt(Math.pow(b.x - fieldX, 2) + Math.pow(b.y - fieldY, 2));
                        return distA - distB;
                    })
                    .slice(0, 10)
                    .map(t => t.text);
                
                nearbyText = nearby;
                
                // Cerca pattern di etichette
                const labelCandidates = nearby.filter(t => 
                    t.endsWith(':') || 
                    t.length > 3 && t.length < 50 &&
                    /[a-zA-ZÀ-ÿ]/.test(t)
                );
                
                if (labelCandidates.length > 0) {
                    suggestedLabel = labelCandidates[0].replace(/[:\s]+$/, '');
                }
            }
            
            fieldsWithLabels.push({
                fieldName,
                fieldType,
                label: fieldName,
                nearbyText,
                suggestedLabel
            });
        }
        
        console.log(`✅ Processati ${fieldsWithLabels.length} campi con etichette suggerite`);
        
        // Log alcuni esempi
        fieldsWithLabels.slice(0, 5).forEach(f => {
            console.log(`   📍 Campo "${f.fieldName}" → Etichetta: "${f.suggestedLabel}"`);
        });
        
        return fieldsWithLabels;
        
    } catch (error: any) {
        console.error('❌ Errore lettura etichette:', error.message);
        // Fallback: ritorna solo i nomi dei campi
        const pdfBytes = await fs.readFile(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        
        return fields.map(field => ({
            fieldName: field.getName(),
            fieldType: field.constructor.name,
            label: field.getName(),
            nearbyText: [],
            suggestedLabel: field.getName()
        }));
    }
}

