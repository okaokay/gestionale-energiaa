/**
 * ✏️ PDF Field Creator
 * 
 * Prende un PDF statico e crea dinamicamente campi interattivi
 * basandosi sull'analisi del layout fornita da pdfLayoutAnalyzer.
 */

import { PDFDocument, PDFTextField, PDFCheckBox, PDFForm, rgb } from 'pdf-lib';
import * as fs from 'fs/promises';
import { DetectedField } from './pdfLayoutAnalyzer';

export interface CreatedField {
    fieldName: string;
    type: string;
    label: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    maxLength?: number;
    required: boolean;
}

/**
 * 🎨 Crea campi interattivi nel PDF basandosi sui campi rilevati
 */
export async function createInteractiveFields(
    originalPdfPath: string,
    outputPdfPath: string,
    detectedFields: DetectedField[]
): Promise<CreatedField[]> {
    console.log('\n✏️ === CREAZIONE CAMPI INTERATTIVI ===');
    console.log(`📄 PDF origine: ${originalPdfPath}`);
    console.log(`📄 PDF output: ${outputPdfPath}`);
    console.log(`📋 Campi da creare: ${detectedFields.length}`);
    
    // Carica il PDF originale
    const existingPdfBytes = await fs.readFile(originalPdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();
    
    const createdFields: CreatedField[] = [];
    let fieldCounter = 1;
    
    for (const detected of detectedFields) {
        try {
            // Genera nome univoco per il campo
            let fieldName = detected.fieldName || `field_${fieldCounter}`;
            
            // Assicura unicità del nome
            let uniqueName = fieldName;
            let counter = 1;
            while (createdFields.some(f => f.fieldName === uniqueName)) {
                uniqueName = `${fieldName}_${counter}`;
                counter++;
            }
            fieldName = uniqueName;
            
            const page = pdfDoc.getPage(detected.page - 1); // PDF pages sono 0-indexed
            const pageHeight = page.getHeight();
            
            // Converti coordinate (pdfLayoutAnalyzer usa coordinate Y standard, pdf-lib usa Y invertito)
            const pdfLibY = pageHeight - detected.y - detected.height;
            
            if (detected.type === 'checkbox') {
                // 📦 Crea CheckBox
                const checkBox = form.createCheckBox(fieldName);
                checkBox.addToPage(page, {
                    x: detected.x,
                    y: pdfLibY,
                    width: detected.width || 15,
                    height: detected.height || 15,
                    borderWidth: 1,
                    borderColor: rgb(0, 0, 0)
                });
                
                createdFields.push({
                    fieldName,
                    type: 'PDFCheckBox',
                    label: detected.label,
                    page: detected.page,
                    x: detected.x,
                    y: detected.y,
                    width: detected.width || 15,
                    height: detected.height || 15,
                    required: detected.required
                });
                
                console.log(`   ✅ CheckBox: "${detected.label}" (${fieldName})`);
                
            } else {
                // 📝 Crea TextField
                const textField = form.createTextField(fieldName);
                textField.addToPage(page, {
                    x: detected.x,
                    y: pdfLibY,
                    width: detected.width || 150,
                    height: detected.height || 20,
                    borderWidth: 1,
                    borderColor: rgb(0.7, 0.7, 0.7),
                    backgroundColor: rgb(1, 1, 0.9) // Sfondo giallino per visibilità
                });
                
                // Imposta proprietà del campo
                if (detected.required) {
                    textField.enableRequired();
                }
                
                // Suggerisci maxLength in base al tipo
                let maxLength = Math.floor(detected.width / 6); // ~6px per carattere
                if (detected.type === 'date') maxLength = 10;
                if (detected.type === 'email') maxLength = 100;
                if (detected.type === 'tel') maxLength = 20;
                if (detected.type === 'textarea') maxLength = 500;
                
                textField.setMaxLength(maxLength);
                
                createdFields.push({
                    fieldName,
                    type: 'PDFTextField',
                    label: detected.label,
                    page: detected.page,
                    x: detected.x,
                    y: detected.y,
                    width: detected.width || 150,
                    height: detected.height || 20,
                    maxLength,
                    required: detected.required
                });
                
                console.log(`   ✅ TextField: "${detected.label}" (${fieldName}, max:${maxLength})`);
            }
            
            fieldCounter++;
            
        } catch (error: any) {
            console.error(`   ❌ Errore creazione campo "${detected.label}":`, error.message);
        }
    }
    
    // Salva il PDF con i campi creati
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPdfPath, pdfBytes);
    
    console.log(`\n✅ PDF salvato con ${createdFields.length} campi interattivi`);
    console.log(`📄 Output: ${outputPdfPath}`);
    
    return createdFields;
}

/**
 * 🔍 Verifica se un PDF ha già campi interattivi
 */
export async function hasInteractiveFields(pdfPath: string): Promise<boolean> {
    try {
        const pdfBytes = await fs.readFile(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        
        return fields.length > 0;
    } catch (error) {
        return false;
    }
}

/**
 * 📊 Estrai informazioni sui campi esistenti in un PDF
 */
export async function getExistingFields(pdfPath: string): Promise<CreatedField[]> {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    const existingFields: CreatedField[] = [];
    
    for (const field of fields) {
        const fieldName = field.getName();
        const fieldType = field.constructor.name;
        const widgets = (field as any).acroField.getWidgets();
        
        // 🔍 Genera label più descrittiva
        let label = generateDescriptiveLabel(fieldName, fieldType);
        
        // Estrai maxLength per TextField
        let maxLength = undefined;
        if (fieldType === 'PDFTextField') {
            try {
                const textField = field as any;
                if (textField.getMaxLength) {
                    maxLength = textField.getMaxLength();
                }
            } catch (e) {
                // Ignora errori
            }
        }
        
        if (widgets.length > 0) {
            const widget = widgets[0];
            const rect = widget.getRectangle();
            
            existingFields.push({
                fieldName,
                type: fieldType,
                label,
                page: 1,
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                maxLength,
                required: false
            });
        }
    }
    
    return existingFields;
}

/**
 * 🏷️ Genera una label descrittiva dal nome del campo
 */
function generateDescriptiveLabel(fieldName: string, fieldType: string): string {
    const name = fieldName.toLowerCase();
    
    // 📝 Nomi già descrittivi - usa direttamente
    if (fieldName.length > 5 && !name.match(/^(data_\d+|date\d+|undefined_\d+|group\s*\d+|check\s*box\d+)$/)) {
        return fieldName
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // 📅 Pattern per date generiche
    if (name.match(/^data_(\d+)$/)) {
        const num = name.match(/\d+/)?.[0];
        return `Data ${num} (da specificare nel PDF)`;
    }
    
    if (name.match(/^date(\d+)_af_date$/)) {
        const num = name.match(/\d+/)?.[0];
        return `Data ${num} (contratto)`;
    }
    
    // 📋 Campi gruppo/checkbox generici
    if (name.match(/^group\s*(\d+)$/)) {
        const num = name.match(/\d+/)?.[0];
        return `Selezione ${num} (radio button)`;
    }
    
    if (name.match(/^check\s*box(\d+)$/)) {
        const num = name.match(/\d+/)?.[0];
        return `Opzione ${num} (checkbox)`;
    }
    
    // ❓ Campi undefined
    if (name.match(/^undefined_(\d+)$/)) {
        const num = name.match(/\d+/)?.[0];
        return `Campo ${num} (vedi PDF)`;
    }
    
    // 🔢 Campi numerici semplici
    if (name.match(/^\d+$/)) {
        return `Campo ${fieldName}`;
    }
    
    // Default: usa il nome del campo formattato
    return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

