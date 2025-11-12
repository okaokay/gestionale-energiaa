/**
 * Route per gestione offerte e AI matching
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { pool, generateUUID } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validateOfferta, validateUUID } from '../middleware/validators';
import { analyzePDFOfferta, executeMatching } from '../services/aiService';

const router = Router();
router.use(authenticate);

// Configurazione upload PDF
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') }, // 10MB default
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo file PDF sono ammessi'));
        }
    }
});

/**
 * GET /api/offerte
 * Lista offerte con conteggio match
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stato = req.query.stato as string || 'attiva';
        const tipo_energia = req.query.tipo_energia as string;
        
        let query = `
            SELECT 
                o.*,
                COUNT(DISTINCT am.id) as match_count
            FROM offerte o
            LEFT JOIN ai_matches am ON o.id = am.offerta_id
            WHERE o.stato = ?
        `;
        const params: any[] = [stato];
        
        if (tipo_energia) {
            query += ' AND o.tipo_energia = ?';
            params.push(tipo_energia);
        }
        
        query += ' GROUP BY o.id ORDER BY o.created_at DESC';
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/offerte/:id
 * Dettaglio offerta
 */
router.get('/:id', validateUUID('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await pool.query('SELECT * FROM offerte WHERE id = ?', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Offerta non trovata' });
        }
        
        // Conta match disponibili
        const matchCount = await pool.query(
            'SELECT COUNT(*) as total, categoria_lead, AVG(risparmio_stimato_annuo) as risparmio_medio FROM ai_matches WHERE offerta_id = ? GROUP BY categoria_lead',
            [req.params.id]
        );
        
        res.json({
            success: true,
            data: {
                ...(result.rows[0] as any),
                matching_stats: matchCount.rows
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/offerte/:id/pdf-details
 * Recupera dettagli PDF + analisi AI completa
 */
router.get('/:id/pdf-details', authorize('admin', 'super_admin'), validateUUID('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await pool.query('SELECT * FROM offerte WHERE id = ?', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Offerta non trovata' });
        }
        
        const offerta = result.rows[0] as any;
        
        // Leggi il PDF se esiste
        let pdfText = null;
        if (offerta.pdf_path && fs.existsSync(offerta.pdf_path)) {
            try {
                const pdfParse = require('pdf-parse');
                const dataBuffer = fs.readFileSync(offerta.pdf_path);
                const pdfData = await pdfParse(dataBuffer);
                pdfText = pdfData.text;
            } catch (error) {
                console.error('❌ Errore lettura PDF:', error);
            }
        }
        
        // Prepara dati AI estratti
        const aiData = {
            nome_offerta: offerta.nome_offerta,
            fornitore: offerta.fornitore,
            tipo_energia: offerta.tipo_energia,
            target_clienti: offerta.target_clienti,
            prezzo_luce: offerta.prezzo_luce,
            prezzo_gas: offerta.prezzo_gas,
            costo_fisso_mensile_luce: offerta.costo_fisso_mensile_luce,
            costo_fisso_mensile_gas: offerta.costo_fisso_mensile_gas,
            durata_vincolo_mesi: offerta.durata_vincolo_mesi,
            consumo_minimo_kwh: offerta.consumo_minimo_kwh,
            consumo_massimo_kwh: offerta.consumo_massimo_kwh,
            codici_ateco_ammessi: offerta.codici_ateco_ammessi,
            condizioni_particolari: offerta.condizioni_particolari,
            data_inizio_validita: offerta.data_inizio_validita,
            data_fine_validita: offerta.data_fine_validita
        };
        
        res.json({
            success: true,
            data: {
                pdf_filename: offerta.pdf_filename,
                pdf_available: offerta.pdf_path && fs.existsSync(offerta.pdf_path),
                pdf_text_extracted: pdfText,
                ai_parsed_data: aiData,
                analizzato_da_ai: offerta.analizzato_da_ai === 1,
                created_at: offerta.created_at
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/offerte/:id/pdf
 * Scarica/visualizza PDF offerta
 */
router.get('/:id/pdf', authorize('operatore', 'admin', 'super_admin'), validateUUID('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await pool.query('SELECT pdf_path, pdf_filename FROM offerte WHERE id = ?', [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Offerta non trovata' });
        }
        
        const offerta = result.rows[0] as any;
        
        if (!offerta.pdf_path || !fs.existsSync(offerta.pdf_path)) {
            return res.status(404).json({ success: false, message: 'PDF non disponibile' });
        }
        
        res.sendFile(path.resolve(offerta.pdf_path));
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/offerte/:id
 * Elimina un'offerta e tutti i suoi match
 */
router.delete('/:id', authorize('super_admin', 'admin'), validateUUID('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        // Verifica esistenza offerta
        const offertaQuery = await pool.query('SELECT * FROM offerte WHERE id = ?', [id]);
        
        if (offertaQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Offerta non trovata' });
        }
        
        // Elimina prima i match associati (grazie a ON DELETE CASCADE dovrebbe essere automatico, ma lo facciamo per sicurezza)
        await pool.query('DELETE FROM ai_matches WHERE offerta_id = ?', [id]);
        
        // Elimina l'offerta
        await pool.query('DELETE FROM offerte WHERE id = ?', [id]);
        
        res.json({
            success: true,
            message: 'Offerta eliminata con successo'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/offerte/upload
 * Upload PDF offerta e analisi AI (SOLO SUPER ADMIN)
 */
router.post('/upload', authorize('super_admin'), upload.single('pdf'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'File PDF obbligatorio' });
        }
        
        console.log('📄 PDF caricato:', req.file.filename);
        
        // Analizza PDF con AI
        const datiEstratti = await analyzePDFOfferta(req.file.path);
        
        // Salva offerta nel database
        const offertaId = generateUUID();
        const dataInizioValidita = req.body.data_inizio_validita || new Date().toISOString().split('T')[0];
        const dataFineValidita = req.body.data_fine_validita || new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0];
        
        await pool.query(`
            INSERT INTO offerte (
                id, nome_offerta, fornitore, tipo_energia, data_inizio_validita, data_fine_validita,
                prezzo_luce, prezzo_gas, costo_fisso_mensile_luce, costo_fisso_mensile_gas,
                durata_vincolo_mesi, target_clienti, consumo_minimo_kwh, consumo_massimo_kwh,
                codici_ateco_ammessi, condizioni_particolari, pdf_filename, pdf_path,
                analizzato_da_ai, stato, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            offertaId, datiEstratti.nome_offerta, datiEstratti.fornitore, datiEstratti.tipo_energia,
            dataInizioValidita, dataFineValidita,
            datiEstratti.prezzo_luce || null, datiEstratti.prezzo_gas || null,
            datiEstratti.costo_fisso_mensile_luce || null, datiEstratti.costo_fisso_mensile_gas || null,
            datiEstratti.durata_vincolo_mesi || null, datiEstratti.target_clienti,
            datiEstratti.consumo_minimo_kwh || null, datiEstratti.consumo_massimo_kwh || null,
            JSON.stringify(datiEstratti.codici_ateco_ammessi || []),
            datiEstratti.condizioni_particolari || null, req.file.filename, req.file.path,
            1, 'attiva'
        ]);
        
        // Recupera l'offerta appena creata
        const offertaResult = await pool.query(`SELECT * FROM offerte WHERE id = ?`, [offertaId]);
        const offerta = offertaResult.rows[0] as any;
        
        // Esegui matching automatico
        console.log('🎯 Esecuzione matching automatico...');
        const matchCount = await executeMatching(offerta.id);
        
        res.status(201).json({
            success: true,
            message: `Offerta creata con successo. ${matchCount} clienti eligibili trovati.`,
            data: {
                offerta,
                match_count: matchCount
            }
        });
        
    } catch (error) {
        // Elimina file in caso di errore
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
});

/**
 * POST /api/offerte
 * Crea offerta manualmente (senza PDF)
 */
router.post('/', authorize('super_admin', 'admin'), validateOfferta, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            nome_offerta, fornitore, tipo_energia, data_inizio_validita, data_fine_validita,
            prezzo_luce, prezzo_gas, costo_fisso_mensile_luce, costo_fisso_mensile_gas,
            durata_vincolo_mesi, target_clienti, consumo_minimo_kwh, consumo_massimo_kwh,
            codici_ateco_ammessi, condizioni_particolari
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO offerte (
                nome_offerta, fornitore, tipo_energia, data_inizio_validita, data_fine_validita,
                prezzo_luce, prezzo_gas, costo_fisso_mensile_luce, costo_fisso_mensile_gas,
                durata_vincolo_mesi, target_clienti, consumo_minimo_kwh, consumo_massimo_kwh,
                codici_ateco_ammessi, condizioni_particolari, created_by, stato
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `, [
            nome_offerta, fornitore, tipo_energia, data_inizio_validita, data_fine_validita,
            prezzo_luce || null, prezzo_gas || null, costo_fisso_mensile_luce || null,
            costo_fisso_mensile_gas || null, durata_vincolo_mesi || null, target_clienti,
            consumo_minimo_kwh || null, consumo_massimo_kwh || null,
            JSON.stringify(codici_ateco_ammessi || []), condizioni_particolari || null,
            req.user!.userId, 'attiva'
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Offerta creata con successo',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/offerte/:id/match
 * Esegui matching AI per offerta specifica
 */
router.post('/:id/match', authorize('super_admin', 'admin'), validateUUID('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const matchCount = await executeMatching(req.params.id);
        
        res.json({
            success: true,
            message: `Matching completato: ${matchCount} clienti eligibili trovati`,
            data: { match_count: matchCount }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/offerte/:id/matches
 * Ottieni risultati matching per offerta
 */
router.get('/:id/matches', validateUUID('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categoria = req.query.categoria as string;
        const minScore = parseInt(req.query.minScore as string) || 0;
        
        let query = `
            SELECT 
                am.*,
                cp.nome as cliente_nome, cp.cognome as cliente_cognome, cp.email_principale as cliente_email,
                ca.ragione_sociale as azienda_nome, ca.email_referente as azienda_email, ca.codice_ateco,
                cl.fornitore as fornitore_attuale_luce, cl.prezzo_energia as prezzo_attuale_luce,
                cg.fornitore as fornitore_attuale_gas, cg.prezzo_gas as prezzo_attuale_gas
            FROM ai_matches am
            LEFT JOIN clienti_privati cp ON am.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON am.cliente_azienda_id = ca.id
            LEFT JOIN contratti_luce cl ON am.contratto_luce_id = cl.id
            LEFT JOIN contratti_gas cg ON am.contratto_gas_id = cg.id
            WHERE am.offerta_id = ? AND am.score_matching >= ?
        `;
        
        const params: any[] = [req.params.id, minScore];
        
        if (categoria) {
            query += ' AND am.categoria_lead = ?';
            params.push(categoria);
        }
        
        query += ' ORDER BY am.score_matching DESC';
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/offerte/matches/:matchId/stato
 * Aggiorna stato contatto lead
 */
router.put('/matches/:matchId/stato', authorize('operatore', 'admin', 'super_admin'), validateUUID('matchId'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { stato_contatto, note_venditore, data_prossimo_followup } = req.body;
        
        const updates: string[] = [`updated_at = datetime('now')`];
        const values: any[] = [];
        
        if (stato_contatto) {
            updates.push(`stato_contatto = ?`);
            values.push(stato_contatto);
            
            // Se è il primo contatto, imposta data_primo_contatto
            const checkQuery = await pool.query('SELECT data_primo_contatto FROM ai_matches WHERE id = ?', [req.params.matchId]);
            if (checkQuery.rows.length > 0 && !(checkQuery.rows[0] as any).data_primo_contatto) {
                updates.push(`data_primo_contatto = datetime('now')`);
            }
            updates.push(`data_ultimo_contatto = datetime('now')`);
        }
        
        if (note_venditore !== undefined) {
            updates.push(`note_venditore = ?`);
            values.push(note_venditore);
        }
        
        if (data_prossimo_followup) {
            updates.push(`data_prossimo_followup = ?`);
            values.push(data_prossimo_followup);
        }
        
        values.push(req.params.matchId);
        
        await pool.query(`
            UPDATE ai_matches 
            SET ${updates.join(', ')}
            WHERE id = ?
        `, values);
        
        // Recupera il record aggiornato
        const result = await pool.query('SELECT * FROM ai_matches WHERE id = ?', [req.params.matchId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Match non trovato' });
        }
        
        res.json({
            success: true,
            message: 'Stato aggiornato con successo',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/offerte/matches/:matchId/send-email
 * Invia email personalizzata al cliente del match
 */
router.post('/matches/:matchId/send-email', authorize('operatore', 'admin', 'super_admin'), validateUUID('matchId'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { template, customMessage } = req.body;
        const { sendEmail } = require('../services/emailService');
        
        // Recupera dati match + cliente + offerta
        const matchQuery = await pool.query(`
            SELECT 
                am.*,
                cp.nome as cliente_nome, cp.cognome as cliente_cognome, cp.email_principale as cliente_email,
                ca.ragione_sociale as azienda_nome, ca.email_referente as azienda_email,
                o.nome_offerta, o.fornitore as nuovo_fornitore, o.tipo_energia,
                o.prezzo_luce, o.prezzo_gas
            FROM ai_matches am
            LEFT JOIN clienti_privati cp ON am.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON am.cliente_azienda_id = ca.id
            LEFT JOIN offerte o ON am.offerta_id = o.id
            WHERE am.id = ?
        `, [req.params.matchId]);
        
        if (matchQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Match non trovato' });
        }
        
        const match = matchQuery.rows[0] as any;
        const clienteEmail = match.cliente_email || match.azienda_email;
        const clienteNome = match.cliente_nome 
            ? `${match.cliente_nome} ${match.cliente_cognome}` 
            : match.azienda_nome;
        
        if (!clienteEmail) {
            return res.status(400).json({ success: false, message: 'Cliente senza email' });
        }
        
        // Genera email HTML
        let subject = `Nuova offerta ${match.tipo_energia} da ${match.nuovo_fornitore}`;
        let html = '';
        
        if (template === 'custom' && customMessage) {
            html = `
                <h2>Ciao ${clienteNome},</h2>
                <p>${customMessage.replace(/\n/g, '<br>')}</p>
                <br>
                <p><strong>Dettagli offerta:</strong></p>
                <ul>
                    <li><strong>Fornitore:</strong> ${match.nuovo_fornitore}</li>
                    <li><strong>Nome offerta:</strong> ${match.nome_offerta}</li>
                    <li><strong>Tipo energia:</strong> ${match.tipo_energia.toUpperCase()}</li>
                    ${match.prezzo_luce ? `<li><strong>Prezzo Luce:</strong> €${match.prezzo_luce}/kWh</li>` : ''}
                    ${match.prezzo_gas ? `<li><strong>Prezzo Gas:</strong> €${match.prezzo_gas}/Smc</li>` : ''}
                    <li><strong>Risparmio stimato:</strong> €${match.risparmio_stimato_annuo}/anno</li>
                </ul>
                <p>Per maggiori informazioni, contattaci!</p>
            `;
        } else {
            // Template standard
            html = `
                <h2>Ciao ${clienteNome},</h2>
                <p>Abbiamo trovato un'offerta vantaggiosa per te!</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>${match.nome_offerta}</h3>
                    <p><strong>Fornitore:</strong> ${match.nuovo_fornitore}</p>
                    <p><strong>Tipo:</strong> ${match.tipo_energia.toUpperCase()}</p>
                    ${match.prezzo_luce ? `<p><strong>Prezzo Luce:</strong> €${match.prezzo_luce}/kWh</p>` : ''}
                    ${match.prezzo_gas ? `<p><strong>Prezzo Gas:</strong> €${match.prezzo_gas}/Smc</p>` : ''}
                    <p style="color: green; font-size: 20px; font-weight: bold;">
                        💰 Risparmio stimato: €${match.risparmio_stimato_annuo}/anno
                    </p>
                </div>
                <p>Questa offerta è pensata appositamente per te. Contattaci per maggiori dettagli!</p>
            `;
        }
        
        // Invia email
        await sendEmail({
            to: clienteEmail,
            subject,
            html,
            tipoEmail: 'offerta_match'
        });
        
        // Aggiorna stato match
        await pool.query(`
            UPDATE ai_matches 
            SET 
                stato_contatto = 'contattato',
                data_ultimo_contatto = datetime('now'),
                data_primo_contatto = COALESCE(data_primo_contatto, datetime('now')),
                updated_at = datetime('now')
            WHERE id = ?
        `, [req.params.matchId]);
        
        res.json({
            success: true,
            message: 'Email inviata con successo'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/offerte/match-cliente
 * Esegue matching AI per un singolo cliente
 */
router.post('/match-cliente', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { cliente_id, tipo_cliente } = req.body;
        
        if (!cliente_id || !tipo_cliente) {
            return res.status(400).json({ success: false, message: 'Parametri mancanti: cliente_id e tipo_cliente obbligatori' });
        }
        
        // Recupera dati cliente
        const clienteTable = tipo_cliente === 'privato' ? 'clienti_privati' : 'clienti_aziende';
        const clienteQuery = await pool.query(`SELECT * FROM ${clienteTable} WHERE id = ?`, [cliente_id]);
        
        if (clienteQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cliente non trovato' });
        }
        
        const cliente = clienteQuery.rows[0] as any;
        
        // Recupera contratti attivi del cliente
        const contrattiLuce = await pool.query(`
            SELECT * FROM contratti_luce 
            WHERE ${tipo_cliente === 'privato' ? 'cliente_privato_id' : 'cliente_azienda_id'} = ? 
            AND stato = 'attivo'
        `, [cliente_id]);
        
        const contrattiGas = await pool.query(`
            SELECT * FROM contratti_gas 
            WHERE ${tipo_cliente === 'privato' ? 'cliente_privato_id' : 'cliente_azienda_id'} = ? 
            AND stato = 'attivo'
        `, [cliente_id]);
        
        // Recupera offerte attive
        const offerteAttive = await pool.query(`
            SELECT * FROM offerte 
            WHERE stato = 'attiva'
            AND (target_clienti = ? OR target_clienti = 'entrambi')
            ORDER BY created_at DESC
        `, [tipo_cliente === 'privato' ? 'privati' : 'aziende']);
        
        if (offerteAttive.rows.length === 0) {
            return res.json({
                success: true,
                message: 'Nessuna offerta attiva disponibile',
                data: []
            });
        }
        
        console.log(`🤖 Esecuzione matching AI per cliente: ${tipo_cliente === 'privato' ? `${cliente.nome} ${cliente.cognome}` : cliente.ragione_sociale}`);
        
        const matchingResults: any[] = [];
        
        // Per ogni offerta, calcola score e risparmio
        for (const offerta of offerteAttive.rows) {
            const offertaTyped = offerta as any;
            
            // Determina quale contratto usare (luce o gas)
            const contratti = offertaTyped.tipo_energia === 'gas' ? contrattiGas.rows : contrattiLuce.rows;
            
            if (contratti.length > 0) {
                const contratto = contratti[0] as any; // Usa il primo contratto attivo
                
                // Calcola score (logica semplificata)
                let score = 50; // Base score
                
                // Aumenta score in base alla scadenza contratto
                const giorniAScadenza = Math.floor((new Date(contratto.data_scadenza).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                if (giorniAScadenza <= 30) score += 30;
                else if (giorniAScadenza <= 60) score += 20;
                else if (giorniAScadenza <= 90) score += 10;
                
                // Calcola risparmio stimato
                const prezzoAttuale = contratto.prezzo_energia || contratto.prezzo_gas || 0;
                const prezzoNuovo = offertaTyped.prezzo_luce || offertaTyped.prezzo_gas || 0;
                const consumo = contratto.consumo_annuo_reale || contratto.consumo_annuo_stimato || 0;
                const risparmioAnnuo = (prezzoAttuale - prezzoNuovo) * consumo;
                
                // Se c'è risparmio, aumenta score
                if (risparmioAnnuo > 0) {
                    score += 20;
                }
                
                if (score >= 50) { // Match valido solo se score >= 50
                    matchingResults.push({
                        offerta_id: offertaTyped.id,
                        nome_offerta: offertaTyped.nome_offerta,
                        fornitore: offertaTyped.fornitore,
                        tipo_energia: offertaTyped.tipo_energia,
                        score: Math.min(100, score),
                        risparmio_stimato: Math.round(risparmioAnnuo),
                        giorni_a_scadenza: giorniAScadenza,
                        motivazione: risparmioAnnuo > 0 
                            ? `Risparmio stimato di €${Math.round(risparmioAnnuo)}/anno. Contratto in scadenza tra ${giorniAScadenza} giorni.`
                            : `Contratto in scadenza tra ${giorniAScadenza} giorni. Valuta questa offerta.`
                    });
                }
            }
        }
        
        // Ordina per score decrescente
        matchingResults.sort((a, b) => b.score - a.score);
        
        res.json({
            success: true,
            message: `Trovate ${matchingResults.length} offerte compatibili`,
            data: matchingResults
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/offerte/riesegui-matching-globale
 * Riesegue il matching AI per tutte le offerte attive
 */
router.post('/riesegui-matching-globale', authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('🔄 Inizio riesecuzione matching globale...');
        
        // Recupera tutte le offerte attive
        const offerteQuery = await pool.query('SELECT * FROM offerte WHERE stato = ?', ['attiva']);
        
        if (offerteQuery.rows.length === 0) {
            return res.json({
                success: true,
                message: 'Nessuna offerta attiva da processare',
                data: { offerte_processate: 0, match_trovati: 0 }
            });
        }
        
        const { executeMatching } = require('../services/aiService');
        let totalMatches = 0;
        const results: any[] = [];
        
        // Processa ogni offerta
        for (const offerta of offerteQuery.rows) {
            const offertaData = offerta as any;
            console.log(`🎯 Processing offerta: ${offertaData.nome_offerta}`);
            
            try {
                // Elimina vecchi match per questa offerta
                await pool.query('DELETE FROM ai_matches WHERE offerta_id = ?', [offertaData.id]);
                
                // Esegui nuovo matching
                const matchResult = await executeMatching(offertaData.id);
                totalMatches += matchResult.matches_created || 0;
                
                results.push({
                    offerta_id: offertaData.id,
                    nome_offerta: offertaData.nome_offerta,
                    matches_trovati: matchResult.matches_created || 0
                });
                
                console.log(`✅ ${offertaData.nome_offerta}: ${matchResult.matches_created || 0} match trovati`);
            } catch (error: any) {
                console.error(`❌ Errore matching per ${offertaData.nome_offerta}:`, error.message);
                results.push({
                    offerta_id: offertaData.id,
                    nome_offerta: offertaData.nome_offerta,
                    errore: error.message
                });
            }
        }
        
        console.log(`✅ Matching globale completato: ${totalMatches} match totali`);
        
        res.json({
            success: true,
            message: `Matching completato: ${totalMatches} clienti eligibili trovati per ${offerteQuery.rows.length} offerte`,
            data: {
                offerte_processate: offerteQuery.rows.length,
                match_trovati: totalMatches,
                dettagli: results
            }
        });
        
    } catch (error) {
        next(error);
    }
});

export default router;

