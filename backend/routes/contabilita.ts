/**
 * ════════════════════════════════════════════════════════════════════════════════
 * API CONTABILITÀ - Gestione Compensi e Movimenti
 * ════════════════════════════════════════════════════════════════════════════════
 * 
 * Endpoint per:
 * - Dashboard contabilità (saldi, movimenti, compensi)
 * - Gestione regole compensi
 * - Calcolo automatico compensi da contratti
 * - Report pagamenti agenti
 * - Movimenti contabili
 */

import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { requireRole, canAccessContabilita, logOperation, createNotifica, UserRole } from '../middleware/roleCheck';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Applica autenticazione a tutte le route
router.use(authenticate);

// ════════════════════════════════════════════════════════════════════════════════
// DASHBOARD CONTABILITÀ
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/contabilita/dashboard
 * Dashboard principale con riepilogo contabile
 */
router.get('/dashboard', requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        const user = req.user as unknown as UserRole;
        
        // Filtro agenti in base al ruolo
        let agentFilter = '';
        let agentParams: any[] = [];
        
        if (user.role === 'admin') {
            const agentiAgenzia = await pool.query(`
                SELECT id FROM users 
                WHERE (parent_id = ? OR id = ?) AND is_active = 1
            `, [user.id, user.id]);
            
            const agentIds = (agentiAgenzia.rows as { id: number }[]).map(a => a.id);
            if (agentIds.length > 0) {
                agentFilter = `WHERE agent_id IN (${agentIds.map(() => '?').join(',')})`;
                agentParams = agentIds;
            } else {
                agentFilter = 'WHERE 1 = 0';
            }
        }
        
        // Totale compensi da pagare (da entrambe le tabelle)
        const compensiDaPagareResult = await pool.query(`
            SELECT COALESCE(SUM(importo), 0) as totale
            FROM (
                SELECT importo FROM contabilita_movimenti
                ${agentFilter}
                ${agentFilter ? 'AND' : 'WHERE'} tipo = 'compenso'
                AND stato = 'da_pagare'
                
                UNION ALL
                
                SELECT importo FROM compensi
                ${agentFilter ? agentFilter.replace('agent_id', 'agente_id') : 'WHERE 1=1'}
                ${agentFilter ? 'AND' : 'AND'} stato = 'da_pagare'
            ) AS tutti_compensi
        `, agentParams);
        const compensiDaPagare = (compensiDaPagareResult.rows[0] as { totale: number });
        
        // Totale compensi pagati questo mese (da entrambe le tabelle)
        const compensiPagatiMeseResult = await pool.query(`
            SELECT COALESCE(SUM(importo), 0) as totale
            FROM (
                SELECT importo FROM contabilita_movimenti
                ${agentFilter}
                ${agentFilter ? 'AND' : 'WHERE'} tipo = 'compenso'
                AND stato = 'pagato'
                AND strftime('%Y-%m', data_pagamento) = strftime('%Y-%m', 'now')
                
                UNION ALL
                
                SELECT importo FROM compensi
                ${agentFilter ? agentFilter.replace('agent_id', 'agente_id') : 'WHERE 1=1'}
                ${agentFilter ? 'AND' : 'AND'} stato = 'pagato'
                AND strftime('%Y-%m', data_pagamento) = strftime('%Y-%m', 'now')
            ) AS tutti_compensi_pagati
        `, agentParams);
        const compensiPagatiMese = (compensiPagatiMeseResult.rows[0] as { totale: number });
        
        // Totale incassi attesi da clienti
        const incassiAttesiResult = await pool.query(`
            SELECT COALESCE(SUM(importo), 0) as totale
            FROM contabilita_movimenti
            ${agentFilter}
            ${agentFilter ? 'AND' : 'WHERE'} tipo = 'pagamento_cliente'
            AND stato = 'da_pagare'
        `, agentParams);
        const incassiAttesi = (incassiAttesiResult.rows[0] as { totale: number });
        
        // Compensi per agente (da entrambe le tabelle)
        const compensiPerAgenteResult = await pool.query(`
            SELECT 
                u.id,
                u.nome,
                u.cognome,
                u.email,
                COALESCE(SUM(CASE WHEN compensi_uniti.stato = 'da_pagare' OR compensi_uniti.stato = 'maturato' THEN compensi_uniti.importo ELSE 0 END), 0) as da_pagare,
                COALESCE(SUM(CASE WHEN compensi_uniti.stato = 'pagato' AND strftime('%Y-%m', compensi_uniti.data_pagamento) = strftime('%Y-%m', 'now') THEN compensi_uniti.importo ELSE 0 END), 0) as pagato_mese,
                COALESCE(SUM(CASE WHEN compensi_uniti.stato = 'pagato' THEN compensi_uniti.importo ELSE 0 END), 0) as totale_pagato
            FROM users u
            LEFT JOIN (
                SELECT agent_id, importo, stato, data_pagamento FROM contabilita_movimenti WHERE tipo = 'compenso'
                UNION ALL
                SELECT agente_id as agent_id, importo, stato, data_pagamento FROM compensi
            ) compensi_uniti ON compensi_uniti.agent_id = u.id
            WHERE u.role IN ('operatore', 'agent') AND u.is_active = 1
            ${user.role === 'admin' ? `AND (u.parent_id = ${user.id} OR u.id = ${user.id})` : ''}
            GROUP BY u.id
            ORDER BY da_pagare DESC
        `);
        const compensiPerAgente = compensiPerAgenteResult.rows;
        
        // Ultimi 10 movimenti (da entrambe le tabelle, evitando duplicati)
        const ultimiMovimentiResult = await pool.query(`
            SELECT 
                movimenti_uniti.*,
                u.nome as agent_nome,
                u.cognome as agent_cognome
            FROM (
                -- Prima prendi i movimenti da contabilita_movimenti che NON sono compensi duplicati
                SELECT 
                    id,
                    tipo,
                    agent_id,
                    importo,
                    stato,
                    data_movimento,
                    data_pagamento,
                    descrizione,
                    note,
                    created_at,
                    'contabilita_movimenti' as source_table
                FROM contabilita_movimenti
                ${agentFilter}
                ${agentFilter ? 'AND' : 'WHERE'} NOT (
                    tipo = 'compenso' 
                    AND EXISTS (
                        SELECT 1 FROM compensi c 
                        WHERE c.agente_id = agent_id 
                        AND c.cliente_id IS NOT NULL
                        AND ABS(c.importo - importo) < 0.01
                    )
                )
                
                UNION ALL
                
                -- Poi prendi tutti i compensi dalla tabella compensi
                SELECT 
                    id,
                    tipo,
                    agente_id as agent_id,
                    importo,
                    stato,
                    data_maturazione as data_movimento,
                    data_pagamento,
                    CASE 
                        WHEN contratto_tipo IS NOT NULL THEN 
                            descrizione || ' (' || UPPER(contratto_tipo) || ')'
                        ELSE descrizione 
                    END as descrizione,
                    NULL as note,
                    data_maturazione as created_at,
                    'compensi' as source_table
                FROM compensi
                ${agentFilter ? agentFilter.replace('agent_id', 'agente_id') : 'WHERE 1=1'}
            ) movimenti_uniti
            LEFT JOIN users u ON u.id = movimenti_uniti.agent_id
            ORDER BY movimenti_uniti.created_at DESC
            LIMIT 10
        `, agentParams);
        const ultimiMovimenti = ultimiMovimentiResult.rows;
        
        res.json({
            success: true,
            data: {
                riepilogo: {
                    compensi_da_pagare: compensiDaPagare.totale,
                    compensi_pagati_mese: compensiPagatiMese.totale,
                    incassi_attesi: incassiAttesi.totale,
                    saldo: incassiAttesi.totale - compensiDaPagare.totale
                },
                compensi_per_agente: compensiPerAgente,
                ultimi_movimenti: ultimiMovimenti
            }
        });
    } catch (error: any) {
        console.error('Errore dashboard contabilità:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore caricamento dashboard contabilità',
            error: error.message 
        });
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// GESTIONE REGOLE COMPENSI
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/contabilita/regole-compensi
 * Ottieni tutte le regole compensi
 */
router.get('/regole-compensi', requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        const regoleResult = await pool.query(`
            SELECT * FROM compensi_regole
            ORDER BY tipo_contratto, procedura, nome_regola
        `);
        
        res.json({ success: true, data: regoleResult.rows });
    } catch (error: any) {
        console.error('Errore caricamento regole compensi:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore caricamento regole compensi',
            error: error.message 
        });
    }
});

/**
 * POST /api/contabilita/regole-compensi
 * Crea nuova regola compenso
 */
router.post('/regole-compensi', requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        const user = req.user as unknown as UserRole;
        const {
            nome_regola,
            descrizione,
            tipo_contratto,
            procedura,
            tipo_compenso,
            importo_fisso,
            percentuale,
            base_calcolo,
            fasce_compenso,
            attivo,
            valido_da,
            valido_fino
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO compensi_regole (
                nome_regola, descrizione, tipo_contratto, procedura,
                tipo_compenso, importo_fisso, percentuale, base_calcolo,
                fasce_compenso, attivo, valido_da, valido_fino
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nome_regola, descrizione, tipo_contratto, procedura,
            tipo_compenso, importo_fisso || 0, percentuale || 0, base_calcolo || null,
            fasce_compenso ? JSON.stringify(fasce_compenso) : null,
            attivo !== false ? 1 : 0,
            valido_da || null, valido_fino || null
        ]);
        
        logOperation(user.id, 'CREATE', 'regola_compenso', 0);
        
        res.json({ 
            success: true, 
            message: 'Regola compenso creata',
            data: { success: true }
        });
    } catch (error: any) {
        console.error('Errore creazione regola compenso:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore creazione regola compenso',
            error: error.message 
        });
    }
});

/**
 * PUT /api/contabilita/regole-compensi/:id
 * Aggiorna regola compenso
 */
router.put('/regole-compensi/:id', requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        const user = req.user as unknown as UserRole;
        const id = parseInt(req.params.id);
        const updates = req.body;
        
        // Costruisci query UPDATE dinamica
        const fields = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => `${k} = ?`).join(', ');
        
        const values = Object.keys(updates)
            .filter(k => k !== 'id')
            .map(k => updates[k]);
        
        await pool.query(`
            UPDATE compensi_regole 
            SET ${fields}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [...values, id]);
        
        logOperation(user.id, 'UPDATE', 'regola_compenso', id, updates);
        
        res.json({ success: true, message: 'Regola compenso aggiornata' });
    } catch (error: any) {
        console.error('Errore aggiornamento regola compenso:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore aggiornamento regola compenso',
            error: error.message 
        });
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// CALCOLO COMPENSI DA CONTRATTI
// ════════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/contabilita/calcola-compenso
 * Calcola compenso per un contratto specifico
 */
router.post('/calcola-compenso', requireRole('super_admin', 'admin', 'agent'), async (req: Request, res: Response) => {
    try {
        const { contratto_id, contratto_tipo, procedura } = req.body;
        
        if (!contratto_id || !contratto_tipo) {
            return res.status(400).json({ 
                success: false, 
                message: 'Parametri mancanti: contratto_id e contratto_tipo richiesti' 
            });
        }
        
        // Trova regola compenso applicabile
        const regolaResult = await pool.query(`
            SELECT * FROM compensi_regole
            WHERE tipo_contratto = ?
            AND (procedura = ? OR procedura IS NULL)
            AND attivo = 1
            AND (valido_da IS NULL OR valido_da <= DATE('now'))
            AND (valido_fino IS NULL OR valido_fino >= DATE('now'))
            ORDER BY procedura DESC
            LIMIT 1
        `, [contratto_tipo, procedura || null]);
        const regola = regolaResult.rows[0] as any;
        
        if (!regola) {
            return res.status(404).json({ 
                success: false, 
                message: 'Nessuna regola compenso trovata per questo tipo di contratto' 
            });
        }
        
        let importo_calcolato = 0;
        
        if (regola.tipo_compenso === 'fisso') {
            importo_calcolato = regola.importo_fisso;
        } else if (regola.tipo_compenso === 'percentuale') {
            // TODO: Calcolare percentuale in base a base_calcolo
            importo_calcolato = regola.importo_fisso; // Fallback
        }
        
        res.json({ 
            success: true, 
            data: {
                regola_applicata: regola.nome_regola,
                importo_calcolato,
                dettagli_calcolo: {
                    tipo_compenso: regola.tipo_compenso,
                    importo_fisso: regola.importo_fisso,
                    percentuale: regola.percentuale
                }
            }
        });
    } catch (error: any) {
        console.error('Errore calcolo compenso:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore calcolo compenso',
            error: error.message 
        });
    }
});

/**
 * POST /api/contabilita/genera-compenso
 * Genera movimento contabile per compenso agente
 */
router.post('/genera-compenso', requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        const user = req.user as unknown as UserRole;
        const {
            agent_id,
            contratto_id,
            contratto_tipo,
            importo,
            data_competenza,
            causale
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO movimenti_contabili (
                tipo_movimento, agent_id, contratto_id, contratto_tipo,
                importo, stato, data_competenza, causale, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'compenso_agente',
            agent_id,
            contratto_id,
            contratto_tipo,
            importo,
            'da_pagare',
            data_competenza,
            causale,
            user.id
        ]);
        
        // Notifica agente
        createNotifica(
            agent_id,
            'compenso_maturato',
            'Nuovo Compenso Maturato',
            `Hai maturato un compenso di €${importo} per ${causale}`,
            `/contabilita/miei-compensi`
        );
        
        logOperation(user.id, 'CREATE', 'compenso', 0);
        
        res.json({ 
            success: true, 
            message: 'Compenso generato',
            data: { success: true }
        });
    } catch (error: any) {
        console.error('Errore generazione compenso:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore generazione compenso',
            error: error.message 
        });
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// MOVIMENTI CONTABILI
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/contabilita/movimenti
 * Ottieni lista movimenti contabili
 */
router.get('/movimenti', canAccessContabilita, async (req: Request, res: Response) => {
    try {
        const { tipo, stato, agent_id, data_da, data_a } = req.query;
        const user = req.user as unknown as UserRole;
        
        let whereConditions: string[] = [];
        let params: any[] = [];
        
        // Filtra per ruolo
        if (user.role === 'agent') {
            whereConditions.push('m.agent_id = ?');
            params.push(user.id);
        } else if (user.role === 'admin') {
            const agentiAgenziaResult = await pool.query(`
                SELECT id FROM users 
                WHERE (parent_id = ? OR id = ?) AND is_active = 1
            `, [user.id, user.id]);
            
            const agentIds = (agentiAgenziaResult.rows as { id: number }[]).map(a => a.id);
            if (agentIds.length > 0) {
                whereConditions.push(`m.agent_id IN (${agentIds.map(() => '?').join(',')})`);
                params.push(...agentIds);
            }
        }
        
        if (tipo) {
            whereConditions.push('m.tipo = ?');
            params.push(tipo);
        }
        
        if (stato) {
            whereConditions.push('m.stato = ?');
            params.push(stato);
        }
        
        if (agent_id) {
            whereConditions.push('m.agent_id = ?');
            params.push(agent_id);
        }
        
        if (data_da) {
            whereConditions.push('m.data_movimento >= ?');
            params.push(data_da);
        }
        
        if (data_a) {
            whereConditions.push('m.data_movimento <= ?');
            params.push(data_a);
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        // Modifica le condizioni per supportare entrambe le tabelle
        let whereClauseCompensi = whereClause.replace(/m\./g, 'c.');
        whereClauseCompensi = whereClauseCompensi.replace(/agent_id/g, 'agente_id');
        
        // Se non ci sono condizioni WHERE, aggiungi una condizione sempre vera per i compensi
        if (!whereClauseCompensi) {
            whereClauseCompensi = 'WHERE 1=1';
        }
        
        const movimentiResult = await pool.query(`
            SELECT 
                movimenti_uniti.*,
                u.nome as agent_nome,
                u.cognome as agent_cognome,
                u.email as agent_email
            FROM (
                -- Prima prendi i movimenti da contabilita_movimenti che NON sono compensi duplicati
                SELECT 
                    id,
                    tipo,
                    agent_id,
                    importo,
                    stato,
                    data_movimento,
                    data_pagamento,
                    descrizione,
                    note,
                    created_at,
                    'contabilita_movimenti' as source_table
                FROM contabilita_movimenti m
                ${whereClause}
                ${whereClause ? 'AND' : 'WHERE'} NOT (
                    tipo = 'compenso' 
                    AND EXISTS (
                        SELECT 1 FROM compensi c 
                        WHERE c.agente_id = m.agent_id 
                        AND c.cliente_id = m.cliente_id
                        AND ABS(c.importo - m.importo) < 0.01
                    )
                )
                
                UNION ALL
                
                -- Poi prendi tutti i compensi dalla tabella compensi
                SELECT 
                    id,
                    tipo,
                    agente_id as agent_id,
                    importo,
                    stato,
                    data_maturazione as data_movimento,
                    data_pagamento,
                    CASE 
                        WHEN contratto_tipo IS NOT NULL THEN 
                            descrizione || ' (' || UPPER(contratto_tipo) || ')'
                        ELSE descrizione 
                    END as descrizione,
                    NULL as note,
                    data_maturazione as created_at,
                    'compensi' as source_table
                FROM compensi c
                ${whereClauseCompensi}
            ) movimenti_uniti
            LEFT JOIN users u ON u.id = movimenti_uniti.agent_id
            ORDER BY movimenti_uniti.data_movimento DESC, movimenti_uniti.created_at DESC
            LIMIT 100
        `, [...params, ...params]);
        
        res.json({ success: true, data: movimentiResult.rows });
    } catch (error: any) {
        console.error('Errore caricamento movimenti:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore caricamento movimenti',
            error: error.message 
        });
    }
});

/**
 * PUT /api/contabilita/movimenti/:id/paga
 * Segna movimento come pagato (supporta sia contabilita_movimenti che compensi)
 */
router.put('/movimenti/:id/paga', requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        const user = req.user as unknown as UserRole;
        const id = req.params.id; // Mantieni come stringa per supportare UUID
        const { data_pagamento, metodo_pagamento, note, source_table } = req.body;
        
        let movimento: { agent_id?: number; agente_id?: number; importo: number; descrizione: string } | null = null;
        
        // Determina quale tabella aggiornare
        if (source_table === 'compensi') {
            // Aggiorna tabella compensi
            await pool.query(`
                UPDATE compensi
                SET 
                    stato = 'pagato',
                    data_pagamento = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [data_pagamento || new Date().toISOString().split('T')[0], id]);
            
            // Recupera dati per notifica
            const movimentoResult = await pool.query(`
                SELECT agente_id, importo, descrizione FROM compensi WHERE id = ?
            `, [id]);
            movimento = movimentoResult.rows[0] as { agente_id: number; importo: number; descrizione: string };
            
        } else {
            // Aggiorna tabella contabilita_movimenti (comportamento originale)
            await pool.query(`
                UPDATE contabilita_movimenti
                SET 
                    stato = 'pagato',
                    data_pagamento = ?,
                    note = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [data_pagamento || new Date().toISOString().split('T')[0], note || null, id]);
            
            // Recupera dati per notifica
            const movimentoResult = await pool.query(`
                SELECT agent_id, importo, descrizione FROM contabilita_movimenti WHERE id = ?
            `, [id]);
            movimento = movimentoResult.rows[0] as { agent_id: number; importo: number; descrizione: string };
        }
        
        // Notifica agente
        if (movimento) {
            const agentId = movimento.agent_id || movimento.agente_id;
            if (agentId) {
                createNotifica(
                    agentId,
                    'compenso_maturato',
                    'Compenso Pagato',
                    `È stato pagato il compenso di €${movimento.importo} per ${movimento.descrizione}`,
                    `/contabilita/miei-compensi`
                );
            }
        }
        
        logOperation(user.id, 'PAY', source_table === 'compensi' ? 'compenso' : 'movimento', id);
        
        res.json({ success: true, message: 'Movimento segnato come pagato' });
    } catch (error: any) {
        console.error('Errore pagamento movimento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore pagamento movimento',
            error: error.message 
        });
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// CREA MOVIMENTO MANUALE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/contabilita/movimenti
 * Crea un nuovo movimento contabile manualmente
 */
router.post('/movimenti', requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        const user = req.user as unknown as UserRole;
        const { tipo, agent_id, cliente_id, cliente_tipo, importo, descrizione, data_movimento, note, stato } = req.body;
        
        // Validazione
        if (!tipo || !importo || !descrizione) {
            return res.status(400).json({ 
                success: false, 
                message: 'Campi obbligatori: tipo, importo, descrizione' 
            });
        }
        
        if (importo <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'L\'importo deve essere maggiore di zero' 
            });
        }
        
        const result = await pool.query(`
            INSERT INTO contabilita_movimenti 
            (tipo, agent_id, cliente_id, cliente_tipo, importo, descrizione, data_movimento, note, stato, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
            tipo,
            agent_id || null,
            cliente_id || null,
            cliente_tipo || null,
            importo,
            descrizione,
            data_movimento || new Date().toISOString().split('T')[0],
            note || null,
            stato || 'da_pagare'
        ]);
        
        // Log operazione
        logOperation(user.id, 'CREATE', 'movimento', 0, {
            tipo,
            importo,
            descrizione
        });
        
        // Notifica agente se presente
        if (agent_id && tipo === 'compenso') {
            createNotifica(
                agent_id,
                'compenso',
                '💰 Nuovo Compenso Registrato',
                `È stato registrato un nuovo compenso di €${importo}: ${descrizione}`,
                `/contabilita`
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Movimento creato con successo',
            data: { id: result.rows[0] }
        });
    } catch (error: any) {
        console.error('Errore creazione movimento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore creazione movimento',
            error: error.message 
        });
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// ELIMINA MOVIMENTO
// ════════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/contabilita/movimenti/:id
 * Elimina un movimento contabile
 */
router.delete('/movimenti/:id', requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        const user = req.user as unknown as UserRole;
        const id = parseInt(req.params.id);
        
        // Verifica che il movimento esista
        const checkResult = await pool.query(`
            SELECT id, tipo, importo, descrizione, stato FROM contabilita_movimenti WHERE id = ?
        `, [id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Movimento non trovato' 
            });
        }
        
        const movimento = checkResult.rows[0] as any;
        
        // Se è già pagato, chiedi conferma (dovrebbe essere gestito dal frontend)
        if (movimento.stato === 'pagato') {
            // Permetti l'eliminazione ma logga come operazione critica
            logOperation(user.id, 'DELETE_PAID', 'movimento', id, {
                tipo: movimento.tipo,
                importo: movimento.importo,
                descrizione: movimento.descrizione
            });
        }
        
        // Elimina il movimento
        await pool.query(`DELETE FROM contabilita_movimenti WHERE id = ?`, [id]);
        
        logOperation(user.id, 'DELETE', 'movimento', id);
        
        res.json({ 
            success: true, 
            message: 'Movimento eliminato con successo' 
        });
    } catch (error: any) {
        console.error('Errore eliminazione movimento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore eliminazione movimento',
            error: error.message 
        });
    }
});

export default router;

