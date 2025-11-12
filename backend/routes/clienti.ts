/**
 * Route per gestione clienti (privati e aziende)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { validateClientePrivato, validateClienteAzienda, validateUUID, validatePagination, validateFlexibleId } from '../middleware/validators';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import { evaluateDataQualityPrivato, evaluateDataQualityAzienda } from '../utils/dataQuality';

const router = Router();

// Tutte le route richiedono autenticazione
router.use(authenticate);

// Configurazione multer per upload file
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const allowedExtensions = ['.csv', '.xls', '.xlsx'];
        
        const hasValidType = allowedTypes.includes(file.mimetype);
        const hasValidExtension = allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext));
        
        if (hasValidType || hasValidExtension) {
            cb(null, true);
        } else {
            cb(new Error('Formato file non supportato. Utilizzare CSV, XLS o XLSX.'));
        }
    }
});

/**
 * GET /api/clienti
 * Lista tutti i clienti (privati + aziende) con paginazione
 */
router.get('/', validatePagination, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search as string || '';
        const tipo = req.query.tipo as string || ''; // 'privati' o 'aziende'
        const contratti = (req.query.contratti as string) || ''; // 'luce' | 'gas' | 'both'
        
        // 🔐 FILTRO PER RUOLO UTENTE
        const user = req.user as any;
        let roleFilter = '';
        let roleParams: any[] = [];
        
        if (user.role === 'operatore' || user.role === 'agent') {
            // Operatore vede SOLO i clienti assegnati a lui
            roleFilter = 'AND cp.assigned_agent_id = ?';
            roleParams = [user.id];
        } else if (user.role === 'admin') {
            // Admin vede clienti della sua agenzia (tutti gli operatori sotto di lui)
            roleFilter = `AND cp.assigned_agent_id IN (
                SELECT id FROM users WHERE parent_id = ? OR id = ?
            )`;
            roleParams = [user.id, user.id];
        }
        // Super admin: nessun filtro (vede tutto)
        
        // Alcune installazioni potrebbero non avere tabelle di newsletter
        // Verifichiamo la loro presenza per evitare errori "no such table"
        let hasNewsletterTables = true;
        try {
            const checkCn = await pool.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
                ['clienti_newsletter']
            );
            const checkN = await pool.query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
                ['newsletter']
            );
            hasNewsletterTables = (checkCn.rows?.length > 0) && (checkN.rows?.length > 0);
        } catch (_) {
            hasNewsletterTables = false;
        }
        // Costruiamo selezioni condizionali per newsletter
        const newsletterPrivatiSelect = hasNewsletterTables
            ? `(
                    SELECT GROUP_CONCAT(n.nome, ', ')
                    FROM clienti_newsletter cn 
                    JOIN newsletter n ON cn.newsletter_id = n.id 
                    WHERE cn.cliente_id = cp.id AND cn.cliente_tipo = 'privato'
               ) as newsletter_nomi,
               (
                    SELECT COUNT(*) 
                    FROM clienti_newsletter cn 
                    WHERE cn.cliente_id = cp.id AND cn.cliente_tipo = 'privato'
               ) as newsletter_count`
            : `NULL as newsletter_nomi,
               0 as newsletter_count`;
        const newsletterAziendeSelect = hasNewsletterTables
            ? `(
                    SELECT GROUP_CONCAT(n.nome, ', ')
                    FROM clienti_newsletter cn 
                    JOIN newsletter n ON cn.newsletter_id = n.id 
                    WHERE cn.cliente_id = ca.id AND cn.cliente_tipo = 'azienda'
               ) as newsletter_nomi,
               (
                    SELECT COUNT(*) 
                    FROM clienti_newsletter cn 
                    WHERE cn.cliente_id = ca.id AND cn.cliente_tipo = 'azienda'
               ) as newsletter_count`
            : `NULL as newsletter_nomi,
               0 as newsletter_count`;
        
        // Query clienti privati
        let privati: any[] = [];
        if (tipo !== 'aziende') {
            const searchFilter = search ? 'WHERE (cp.nome LIKE ? OR cp.cognome LIKE ? OR cp.codice_fiscale LIKE ? OR cp.email_principale LIKE ?)' : 'WHERE 1=1';
            // Filtro combinazioni contratti per privati
            let contrattiFilterPrivati = '';
            if (contratti === 'luce') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_privato_id = cp.id)`;
            } else if (contratti === 'gas') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_privato_id = cp.id)`;
            } else if (contratti === 'both') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_privato_id = cp.id) AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_privato_id = cp.id)`;
            }
            const privatiQuery = `
                SELECT 
                    'privato' as tipo,
                    cp.id, cp.nome, cp.cognome, cp.codice_fiscale, cp.codice_cliente,
                    cp.email_principale as email, 
                    cp.telefono_mobile as telefono, 
                    cp.telefono_mobile as telefono_principale,
                    cp.citta_residenza as citta,
                    cp.provincia_residenza as provincia,
                    cp.consenso_marketing,
                    cp.created_at,
                    cp.incomplete_data,
                    cp.missing_fields,
                    cp.data_quality_score,
                    cp.stato,
                    cp.assigned_agent_id,
                    cp.commissione_pattuita,
                    cp.commissione_pagata,
                    (SELECT COUNT(*) FROM contratti_luce WHERE cliente_privato_id = cp.id) as contratti_luce,
                    (SELECT COUNT(*) FROM contratti_gas WHERE cliente_privato_id = cp.id) as contratti_gas,
                    (SELECT stato FROM contratti_luce WHERE cliente_privato_id = cp.id ORDER BY data_inizio DESC LIMIT 1) as stato_contratto_luce,
                    (SELECT stato FROM contratti_gas WHERE cliente_privato_id = cp.id ORDER BY data_inizio DESC LIMIT 1) as stato_contratto_gas,
                    ${newsletterPrivatiSelect}
                FROM clienti_privati cp
                ${searchFilter}
                ${contrattiFilterPrivati}
                ${roleFilter}
                ORDER BY cp.created_at DESC
                LIMIT ? OFFSET ?
            `;
            const privatiParams = search 
                ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, ...roleParams, limit, offset] 
                : [...roleParams, limit, offset];
            const privatiResult = await pool.query(privatiQuery, privatiParams);
            privati = privatiResult.rows;
        }
        
        // Query clienti aziende
        let aziende: any[] = [];
        if (tipo !== 'privati') {
            // Stessa logica di filtro per aziende
            let roleFilterAziende = '';
            if (user.role === 'operatore' || user.role === 'agent') {
                roleFilterAziende = 'AND ca.assigned_agent_id = ?';
            } else if (user.role === 'admin') {
                roleFilterAziende = `AND ca.assigned_agent_id IN (
                    SELECT id FROM users WHERE parent_id = ? OR id = ?
                )`;
            }
            
            const searchFilterAziende = search ? 'WHERE (ca.ragione_sociale LIKE ? OR ca.partita_iva LIKE ? OR ca.email_referente LIKE ?)' : 'WHERE 1=1';
            // Filtro combinazioni contratti per aziende
            let contrattiFilterAziende = '';
            if (contratti === 'luce') {
                contrattiFilterAziende = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_azienda_id = ca.id)`;
            } else if (contratti === 'gas') {
                contrattiFilterAziende = ` AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_azienda_id = ca.id)`;
            } else if (contratti === 'both') {
                contrattiFilterAziende = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_azienda_id = ca.id) AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_azienda_id = ca.id)`;
            }
            const aziendeQuery = `
                SELECT 
                    'azienda' as tipo,
                    ca.id, 
                    ca.ragione_sociale as nome,
                    NULL as cognome,
                    ca.ragione_sociale, 
                    ca.partita_iva, 
                    ca.codice_cliente,
                    ca.email_referente as email, 
                    ca.telefono_referente as telefono,
                    ca.citta_sede_legale as citta, 
                    ca.provincia_sede_legale as provincia,
                    ca.codice_ateco,
                    ca.consenso_marketing,
                    ca.created_at,
                    ca.incomplete_data,
                    ca.missing_fields,
                    ca.data_quality_score,
                    ca.stato,
                    ca.assigned_agent_id,
                    ca.commissione_pattuita,
                    ca.commissione_pagata,
                    (SELECT COUNT(*) FROM contratti_luce WHERE cliente_azienda_id = ca.id) as contratti_luce,
                    (SELECT COUNT(*) FROM contratti_gas WHERE cliente_azienda_id = ca.id) as contratti_gas,
                    (SELECT stato FROM contratti_luce WHERE cliente_azienda_id = ca.id ORDER BY data_inizio DESC LIMIT 1) as stato_contratto_luce,
                    (SELECT stato FROM contratti_gas WHERE cliente_azienda_id = ca.id ORDER BY data_inizio DESC LIMIT 1) as stato_contratto_gas,
                    ${newsletterAziendeSelect}
                FROM clienti_aziende ca
                ${searchFilterAziende}
                ${contrattiFilterAziende}
                ${roleFilterAziende}
                ORDER BY ca.created_at DESC
                LIMIT ? OFFSET ?
            `;
            const aziendeParams = search 
                ? [`%${search}%`, `%${search}%`, `%${search}%`, ...roleParams, limit, offset] 
                : [...roleParams, limit, offset];
            const aziendeResult = await pool.query(aziendeQuery, aziendeParams);
            aziende = aziendeResult.rows;
        }
        
        // Combina risultati
        let clienti = [...privati, ...aziende].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, limit);
        
        // Count totale (con filtro ruolo)
        let totalCount = 0;
        if (tipo === 'privati') {
            const searchFilter = search ? 'WHERE (nome LIKE ? OR cognome LIKE ?)' : 'WHERE 1=1';
            let contrattiFilterPrivati = '';
            if (contratti === 'luce') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_privato_id = cp.id)`;
            } else if (contratti === 'gas') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_privato_id = cp.id)`;
            } else if (contratti === 'both') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_privato_id = cp.id) AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_privato_id = cp.id)`;
            }
            const countQuery = `SELECT COUNT(*) as count FROM clienti_privati cp ${searchFilter} ${contrattiFilterPrivati} ${roleFilter}`;
            const countParams = search ? [`%${search}%`, `%${search}%`, ...roleParams] : roleParams;
            const countResult = await pool.query(countQuery, countParams);
            totalCount = parseInt((countResult.rows[0] as any).count);
        } else if (tipo === 'aziende') {
            const searchFilter = search ? 'WHERE (ragione_sociale LIKE ?)' : 'WHERE 1=1';
            let roleFilterAziende = roleFilter.replace(/cp\./g, 'ca.');
            let contrattiFilterAziende = '';
            if (contratti === 'luce') {
                contrattiFilterAziende = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_azienda_id = ca.id)`;
            } else if (contratti === 'gas') {
                contrattiFilterAziende = ` AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_azienda_id = ca.id)`;
            } else if (contratti === 'both') {
                contrattiFilterAziende = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_azienda_id = ca.id) AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_azienda_id = ca.id)`;
            }
            const countQuery = `SELECT COUNT(*) as count FROM clienti_aziende ca ${searchFilter} ${contrattiFilterAziende} ${roleFilterAziende}`;
            const countParams = search ? [`%${search}%`, ...roleParams] : roleParams;
            const countResult = await pool.query(countQuery, countParams);
            totalCount = parseInt((countResult.rows[0] as any).count);
        } else {
            let contrattiFilterPrivati = '';
            let contrattiFilterAziende = '';
            if (contratti === 'luce') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_privato_id = cp.id)`;
                contrattiFilterAziende = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_azienda_id = ca.id)`;
            } else if (contratti === 'gas') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_privato_id = cp.id)`;
                contrattiFilterAziende = ` AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_azienda_id = ca.id)`;
            } else if (contratti === 'both') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_privato_id = cp.id) AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_privato_id = cp.id)`;
                contrattiFilterAziende = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_azienda_id = ca.id) AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_azienda_id = ca.id)`;
            }
            const countPrivatiQuery = `SELECT COUNT(*) as count FROM clienti_privati cp WHERE 1=1 ${contrattiFilterPrivati} ${roleFilter}`;
            const countPrivati = await pool.query(countPrivatiQuery, roleParams);
            
            let roleFilterAziende = roleFilter.replace(/cp\./g, 'ca.');
            const countAziendeQuery = `SELECT COUNT(*) as count FROM clienti_aziende ca WHERE 1=1 ${contrattiFilterAziende} ${roleFilterAziende}`;
            const countAziende = await pool.query(countAziendeQuery, roleParams);
            
            totalCount = parseInt((countPrivati.rows[0] as any).count) + parseInt((countAziende.rows[0] as any).count);
        }
        
        // Calcolo breakdown totali per KPI (privati, aziende, con contratti)
        // I conteggi rispettano gli stessi filtri di ricerca, ruolo e combinazioni contratti
        let privatiCount = 0;
        let aziendeCount = 0;
        let conContrattiCount = 0;

        // Conteggio privati
        if (tipo !== 'aziende') {
            const searchFilterPrivati = search ? 'WHERE (cp.nome LIKE ? OR cp.cognome LIKE ? OR cp.codice_fiscale LIKE ? OR cp.email_principale LIKE ?)' : 'WHERE 1=1';
            let contrattiFilterPrivati = '';
            if (contratti === 'luce') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_privato_id = cp.id)`;
            } else if (contratti === 'gas') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_privato_id = cp.id)`;
            } else if (contratti === 'both') {
                contrattiFilterPrivati = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_privato_id = cp.id) AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_privato_id = cp.id)`;
            }
            const privatiCountQuery = `SELECT COUNT(*) as count FROM clienti_privati cp ${searchFilterPrivati} ${contrattiFilterPrivati} ${roleFilter}`;
            const privatiCountParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, ...roleParams] : roleParams;
            const privatiCountRes = await pool.query(privatiCountQuery, privatiCountParams);
            privatiCount = parseInt((privatiCountRes.rows[0] as any).count);

            // Con contratti (privati): almeno un contratto luce o gas
            let conContrattiPrivatiFilter = ` AND (
                EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_privato_id = cp.id)
                OR EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_privato_id = cp.id)
            )`;
            const conContrattiPrivatiQuery = `SELECT COUNT(*) as count FROM clienti_privati cp ${searchFilterPrivati} ${conContrattiPrivatiFilter} ${roleFilter}`;
            const conContrattiPrivatiRes = await pool.query(conContrattiPrivatiQuery, privatiCountParams);
            conContrattiCount += parseInt((conContrattiPrivatiRes.rows[0] as any).count);
        }

        // Conteggio aziende
        if (tipo !== 'privati') {
            const searchFilterAz = search ? 'WHERE (ca.ragione_sociale LIKE ? OR ca.partita_iva LIKE ? OR ca.email_referente LIKE ?)' : 'WHERE 1=1';
            let roleFilterAziende = '';
            if (user.role === 'operatore' || user.role === 'agent') {
                roleFilterAziende = 'AND ca.assigned_agent_id = ?';
            } else if (user.role === 'admin') {
                roleFilterAziende = `AND ca.assigned_agent_id IN (
                    SELECT id FROM users WHERE parent_id = ? OR id = ?
                )`;
            }
            let contrattiFilterAz = '';
            if (contratti === 'luce') {
                contrattiFilterAz = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_azienda_id = ca.id)`;
            } else if (contratti === 'gas') {
                contrattiFilterAz = ` AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_azienda_id = ca.id)`;
            } else if (contratti === 'both') {
                contrattiFilterAz = ` AND EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_azienda_id = ca.id) AND EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_azienda_id = ca.id)`;
            }
            const aziendeCountQuery = `SELECT COUNT(*) as count FROM clienti_aziende ca ${searchFilterAz} ${contrattiFilterAz} ${roleFilterAziende}`;
            const aziendeCountParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`, ...roleParams] : roleParams;
            const aziendeCountRes = await pool.query(aziendeCountQuery, aziendeCountParams);
            aziendeCount = parseInt((aziendeCountRes.rows[0] as any).count);

            // Con contratti (aziende)
            let conContrattiAziendeFilter = ` AND (
                EXISTS (SELECT 1 FROM contratti_luce cl WHERE cl.cliente_azienda_id = ca.id)
                OR EXISTS (SELECT 1 FROM contratti_gas cg WHERE cg.cliente_azienda_id = ca.id)
            )`;
            const conContrattiAziendeQuery = `SELECT COUNT(*) as count FROM clienti_aziende ca ${searchFilterAz} ${conContrattiAziendeFilter} ${roleFilterAziende}`;
            const conContrattiAziendeRes = await pool.query(conContrattiAziendeQuery, aziendeCountParams);
            conContrattiCount += parseInt((conContrattiAziendeRes.rows[0] as any).count);
        }

        res.json({
            success: true,
            data: {
                clienti,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                },
                totals: {
                    totale: totalCount,
                    privati: privatiCount,
                    aziende: aziendeCount,
                    conContratti: conContrattiCount
                }
            }
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/clienti/privati/:id
 * Dettaglio cliente privato
 */
router.get('/privati/:id', validateFlexibleId('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await pool.query(
            'SELECT * FROM clienti_privati WHERE id = ?',
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente non trovato'
            });
        }
        
        // Recupera anche i contratti associati
        const contrattiLuce = await pool.query(
            'SELECT * FROM contratti_luce WHERE cliente_privato_id = $1 ORDER BY data_inizio DESC',
            [req.params.id]
        );
        
        const contrattiGas = await pool.query(
            'SELECT * FROM contratti_gas WHERE cliente_privato_id = $1 ORDER BY data_inizio DESC',
            [req.params.id]
        );
        
        res.json({
            success: true,
            data: {
                ...(result.rows[0] as any),
                contratti_luce: contrattiLuce.rows,
                contratti_gas: contrattiGas.rows
            }
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/clienti/privati
 * Crea nuovo cliente privato
 */
router.post('/privati', authorize('operatore', 'admin', 'super_admin'), validateClientePrivato, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            nome, cognome, codice_fiscale, data_nascita, email_principale, email_secondaria,
            telefono_fisso, telefono_mobile, pec, via_residenza, civico_residenza, cap_residenza,
            citta_residenza, provincia_residenza, via_fornitura, civico_fornitura, cap_fornitura,
            citta_fornitura, provincia_fornitura, tipo_documento, numero_documento, ente_rilascio,
            data_scadenza_documento, iban, preferenza_email, preferenza_sms, preferenza_telefono,
            note, consenso_privacy, consenso_marketing, news_letter, utente_acquisizione
        } = req.body;
        
        const { randomUUID } = require('crypto');
        const clienteId = randomUUID();
        
        // 🔐 AUTO-ASSEGNAZIONE: Se operatore crea cliente, lo assegna automaticamente a sé stesso
        const user = req.user as any;
        const assignedAgentId = user.role === 'operatore' || user.role === 'agent' ? user.id : req.body.assigned_agent_id || null;
        
        const result = await pool.query(`
            INSERT INTO clienti_privati (
                id, nome, cognome, codice_fiscale, data_nascita, email_principale, email_secondaria,
                telefono_fisso, telefono_mobile, pec, via_residenza, civico_residenza, cap_residenza,
                citta_residenza, provincia_residenza, via_fornitura, civico_fornitura, cap_fornitura,
                citta_fornitura, provincia_fornitura, tipo_documento, numero_documento, ente_rilascio,
                data_scadenza_documento, iban, preferenza_email, preferenza_sms, preferenza_telefono,
                note, consenso_privacy, consenso_marketing, news_letter, utente_acquisizione, data_consenso, created_by, assigned_agent_id
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?
            )
        `, [
            clienteId, nome || null, cognome || null, codice_fiscale?.toUpperCase() || null, data_nascita || null, email_principale?.toLowerCase() || null,
            email_secondaria?.toLowerCase() || null, telefono_fisso || null, telefono_mobile || null, pec?.toLowerCase() || null,
            via_residenza || null, civico_residenza || null, cap_residenza || null, citta_residenza || null, provincia_residenza?.toUpperCase() || null,
            via_fornitura || null, civico_fornitura || null, cap_fornitura || null, citta_fornitura || null,
            provincia_fornitura?.toUpperCase() || null, tipo_documento || null, numero_documento || null, ente_rilascio || null,
            data_scadenza_documento || null, iban || null, 
            preferenza_email !== undefined ? (preferenza_email ? 1 : 0) : 1, 
            preferenza_sms !== undefined ? (preferenza_sms ? 1 : 0) : 1,
            preferenza_telefono !== undefined ? (preferenza_telefono ? 1 : 0) : 1, 
            note || null, 
            consenso_privacy ? 1 : 0, 
            consenso_marketing ? 1 : 0,
            news_letter ? 1 : 0,
            utente_acquisizione || null,
            req.user!.userId,
            assignedAgentId  // 🔐 Assegnazione automatica
        ]);
        
        // Recupera il cliente appena inserito
        const cliente = await pool.query(`SELECT * FROM clienti_privati WHERE id = ?`, [clienteId]);
        
        res.status(201).json({
            success: true,
            message: 'Cliente privato creato con successo',
            data: cliente.rows[0]
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/clienti/privati/:id
 * Aggiorna cliente privato
 */
router.put('/privati/:id', authorize('operatore', 'admin', 'super_admin'), validateFlexibleId('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        
        // Campi aggiornabili
        const updatableFields = [
            'nome', 'cognome', 'email_principale', 'email_secondaria', 'telefono_fisso', 'telefono_mobile',
            'pec', 'via_residenza', 'civico_residenza', 'cap_residenza', 'citta_residenza', 'provincia_residenza',
            'via_fornitura', 'civico_fornitura', 'cap_fornitura', 'citta_fornitura', 'provincia_fornitura',
            'iban', 'preferenza_email', 'preferenza_sms', 'preferenza_telefono', 'note', 'consenso_marketing', 
            'news_letter', 'utente_acquisizione', 'codice_fiscale', 'data_nascita', 'tipo_documento', 
            'numero_documento', 'ente_rilascio', 'data_scadenza_documento', 'nazione'
        ];
        
        for (const field of updatableFields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nessun campo da aggiornare'
            });
        }
        
        values.push(req.params.id);
        
        await pool.query(`
            UPDATE clienti_privati 
            SET ${updates.join(', ')}, updated_at = datetime('now')
            WHERE id = ?
        `, values);
        
        const result = await pool.query(`SELECT * FROM clienti_privati WHERE id = ?`, [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente non trovato'
            });
        }
        
        res.json({
            success: true,
            message: 'Cliente aggiornato con successo',
            data: result.rows[0]
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/clienti/aziende/:id
 * Dettaglio cliente azienda
 */
router.get('/aziende/:id', validateFlexibleId('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await pool.query(
            'SELECT * FROM clienti_aziende WHERE id = ?',
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Azienda non trovata'
            });
        }
        
        // Recupera contratti
        const contrattiLuce = await pool.query(
            'SELECT * FROM contratti_luce WHERE cliente_azienda_id = $1 ORDER BY data_inizio DESC',
            [req.params.id]
        );
        
        const contrattiGas = await pool.query(
            'SELECT * FROM contratti_gas WHERE cliente_azienda_id = $1 ORDER BY data_inizio DESC',
            [req.params.id]
        );
        
        res.json({
            success: true,
            data: {
                ...(result.rows[0] as any),
                contratti_luce: contrattiLuce.rows,
                contratti_gas: contrattiGas.rows
            }
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/clienti/aziende
 * Crea nuovo cliente azienda
 */
router.post('/aziende', authorize('operatore', 'admin', 'super_admin'), validateClienteAzienda, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            ragione_sociale, partita_iva, codice_fiscale, codice_ateco, descrizione_ateco, pec_aziendale,
            via_sede_legale, civico_sede_legale, cap_sede_legale, citta_sede_legale, provincia_sede_legale,
            via_sede_operativa, civico_sede_operativa, cap_sede_operativa, citta_sede_operativa, provincia_sede_operativa,
            nome_referente, cognome_referente, ruolo_referente, email_referente, telefono_referente,
            dimensione_azienda, settore_merceologico, fatturato_annuo, iban_aziendale, codice_sdi,
            note, consenso_privacy, consenso_marketing, news_letter, utente_acquisizione
        } = req.body;
        
        const { randomUUID } = require('crypto');
        const aziendaId = randomUUID();
        
        // 🔐 AUTO-ASSEGNAZIONE: Se operatore crea cliente, lo assegna automaticamente a sé stesso
        const user = req.user as any;
        const assignedAgentId = user.role === 'operatore' || user.role === 'agent' ? user.id : req.body.assigned_agent_id || null;
        
        const result = await pool.query(`
            INSERT INTO clienti_aziende (
                id, ragione_sociale, partita_iva, codice_fiscale, codice_ateco, descrizione_ateco, pec_aziendale,
                via_sede_legale, civico_sede_legale, cap_sede_legale, citta_sede_legale, provincia_sede_legale,
                via_sede_operativa, civico_sede_operativa, cap_sede_operativa, citta_sede_operativa, provincia_sede_operativa,
                nome_referente, cognome_referente, ruolo_referente, email_referente, telefono_referente,
                dimensione_azienda, settore_merceologico, fatturato_annuo, iban_aziendale, codice_sdi,
                note, consenso_privacy, consenso_marketing, news_letter, utente_acquisizione, data_consenso, created_by, assigned_agent_id
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?
            )
        `, [
            aziendaId, ragione_sociale || null, partita_iva || null, codice_fiscale?.toUpperCase() || null, codice_ateco || null, descrizione_ateco || null,
            pec_aziendale?.toLowerCase() || null, via_sede_legale || null, civico_sede_legale || null, cap_sede_legale || null, citta_sede_legale || null,
            provincia_sede_legale?.toUpperCase() || null, via_sede_operativa || null, civico_sede_operativa || null,
            cap_sede_operativa || null, citta_sede_operativa || null, provincia_sede_operativa?.toUpperCase() || null,
            nome_referente || null, cognome_referente || null, ruolo_referente || null, email_referente?.toLowerCase() || null, telefono_referente || null,
            dimensione_azienda || null, settore_merceologico || null, fatturato_annuo || null, iban_aziendale || null,
            codice_sdi || null, note || null, 
            consenso_privacy ? 1 : 0, 
            consenso_marketing ? 1 : 0,
            news_letter ? 1 : 0,
            utente_acquisizione || null,
            req.user!.userId,
            assignedAgentId  // 🔐 Assegnazione automatica
        ]);
        
        // Recupera l'azienda appena inserita
        const azienda = await pool.query(`SELECT * FROM clienti_aziende WHERE id = ?`, [aziendaId]);
        
        res.status(201).json({
            success: true,
            message: 'Azienda creata con successo',
            data: azienda.rows[0]
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/clienti/aziende/:id
 * Aggiorna cliente azienda
 */
router.put('/aziende/:id', authorize('operatore', 'admin', 'super_admin'), validateFlexibleId('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const updates: string[] = [];
        const values: any[] = [];
        
        // Campi aggiornabili
        const updatableFields = [
            'ragione_sociale', 'partita_iva', 'codice_fiscale', 'codice_ateco', 'descrizione_ateco', 'pec_aziendale',
            'via_sede_legale', 'civico_sede_legale', 'cap_sede_legale', 'citta_sede_legale', 'provincia_sede_legale',
            'via_sede_operativa', 'civico_sede_operativa', 'cap_sede_operativa', 'citta_sede_operativa', 'provincia_sede_operativa',
            'nome_referente', 'cognome_referente', 'ruolo_referente', 'email_referente', 'telefono_referente',
            'dimensione_azienda', 'settore_merceologico', 'fatturato_annuo', 'iban_aziendale', 'codice_sdi',
            'note', 'consenso_marketing', 'news_letter', 'utente_acquisizione'
        ];
        
        for (const field of updatableFields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nessun campo da aggiornare'
            });
        }
        
        values.push(req.params.id);
        
        await pool.query(`
            UPDATE clienti_aziende 
            SET ${updates.join(', ')}, updated_at = datetime('now')
            WHERE id = ?
        `, values);
        
        const result = await pool.query(`SELECT * FROM clienti_aziende WHERE id = ?`, [req.params.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Azienda non trovata'
            });
        }
        
        res.json({
            success: true,
            message: 'Azienda aggiornata con successo',
            data: result.rows[0]
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/clienti/:tipo/:id
 * Elimina cliente (soft delete)
 */
router.delete('/:tipo/:id', authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipo, id } = req.params;
        
        if (!['privati', 'aziende'].includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo cliente non valido'
            });
        }
        
        // Validazione ID flessibile (UUID o ID generato da CSV)
        if (!id || id.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'ID cliente non valido'
            });
        }
        
        const table = tipo === 'privati' ? 'clienti_privati' : 'clienti_aziende';
        
        // In produzione, preferibile soft delete aggiungendo campo deleted_at
        // Per ora hard delete (CASCADE elimina anche contratti)
        const result = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente non trovato'
            });
        }
        
        res.json({
            success: true,
            message: 'Cliente eliminato con successo'
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/clienti/repair-ids
 * Ripara clienti con ID vuoto o non valido assegnando un nuovo UUID
 * Ritorna conteggio e anteprima degli elementi aggiornati
 */
router.post('/repair-ids', authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const repaired: { tipo: 'privato' | 'azienda'; oldId: string | null; newId: string; nome: string }[] = [];

        // PRIVATI con id vuoto
        const privatiInvalid = await pool.query(
            `SELECT id, nome, cognome FROM clienti_privati WHERE id IS NULL OR id = ''`
        );

        for (const row of privatiInvalid.rows) {
            const oldId = (row as any).id || '';
            const newId = randomUUID();
            // Aggiorna l'ID
            await pool.query(`UPDATE clienti_privati SET id = ? WHERE id IS NULL OR id = ''`, [newId]);
            repaired.push({ tipo: 'privato', oldId: oldId || null, newId, nome: `${(row as any).nome || ''} ${(row as any).cognome || ''}`.trim() });
        }

        // AZIENDE con id vuoto
        const aziendeInvalid = await pool.query(
            `SELECT id, ragione_sociale FROM clienti_aziende WHERE id IS NULL OR id = ''`
        );

        for (const row of aziendeInvalid.rows) {
            const oldId = (row as any).id || '';
            const newId = randomUUID();
            await pool.query(`UPDATE clienti_aziende SET id = ? WHERE id IS NULL OR id = ''`, [newId]);
            repaired.push({ tipo: 'azienda', oldId: oldId || null, newId, nome: (row as any).ragione_sociale || '' });
        }

        // Conteggio finale
        const report = {
            success: true,
            message: repaired.length > 0 ? 'ID clienti riparati con successo' : 'Nessun cliente con ID non valido trovato',
            data: {
                count: repaired.length,
                dettagli: repaired.slice(0, 50) // limita output
            }
        };

        res.json(report);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/clienti/import
 * Importa clienti da file CSV o Excel
 * Supporta campi opzionali - l'import avviene anche con dati parziali
 */
router.post('/import', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nessun file caricato'
            });
        }

        let records: any[] = [];

        // Parse CSV
        if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
            try {
                records = parse(req.file.buffer, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true,
                    bom: true, // Handle UTF-8 BOM
                    relax_column_count: true, // Permetti righe con meno colonne
                    skip_records_with_error: false // Non skippare righe con errori
                });
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Errore parsing CSV: ' + (error as Error).message
                });
            }
        }
        // Parse Excel
        else if (req.file.originalname.match(/\.(xls|xlsx)$/i)) {
            try {
                const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Errore parsing Excel: ' + (error as Error).message
                });
            }
        }

        if (records.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'File vuoto o formato non valido'
            });
        }

        let imported = 0;
        let errors = 0;
        const errorDetails: any[] = [];

        // Helper: pulisce stringhe da HTML e placeholder comuni, converte in null se vuoto
        const normalizeValue = (value: any): any => {
            if (value === undefined || value === null) {
                return null;
            }
            if (typeof value === 'string') {
                let s = value.trim();
                if (s === '') return null;

                // Rimuove tag HTML comuni e spazi non-breaking
                s = s
                    .replace(/<br\s*\/?>/gi, ' ')
                    .replace(/<\/(div|span|p)>/gi, ' ')
                    .replace(/<(div|span|p)[^>]*>/gi, ' ')
                    .replace(/&nbsp;/gi, ' ');

                // Normalizza spazi multipli
                s = s.replace(/\s+/g, ' ').trim();

                if (s === '') return null;
                const lower = s.toLowerCase();
                // Tratta placeholder comuni e residui di tag come null
                const placeholders = new Set(['null', 'undefined', '-', 'n/a', 'na', 'vuoto', 'manca', 'missing', 'div', 'span', 'br', 'p']);
                if (placeholders.has(lower)) return null;
                return s;
            }
            return value;
        };

        // Helpers per risolvere l'agente dal CSV (ID, email, nome)
        const isValidUuid = (val: string): boolean => {
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val || '');
        };

        const findUserIdByEmail = async (emailRaw: any): Promise<string | null> => {
            const email = normalizeValue(emailRaw);
            if (!email) return null;
            try {
                const r = await pool.query(`SELECT id FROM users WHERE email ILIKE ? LIMIT 1`, [email]);
                if (r.rows && r.rows.length > 0) {
                    return (r.rows[0] as any).id || null;
                }
            } catch { /* ignore */ }
            return null;
        };

        const findUserIdByName = async (nameRaw: any): Promise<string | null> => {
            const fullName = normalizeValue(nameRaw);
            if (!fullName) return null;
            const normalize = (s: string) => s
                .replace(/\s+/g, ' ')
                .replace(/[\'\.\-,]/g, '')
                .trim()
                .toLowerCase();
            const cleaned = normalize(String(fullName));
            if (!cleaned) return null;
            try {
                // Match esatto su nome+cognome normalizzati (entrambe le combinazioni)
                const rExact = await pool.query(
                    `SELECT id FROM users WHERE 
                        LOWER(REPLACE(REPLACE(REPLACE(TRIM(nome || ' ' || cognome), '''', ''), '.', ''), ',', '')) = LOWER(?)
                     OR LOWER(REPLACE(REPLACE(REPLACE(TRIM(cognome || ' ' || nome), '''', ''), '.', ''), ',', '')) = LOWER(?)
                     LIMIT 1`,
                    [cleaned, cleaned]
                );
                if (rExact.rows && rExact.rows.length > 0) {
                    return (rExact.rows[0] as any).id || null;
                }

                // Fallback: split per ricavare nome e cognome (prima parola e resto)
                const parts = cleaned.split(' ');
                const first = parts[0];
                const last = parts.slice(1).join(' ');
                if (first && last) {
                    const rSplit = await pool.query(
                        `SELECT id FROM users WHERE 
                            LOWER(REPLACE(TRIM(nome), '''', '')) = LOWER(?) 
                        AND LOWER(REPLACE(TRIM(cognome), '''', '')) = LOWER(?)
                         LIMIT 1`,
                        [first, last]
                    );
                    if (rSplit.rows && rSplit.rows.length > 0) {
                        return (rSplit.rows[0] as any).id || null;
                    }
                    // Fallback fuzzy: LIKE su nome e cognome
                    const rLike = await pool.query(
                        `SELECT id FROM users WHERE 
                            LOWER(REPLACE(TRIM(nome), '''', '')) LIKE LOWER('%' || ? || '%') 
                        AND LOWER(REPLACE(TRIM(cognome), '''', '')) LIKE LOWER('%' || ? || '%')
                         LIMIT 1`,
                        [first, last]
                    );
                    if (rLike.rows && rLike.rows.length > 0) {
                        return (rLike.rows[0] as any).id || null;
                    }
                } else {
                    // Fallback singolo token su nome o cognome
                    const rSingle = await pool.query(
                        `SELECT id FROM users WHERE 
                            LOWER(REPLACE(TRIM(nome), '''', '')) = LOWER(?) 
                         OR LOWER(REPLACE(TRIM(cognome), '''', '')) = LOWER(?)
                         LIMIT 1`,
                        [cleaned, cleaned]
                    );
                    if (rSingle.rows && rSingle.rows.length > 0) {
                        return (rSingle.rows[0] as any).id || null;
                    }
                    // Fallback fuzzy: LIKE su singolo token
                    const rSingleLike = await pool.query(
                        `SELECT id FROM users WHERE 
                            LOWER(REPLACE(TRIM(nome), '''', '')) LIKE LOWER('%' || ? || '%') 
                         OR LOWER(REPLACE(TRIM(cognome), '''', '')) LIKE LOWER('%' || ? || '%')
                         LIMIT 1`,
                        [cleaned, cleaned]
                    );
                    if (rSingleLike.rows && rSingleLike.rows.length > 0) {
                        return (rSingleLike.rows[0] as any).id || null;
                    }
                }
            } catch { /* ignore */ }
            return null;
        };

        const resolveAssignedAgentId = async (record: any, currentUser: any): Promise<string | null> => {
            // Supporta varianti di campo
            const rawId = normalizeValue(record.assigned_agent_id) || normalizeValue(record.agente_id);
            const rawEmail = normalizeValue(record.assigned_agent_email) || normalizeValue(record.agente_email);
            const rawAssignedName = normalizeValue(record.assigned_agent_name);
            const rawAgenteNome = normalizeValue(record.agente_nome);

            // PRIORITÀ ASSOLUTA: se è presente 'agente_nome', usa SOLO quello
            if (rawAgenteNome) {
                const byAgenteNome = await findUserIdByName(rawAgenteNome);
                if (byAgenteNome) return byAgenteNome;
                // Se non trovato, non tentare altri campi per rispettare il requisito "solo agente_nome"
                return null;
            }

            // 1) ID esplicito se UUID valido e esiste (quando agente_nome NON è presente)
            if (rawId && typeof rawId === 'string') {
                if (isValidUuid(rawId)) {
                    try {
                        const r = await pool.query(`SELECT id FROM users WHERE id = ? LIMIT 1`, [rawId]);
                        if (r.rows && r.rows.length > 0) {
                            return (r.rows[0] as any).id || null;
                        }
                    } catch { /* ignore */ }
                } else if (rawId.includes('@')) {
                    // Se non è UUID ma sembra email, prova come email
                    const byEmail = await findUserIdByEmail(rawId);
                    if (byEmail) return byEmail;
                } else {
                    // Altrimenti trattalo come nome completo
                    const byName = await findUserIdByName(rawId);
                    if (byName) return byName;
                }
            }

            // 2) Email esplicita (quando agente_nome NON è presente)
            const byEmail = await findUserIdByEmail(rawEmail);
            if (byEmail) return byEmail;

            // 3) Nome esplicito (assigned_agent_name) come fallback (quando agente_nome NON è presente)
            const byAssignedName = await findUserIdByName(rawAssignedName);
            if (byAssignedName) return byAssignedName;

            // 4) Fallback: se l'utente corrente è operatore/agent, usa il suo id
            if (currentUser && (currentUser.role === 'operatore' || currentUser.role === 'agent')) {
                return currentUser.id;
            }
            return null;
        };

        // Importa ogni record
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowNum = i + 2; // +2 perché la riga 1 è l'header e iniziamo da 0

            try {
                // Usa tipo_record come campo principale, con fallback su tipo per compatibilità
                let tipo = (record.tipo_record || record.tipo || '').toLowerCase().trim();
                
                // 🔧 FIX: se tipo è vuoto ma c'è ragione_sociale, è un'azienda
                if (!tipo && record.ragione_sociale) {
                    tipo = 'cliente_azienda';
                }
                
                // 🔧 FIX: se tipo è vuoto ma ci sono nome/cognome, è un privato
                if (!tipo && (record.nome || record.cognome)) {
                    tipo = 'cliente_privato';
                }
                
                // Normalizza i valori per compatibilità
                if (tipo === 'privato') tipo = 'cliente_privato';
                if (tipo === 'azienda') tipo = 'cliente_azienda';
                
                if (!tipo || (tipo !== 'cliente_privato' && tipo !== 'cliente_azienda')) {
                    throw new Error('Campo "tipo_record" obbligatorio (cliente_privato o cliente_azienda)');
                }

                if (tipo === 'cliente_privato') {
                    // Cliente privato - validazioni minime
                    // Almeno uno tra nome, cognome o email deve essere presente
                    if (!record.nome && !record.cognome && !record.email_principale && !record.codice_fiscale) {
                        throw new Error('Almeno uno tra nome, cognome, email o codice fiscale deve essere presente');
                    }

                    // 🔐 Risolvi agente da CSV (ID/email/nome) con fallback all'utente operatore
                    const user = (req as any).user;
                    const assignedAgentId = await resolveAssignedAgentId(record, user);
                    
                    // 🔄 UPSERT: Cerca se esiste già (per codice_fiscale o email)
                    let clienteId = null;
                    const codiceFiscale = normalizeValue(record.codice_fiscale);
                    const emailPrincipale = normalizeValue(record.email_principale);
                    
                    if (codiceFiscale) {
                        const existing = await pool.query(`
                            SELECT id FROM clienti_privati WHERE codice_fiscale = ?
                        `, [codiceFiscale]);
                        if (existing.rows && existing.rows.length > 0) {
                            clienteId = (existing.rows[0] as any).id;
                        }
                    } else if (emailPrincipale) {
                        const existing = await pool.query(`
                            SELECT id FROM clienti_privati WHERE email_principale = ?
                        `, [emailPrincipale]);
                        if (existing.rows && existing.rows.length > 0) {
                            clienteId = (existing.rows[0] as any).id;
                        }
                    }
                    
                    if (clienteId) {
                        // ✏️ UPDATE cliente esistente
                        await pool.query(`
                            UPDATE clienti_privati SET
                                nome = ?,
                                cognome = ?,
                                codice_fiscale = ?,
                                codice_cliente = ?,
                                data_nascita = ?,
                                email_principale = ?,
                                email_secondaria = ?,
                                telefono_mobile = ?,
                                telefono_fisso = ?,
                                via_residenza = ?,
                                civico_residenza = ?,
                                citta_residenza = ?,
                                cap_residenza = ?,
                                provincia_residenza = ?,
                                pec = ?,
                                consenso_marketing = ?,
                                news_letter = ?,
                                utente_acquisizione = ?,
                                note = ?,
                                assigned_agent_id = COALESCE(?, assigned_agent_id),
                                updated_at = datetime('now')
                            WHERE id = ?
                        `, [
                            normalizeValue(record.nome),
                            normalizeValue(record.cognome),
                            codiceFiscale,
                            normalizeValue(record.codice_cliente),
                            normalizeValue(record.data_nascita),
                            emailPrincipale,
                            normalizeValue(record.email_secondaria),
                            normalizeValue(record.telefono_mobile),
                            normalizeValue(record.telefono_fisso),
                            normalizeValue(record.via),
                            normalizeValue(record.numero_civico),
                            normalizeValue(record.citta),
                            normalizeValue(record.cap),
                            normalizeValue(record.provincia),
                            normalizeValue(record.pec),
                            record.consenso_marketing === '1' || record.consenso_marketing === 1 ? 1 : 0,
                            record.news_letter === '1' || record.news_letter === 1 ? 1 : 0,
                            normalizeValue(record.utente_acquisizione),
                            normalizeValue(record.note),
                            assignedAgentId,
                            clienteId
                        ]);
                    } else {
                        // ➕ INSERT nuovo cliente
                        clienteId = randomUUID();
                        await pool.query(`
                        INSERT INTO clienti_privati (
                            id, nome, cognome, codice_fiscale, codice_cliente, data_nascita,
                            email_principale, email_secondaria, telefono_mobile, telefono_fisso,
                            via_residenza, civico_residenza, citta_residenza, cap_residenza, provincia_residenza,
                            pec, consenso_marketing, news_letter, utente_acquisizione, note, 
                            assigned_agent_id, created_by, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    `, [
                        clienteId,
                        normalizeValue(record.nome),
                        normalizeValue(record.cognome),
                        normalizeValue(record.codice_fiscale),
                        normalizeValue(record.codice_cliente),
                        normalizeValue(record.data_nascita),
                        normalizeValue(record.email_principale),
                        normalizeValue(record.email_secondaria),
                        normalizeValue(record.telefono_mobile),
                        normalizeValue(record.telefono_fisso),
                        normalizeValue(record.via),
                        normalizeValue(record.numero_civico),
                        normalizeValue(record.citta),
                        normalizeValue(record.cap),
                        normalizeValue(record.provincia),
                        normalizeValue(record.pec),
                        record.consenso_marketing === '1' || record.consenso_marketing === 1 ? 1 : 0,
                        record.news_letter === '1' || record.news_letter === 1 ? 1 : 0,
                        normalizeValue(record.utente_acquisizione),
                        normalizeValue(record.note),
                        assignedAgentId,
                        user.id
                    ]);
                    }

                    // 📋 Crea contratto se i campi sono presenti
                    const commodity = normalizeValue(record.commodity);
                    // 🔧 FIX: usa pdp se pod_pdr è vuoto (CSV può avere ordine diverso)
                    const podPdr = normalizeValue(record.pod_pdr) || normalizeValue(record.pdp);
                    // 🔧 FIX: estrai fornitore da nome_offerta se mancante
                    let fornitore = normalizeValue(record.fornitore);
                    if (!fornitore && record.nome_offerta) {
                        fornitore = record.nome_offerta.split(' ')[0];
                    }
                    
                    if (commodity && podPdr && fornitore) {
                        const commodityLower = commodity.toLowerCase().trim();
                        const contrattoId = randomUUID();
                        
                        if (commodityLower === 'power' || commodityLower === 'luce' || commodityLower === 'electricity') {
                            // 🔧 FIX: genera numero_contratto se mancante (usa POD)
                            const numeroContratto = normalizeValue(record.numero_contratto) || `AUTO-${podPdr}`;
                            
                            // 🔧 FIX: genera data_attivazione se mancante (usa data_stipula o oggi)
                            const dataAttivazione = normalizeValue(record.data_attivazione) || normalizeValue(record.data_stipula) || new Date().toISOString().split('T')[0];
                            
                            // 🔧 FIX: genera data_scadenza se mancante (data_attivazione + 24 mesi)
                            let dataScadenza = normalizeValue(record.data_scadenza);
                            if (!dataScadenza && record.data_attivazione) {
                                try {
                                    const dataAtt = new Date(record.data_attivazione.split('/').reverse().join('-'));
                                    dataAtt.setMonth(dataAtt.getMonth() + 24);
                                    dataScadenza = dataAtt.toISOString().split('T')[0];
                                } catch (e) {
                                    const oggi = new Date();
                                    oggi.setMonth(oggi.getMonth() + 24);
                                    dataScadenza = oggi.toISOString().split('T')[0];
                                }
                            } else if (!dataScadenza) {
                                const oggi = new Date();
                                oggi.setMonth(oggi.getMonth() + 24);
                                dataScadenza = oggi.toISOString().split('T')[0];
                            }
                            
                            // 🔧 FIX: prezzo_energia obbligatorio, usa 0.0 se mancante
                            const prezzoEnergia = parseFloat(normalizeValue(record.prezzo_energia) || normalizeValue(record.prezzo) || '0') || 0.0;
                            
                            await pool.query(`
                                INSERT INTO contratti_luce (
                                    id, cliente_privato_id, cliente_azienda_id, tipo_cliente,
                                    numero_contratto, pod, fornitore, commodity, procedure, pdp,
                                    data_stipula, data_inizio, data_scadenza,
                                    agente, nome_offerta, tipo_offerta, validita_offerta,
                                    utente_acquisizione, prezzo_energia, stato, note, created_by, created_at
                                ) VALUES (?, ?, NULL, 'cliente_privato', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                            `, [
                                contrattoId,
                                clienteId,
                                numeroContratto,
                                podPdr,
                                fornitore,
                                commodity,
                                normalizeValue(record.procedure),
                                normalizeValue(record.pdp),
                                normalizeValue(record.data_stipula),
                                dataAttivazione,
                                dataScadenza,
                                normalizeValue(record.agente),
                                normalizeValue(record.nome_offerta),
                                normalizeValue(record.tipo_offerta),
                                normalizeValue(record.validita_offerta),
                                normalizeValue(record.utente_acquisizione),
                                prezzoEnergia,
                                normalizeValue(record.stato_contratto) || 'Documenti da validare',
                                normalizeValue(record.note_contratto),
                                user.id
                            ]);
                        } else if (commodityLower === 'gas') {
                            // 🔧 FIX: genera numero_contratto se mancante (usa PDR)
                            const numeroContratto = normalizeValue(record.numero_contratto) || `AUTO-${podPdr}`;
                            
                            // 🔧 FIX: genera data_attivazione se mancante (usa data_stipula o oggi)
                            const dataAttivazione = normalizeValue(record.data_attivazione) || normalizeValue(record.data_stipula) || new Date().toISOString().split('T')[0];
                            
                            // 🔧 FIX: genera data_scadenza se mancante (data_attivazione + 24 mesi)
                            let dataScadenza = normalizeValue(record.data_scadenza);
                            if (!dataScadenza && record.data_attivazione) {
                                try {
                                    const dataAtt = new Date(record.data_attivazione.split('/').reverse().join('-'));
                                    dataAtt.setMonth(dataAtt.getMonth() + 24);
                                    dataScadenza = dataAtt.toISOString().split('T')[0];
                                } catch (e) {
                                    const oggi = new Date();
                                    oggi.setMonth(oggi.getMonth() + 24);
                                    dataScadenza = oggi.toISOString().split('T')[0];
                                }
                            } else if (!dataScadenza) {
                                const oggi = new Date();
                                oggi.setMonth(oggi.getMonth() + 24);
                                dataScadenza = oggi.toISOString().split('T')[0];
                            }
                            
                            // 🔧 FIX: prezzo_gas obbligatorio, usa 0.0 se mancante
                            const prezzoGas = parseFloat(normalizeValue(record.prezzo_gas) || normalizeValue(record.prezzo) || '0') || 0.0;
                            
                            await pool.query(`
                                INSERT INTO contratti_gas (
                                    id, cliente_privato_id, cliente_azienda_id, tipo_cliente,
                                    numero_contratto, pdr, fornitore, commodity, procedure, pdp,
                                    data_stipula, data_inizio, data_scadenza,
                                    agente, nome_offerta, tipo_offerta, validita_offerta,
                                    utente_acquisizione, prezzo_gas, stato, note, created_by, created_at
                                ) VALUES (?, ?, NULL, 'cliente_privato', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                            `, [
                                contrattoId,
                                clienteId,
                                numeroContratto,
                                podPdr,
                                fornitore,
                                commodity,
                                normalizeValue(record.procedure),
                                normalizeValue(record.pdp),
                                normalizeValue(record.data_stipula),
                                dataAttivazione,
                                dataScadenza,
                                normalizeValue(record.agente),
                                normalizeValue(record.nome_offerta),
                                normalizeValue(record.tipo_offerta),
                                normalizeValue(record.validita_offerta),
                                normalizeValue(record.utente_acquisizione),
                                prezzoGas,
                                normalizeValue(record.stato_contratto) || 'Documenti da validare',
                                normalizeValue(record.note_contratto),
                                user.id
                            ]);
                        }
                    }
                } else {
                    // Cliente azienda - validazioni minime
                    // Almeno uno tra ragione sociale, partita IVA o email deve essere presente
                    if (!record.ragione_sociale && !record.partita_iva && !record.email_referente && !record.email_principale) {
                        throw new Error('Almeno uno tra ragione sociale, partita IVA o email deve essere presente');
                    }

                    // 🔐 Risolvi agente da CSV (ID/email/nome) con fallback all'utente operatore
                    const user = (req as any).user;
                    const assignedAgentId = await resolveAssignedAgentId(record, user);
                    
                    // 🔄 UPSERT: Cerca se esiste già (per partita_iva o ragione_sociale)
                    let clienteId = null;
                    const partitaIva = normalizeValue(record.partita_iva);
                    const ragioneSociale = normalizeValue(record.ragione_sociale);
                    
                    if (partitaIva) {
                        const existing = await pool.query(`
                            SELECT id FROM clienti_aziende WHERE partita_iva = ?
                        `, [partitaIva]);
                        if (existing.rows && existing.rows.length > 0) {
                            clienteId = (existing.rows[0] as any).id;
                        }
                    } else if (ragioneSociale) {
                        const existing = await pool.query(`
                            SELECT id FROM clienti_aziende WHERE ragione_sociale = ?
                        `, [ragioneSociale]);
                        if (existing.rows && existing.rows.length > 0) {
                            clienteId = (existing.rows[0] as any).id;
                        }
                    }
                    
                    if (clienteId) {
                        // ✏️ UPDATE azienda esistente
                        await pool.query(`
                            UPDATE clienti_aziende SET
                                ragione_sociale = ?,
                                partita_iva = ?,
                                codice_fiscale = ?,
                                codice_cliente = ?,
                                codice_ateco = ?,
                                pec_aziendale = ?,
                                codice_sdi = ?,
                                via_sede_legale = ?,
                                civico_sede_legale = ?,
                                citta_sede_legale = ?,
                                cap_sede_legale = ?,
                                provincia_sede_legale = ?,
                                nome_referente = ?,
                                cognome_referente = ?,
                                email_referente = ?,
                                telefono_referente = ?,
                                email_principale = ?,
                                consenso_marketing = ?,
                                news_letter = ?,
                                utente_acquisizione = ?,
                                note = ?,
                                assigned_agent_id = COALESCE(?, assigned_agent_id),
                                updated_at = datetime('now')
                            WHERE id = ?
                        `, [
                            ragioneSociale,
                            partitaIva,
                            normalizeValue(record.codice_fiscale),
                            normalizeValue(record.codice_cliente),
                            normalizeValue(record.codice_ateco),
                            normalizeValue(record.pec),
                            normalizeValue(record.codice_sdi),
                            normalizeValue(record.via),
                            normalizeValue(record.numero_civico),
                            normalizeValue(record.citta),
                            normalizeValue(record.cap),
                            normalizeValue(record.provincia),
                            normalizeValue(record.nome_referente),
                            normalizeValue(record.cognome_referente),
                            normalizeValue(record.email_referente) || normalizeValue(record.email_principale),
                            normalizeValue(record.telefono_referente),
                            normalizeValue(record.email_principale),
                            record.consenso_marketing === '1' || record.consenso_marketing === 1 ? 1 : 0,
                            record.news_letter === '1' || record.news_letter === 1 ? 1 : 0,
                            normalizeValue(record.utente_acquisizione),
                            normalizeValue(record.note),
                            assignedAgentId,
                            clienteId
                        ]);
                    } else {
                        // ➕ INSERT nuova azienda
                        clienteId = randomUUID();
                        await pool.query(`
                        INSERT INTO clienti_aziende (
                            id, ragione_sociale, partita_iva, codice_fiscale, codice_cliente, codice_ateco, pec_aziendale, codice_sdi,
                            via_sede_legale, civico_sede_legale, citta_sede_legale, cap_sede_legale, provincia_sede_legale,
                            nome_referente, cognome_referente, email_referente, telefono_referente,
                            email_principale, consenso_marketing, news_letter, utente_acquisizione, note, 
                            assigned_agent_id, created_by, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    `, [
                        clienteId,
                        normalizeValue(record.ragione_sociale),
                        normalizeValue(record.partita_iva),
                        normalizeValue(record.codice_fiscale),
                        normalizeValue(record.codice_cliente),
                        normalizeValue(record.codice_ateco),
                        normalizeValue(record.pec),
                        normalizeValue(record.codice_sdi),
                        normalizeValue(record.via),
                        normalizeValue(record.numero_civico),
                        normalizeValue(record.citta),
                        normalizeValue(record.cap),
                        normalizeValue(record.provincia),
                        normalizeValue(record.nome_referente),
                        normalizeValue(record.cognome_referente),
                        normalizeValue(record.email_referente) || normalizeValue(record.email_principale),
                        normalizeValue(record.telefono_referente),
                        normalizeValue(record.email_principale),
                        record.consenso_marketing === '1' || record.consenso_marketing === 1 ? 1 : 0,
                        record.news_letter === '1' || record.news_letter === 1 ? 1 : 0,
                        normalizeValue(record.utente_acquisizione),
                        normalizeValue(record.note),
                        assignedAgentId,
                        user.id
                    ]);
                    }

                    // 📋 Crea contratto se i campi sono presenti
                    const commodity = normalizeValue(record.commodity);
                    // 🔧 FIX: usa pdp se pod_pdr è vuoto (CSV può avere ordine diverso)
                    const podPdr = normalizeValue(record.pod_pdr) || normalizeValue(record.pdp);
                    // 🔧 FIX: estrai fornitore da nome_offerta se mancante
                    let fornitore = normalizeValue(record.fornitore);
                    if (!fornitore && record.nome_offerta) {
                        fornitore = record.nome_offerta.split(' ')[0];
                    }
                    
                    if (commodity && podPdr && fornitore) {
                        const commodityLower = commodity.toLowerCase().trim();
                        const contrattoId = randomUUID();
                        
                        if (commodityLower === 'power' || commodityLower === 'luce' || commodityLower === 'electricity') {
                            // 🔧 FIX: genera numero_contratto se mancante (usa POD)
                            const numeroContratto = normalizeValue(record.numero_contratto) || `AUTO-${podPdr}`;
                            
                            // 🔧 FIX: genera data_attivazione se mancante (usa data_stipula o oggi)
                            const dataAttivazione = normalizeValue(record.data_attivazione) || normalizeValue(record.data_stipula) || new Date().toISOString().split('T')[0];
                            
                            // 🔧 FIX: genera data_scadenza se mancante (data_attivazione + 24 mesi)
                            let dataScadenza = normalizeValue(record.data_scadenza);
                            if (!dataScadenza && record.data_attivazione) {
                                try {
                                    const dataAtt = new Date(record.data_attivazione.split('/').reverse().join('-'));
                                    dataAtt.setMonth(dataAtt.getMonth() + 24);
                                    dataScadenza = dataAtt.toISOString().split('T')[0];
                                } catch (e) {
                                    const oggi = new Date();
                                    oggi.setMonth(oggi.getMonth() + 24);
                                    dataScadenza = oggi.toISOString().split('T')[0];
                                }
                            } else if (!dataScadenza) {
                                const oggi = new Date();
                                oggi.setMonth(oggi.getMonth() + 24);
                                dataScadenza = oggi.toISOString().split('T')[0];
                            }
                            
                            // 🔧 FIX: prezzo_energia obbligatorio, usa 0.0 se mancante
                            const prezzoEnergia = parseFloat(normalizeValue(record.prezzo_energia) || normalizeValue(record.prezzo) || '0') || 0.0;
                            
                            await pool.query(`
                                INSERT INTO contratti_luce (
                                    id, cliente_privato_id, cliente_azienda_id, tipo_cliente,
                                    numero_contratto, pod, fornitore, commodity, procedure, pdp,
                                    data_stipula, data_inizio, data_scadenza,
                                    agente, nome_offerta, tipo_offerta, validita_offerta,
                                    utente_acquisizione, prezzo_energia, stato, note, created_by, created_at
                                ) VALUES (?, NULL, ?, 'cliente_azienda', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                            `, [
                                contrattoId,
                                clienteId,
                                numeroContratto,
                                podPdr,
                                fornitore,
                                commodity,
                                normalizeValue(record.procedure),
                                normalizeValue(record.pdp),
                                normalizeValue(record.data_stipula),
                                dataAttivazione,
                                dataScadenza,
                                normalizeValue(record.agente),
                                normalizeValue(record.nome_offerta),
                                normalizeValue(record.tipo_offerta),
                                normalizeValue(record.validita_offerta),
                                normalizeValue(record.utente_acquisizione),
                                prezzoEnergia,
                                normalizeValue(record.stato_contratto) || 'Documenti da validare',
                                normalizeValue(record.note_contratto),
                                user.id
                            ]);
                        } else if (commodityLower === 'gas') {
                            // 🔧 FIX: genera numero_contratto se mancante (usa PDR)
                            const numeroContratto = normalizeValue(record.numero_contratto) || `AUTO-${podPdr}`;
                            
                            // 🔧 FIX: genera data_attivazione se mancante (usa data_stipula o oggi)
                            const dataAttivazione = normalizeValue(record.data_attivazione) || normalizeValue(record.data_stipula) || new Date().toISOString().split('T')[0];
                            
                            // 🔧 FIX: genera data_scadenza se mancante (data_attivazione + 24 mesi)
                            let dataScadenza = normalizeValue(record.data_scadenza);
                            if (!dataScadenza && record.data_attivazione) {
                                try {
                                    const dataAtt = new Date(record.data_attivazione.split('/').reverse().join('-'));
                                    dataAtt.setMonth(dataAtt.getMonth() + 24);
                                    dataScadenza = dataAtt.toISOString().split('T')[0];
                                } catch (e) {
                                    const oggi = new Date();
                                    oggi.setMonth(oggi.getMonth() + 24);
                                    dataScadenza = oggi.toISOString().split('T')[0];
                                }
                            } else if (!dataScadenza) {
                                const oggi = new Date();
                                oggi.setMonth(oggi.getMonth() + 24);
                                dataScadenza = oggi.toISOString().split('T')[0];
                            }
                            
                            // 🔧 FIX: prezzo_gas obbligatorio, usa 0.0 se mancante
                            const prezzoGas = parseFloat(normalizeValue(record.prezzo_gas) || normalizeValue(record.prezzo) || '0') || 0.0;
                            
                            await pool.query(`
                                INSERT INTO contratti_gas (
                                    id, cliente_privato_id, cliente_azienda_id, tipo_cliente,
                                    numero_contratto, pdr, fornitore, commodity, procedure, pdp,
                                    data_stipula, data_inizio, data_scadenza,
                                    agente, nome_offerta, tipo_offerta, validita_offerta,
                                    utente_acquisizione, prezzo_gas, stato, note, created_by, created_at
                                ) VALUES (?, NULL, ?, 'cliente_azienda', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                            `, [
                                contrattoId,
                                clienteId,
                                numeroContratto,
                                podPdr,
                                fornitore,
                                commodity,
                                normalizeValue(record.procedure),
                                normalizeValue(record.pdp),
                                normalizeValue(record.data_stipula),
                                dataAttivazione,
                                dataScadenza,
                                normalizeValue(record.agente),
                                normalizeValue(record.nome_offerta),
                                normalizeValue(record.tipo_offerta),
                                normalizeValue(record.validita_offerta),
                                normalizeValue(record.utente_acquisizione),
                                prezzoGas,
                                normalizeValue(record.stato_contratto) || 'Documenti da validare',
                                normalizeValue(record.note_contratto),
                                user.id
                            ]);
                        }
                    }
                }

                imported++;
            } catch (error) {
                errors++;
                errorDetails.push({
                    row: rowNum,
                    error: (error as Error).message
                });
                console.error(`Errore import riga ${rowNum}:`, error);
            }
        }

        res.json({
            success: true,
            message: `Importazione completata: ${imported} clienti importati, ${errors} errori`,
            data: {
                total: records.length,
                imported,
                errors,
                errorDetails: errorDetails.slice(0, 20) // Limita a 20 errori per la risposta
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/clienti/newsletter
 * Ottieni lista newsletter disponibili
 */
router.get('/newsletter', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await pool.query('SELECT * FROM newsletter WHERE attiva = 1 ORDER BY nome');
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/clienti/:tipo/:id/newsletter/:newsletterId
 * Iscrive un cliente a una newsletter
 */
router.post('/:tipo/:id/newsletter/:newsletterId', validateFlexibleId('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipo, id, newsletterId } = req.params;
        
        // Verifica che il cliente esista
        const tableName = tipo === 'privati' ? 'clienti_privati' : 'clienti_aziende';
        const cliente = await pool.query(`SELECT id FROM ${tableName} WHERE id = ?`, [id]);
        
        if (cliente.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente non trovato'
            });
        }
        
        // Verifica che la newsletter esista
        const newsletter = await pool.query('SELECT id FROM newsletter WHERE id = ? AND attiva = 1', [newsletterId]);
        
        if (newsletter.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Newsletter non trovata'
            });
        }
        
        // Inserisce l'iscrizione (IGNORE se già esiste)
        const insertId = randomUUID();
        await pool.query(`
            INSERT OR IGNORE INTO clienti_newsletter (id, cliente_id, cliente_tipo, newsletter_id, data_iscrizione)
            VALUES (?, ?, ?, ?, datetime('now'))
        `, [insertId, id, tipo === 'privati' ? 'privato' : 'azienda', newsletterId]);
        
        res.json({
            success: true,
            message: 'Cliente iscritto alla newsletter'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/clienti/:tipo/:id/newsletter/:newsletterId
 * Cancella l'iscrizione di un cliente da una newsletter
 */
router.delete('/:tipo/:id/newsletter/:newsletterId', validateFlexibleId('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipo, id, newsletterId } = req.params;
        const clienteTipo = tipo === 'privati' ? 'privato' : 'azienda';
        
        await pool.query(`
            DELETE FROM clienti_newsletter 
            WHERE cliente_id = ? AND cliente_tipo = ? AND newsletter_id = ?
        `, [id, clienteTipo, newsletterId]);
        
        res.json({
            success: true,
            message: 'Iscrizione newsletter cancellata'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/clienti/recalculate-quality
 * Ricalcola data quality score per tutti i clienti
 */
router.post('/recalculate-quality', async (req: Request, res: Response, next: NextFunction) => {
    try {
        let updatedPrivati = 0;
        let updatedAziende = 0;
        
        // Ricalcola per clienti privati
        const privati = await pool.query(`SELECT * FROM clienti_privati`);
        for (const cliente of privati.rows as any[]) {
            const quality = evaluateDataQualityPrivato(cliente);
            await pool.query(`
                UPDATE clienti_privati 
                SET 
                    incomplete_data = ?,
                    missing_fields = ?,
                    data_quality_score = ?,
                    last_quality_check = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                quality.incomplete_data ? 1 : 0,
                JSON.stringify(quality.missing_fields),
                quality.score,
                cliente.id
            ]);
            updatedPrivati++;
        }
        
        // Ricalcola per clienti aziende
        const aziende = await pool.query(`SELECT * FROM clienti_aziende`);
        for (const cliente of aziende.rows as any[]) {
            const quality = evaluateDataQualityAzienda(cliente);
            await pool.query(`
                UPDATE clienti_aziende 
                SET 
                    incomplete_data = ?,
                    missing_fields = ?,
                    data_quality_score = ?,
                    last_quality_check = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                quality.incomplete_data ? 1 : 0,
                JSON.stringify(quality.missing_fields),
                quality.score,
                cliente.id
            ]);
            updatedAziende++;
        }
        
        res.json({
            success: true,
            message: 'Quality score ricalcolato per tutti i clienti',
            updated: {
                privati: updatedPrivati,
                aziende: updatedAziende,
                total: updatedPrivati + updatedAziende
            }
        });
    } catch (error) {
        next(error);
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// GESTIONE STATO CLIENTE + AUTOMAZIONE COMMISSIONI
// ════════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/clienti/:tipo/:id/stato
 * Aggiorna lo stato del cliente e gestisce automazione commissioni
 */
router.put('/:tipo/:id/stato', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipo, id } = req.params;
        const { stato, note } = req.body;
        const user = (req as any).user;

        if (!['privato', 'azienda'].includes(tipo)) {
            return res.status(400).json({ success: false, message: 'Tipo cliente non valido' });
        }

        const tabella = tipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';

        // Recupera stato attuale e dati cliente
        const clienteResult = await pool.query(
            `SELECT stato, assigned_agent_id, commissione_pattuita, commissione_pagata 
             FROM ${tabella} WHERE id = ?`,
            [id]
        );

        if (clienteResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cliente non trovato' });
        }

        const cliente = clienteResult.rows[0] as any;
        const statoVecchio = cliente.stato;

        // Aggiorna stato
        await pool.query(
            `UPDATE ${tabella} SET stato = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [stato, id]
        );

        // Salva storico cambio stato (opzionale - solo se la tabella esiste)
        try {
            await pool.query(
                `INSERT INTO storico_stati_cliente 
                 (cliente_id, cliente_tipo, stato_precedente, stato_nuovo, note, changed_by) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [id, tipo, statoVecchio, stato, note || null, user.id]
            );
            console.log('✅ Storico stato salvato');
        } catch (storicoError: any) {
            console.log('⚠️  Tabella storico_stati_cliente non disponibile, salto il salvataggio dello storico');
            console.log('   Errore:', storicoError.message);
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // AUTOMAZIONE PAGAMENTO COMMISSIONE
        // ═══════════════════════════════════════════════════════════════════════════
        
        const statiPagamento = ['Da attivare', 'Chiusa', 'chiusa', 'Attivo']; // Supporta sia maiuscolo che minuscolo
        
        console.log('🔍 Verifica condizioni automazione commissione:');
        console.log('   - Stato nuovo:', stato);
        console.log('   - Stati che triggerano pagamento:', statiPagamento);
        console.log('   - Stato è valido?', statiPagamento.includes(stato));
        console.log('   - Commissione già pagata?', cliente.commissione_pagata);
        console.log('   - Commissione pattuita:', cliente.commissione_pattuita);
        console.log('   - Agente assegnato:', cliente.assigned_agent_id);
        
        if (statiPagamento.includes(stato) && 
            !cliente.commissione_pagata && 
            cliente.commissione_pattuita && 
            cliente.assigned_agent_id) {
            
            console.log(`💰 Automazione commissione: Cliente ${id} - Stato "${stato}" - Commissione: €${cliente.commissione_pattuita}`);
            
            let commissioneGenerata = false;
            let movimentoId = null;
            
            // Controlla se esistono già compensi specifici nella tabella compensi per questo cliente
            let compensiEsistenti = [];
            try {
                const compensiResult = await pool.query(
                    `SELECT id, contratto_tipo, importo FROM compensi 
                     WHERE cliente_id = ? AND agente_id = ?`,
                    [id, cliente.assigned_agent_id]
                );
                compensiEsistenti = compensiResult.rows;
                console.log(`🔍 Compensi esistenti nella tabella compensi: ${compensiEsistenti.length}`);
            } catch (compensiError: any) {
                console.log('⚠️  Tabella compensi non disponibile, procedo con la logica standard');
            }
            
            // Crea movimento contabile automatico solo se non esistono compensi specifici
            if (compensiEsistenti.length === 0) {
                try {
                    const movimentoResult = await pool.query(
                        `INSERT INTO contabilita_movimenti 
                         (tipo, importo, agent_id, cliente_id, cliente_tipo, descrizione, stato, data_movimento)
                         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [
                            'compenso',
                            cliente.commissione_pattuita,
                            cliente.assigned_agent_id,
                            id,
                            tipo,
                            `Commissione automatica - Stato: ${stato}`,
                            'da_pagare'
                        ]
                    );
                    movimentoId = (movimentoResult as any).lastInsertRowid || (movimentoResult as any).insertId;
                    console.log(`✅ Movimento contabile creato: ID ${movimentoId}`);
                    commissioneGenerata = true;
                } catch (movimentoError: any) {
                    console.log('⚠️  Tabella contabilita_movimenti non disponibile, salto la creazione del movimento');
                    console.log('   Errore:', movimentoError.message);
                }
            } else {
                console.log(`ℹ️ Compensi specifici già esistenti (${compensiEsistenti.length}), salto la creazione del compenso generico`);
                commissioneGenerata = true; // Considera la commissione come gestita dai compensi specifici
            }

            // Marca commissione come pagata (opzionale - solo se i campi esistono)
            try {
                await pool.query(
                    `UPDATE ${tabella} 
                     SET commissione_pagata = 1, 
                         data_pagamento_commissione = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [id]
                );
                console.log('✅ Commissione marcata come pagata');
            } catch (updateError: any) {
                console.log('⚠️  Campi commissione non disponibili nella tabella cliente, salto l\'aggiornamento');
                console.log('   Errore:', updateError.message);
            }

            // Notifica agente (opzionale - solo se la tabella esiste)
            try {
                await pool.query(
                    `INSERT INTO notifiche 
                     (user_id, tipo, titolo, messaggio, link, is_read) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        cliente.assigned_agent_id,
                        'commissione',
                        '💰 Nuova Commissione',
                        `Commissione di €${cliente.commissione_pattuita} generata per il cliente!`,
                        `/contabilita`,
                        0
                    ]
                );
                console.log('✅ Notifica inviata all\'agente');
            } catch (notificaError: any) {
                console.log('⚠️  Tabella notifiche non disponibile, salto l\'invio della notifica');
                console.log('   Errore:', notificaError.message);
            }

            if (commissioneGenerata) {
                return res.json({
                    success: true,
                    message: `Stato aggiornato a "${stato}" e commissione di €${cliente.commissione_pattuita} generata automaticamente`,
                    commissione_generata: true,
                    importo: cliente.commissione_pattuita,
                    movimento_id: movimentoId
                });
            } else {
                console.log('⚠️  Automazione commissioni non completata - tabelle mancanti');
            }
        }

        res.json({
            success: true,
            message: `Stato aggiornato a "${stato}"`,
            commissione_generata: false
        });
    } catch (error) {
        console.error('Errore aggiornamento stato:', error);
        next(error);
    }
});

/**
 * POST /api/clienti/woocommerce-import
 * Nuovo endpoint per importazione CSV con mappatura campi (stile WooCommerce)
 */
router.post('/woocommerce-import', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nessun file caricato'
            });
        }

        const { mappings, clientType } = req.body;
        
        if (!mappings) {
            return res.status(400).json({
                success: false,
                message: 'Mappature campi obbligatorie'
            });
        }

        const fieldMappings = JSON.parse(mappings);
        
        if (!Array.isArray(fieldMappings) || fieldMappings.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Mappature campi non valide'
            });
        }

        let records: any[] = [];

        // Parse CSV
        if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
            try {
                records = parse(req.file.buffer, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true,
                    bom: true,
                    relax_column_count: true,
                    skip_records_with_error: false
                });
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Errore parsing CSV: ' + (error as Error).message
                });
            }
        }
        // Parse Excel
        else if (req.file.originalname.match(/\.(xls|xlsx)$/i)) {
            try {
                const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Errore parsing Excel: ' + (error as Error).message
                });
            }
        }

        if (records.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'File vuoto o formato non valido'
            });
        }

        let imported = 0;
        let errors = 0;
        const errorDetails: any[] = [];

        // Helper: pulisce stringhe da HTML e placeholder comuni, converte in null se vuoto
        const normalizeValue = (value: any): any => {
            if (value === undefined || value === null) {
                return null;
            }
            if (typeof value === 'string') {
                let s = value.trim();
                if (s === '') return null;

                // Rimuove tag HTML comuni e spazi non-breaking
                s = s
                    .replace(/<br\s*\/?>/gi, ' ')
                    .replace(/<\/(div|span|p)>/gi, ' ')
                    .replace(/<(div|span|p)[^>]*>/gi, ' ')
                    .replace(/&nbsp;/gi, ' ');

                // Normalizza spazi multipli
                s = s.replace(/\s+/g, ' ').trim();

                if (s === '') return null;
                const lower = s.toLowerCase();
                const placeholders = new Set(['null', 'undefined', '-', 'n/a', 'na', 'vuoto', 'manca', 'missing', 'div', 'span', 'br', 'p']);
                if (placeholders.has(lower)) return null;
                return s;
            }
            return value;
        };

        // Crea mappa di mappatura per accesso rapido
        const mappingMap = new Map();
        fieldMappings.forEach((mapping: any) => {
            mappingMap.set(mapping.csvColumn, mapping.systemField);
        });

        // Importa ogni record
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowNum = i + 2;

            try {
                // Applica mappature per creare l'oggetto cliente
                const clienteData: any = {};
                
                // Applica le mappature definite dall'utente
                for (const [csvColumn, systemField] of mappingMap) {
                    if (record[csvColumn] !== undefined) {
                        clienteData[systemField] = normalizeValue(record[csvColumn]);
                    }
                }

                // Helper per trovare l'ID utente tramite email
                const findUserIdByEmail = async (email?: string): Promise<string | null> => {
                    if (!email) return null;
                    try {
                        const res = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
                        const row = res.rows?.[0];
                        return row ? String((row as any).id) : null;
                    } catch {
                        return null;
                    }
                };

                // Determina l'agente assegnato
                const user = (req as any).user;
                let assignedAgentId: string | null = null;

                // 1) ID diretto dal CSV (se presente)
                if (clienteData.assigned_agent_id) {
                    assignedAgentId = String(clienteData.assigned_agent_id);
                }

                // 2) Altrimenti prova via email (supporta chiavi italiane/inglesi)
                if (!assignedAgentId) {
                    const emailAgente = clienteData.assigned_agent_email || clienteData.agente_email || clienteData.agent_email || clienteData.assegnato_a_email;
                    if (emailAgente) {
                        assignedAgentId = await findUserIdByEmail(emailAgente);
                    }
                }

                // 3) Fallback: assegna automaticamente se operatore
                if (!assignedAgentId && (user.role === 'operatore' || user.role === 'agent')) {
                    assignedAgentId = user.id;
                }

                if (clientType === 'privato') {
                    // Validazioni minime per cliente privato
                    if (!clienteData.nome && !clienteData.cognome && !clienteData.email_principale && !clienteData.codice_fiscale) {
                        throw new Error('Almeno uno tra nome, cognome, email o codice fiscale deve essere presente');
                    }

                    // UPSERT: Cerca se esiste già
                    let clienteId = null;
                    const codiceFiscale = clienteData.codice_fiscale;
                    const emailPrincipale = clienteData.email_principale;

                    if (codiceFiscale || emailPrincipale) {
                        const existingQuery = `
                            SELECT id FROM clienti_privati 
                            WHERE (codice_fiscale = ? AND codice_fiscale IS NOT NULL) 
                               OR (email_principale = ? AND email_principale IS NOT NULL)
                        `;
                        const existing = await pool.query(existingQuery, [codiceFiscale, emailPrincipale]);
                        
                        if (existing.rows.length > 0) {
                            clienteId = (existing.rows[0] as any).id;
                        }
                    }

                    if (clienteId) {
                        // UPDATE cliente esistente
                        const updateFields: string[] = [];
                        const updateValues: any[] = [];
                        
                        Object.keys(clienteData).forEach(key => {
                            if (clienteData[key] !== null && key !== 'assigned_agent_email') {
                                updateFields.push(`${key} = ?`);
                                updateValues.push(clienteData[key]);
                            }
                        });

                        // Aggiungi assigned_agent_id se determinato
                        if (assignedAgentId) {
                            updateFields.push('assigned_agent_id = ?');
                            updateValues.push(assignedAgentId);
                        }

                        if (updateFields.length > 0) {
                            updateValues.push(clienteId);
                            await pool.query(
                                `UPDATE clienti_privati SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                                updateValues
                            );
                        }
                    } else {
                        // INSERT nuovo cliente
                        const insertData = {
                            id: randomUUID(),
                            assigned_agent_id: assignedAgentId,
                            created_by: user.id,
                            ...clienteData
                        };

                        const fields = Object.keys(insertData).filter(key => insertData[key as keyof typeof insertData] !== null);
                        const values = fields.map(key => insertData[key as keyof typeof insertData]);
                        const placeholders = fields.map(() => '?').join(', ');

                        await pool.query(
                            `INSERT INTO clienti_privati (${fields.join(', ')}) VALUES (${placeholders})`,
                            values
                        );
                    }

                } else if (clientType === 'azienda') {
                    // Validazioni minime per azienda
                    if (!clienteData.ragione_sociale && !clienteData.partita_iva && !clienteData.email_referente) {
                        throw new Error('Almeno uno tra ragione sociale, partita IVA o email referente deve essere presente');
                    }

                    // UPSERT: Cerca se esiste già
                    let clienteId = null;
                    const partitaIva = clienteData.partita_iva;
                    const ragioneSociale = clienteData.ragione_sociale;

                    if (partitaIva || ragioneSociale) {
                        const existingQuery = `
                            SELECT id FROM clienti_aziende 
                            WHERE (partita_iva = ? AND partita_iva IS NOT NULL) 
                               OR (ragione_sociale = ? AND ragione_sociale IS NOT NULL)
                        `;
                        const existing = await pool.query(existingQuery, [partitaIva, ragioneSociale]);
                        
                        if (existing.rows.length > 0) {
                            clienteId = (existing.rows[0] as any).id;
                        }
                    }

                    if (clienteId) {
                        // UPDATE azienda esistente
                        const updateFields: string[] = [];
                        const updateValues: any[] = [];
                        
                        Object.keys(clienteData).forEach(key => {
                            if (clienteData[key] !== null && key !== 'assigned_agent_email') {
                                updateFields.push(`${key} = ?`);
                                updateValues.push(clienteData[key]);
                            }
                        });

                        // Aggiungi assigned_agent_id se determinato
                        if (assignedAgentId) {
                            updateFields.push('assigned_agent_id = ?');
                            updateValues.push(assignedAgentId);
                        }

                        if (updateFields.length > 0) {
                            updateValues.push(clienteId);
                            await pool.query(
                                `UPDATE clienti_aziende SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                                updateValues
                            );
                        }
                    } else {
                        // INSERT nuova azienda
                        const insertData = {
                            id: randomUUID(),
                            assigned_agent_id: assignedAgentId,
                            created_by: user.id,
                            ...clienteData
                        };

                        const fields = Object.keys(insertData).filter(key => insertData[key as keyof typeof insertData] !== null);
                        const values = fields.map(key => insertData[key as keyof typeof insertData]);
                        const placeholders = fields.map(() => '?').join(', ');

                        await pool.query(
                            `INSERT INTO clienti_aziende (${fields.join(', ')}) VALUES (${placeholders})`,
                            values
                        );
                    }
                }

                imported++;

            } catch (error: any) {
                errors++;
                errorDetails.push({
                    row: rowNum,
                    message: error.message,
                    data: record
                });
                console.error(`Errore riga ${rowNum}:`, error.message);
            }
        }

        res.json({
            success: true,
            message: `Importazione completata: ${imported} clienti importati, ${errors} errori`,
            imported,
            total: records.length,
            errors,
            errorDetails: errorDetails.slice(0, 10) // Limita a 10 errori per evitare response troppo grandi
        });

    } catch (error) {
        console.error('Errore importazione WooCommerce:', error);
        next(error);
    }
});

/**
 * GET /api/clienti/:tipo/:id/export-complete
 * Esportazione completa di tutti i dati del cliente
 * Include: dati cliente, contratti, documenti, email, note, storico eventi
 */
router.get('/:tipo/:id/export-complete', validateFlexibleId('id'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipo, id } = req.params;
        
        if (!['privato', 'azienda'].includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo cliente non valido. Utilizzare "privato" o "azienda"'
            });
        }

        // 1. DATI CLIENTE BASE
        let clienteData: any = {};
        
        if (tipo === 'privato') {
            const clienteResult = await pool.query(`
                SELECT 
                    cp.*,
                    u.nome || ' ' || u.cognome as agente_nome,
                    u.email as agente_email
                FROM clienti_privati cp
                LEFT JOIN users u ON cp.assigned_agent_id = u.id
                WHERE cp.id = ?
            `, [id]);
            
            if (clienteResult.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente privato non trovato'
                });
            }
            
            clienteData = clienteResult.rows[0];
        } else {
            const clienteResult = await pool.query(`
                SELECT 
                    ca.*,
                    u.nome || ' ' || u.cognome as agente_nome,
                    u.email as agente_email
                FROM clienti_aziende ca
                LEFT JOIN users u ON ca.assigned_agent_id = u.id
                WHERE ca.id = ?
            `, [id]);
            
            if (clienteResult.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Cliente azienda non trovato'
                });
            }
            
            clienteData = clienteResult.rows[0];
        }

        // 2. CONTRATTI LUCE - con fallback per storico_prezzi
        let contrattiLuceResult;
        try {
            contrattiLuceResult = await pool.query(`
                SELECT 
                    cl.*,
                    sp.data_modifica as ultima_modifica_prezzo,
                    sp.prezzo_energia as ultimo_prezzo_energia,
                    sp.prezzo_trasporto as ultimo_prezzo_trasporto
                FROM contratti_luce cl
                LEFT JOIN storico_prezzi sp ON cl.id = sp.contratto_id AND sp.tipo_contratto = 'luce'
                WHERE cl.${tipo === 'privato' ? 'cliente_privato_id' : 'cliente_azienda_id'} = ?
                ORDER BY cl.data_inizio DESC
            `, [id]);
        } catch (error) {
            // Fallback senza storico_prezzi se la tabella non esiste
            console.warn('Tabella storico_prezzi non trovata, carico contratti senza storico prezzi');
            contrattiLuceResult = await pool.query(`
                SELECT cl.*
                FROM contratti_luce cl
                WHERE cl.${tipo === 'privato' ? 'cliente_privato_id' : 'cliente_azienda_id'} = ?
                ORDER BY cl.data_inizio DESC
            `, [id]);
        }

        // 3. CONTRATTI GAS - con fallback per storico_prezzi
        let contrattiGasResult;
        try {
            contrattiGasResult = await pool.query(`
                SELECT 
                    cg.*,
                    sp.data_modifica as ultima_modifica_prezzo,
                    sp.prezzo_energia as ultimo_prezzo_energia,
                    sp.prezzo_trasporto as ultimo_prezzo_trasporto
                FROM contratti_gas cg
                LEFT JOIN storico_prezzi sp ON cg.id = sp.contratto_id AND sp.tipo_contratto = 'gas'
                WHERE cg.${tipo === 'privato' ? 'cliente_privato_id' : 'cliente_azienda_id'} = ?
                ORDER BY cg.data_inizio DESC
            `, [id]);
        } catch (error) {
            // Fallback senza storico_prezzi se la tabella non esiste
            console.warn('Tabella storico_prezzi non trovata, carico contratti senza storico prezzi');
            contrattiGasResult = await pool.query(`
                SELECT cg.*
                FROM contratti_gas cg
                WHERE cg.${tipo === 'privato' ? 'cliente_privato_id' : 'cliente_azienda_id'} = ?
                ORDER BY cg.data_inizio DESC
            `, [id]);
        }

        // 4. DOCUMENTI - con fallback
        let documentiResult;
        try {
            documentiResult = await pool.query(`
                SELECT 
                    d.*,
                    u.nome || ' ' || u.cognome as caricato_da_nome
                FROM documenti d
                LEFT JOIN users u ON d.caricato_da = u.id
                WHERE d.cliente_id = ? AND d.cliente_tipo = ?
                ORDER BY d.data_caricamento DESC
            `, [id, tipo]);
        } catch (error) {
            console.warn('Tabella documenti non trovata, utilizzo fallback con array vuoto');
            documentiResult = { rows: [], rowCount: 0 };
        }

        // 5. EMAIL INVIATE - con fallback
        let emailResult;
        try {
            emailResult = await pool.query(`
                SELECT 
                    ei.*,
                    u.nome || ' ' || u.cognome as mittente_nome,
                    u.email as mittente_email
                FROM email_inviate ei
                LEFT JOIN users u ON ei.mittente_id = u.id
                WHERE ei.cliente_id = ? AND ei.cliente_tipo = ?
                ORDER BY ei.data_invio DESC
            `, [id, tipo]);
        } catch (error) {
            console.warn('Tabella email_inviate non trovata, utilizzo fallback con array vuoto');
            emailResult = { rows: [], rowCount: 0 };
        }

        // 6. NOTE (con fallback per tabella mancante)
        let noteResult;
        try {
            noteResult = await pool.query(`
                SELECT 
                    n.*,
                    u.nome || ' ' || u.cognome as autore_nome
                FROM note n
                LEFT JOIN users u ON n.autore_id = u.id
                WHERE n.cliente_id = ? AND n.cliente_tipo = ?
                ORDER BY n.created_at DESC
            `, [id, tipo]);
        } catch (error) {
            // Fallback se la tabella 'note' non esiste
            console.warn('Tabella note non trovata, utilizzo fallback con array vuoto');
            noteResult = { rows: [], rowCount: 0 };
        }

        // 7. STORICO EVENTI (AUDIT LOG) - con fallback
        let storicoResult;
        try {
            storicoResult = await pool.query(`
                SELECT 
                    al.*,
                    u.nome || ' ' || u.cognome as utente_nome
                FROM audit_log al
                LEFT JOIN users u ON al.utente_id = u.id
                WHERE al.cliente_id = ? AND al.cliente_tipo = ?
                ORDER BY al.timestamp DESC
            `, [id, tipo]);
        } catch (error) {
            console.warn('Tabella audit_log non trovata, utilizzo fallback con array vuoto');
            storicoResult = { rows: [], rowCount: 0 };
        }

        // 8. STORICO PROCEDURE CONTRATTI - con fallback
        let storicoProcedureResult;
        try {
            storicoProcedureResult = await pool.query(`
                SELECT 
                    sp.*,
                    u.nome || ' ' || u.cognome as utente_nome
                FROM storico_procedure sp
                LEFT JOIN users u ON sp.utente_id = u.id
                WHERE sp.contratto_id IN (
                    SELECT id FROM contratti_luce WHERE ${tipo === 'privato' ? 'cliente_privato_id' : 'cliente_azienda_id'} = ?
                    UNION
                    SELECT id FROM contratti_gas WHERE ${tipo === 'privato' ? 'cliente_privato_id' : 'cliente_azienda_id'} = ?
                )
                ORDER BY sp.data_procedura DESC
            `, [id, id]);
        } catch (error) {
            console.warn('Tabella storico_procedure non trovata, utilizzo fallback con array vuoto');
            storicoProcedureResult = { rows: [], rowCount: 0 };
        }

        // 9. CONSENSI GDPR - con fallback
        let consensiResult;
        try {
            consensiResult = await pool.query(`
                SELECT *
                FROM consensi_gdpr
                WHERE cliente_id = ? AND cliente_tipo = ?
                ORDER BY data_consenso DESC
            `, [id, tipo]);
        } catch (error) {
            console.warn('Tabella consensi_gdpr non trovata, utilizzo fallback con array vuoto');
            consensiResult = { rows: [], rowCount: 0 };
        }

        // 10. TASKS ASSOCIATI - con fallback
        let tasksResult;
        try {
            tasksResult = await pool.query(`
                SELECT 
                    t.*,
                    u.nome || ' ' || u.cognome as assegnato_a_nome
                FROM tasks t
                LEFT JOIN users u ON t.assegnato_a = u.id
                WHERE t.cliente_id = ? AND t.cliente_tipo = ?
                ORDER BY t.data_scadenza ASC
            `, [id, tipo]);
        } catch (error) {
            console.warn('Tabella tasks non trovata, utilizzo fallback con array vuoto');
            tasksResult = { rows: [], rowCount: 0 };
        }

        // Costruisci la risposta completa
        const exportData = {
            cliente: {
                tipo: tipo,
                dati: clienteData,
                statistiche: {
                    contratti_luce: contrattiLuceResult.rowCount,
                    contratti_gas: contrattiGasResult.rowCount,
                    documenti: documentiResult.rowCount,
                    email_inviate: emailResult.rowCount,
                    note: noteResult.rowCount,
                    eventi_storico: storicoResult.rowCount,
                    procedure_contratti: storicoProcedureResult.rowCount,
                    tasks: tasksResult.rowCount
                }
            },
            contratti: {
                luce: contrattiLuceResult.rows,
                gas: contrattiGasResult.rows
            },
            documenti: documentiResult.rows,
            comunicazioni: {
                email: emailResult.rows
            },
            note: noteResult.rows,
            storico: {
                eventi: storicoResult.rows,
                procedure_contratti: storicoProcedureResult.rows
            },
            consensi_gdpr: consensiResult.rows,
            tasks: tasksResult.rows,
            metadata: {
                data_esportazione: new Date().toISOString(),
                versione_export: '1.0',
                totale_record: {
                    contratti_luce: contrattiLuceResult.rowCount,
                    contratti_gas: contrattiGasResult.rowCount,
                    documenti: documentiResult.rowCount,
                    email: emailResult.rowCount,
                    note: noteResult.rowCount,
                    eventi: storicoResult.rowCount,
                    procedure: storicoProcedureResult.rowCount,
                    consensi: consensiResult.rowCount,
                    tasks: tasksResult.rowCount
                }
            }
        };

        res.json({
            success: true,
            data: exportData,
            message: 'Esportazione completa dati cliente completata con successo'
        });

    } catch (error) {
        console.error('Errore esportazione completa cliente:', error);
        next(error);
    }
});

export default router;

