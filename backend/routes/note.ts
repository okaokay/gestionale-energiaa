/**
 * ════════════════════════════════════════════════════════════════════════════════
 * API Routes - Sistema Note Rapide
 * Timeline completa per ogni cliente
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';

const router = Router();

// Tutte le route richiedono autenticazione
router.use(authenticate);

/**
 * GET /api/note/cliente/:tipo/:id
 * Ottieni tutte le note di un cliente
 */
router.get('/cliente/:tipo/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipo, id } = req.params;
        const clienteTipo = tipo === 'privati' ? 'privato' : 'azienda';
        
        const query = `
            SELECT 
                n.*,
                u.nome || ' ' || u.cognome as created_by_name
            FROM clienti_note n
            LEFT JOIN users u ON n.created_by = u.id
            WHERE n.cliente_id = ? AND n.cliente_tipo = ?
            ORDER BY 
                n.is_pinned DESC,
                n.created_at DESC
        `;
        
        const result = await pool.query(query, [id, clienteTipo]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/note
 * Crea una nuova nota
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { 
            cliente_id, 
            cliente_tipo, 
            tipo_nota, 
            titolo, 
            contenuto, 
            priorita, 
            reminder_date,
            tags
        } = req.body;
        
        const user = req.user as any;
        
        const query = `
            INSERT INTO clienti_note 
            (cliente_id, cliente_tipo, tipo_nota, titolo, contenuto, priorita, reminder_date, tags, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await pool.query(query, [
            cliente_id,
            cliente_tipo,
            tipo_nota,
            titolo || null,
            contenuto,
            priorita || 'normale',
            reminder_date || null,
            tags || null,
            user?.id || null
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Nota creata con successo'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/note/:id
 * Aggiorna una nota
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { 
            titolo, 
            contenuto, 
            tipo_nota, 
            priorita, 
            is_pinned,
            is_completed,
            reminder_date,
            tags
        } = req.body;
        
        const query = `
            UPDATE clienti_note 
            SET 
                titolo = COALESCE(?, titolo),
                contenuto = COALESCE(?, contenuto),
                tipo_nota = COALESCE(?, tipo_nota),
                priorita = COALESCE(?, priorita),
                is_pinned = COALESCE(?, is_pinned),
                is_completed = COALESCE(?, is_completed),
                completed_at = CASE 
                    WHEN ? = 1 AND is_completed = 0 THEN CURRENT_TIMESTAMP
                    WHEN ? = 0 THEN NULL
                    ELSE completed_at
                END,
                reminder_date = COALESCE(?, reminder_date),
                tags = COALESCE(?, tags),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await pool.query(query, [
            titolo,
            contenuto,
            tipo_nota,
            priorita,
            is_pinned !== undefined ? (is_pinned ? 1 : 0) : null,
            is_completed !== undefined ? (is_completed ? 1 : 0) : null,
            is_completed !== undefined ? (is_completed ? 1 : 0) : null,
            is_completed !== undefined ? (is_completed ? 1 : 0) : null,
            reminder_date,
            tags,
            id
        ]);
        
        res.json({
            success: true,
            message: 'Nota aggiornata con successo'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/note/:id
 * Elimina una nota
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        await pool.query(`DELETE FROM clienti_note WHERE id = ?`, [id]);
        
        res.json({
            success: true,
            message: 'Nota eliminata con successo'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/note/:id/pin
 * Fissa/stacca una nota
 */
router.post('/:id/pin', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        await pool.query(`
            UPDATE clienti_note 
            SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [id]);
        
        res.json({
            success: true,
            message: 'Nota aggiornata'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/note/:id/complete
 * Marca come completata/incompleta
 */
router.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        await pool.query(`
            UPDATE clienti_note 
            SET 
                is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END,
                completed_at = CASE 
                    WHEN is_completed = 0 THEN CURRENT_TIMESTAMP
                    ELSE NULL
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [id]);
        
        res.json({
            success: true,
            message: 'Nota aggiornata'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/note/reminders
 * Ottieni tutte le note con reminder scaduti o in scadenza
 */
router.get('/reminders', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = `
            SELECT 
                n.*,
                CASE 
                    WHEN n.cliente_tipo = 'privato' THEN cp.nome || ' ' || cp.cognome
                    ELSE ca.ragione_sociale
                END as cliente_nome
            FROM clienti_note n
            LEFT JOIN clienti_privati cp ON n.cliente_id = cp.id AND n.cliente_tipo = 'privato'
            LEFT JOIN clienti_aziende ca ON n.cliente_id = ca.id AND n.cliente_tipo = 'azienda'
            WHERE 
                n.reminder_date IS NOT NULL 
                AND n.is_completed = 0
                AND DATE(n.reminder_date) <= DATE('now', '+7 days')
            ORDER BY n.reminder_date ASC
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

export default router;



