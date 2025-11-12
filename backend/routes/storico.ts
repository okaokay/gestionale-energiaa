/**
 * API ENDPOINTS - Storico Email e Audit Log
 */

import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';
import { canAccessCliente } from '../middleware/roleCheck';

const router = express.Router();

// Applica autenticazione a tutte le rotte
router.use(authenticate);

// ============================================================
// STORICO EMAIL
// ============================================================

/**
 * GET /api/storico/email/:tipo/:id
 * Recupera tutte le email inviate a un cliente specifico
 */
router.get('/email/:tipo/:id', canAccessCliente, async (req: Request, res: Response) => {
    try {
        const { tipo, id } = req.params;
        
        const result = await pool.query(
            `SELECT 
                e.*,
                u.email as mittente_email,
                u.nome || ' ' || u.cognome as mittente_nome
             FROM email_inviate e
             LEFT JOIN users u ON e.mittente_id = u.id
             WHERE e.cliente_id = ? AND e.cliente_tipo = ?
             ORDER BY e.data_invio DESC`,
            [id, tipo]
        );

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error: any) {
        console.error('❌ Errore recupero email:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante il recupero delle email',
            error: error.message
        });
    }
});

/**
 * POST /api/storico/email
 * Registra l'invio di una nuova email
 */
router.post('/email', async (req: Request, res: Response) => {
    try {
        const {
            cliente_id,
            cliente_tipo,
            destinatario,
            oggetto,
            corpo,
            tipo = 'manuale',
            campagna_id = null
        } = req.body;

        const user = req.user as any;

        const result = await pool.query(
            `INSERT INTO email_inviate 
             (cliente_id, cliente_tipo, destinatario, oggetto, corpo, tipo, campagna_id, mittente_id, stato)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'inviata')`,
            [cliente_id, cliente_tipo, destinatario, oggetto, corpo, tipo, campagna_id, user.id]
        );

        // Registra anche nell'audit log
        await pool.query(
            `INSERT INTO audit_log 
             (tipo_azione, risorsa_tipo, risorsa_id, cliente_id, cliente_tipo, utente_id, utente_nome, descrizione)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'email_inviata',
                'email',
                result.rowCount,
                cliente_id,
                cliente_tipo,
                user.id,
                user.email || user.nome,
                `Email inviata: ${oggetto}`
            ]
        );

        res.json({
            success: true,
            message: 'Email registrata con successo',
            data: { id: result.rowCount }
        });
    } catch (error: any) {
        console.error('❌ Errore registrazione email:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante la registrazione dell\'email',
            error: error.message
        });
    }
});

// ============================================================
// AUDIT LOG / STORICO ATTIVITÀ
// ============================================================

/**
 * GET /api/storico/attivita/:tipo/:id
 * Recupera tutto lo storico delle attività di un cliente
 */
router.get('/attivita/:tipo/:id', canAccessCliente, async (req: Request, res: Response) => {
    try {
        const { tipo, id } = req.params;
        const { tipo_azione, limit = 100 } = req.query;
        
        let query = `
            SELECT 
                a.*,
                u.email as utente_email,
                u.nome || ' ' || COALESCE(u.cognome, '') as utente_nome_completo
            FROM audit_log a
            LEFT JOIN users u ON a.utente_id = u.id
            WHERE a.cliente_id = ? AND a.cliente_tipo = ?
        `;
        
        const params: any[] = [id, tipo];
        
        if (tipo_azione) {
            query += ` AND a.tipo_azione = ?`;
            params.push(tipo_azione);
        }
        
        query += ` ORDER BY a.data_azione DESC LIMIT ?`;
        params.push(Number(limit));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error: any) {
        console.error('❌ Errore recupero attività:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante il recupero delle attività',
            error: error.message
        });
    }
});

/**
 * POST /api/storico/attivita
 * Registra una nuova attività nell'audit log
 */
router.post('/attivita', async (req: Request, res: Response) => {
    try {
        const {
            tipo_azione,
            risorsa_tipo,
            risorsa_id,
            cliente_id,
            cliente_tipo,
            descrizione,
            dati_prima = null,
            dati_dopo = null
        } = req.body;

        const user = req.user as any;

        const result = await pool.query(
            `INSERT INTO audit_log 
             (tipo_azione, risorsa_tipo, risorsa_id, cliente_id, cliente_tipo, utente_id, utente_nome, descrizione, dati_prima, dati_dopo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tipo_azione,
                risorsa_tipo,
                risorsa_id,
                cliente_id,
                cliente_tipo,
                user.id,
                user.email || user.nome,
                descrizione,
                dati_prima ? JSON.stringify(dati_prima) : null,
                dati_dopo ? JSON.stringify(dati_dopo) : null
            ]
        );

        res.json({
            success: true,
            message: 'Attività registrata con successo',
            data: { id: result.rowCount }
        });
    } catch (error: any) {
        console.error('❌ Errore registrazione attività:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante la registrazione dell\'attività',
            error: error.message
        });
    }
});

/**
 * GET /api/storico/attivita/tipi
 * Recupera tutti i tipi di azioni disponibili per il filtro
 */
router.get('/attivita/tipi', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT DISTINCT tipo_azione 
             FROM audit_log 
             ORDER BY tipo_azione`
        );

        res.json({
            success: true,
            data: result.rows.map((r: any) => r.tipo_azione)
        });
    } catch (error: any) {
        console.error('❌ Errore recupero tipi attività:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante il recupero dei tipi di attività',
            error: error.message
        });
    }
});

/**
 * GET /api/storico/timeline/:tipo/:id
 * Recupera una timeline combinata di email + attività
 */
router.get('/timeline/:tipo/:id', canAccessCliente, async (req: Request, res: Response) => {
    try {
        const { tipo, id } = req.params;
        const { limit = 50 } = req.query;
        
        // Unisci email e audit log in una singola timeline
        const query = `
            SELECT 
                'email' as tipo_evento,
                e.id,
                e.oggetto as titolo,
                e.corpo as descrizione,
                e.data_invio as data_evento,
                e.destinatario as dettagli,
                u.nome || ' ' || COALESCE(u.cognome, '') as utente_nome
            FROM email_inviate e
            LEFT JOIN users u ON e.mittente_id = u.id
            WHERE e.cliente_id = ? AND e.cliente_tipo = ?
            
            UNION ALL
            
            SELECT 
                'attivita' as tipo_evento,
                a.id,
                a.tipo_azione as titolo,
                a.descrizione,
                a.data_azione as data_evento,
                a.risorsa_tipo as dettagli,
                a.utente_nome
            FROM audit_log a
            WHERE a.cliente_id = ? AND a.cliente_tipo = ?
            
            ORDER BY data_evento DESC
            LIMIT ?
        `;

        const result = await pool.query(query, [id, tipo, id, tipo, Number(limit)]);

        res.json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error: any) {
        console.error('❌ Errore recupero timeline:', error.message);
        res.status(500).json({
            success: false,
            message: 'Errore durante il recupero della timeline',
            error: error.message
        });
    }
});

export default router;

