/**
 * API per sistema avanzato gestione cliente
 * Azioni, promemoria, AI suggerimenti, SMS
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { randomUUID } from 'crypto';

const router = Router();

// ==========================================
// 1. STORICO AZIONI CLIENTE
// ==========================================

// GET: Lista azioni cliente
router.get('/clients/:clientId/actions', authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clientId } = req.params;
        const { tipoCliente, limit = 50 } = req.query;

        let query = `
            SELECT 
                ca.*,
                u.nome || ' ' || u.cognome as utente_nome
            FROM cliente_azioni ca
            LEFT JOIN users u ON ca.utente_id = u.id
            WHERE ca.cliente_id = ?
        `;
        const params: any[] = [clientId];

        if (tipoCliente) {
            query += ` AND ca.tipo_cliente = ?`;
            params.push(tipoCliente);
        }

        query += ` ORDER BY ca.created_at DESC LIMIT ?`;
        params.push(parseInt(limit as string));

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

// POST: Registra nuova azione
router.post('/clients/:clientId/actions', authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clientId } = req.params;
        const {
            tipoCliente,
            tipoAzione,
            titolo,
            descrizione,
            esito,
            metadata
        } = req.body;

        const actionId = randomUUID();

        await pool.query(`
            INSERT INTO cliente_azioni (
                id, cliente_id, tipo_cliente, tipo_azione, titolo, descrizione,
                esito, utente_id, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            actionId,
            clientId,
            tipoCliente,
            tipoAzione,
            titolo,
            descrizione || null,
            esito || null,
            req.user!.userId,
            metadata ? JSON.stringify(metadata) : null
        ]);

        // Aggiorna data_ultimo_contatto nel cliente
        const tableName = tipoCliente === 'privato' ? 'clienti_privati' : 'clienti_aziende';
        await pool.query(`
            UPDATE ${tableName}
            SET data_ultimo_contatto = datetime('now'),
                tipo_ultimo_contatto = ?
            WHERE id = ?
        `, [tipoAzione, clientId]);

        const newAction = await pool.query(`
            SELECT ca.*, u.nome || ' ' || u.cognome as utente_nome
            FROM cliente_azioni ca
            LEFT JOIN users u ON ca.utente_id = u.id
            WHERE ca.id = ?
        `, [actionId]);

        res.status(201).json({
            success: true,
            message: 'Azione registrata con successo',
            data: newAction.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// 2. PROMEMORIA / FOLLOW-UP
// ==========================================

// GET: Lista promemoria cliente
router.get('/clients/:clientId/reminders', authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clientId } = req.params;
        const { tipoCliente, stato } = req.query;

        let query = `
            SELECT 
                pr.*,
                u1.nome || ' ' || u1.cognome as creato_da_nome,
                u2.nome || ' ' || u2.cognome as assegnato_a_nome,
                u3.nome || ' ' || u3.cognome as completato_da_nome
            FROM cliente_promemoria pr
            LEFT JOIN users u1 ON pr.created_by = u1.id
            LEFT JOIN users u2 ON pr.assegnato_a = u2.id
            LEFT JOIN users u3 ON pr.completato_da = u3.id
            WHERE pr.cliente_id = ?
        `;
        const params: any[] = [clientId];

        if (tipoCliente) {
            query += ` AND pr.tipo_cliente = ?`;
            params.push(tipoCliente);
        }

        if (stato) {
            query += ` AND pr.stato = ?`;
            params.push(stato);
        }

        query += ` ORDER BY pr.data_scadenza ASC`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

// POST: Crea promemoria
router.post('/clients/:clientId/reminders', authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clientId } = req.params;
        const {
            tipoCliente,
            titolo,
            descrizione,
            tipoPromemoria,
            dataScadenza,
            priorita,
            assegnatoA
        } = req.body;

        const reminderId = randomUUID();

        await pool.query(`
            INSERT INTO cliente_promemoria (
                id, cliente_id, tipo_cliente, titolo, descrizione,
                tipo_promemoria, data_scadenza, priorita, assegnato_a, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            reminderId,
            clientId,
            tipoCliente,
            titolo,
            descrizione || null,
            tipoPromemoria,
            dataScadenza,
            priorita || 'media',
            assegnatoA || req.user!.userId,
            req.user!.userId
        ]);

        const newReminder = await pool.query(`
            SELECT pr.*, u.nome || ' ' || u.cognome as assegnato_a_nome
            FROM cliente_promemoria pr
            LEFT JOIN users u ON pr.assegnato_a = u.id
            WHERE pr.id = ?
        `, [reminderId]);

        res.status(201).json({
            success: true,
            message: 'Promemoria creato con successo',
            data: newReminder.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

// PUT: Completa promemoria
router.put('/reminders/:id/complete', authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        await pool.query(`
            UPDATE cliente_promemoria
            SET stato = 'completato',
                completato_da = ?,
                completato_il = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ?
        `, [req.user!.userId, id]);

        res.json({
            success: true,
            message: 'Promemoria completato'
        });
    } catch (error) {
        next(error);
    }
});

// DELETE: Elimina promemoria
router.delete('/reminders/:id', authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        await pool.query(`DELETE FROM cliente_promemoria WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: 'Promemoria eliminato'
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// 3. AI SUGGERIMENTI
// ==========================================

// GET: Suggerimenti AI per cliente
router.get('/clients/:clientId/ai-suggestions', authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clientId } = req.params;
        const { tipoCliente } = req.query;

        const result = await pool.query(`
            SELECT *
            FROM cliente_ai_suggerimenti
            WHERE cliente_id = ?
            AND tipo_cliente = ?
            AND stato = 'attivo'
            AND (scadenza IS NULL OR datetime(scadenza) > datetime('now'))
            ORDER BY priorita DESC, created_at DESC
        `, [clientId, tipoCliente]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

// POST: Genera suggerimenti AI (placeholder - da implementare con AI reale)
router.post('/clients/:clientId/ai-suggestions/generate', authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clientId } = req.params;
        const { tipoCliente } = req.body;

        // TODO: Qui si potrebbe integrare Groq/Ollama per suggerimenti reali
        // Per ora creo suggerimenti base

        const tableName = tipoCliente === 'privato' ? 'clienti_privati' : 'clienti_aziende';
        const cliente = await pool.query(`SELECT * FROM ${tableName} WHERE id = ?`, [clientId]);

        if (cliente.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cliente non trovato' });
        }

        const clienteData = cliente.rows[0] as any;

        // Suggerimenti base
        const suggerimenti: any[] = [];

        // 1. Se non contattato da più di 30 giorni
        if (!clienteData.data_ultimo_contatto) {
            suggerimenti.push({
                tipo: 'momento_contatto',
                titolo: 'Cliente mai contattato',
                descrizione: 'Questo cliente non è mai stato contattato. Considera di fare una chiamata introduttiva.',
                azione: 'chiamata',
                priorita: 8
            });
        }

        // 2. Se ha contratti in scadenza
        const contrattiScadenza = await pool.query(`
            SELECT COUNT(*) as count FROM (
                SELECT id FROM contratti_luce WHERE cliente_id = ? AND tipo_cliente = ? 
                    AND julianday(data_fine_contratto) - julianday('now') < 60
                UNION ALL
                SELECT id FROM contratti_gas WHERE cliente_id = ? AND tipo_cliente = ?
                    AND julianday(data_fine_contratto) - julianday('now') < 60
            )
        `, [clientId, tipoCliente, clientId, tipoCliente]);

        if ((contrattiScadenza.rows[0] as any).count > 0) {
            suggerimenti.push({
                tipo: 'retention',
                titolo: 'Contratti in scadenza',
                descrizione: 'Il cliente ha contratti in scadenza nei prossimi 60 giorni. Proponi rinnovo anticipato.',
                azione: 'email',
                priorita: 9
            });
        }

        // 3. Se ha consenso marketing ma mai ricevuto email
        if (clienteData.consenso_marketing === 1) {
            const emailInviate = await pool.query(`
                SELECT COUNT(*) as count FROM email_logs 
                WHERE (cliente_privato_id = ? OR cliente_azienda_id = ?)
            `, [clientId, clientId]);

            if ((emailInviate.rows[0] as any).count === 0) {
                suggerimenti.push({
                    tipo: 'canale_comunicazione',
                    titolo: 'Invio prima email marketing',
                    descrizione: 'Il cliente ha dato consenso marketing ma non ha mai ricevuto comunicazioni email.',
                    azione: 'email_marketing',
                    priorita: 6
                });
            }
        }

        // Salva suggerimenti nel DB
        for (const sug of suggerimenti) {
            const sugId = randomUUID();
            await pool.query(`
                INSERT INTO cliente_ai_suggerimenti (
                    id, cliente_id, tipo_cliente, tipo_suggerimento, titolo, descrizione,
                    azione_suggerita, priorita, motivo, stato
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'attivo')
            `, [
                sugId,
                clientId,
                tipoCliente,
                sug.tipo,
                sug.titolo,
                sug.descrizione,
                sug.azione,
                sug.priorita,
                'Suggerimento automatico basato su analisi cliente'
            ]);
        }

        // Recupera tutti i suggerimenti attivi
        const result = await pool.query(`
            SELECT * FROM cliente_ai_suggerimenti
            WHERE cliente_id = ? AND tipo_cliente = ? AND stato = 'attivo'
            ORDER BY priorita DESC
        `, [clientId, tipoCliente]);

        res.json({
            success: true,
            message: `${suggerimenti.length} nuovi suggerimenti generati`,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

// PUT: Marca suggerimento come applicato
router.put('/ai-suggestions/:id/apply', authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        await pool.query(`
            UPDATE cliente_ai_suggerimenti
            SET stato = 'applicato',
                applicato_da = ?,
                applicato_il = datetime('now')
            WHERE id = ?
        `, [req.user!.userId, id]);

        res.json({
            success: true,
            message: 'Suggerimento applicato'
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// 4. SMS
// ==========================================

// POST: Invia SMS
router.post('/clients/:clientId/sms', authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clientId } = req.params;
        const { tipoCliente, numeroDestinatario, testo } = req.body;

        const smsId = randomUUID();

        // Salva SMS nel DB
        await pool.query(`
            INSERT INTO cliente_sms (
                id, cliente_id, tipo_cliente, numero_destinatario, testo,
                stato, inviato_da
            ) VALUES (?, ?, ?, ?, ?, 'in_coda', ?)
        `, [smsId, clientId, tipoCliente, numeroDestinatario, testo, req.user!.userId]);

        // TODO: Qui integrare Twilio o altro provider SMS
        // Per ora simuliamo invio immediato
        await pool.query(`
            UPDATE cliente_sms
            SET stato = 'inviato'
            WHERE id = ?
        `, [smsId]);

        // Registra azione
        await pool.query(`
            INSERT INTO cliente_azioni (
                id, cliente_id, tipo_cliente, tipo_azione, titolo, descrizione,
                esito, utente_id, metadata
            ) VALUES (?, ?, ?, 'sms', 'SMS inviato', ?, 'successo', ?, ?)
        `, [
            randomUUID(),
            clientId,
            tipoCliente,
            `SMS a ${numeroDestinatario}: ${testo.substring(0, 50)}...`,
            req.user!.userId,
            JSON.stringify({ sms_id: smsId, numero: numeroDestinatario })
        ]);

        res.status(201).json({
            success: true,
            message: 'SMS inviato con successo',
            data: { id: smsId, stato: 'inviato' }
        });
    } catch (error) {
        next(error);
    }
});

// GET: Lista SMS inviati a cliente
router.get('/clients/:clientId/sms', authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clientId } = req.params;
        const { tipoCliente } = req.query;

        const result = await pool.query(`
            SELECT 
                sms.*,
                u.nome || ' ' || u.cognome as inviato_da_nome
            FROM cliente_sms sms
            LEFT JOIN users u ON sms.inviato_da = u.id
            WHERE sms.cliente_id = ? AND sms.tipo_cliente = ?
            ORDER BY sms.inviato_il DESC
        `, [clientId, tipoCliente]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// 5. INVIO EMAIL PERSONALIZZATA
// ==========================================

// POST: Invia email personalizzata a cliente
router.post('/send-custom-email', authenticate, authorize(), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { destinatari, oggetto, corpo, clienteId, tipoCliente } = req.body;

        if (!destinatari || !Array.isArray(destinatari) || destinatari.length === 0) {
            return res.status(400).json({ success: false, message: 'Destinatari non validi' });
        }

        if (!oggetto || !corpo) {
            return res.status(400).json({ success: false, message: 'Oggetto e corpo email obbligatori' });
        }

        // Recupera configurazione Brevo dal DB
        const brevoConfig = await pool.query(`
            SELECT valore FROM configurazioni WHERE chiave = 'brevo_api_key'
        `);

        const brevoSmtpUser = await pool.query(`
            SELECT valore FROM configurazioni WHERE chiave = 'brevo_smtp_user'
        `);

        const brevoSmtpPass = await pool.query(`
            SELECT valore FROM configurazioni WHERE chiave = 'brevo_smtp_pass'
        `);

        const senderEmail = await pool.query(`
            SELECT valore FROM configurazioni WHERE chiave = 'email_sender_address'
        `);

        // Fallback a variabili d'ambiente se DB è vuoto o mancante
        const smtpUser = (brevoSmtpUser.rows[0] as any)?.valore || process.env.BREVO_SMTP_USER || '';
        const smtpPass = (brevoSmtpPass.rows[0] as any)?.valore || process.env.BREVO_SMTP_PASS || '';
        const sender = (senderEmail.rows[0] as any)?.valore || process.env.EMAIL_SENDER_ADDRESS || '';

        if (!smtpUser || !smtpPass || !sender) {
            return res.status(500).json({ 
                success: false, 
                message: 'Configurazione email non trovata o incompleta (DB/ENV). Configura Brevo.' 
            });
        }

        // Configura transporter Nodemailer
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        // Invia email
        await transporter.sendMail({
            from: sender,
            to: destinatari.join(', '),
            subject: oggetto,
            html: corpo
        });

        console.log(`✅ Email personalizzata inviata: ${destinatari.join(', ')} | Subject: ${oggetto}`);

        // Registra azione nel DB
        if (clienteId && tipoCliente) {
            await pool.query(`
                INSERT INTO cliente_azioni (
                    id, cliente_id, tipo_cliente, tipo_azione, titolo, descrizione,
                    esito, utente_id, metadata
                ) VALUES (?, ?, ?, 'email', 'Email personalizzata inviata', ?, 'successo', ?, ?)
            `, [
                randomUUID(),
                clienteId,
                tipoCliente,
                `Oggetto: ${oggetto}`,
                req.user!.userId,
                JSON.stringify({ destinatari, oggetto, tipo: 'custom' })
            ]);

            // Aggiorna data_ultimo_contatto
            const tableName = tipoCliente === 'privato' ? 'clienti_privati' : 'clienti_aziende';
            await pool.query(`
                UPDATE ${tableName}
                SET data_ultimo_contatto = datetime('now'),
                    tipo_ultimo_contatto = 'email'
                WHERE id = ?
            `, [clienteId]);
        }

        res.json({
            success: true,
            message: 'Email inviata con successo',
            data: { sent: destinatari.length }
        });
    } catch (error: any) {
        console.error('❌ Errore invio email personalizzata:', error);
        next(error);
    }
});

export default router;

