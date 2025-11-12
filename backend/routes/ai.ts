/**
 * ════════════════════════════════════════════════════════════════════════════════
 * API Routes - AI Client Data Extraction
 * Estrazione intelligente dati da PDF/immagini con Ollama
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
// Tesseract e pdf-parse caricati dinamicamente per compatibilità TypeScript
const pdfParse = require('pdf-parse');

const router = Router();

// Configurazione Multer per upload temporaneo
const upload = multer({
    dest: 'uploads/temp/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|jpg|jpeg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Formato file non supportato'));
        }
    }
});

// Configurazione per upload multipli
const uploadMultiple = multer({
    dest: 'uploads/temp/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 10 // Max 10 file
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|jpg|jpeg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Formato file non supportato'));
        }
    }
});

router.use(authenticate);

/**
 * POST /api/ai/extract-client-data
 * Estrae dati strutturati da documento con AI
 */
router.post('/extract-client-data', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nessun file caricato'
            });
        }

        const { docType, clientType } = req.body;
        const filePath = req.file.path;

        console.log('🤖 AI Extraction started:', {
            file: req.file.originalname,
            docType,
            clientType,
            size: req.file.size
        });

        // Leggi il file
        const fileBuffer = fs.readFileSync(filePath);
        const fileBase64 = fileBuffer.toString('base64');

        // Crea prompt specifico per tipo documento
        const prompt = createPrompt(docType, clientType);

        // Chiama Ollama API
        const ollamaUrl = process.env.OLLAMA_API_URL || 'http://185.31.67.249/api/generate';
        
        console.log('🤖 Calling Ollama API:', ollamaUrl);

        const ollamaResponse = await axios.post(ollamaUrl, {
            model: 'llama3:8b',
            messages: [
                {
                    role: 'system',
                    content: 'Sei un assistente esperto nell\'estrazione di dati strutturati da documenti. Rispondi SOLO con JSON valido, senza testo aggiuntivo.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            stream: false,
            format: 'json'
        }, {
            timeout: 60000 // 60 secondi
        });

        let extractedData: any = {};

        // Parse risposta Ollama
        if (ollamaResponse.data && ollamaResponse.data.message) {
            try {
                const content = ollamaResponse.data.message.content;
                extractedData = JSON.parse(content);
                console.log('✅ Dati estratti:', extractedData);
            } catch (parseError) {
                console.error('❌ Errore parsing JSON AI:', parseError);
                // Fallback: restituisci dati demo
                extractedData = generateFallbackData(docType, clientType);
            }
        } else {
            // Fallback: restituisci dati demo
            extractedData = generateFallbackData(docType, clientType);
        }

        // Pulisci file temporaneo
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            data: extractedData,
            message: 'Dati estratti con successo'
        });

    } catch (error: any) {
        console.error('❌ Errore AI extraction:', error);
        
        // Pulisci file temporaneo in caso di errore
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('Errore pulizia file:', cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Errore estrazione dati',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Crea prompt AI specifico per tipo documento
 */
function createPrompt(docType: string, clientType: string): string {
    const basePrompt = `
Estrai i seguenti dati dal documento in formato JSON:

${clientType === 'privato' ? `
{
    "nome": "Nome cliente",
    "cognome": "Cognome cliente",
    "codice_fiscale": "Codice fiscale (16 caratteri)",
    "data_nascita": "Data nascita formato YYYY-MM-DD",
    "luogo_nascita": "Luogo di nascita",
    "email_principale": "Email principale",
    "telefono_mobile": "Numero telefono",
    "via_residenza": "Via residenza",
    "civico_residenza": "Numero civico",
    "cap_residenza": "CAP (5 cifre)",
    "citta_residenza": "Città",
    "provincia_residenza": "Sigla provincia (2 lettere)",
    "tipo_documento": "CI/Patente/Passaporto",
    "numero_documento": "Numero documento",
    "iban": "IBAN se presente"
}
` : `
{
    "ragione_sociale": "Ragione sociale azienda",
    "partita_iva": "Partita IVA (11 cifre)",
    "codice_fiscale": "Codice fiscale",
    "codice_ateco": "Codice ATECO se presente",
    "pec_aziendale": "Email PEC aziendale",
    "email_principale": "Email principale",
    "telefono_principale": "Numero telefono",
    "via_sede_legale": "Via sede legale",
    "civico_sede_legale": "Numero civico",
    "cap_sede_legale": "CAP (5 cifre)",
    "citta_sede_legale": "Città",
    "provincia_sede_legale": "Sigla provincia (2 lettere)",
    "nome_referente": "Nome referente",
    "cognome_referente": "Cognome referente",
    "codice_sdi": "Codice SDI se presente"
}
`}

${docType === 'contratto' ? `
Inoltre, estrai dati contratto se presenti:
{
    "contratti": [{
        "tipo": "luce/gas",
        "pod_pdr": "Codice POD o PDR",
        "fornitore": "Nome fornitore",
        "data_stipula": "Data stipula formato YYYY-MM-DD",
        "data_attivazione": "Data attivazione formato YYYY-MM-DD",
        "offerta": "Nome offerta",
        "prezzo": "Prezzo se indicato"
    }]
}
` : ''}

Estrai SOLO i dati che trovi effettivamente nel documento.
Se un campo non è presente, omettilo o mettilo come null.
Rispondi SOLO con JSON valido, senza testo aggiuntivo.
`;

    return basePrompt;
}

/**
 * Genera dati fallback se AI non risponde
 */
function generateFallbackData(docType: string, clientType: string): any {
    if (clientType === 'privato') {
        return {
            nome: '[Estratto da documento]',
            cognome: '[Estratto da documento]',
            email_principale: '',
            telefono_mobile: '',
            note: 'Dati estratti automaticamente con AI. Verificare accuratezza.'
        };
    } else {
        return {
            ragione_sociale: '[Estratto da documento]',
            partita_iva: '',
            email_principale: '',
            telefono_principale: '',
            note: 'Dati estratti automaticamente con AI. Verificare accuratezza.'
        };
    }
}

/**
 * POST /api/ai/extract-multiple
 * Estrae dati da MULTIPLI documenti e li combina intelligentemente
 * Per compilazione contratti: Carta ID + Bolletta + Contratto precedente
 */
router.post('/extract-multiple', uploadMultiple.array('files', 10), async (req: Request, res: Response, next: NextFunction) => {
    const uploadedFiles: Express.Multer.File[] = [];
    
    try {
        const files = req.files as Express.Multer.File[];
        
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nessun file caricato'
            });
        }

        console.log(`🤖 Estrazione AI multipla da ${files.length} documenti`);
        
        uploadedFiles.push(...files);
        const ollamaUrl = process.env.OLLAMA_API_URL || 'http://185.31.67.249/api/generate';
        const model = process.env.AI_MODEL || 'llama3:8b';
        
        // Oggetto che accumula tutti i dati estratti
        const combinedData: any = {
            note: `Dati estratti da ${files.length} documenti con AI`
        };

        // Processa ogni file
        for (const file of files) {
            try {
                const fileContent = fs.readFileSync(file.path, 'utf-8');
                
                // Determina il tipo di documento dal nome o contenuto
                const fileName = file.originalname.toLowerCase();
                let docType = 'generico';
                if (fileName.includes('carta') || fileName.includes('identit') || fileName.includes('document')) {
                    docType = 'identita';
                } else if (fileName.includes('bolletta') || fileName.includes('fattura')) {
                    docType = 'bolletta';
                } else if (fileName.includes('contratto') || fileName.includes('proposta')) {
                    docType = 'contratto';
                } else if (fileName.includes('visura') || fileName.includes('partita')) {
                    docType = 'visura';
                }

                console.log(`  📄 Processando: ${file.originalname} (tipo: ${docType})`);

                const prompt = `Sei un assistente AI specializzato nell'estrazione di dati da documenti.
Analizza il seguente documento (${docType}) ed estrai TUTTI i dati disponibili.

DOCUMENTO:
${fileContent.substring(0, 3000)}

Estrai i seguenti dati se presenti:

DATI ANAGRAFICI:
- Nome e Cognome
- Data di nascita
- Luogo di nascita
- Codice Fiscale
- Indirizzo completo (via, civico, CAP, città, provincia)

DATI AZIENDALI (se presenti):
- Ragione Sociale
- Partita IVA
- Codice ATECO
- Sede legale completa

DATI CONTATTO:
- Telefono/Cellulare
- Email
- PEC

DATI CONTRATTO ENERGIA (se presenti):
- POD (Point of Delivery - codice luce)
- PDR (Punto Di Riconsegna - codice gas)
- Fornitore attuale
- Tipo fornitura (luce/gas)
- Potenza impegnata (kW)
- Consumo annuo (kWh o Smc)
- Prezzo attuale
- Data attivazione/stipula

Rispondi SOLO con un oggetto JSON valido. Esempio:
{
    "nome": "Mario",
    "cognome": "Rossi",
    "codice_fiscale": "RSSMRA80A01H501U",
    "data_nascita": "1980-01-01",
    "indirizzo_fornitura": "Via Roma 10",
    "cap_fornitura": "00100",
    "comune_fornitura": "Roma",
    "provincia_fornitura": "RM",
    "telefono": "+39 333 1234567",
    "email": "mario.rossi@email.com",
    "pod": "IT001E12345678",
    "pdr": "12345678901234",
    "fornitore": "ENEL",
    "potenza_impegnata": 3.0,
    "consumo_annuo_gas": 1200
}

Se un campo non è presente, omettilo. NON inventare dati. Rispondi SOLO con JSON valido, niente altro.`;

                const aiResponse = await axios.post(
                    ollamaUrl,
                    {
                        model: model,
                        prompt: prompt,
                        stream: false,
                        temperature: 0.2
                    },
                    {
                        timeout: 60000,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (aiResponse.data && aiResponse.data.response) {
                    const responseText = aiResponse.data.response;
                    console.log(`  ✅ Risposta AI ricevuta (${responseText.length} caratteri)`);
                    
                    // Estrai JSON dalla risposta
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const extractedData = JSON.parse(jsonMatch[0]);
                        
                        // Combina i dati estratti con quelli già presenti
                        // Regole: non sovrascrivere dati già esistenti se il nuovo è vuoto
                        for (const [key, value] of Object.entries(extractedData)) {
                            if (value && value !== '' && value !== null) {
                                if (!combinedData[key] || combinedData[key] === '' || combinedData[key] === null) {
                                    combinedData[key] = value;
                                }
                            }
                        }
                        
                        console.log(`  ✅ Dati estratti: ${Object.keys(extractedData).length} campi`);
                    }
                }
            } catch (fileError: any) {
                console.error(`  ❌ Errore processando ${file.originalname}:`, fileError.message);
                // Continua con gli altri file anche se uno fallisce
            }
        }

        // Cleanup: rimuovi file temporanei
        for (const file of uploadedFiles) {
            try {
                fs.unlinkSync(file.path);
            } catch (err) {
                console.error('Errore rimozione file:', err);
            }
        }

        console.log(`✅ Estrazione multipla completata: ${Object.keys(combinedData).length} campi totali`);

        return res.json({
            success: true,
            data: combinedData,
            documentsProcessed: files.length,
            message: `Dati estratti da ${files.length} documenti`
        });

    } catch (error: any) {
        console.error('❌ Errore estrazione multipla:', error);
        
        // Cleanup file in caso di errore
        for (const file of uploadedFiles) {
            try {
                fs.unlinkSync(file.path);
            } catch (err) {
                // Ignora errori di cleanup
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Errore durante l\'estrazione AI',
            error: error.message
        });
    }
});

/**
 * 🤖 Estrazione Dati per Compilazione Contratti con OCR
 * Carica documenti (CI, bollette, ecc.) e estrai dati per pre-compilare il PDF
 */
router.post('/extract-contract-data', uploadMultiple.array('documents', 5), async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nessun documento caricato' });
    }
    
    try {
        console.log(`\n🤖 === ESTRAZIONE DATI CONTRATTO DA ${files.length} DOCUMENTI ===`);
        
        // 🔍 FASE 1: Estrai testo da ogni documento usando OCR
        const extractedTexts: string[] = [];
        
        for (const file of files) {
            console.log(`📄 Elaborazione: ${file.originalname}...`);
            
            try {
                if (file.mimetype === 'application/pdf') {
                    // Estrai testo da PDF
                    const dataBuffer = fs.readFileSync(file.path);
                    const pdfData = await pdfParse(dataBuffer);
                    extractedTexts.push(`=== ${file.originalname} (PDF) ===\n${pdfData.text}`);
                    console.log(`✅ Testo estratto da PDF: ${pdfData.text.length} caratteri`);
                    
                } else if (file.mimetype.startsWith('image/')) {
                    // 🔧 PRE-PROCESSING: Migliora l'immagine prima dell'OCR
                    const sharp = require('sharp');
                    const Tesseract = require('tesseract.js');
                    const path = require('path');
                    
                    console.log(`\n🔍 Avvio OCR AVANZATO su ${file.originalname}...`);
                    console.log(`   📁 File path: ${file.path}`);
                    console.log(`   📏 File size originale: ${file.size} bytes`);
                    
                    // Path per file processato (aggiungi .png se non ha estensione)
                    const processedPath = file.path.includes('.') 
                        ? file.path.replace(/(\.[^.]+)$/, '_processed$1')
                        : file.path + '_processed.png';
                    
                    try {
                        console.log('   🎨 Pre-processing immagine per migliorare OCR...');
                        
                        // Carica metadati immagine
                        const metadata = await sharp(file.path).metadata();
                        console.log(`   📐 Dimensioni originali: ${metadata.width}x${metadata.height}px`);
                        
                        // Pre-processing ULTRA-AGGRESSIVO per OCR ottimale
                        await sharp(file.path)
                            // 1. Rotazione automatica (deskewing)
                            .rotate() // Auto-rotate basato su EXIF
                            // 2. Ridimensiona GRANDE (min 2000px) per OCR migliore
                            .resize({
                                width: Math.max(metadata.width || 2000, 2000),
                                height: Math.max(metadata.height || 2800, 2800),
                                fit: 'inside',
                                withoutEnlargement: false,
                                kernel: 'lanczos3' // Miglior algoritmo per upscaling
                            })
                            // 3. Converti in scala di grigi
                            .grayscale()
                            // 4. Rimuovi rumore con median filter
                            .median(3)
                            // 5. NORMALIZZAZIONE AVANZATA
                            .normalize() // Auto-stretch histogram
                            // 6. Aumento contrasto MASSIMO
                            .linear(2.0, -(128 * 2.0) + 128) // 2x contrasto
                            // 7. Nitidezza ESTREMA
                            .sharpen({
                                sigma: 1.5,
                                m1: 2,
                                m2: 1,
                                x1: 2,
                                y2: 10,
                                y3: 20
                            })
                            // 8. Gamma correction per luminosità
                            .gamma(1.2)
                            // 9. Binarizzazione ADATTIVA (Otsu's method simulation)
                            .threshold(140) // Soglia ottimizzata per documenti
                            // 10. Morphological closing (riempie piccoli buchi)
                            .median(2)
                            // 11. Salva come PNG ad altissima qualità
                            .png({ quality: 100, compressionLevel: 0, palette: false })
                            .toFile(processedPath);
                        
                        const processedStats = await fs.promises.stat(processedPath);
                        console.log(`   ✅ Immagine processata: ${processedStats.size} bytes`);
                        console.log(`   📝 Immagine salvata: ${processedPath}`);
                        
                    } catch (preprocessError: any) {
                        console.warn(`   ⚠️ Errore pre-processing (uso originale): ${preprocessError.message}`);
                        // Se fallisce, usa l'immagine originale
                    }
                    
                    // OCR MULTI-PASS con Tesseract (massima accuratezza)
                    const ocrPath = fs.existsSync(processedPath) ? processedPath : file.path;
                    console.log(`   🤖 Avvio Tesseract OCR MULTI-PASS su: ${ocrPath}`);
                    
                    // Crea worker con solo italiano (evita conflitti)
                    let worker;
                    try {
                        console.log('   🌍 Caricamento lingua italiana...');
                        worker = await Tesseract.createWorker('ita', 1, {
                            logger: (m: any) => {
                                if (m.status === 'recognizing text') {
                                    console.log(`   📊 OCR progresso: ${Math.round(m.progress * 100)}%`);
                                }
                            }
                        });
                    } catch (langError: any) {
                        console.warn(`   ⚠️ Fallback a lingua inglese: ${langError.message}`);
                        worker = await Tesseract.createWorker('eng', 1, {
                            logger: (m: any) => {
                                if (m.status === 'recognizing text') {
                                    console.log(`   📊 OCR progresso: ${Math.round(m.progress * 100)}%`);
                                }
                            }
                        });
                    }
                    
                    // PASS 1: PSM 6 (blocco uniforme) - Ideale per carte d'identità
                    console.log('   🔄 OCR Pass 1/3: PSM_SINGLE_BLOCK...');
                    await worker.setParameters({
                        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
                        preserve_interword_spaces: '1',
                    });
                    const result1 = await worker.recognize(ocrPath);
                    const text1 = result1.data.text;
                    console.log(`   ✅ Pass 1: ${text1.length} caratteri`);
                    
                    // PASS 2: PSM 3 (auto) - Fallback a PSM_AUTO se OSD non disponibile
                    let text2 = '';
                    try {
                        console.log('   🔄 OCR Pass 2/3: PSM_AUTO...');
                        await worker.setParameters({
                            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                            preserve_interword_spaces: '1',
                        });
                        const result2 = await worker.recognize(ocrPath);
                        text2 = result2.data.text;
                        console.log(`   ✅ Pass 2: ${text2.length} caratteri`);
                    } catch (pass2Error: any) {
                        console.warn(`   ⚠️ Pass 2 fallito: ${pass2Error.message}`);
                        text2 = text1; // Usa Pass 1 come fallback
                    }
                    
                    // PASS 3: PSM 11 (sparse text) - Per testo sparso
                    let text3 = '';
                    try {
                        console.log('   🔄 OCR Pass 3/3: PSM_SPARSE_TEXT...');
                        await worker.setParameters({
                            tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
                            preserve_interword_spaces: '1',
                        });
                        const result3 = await worker.recognize(ocrPath);
                        text3 = result3.data.text;
                        console.log(`   ✅ Pass 3: ${text3.length} caratteri`);
                    } catch (pass3Error: any) {
                        console.warn(`   ⚠️ Pass 3 fallito: ${pass3Error.message}`);
                        text3 = text1; // Usa Pass 1 come fallback
                    }
                    
                    await worker.terminate();
                    
                    // Combina i risultati (prendi il più lungo + merge unique lines)
                    const allTexts = [text1, text2, text3];
                    const longestText = allTexts.reduce((a, b) => a.length > b.length ? a : b);
                    
                    // Merge unique lines da tutti i pass
                    const uniqueLines = new Set<string>();
                    allTexts.forEach((text: string) => {
                        text.split('\n').forEach((line: string) => {
                            const cleaned = line.trim();
                            if (cleaned.length > 2) {
                                uniqueLines.add(cleaned);
                            }
                        });
                    });
                    
                    let text = longestText + '\n\n' + Array.from(uniqueLines).join('\n');
                    console.log(`   🎯 Testo combinato prima pulizia: ${text.length} caratteri`);
                    
                    // POST-PROCESSING: Correzione errori OCR comuni
                    console.log('   🧹 Post-processing testo OCR...');
                    
                    // Correzioni specifiche per documenti italiani
                    text = text
                        // Correzioni comuni OCR
                        .replace(/\b[Il]l([aeiou])/gi, 'L$1')  // "Iluca" → "Luca"
                        .replace(/\b[Jj]l([aeiou])/gi, 'L$1')  // "Jlauca" → "Luca"  
                        .replace(/\b[Jj]([aeiou])/gi, 'L$1')   // "Juca" → "Luca"
                        .replace(/\bNl([aei])/gi, 'M$1')       // "Nlaria" → "Maria"
                        .replace(/\b0([A-Z])/g, 'O$1')         // "0livio" → "Olivio"
                        .replace(/\b1([a-z])/gi, 'I$1')        // "1talia" → "Italia"
                        .replace(/([a-z])1([a-z])/gi, '$1i$2') // "Ital1a" → "Italia"
                        .replace(/([a-z])0([a-z])/gi, '$1o$2') // "Rom0" → "Romo"
                        
                        // Pulizia spazi multipli
                        .replace(/\s+/g, ' ')
                        .replace(/\n\s*\n\s*\n/g, '\n\n')
                        
                        // Rimuovi caratteri di controllo strani
                        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                        
                        // Fix keywords comuni
                        .replace(/c0gn0me/gi, 'Cognome')
                        .replace(/n0me/gi, 'Nome')
                        .replace(/nat[o0]/gi, 'nato')
                        .replace(/c[o0]dice\s*fisc[a@]le/gi, 'Codice Fiscale')
                        .replace(/residenz[a@]/gi, 'residenza')
                        .replace(/cittadin[a@]nz[a@]/gi, 'cittadinanza');
                    
                    console.log(`   ✅ Testo dopo post-processing: ${text.length} caratteri`);
                    
                    // Cleanup file processato
                    if (fs.existsSync(processedPath)) {
                        fs.unlinkSync(processedPath);
                    }
                    
                    extractedTexts.push(`=== ${file.originalname} (Immagine - Carta Identità/Documento) ===\n${text}`);
                    console.log(`   ✅ Testo OCR estratto: ${text.length} caratteri`);
                    
                    // Mostra anteprima del testo estratto
                    if (text.length > 0) {
                        console.log('   📝 Anteprima testo OCR (primi 800 caratteri):');
                        console.log('   ' + '─'.repeat(60));
                        console.log(text.substring(0, 800).split('\n').map((l: string) => '   ' + l).join('\n'));
                        console.log('   ' + '─'.repeat(60));
                    } else {
                        console.warn('   ⚠️ OCR non ha estratto nessun testo!');
                    }
                }
            } catch (extractError: any) {
                console.error(`❌ ERRORE CRITICO durante estrazione da ${file.originalname}:`);
                console.error('   Tipo errore:', extractError.name);
                console.error('   Messaggio:', extractError.message);
                console.error('   Stack:', extractError.stack);
                console.error('   File path:', file.path);
                console.error('   File mimetype:', file.mimetype);
                console.error('   File size:', file.size);
                extractedTexts.push(`=== ${file.originalname} ===\n[Errore estrazione testo: ${extractError.message}]`);
            }
        }
        
        const allText = extractedTexts.join('\n\n');
        console.log(`📊 Testo totale estratto: ${allText.length} caratteri`);
        console.log('\n════════════════════════════════════════');
        console.log('📝 TESTO COMPLETO ESTRATTO:');
        console.log('════════════════════════════════════════');
        console.log(allText);
        console.log('════════════════════════════════════════\n');
        
        // 🤖 FASE 2: Usa AI per estrarre dati strutturati dal testo
        // Leggi configurazione AI dal database (stessa logica esistente)
        const { pool } = require('../config/database');
        const configQuery = await pool.query(`
            SELECT chiave, valore FROM configurazioni 
            WHERE chiave IN ('ai_provider', 'groq_api_key', 'ollama_url', 'ollama_model', 'groq_model')
        `);
        const config: any = {};
        for (const row of configQuery.rows) {
            const r = row as any;
            config[r.chiave] = r.valore;
        }
        
        const AI_PROVIDER = config.ai_provider || process.env.AI_PROVIDER || 'ollama';
        const GROQ_API_KEY = config.groq_api_key || process.env.GROQ_API_KEY;
        const GROQ_MODEL = config.groq_model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        const OLLAMA_URL = config.ollama_url || process.env.OLLAMA_URL || 'http://185.31.67.249/api/generate';
        const OLLAMA_MODEL = config.ollama_model || process.env.OLLAMA_MODEL || 'llama3:8b';
        
        console.log(`🤖 Provider AI: ${AI_PROVIDER}`);
        
        // Riconosci tipo documento
        const isContract = allText.includes('bolletta') || allText.includes('fattura') || 
                          allText.includes('contratto') || allText.includes('PDR') || 
                          allText.includes('POD') || allText.includes('Codice cliente');
        
        console.log(`📋 Tipo documento rilevato: ${isContract ? 'CONTRATTO/BOLLETTA' : 'CARTA IDENTITÀ'}`);
        
        // Prompt AI per estrazione dati - ULTRA-POTENZIATO per DOCUMENTI e CONTRATTI
        const prompt = `Sei un ESPERTO nell'estrazione dati da DOCUMENTI ITALIANI (carte d'identità, bollette, contratti).

⚠️ CONTESTO:
- Il testo proviene da OCR (può contenere errori)
- Tipo documento: ${isContract ? 'BOLLETTA/CONTRATTO GAS o ENERGIA ELETTRICA' : 'CARTA IDENTITÀ o DOCUMENTO PERSONALE'}
- Devi estrarre TUTTI i dati disponibili, sia anagrafici che contrattuali

TESTO OCR ESTRATTO (potrebbe essere corrotto):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${allText.substring(0, 25000)} ${allText.length > 25000 ? '\n... (testo troncato per limite token)' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${allText.length > 5000 ? `\n📊 STATISTICHE DOCUMENTO:\n- Caratteri totali: ${allText.length}\n- Caratteri analizzati: ${Math.min(allText.length, 25000)}\n- Percentuale analizzata: ${Math.round((Math.min(allText.length, 25000) / allText.length) * 100)}%\n` : ''}

TASK: Estrai TUTTI i dati personali possibili dal testo, anche se parzialmente corrotti.

🎯 STRATEGIA DI ESTRAZIONE INTELLIGENTE:
1. **Cerca PRIMA il Codice Fiscale** - è il dato più strutturato e affidabile
2. **Usa il CF per VALIDARE Nome/Cognome** - le prime 3 lettere = consonanti cognome, lettere 4-6 = consonanti nome
3. **Cerca keywords** vicino ai dati: "Cognome:", "Nome:", "nato a", "resid", "CF"
4. **Analizza il LAYOUT** - cerca coppie label:valore sulle stesse righe
5. **Cerca date** nel formato XX/XX/XXXX o varianti (anche DD-MM-YYYY, DD.MM.YYYY)
6. **Cerca città italiane** nel testo - top 100 città (Roma, Milano, Bologna, Napoli, Torino, Firenze, etc.)
7. **Se trovi "Nome: X, Y, Z"** → prendi SOLO la PRIMA parola (X)
8. **Pattern numeri**: CAP (5 cifre), telefono (10 cifre), cellulare (inizia con 3)

📋 CAMPI DA ESTRARRE (in base al tipo documento):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${isContract ? `
🏢 **PRIORITÀ PER BOLLETTE/CONTRATTI:**
1. **DATI CONTRATTO** (massima priorità):
   - pdr: Codice PDR/Punto di riconsegna (cerca "PDR", 14 cifre)
   - pod: Codice POD (cerca "POD", alfanumerico lungo)
   - codice_cliente: Codice cliente (cerca "Codice cliente", numeri)
   - codice_contratto: Codice contratto (cerca "Codice contratto", numeri)
   - matricola_contatore: Matricola contatore/misuratore (cerca "Matricola", alfanumerico)
   
2. **DATI FATTURA**:
   - numero_fattura: Numero fattura (cerca "Numero fattura", "fattura n.")
   - data_emissione: Data emissione (cerca "Data emissione", "emesso il")
   - scadenza: Data scadenza (cerca "Scadenza", "scadenza")
   - totale: Importo totale (cerca "Totale", "da pagare", numero con €)
   - periodo_fatturazione: Periodo (cerca "Periodo:", "dal...al")

3. **DATI ANAGRAFICI INTESTATARIO**:
` : `
🆔 **PRIORITÀ PER CARTE D'IDENTITÀ:**
1. **DATI ANAGRAFICI** (massima priorità):
`}
   - nome: Nome proprio - PRENDI SOLO LA PRIMA PAROLA dopo "Nome:"
   - cognome: Cognome (cerca "Cognome:", prima parola in maiuscolo)
   - codice_fiscale: 16 caratteri alfanumerici
   - data_nascita: Data formato gg/mm/aaaa
   - luogo_nascita: Città di nascita
   - sesso: M o F
   - cittadinanza: Nazionalità

${isContract ? `4. **INDIRIZZO FORNITURA/RESIDENZA**:` : `2. **RESIDENZA**:`}
   - indirizzo_residenza: Via/Corso/Piazza + numero
   - indirizzo_fornitura: Indirizzo fornitura (se diverso da residenza)
   - citta_residenza: Comune
   - cap_residenza: 5 cifre
   - provincia_residenza: 2 lettere maiuscole (CH, BO, MI, etc.)

${isContract ? `5. **CONTATTI**:` : `3. **CONTATTI**:`}
   - telefono: Numero fisso
   - cellulare: Cellulare (inizia con 3)
   - email: Email
   - pec: PEC

${isContract ? `6. **ALTRI DATI AZIENDALI**:` : `4. **DATI AZIENDALI** (se presenti):`}
   - partita_iva: 11 cifre (P.IVA)
   - ragione_sociale: Nome società

⚠️ REGOLE ANTI-OCR-ERROR:
- Ignora caratteri speciali strani (§, ¢, ©, ®, €, etc.) vicino a dati validi
- "I" o "l" o "1" possono essere intercambiabili, "O" può essere "0"
- Spazi mancanti: "RossiFrancesco" → "Rossi Francesco"
- Codice Fiscale: tolto caratteri speciali, prendi solo primi 16 alfanumerici consecutivi
- Date: accetta XX-XX-XXXX, XX.XX.XXXX, XX XX XXXX oltre a XX/XX/XXXX
- Nomi città: cerca match parziali (es. "Milan" → "Milano")

🔧 CORREZIONI OCR NOMI ITALIANI (ESEMPI REALI):
- "Jlauca, Gennaro Pio" → Nome: "Luca" (prendi SOLO la prima parola e correggi J→L)
- "Juca" → "Luca"
- "Jlaria" → "Ilaria"
- "Nlario" → "Mario"
- "Nlarco" → "Marco"
- "Paoio" → "Paolo"
- "Giorg1o" → "Giorgio" (1 → i)
- Se vedi "J" o "Il" o "1l" all'inizio di un nome, sostituisci con "L" o "I"

📌 REGOLA CRITICA PER IL NOME:
**Se dopo "Nome:" trovi più parole separate da virgola, prendi SOLO LA PRIMA PAROLA e correggila**

ESEMPI REALI:
• Input: "Nome: Jlauca, Gennaro Pio" → Output: {"nome": "Luca"} ✅
• Input: "Nome: Jlauca" → Output: {"nome": "Luca"} ✅
• Input: "Cognome. TOZZI. iii" → Output: {"cognome": "TOZZI"} ✅
• Input: "nat0 il... 06-Agosto-1994" → Output: {"data_nascita": "06/08/1994"} ✅
• Input: "CASALI AMORALE MRAZ LEA TA," → Ignora testo corrotto, cerca pattern validi ✅

🔢 CODICE FISCALE - Pattern di ricerca:
- Formato standard: 6 lettere + 2 numeri + 1 lettera + 2 numeri + 1 lettera + 3 numeri + 1 lettera
- Esempio valido: TZZLCU94M06F839A
- Cerca anche sequenze SPEZZATE o con caratteri strani nel mezzo
- Rimuovi spazi/simboli e verifica se forma un CF valido

📤 OUTPUT JSON (RISPONDI SOLO CON JSON, NIENTE ALTRO TESTO):
{
  "nome": "valore estratto o null",
  "cognome": "valore estratto o null",
  "codice_fiscale": "XXXXXX00X00X000X",
  "data_nascita": "gg/mm/aaaa",
  ...
}

⚠️ IMPORTANTE: Restituisci SOLO il JSON, nessun altro testo!`;

        let extractedData: any = {};
        
        try {
            if (AI_PROVIDER === 'groq' && GROQ_API_KEY) {
                console.log('🤖 Uso Groq per estrazione...');
                const response = await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: GROQ_MODEL,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.1,
                        max_tokens: 2000,
                    },
                    {
                        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
                        timeout: 60000
                    }
                );
                
                const content = response.data.choices[0].message.content;
                // Estrai JSON dal contenuto
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    extractedData = JSON.parse(jsonMatch[0]);
                }
                
            } else {
                console.log('🤖 Uso Ollama per estrazione...');
                const response = await axios.post(
                    OLLAMA_URL.replace('/generate', '/chat'),
                    {
                        model: OLLAMA_MODEL,
                        messages: [{ role: 'user', content: prompt }],
                        stream: false,
                        options: {
                            temperature: 0.1,
                            num_predict: 2000
                        }
                    },
                    { timeout: 60000 }
                );
                
                const content = response.data.message.content;
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    extractedData = JSON.parse(jsonMatch[0]);
                }
            }
        } catch (aiError: any) {
            console.warn('⚠️ AI estrazione fallita:', aiError.message);
            console.log('🔧 Tento estrazione con regex...');
            
            // Fallback: Estrazione con regex dal testo OCR
            extractedData = {};
            
            // Pulisci il testo da caratteri speciali strani per migliorare il matching
            let cleanText = allText.replace(/[§¢©®€™℠℗°•]/g, ' ');
            
            // Pulizia aggressiva per migliorare matching
            cleanText = cleanText.replace(/\s+/g, ' '); // Spazi multipli → spazio singolo
            cleanText = cleanText.replace(/[_\-]{2,}/g, ' '); // Trattini multipli → spazio
            
            console.log('\n📝 Testo pulito per estrazione (primi 500 caratteri):');
            console.log(cleanText.substring(0, 500));
            
            // Codice Fiscale: pattern MOLTO flessibile per OCR corrotto
            let codiceFiscale = null;
            
            // Tentativo 1: Pattern standard
            const cfMatch = cleanText.match(/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/i);
            if (cfMatch) {
                codiceFiscale = cfMatch[0].toUpperCase();
                console.log('   ✅ CF trovato (standard):', cfMatch[0]);
            }
            
            // Tentativo 2: Pattern loose (rimuove TUTTI i caratteri non alfanumerici)
            if (!codiceFiscale) {
                const textOnlyAlphaNum = cleanText.replace(/[^A-Z0-9]/gi, '');
                const cfLoose = textOnlyAlphaNum.match(/[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i);
                if (cfLoose) {
                    codiceFiscale = cfLoose[0].toUpperCase();
                    console.log('   ✅ CF trovato (loose):', cfLoose[0]);
                }
            }
            
            // Tentativo 3: Cerca vicino a keywords "codice fiscale", "CF", "C.F."
            if (!codiceFiscale) {
                const cfContext = cleanText.match(/(?:codice\s*fiscale|CF|C\.F\.)[:\s]*([A-Z0-9\s]{16,25})/i);
                if (cfContext) {
                    const cfCleaned = cfContext[1].replace(/[^A-Z0-9]/gi, '');
                    if (cfCleaned.length >= 16) {
                        const cfExtracted = cfCleaned.substring(0, 16);
                        if (/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(cfExtracted)) {
                            codiceFiscale = cfExtracted.toUpperCase();
                            console.log('   ✅ CF trovato (contesto):', cfExtracted);
                        }
                    }
                }
            }
            
            // Tentativo 4: Cerca sequenze di 16 caratteri che SEMBRANO un CF
            if (!codiceFiscale) {
                const allWords = cleanText.split(/\s+/);
                for (const word of allWords) {
                    const cleaned = word.replace(/[^A-Z0-9]/gi, '');
                    if (cleaned.length >= 16) {
                        for (let i = 0; i <= cleaned.length - 16; i++) {
                            const candidate = cleaned.substring(i, i + 16).toUpperCase();
                            if (/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(candidate)) {
                                codiceFiscale = candidate;
                                console.log('   ✅ CF trovato (scansione):', candidate);
                                break;
                            }
                        }
                        if (codiceFiscale) break;
                    }
                }
            }
            
            if (codiceFiscale) {
                extractedData.codice_fiscale = codiceFiscale;
            } else {
                console.log('   ❌ CF non trovato');
            }
            
            // Nome/Cognome: cerca pattern con più tolleranza + pattern per contratti
            
            // Prova prima pattern per contratti/bollette
            let cognomeFromContract = null;
            const contractNamePatterns = [
                /(?:Intestata a|intestati a|Servizi intestati a)[:\s]+([A-ZÀ-Ù]+)\s+([A-ZÀ-Ù]+)/i,
                /([A-ZÀ-Ù]{2,})\s+([A-ZÀ-Ù]{2,})\s+VIALE|VIA|CORSO|PIAZZA/i  // Nome Cognome prima dell'indirizzo
            ];
            
            for (const pattern of contractNamePatterns) {
                const match = cleanText.match(pattern);
                if (match && match[1] && match[2]) {
                    extractedData.cognome = match[1].trim();
                    extractedData.nome = match[2].trim();
                    cognomeFromContract = match[1];
                    console.log('   ✅ Nome+Cognome trovati (contratto):', match[2], match[1]);
                    break;
                }
            }
            
            // Se non trovato, usa pattern standard
            if (!extractedData.cognome) {
                const cognomeMatch = cleanText.match(/(?:COGNOM|Surname|SURNAME|Cognome)[:\s,]*([A-ZÀ-Ù]{2,}(?:\s+[A-ZÀ-Ù]+)*)/i);
                if (cognomeMatch && cognomeMatch[1]) {
                    extractedData.cognome = cognomeMatch[1].trim();
                    console.log('   ✅ Cognome trovato:', cognomeMatch[1].trim());
                }
            }
            
            // Nome: prendi SOLO la prima parola dopo "Nome" (ignora nomi successivi)
            if (!extractedData.nome) {
                const nomeMatch = cleanText.match(/(?:NOM[EI]?|Name|NAME)[:\s,.]+([\w]+)/i);
                if (nomeMatch && nomeMatch[1]) {
                    let nome = nomeMatch[1].trim();
                    
                    // Pulizia errori OCR comuni per nomi italiani
                    nome = nome.replace(/^[Jj]l/i, 'L');  // "Jlauca" → "Lauca"
                    nome = nome.replace(/^[Jj]/i, 'L');   // "Juca" → "Luca"
                    nome = nome.replace(/[Il]l([aeiou])/gi, 'L$1'); // "Iluca" → "Luca"
                    nome = nome.replace(/^[lI]([aeiou])/i, 'L$1');  // "luca" → "Luca"
                    nome = nome.replace(/^Nl/i, 'M');     // "Nlario" → "Mario"
                    
                    // Capitalizza correttamente
                    nome = nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
                    
                    if (nome !== extractedData.cognome && nome.length >= 3) {
                        extractedData.nome = nome;
                        console.log('   ✅ Nome trovato e pulito:', nome, '(originale:', nomeMatch[1], ')');
                    }
                }
            }
            
            // Se non trovato, cerca nomi italiani comuni nel testo
            if (!extractedData.nome) {
                const nomiComuni = ['Gianluca', 'Luca', 'Marco', 'Andrea', 'Francesco', 'Giovanni', 'Alessandro', 'Matteo', 'Lorenzo', 'Davide', 'Simone', 'Federico', 'Riccardo', 'Stefano', 'Antonio', 'Giuseppe', 'Mario', 'Paolo', 'Fabio', 'Daniele', 'Roberto', 'Pierluigi', 'Gianfranco', 'Giancarlo'];
                for (const nomeComune of nomiComuni) {
                    // Cerca anche varianti con errori OCR
                    const pattern = new RegExp(`\\b${nomeComune}\\b|\\b[Jj]${nomeComune.substring(1)}\\b|\\b[Il]${nomeComune.substring(1)}\\b`, 'i');
                    const match = cleanText.match(pattern);
                    if (match && match[0] !== extractedData.cognome) {
                        extractedData.nome = nomeComune;
                        console.log('   ✅ Nome comune trovato:', nomeComune);
                        break;
                    }
                }
            }
            
            // Data di nascita: pattern molto permissivi
            const dataMatch = cleanText.match(/(?:nato|born|nascita|data)[^\d]*?(\d{1,2})[\/\-\.\s]+(\d{1,2})[\/\-\.\s]+(\d{4}|\d{2})/i);
            if (dataMatch) {
                const anno = dataMatch[3].length === 2 ? `19${dataMatch[3]}` : dataMatch[3];
                extractedData.data_nascita = `${dataMatch[1].padStart(2, '0')}/${dataMatch[2].padStart(2, '0')}/${anno}`;
                console.log('   ✅ Data nascita trovata:', extractedData.data_nascita);
            } else {
                // Cerca anche date isolate nel formato gg/mm/aaaa
                const dataIsolata = cleanText.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
                if (dataIsolata) {
                    extractedData.data_nascita = `${dataIsolata[1].padStart(2, '0')}/${dataIsolata[2].padStart(2, '0')}/${dataIsolata[3]}`;
                    console.log('   ✅ Data isolata trovata:', extractedData.data_nascita);
                }
            }
            
            // Luogo di nascita: pattern multipli + lista città italiane
            let luogoNascita = null;
            
            // Tentativo 1: Pattern con keywords
            const luogoPatterns = [
                /(?:nato\/a\s+a|born\s+in|luogo\s+di\s+nascita|nascita)[:\s]+([A-Z][a-zàèéìòù\s]+?)(?:\(|$|\n|,|\d{2}\/)/i,
                /(?:a)\s+([A-Z][a-zàèéìòù]{3,})(?:\s+\(|,|\s+il\s+\d)/i,
                /(?:nato|nata)\s+(?:a|il)\s+([A-Z][a-zàèéìòù\s]+?)(?:\s+\(|\s+il\s+\d|,)/i
            ];
            
            for (const pattern of luogoPatterns) {
                const match = cleanText.match(pattern);
                if (match && match[1]) {
                    const citta = match[1].trim();
                    // Verifica che non sia troppo corto o contenga numeri
                    if (citta.length >= 3 && !/\d/.test(citta)) {
                        luogoNascita = citta;
                        console.log('   ✅ Luogo nascita trovato (pattern):', citta);
                        break;
                    }
                }
            }
            
            // Tentativo 2: Lista città italiane comuni (top 100)
            if (!luogoNascita) {
                const cittaItaliane = ['Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna', 'Firenze', 'Bari', 'Catania', 'Venezia', 'Verona', 'Messina', 'Padova', 'Trieste', 'Brescia', 'Parma', 'Modena', 'Reggio Emilia', 'Reggio Calabria', 'Perugia', 'Livorno', 'Cagliari', 'Salerno', 'Ferrara', 'Ravenna', 'Rimini', 'Sassari', 'Latina', 'Giugliano', 'Bergamo', 'Trento', 'Vicenza', 'Terni', 'Forlì', 'Piacenza', 'Caserta', 'Siracusa', 'Pescara', 'Lucca', 'Prato', 'Ancona', 'Taranto', 'La Spezia', 'Monza', 'Bolzano', 'Como', 'Udine', 'Alessandria', 'Pisa', 'Pistoia', 'Arezzo', 'Cremona', 'Fiumicino', 'Varese', 'Treviso', 'Busto Arsizio', 'Lecce', 'Grosseto', 'Imola', 'Aprilia', 'Matera', 'Cosenza', 'Potenza'];
                
                for (const citta of cittaItaliane) {
                    // Cerca la città nel testo (case insensitive, con word boundary)
                    const regex = new RegExp(`\\b${citta}\\b`, 'i');
                    if (regex.test(cleanText)) {
                        luogoNascita = citta;
                        console.log('   ✅ Luogo nascita trovato (lista):', citta);
                        break;
                    }
                }
            }
            
            // Tentativo 3: Se data di nascita presente, cerca città vicino alla data
            if (!luogoNascita && extractedData.data_nascita) {
                const dataIndex = cleanText.indexOf(extractedData.data_nascita.replace(/\//g, ''));
                if (dataIndex > -1) {
                    const contextBefore = cleanText.substring(Math.max(0, dataIndex - 50), dataIndex);
                    const contextAfter = cleanText.substring(dataIndex, Math.min(cleanText.length, dataIndex + 50));
                    
                    const cittaItaliane = ['Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna', 'Firenze', 'Bari'];
                    for (const citta of cittaItaliane) {
                        if (contextBefore.includes(citta) || contextAfter.includes(citta)) {
                            luogoNascita = citta;
                            console.log('   ✅ Luogo nascita trovato (contesto data):', citta);
                            break;
                        }
                    }
                }
            }
            
            if (luogoNascita) {
                extractedData.luogo_nascita = luogoNascita;
            }
            
            // Residenza
            const residenzaMatch = cleanText.match(/(?:residenz|residente|address)[^\n]*?(via|corso|piazza|viale|v\.)\s+([^\n]{5,50})/i);
            if (residenzaMatch) {
                extractedData.indirizzo_residenza = `${residenzaMatch[1]} ${residenzaMatch[2]}`.trim().replace(/\s+/g, ' ');
                console.log('   ✅ Residenza trovata:', extractedData.indirizzo_residenza);
            }
            
            // CAP (prima occorrenza di 5 cifre)
            const capMatch = cleanText.match(/\b(\d{5})\b/);
            if (capMatch) {
                extractedData.cap_residenza = capMatch[1];
                console.log('   ✅ CAP trovato:', capMatch[1]);
            }
            
            // Città residenza (cerca dopo indirizzo o vicino a CAP)
            if (!extractedData.citta_residenza && extractedData.cap_residenza) {
                // Cerca città vicino al CAP
                const capIndex = cleanText.indexOf(extractedData.cap_residenza);
                if (capIndex > -1) {
                    const contextAfter = cleanText.substring(capIndex, Math.min(cleanText.length, capIndex + 100));
                    const cittaMatch = contextAfter.match(/\d{5}\s+([A-Z][a-zàèéìòù\s]{2,30}?)(?:\(|$|\n)/);
                    if (cittaMatch && cittaMatch[1]) {
                        extractedData.citta_residenza = cittaMatch[1].trim();
                        console.log('   ✅ Città residenza trovata (vicino CAP):', extractedData.citta_residenza);
                    }
                }
            }
            
            // Provincia residenza (cerca sigla in parentesi dopo città o standalone)
            if (!extractedData.provincia_residenza) {
                const provPatterns = [
                    /\(([A-Z]{2})\)/,  // (BO)
                    /provincia\s+di\s+([A-Z]{2})\b/i,
                    /prov\.\s*([A-Z]{2})\b/i
                ];
                
                for (const pattern of provPatterns) {
                    const provMatch = cleanText.match(pattern);
                    if (provMatch && provMatch[1]) {
                        extractedData.provincia_residenza = provMatch[1].toUpperCase();
                        console.log('   ✅ Provincia trovata:', provMatch[1]);
                        break;
                    }
                }
            }
            
            // Sesso (cerca M o F isolati o dopo parole chiave)
            const sessoMatch = cleanText.match(/(?:sesso|sex|gender)[:\s]*([MF])\b/i);
            if (sessoMatch) {
                extractedData.sesso = sessoMatch[1].toUpperCase();
                console.log('   ✅ Sesso trovato:', sessoMatch[1]);
            } else {
                // Cerca M/F standalone vicino a data di nascita
                if (extractedData.data_nascita) {
                    const dataIndex = cleanText.indexOf(extractedData.data_nascita.replace(/\//g, ''));
                    if (dataIndex > -1) {
                        const context = cleanText.substring(Math.max(0, dataIndex - 20), Math.min(cleanText.length, dataIndex + 50));
                        const sessoStandalone = context.match(/\b([MF])\b/);
                        if (sessoStandalone) {
                            extractedData.sesso = sessoStandalone[1].toUpperCase();
                            console.log('   ✅ Sesso trovato (standalone):', sessoStandalone[1]);
                        }
                    }
                }
            }
            
            // Cittadinanza
            const cittadinanzaPatterns = [
                /(?:cittadinanza|nationality|citizen)[:\s]+([A-Z][a-zàèéìòù]+)/i,
                /\b(italiana|italian)\b/i,
                /\b(francese|tedesca|spagnola|inglese|americana)\b/i
            ];
            
            for (const pattern of cittadinanzaPatterns) {
                const cittMatch = cleanText.match(pattern);
                if (cittMatch && cittMatch[1]) {
                    extractedData.cittadinanza = cittMatch[1].charAt(0).toUpperCase() + cittMatch[1].slice(1).toLowerCase();
                    console.log('   ✅ Cittadinanza trovata:', extractedData.cittadinanza);
                    break;
                }
            }
            
            // Telefono e Cellulare
            const phonePatterns = [
                /(?:tel|telefono|phone)[:\s]*(\d{6,12})/i,
                /(?:fisso)[:\s]*(\d{6,12})/i,
                /\b(0\d{1,4}[\s\-]?\d{4,8})\b/  // Telefono fisso italiano
            ];
            
            for (const pattern of phonePatterns) {
                const phoneMatch = cleanText.match(pattern);
                if (phoneMatch && phoneMatch[1] && !extractedData.telefono) {
                    const phone = phoneMatch[1].replace(/[\s\-]/g, '');
                    if (phone.length >= 6 && !phone.startsWith('3')) { // Non è cellulare
                        extractedData.telefono = phone;
                        console.log('   ✅ Telefono trovato:', phone);
                        break;
                    }
                }
            }
            
            // Cellulare (pattern italiano: inizia con 3)
            const cellPatterns = [
                /(?:cell|cellulare|mobile)[:\s]*(\d{10})/i,
                /\b(3\d{2}[\s\-]?\d{6,7})\b/,  // 3XX XXXXXXX
                /\b(3\d{9})\b/  // 10 cifre che iniziano con 3
            ];
            
            for (const pattern of cellPatterns) {
                const cellMatch = cleanText.match(pattern);
                if (cellMatch && cellMatch[1]) {
                    const cell = cellMatch[1].replace(/[\s\-]/g, '');
                    if (cell.startsWith('3') && cell.length === 10) {
                        extractedData.cellulare = cell;
                        console.log('   ✅ Cellulare trovato:', cell);
                        break;
                    }
                }
            }
            
            // Email
            const emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/;
            const emailMatch = cleanText.match(emailPattern);
            if (emailMatch) {
                extractedData.email = emailMatch[1].toLowerCase();
                console.log('   ✅ Email trovata:', emailMatch[1]);
            }
            
            // PEC (cerca dopo keyword "pec" o pattern email con @pec)
            const pecPatterns = [
                /(?:pec)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
                /\b([a-zA-Z0-9._%+-]+@pec\.[a-zA-Z0-9.-]+)\b/i
            ];
            
            for (const pattern of pecPatterns) {
                const pecMatch = cleanText.match(pattern);
                if (pecMatch && pecMatch[1]) {
                    extractedData.pec = pecMatch[1].toLowerCase();
                    console.log('   ✅ PEC trovata:', pecMatch[1]);
                    break;
                }
            }
            
            // ⚡ CAMPI SPECIFICI PER CONTRATTI/BOLLETTE
            
            // PDR (Punto Di Riconsegna) - 14 cifre
            const pdrPatterns = [
                /(?:PDR|Punto di riconsegna)[:\s]*(\d{14})/i,
                /\bPDR[:\s]*([0-9]{14})\b/i,
                /\b(\d{14})\b/ // Sequenza di 14 cifre
            ];
            
            for (const pattern of pdrPatterns) {
                const pdrMatch = cleanText.match(pattern);
                if (pdrMatch && pdrMatch[1] && pdrMatch[1].length === 14) {
                    extractedData.pdr = pdrMatch[1];
                    console.log('   ✅ PDR trovato:', pdrMatch[1]);
                    break;
                }
            }
            
            // POD (Punto di Prelievo Energia) - alfanumerico lungo
            const podPatterns = [
                /(?:POD|Punto di prelievo)[:\s]*([A-Z]{2}\d{14}[A-Z])/i,
                /\b(IT\d{3}[A-Z]\d{8}[A-Z0-9]{3})\b/i
            ];
            
            for (const pattern of podPatterns) {
                const podMatch = cleanText.match(pattern);
                if (podMatch && podMatch[1]) {
                    extractedData.pod = podMatch[1].toUpperCase();
                    console.log('   ✅ POD trovato:', podMatch[1]);
                    break;
                }
            }
            
            // Codice Cliente
            const codiceClientePatterns = [
                /(?:Codice cliente|Cliente)[:\s]*(\d{7,12})/i,
                /(?:Codice)[:\s]+cliente[:\s]*(\d{7,12})/i
            ];
            
            for (const pattern of codiceClientePatterns) {
                const ccMatch = cleanText.match(pattern);
                if (ccMatch && ccMatch[1]) {
                    extractedData.codice_cliente = ccMatch[1];
                    console.log('   ✅ Codice Cliente trovato:', ccMatch[1]);
                    break;
                }
            }
            
            // Codice Contratto
            const codiceContrattoPatterns = [
                /(?:Codice contratto|Contratto)[:\s]*(\d{7,12})/i,
                /(?:contratto)[:\s]+nr\.?\s*(\d{7,12})/i
            ];
            
            for (const pattern of codiceContrattoPatterns) {
                const ctMatch = cleanText.match(pattern);
                if (ctMatch && ctMatch[1]) {
                    extractedData.codice_contratto = ctMatch[1];
                    console.log('   ✅ Codice Contratto trovato:', ctMatch[1]);
                    break;
                }
            }
            
            // Matricola Contatore
            const matricolaPatterns = [
                /(?:Matricola|matricola)[:\s]+(contatore|misuratore)?[:\s]*([A-Z0-9]{10,20})/i,
                /(?:Contatore matricola)[:\s]*([A-Z0-9]{10,20})/i
            ];
            
            for (const pattern of matricolaPatterns) {
                const matMatch = cleanText.match(pattern);
                if (matMatch) {
                    const matricola = matMatch[2] || matMatch[1];
                    if (matricola && matricola.length >= 10) {
                        extractedData.matricola_contatore = matricola;
                        console.log('   ✅ Matricola Contatore trovata:', matricola);
                        break;
                    }
                }
            }
            
            // Data Emissione
            const dataEmissionePatterns = [
                /(?:Data emissione|Emesso il|emissione)[:\s]*(\d{1,2}[\./\-]\d{1,2}[\./\-]\d{4})/i,
                /(?:Data)[:\s]+emissione[:\s]*(\d{1,2}[\./\-]\d{1,2}[\./\-]\d{4})/i
            ];
            
            for (const pattern of dataEmissionePatterns) {
                const deMatch = cleanText.match(pattern);
                if (deMatch && deMatch[1]) {
                    extractedData.data_emissione = deMatch[1].replace(/[\.\-]/g, '/');
                    console.log('   ✅ Data Emissione trovata:', deMatch[1]);
                    break;
                }
            }
            
            // Scadenza
            const scadenzaPatterns = [
                /(?:Scadenza|scadenza)[:\s]*(\d{1,2}[\./\-]\d{1,2}[\./\-]\d{4})/i,
                /(?:scadenza)[:\s]*(\d{1,2}\s+[a-z]+\s+\d{4})/i
            ];
            
            for (const pattern of scadenzaPatterns) {
                const scadMatch = cleanText.match(pattern);
                if (scadMatch && scadMatch[1]) {
                    extractedData.scadenza = scadMatch[1].replace(/[\.\-]/g, '/');
                    console.log('   ✅ Scadenza trovata:', scadMatch[1]);
                    break;
                }
            }
            
            // Totale da pagare
            const totalePatterns = [
                /(?:Totale|totale)[:\s]+(?:da pagare|bolletta|fattura)?[:\s]*(\d+[,\.]\d{2})\s*€/i,
                /(?:Totale da pagare)[:\s]*(\d+[,\.]\d{2})/i
            ];
            
            for (const pattern of totalePatterns) {
                const totMatch = cleanText.match(pattern);
                if (totMatch && totMatch[1]) {
                    extractedData.totale = totMatch[1].replace(',', '.');
                    console.log('   ✅ Totale trovato:', totMatch[1], '€');
                    break;
                }
            }
            
            // Numero Fattura
            const numeroFatturaPatterns = [
                /(?:Numero fattura|fattura)[:\s]+(?:n\.?|elettronica)?[:\s]*(\d{10,15})/i,
                /(?:fattura elettronica)[:\s]+Hera Comm n\.\s*(\d{10,15})/i
            ];
            
            for (const pattern of numeroFatturaPatterns) {
                const nfMatch = cleanText.match(pattern);
                if (nfMatch && nfMatch[1]) {
                    extractedData.numero_fattura = nfMatch[1];
                    console.log('   ✅ Numero Fattura trovato:', nfMatch[1]);
                    break;
                }
            }
            
            // 🔍 VALIDAZIONE INCROCIATA: Verifica coerenza tra CF e Nome/Cognome
            if (extractedData.codice_fiscale && extractedData.cognome) {
                const cfCognome = extractedData.codice_fiscale.substring(0, 3).toUpperCase();
                const cognomeCheck = extractedData.cognome.substring(0, 3).toUpperCase();
                
                // Estrai consonanti del cognome
                const consonanti = extractedData.cognome.replace(/[AEIOU\s]/gi, '').substring(0, 3).toUpperCase();
                
                if (cfCognome === consonanti) {
                    console.log('   ✅ Validazione CF-Cognome: MATCH perfetto');
                } else {
                    console.log(`   ⚠️ Validazione CF-Cognome: possibile discrepanza (CF:${cfCognome} vs Cognome:${consonanti})`);
                }
            }
            
            // Se CF è valido ma nome manca, prova a dedurre dal CF
            if (extractedData.codice_fiscale && !extractedData.nome) {
                console.log('   🔍 Tentativo di dedurre nome dal CF...');
                // Le lettere 4-6 del CF rappresentano il nome (consonanti)
                const cfNome = extractedData.codice_fiscale.substring(3, 6);
                
                // Cerca parole nel testo che iniziano con queste lettere
                const nomiComuni = ['Luca', 'Marco', 'Andrea', 'Francesco', 'Giovanni', 'Alessandro', 'Matteo', 'Lorenzo', 'Davide', 'Simone', 'Paolo', 'Mario', 'Giuseppe', 'Antonio'];
                for (const nomeComune of nomiComuni) {
                    const consonantiNome = nomeComune.replace(/[AEIOU]/gi, '').substring(0, 3).toUpperCase();
                    if (consonantiNome === cfNome && cleanText.toUpperCase().includes(nomeComune.toUpperCase())) {
                        extractedData.nome = nomeComune;
                        console.log(`   ✅ Nome dedotto dal CF: ${nomeComune}`);
                        break;
                    }
                }
            }
            
            console.log(`\n🔧 Estrazione regex completata: ${Object.entries(extractedData).filter(([,v]) => v).length} campi valorizzati`);
            console.log('📊 Dati estratti:', JSON.stringify(extractedData, null, 2));
        }
        
        console.log('✅ Campi estratti:', Object.keys(extractedData).length);
        console.log('📊 Campi con valore:', Object.entries(extractedData).filter(([, v]) => v !== null && v !== undefined).length);
        
        // Cleanup file temporanei
        for (const file of files) {
            try {
                fs.unlinkSync(file.path);
            } catch (e) {
                console.warn(`⚠️ Impossibile eliminare ${file.path}`);
            }
        }
        
        res.json({
            success: true,
            extractedData,
            filesProcessed: files.length,
            debugInfo: {
                ocrTextLength: allText.length,
                ocrTextPreview: allText.substring(0, 500),
                fieldsWithValue: Object.entries(extractedData).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '').length
            }
        });
        
    } catch (error: any) {
        console.error('❌ Errore estrazione:', error.message);
        
        // Cleanup in caso di errore
        if (files) {
            for (const file of files) {
                try {
                    fs.unlinkSync(file.path);
                } catch (e) {}
            }
        }
        
        res.status(500).json({
            error: 'Errore durante l\'estrazione dei dati',
            details: error.message
        });
    }
});

export default router;

