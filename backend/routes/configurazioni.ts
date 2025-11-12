/**
 * API Routes: Configurazioni
 * Gestisce le configurazioni dinamiche del sistema (Brevo, agenzia, etc.)
 */

import express, { Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { pool } from '../config/database';

const router = express.Router();

// Tutte le route richiedono autenticazione
router.use(authenticate);

/**
 * GET /api/configurazioni
 * Ottiene tutte le configurazioni (senza valori sensibili per non-admin)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const isAdmin = req.user?.ruolo === 'super_admin' || req.user?.ruolo === 'admin';
        
        const result = await pool.query(`
            SELECT 
                chiave,
                ${isAdmin ? 'valore,' : 'CASE WHEN encrypted = 1 THEN "****" ELSE valore END as valore,'}
                categoria,
                descrizione,
                encrypted,
                updated_at
            FROM configurazioni
            ORDER BY categoria, chiave
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error: any) {
        console.error('❌ Errore caricamento configurazioni:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento delle configurazioni',
            error: error.message
        });
    }
});

/**
 * GET /api/configurazioni/:categoria
 * Ottiene configurazioni per categoria (es: brevo, email, agenzia)
 */
router.get('/:categoria', async (req: Request, res: Response) => {
    try {
        const { categoria } = req.params;
        const isAdmin = req.user?.ruolo === 'super_admin' || req.user?.ruolo === 'admin';
        
        const result = await pool.query(`
            SELECT 
                chiave,
                ${isAdmin ? 'valore,' : 'CASE WHEN encrypted = 1 THEN "****" ELSE valore END as valore,'}
                categoria,
                descrizione,
                encrypted,
                updated_at
            FROM configurazioni
            WHERE categoria = ?
            ORDER BY chiave
        `, [categoria]);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error: any) {
        console.error('❌ Errore caricamento configurazioni categoria:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento delle configurazioni',
            error: error.message
        });
    }
});

/**
 * PUT /api/configurazioni
 * Aggiorna multiple configurazioni (solo admin)
 */
router.put('/', authorize('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        console.log('📥 Ricevuto body:', JSON.stringify(req.body));
        const { configurazioni } = req.body;
        
        if (!Array.isArray(configurazioni) || configurazioni.length === 0) {
            console.error('❌ Configurazioni non valide:', { configurazioni, type: typeof configurazioni });
            return res.status(400).json({
                success: false,
                message: 'Parametro configurazioni mancante o non valido. Ricevuto: ' + JSON.stringify(req.body)
            });
        }
        
        // Aggiorna ogni configurazione
        for (const config of configurazioni) {
            console.log('📝 Aggiornamento config:', {
                chiave: config.chiave,
                valore: config.valore ? '***' : 'empty',
                userId: req.user!.userId
            });
            
            await pool.query(`
                UPDATE configurazioni 
                SET valore = ?, updated_at = datetime('now'), updated_by = ?
                WHERE chiave = ?
            `, [config.valore, req.user!.userId, config.chiave]);
        }
        
        res.json({
            success: true,
            message: `${configurazioni.length} configurazioni aggiornate con successo`
        });
        
    } catch (error: any) {
        console.error('❌ Errore aggiornamento configurazioni:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento delle configurazioni',
            error: error.message
        });
    }
});

/**
 * PUT /api/configurazioni/:chiave
 * Aggiorna singola configurazione (solo admin)
 */
router.put('/:chiave', authorize('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        const { chiave } = req.params;
        const { valore } = req.body;
        
        if (valore === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Parametro valore mancante'
            });
        }
        
        await pool.query(`
            UPDATE configurazioni 
            SET valore = ?, updated_at = datetime('now'), updated_by = ?
            WHERE chiave = ?
        `, [valore, req.user!.userId, chiave]);
        
        res.json({
            success: true,
            message: 'Configurazione aggiornata con successo'
        });
        
    } catch (error: any) {
        console.error('❌ Errore aggiornamento configurazione:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento della configurazione',
            error: error.message
        });
    }
});

/**
 * POST /api/configurazioni/test-brevo
 * Testa la connessione Brevo con le credenziali fornite (solo admin)
 */
router.post('/test-brevo', authorize('super_admin', 'admin'), async (req: Request, res: Response) => {
    try {
        const { smtp_host, smtp_port, smtp_user, smtp_pass, test_email } = req.body;
        
        if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass || !test_email) {
            return res.status(400).json({
                success: false,
                message: 'Tutti i campi sono obbligatori'
            });
        }
        
        // Crea transporter temporaneo per test
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransport({
            host: smtp_host,
            port: parseInt(smtp_port),
            secure: false,
            auth: {
                user: smtp_user,
                pass: smtp_pass
            }
        });
        
        // Verifica connessione
        await transporter.verify();
        
        // Invia email di test
        await transporter.sendMail({
            from: `"Gestionale Energia - Test" <${smtp_user}>`,
            to: test_email,
            subject: '✅ Test Connessione Brevo',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #10b981;">✅ Connessione Brevo Configurata!</h2>
                    <p>Congratulazioni! La tua configurazione Brevo è corretta.</p>
                    <p>Puoi ora utilizzare l'email marketing del gestionale.</p>
                    <hr style="margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 12px;">
                        Email di test inviata il ${new Date().toLocaleString('it-IT')}
                    </p>
                </div>
            `
        });
        
        res.json({
            success: true,
            message: `Email di test inviata con successo a ${test_email}`
        });
        
    } catch (error: any) {
        console.error('❌ Errore test Brevo:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella connessione Brevo',
            error: error.message
        });
    }
});

export default router;

