/**
 * ════════════════════════════════════════════════════════════════════════════════
 * API GESTIONE AGENTI
 * ════════════════════════════════════════════════════════════════════════════════
 * 
 * Endpoint per:
 * - Lista agenti (filtrata per ruolo)
 * - Creazione rapida agente
 * - Assegnazione cliente ad agente
 * - Riassegnazione con log e notifiche
 */

import express, { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireRole, canReassignCliente, logOperation, createNotifica, UserRole } from '../middleware/roleCheck';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = express.Router();

// Applica autenticazione a tutte le route
router.use(authenticate);

/**
 * GET /api/agenti/:id/pagamenti
 * Ottieni pagamenti dell'agente con filtri per data
 */
router.get('/:id/pagamenti', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { data_inizio, data_fine } = req.query;
        
        // Verifica che l'agente esista
        const agenteResult = await pool.query(`
            SELECT id, nome, cognome, email FROM users 
            WHERE id = ? AND ruolo IN ('operatore', 'admin', 'super_admin')
        `, [id]);
        
        if (agenteResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Agente non trovato' });
        }
        
        const agente = agenteResult.rows[0] as { id: number; nome: string; cognome: string; email: string };
        
        // Costruisci filtri per data
        let dateFilter = '';
        let dateParams: any[] = [];
        
        if (data_inizio && data_fine) {
            dateFilter = `AND DATE(COALESCE(data_pagamento, data_maturazione)) BETWEEN ? AND ?`;
            dateParams = [data_inizio, data_fine];
        } else if (data_inizio) {
            dateFilter = `AND DATE(COALESCE(data_pagamento, data_maturazione)) >= ?`;
            dateParams = [data_inizio];
        } else if (data_fine) {
            dateFilter = `AND DATE(COALESCE(data_pagamento, data_maturazione)) <= ?`;
            dateParams = [data_fine];
        }
        
        // Query per ottenere tutti i pagamenti dell'agente
        const pagamentiQuery = `
            SELECT 
                pagamenti_uniti.*,
                COALESCE(cp.nome, ca.ragione_sociale) as cliente_nome,
                COALESCE(cp.cognome, '') as cliente_cognome,
                COALESCE(cp.email_principale, ca.email_principale) as cliente_email,
                CASE 
                    WHEN cp.id IS NOT NULL THEN 'Privato'
                    WHEN ca.id IS NOT NULL THEN 'Azienda'
                    ELSE 'N/A'
                END as cliente_tipo
            FROM (
                SELECT 
                    id,
                    'contabilita_movimenti' as source_table,
                    importo,
                    stato,
                    data_movimento as data_maturazione,
                    data_pagamento,
                    descrizione,
                    note,
                    tipo,
                    NULL as cliente_id,
                    NULL as contratto_id,
                    NULL as contratto_tipo,
                    created_at
                FROM contabilita_movimenti
                WHERE agent_id = ? AND tipo = 'compenso'
                ${dateFilter}
                
                UNION ALL
                
                SELECT 
                    id,
                    'compensi' as source_table,
                    importo,
                    stato,
                    data_maturazione,
                    data_pagamento,
                    descrizione,
                    NULL as note,
                    tipo,
                    cliente_id,
                    contratto_id,
                    contratto_tipo,
                    created_at
                FROM compensi
                WHERE agente_id = ?
                ${dateFilter}
            ) pagamenti_uniti
            LEFT JOIN clienti_privati cp ON pagamenti_uniti.cliente_id = cp.id AND pagamenti_uniti.source_table = 'compensi'
            LEFT JOIN clienti_aziende ca ON pagamenti_uniti.cliente_id = ca.id AND pagamenti_uniti.source_table = 'compensi'
            ORDER BY 
                CASE 
                    WHEN pagamenti_uniti.data_pagamento IS NOT NULL THEN pagamenti_uniti.data_pagamento
                    ELSE pagamenti_uniti.data_maturazione
                END DESC
        `;
        
        const pagamentiResult = await pool.query(pagamentiQuery, [id, ...dateParams, id, ...dateParams]);
        
        // Calcola statistiche
        const totaleEffettuati = pagamentiResult.rows
            .filter((p: any) => p.stato === 'pagato')
            .reduce((sum: number, p: any) => sum + parseFloat(p.importo), 0);
            
        const totaleDaEffettuare = pagamentiResult.rows
            .filter((p: any) => p.stato === 'maturato' || p.stato === 'da_pagare')
            .reduce((sum: number, p: any) => sum + parseFloat(p.importo), 0);
            
        const countEffettuati = pagamentiResult.rows.filter((p: any) => p.stato === 'pagato').length;
        const countDaEffettuare = pagamentiResult.rows.filter((p: any) => p.stato === 'maturato' || p.stato === 'da_pagare').length;
        
        res.json({
            success: true,
            data: {
                agente: agente,
                pagamenti: pagamentiResult.rows,
                statistiche: {
                    totale_effettuati: totaleEffettuati,
                    totale_da_effettuare: totaleDaEffettuare,
                    count_effettuati: countEffettuati,
                    count_da_effettuare: countDaEffettuare,
                    totale_generale: totaleEffettuati + totaleDaEffettuare
                },
                filtri: {
                    data_inizio: data_inizio || null,
                    data_fine: data_fine || null
                }
            }
        });
    } catch (error: any) {
        console.error('Errore caricamento pagamenti agente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore caricamento pagamenti agente',
            error: error.message 
        });
    }
});

/**
 * GET /api/agenti/:id/pagamenti/export
 * Esporta pagamenti dell'agente in formato Excel
 */
router.get('/:id/pagamenti/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { data_inizio, data_fine, formato = 'excel' } = req.query;
        
        // Verifica che l'agente esista
        const agenteResult = await pool.query(`
            SELECT id, nome, cognome, email FROM users 
            WHERE id = ? AND ruolo IN ('operatore', 'admin', 'super_admin')
        `, [id]);
        
        if (agenteResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Agente non trovato' });
        }
        
        const agente = agenteResult.rows[0] as { id: number; nome: string; cognome: string; email: string };
        
        // Costruisci filtri per data
        let dateFilter = '';
        let dateParams: any[] = [];
        
        if (data_inizio && data_fine) {
            dateFilter = `AND DATE(COALESCE(data_pagamento, data_maturazione)) BETWEEN ? AND ?`;
            dateParams = [data_inizio, data_fine];
        } else if (data_inizio) {
            dateFilter = `AND DATE(COALESCE(data_pagamento, data_maturazione)) >= ?`;
            dateParams = [data_inizio];
        } else if (data_fine) {
            dateFilter = `AND DATE(COALESCE(data_pagamento, data_maturazione)) <= ?`;
            dateParams = [data_fine];
        }
        
        // Query per ottenere tutti i pagamenti dell'agente per export
        const pagamentiQuery = `
            SELECT 
                pagamenti_uniti.*,
                COALESCE(cp.nome, ca.ragione_sociale) as cliente_nome,
                COALESCE(cp.cognome, '') as cliente_cognome,
                COALESCE(cp.email_principale, ca.email_principale) as cliente_email,
                CASE 
                    WHEN cp.id IS NOT NULL THEN 'Privato'
                    WHEN ca.id IS NOT NULL THEN 'Azienda'
                    ELSE 'N/A'
                END as cliente_tipo
            FROM (
                SELECT 
                    id,
                    'contabilita_movimenti' as source_table,
                    importo,
                    stato,
                    data_movimento as data_maturazione,
                    data_pagamento,
                    descrizione,
                    note,
                    tipo,
                    NULL as cliente_id,
                    NULL as contratto_id,
                    NULL as contratto_tipo,
                    created_at
                FROM contabilita_movimenti
                WHERE agent_id = ? AND tipo = 'compenso'
                ${dateFilter}
                
                UNION ALL
                
                SELECT 
                    id,
                    'compensi' as source_table,
                    importo,
                    stato,
                    data_maturazione,
                    data_pagamento,
                    descrizione,
                    NULL as note,
                    tipo,
                    cliente_id,
                    contratto_id,
                    contratto_tipo,
                    created_at
                FROM compensi
                WHERE agente_id = ?
                ${dateFilter}
            ) pagamenti_uniti
            LEFT JOIN clienti_privati cp ON pagamenti_uniti.cliente_id = cp.id AND pagamenti_uniti.source_table = 'compensi'
            LEFT JOIN clienti_aziende ca ON pagamenti_uniti.cliente_id = ca.id AND pagamenti_uniti.source_table = 'compensi'
            ORDER BY 
                CASE 
                    WHEN pagamenti_uniti.data_pagamento IS NOT NULL THEN pagamenti_uniti.data_pagamento
                    ELSE pagamenti_uniti.data_maturazione
                END DESC
        `;
        
        const pagamentiResult = await pool.query(pagamentiQuery, [id, ...dateParams, id, ...dateParams]);
        
        if (formato === 'csv') {
            // Genera CSV
            const csvHeader = 'ID,Tipo Pagamento,Importo,Stato,Data Maturazione,Data Pagamento,Descrizione,Cliente,Tipo Cliente,Contratto ID,Contratto Tipo,Note\n';
            const csvRows = pagamentiResult.rows.map((p: any) => {
                const cliente = p.cliente_nome ? `${p.cliente_nome} ${p.cliente_cognome}`.trim() : 'N/A';
                return [
                    p.id,
                    p.tipo || 'compenso',
                    p.importo,
                    p.stato,
                    p.data_maturazione || '',
                    p.data_pagamento || '',
                    `"${(p.descrizione || '').replace(/"/g, '""')}"`,
                    `"${cliente}"`,
                    p.cliente_tipo || 'N/A',
                    p.contratto_id || '',
                    p.contratto_tipo || '',
                    `"${(p.note || '').replace(/"/g, '""')}"`
                ].join(',');
            }).join('\n');
            
            const csvContent = csvHeader + csvRows;
            const filename = `pagamenti_${agente.nome}_${agente.cognome}_${new Date().toISOString().split('T')[0]}.csv`;
            
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send('\ufeff' + csvContent); // BOM per UTF-8
        } else {
            // Restituisci JSON per Excel (da gestire nel frontend)
            const filename = `pagamenti_${agente.nome}_${agente.cognome}_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            res.json({
                success: true,
                data: {
                    agente: agente,
                    pagamenti: pagamentiResult.rows,
                    filename: filename,
                    filtri: {
                        data_inizio: data_inizio || null,
                        data_fine: data_fine || null
                    }
                }
            });
        }
    } catch (error: any) {
        console.error('Errore export pagamenti agente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore export pagamenti agente',
            error: error.message 
        });
    }
});


/**
 * GET /api/agenti/:id/panoramica
 * Ottieni dettagli completi per panoramica agente
 */
router.get('/:id/panoramica', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        // Ottieni dati base agente
        const agenteResult = await pool.query(`
            SELECT 
                id,
                nome,
                cognome,
                email,
                phone as telefono,
                agency_name,
                role,
                is_active,
                created_at,
                commissioni_luce_default,
                commissioni_gas_default
            FROM users 
            WHERE id = ? AND role IN ('operatore', 'admin', 'super_admin')
        `, [id]);
        
        if (agenteResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Agente non trovato' });
        }
        
        const agente = agenteResult.rows[0] as { id: number; nome: string; cognome: string; email: string };
        
        // Calcola metriche performance
        const [
            clientiAssegnatiResult,
            clientiPrivatiResult,
            clientiAziendeResult,
            contrattiLuceResult,
            contrattiGasResult,
            commissioniResult
        ] = await Promise.all([
            // Clienti assegnati (conteggio)
            pool.query(`
                SELECT COUNT(*) as count FROM (
                    SELECT id FROM clienti_privati WHERE assigned_agent_id = ?
                    UNION ALL
                    SELECT id FROM clienti_aziende WHERE assigned_agent_id = ?
                ) as clienti_totali
            `, [id, id]),
            
            // Lista clienti privati assegnati
            pool.query(`
                SELECT id, nome, cognome, email_principale as email, telefono_mobile as telefono, codice_fiscale
                FROM clienti_privati 
                WHERE assigned_agent_id = ?
                ORDER BY nome, cognome
            `, [id]),
            
            // Lista clienti aziende assegnati
            pool.query(`
                SELECT id, ragione_sociale as nome, '' as cognome, email_referente as email, telefono_referente as telefono, partita_iva
                FROM clienti_aziende 
                WHERE assigned_agent_id = ?
                ORDER BY ragione_sociale
            `, [id]),
            
            // Contratti luce attivi
            pool.query(`
                SELECT COUNT(*) as count FROM contratti_luce 
                WHERE stato IN ('attivo', 'in_corso')
                AND (
                    cliente_privato_id IN (SELECT id FROM clienti_privati WHERE assigned_agent_id = ?)
                    OR cliente_azienda_id IN (SELECT id FROM clienti_aziende WHERE assigned_agent_id = ?)
                )
            `, [id, id]),
            
            // Contratti gas attivi
            pool.query(`
                SELECT COUNT(*) as count FROM contratti_gas 
                WHERE stato IN ('attivo', 'in_corso')
                AND (
                    cliente_privato_id IN (SELECT id FROM clienti_privati WHERE assigned_agent_id = ?)
                    OR cliente_azienda_id IN (SELECT id FROM clienti_aziende WHERE assigned_agent_id = ?)
                )
            `, [id, id]),
            
            // Commissioni totali
            pool.query(`
                SELECT 
                    COALESCE(SUM(importo), 0) as totale,
                    COALESCE(SUM(CASE WHEN strftime('%m', created_at) = strftime('%m', 'now') AND strftime('%Y', created_at) = strftime('%Y', 'now') THEN importo ELSE 0 END), 0) as mese_corrente
                FROM compensi 
                WHERE agente_id = ?
            `, [id])
        ]);
        
        // Calcola nuovi clienti settimana corrente
        const nuoviClientiResult = await pool.query(`
            SELECT COUNT(*) as count FROM (
                SELECT created_at FROM clienti_privati 
                WHERE assigned_agent_id = ? 
                AND created_at >= date('now', 'weekday 0', '-7 days')
                UNION ALL
                SELECT created_at FROM clienti_aziende 
                WHERE assigned_agent_id = ? 
                AND created_at >= date('now', 'weekday 0', '-7 days')
            ) as nuovi_clienti
        `, [id, id]);
        
        // Calcola performance mensile (simulata per ora)
        const performanceMensile = Math.random() * 15 + 5; // 5-20%
        
        const clientiAssegnati = (clientiAssegnatiResult as any).rows[0]?.count || 0;
        const clientiPrivati = (clientiPrivatiResult as any).rows || [];
        const clientiAziende = (clientiAziendeResult as any).rows || [];
        const contrattiLuce = (contrattiLuceResult as any).rows[0]?.count || 0;
        const contrattiGas = (contrattiGasResult as any).rows[0]?.count || 0;
        const commissioni = (commissioniResult as any).rows[0] || { totale: 0, mese_corrente: 0 };
        const nuoviClienti = (nuoviClientiResult as any).rows[0]?.count || 0;
        
        const agenteDettaglio = {
            ...(agente as any),
            clienti_assegnati: clientiAssegnati,
            clienti_privati: clientiPrivati,
            clienti_aziende: clientiAziende,
            guadagno_mese_corrente: parseFloat(commissioni.mese_corrente?.toString() || '0') || 0,
            contratti_luce_attivi: contrattiLuce,
            contratti_gas_attivi: contrattiGas,
            performance_mensile: performanceMensile,
            nuovi_clienti_settimana: nuoviClienti,
            contratti_totali: contrattiLuce + contrattiGas,
            contratti_luce: contrattiLuce,
            contratti_gas: contrattiGas,
            commissioni_totali: parseFloat(commissioni.totale?.toString() || '0') || 0,
            commissioni_mese: parseFloat(commissioni.mese_corrente?.toString() || '0') || 0
        };
        
        res.json({
            success: true,
            data: agenteDettaglio
        });
        
    } catch (error) {
        console.error('Errore caricamento panoramica agente:', error);
        next(error);
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// LISTA AGENTI
// ════════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/agenti
 * Ottieni lista agenti (filtrata per ruolo utente)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const user = req.user as unknown as UserRole;
        
        // 🔐 Tutti possono vedere la lista agenti (necessario per dropdown in contratti)
        // Gli operatori vedono solo la lista, non possono modificare/eliminare
        
        let query = `
            SELECT 
                id,
                email,
                nome,
                cognome,
                ruolo,
                attivo,
                created_at
            FROM users
            WHERE ruolo IN ('operatore', 'admin', 'super_admin')
            AND attivo = 1
        `;
        
        const params: any[] = [];
        
        // Admin vede solo gli agenti della sua agenzia
        // Nel database SQLite attuale non esiste parent_id o agenzie; gli admin vedono tutti.
        
        query += ` ORDER BY nome, cognome`;
        
        const agentiResult = await pool.query(query, params);
        
        // Aggiungi conteggio clienti assegnati; le commissioni dipendono da tabelle opzionali
        const agenti = await Promise.all(
            (agentiResult.rows as any[]).map(async (agente) => {
                const countPrivati = await pool.query(
                    'SELECT COUNT(*) as count FROM clienti_privati WHERE assigned_agent_id = ?',
                    [agente.id]
                );
                const countAziende = await pool.query(
                    'SELECT COUNT(*) as count FROM clienti_aziende WHERE assigned_agent_id = ?',
                    [agente.id]
                );

                // Alcuni ambienti SQLite non includono la tabella contabilita_movimenti; gestiamo commissioni a 0
                let commissioniTotali = 0;
                try {
                    const commissioniResult = await pool.query(
                        `SELECT SUM(importo) as totale FROM contabilita_movimenti WHERE agent_id = ? AND tipo = 'compenso'`,
                        [agente.id]
                    );
                    commissioniTotali = (commissioniResult.rows[0] as any)?.totale || 0;
                } catch (_) {
                    commissioniTotali = 0;
                }

                return {
                    ...agente,
                    clienti_assegnati: (countPrivati.rows[0] as any).count + (countAziende.rows[0] as any).count,
                    commissioni_totali: commissioniTotali
                };
            })
        );
        
        res.json({ 
            success: true, 
            data: agenti 
        });
    } catch (error: any) {
        console.error('Errore caricamento agenti:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore caricamento agenti',
            error: error.message 
        });
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// CREAZIONE RAPIDA AGENTE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/agenti/quick-create
 * Creazione rapida di un nuovo agente
 */
router.post('/quick-create', requireRole('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        const user = req.user as unknown as UserRole;
        const { nome, cognome, email, password, phone, agency_name, role, commissione_luce_default, commissione_gas_default } = req.body;
        
        // Validazione
        if (!nome || !cognome || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Campi obbligatori: nome, cognome, email, password' 
            });
        }
        
        // Verifica email unica
        const emailCheck = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email.toLowerCase()]
        );
        
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email già utilizzata da un altro utente' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Determina parent_id e agency
        const parentId = user.role === 'admin' ? user.id : null;
        const agencyName = agency_name || user.agency_name || 'Agenzia';
        
        // Crea agente
        // Mappa ruolo frontend -> database
        const roleMapping: any = {
            'agent': 'operatore',
            'admin': 'admin',
            'super_admin': 'super_admin'
        };
        
        const dbRole = roleMapping[role] || 'operatore';
        
        // Genera UUID per il nuovo agente
        const newAgentId = crypto.randomUUID();
        
        const insertResult = await pool.query(`
            INSERT INTO users (
                id, email, password_hash, nome, cognome, role, ruolo,
                parent_id, agency_name, phone, is_active, attivo,
                commissioni_luce_default, commissioni_gas_default
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            newAgentId,
            email.toLowerCase(),
            hashedPassword,
            nome,
            cognome,
            dbRole,
            dbRole, // ruolo (colonna legacy)
            parentId,
            agencyName,
            phone || null,
            1,
            1, // attivo (colonna legacy)
            commissione_luce_default || 0,
            commissione_gas_default || 0
        ]);
        
        console.log('✅ Nuovo agente creato con ID:', newAgentId);
        
        // Recupera l'agente appena creato
        const newAgentResult = await pool.query(
            'SELECT id, email, nome, cognome, role, agency_name, commissioni_luce_default, commissioni_gas_default FROM users WHERE email = ?',
            [email.toLowerCase()]
        );
        const newAgent = newAgentResult.rows[0] as any;
        
        logOperation(user.id, 'CREATE', 'agent', newAgent.id);
        
        res.json({ 
            success: true, 
            message: 'Agente creato con successo',
            data: newAgent
        });
    } catch (error: any) {
        console.error('Errore creazione agente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore creazione agente',
            error: error.message 
        });
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// ASSEGNAZIONE CLIENTE AD AGENTE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/agenti/assign-cliente
 * Assegna o riassegna un cliente ad un agente
 */
router.put('/assign-cliente', canReassignCliente, async (req: Request, res: Response) => {
    try {
        const user = req.user as unknown as UserRole;
        const { 
            cliente_id, 
            cliente_tipo, 
            new_agent_id, 
            motivo, 
            commissione_pattuita,
            commissione_luce,
            commissione_gas,
            use_separate_commissions = false
        } = req.body;
        
        console.log('📋 Assign-cliente request body:', req.body);
        console.log('📋 Parametri estratti:', { 
            cliente_id, 
            cliente_tipo, 
            new_agent_id, 
            commissione_pattuita,
            commissione_luce,
            commissione_gas,
            use_separate_commissions
        });
        
        if (!cliente_id || !cliente_tipo || !new_agent_id) {
            console.log('❌ Validazione fallita - parametri mancanti');
            return res.status(400).json({ 
                success: false, 
                message: 'Parametri mancanti: cliente_id, cliente_tipo, new_agent_id' 
            });
        }
        
        const tabella = cliente_tipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';

        // Patch di sicurezza: assicura che le colonne commissione_luce/gas esistano
        try {
            const info = await pool.query<{ name: string }>(`PRAGMA table_info(${tabella})`);
            const cols = new Set(info.rows.map((r: any) => r.name));
            if (!cols.has('commissione_luce')) {
                await pool.query(`ALTER TABLE ${tabella} ADD COLUMN commissione_luce REAL`);
            }
            if (!cols.has('commissione_gas')) {
                await pool.query(`ALTER TABLE ${tabella} ADD COLUMN commissione_gas REAL`);
            }
        } catch (err) {
            console.log('⚠️ Patch colonne commissioni (ignora se già presenti):', (err as any)?.message || err);
        }
        
        // Recupera vecchio agente
        const clienteResult = await pool.query(
            `SELECT assigned_agent_id FROM ${tabella} WHERE id = ?`,
            [cliente_id]
        );
        
        if (clienteResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cliente non trovato' 
            });
        }
        
        const oldAgentId = (clienteResult.rows[0] as any).assigned_agent_id;
        
        // Aggiorna assegnazione + commissioni
        if (use_separate_commissions) {
            // Usa commissioni separate per luce e gas
            try {
                await pool.query(
                    `UPDATE ${tabella} 
                     SET assigned_agent_id = ?, 
                         commissione_luce = ?,
                         commissione_gas = ?,
                         commissione_pattuita = NULL,
                         updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [new_agent_id, commissione_luce || null, commissione_gas || null, cliente_id]
                );
            } catch (updateErr: any) {
                const msg = String(updateErr?.message || updateErr);
                if (msg.includes('no such column: commissione_luce') || msg.includes('no such column: commissione_gas')) {
                    console.log('⚠️  Colonne commissioni mancanti durante UPDATE. Provo ad aggiungerle e ripetere...');
                    try {
                        await pool.query(`ALTER TABLE ${tabella} ADD COLUMN commissione_luce REAL`);
                    } catch (e) {
                        // ignora duplicate
                    }
                    try {
                        await pool.query(`ALTER TABLE ${tabella} ADD COLUMN commissione_gas REAL`);
                    } catch (e) {
                        // ignora duplicate
                    }
                    // Ritenta l'UPDATE
                    await pool.query(
                        `UPDATE ${tabella} 
                         SET assigned_agent_id = ?, 
                             commissione_luce = ?,
                             commissione_gas = ?,
                             commissione_pattuita = NULL,
                             updated_at = CURRENT_TIMESTAMP 
                         WHERE id = ?`,
                        [new_agent_id, commissione_luce || null, commissione_gas || null, cliente_id]
                    );
                } else {
                    throw updateErr;
                }
            }
            
            console.log('✅ Commissioni separate aggiornate:', { commissione_luce, commissione_gas });
            
            // Verifica se il cliente ha contratti attivi per le forniture specificate
            let hasContrattiLuce = false;
            let hasContrattiGas = false;
            
            if (cliente_tipo === 'privato') {
                const contrattiLuceCheck = await pool.query(`
                    SELECT COUNT(*) as count FROM contratti_luce 
                    WHERE cliente_privato_id = ?
                `, [cliente_id]);
                const contrattiGasCheck = await pool.query(`
                    SELECT COUNT(*) as count FROM contratti_gas 
                    WHERE cliente_privato_id = ?
                `, [cliente_id]);
                
                hasContrattiLuce = (contrattiLuceCheck.rows[0] as any)?.count > 0;
                hasContrattiGas = (contrattiGasCheck.rows[0] as any)?.count > 0;
            } else {
                const contrattiLuceCheck = await pool.query(`
                    SELECT COUNT(*) as count FROM contratti_luce 
                    WHERE cliente_azienda_id = ?
                `, [cliente_id]);
                const contrattiGasCheck = await pool.query(`
                    SELECT COUNT(*) as count FROM contratti_gas 
                    WHERE cliente_azienda_id = ?
                `, [cliente_id]);
                
                hasContrattiLuce = (contrattiLuceCheck.rows[0] as any)?.count > 0;
                hasContrattiGas = (contrattiGasCheck.rows[0] as any)?.count > 0;
            }
            
            console.log('🔍 Verifica contratti esistenti:', { hasContrattiLuce, hasContrattiGas });
            
            // Inserisci commissioni nella tabella compensi solo se il cliente ha contratti per quella fornitura
            if (commissione_luce && commissione_luce > 0 && hasContrattiLuce) {
                await pool.query(`
                    INSERT INTO compensi (
                        id, agente_id, cliente_id, cliente_tipo, contratto_id, contratto_tipo,
                        importo, tipo, descrizione, stato, data_maturazione, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, NULL, 'luce', ?, 'commissione_contratto', ?, 'maturato', ?, ?, ?)
                `, [
                    crypto.randomUUID(),
                    new_agent_id,
                    cliente_id,
                    cliente_tipo,
                    commissione_luce,
                    `Commissione LUCE per assegnazione cliente - €${commissione_luce}`,
                    new Date().toISOString(),
                    new Date().toISOString(),
                    new Date().toISOString()
                ]);
                console.log('✅ Commissione LUCE inserita nella tabella compensi:', commissione_luce);
            } else if (commissione_luce && commissione_luce > 0 && !hasContrattiLuce) {
                console.log('⚠️ Commissione LUCE non inserita: cliente non ha contratti luce attivi');
            }
            
            if (commissione_gas && commissione_gas > 0 && hasContrattiGas) {
                await pool.query(`
                    INSERT INTO compensi (
                        id, agente_id, cliente_id, cliente_tipo, contratto_id, contratto_tipo,
                        importo, tipo, descrizione, stato, data_maturazione, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, NULL, 'gas', ?, 'commissione_contratto', ?, 'maturato', ?, ?, ?)
                `, [
                    crypto.randomUUID(),
                    new_agent_id,
                    cliente_id,
                    cliente_tipo,
                    commissione_gas,
                    `Commissione GAS per assegnazione cliente - €${commissione_gas}`,
                    new Date().toISOString(),
                    new Date().toISOString(),
                    new Date().toISOString()
                ]);
                console.log('✅ Commissione GAS inserita nella tabella compensi:', commissione_gas);
            } else if (commissione_gas && commissione_gas > 0 && !hasContrattiGas) {
                console.log('⚠️ Commissione GAS non inserita: cliente non ha contratti gas attivi');
            }
        } else {
            // Usa commissione singola (modalità legacy)
            await pool.query(
                `UPDATE ${tabella} 
                 SET assigned_agent_id = ?, 
                     commissione_pattuita = ?,
                     commissione_luce = NULL,
                     commissione_gas = NULL,
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [new_agent_id, commissione_pattuita || null, cliente_id]
            );
            
            console.log('✅ Commissione singola aggiornata:', { commissione_pattuita });
            
            // Inserisci commissione nella tabella compensi se specificata
            if (commissione_pattuita && commissione_pattuita > 0) {
                await pool.query(`
                    INSERT INTO compensi (
                        id, agente_id, cliente_id, cliente_tipo, contratto_id, contratto_tipo,
                        importo, tipo, descrizione, stato, data_maturazione, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, NULL, 'generale', ?, 'commissione_contratto', ?, 'maturato', ?, ?, ?)
                `, [
                    crypto.randomUUID(),
                    new_agent_id,
                    cliente_id,
                    cliente_tipo,
                    commissione_pattuita,
                    `Commissione per assegnazione cliente - €${commissione_pattuita}`,
                    new Date().toISOString(),
                    new Date().toISOString(),
                    new Date().toISOString()
                ]);
                console.log('✅ Commissione inserita nella tabella compensi:', commissione_pattuita);
            }
        }
        
        // Log operazione
        await pool.query(`
            INSERT INTO clienti_assignments_log (
                cliente_id, cliente_tipo, old_agent_id, new_agent_id, assigned_by, motivo
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [cliente_id, cliente_tipo, oldAgentId, new_agent_id, user.id, motivo || null]);
        
        // Notifica nuovo agente
        await createNotifica(
            new_agent_id,
            'assegnazione_cliente',
            'Nuovo Cliente Assegnato',
            `Ti è stato assegnato un nuovo cliente`,
            `/clienti/${cliente_id}`
        );
        
        // Notifica vecchio agente (se c'era)
        if (oldAgentId && oldAgentId !== new_agent_id) {
            await createNotifica(
                oldAgentId,
                'assegnazione_cliente',
                'Cliente Riassegnato',
                `Un tuo cliente è stato riassegnato ad un altro agente`,
                undefined
            );
        }
        
        logOperation(user.id, 'REASSIGN', 'cliente', cliente_id, { 
            old_agent: oldAgentId, 
            new_agent: new_agent_id,
            use_separate_commissions,
            commissione_luce: use_separate_commissions ? commissione_luce : null,
            commissione_gas: use_separate_commissions ? commissione_gas : null,
            commissione_pattuita: !use_separate_commissions ? commissione_pattuita : null
        });
        
        res.json({ 
            success: true, 
            message: 'Cliente assegnato con successo',
            data: {
                use_separate_commissions,
                commissione_luce: use_separate_commissions ? commissione_luce : null,
                commissione_gas: use_separate_commissions ? commissione_gas : null,
                commissione_pattuita: !use_separate_commissions ? commissione_pattuita : null
            }
        });
    } catch (error: any) {
        console.error('Errore assegnazione cliente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore assegnazione cliente',
            error: error.message 
        });
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// BULK ASSIGN (Assegnazione multipla)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/agenti/bulk-assign
 * Assegna più clienti a un agente
 */
router.put('/bulk-assign', canReassignCliente, async (req: Request, res: Response) => {
    try {
        const user = req.user as unknown as UserRole;
        const { clienti, agent_id, motivo } = req.body;
        
        if (!clienti || !Array.isArray(clienti) || clienti.length === 0 || !agent_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Parametri non validi' 
            });
        }
        
        let successCount = 0;
        
        for (const cliente of clienti) {
            const tabella = cliente.tipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
            
            try {
                // Recupera vecchio agente
                const clienteResult = await pool.query(
                    `SELECT assigned_agent_id FROM ${tabella} WHERE id = ?`,
                    [cliente.id]
                );
                
                if (clienteResult.rows.length > 0) {
                    const oldAgentId = (clienteResult.rows[0] as any).assigned_agent_id;
                    
                    // Aggiorna
                    await pool.query(
                        `UPDATE ${tabella} SET assigned_agent_id = ? WHERE id = ?`,
                        [agent_id, cliente.id]
                    );
                    
                    // Log
                    await pool.query(`
                        INSERT INTO clienti_assignments_log (
                            cliente_id, cliente_tipo, old_agent_id, new_agent_id, assigned_by, motivo
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [cliente.id, cliente.tipo, oldAgentId, agent_id, user.id, motivo || 'Assegnazione multipla']);
                    
                    successCount++;
                }
            } catch (err) {
                console.error(`Errore assegnazione cliente ${cliente.id}:`, err);
            }
        }
        
        // Notifica agente
        if (successCount > 0) {
            await createNotifica(
                agent_id,
                'assegnazione_cliente',
                'Nuovi Clienti Assegnati',
                `Ti sono stati assegnati ${successCount} nuovi clienti`,
                `/clienti`
            );
        }
        
        res.json({ 
            success: true, 
            message: `${successCount} clienti assegnati con successo`,
            data: { assigned: successCount, total: clienti.length }
        });
    } catch (error: any) {
        console.error('Errore assegnazione multipla:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore assegnazione multipla',
            error: error.message 
        });
    }
});

/**
 * GET /api/agenti/my-stats
 * Statistiche personali agente autenticato
 */
router.get('/my-stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as unknown as UserRole;
        
        // Query clienti assegnati
        const clientiResult = await pool.query(`
            SELECT COUNT(*) as count FROM (
                SELECT id FROM clienti_privati WHERE assigned_agent_id = ?
                UNION ALL
                SELECT id FROM clienti_aziende WHERE assigned_agent_id = ?
            )
        `, [user.id, user.id]);
        
        // Query contratti mese corrente
        const contrattiResult = await pool.query(`
            SELECT COUNT(*) as count FROM (
                SELECT id FROM contratti_luce 
                WHERE (cliente_privato_id IN (SELECT id FROM clienti_privati WHERE assigned_agent_id = ?)
                   OR cliente_azienda_id IN (SELECT id FROM clienti_aziende WHERE assigned_agent_id = ?))
                   AND strftime('%Y-%m', data_creazione) = strftime('%Y-%m', 'now')
                UNION ALL
                SELECT id FROM contratti_gas 
                WHERE (cliente_privato_id IN (SELECT id FROM clienti_privati WHERE assigned_agent_id = ?)
                   OR cliente_azienda_id IN (SELECT id FROM clienti_aziende WHERE assigned_agent_id = ?))
                   AND strftime('%Y-%m', data_creazione) = strftime('%Y-%m', 'now')
            )
        `, [user.id, user.id, user.id, user.id]);
        
        // Query commissioni mese
        const commissioniResult = await pool.query(`
            SELECT COALESCE(SUM(importo), 0) as totale
            FROM movimenti_contabili
            WHERE agente_id = ?
              AND tipo = 'provvigione'
              AND strftime('%Y-%m', data) = strftime('%Y-%m', 'now')
        `, [user.id]);
        
        // Nuovi clienti settimana
        const nuoviClientiResult = await pool.query(`
            SELECT COUNT(*) as count FROM (
                SELECT id FROM clienti_privati 
                WHERE assigned_agent_id = ?
                  AND DATE(created_at) >= DATE('now', '-7 days')
                UNION ALL
                SELECT id FROM clienti_aziende 
                WHERE assigned_agent_id = ?
                  AND DATE(created_at) >= DATE('now', '-7 days')
            )
        `, [user.id, user.id]);
        
        const clientiData = clientiResult.rows[0] as any;
        const contrattiData = contrattiResult.rows[0] as any;
        const commissioniData = commissioniResult.rows[0] as any;
        const nuoviClientiData = nuoviClientiResult.rows[0] as any;
        
        res.json({
            success: true,
            data: {
                clienti_assegnati: clientiData?.count || 0,
                contratti_mese: contrattiData?.count || 0,
                commissioni_mese: commissioniData?.totale || 0,
                obiettivo_mensile: 10000,
                nuovi_clienti_settimana: nuoviClientiData?.count || 0,
                appuntamenti_oggi: 0, // TODO: implementare quando avremo calendario
                reminder_attivi: 0
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/agenti/my-activity
 * Attività recenti agente
 */
router.get('/my-activity', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as unknown as UserRole;
        
        const activity = await pool.query(`
            SELECT 
                tipo,
                risorsa,
                dettagli,
                timestamp
            FROM log_operazioni
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT 10
        `, [user.id]);
        
        const formattedActivity = (activity.rows || []).map((log: any) => ({
            tipo: log.tipo,
            descrizione: log.dettagli || `${log.tipo} su ${log.risorsa}`,
            timestamp: new Date(log.timestamp).toLocaleString('it-IT')
        }));
        
        res.json({
            success: true,
            data: formattedActivity
        });
    } catch (error) {
        next(error);
    }
});

// ════════════════════════════════════════════════════════════════════════════════
// EDIT/DELETE AGENTI (Solo Super Admin)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/agenti/:id
 * Modifica un agente esistente
 */
router.put('/:id', requireRole('super_admin', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { nome, cognome, email, password, telefono, agency_name, role, commissione_luce_default, commissione_gas_default } = req.body;

        // Verifica se agente esiste
        const agenteResult = await pool.query(`SELECT * FROM users WHERE id = ?`, [id]);
        
        if (agenteResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Agente non trovato' });
        }

        // Prepara update
        let updateFields = [];
        let updateValues = [];

        if (nome) {
            updateFields.push('nome = ?');
            updateValues.push(nome);
        }
        if (cognome) {
            updateFields.push('cognome = ?');
            updateValues.push(cognome);
        }
        if (email) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        if (telefono !== undefined) {
            updateFields.push('phone = ?');
            updateValues.push(telefono);
        }
        if (agency_name !== undefined) {
            updateFields.push('agency_name = ?');
            updateValues.push(agency_name);
        }
        if (role) {
            // Mappa ruolo frontend -> database
            const roleMapping: any = {
                'agent': 'operatore',
                'admin': 'admin',
                'super_admin': 'super_admin'
            };
            const dbRole = roleMapping[role] || 'operatore';
            
            updateFields.push('role = ?');
            updateFields.push('ruolo = ?');
            updateValues.push(dbRole);
            updateValues.push(dbRole); // ruolo (colonna legacy)
        }
        if (commissione_luce_default !== undefined) {
            updateFields.push('commissioni_luce_default = ?');
            updateValues.push(commissione_luce_default);
        }
        if (commissione_gas_default !== undefined) {
            updateFields.push('commissioni_gas_default = ?');
            updateValues.push(commissione_gas_default);
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push('password_hash = ?');
            updateValues.push(hashedPassword);
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);

        await pool.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        res.json({ success: true, message: 'Agente aggiornato con successo' });
    } catch (error) {
        console.error('Errore aggiornamento agente:', error);
        next(error);
    }
});

/**
 * DELETE /api/agenti/:id
 * Elimina un agente (soft delete)
 */
router.delete('/:id', requireRole('super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        // Verifica se agente esiste
        const agenteResult = await pool.query(`SELECT * FROM users WHERE id = ?`, [id]);
        
        if (agenteResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Agente non trovato' });
        }

        // Rimuovi assegnazioni clienti
        await pool.query(`UPDATE clienti_privati SET assigned_agent_id = NULL WHERE assigned_agent_id = ?`, [id]);
        await pool.query(`UPDATE clienti_aziende SET assigned_agent_id = NULL WHERE assigned_agent_id = ?`, [id]);

        // Soft delete
        await pool.query(`UPDATE users SET is_active = 0, attivo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);

        res.json({ success: true, message: 'Agente eliminato con successo' });
    } catch (error) {
        console.error('Errore eliminazione agente:', error);
        next(error);
    }
});

export default router;

