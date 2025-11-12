/**
 * API ENDPOINTS - Generazione e Download PDF Contratti
 */

import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';

const router = express.Router();

// Applica autenticazione
router.use(authenticate);

/**
 * Sanitizza testo rimuovendo emoji e caratteri speciali non supportati da WinAnsi
 */
function sanitizeText(text: string): string {
    if (!text) return '';
    // Rimuove emoji e caratteri non ASCII base (mantiene solo caratteri stampabili ASCII estesi)
    return String(text).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
                       .replace(/[^\x20-\x7E\xA0-\xFF]/g, ''); // Mantiene solo ASCII + Latin-1
}

/**
 * FALLBACK MAPPING INTELLIGENTE
 * Mappa automaticamente i campi basandosi sulla similarità dei nomi
 */
function getFallbackMapping(campiPDF: any, datiCompilati: any): Record<string, string> {
    const mapping: Record<string, string> = {};
    const campiPDFNames = Object.keys(campiPDF);
    
    // Helper: trova il campo PDF più simile CON CONTROLLO DEL TIPO E LUNGHEZZA
    const findBestMatch = (searchTerms: string[], dataValue: any): string | null => {
        const valueLength = String(dataValue).length;
        
        for (const term of searchTerms) {
            const termLower = term.toLowerCase();
            
            // Cerca prima una corrispondenza esatta (case-insensitive)
            for (const pdfField of campiPDFNames) {
                const fieldInfo = campiPDF[pdfField];
                
                // Salta se è checkbox o radio
                if (fieldInfo.tipo === 'PDFCheckBox' || fieldInfo.tipo === 'PDFRadioGroup') {
                    continue;
                }
                
                // Salta se il campo è troppo corto per il valore
                if (fieldInfo.maxLength && valueLength > fieldInfo.maxLength) {
                    continue;
                }
                
                if (pdfField.toLowerCase() === termLower) {
                    return pdfField;
                }
            }
            
            // Poi cerca una corrispondenza parziale
            for (const pdfField of campiPDFNames) {
                const fieldInfo = campiPDF[pdfField];
                
                // Salta se è checkbox o radio
                if (fieldInfo.tipo === 'PDFCheckBox' || fieldInfo.tipo === 'PDFRadioGroup') {
                    continue;
                }
                
                // Salta se il campo è troppo corto per il valore
                if (fieldInfo.maxLength && valueLength > fieldInfo.maxLength) {
                    continue;
                }
                
                if (pdfField.toLowerCase().includes(termLower) || termLower.includes(pdfField.toLowerCase())) {
                    return pdfField;
                }
            }
        }
        return null;
    };
    
    // Definizione mapping basato sui campi comuni nei contratti ALPERIA
    const mappingRules: Record<string, string[]> = {
        // Dati anagrafici
        'nome': ['Nome', 'nome', 'name', 'nome cliente'],
        'cognome': ['Cognome', 'cognome', 'surname', 'last name'],
        'codice_fiscale': ['Codice Fiscale', 'Codice fiscale', 'CF', 'CodiceFiscale', 'codice fiscale'],
        'data_nascita': ['Data di nascita', 'Nato il', 'DataNascita', 'data nascita', 'birth date', 'nato/a il'],
        'comune_nascita': ['Comune di nascita', 'Luogo di nascita', 'nato a', 'birth place', 'nato/a a'],
        'luogo_nascita': ['Luogo di nascita', 'Comune di nascita', 'nato a', 'birth place', 'nato/a a'],
        'provincia_nascita': ['Provincia di nascita', 'Prov nascita', 'Prov. nascita', 'prov'],
        'sesso': ['Sesso', 'M/F', 'genere'],
        
        // Dati azienda
        'ragione_sociale': ['Ragione Sociale', 'RagioneSociale', 'Denominazione', 'Nome azienda'],
        'partita_iva': ['Partita IVA', 'P.IVA', 'PIVA', 'PartitaIVA', 'P. IVA'],
        
        // Residenza
        'indirizzo_residenza': ['Indirizzo di residenza', 'Indirizzo residenza', 'Via residenza', 'indirizzo'],
        'civico_residenza': ['N', 'Civico', 'n.', 'numero civico', 'num.'],
        'cap_residenza': ['CAP', 'cap', 'C.A.P.', 'codice postale'],
        'comune_residenza': ['Comune', 'comune', 'città', 'city'],
        'provincia_residenza': ['Prov', 'Provincia', 'prov', 'prov.'],
        'scala_residenza': ['Scala', 'scala', 'sc.'],
        'interno_residenza': ['Interno', 'interno', 'int', 'int.'],
        
        // Fornitura
        'indirizzo_fornitura': ['Indirizzo', 'Via', 'indirizzo fornitura', 'luogo fornitura', 'via fornitura'],
        'civico_fornitura': ['N_2', 'Civico_2', 'n._2', 'numero_2'],
        'cap_fornitura': ['CAP_2', 'cap_2', 'C.A.P._2'],
        'comune_fornitura': ['Comune_2', 'comune_2', 'città_2', 'city_2'],
        'provincia_fornitura': ['Prov_2', 'Provincia_2', 'prov_2', 'prov._2'],
        'scala_fornitura': ['Scala_2', 'scala_2', 'sc._2'],
        'interno_fornitura': ['Interno_2', 'interno_2', 'int_2', 'int._2'],
        
        // Contatti
        'telefono': ['Telefono', 'Tel', 'telefono', 'tel.', 'phone', 'telefono fisso'],
        'cellulare': ['Cellulare', 'Cell', 'Mobile', 'cell.', 'cell', 'mobile'],
        'email': ['Email', 'E-mail', 'email', 'posta elettronica', 'e-mail', 'Email per invio fatture e documentazione'],
        'pec': ['PEC', 'pec', 'P.E.C.', 'posta certificata'],
        
        // Pagamento
        'iban': ['IBAN', 'Codice IBAN', 'conto corrente', 'iban bancario', 'c/c', 'C/C'],
        'intestatario_conto': ['Intestatario', 'Intestatario conto', 'Titolare conto', 'titolare', 'intestatario c/c', 'Codice Fiscale  Partita IVA del Titolare del Conto Corrente'],
        'modalita_pagamento': ['Modalità pagamento', 'Modalita di pagamento', 'Pagamento', 'modalita', 'metodo pagamento'],
        'banca': ['Banca', 'istituto di credito', 'nome banca'],
        
        // Luce
        'pod': ['Codice POD', 'POD', 'pod', 'punto prelievo'],  // Gestito separatamente in POD3+POD7
        'consumo_annuo_luce': ['Consumo annuo kWh', 'Consumo annuo (kWh)', 'Consumo annuo', 'consumo', 'consumo luce'],
        'potenza_impegnata': ['Potenza disponibile kW', 'Potenza disponibile', 'Potenza impegnata', 'kW', 'potenza', 'Potenza disponibile kW_2'],
        'tensione_fornitura': ['Tensione di fornitura', 'Tensione', 'monofase', 'trifase', 'tipo tensione'],
        'uso_luce': ['Tipologia uso', 'Tipo fornitura', 'Uso energia', 'Uso', 'tipo uso'],
        'mercato_luce': ['Tipo mercato', 'Mercato', 'mercato', 'libero', 'salvaguardia'],
        'prezzo_energia': ['Prezzo energia', 'Prezzo kWh', 'tariffa luce', 'costo energia'],
        'fornitore_uscente_luce': ['Fornitore Uscente', 'Fornitore precedente', 'attuale fornitore', 'fornitore attuale'],
        'tipo_richiesta_luce': ['Tipo Richiesta', 'Tipo di richiesta', 'Richiesta'],
        'data_attivazione_luce': ['Data Attivazione', 'Data inizio fornitura', 'attivazione prevista'],
        
        // Gas
        'pdr': ['Codice PDR', 'PDR', 'pdr', 'punto riconsegna'],  // Gestito separatamente
        'consumo_annuo_gas': ['Consumo annuo Smc', 'Consumo gas', 'smc', 'consumo annuo smc', 'Consumo annuo smc'],
        'matricola_contatore_gas': ['Matricola', 'matricola', 'contatore', 'matricola contatore', 'num. contatore'],
        'prezzo_gas': ['Prezzo gas', 'Prezzo Smc', 'tariffa gas', 'costo gas'],
        'remi': ['REMI', 'remi', 'codice remi', 'punto remi'],
        'fornitore_uscente_gas': ['Fornitore Uscente', 'Fornitore precedente gas', 'fornitore gas'],
        'tipo_richiesta_gas': ['Tipo Richiesta', 'Tipo di richiesta', 'Richiesta'],
        'data_attivazione_gas': ['Data Attivazione', 'Data inizio fornitura', 'attivazione prevista'],
        
        // Documento identità
        'tipo_documento': ['Documento d\'identità', 'Tipo documento', 'documento', 'doc.'],
        'numero_documento': ['Numero documento', 'N. documento', 'num. documento'],
        'rilasciato_da': ['Rilasciato da', 'Rilascio', 'emesso da', 'ente rilascio'],
        'data_rilascio': ['Data rilascio', 'Rilasciato il', 'emesso il'],
        'data_scadenza_documento': ['Data scadenza', 'Valido fino', 'scadenza documento'],
        
        // Note e altro
        'note': ['Note aggiuntive', 'Note', 'Annotazioni', 'Osservazioni', 'Commenti', 'note'],
        'data_firma': ['Data firma', 'Data sottoscrizione', 'Firmato il', 'data', 'DATA'],
        'luogo_firma': ['Luogo firma', 'Sottoscritto a', 'Firmato a', 'luogo'],
        
        // Agente
        'agente_nome': ['Agente', 'Nome agente', 'agente', 'consulente', 'venditore'],
        'agenzia': ['Agenzia', 'agenzia', 'punto vendita', 'filiale'],
        'codice_agente': ['Codice agente', 'ID agente', 'matricola agente'],
        
        // Fornitore/Offerta
        'nome_offerta': ['Nome Offerta sottoscritta', 'Offerta', 'piano tariffario', 'nome offerta'],
        'fornitore': ['Fornitore', 'nome fornitore', 'operatore'],
        'codice_offerta': ['Codice offerta', 'ID offerta']
    };
    
    // Applica le regole di mapping CON CONTROLLO LUNGHEZZA
    Object.entries(mappingRules).forEach(([dataKey, searchTerms]) => {
        const dataValue = datiCompilati[dataKey];
        if (dataValue) {
            const bestMatch = findBestMatch(searchTerms, dataValue);
            if (bestMatch) {
                mapping[dataKey] = bestMatch;
                console.log(`   ✓ "${dataKey}" → "${bestMatch}" (${String(dataValue).length} caratteri)`);
            } else {
                console.log(`   ✗ "${dataKey}": nessun campo adatto trovato (valore troppo lungo o tipo incompatibile)`);
            }
        }
    });
    
    console.log(`📊 Fallback mapping generato: ${Object.keys(mapping).length} associazioni`);
    return mapping;
}

/**
 * USA L'AI PER COMPILARE DIRETTAMENTE IL PDF
 * L'AI riceve i campi PDF + i dati e decide autonomamente dove inserire ogni valore
 */
async function aiCompilaPDF(campiPDF: any, datiCompilati: any): Promise<Record<string, string>> {
    try {
        console.log('\n🤖 === COMPILAZIONE PDF CON AI ===');
        console.log(`📄 Campi PDF disponibili: ${Object.keys(campiPDF).length}`);
        console.log(`📊 Dati da inserire: ${Object.keys(datiCompilati).length}`);
        
        // Lista campi PDF con info DETTAGLIATE sul tipo
        const campiPDFList = Object.entries(campiPDF)
            .map(([nome, info]: any) => {
                const tipo = info.tipo || 'PDFTextField';
                const maxLen = info.maxLength ? ` (max ${info.maxLength})` : '';
                
                // Identifica il tipo di campo
                let tipoDescrizione = '';
                if (tipo === 'PDFTextField') {
                    tipoDescrizione = '[TEXT]';
                } else if (tipo === 'PDFCheckBox') {
                    tipoDescrizione = '[CHECKBOX]';
                } else if (tipo === 'PDFRadioGroup') {
                    tipoDescrizione = '[RADIO]';
                }
                
                return `${tipoDescrizione} "${nome}"${maxLen}`;
            })
            .join('\n');
        
        // Lista dati da inserire
        const datiList = Object.entries(datiCompilati)
            .filter(([_, val]) => val)
            .map(([key, val]) => `- "${key}": "${String(val).substring(0, 100)}"`)
            .join('\n');
        
        const prompt = `Sei un AI esperto nella compilazione di moduli PDF per contratti energia.

**CAMPI DISPONIBILI NEL PDF:**
${campiPDFList}

**DATI DA INSERIRE:**
${datiList}

**COMPITO:** Analizza i nomi e TIPI dei campi PDF e decidi dove inserire ogni dato.

**REGOLE FONDAMENTALI:**

1. **TIPI DI CAMPO:**
   - [TEXT] = Campo di testo libero → inserisci valori come nomi, indirizzi, numeri
   - [CHECKBOX] = Casella da selezionare → NON mappare (gestito automaticamente)
   - [RADIO] = Opzioni multiple → NON mappare (gestito automaticamente)

2. **PRIORITÀ MASSIMA: Rispetta maxLength!**
   - NON mappare "iban" (24 caratteri) su campi con max 4 caratteri
   - NON mappare "data_nascita" su campo "N" (max 4)
   - Cerca campi con maxLength adeguato al valore

3. **SEMANTICA INTELLIGENTE:**
   - "nome" → cerca "Nome", "name", "cliente"
   - "cognome" → cerca "Cognome", "surname"
   - "codice_fiscale" → cerca "Codice Fiscale", "CF", "CodiceFiscale"
   - "data_nascita" → cerca "Data di nascita", "nato il", "birth"
   - "comune_nascita" / "luogo_nascita" → cerca "Comune di nascita", "luogo", "nato a"
   - "indirizzo_residenza" → cerca "Indirizzo di residenza", "Via residenza"
   - "indirizzo_fornitura" → cerca "Indirizzo" (senza "residenza")
   - "telefono" → cerca "Telefono", "Tel", "phone"
   - "cellulare" → cerca "Cellulare", "Cell", "Mobile"
   - "email" → cerca "Email", "E-mail", "posta"

4. **SUFFISSI "_2" = FORNITURA:**
   - Campi con "_2" sono per l'indirizzo di fornitura
   - "N_2" = civico fornitura, "CAP_2" = CAP fornitura, ecc.

5. **POD/PDR:**
   - POD lungo 14 caratteri → dividi in "POD3" (3 car) + "POD7" (8 car)
   - PDR similmente

6. **ESCLUSIONI:**
   - NON mappare campi checkbox/radio (es: "Switch", "Voltura", "Subentro")
   - NON mappare su campi troppo corti se il valore è lungo

**OUTPUT:** JSON con SOLO associazioni campo_dato → campo_pdf_TEXT

Esempio CORRETTO:
{
  "nome": "Nome",
  "cognome": "Cognome",
  "codice_fiscale": "Codice fiscale",
  "indirizzo_residenza": "Indirizzo di residenza",
  "civico_residenza": "N",
  "cap_residenza": "CAP",
  "indirizzo_fornitura": "Indirizzo",
  "civico_fornitura": "N_2",
  "cap_fornitura": "CAP_2"
}

Restituisci SOLO il JSON (no testo aggiuntivo):`;

        console.log('⏳ Invio richiesta a Ollama...');
        
        const response = await axios.post('http://185.31.67.249/api/generate', {
            model: 'llama3:8b',
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.2,
                num_predict: 3000
            }
        }, {
            timeout: 180000  // 3 minuti
        });
        
        const aiResponse = response.data.response || '';
        console.log('✅ Risposta ricevuta', `(${aiResponse.length} caratteri)`);
        
        // Estrai JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('❌ AI non ha restituito JSON valido');
            console.log('Risposta:', aiResponse.substring(0, 300));
            return {};
        }
        
        const mapping = JSON.parse(jsonMatch[0]);
        console.log(`✅ AI ha mappato ${Object.keys(mapping).length} campi`);
        
        return mapping;
        
    } catch (error: any) {
        console.error('❌ Errore AI:', error.message);
        return {};
    }
}

/**
 * POST /api/contratti-pdf/generate/:id
 * Genera PDF compilato per un contratto
 */
router.post('/generate/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Recupera contratto completo + campi estratti dal template
        const contractResult = await pool.query(`
            SELECT 
                c.*,
                ct.file_path as template_path,
                ct.nome as template_nome,
                ct.campi_estratti as template_campi_estratti,
                CASE 
                    WHEN c.cliente_tipo = 'privato' THEN cp.nome || ' ' || cp.cognome
                    WHEN c.cliente_tipo = 'azienda' THEN ca.ragione_sociale
                END as cliente_nome
            FROM contracts c
            LEFT JOIN contract_templates ct ON c.template_id = ct.id
            LEFT JOIN clienti_privati cp ON c.cliente_id = cp.id AND c.cliente_tipo = 'privato'
            LEFT JOIN clienti_aziende ca ON c.cliente_id = ca.id AND c.cliente_tipo = 'azienda'
            WHERE c.id = ?
        `, [id]);

        if ((!contractResult.rows || contractResult.rows.length === 0)) {
            return res.status(404).json({
                success: false,
                message: 'Contratto non trovato'
            });
        }

        const contract = contractResult.rows[0] as any;
        const datiCompilati = JSON.parse(contract.dati_compilati);

        // Carica template PDF
        const templatePath = contract.template_path;
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({
                success: false,
                message: 'Template PDF non trovato'
            });
        }

        const templateBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(templateBytes);
        
        // Ottieni il form per compilare i campi
        const form = pdfDoc.getForm();
        const pdfFields = form.getFields();
        
        // ✅ CARICA I CAMPI DEL PDF (estratti durante l'upload o live)
        let campiPDF: any = {};
        
        if (contract.template_campi_estratti) {
            try {
                const campiData = JSON.parse(contract.template_campi_estratti);
                campiPDF = campiData.campi_pdf || {};
            } catch (e) {}
        }
        
        // Se non ci sono campi, estraili ora
        if (Object.keys(campiPDF).length === 0) {
            pdfFields.forEach(field => {
                campiPDF[field.getName()] = {
                    tipo: field.constructor.name,
                    maxLength: field.constructor.name === 'PDFTextField' ? (field as any).getMaxLength?.() : null
                };
            });
        }
        
        // 🎯 PRIORITÀ 1: DIRECT MAPPING (usa nomi esatti dei campi PDF)
        console.log('\n🎯 Tentativo DIRECT MAPPING...');
        let fieldMapping: Record<string, string> = {};
        let directMappingCount = 0;
        
        Object.keys(datiCompilati).forEach(dataKey => {
            // Se il nome del campo esiste esattamente nel PDF, usalo direttamente
            if (campiPDF[dataKey]) {
                fieldMapping[dataKey] = dataKey;
                directMappingCount++;
                console.log(`   ✅ "${dataKey}" -> "${dataKey}" (direct match)`);
            }
        });
        
        console.log(`📊 Direct mapping: ${directMappingCount}/${Object.keys(datiCompilati).length} campi`);
        
        // 🤖 PRIORITÀ 2: USA L'AI per i campi non mappati
        if (directMappingCount < Object.keys(datiCompilati).length) {
            console.log('\n🤖 Uso AI per campi rimanenti...');
            const aiMapping = await aiCompilaPDF(campiPDF, datiCompilati);
            // Merge AI mapping con direct mapping (direct mapping ha priorità)
            fieldMapping = { ...aiMapping, ...fieldMapping };
        }
        
        // 🛡️ PRIORITÀ 3: FALLBACK MAPPING per campi ancora non mappati
        if (Object.keys(fieldMapping).length < Object.keys(datiCompilati).length) {
            console.log('\n⚠️ Uso fallback mapping per campi rimanenti...');
            const fallbackMapping = getFallbackMapping(campiPDF, datiCompilati);
            // Merge fallback con mappings esistenti (non sovrascrivere)
            Object.entries(fallbackMapping).forEach(([key, value]) => {
                if (!fieldMapping[key]) {
                    fieldMapping[key] = value;
                }
            });
        }
        
        // Compila i campi
        let campiCompilati = 0;
        const campiNonTrovati: string[] = [];
        
        console.log(`\n✍️ Compilazione PDF:`);
        console.log(`   📊 Mappings AI: ${Object.keys(fieldMapping).length}`);
        
        Object.entries(datiCompilati).forEach(([dataKey, dataValue]) => {
            if (!dataValue) {
                console.log(`⚠️ Campo "${dataKey}" vuoto, skip`);
                return;
            }
            
            // Gestione speciale per il POD (diviso in POD3 e POD7)
            // POD3: maxLength = 3, POD7: maxLength = 8
            if (dataKey === 'pod') {
                try {
                    const podValue = sanitizeText(String(dataValue));
                    const pod3Field = form.getTextField('POD3');
                    const pod7Field = form.getTextField('POD7');
                    
                    // POD massimo 11 caratteri: primi 3 in POD3, successivi 8 in POD7
                    if (podValue.length >= 3) {
                        pod3Field.setText(podValue.substring(0, 3));  // Primi 3 caratteri
                        if (podValue.length > 3) {
                            pod7Field.setText(podValue.substring(3, 11));  // Dal 4° all'11° carattere
                        }
                        console.log(`✅ "pod" -> POD3 (${podValue.substring(0, 3)}) + POD7 (${podValue.substring(3, 11)})`);
                    } else {
                        pod3Field.setText(podValue);
                        console.log(`✅ "pod" -> POD3: "${podValue}"`);
                    }
                    campiCompilati += 2;
                    // POD diviso in POD3+POD7
                    return;
                } catch (error: any) {
                    console.log(`❌ Errore compilazione POD: ${error.message}`);
                    campiNonTrovati.push('pod -> POD3+POD7');
                }
            }
            
            // Gestione PDR (gas) - simile al POD
            if (dataKey === 'pdr') {
                try {
                    const pdrValue = sanitizeText(String(dataValue));
                    // Cerca campi PDR nel PDF
                    const allFields = form.getFields();
                    const pdrFields = allFields.filter(f => f.getName().toLowerCase().includes('pdr'));
                    
                    if (pdrFields.length > 0) {
                        // Se ci sono campi specifici PDR, usali
                        const mainPDR = pdrFields[0];
                        if (mainPDR) {
                            const textField = form.getTextField(mainPDR.getName());
                            textField.setText(pdrValue.substring(0, 14)); // PDR max 14 caratteri
                            console.log(`✅ "pdr" -> "${mainPDR.getName()}": "${pdrValue.substring(0, 14)}"`);
                            campiCompilati++;
                        }
                    } else {
                        // Fallback: cerca "Codice PDR"
                        try {
                            const field = form.getTextField('Codice PDR');
                            field.setText(pdrValue.substring(0, 14));
                            console.log(`✅ "pdr" -> "Codice PDR": "${pdrValue.substring(0, 14)}"`);
                            campiCompilati++;
                        } catch (e) {
                            console.log(`⚠️ Campo PDR non trovato nel PDF`);
                        }
                    }
                    return;
                } catch (error: any) {
                    console.log(`❌ Errore compilazione PDR: ${error.message}`);
                    campiNonTrovati.push('pdr');
                }
            }
            
            // Gestione consumo luce - rimuovi unità di misura se presente
            if (dataKey === 'consumo_annuo_luce') {
                try {
                    const consumo = sanitizeText(String(dataValue)).replace(/[^\d]/g, ''); // Solo numeri
                    const field = form.getTextField('Consumo annuo kWh');
                    field.setText(consumo);
                    console.log(`✅ "consumo_annuo_luce" -> "Consumo annuo kWh": "${consumo}"`);
                    campiCompilati++;
                    // consumo_annuo_luce OK
                    return;
                } catch (error: any) {
                    console.log(`❌ Errore compilazione consumo luce: ${error.message}`);
                    campiNonTrovati.push('consumo_annuo_luce -> Consumo annuo kWh');
                }
            }
            
            // Gestione consumo gas - rimuovi unità di misura se presente
            if (dataKey === 'consumo_annuo_gas') {
                try {
                    const consumo = sanitizeText(String(dataValue)).replace(/[^\d]/g, ''); // Solo numeri
                    const field = form.getTextField('Consumo annuo smc');
                    field.setText(consumo);
                    console.log(`✅ "consumo_annuo_gas" -> "Consumo annuo smc": "${consumo}"`);
                    campiCompilati++;
                    // consumo_annuo_gas OK
                    return;
                } catch (error: any) {
                    console.log(`❌ Errore compilazione consumo gas: ${error.message}`);
                    campiNonTrovati.push('consumo_annuo_gas -> Consumo annuo smc');
                }
            }
            
            // Gestione potenza impegnata - rimuovi unità di misura
            if (dataKey === 'potenza_impegnata') {
                try {
                    // Estrae solo numeri e punto decimale: "4.4 kW" -> "4.4"
                    const potenza = sanitizeText(String(dataValue)).replace(/[^\d.]/g, '');
                    const field = form.getTextField('Potenza disponibile kW_2');
                    field.setText(potenza);
                    console.log(`✅ "potenza_impegnata" -> "Potenza disponibile kW_2": "${potenza}"`);
                    campiCompilati++;
                    // potenza_impegnata OK
                    return;
                } catch (error: any) {
                    console.log(`❌ Errore compilazione potenza: ${error.message}`);
                    campiNonTrovati.push('potenza_impegnata -> Potenza disponibile kW_2');
                }
            }
            
            // Gestione nome offerta - campo importante per ALPERIA
            if (dataKey === 'nome_offerta' || dataKey === 'fornitore') {
                try {
                    const valore = sanitizeText(String(dataValue));
                    // Cerca "Nome Offerta sottoscritta" o simili
                    const allFields = form.getFields();
                    const offertaField = allFields.find(f => 
                        f.getName().toLowerCase().includes('offerta') ||
                        f.getName().toLowerCase().includes('fornitore')
                    );
                    
                    if (offertaField) {
                        const textField = form.getTextField(offertaField.getName());
                        textField.setText(valore);
                        console.log(`✅ "${dataKey}" -> "${offertaField.getName()}": "${valore}"`);
                        campiCompilati++;
                        return;
                    }
                } catch (error: any) {
                    console.log(`⚠️ Campo ${dataKey} non trovato: ${error.message}`);
                }
            }
            
            // Gestione checkbox per consensi (skip per ora)
            if (dataKey === 'consenso_privacy' || dataKey === 'consenso_marketing') {
                return;
            }
            
            const pdfFieldName = fieldMapping[dataKey];
            if (pdfFieldName) {
                try {
                    const field = form.getTextField(pdfFieldName);
                    let sanitizedValue = sanitizeText(String(dataValue));
                    
                    // Gestione speciale per codice fiscale: maxLength = 16
                    if (dataKey === 'codice_fiscale' && sanitizedValue.length > 16) {
                        sanitizedValue = sanitizedValue.substring(0, 16);
                        console.log(`⚠️ Codice fiscale troncato a 16 caratteri`);
                    }
                    
                    field.setText(sanitizedValue);
                    campiCompilati++;
                    // Campo compilato
                    console.log(`✅ "${dataKey}" -> "${pdfFieldName}": "${sanitizedValue.substring(0, 30)}${sanitizedValue.length > 30 ? '...' : ''}"`);
                } catch (error: any) {
                    // Campo non trovato o non è un text field, continua
                    console.log(`❌ Campo "${dataKey}" -> "${pdfFieldName}": ${error.message}`);
                    campiNonTrovati.push(`${dataKey} -> ${pdfFieldName}`);
                }
            } else {
                console.log(`⏭️  Campo "${dataKey}" non mappato (valore: "${String(dataValue).substring(0, 30)}")`);
            }
        });
        
        // Flatten form per rendere i campi non più modificabili (opzionale)
        // Decommentare se si vuole che il PDF non sia più modificabile dopo la compilazione
        // form.flatten();
        
        console.log(`\n📊 RIEPILOGO:`);
        console.log(`   ✅ Compilati: ${campiCompilati} campi`);
        console.log(`   ❌ Errori: ${campiNonTrovati.length}`);
        if (campiNonTrovati.length > 0) {
            console.log(`   ${campiNonTrovati.join(', ')}`);
        }

        // Salva PDF generato
        const pdfBytes = await pdfDoc.save();
        const outputDir = 'uploads/contracts/generated';
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = `contratto_${contract.numero_contratto}_${Date.now()}.pdf`;
        const outputPath = path.join(outputDir, fileName);
        
        fs.writeFileSync(outputPath, pdfBytes);

        // Aggiorna contratto con percorso PDF
        await pool.query(`
            UPDATE contracts 
            SET pdf_path = ?, pdf_generated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [outputPath, id]);

        res.json({
            success: true,
            message: 'PDF generato con successo',
            data: {
                pdf_path: outputPath,
                file_name: fileName
            }
        });

    } catch (error: any) {
        console.error('❌ Errore generazione PDF:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante la generazione del PDF',
            error: error.message
        });
    }
});

/**
 * GET /api/contratti-pdf/download/:id
 * Scarica PDF contratto (genera se non esiste)
 */
router.get('/download/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Recupera contratto
        const result = await pool.query(`SELECT * FROM contracts WHERE id = ?`, [id]);
        
        if ((!result.rows || result.rows.length === 0)) {
            return res.status(404).json({
                success: false,
                message: 'Contratto non trovato'
            });
        }

        const contract = result.rows[0] as any;

        // Se PDF non esiste, genera automaticamente
        if (!contract.pdf_path || !fs.existsSync(contract.pdf_path)) {
            // Genera PDF
            const generateRes = await fetch(`http://localhost:3001/api/contratti-pdf/generate/${id}`, {
                method: 'POST',
                headers: {
                    'Authorization': req.headers.authorization || ''
                }
            });

            if (!generateRes.ok) {
                throw new Error('Errore generazione PDF automatica');
            }

            // Ricarica contratto aggiornato
            const updatedResult = await pool.query(`SELECT * FROM contracts WHERE id = ?`, [id]);
            const updatedContract = updatedResult.rows[0] as any;

            // Invia file
            res.download(updatedContract.pdf_path, `contratto_${updatedContract.numero_contratto}.pdf`);
        } else {
            // Invia PDF esistente
            res.download(contract.pdf_path, `contratto_${contract.numero_contratto}.pdf`);
        }

    } catch (error: any) {
        console.error('❌ Errore download PDF:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante il download del PDF',
            error: error.message
        });
    }
});

/**
 * POST /api/contratti-pdf/send-email/:id
 * Invia contratto via email
 */
router.post('/send-email/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { email_destinatario, messaggio } = req.body;

        if (!email_destinatario) {
            return res.status(400).json({
                success: false,
                message: 'Email destinatario mancante'
            });
        }

        // Recupera contratto
        const contractResult = await pool.query(`
            SELECT 
                c.*,
                CASE 
                    WHEN c.cliente_tipo = 'privato' THEN cp.email_principale
                    WHEN c.cliente_tipo = 'azienda' THEN ca.pec_aziendale
                END as cliente_email
            FROM contracts c
            LEFT JOIN clienti_privati cp ON c.cliente_id = cp.id AND c.cliente_tipo = 'privato'
            LEFT JOIN clienti_aziende ca ON c.cliente_id = ca.id AND c.cliente_tipo = 'azienda'
            WHERE c.id = ?
        `, [id]);

        if ((!contractResult.rows || contractResult.rows.length === 0)) {
            return res.status(404).json({
                success: false,
                message: 'Contratto non trovato'
            });
        }

        const contract = contractResult.rows[0] as any;

        // Assicurati che il PDF esista
        if (!contract.pdf_path || !fs.existsSync(contract.pdf_path)) {
            // Genera PDF se non esiste
            await fetch(`http://localhost:3001/api/contratti-pdf/generate/${id}`, {
                method: 'POST',
                headers: {
                    'Authorization': req.headers.authorization || ''
                }
            });
        }

        // TODO: Integrazione con sistema email esistente
        // Per ora registriamo solo nell'audit log

        const user = req.user as any;

        // Registra invio email
        await pool.query(`
            INSERT INTO email_inviate 
            (cliente_id, cliente_tipo, destinatario, oggetto, corpo, tipo, mittente_id, stato)
            VALUES (?, ?, ?, ?, ?, 'contratto', ?, 'inviata')
        `, [
            contract.cliente_id,
            contract.cliente_tipo,
            email_destinatario,
            `Contratto ${contract.numero_contratto}`,
            messaggio || 'In allegato il contratto compilato.',
            user.id
        ]);

        // Aggiorna contratto
        await pool.query(`UPDATE contracts SET inviato_email = 1 WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: 'Email inviata con successo'
        });

    } catch (error: any) {
        console.error('❌ Errore invio email:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante l\'invio dell\'email',
            error: error.message
        });
    }
});

/**
 * POST /api/contratti-pdf/send-whatsapp/:id
 * Invia contratto via WhatsApp
 */
router.post('/send-whatsapp/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { numero_telefono, messaggio } = req.body;

        if (!numero_telefono) {
            return res.status(400).json({
                success: false,
                message: 'Numero telefono mancante'
            });
        }

        // Recupera contratto
        const result = await pool.query(`SELECT * FROM contracts WHERE id = ?`, [id]);
        
        if ((!result.rows || result.rows.length === 0)) {
            return res.status(404).json({
                success: false,
                message: 'Contratto non trovato'
            });
        }

        const contract = result.rows[0] as any;

        // TODO: Integrazione con WhatsApp Business API o provider
        // Per ora simuliamo l'invio

        // Aggiorna contratto
        await pool.query(`UPDATE contracts SET inviato_whatsapp = 1 WHERE id = ?`, [id]);

        // Registra nell'audit log
        const user = req.user as any;
        await pool.query(`
            INSERT INTO audit_log 
            (tipo_azione, risorsa_tipo, risorsa_id, cliente_id, cliente_tipo, utente_id, utente_nome, descrizione)
            VALUES (?, 'contratto', ?, ?, ?, ?, ?, ?)
        `, [
            'whatsapp_inviato',
            id,
            contract.cliente_id,
            contract.cliente_tipo,
            user.id,
            user.email,
            `Contratto inviato via WhatsApp a ${numero_telefono}`
        ]);

        res.json({
            success: true,
            message: 'WhatsApp inviato con successo',
            note: 'Per invio reale, integrare WhatsApp Business API'
        });

    } catch (error: any) {
        console.error('❌ Errore invio WhatsApp:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante l\'invio WhatsApp',
            error: error.message
        });
    }
});

export default router;

