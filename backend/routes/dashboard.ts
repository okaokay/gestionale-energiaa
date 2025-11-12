/**
 * Route per dashboard e KPI
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

/**
 * GET /api/dashboard/stats
 * Statistiche generali dashboard (filtrate per ruolo)
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as any;
        
        // 🔐 FILTRI PER RUOLO
        let clientiFilter = '';
        let contrattiFilter = '';
        const params: any[] = [];
        
        if (user.role === 'operatore' || user.role === 'agent') {
            // Operatore: solo i SUOI clienti
            clientiFilter = 'WHERE assigned_agent_id = ?';
            contrattiFilter = `WHERE (
                cliente_privato_id IN (SELECT id FROM clienti_privati WHERE assigned_agent_id = ?)
                OR cliente_azienda_id IN (SELECT id FROM clienti_aziende WHERE assigned_agent_id = ?)
            )`;
            params.push(user.id, user.id, user.id);
        } else if (user.role === 'admin') {
            // Admin: clienti della sua agenzia
            clientiFilter = `WHERE assigned_agent_id IN (
                SELECT id FROM users WHERE parent_id = ? OR id = ?
            )`;
            contrattiFilter = `WHERE (
                cliente_privato_id IN (SELECT id FROM clienti_privati WHERE assigned_agent_id IN (SELECT id FROM users WHERE parent_id = ? OR id = ?))
                OR cliente_azienda_id IN (SELECT id FROM clienti_aziende WHERE assigned_agent_id IN (SELECT id FROM users WHERE parent_id = ? OR id = ?))
            )`;
            params.push(user.id, user.id, user.id, user.id, user.id, user.id);
        }
        // Super admin: nessun filtro
        
        // Conta clienti
        const clientiPrivati = await pool.query(`SELECT COUNT(*) as count FROM clienti_privati ${clientiFilter}`, user.role === 'operatore' || user.role === 'agent' ? [user.id] : user.role === 'admin' ? [user.id, user.id] : []);
        const clientiAziende = await pool.query(`SELECT COUNT(*) as count FROM clienti_aziende ${clientiFilter}`, user.role === 'operatore' || user.role === 'agent' ? [user.id] : user.role === 'admin' ? [user.id, user.id] : []);
        
        // Conta contratti attivi
        const contrattiParams = user.role === 'operatore' || user.role === 'agent' ? [user.id, user.id] : user.role === 'admin' ? [user.id, user.id, user.id, user.id] : [];
        const contrattiLuce = await pool.query(`SELECT COUNT(*) as count FROM contratti_luce ${contrattiFilter} ${contrattiFilter ? 'AND' : 'WHERE'} stato = 'attivo'`, contrattiParams);
        const contrattiGas = await pool.query(`SELECT COUNT(*) as count FROM contratti_gas ${contrattiFilter} ${contrattiFilter ? 'AND' : 'WHERE'} stato = 'attivo'`, contrattiParams);
        
        // Contratti in scadenza (prossimi 30 giorni)
        const scadenzeLuce = await pool.query(`
            SELECT COUNT(*) as count FROM contratti_luce 
            ${contrattiFilter}
            ${contrattiFilter ? 'AND' : 'WHERE'} stato = 'attivo' 
            AND julianday(data_fine) - julianday('now') <= 30
        `, contrattiParams);
        const scadenzeGas = await pool.query(`
            SELECT COUNT(*) as count FROM contratti_gas 
            ${contrattiFilter}
            ${contrattiFilter ? 'AND' : 'WHERE'} stato = 'attivo' 
            AND julianday(data_fine) - julianday('now') <= 30
        `, contrattiParams);
        
        // Statistiche email (ultimi 30 giorni)
        const emailStats = await pool.query(`
            SELECT 
                COUNT(*) as totale_email_inviate,
                SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as totale_aperture,
                CAST(AVG(CASE WHEN opened_at IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100 AS REAL) as tasso_apertura
            FROM email_logs
            WHERE sent_at >= datetime('now', '-30 days')
        `);
        
        // 💰 COMPENSI (solo per operatori e admin)
        let compensiTotali = 0;
        let compensiMese = 0;
        
        if (user.role === 'operatore' || user.role === 'agent') {
            // Compenso totale accumulato dell'operatore
            const compensiTotaliResult = await pool.query(`
                SELECT COALESCE(SUM(importo), 0) as totale
                FROM contabilita_movimenti
                WHERE agent_id = ? AND tipo = 'compenso'
            `, [user.id]);
            compensiTotali = (compensiTotaliResult.rows[0] as any)?.totale || 0;
            
            // Compenso mese corrente
            const compensiMeseResult = await pool.query(`
                SELECT COALESCE(SUM(importo), 0) as totale
                FROM contabilita_movimenti
                WHERE agent_id = ? AND tipo = 'compenso'
                AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
            `, [user.id]);
            compensiMese = (compensiMeseResult.rows[0] as any)?.totale || 0;
        }
        
        res.json({
            success: true,
            data: {
                totale_clienti_privati: (clientiPrivati.rows[0] as any).count || 0,
                totale_clienti_aziende: (clientiAziende.rows[0] as any).count || 0,
                totale_clienti: ((clientiPrivati.rows[0] as any).count || 0) + ((clientiAziende.rows[0] as any).count || 0),
                totale_contratti_luce_attivi: (contrattiLuce.rows[0] as any).count || 0,
                totale_contratti_gas_attivi: (contrattiGas.rows[0] as any).count || 0,
                contratti_luce_attivi: (contrattiLuce.rows[0] as any).count || 0,
                contratti_gas_attivi: (contrattiGas.rows[0] as any).count || 0,
                scadenze_luce_30gg: (scadenzeLuce.rows[0] as any).count || 0,
                scadenze_gas_30gg: (scadenzeGas.rows[0] as any).count || 0,
                contratti_in_scadenza_30gg: ((scadenzeLuce.rows[0] as any).count || 0) + ((scadenzeGas.rows[0] as any).count || 0),
                email_stats: emailStats.rows[0] || { totale_email_inviate: 0, totale_aperture: 0, tasso_apertura: 0 },
                // 💰 Compensi (solo per operatori)
                compensi_totali: compensiTotali,
                compensi_mese_corrente: compensiMese
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/scadenze
 * Panoramica scadenze (filtrate per ruolo)
 */
router.get('/scadenze', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as any;
        
        // 🔐 FILTRI PER RUOLO
        let whereClause = 'WHERE cl.stato = \'attivo\'';
        let params: any[] = [];
        
        if (user.role === 'operatore' || user.role === 'agent') {
            // Operatore: solo scadenze dei SUOI clienti
            whereClause += ` AND (
                cp.assigned_agent_id = ? OR ca.assigned_agent_id = ?
            )`;
            params = [user.id, user.id];
        } else if (user.role === 'admin') {
            // Admin: scadenze clienti della sua agenzia
            whereClause += ` AND (
                cp.assigned_agent_id IN (SELECT id FROM users WHERE parent_id = ? OR id = ?)
                OR ca.assigned_agent_id IN (SELECT id FROM users WHERE parent_id = ? OR id = ?)
            )`;
            params = [user.id, user.id, user.id, user.id];
        }
        
        // Query diretta per contratti luce in scadenza
        const scadenzeLuce = await pool.query(`
            SELECT 
                cl.*,
                'luce' as tipo_contratto,
                cp.nome || ' ' || cp.cognome as cliente_nome,
                ca.ragione_sociale as azienda_nome,
                CAST((julianday(cl.data_fine) - julianday('now')) AS INTEGER) as giorni_a_scadenza
            FROM contratti_luce cl
            LEFT JOIN clienti_privati cp ON cl.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON cl.cliente_azienda_id = ca.id
            ${whereClause}
            AND julianday(cl.data_fine) - julianday('now') <= 30
        `, params);
        
        // Query diretta per contratti gas in scadenza
        const scadenzeGas = await pool.query(`
            SELECT 
                cg.*,
                'gas' as tipo_contratto,
                cp.nome || ' ' || cp.cognome as cliente_nome,
                ca.ragione_sociale as azienda_nome,
                CAST((julianday(cg.data_fine) - julianday('now')) AS INTEGER) as giorni_a_scadenza
            FROM contratti_gas cg
            LEFT JOIN clienti_privati cp ON cg.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON cg.cliente_azienda_id = ca.id
            ${whereClause.replace('cl.', 'cg.')}
            AND julianday(cg.data_fine) - julianday('now') <= 30
        `, params);
        
        // Combina e ordina
        const tutteScadenze = [...scadenzeLuce.rows, ...scadenzeGas.rows]
            .sort((a: any, b: any) => a.giorni_a_scadenza - b.giorni_a_scadenza)
            .slice(0, 20);
        
        res.json({
            success: true,
            data: tutteScadenze
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/hot-leads
 * Hot leads da matching AI
 */
router.get('/hot-leads', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const leads = await pool.query(`
            SELECT 
                am.*,
                o.nome_offerta, o.fornitore as nuovo_fornitore,
                cp.nome, cp.cognome, cp.email_principale,
                ca.ragione_sociale, ca.email_referente
            FROM ai_matches am
            JOIN offerte o ON am.offerta_id = o.id
            LEFT JOIN clienti_privati cp ON am.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON am.cliente_azienda_id = ca.id
            WHERE am.categoria_lead = 'hot' AND am.stato_contatto = 'non_contattato'
            ORDER BY am.risparmio_stimato_annuo DESC
            LIMIT 10
        `);
        
        res.json({
            success: true,
            data: leads.rows
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/dashboard/chart/acquisizioni
 * Dati grafico acquisizioni mensili
 */
router.get('/chart/acquisizioni', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const mesi = parseInt(req.query.mesi as string) || 12;
        
        const privati = await pool.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as mese,
                COUNT(*) as count
            FROM clienti_privati
            WHERE created_at >= NOW() - INTERVAL '${mesi} months'
            GROUP BY mese
            ORDER BY mese
        `);
        
        const aziende = await pool.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as mese,
                COUNT(*) as count
            FROM clienti_aziende
            WHERE created_at >= NOW() - INTERVAL '${mesi} months'
            GROUP BY mese
            ORDER BY mese
        `);
        
        res.json({
            success: true,
            data: {
                privati: privati.rows,
                aziende: aziende.rows
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;

