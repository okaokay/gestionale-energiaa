/**
 * 🆕 NUOVO SISTEMA GESTIONE CONTRATTI
 * 
 * Workflow Completo:
 * 1. Upload PDF (statico o con campi)
 * 2. Analisi Layout con OCR + AI
 * 3. Creazione Dinamica Campi Interattivi
 * 4. Salvataggio Template Arricchito
 * 5. Compilazione con Mapping Intelligente AI
 */

import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs/promises';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';

// 🆕 Nuovi servizi
import { readFieldLabels } from '../services/pdfLabelReader';
import { analyzePDFLayout } from '../services/pdfLayoutAnalyzer';
import { createInteractiveFields, hasInteractiveFields, getExistingFields } from '../services/pdfFieldCreator';
import { mapDataToFields } from '../services/aiFieldMapper';

const router = express.Router();

// Applica autenticazione
router.use(authenticate);

// ==========================================
// 📁 CONFIGURAZIONE UPLOAD
// ==========================================

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const tipoCliente = req.body.tipo_cliente || 'domestico';
        const uploadDir = path.join('uploads', 'contract_templates', tipoCliente);
        
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error: any) {
            cb(error, uploadDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
        cb(null, `${uniqueSuffix}.pdf`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo file PDF sono accettati'));
        }
    }
});

// ==========================================
// 📤 UPLOAD TEMPLATE + ANALISI AUTOMATICA
// ==========================================

router.post('/templates/upload', upload.single('pdf'), async (req: Request, res: Response) => {
    console.log('\n📤 === UPLOAD NUOVO TEMPLATE ===');
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }
        
        const { nome, fornitore, categoria, tipo_cliente } = req.body;
        const user = (req as any).user;
        const pdfPath = req.file.path;
        
        console.log(`📄 File: ${req.file.originalname}`);
        console.log(`👤 Tipo Cliente: ${tipo_cliente}`);
        console.log(`🏢 Fornitore: ${fornitore}`);
        console.log(`📂 Categoria: ${categoria}`);
        
        // 🔍 FASE 1: Verifica se il PDF ha già campi interattivi
        const alreadyHasFields = await hasInteractiveFields(pdfPath);
        console.log(`\n🔍 PDF ha già campi interattivi: ${alreadyHasFields ? 'SÌ' : 'NO'}`);
        
        let finalPdfPath = pdfPath;
        let campiEstratti: any = {};
        
        if (alreadyHasFields) {
            // ✅ PDF ha già campi → Leggi anche le etichette con OCR
            console.log('✅ PDF ha già campi, li estraggo con etichette OCR...');
            
            try {
                // 🆕 USA OCR per leggere etichette reali dal PDF
                const fieldsWithLabels = await readFieldLabels(pdfPath);
                console.log(`📋 Trovati ${fieldsWithLabels.length} campi con etichette`);
                
                if (fieldsWithLabels.length === 0) {
                    await fs.unlink(pdfPath);
                    return res.status(400).json({ 
                        error: 'Nessun campo compilabile trovato nel PDF.' 
                    });
                }
                
                // Converti in formato database usando etichette OCR
                for (const field of fieldsWithLabels) {
                    const label = field.suggestedLabel || field.fieldName;
                    
                    campiEstratti[field.fieldName] = {
                        nome_campo_pdf: field.fieldName,
                        tipo: field.fieldType,
                        nome_descrittivo: label,
                        categoria: 'altro',
                        descrizione: field.nearbyText.length > 0 
                            ? `Testo vicino: ${field.nearbyText.slice(0, 3).join(', ')}`
                            : `Campo: ${label}`,
                        dataType: inferDataType(field.fieldType, label),
                        required: false,
                        maxLength: 100
                    };
                }
                
                console.log(`✅ Etichette OCR applicate a ${Object.keys(campiEstratti).length} campi`);
                
            } catch (ocrError: any) {
                console.warn('⚠️ Errore OCR etichette, uso nomi campi standard:', ocrError.message);
                
                // Fallback senza OCR
                const existingFields = await getExistingFields(pdfPath);
                for (const field of existingFields) {
                    campiEstratti[field.fieldName] = {
                        nome_campo_pdf: field.fieldName,
                        tipo: field.type,
                        nome_descrittivo: field.label,
                        categoria: 'altro',
                        descrizione: `Campo: ${field.label}`,
                        dataType: inferDataType(field.type, field.label),
                        required: field.required,
                        maxLength: field.maxLength || 100
                    };
                }
            }
            
        } else {
            // 🆕 PDF senza campi → Analizza layout e crea campi
            console.log('🆕 PDF statico, procedo con analisi layout...');
            
            try {
                // FASE 2: Analisi Layout con OCR
                console.log('\n🔍 Analisi layout PDF con OCR...');
                const layoutAnalysis = await analyzePDFLayout(pdfPath);
                console.log(`✅ Rilevati ${layoutAnalysis.fields.length} potenziali campi`);
                
                if (layoutAnalysis.fields.length === 0) {
                    await fs.unlink(pdfPath);
                    return res.status(400).json({ 
                        error: 'Nessun campo rilevato nel PDF. Il PDF potrebbe essere troppo complesso o danneggiato.' 
                    });
                }
                
                // FASE 3: Crea campi interattivi
                console.log('\n✏️ Creazione campi interattivi...');
                const enrichedPdfPath = pdfPath.replace('.pdf', '_enriched.pdf');
                
                const createdFields = await createInteractiveFields(
                    pdfPath,
                    enrichedPdfPath,
                    layoutAnalysis.fields
                );
                
                console.log(`✅ Creati ${createdFields.length} campi interattivi`);
                
                // Usa il PDF arricchito come template
                finalPdfPath = enrichedPdfPath;
                
                // Elimina il PDF originale
                await fs.unlink(pdfPath);
                
                // Converti in formato database
                for (const field of createdFields) {
                    campiEstratti[field.fieldName] = {
                        nome_campo_pdf: field.fieldName,
                        tipo: field.type,
                        nome_descrittivo: field.label,
                        categoria: 'altro',
                        descrizione: `Campo: ${field.label}`,
                        dataType: inferDataType(field.type, field.label),
                        required: field.required,
                        maxLength: field.maxLength || 100
                    };
                }
                
            } catch (error: any) {
                console.error('❌ Errore analisi layout:', error);
                await fs.unlink(pdfPath);
                return res.status(500).json({ 
                    error: 'Errore durante l\'analisi del PDF. Impossibile rilevare i campi automaticamente.',
                    details: error.message
                });
            }
        }
        
        // 💾 FASE 4: Salva nel database
        console.log('\n💾 Salvataggio template nel database...');
        
        const id = crypto.randomUUID();
        const campiJSON = JSON.stringify({ campi: campiEstratti });
        
        await pool.query(`
            INSERT INTO contract_templates (
                id, nome, fornitore, categoria, tipo_cliente, 
                file_path, file_name, campi_estratti, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            nome,
            fornitore,
            categoria,
            tipo_cliente,
            finalPdfPath,
            req.file.originalname, // file_name
            campiJSON,
            user.userId
        ]);
        
        console.log(`✅ Template salvato con ID: ${id}`);
        console.log(`📊 Campi totali: ${Object.keys(campiEstratti).length}`);
        
        res.json({
            success: true,
            message: `Template analizzato con successo. Rilevati ${Object.keys(campiEstratti).length} campi.`,
            templateId: id,
            campiCount: Object.keys(campiEstratti).length
        });
        
    } catch (error: any) {
        console.error('❌ Errore upload template:', error);
        
        // Cleanup file in caso di errore
        if (req.file?.path) {
            try {
                await fs.unlink(req.file.path);
                const enrichedPath = req.file.path.replace('.pdf', '_enriched.pdf');
                await fs.unlink(enrichedPath).catch(() => {});
            } catch {}
        }
        
        res.status(500).json({ 
            error: 'Errore durante l\'upload del template', 
            details: error.message 
        });
    }
});

// ==========================================
// 📋 LISTA TEMPLATES
// ==========================================

router.get('/templates', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT 
                id, nome, fornitore, categoria, tipo_cliente,
                file_path, campi_estratti, created_at
            FROM contract_templates
            ORDER BY created_at DESC
        `);
        
        const templates = result.rows.map((row: any) => ({
            ...row,
            campi_estratti: typeof row.campi_estratti === 'string' 
                ? JSON.parse(row.campi_estratti) 
                : row.campi_estratti
        }));
        
        res.json(templates);
    } catch (error: any) {
        console.error('❌ Errore recupero templates:', error);
        res.status(500).json({ error: 'Errore recupero templates' });
    }
});

// ==========================================
// 🗑️ ELIMINA TEMPLATE
// ==========================================

router.delete('/templates/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // Hard delete (la tabella non ha deleted_at)
        await pool.query(`
            DELETE FROM contract_templates 
            WHERE id = ?
        `, [id]);
        
        res.json({ success: true, message: 'Template eliminato' });
    } catch (error: any) {
        console.error('❌ Errore eliminazione template:', error);
        res.status(500).json({ error: 'Errore eliminazione template' });
    }
});

// ==========================================
// 📥 DOWNLOAD TEMPLATE PDF
// ==========================================

router.get('/templates/:id/pdf', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT file_path, nome FROM contract_templates WHERE id = ?
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template non trovato' });
        }
        
        const template = result.rows[0] as any;
        const filePath = path.resolve(template.file_path);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${template.nome}.pdf"`);
        
        const fileBuffer = await fs.readFile(filePath);
        res.send(fileBuffer);
        
    } catch (error: any) {
        console.error('❌ Errore download PDF:', error);
        res.status(500).json({ error: 'Errore download PDF' });
    }
});

// ==========================================
// ✏️ COMPILA PDF CON MAPPING AI
// ==========================================

router.post('/compile', async (req: Request, res: Response) => {
    console.log('\n✏️ === COMPILAZIONE PDF CON AI MAPPING ===');
    
    try {
        const { templateId, providedData } = req.body;
        
        console.log(`📄 Template ID: ${templateId}`);
        console.log(`📊 Dati forniti: ${Object.keys(providedData).length} chiavi`);
        
        // 1️⃣ Recupera template
        const templateResult = await pool.query(`
            SELECT file_path, campi_estratti FROM contract_templates WHERE id = ?
        `, [templateId]);
        
        if (templateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Template non trovato' });
        }
        
        const template = templateResult.rows[0] as any;
        const campiEstratti = typeof template.campi_estratti === 'string'
            ? JSON.parse(template.campi_estratti)
            : template.campi_estratti;
        
        const fields = Object.entries(campiEstratti.campi || campiEstratti).map(([name, info]: [string, any]) => ({
            fieldName: name,
            label: info.nome_descrittivo || info.etichetta || name,
            type: info.tipo || 'PDFTextField',
            required: info.required || false
        }));
        
        console.log(`📋 Campi disponibili nel template: ${fields.length}`);
        
        // 2️⃣ Mapping AI: Dati → Campi
        console.log('\n🤖 Mapping intelligente dati → campi...');
        const mappings = await mapDataToFields(providedData, fields);
        console.log(`✅ Mappati ${mappings.length} campi`);
        
        // 3️⃣ Compila PDF
        console.log('\n✏️ Compilazione PDF...');
        const pdfBytes = await fs.readFile(template.file_path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        
        let compilati = 0;
        for (const mapping of mappings) {
            try {
                const field = form.getField(mapping.fieldName);
                
                if (field.constructor.name === 'PDFTextField') {
                    const textField = field as any;
                    const value = String(mapping.value || '');
                    textField.setText(value);
                    compilati++;
                    console.log(`   ✅ "${mapping.fieldName}" = "${value.substring(0, 30)}..."`);
                } else if (field.constructor.name === 'PDFCheckBox') {
                    const checkBox = field as any;
                    if (mapping.value === true || mapping.value === 'true' || mapping.value === '1') {
                        checkBox.check();
                        compilati++;
                        console.log(`   ✅ "${mapping.fieldName}" = CHECKED`);
                    }
                }
            } catch (error: any) {
                console.log(`   ⚠️ Campo "${mapping.fieldName}" non trovato o errore:`, error.message);
            }
        }
        
        console.log(`\n✅ Compilati ${compilati}/${mappings.length} campi`);
        
        // 4️⃣ Restituisci PDF compilato
        const compiledPdfBytes = await pdfDoc.save();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="contratto_compilato.pdf"');
        res.send(Buffer.from(compiledPdfBytes));
        
    } catch (error: any) {
        console.error('❌ Errore compilazione PDF:', error);
        res.status(500).json({ 
            error: 'Errore durante la compilazione del PDF', 
            details: error.message 
        });
    }
});

// ==========================================
// 🛠️ UTILITY
// ==========================================

function inferDataType(fieldType: string, label: string): string {
    const lower = label.toLowerCase();
    
    if (lower.includes('data') || lower.includes('date') || lower.includes('nascita') || lower.includes('attivazione')) {
        return 'date';
    }
    if (lower.includes('email') || lower.includes('e-mail') || lower.includes('pec')) {
        return 'email';
    }
    if (lower.includes('telefon') || lower.includes('cellulare') || lower.includes('tel')) {
        return 'tel';
    }
    if (lower.includes('consumo') || lower.includes('potenza') || lower.includes('numero')) {
        return 'number';
    }
    if (lower.includes('codice') && lower.includes('fiscale')) {
        return 'fiscalcode';
    }
    if (lower.includes('pod')) {
        return 'pod';
    }
    if (lower.includes('pdr')) {
        return 'pdr';
    }
    if (lower.includes('iban')) {
        return 'iban';
    }
    
    return 'text';
}

export default router;

