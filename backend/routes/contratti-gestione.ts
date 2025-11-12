/**
 * API ENDPOINTS - Sistema Gestione Contratti Completo
 */

import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import axios from 'axios';
// 🔥 NUOVO: Sistema avanzato analisi PDF con contesto e AI
import { extractPDFFieldsWithContext } from '../services/pdfContextExtractor';
import { analyzeFieldsWithAI } from '../services/aiFieldAnalyzer';

const router = express.Router();

// Applica autenticazione a tutte le rotte
router.use(authenticate);

/**
 * Estrae TUTTI i campi dal PDF template
 * Restituisce: { nome_campo: { tipo, maxLength, ... } }
 */
// 🤖 Analizza i campi con AI per dare nomi descrittivi
async function analizzaCampiConAI(campiPDF: any): Promise<any> {
    try {
        console.log('🤖 Analisi AI dei campi PDF...');
        
        // Prepara lista campi per AI
        const listaCampi = Object.entries(campiPDF)
            .map(([nome, info]: [string, any]) => {
                return `- "${nome}" (tipo: ${info.tipo}, maxLength: ${info.maxLength || 'N/A'})`;
            })
            .join('\n');
        
        const prompt = `Sei un esperto di contratti energetici italiani. Devi analizzare un modulo PDF per contratti luce/gas e assegnare nomi descrittivi ai campi.

CAMPI DA ANALIZZARE (nome: tipo, lunghezza max):
${listaCampi}

CONTESTO CONTRATTI ENERGIA:
- Sezione ANAGRAFICA: cognome, nome, codice fiscale, data/luogo nascita, documento identità
- Sezione RESIDENZA: indirizzo, civico, scala, interno, CAP, comune, provincia
- Sezione FORNITURA: indirizzo fornitura (spesso con "_2"), pod/pdr, consumo, potenza, REMI, matricola
- Sezione PAGAMENTO: IBAN, banca, intestatario conto
- Sezione COMMERCIALE: nome offerta, codice offerta, fornitore
- Sezione AGENZIA: agenzia, agente, codice agenzia
- DATE: date contratto, attivazione, nascita, firma

PATTERN COMUNI:
- "N" con maxLength 3-5 → "Numero Civico"
- "DATA_X", "Date_X" → cerca pattern: se primi campi → "Data Nascita", se centrali → "Data Firma", se finali → "Data Attivazione"
- "undefined_X" → analizza posizione e lunghezza: corti → "Codice/Sigla", lunghi → "Note"
- Campi "_2" → solitamente duplicano sezione per: "Indirizzo Fornitura", "Cointestatario", "Offerta Gas"
- "Presso la Banca" → "Nome Banca"
- POD3/POD7 → "POD (parte 1/2)" - codice punto fornitura
- Campi molto corti (≤4) → spesso codici o sigle

IMPORTANTE:
- Usa nomi italiani chiari e professionali
- Evita termini generici come "Campo X" - cerca di intuire il significato
- Se proprio non sai, usa il contesto (posizione nella lista, lunghezza campo)

OUTPUT RICHIESTO (JSON puro, NO markdown):
{
  "Nome_Campo_PDF_Esatto": {
    "nome_descrittivo": "Nome Chiaro Professionale",
    "categoria": "anagrafica|residenza|fornitura|pagamento|date|agenzia|altro",
    "descrizione": "Breve spiegazione"
  }
}

Rispondi SOLO con il JSON valido, nessun testo prima o dopo.`;

        const response = await axios.post(
            'http://185.31.67.249/api/generate',
            {
                model: 'llama3:8b',
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    num_predict: 3000
                }
            },
            { timeout: 120000 }
        );

        // Estrai JSON dalla risposta
        let aiText = response.data.response.trim();
        
        // Trova il JSON nella risposta
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('⚠️  AI non ha restituito JSON valido');
            return null;
        }

        const aiSuggestions = JSON.parse(jsonMatch[0]);
        console.log(`✅ AI ha analizzato ${Object.keys(aiSuggestions).length} campi`);
        
        return aiSuggestions;
        
    } catch (error: any) {
        console.log('⚠️  Errore analisi AI:', error.message);
        return null;
    }
}

// 🧠 Fallback intelligente: genera nomi descrittivi basandosi su euristiche
function generaNomeIntelligente(nomeCampo: string, info: any, index: number, totaleCampi: number): any {
    const maxLen = info.maxLength || 999;
    const nomeLC = nomeCampo.toLowerCase();
    
    let nomeDescrittivo = nomeCampo;
    let categoria = 'altro';
    let descrizione = '';
    
    // 🔍 PATTERN MATCHING AVANZATO
    
    // Numeri civici
    if ((nomeCampo === 'N' || nomeCampo === 'n') && maxLen >= 3 && maxLen <= 5) {
        nomeDescrittivo = 'Numero Civico Residenza';
        categoria = 'residenza';
        descrizione = 'Numero civico dell\'indirizzo di residenza';
    }
    else if (nomeCampo === 'N_2' && maxLen >= 3 && maxLen <= 5) {
        nomeDescrittivo = 'Numero Civico Fornitura';
        categoria = 'fornitura';
        descrizione = 'Numero civico dell\'indirizzo di fornitura';
    }
    // Date
    else if (nomeCampo.match(/^DATA_\d+$/) || nomeCampo.match(/^Date\d*_/)) {
        const numDate = parseInt(nomeCampo.match(/\d+/)?.[0] || '0');
        const posizioneRelativa = index / totaleCampi;
        
        if (posizioneRelativa < 0.3) {
            nomeDescrittivo = 'Data di Nascita';
            categoria = 'anagrafica';
        } else if (posizioneRelativa > 0.7) {
            nomeDescrittivo = numDate <= 3 ? 'Data Firma Contratto' : 'Data Attivazione Prevista';
            categoria = 'date';
        } else {
            nomeDescrittivo = `Data ${numDate}`;
            categoria = 'date';
        }
        descrizione = 'Formato: gg/mm/aaaa';
    }
    // Undefined
    else if (nomeCampo.match(/^undefined_\d+$/)) {
        if (maxLen <= 10) {
            nomeDescrittivo = 'Codice/Sigla';
            categoria = 'altro';
            descrizione = 'Codice o sigla breve';
        } else if (maxLen > 100) {
            nomeDescrittivo = 'Note Aggiuntive';
            categoria = 'altro';
            descrizione = 'Campo note o annotazioni';
        } else {
            nomeDescrittivo = 'Campo Testuale';
            categoria = 'altro';
            descrizione = '';
        }
    }
    // Presso la Banca
    else if (nomeLC.includes('presso') && nomeLC.includes('banca')) {
        nomeDescrittivo = 'Nome della Banca';
        categoria = 'pagamento';
        descrizione = 'Istituto bancario per addebito';
    }
    // POD/PDR
    else if (nomeCampo.match(/^POD\d*$/i)) {
        nomeDescrittivo = nomeCampo.includes('3') ? 'POD - Prima Parte' : 'POD - Codice Completo';
        categoria = 'fornitura';
        descrizione = 'Point of Delivery (fornitura elettrica)';
    }
    else if (nomeCampo.match(/^PDR\d*$/i)) {
        nomeDescrittivo = 'PDR - Codice Gas';
        categoria = 'fornitura';
        descrizione = 'Punto Di Riconsegna (fornitura gas)';
    }
    // Campi con _2 (fornitura)
    else if (nomeCampo.endsWith('_2')) {
        const base = nomeCampo.replace('_2', '');
        if (nomeLC.includes('indirizzo') || nomeLC.includes('via')) {
            nomeDescrittivo = 'Indirizzo Fornitura';
            categoria = 'fornitura';
        } else if (nomeLC.includes('cap')) {
            nomeDescrittivo = 'CAP Fornitura';
            categoria = 'fornitura';
        } else if (nomeLC.includes('comune')) {
            nomeDescrittivo = 'Comune Fornitura';
            categoria = 'fornitura';
        } else if (nomeLC.includes('prov')) {
            nomeDescrittivo = 'Provincia Fornitura';
            categoria = 'fornitura';
        } else if (nomeLC.includes('nome')) {
            nomeDescrittivo = 'Nome Cointestatario';
            categoria = 'anagrafica';
        } else if (nomeLC.includes('cognome')) {
            nomeDescrittivo = 'Cognome Cointestatario';
            categoria = 'anagrafica';
        } else {
            nomeDescrittivo = `${base} (Fornitura/Secondo)`;
            categoria = 'fornitura';
        }
        descrizione = 'Campo relativo a indirizzo fornitura o cointestatario';
    }
    // Mantieni nome originale se non match
    else {
        nomeDescrittivo = nomeCampo;
        // Prova a categorizzare comunque
        if (nomeLC.includes('cognome') || nomeLC.includes('nome') || nomeLC.includes('fiscale') || nomeLC.includes('nato')) {
            categoria = 'anagrafica';
        } else if (nomeLC.includes('telefon') || nomeLC.includes('email') || nomeLC.includes('cellul')) {
            categoria = 'anagrafica';
        } else if (nomeLC.includes('indirizzo') || nomeLC.includes('cap') || nomeLC.includes('comune') || nomeLC.includes('scala') || nomeLC.includes('interno')) {
            categoria = 'residenza';
        } else if (nomeLC.includes('pod') || nomeLC.includes('pdr') || nomeLC.includes('consumo') || nomeLC.includes('potenza') || nomeLC.includes('remi')) {
            categoria = 'fornitura';
        } else if (nomeLC.includes('iban') || nomeLC.includes('banca') || nomeLC.includes('conto')) {
            categoria = 'pagamento';
        } else if (nomeLC.includes('offerta') || nomeLC.includes('fornitore')) {
            categoria = 'fornitura';
        } else if (nomeLC.includes('agent') || nomeLC.includes('agenzia')) {
            categoria = 'agenzia';
        }
    }
    
    return { nome_descrittivo: nomeDescrittivo, categoria, descrizione };
}

// 🏷️ Inferisce l'etichetta/descrizione dal nome del campo
function generaEtichettaDaCampo(nomeCampo: string, maxLen: number): string {
    const nomeLC = nomeCampo.toLowerCase();
    
    // Usa il nome del campo se è descrittivo
    if (nomeCampo.length > 10 && !nomeCampo.match(/^(undefined|DATA|Date|field)_?\d*$/i)) {
        // Il nome è già descrittivo (es: "Fornitore Uscente_4", "Presso la Banca")
        return nomeCampo.replace(/_/g, ' ');
    }
    
    // Pattern matching per campi comuni
    if (nomeLC.includes('fornitore') && nomeLC.includes('uscente')) {
        return 'Fornitore attuale da cui si proviene';
    }
    if (nomeLC === 'n' && maxLen <= 5) {
        return 'Numero civico dell\'indirizzo';
    }
    if (nomeLC === 'n_2' && maxLen <= 5) {
        return 'Numero civico della fornitura';
    }
    if (nomeCampo.match(/^POD\d*/i)) {
        return 'Point of Delivery - codice fornitura elettrica';
    }
    if (nomeCampo.match(/^PDR\d*/i)) {
        return 'Punto Di Riconsegna - codice fornitura gas';
    }
    if (nomeLC.includes('consumo') && nomeLC.includes('kwh')) {
        return 'Consumo annuo in kilowattora';
    }
    if (nomeLC.includes('consumo') && nomeLC.includes('smc')) {
        return 'Consumo annuo in standard metri cubi';
    }
    if (nomeLC.includes('potenza')) {
        return 'Potenza impegnata/disponibile in kW';
    }
    if (nomeLC.includes('remi')) {
        return 'Codice REMI - tensione fornitura elettrica';
    }
    if (nomeLC.includes('classe') && nomeLC.includes('misuratore')) {
        return 'Classe del contatore/misuratore';
    }
    if (nomeCampo.match(/^DATA_\d+$/) || nomeCampo.match(/^Date\d*_/)) {
        return 'Data (formato gg/mm/aaaa)';
    }
    if (nomeCampo.match(/^undefined_\d+$/)) {
        if (maxLen > 100) {
            return 'Campo per note o informazioni aggiuntive';
        }
        return 'Campo da compilare (vedere modulo PDF)';
    }
    if (nomeLC.includes('offerta')) {
        return 'Nome dell\'offerta commerciale sottoscritta';
    }
    if (nomeLC.includes('agenzia')) {
        return 'Codice o nome agenzia di riferimento';
    }
    if (nomeLC.includes('agente')) {
        return 'Codice o nome agente commerciale';
    }
    
    // Default: restituisci il nome pulito
    return nomeCampo.replace(/_/g, ' ');
}

// 🔥 NUOVA FUNZIONE AVANZATA - Estrae campi con CONTESTO reale dal PDF
async function estraiCampiPDF(pdfPath: string): Promise<any> {
    try {
        console.log('\n🔥 === ANALISI AVANZATA PDF CON CONTESTO E AI ===');
        console.log('📄 File:', pdfPath);
        
        // 1️⃣ ESTRAI CAMPI CON CONTESTO POSIZIONALE (nuovo sistema!)
        console.log('🔍 Estrazione campi con contesto posizionale...');
        const extracted = await extractPDFFieldsWithContext(pdfPath);
        
        if (!extracted || extracted.fields.length === 0) {
            console.log('⚠️  Nessun campo estratto con il nuovo sistema, uso fallback');
            // Fallback al vecchio sistema se il nuovo non funziona
            return estraiCampiPDFFallback(pdfPath);
        }
        
        console.log(`✅ Estratti ${extracted.fields.length} campi con contesto`);
        console.log('📋 Primi 5 campi:', extracted.fields.slice(0, 5).map(f => 
            `${f.fieldName} (label: "${f.contextBefore || f.contextAbove}")`
        ).join(', '));
        
        // 2️⃣ ANALIZZA CON AI USANDO IL CONTESTO (super intelligente!)
        console.log('🤖 Analisi AI con contesto reale del PDF...');
        const analyzed = await analyzeFieldsWithAI(extracted.fields);
        
        // 3️⃣ TRASFORMA IN FORMATO DATABASE
        const campiEstratti: any = {};
        
        // Carica PDF una volta per estrarre maxLength
        let pdfForm: any = null;
        try {
            const pdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            pdfForm = pdfDoc.getForm();
        } catch (e) {
            console.log('⚠️  Impossibile caricare PDF per maxLength');
        }
        
        analyzed.forEach(field => {
            // Trova il campo originale per info aggiuntive
            const originalField = extracted.fields.find(f => f.fieldName === field.fieldName);
            
            // 🔥 LOGICA MIGLIORATA: Usa il nome originale del campo PDF se è descrittivo
            let nomeDescrittivo = field.label;
            let descrizioneArricchita = field.description;
            const nomeOriginale = field.fieldName;
            
            // Pattern per nomi generici da NON usare
            const isGenerico = /^(data_\d+|date\d+_af_date|undefined_\d+|group\s*\d+|check\s*box\d+|^10$|^n$|^n_2$)/i.test(nomeOriginale);
            
            if (!isGenerico && nomeOriginale.length > 3) {
                // Il nome PDF è già descrittivo, usalo!
                nomeDescrittivo = nomeOriginale
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (l: string) => l.toUpperCase())
                    .trim();
                
                descrizioneArricchita = `Campo: ${nomeDescrittivo}`;
                
                // Log per i primi campi
                if (Object.keys(campiEstratti).length < 5) {
                    console.log(`   ✨ Uso nome PDF: "${nomeOriginale}" -> "${nomeDescrittivo}"`);
                }
            }
            
            campiEstratti[field.fieldName] = {
                nome_campo_pdf: field.fieldName,
                tipo: field.fieldType,
                nome_descrittivo: nomeDescrittivo,
                categoria: field.category,
                descrizione: descrizioneArricchita,
                dataType: field.dataType,
                required: field.required,
                mappingSuggestion: field.mappingSuggestion,
                // Info dal contesto
                contextBefore: originalField?.contextBefore || '',
                contextAbove: originalField?.contextAbove || '',
                etichetta_pdf: originalField?.contextBefore || originalField?.contextAbove || nomeDescrittivo
            };
            
            // Aggiungi maxLength se è un TextField
            if (field.fieldType === 'PDFTextField' && pdfForm) {
                try {
                    const pdfField = pdfForm.getField(field.fieldName);
                    if (pdfField && (pdfField as any).getMaxLength) {
                        const maxLen = (pdfField as any).getMaxLength();
                        if (maxLen) campiEstratti[field.fieldName].maxLength = maxLen;
                    }
                } catch (e) {
                    // Ignora errori maxLength per questo campo
                }
            }
        });
        
        console.log(`✅ Analisi completata: ${Object.keys(campiEstratti).length} campi mappati con AI`);
        console.log('📊 Categorie trovate:', [...new Set(analyzed.map(f => f.category))].join(', '));
        
        return campiEstratti;
        
    } catch (error: any) {
        console.error('❌ Errore nel nuovo sistema di estrazione:', error.message);
        console.log('⚠️  Uso sistema fallback');
        // Fallback al vecchio sistema
        return estraiCampiPDFFallback(pdfPath);
    }
}

// 🔄 FALLBACK - Sistema precedente (se il nuovo fallisce)
async function estraiCampiPDFFallback(pdfPath: string): Promise<any> {
    try {
        console.log('📄 [FALLBACK] Analisi PDF template:', pdfPath);
        
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        
        const campiEstratti: any = {};
        
        fields.forEach((field) => {
            const fieldName = field.getName();
            const fieldType = field.constructor.name;
            
            let fieldInfo: any = {
                nome_campo_pdf: fieldName,
                tipo: fieldType,
                required: false
            };
            
            // Estrai maxLength per TextField
            if (fieldType === 'PDFTextField') {
                try {
                    const textField = field as any;
                    const maxLength = textField.getMaxLength();
                    if (maxLength !== null && maxLength !== undefined) {
                        fieldInfo.maxLength = maxLength;
                    }
                } catch (e) {
                    // maxLength non disponibile
                }
            }
            
            // Estrai opzioni per CheckBox e RadioButton
            if (fieldType === 'PDFCheckBox' || fieldType === 'PDFRadioGroup') {
                fieldInfo.tipo_input = 'checkbox';
            }
            
            // 🏷️ GENERA ETICHETTA DESCRITTIVA dal nome campo
            fieldInfo.etichetta_pdf = generaEtichettaDaCampo(fieldName, fieldInfo.maxLength || 999);
            
            campiEstratti[fieldName] = fieldInfo;
        });
        
        console.log(`✅ Estratti ${Object.keys(campiEstratti).length} campi dal PDF`);
        
        const totaleCampi = Object.keys(campiEstratti).length;
        
        // Usa fallback intelligente per tutti i campi
        Object.keys(campiEstratti).forEach((nomeCampo, index) => {
            const fallback = generaNomeIntelligente(nomeCampo, campiEstratti[nomeCampo], index, totaleCampi);
            campiEstratti[nomeCampo].nome_descrittivo = fallback.nome_descrittivo;
            campiEstratti[nomeCampo].categoria = fallback.categoria;
            campiEstratti[nomeCampo].descrizione = campiEstratti[nomeCampo].etichetta_pdf || fallback.descrizione;
        });
        
        console.log('✅ [FALLBACK] Nomi intelligenti generati');
        
        return campiEstratti;
        
    } catch (error: any) {
        console.error('❌ Errore anche nel fallback:', error.message);
        return {};
    }
}

// ============================================================
// MULTER CONFIG per upload template e documenti
// ============================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = req.body.upload_type === 'template' 
            ? `uploads/contract_templates/${req.body.tipo_cliente || 'temp'}`
            : 'uploads/contracts/temp';
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo file non supportato'));
        }
    }
});

// ============================================================
// MODELLI CONTRATTI (Templates)
// ============================================================

/**
 * GET /api/contratti-gestione/templates
 * Recupera tutti i modelli contratti
 */
router.get('/templates', async (req: Request, res: Response) => {
    try {
        const { tipo_cliente, categoria, fornitore } = req.query;
        
        let query = `
            SELECT 
                ct.*,
                u.email as created_by_email,
                u.nome || ' ' || COALESCE(u.cognome, '') as created_by_name
            FROM contract_templates ct
            LEFT JOIN users u ON ct.created_by = u.id
            WHERE ct.attivo = 1
        `;
        
        const params: any[] = [];
        
        if (tipo_cliente) {
            query += ` AND ct.tipo_cliente = ?`;
            params.push(tipo_cliente);
        }
        
        if (categoria) {
            query += ` AND ct.categoria = ?`;
            params.push(categoria);
        }
        
        if (fornitore) {
            query += ` AND ct.fornitore = ?`;
            params.push(fornitore);
        }
        
        query += ` ORDER BY ct.predefinito DESC, ct.nome ASC`;
        
        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows.map((r: any) => ({
                ...r,
                campi_estratti: r.campi_estratti ? JSON.parse(r.campi_estratti) : null
            })),
            count: result.rowCount
        });
    } catch (error: any) {
        console.error('❌ Errore recupero templates:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante il recupero dei modelli',
            error: error.message
        });
    }
});

/**
 * POST /api/contratti-gestione/templates/upload
 * Carica nuovo modello contratto e lo analizza con AI
 */
router.post('/templates/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'File non fornito'
            });
        }

        const { nome, tipo_cliente, fornitore, categoria } = req.body;
        const user = req.user as any;

        if (!nome || !tipo_cliente || !fornitore || !categoria) {
            // Rimuovi file caricato
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                message: 'Parametri mancanti: nome, tipo_cliente, fornitore, categoria'
            });
        }

        // Sposta file nella directory corretta
        const finalPath = `uploads/contract_templates/${tipo_cliente}/${req.file.filename}`;
        const finalDir = path.dirname(finalPath);
        
        if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
        }
        
        fs.renameSync(req.file.path, finalPath);

        // ✅ ESTRAI I CAMPI REALI DAL PDF
        console.log('\n📄 === ANALISI TEMPLATE PDF ===');
        const campiPDF = await estraiCampiPDF(finalPath);
        
        // Struttura i campi per il database
        const campiEstrattiJSON = {
            campi: campiPDF,  // ✅ CORRETTO: usa "campi" non "campi_pdf"
            totale_campi: Object.keys(campiPDF).length,
            data_analisi: new Date().toISOString()
        };
        
        console.log(`✅ Template analizzato: ${Object.keys(campiPDF).length} campi trovati`);

        const templateId = crypto.randomUUID();

        try {
            await pool.query(`
                INSERT INTO contract_templates 
                (id, nome, tipo_cliente, fornitore, categoria, file_path, file_name, file_size, mime_type, campi_estratti, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                templateId,
                nome,
                tipo_cliente,
                fornitore,
                categoria,
                finalPath,
                req.file.originalname,
                req.file.size,
                req.file.mimetype,
                JSON.stringify(campiEstrattiJSON),  // ✅ Campi REALI del PDF
                user.id
            ]);
        } catch (insertError: any) {
            // Gestisci errore di nome duplicato
            if (insertError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                // Elimina il file caricato
                if (fs.existsSync(finalPath)) {
                    fs.unlinkSync(finalPath);
                }
                return res.status(400).json({
                    success: false,
                    message: `❌ Esiste già un template con il nome "${nome}". Scegli un nome diverso o elimina il template esistente.`
                });
            }
            throw insertError;  // Re-throw altri errori
        }

        const result = await pool.query(`SELECT * FROM contract_templates WHERE id = ?`, [templateId]);
        const template = result.rows[0] as any;

        res.json({
            success: true,
            message: 'Modello caricato con successo',
            data: {
                ...template,
                campi_estratti: JSON.parse(template.campi_estratti)
            }
        });
    } catch (error: any) {
        console.error('❌ Errore upload template:', error.message);
        // Rimuovi file in caso di errore
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            message: 'Errore durante il caricamento del modello',
            error: error.message
        });
    }
});

/**
 * GET /api/contratti-gestione/templates/:id/preview
 * Visualizza/scarica il file PDF del template
 */
router.get('/templates/:id/preview', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`SELECT * FROM contract_templates WHERE id = ?`, [id]);
        
        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Modello non trovato'
            });
        }

        const template = result.rows[0] as any;
        const filePath = template.file_path;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File del modello non trovato sul server'
            });
        }

        // Invia il file PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${template.file_name}"`);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error: any) {
        console.error('❌ Errore preview template:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante la visualizzazione del modello',
            error: error.message
        });
    }
});

/**
 * PUT /api/contratti-gestione/templates/:id
 * Modifica nome/fornitore/categoria di un template
 */
router.put('/templates/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nome, fornitore, categoria } = req.body;

        const result = await pool.query(`SELECT * FROM contract_templates WHERE id = ?`, [id]);
        
        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Modello non trovato'
            });
        }

        // Aggiorna solo i campi forniti
        const updates: string[] = [];
        const params: any[] = [];

        if (nome) {
            updates.push('nome = ?');
            params.push(nome);
        }
        if (fornitore) {
            updates.push('fornitore = ?');
            params.push(fornitore);
        }
        if (categoria) {
            updates.push('categoria = ?');
            params.push(categoria);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nessun campo da aggiornare'
            });
        }

        params.push(id);
        await pool.query(`UPDATE contract_templates SET ${updates.join(', ')} WHERE id = ?`, params);

        const updated = await pool.query(`SELECT * FROM contract_templates WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: 'Modello aggiornato con successo',
            data: updated.rows[0]
        });
    } catch (error: any) {
        console.error('❌ Errore modifica template:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante la modifica del modello',
            error: error.message
        });
    }
});

/**
 * DELETE /api/contratti-gestione/templates/:id
 * Elimina un modello contratto
 */
router.delete('/templates/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Recupera info template per eliminare file
        const template = await pool.query(`SELECT * FROM contract_templates WHERE id = ?`, [id]);
        
        if (!template.rows || template.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Modello non trovato'
            });
        }

        // Soft delete (disattiva invece di eliminare)
        await pool.query(`UPDATE contract_templates SET attivo = 0 WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: 'Modello eliminato con successo'
        });
    } catch (error: any) {
        console.error('❌ Errore eliminazione template:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante l\'eliminazione del modello',
            error: error.message
        });
    }
});

// Continua nel prossimo blocco...
export default router;

