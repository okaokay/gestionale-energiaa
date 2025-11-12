/**
 * Route per email marketing e campagne
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { sendEmail, sendTestEmail, getTodayEmailStats } from '../services/emailService';
import { Parser } from 'json2csv';
import { sendSingleCampaign, runManualCampaignCheck } from '../cron/campaignScheduler';

const router = Router();

// ═══════════════════════════════════════════════════
// PUBLIC ENDPOINTS (no auth)
// ═══════════════════════════════════════════════════

/**
 * POST /api/emails/webhook/brevo
 * Webhook Brevo per tracking aperture, click, bounce
 * @public (chiamato da Brevo)
 */
router.post('/webhook/brevo', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { event, email, 'message-id': messageId, date, link, tag, reason } = req.body;
        
        console.log(`📨 Webhook Brevo ricevuto: ${event} per ${email}`);
        
        // Trova log email tramite message ID
        const emailLog = await pool.query(`
            SELECT id FROM email_logs 
            WHERE brevo_message_id = ? 
            LIMIT 1
        `, [messageId]);
        
        if (emailLog.rows.length === 0) {
            console.warn(`⚠️  Email log non trovato per message ID: ${messageId}`);
            return res.status(200).json({ success: true, message: 'Log non trovato, ignorato' });
        }
        
        const logId = (emailLog.rows[0] as any).id;
        
        // Aggiorna log in base al tipo di evento
        switch (event) {
            case 'delivered':
                await pool.query(`
                    UPDATE email_logs 
                    SET stato = 'inviato', delivered_at = datetime('now')
                    WHERE id = ?
                `, [logId]);
                
                // Incrementa counter campagna
                await pool.query(`
                    UPDATE email_campaigns 
                    SET delivered_count = delivered_count + 1
                    WHERE id = (SELECT campaign_id FROM email_logs WHERE id = ?)
                `, [logId]);
                break;
                
            case 'opened':
            case 'unique_opened':
                await pool.query(`
                    UPDATE email_logs 
                    SET opened_at = datetime('now')
                    WHERE id = ? AND opened_at IS NULL
                `, [logId]);
                
                // Incrementa counter campagna
                await pool.query(`
                    UPDATE email_campaigns 
                    SET opened_count = opened_count + 1
                    WHERE id = (SELECT campaign_id FROM email_logs WHERE id = ? AND opened_at WAS NULL)
                `, [logId]);
                break;
                
            case 'click':
                await pool.query(`
                    UPDATE email_logs 
                    SET clicked_at = datetime('now')
                    WHERE id = ? AND clicked_at IS NULL
                `, [logId]);
                
                // Incrementa counter campagna
                await pool.query(`
                    UPDATE email_campaigns 
                    SET clicked_count = clicked_count + 1
                    WHERE id = (SELECT campaign_id FROM email_logs WHERE id = ? AND clicked_at WAS NULL)
                `, [logId]);
                break;
                
            case 'soft_bounce':
            case 'hard_bounce':
            case 'invalid_email':
            case 'blocked':
                await pool.query(`
                    UPDATE email_logs 
                    SET stato = 'fallito', errore = ?
                    WHERE id = ?
                `, [reason || event, logId]);
                
                // Incrementa counter failed campagna
                await pool.query(`
                    UPDATE email_campaigns 
                    SET failed_count = failed_count + 1
                    WHERE id = (SELECT campaign_id FROM email_logs WHERE id = ?)
                `, [logId]);
                break;
                
            case 'unsubscribe':
                await pool.query(`
                    UPDATE email_logs 
                    SET unsubscribed_at = datetime('now')
                    WHERE id = ?
                `, [logId]);
                
                // Disattiva newsletter per il cliente
                const log = await pool.query(`SELECT cliente_privato_id, cliente_azienda_id FROM email_logs WHERE id = ?`, [logId]);
                const logData = log.rows[0] as any;
                
                if (logData.cliente_privato_id) {
                    await pool.query(`UPDATE clienti_privati SET newsletter_attiva = 0 WHERE id = ?`, [logData.cliente_privato_id]);
                } else if (logData.cliente_azienda_id) {
                    await pool.query(`UPDATE clienti_aziende SET newsletter_attiva = 0 WHERE id = ?`, [logData.cliente_azienda_id]);
                }
                break;
                
            default:
                console.log(`ℹ️  Evento Brevo non gestito: ${event}`);
        }
        
        res.status(200).json({ success: true, message: 'Webhook processato' });
        
    } catch (error: any) {
        console.error('❌ Errore processing webhook Brevo:', error);
        // Risponde sempre 200 per evitare che Brevo riprovi
        res.status(200).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/emails/unsubscribe
 * Endpoint per link unsubscribe nelle email
 */
router.get('/unsubscribe', async (req: Request, res: Response) => {
    try {
        const { token, email } = req.query;
        
        if (!token && !email) {
            return res.status(400).send('<html><body><h1>❌ Token non valido</h1></body></html>');
        }
        
        // Trova cliente tramite token o email
        let cliente = null;
        if (token) {
            const privato = await pool.query(`SELECT id, 'privato' as tipo FROM clienti_privati WHERE unsubscribe_token = ?`, [token]);
            const azienda = await pool.query(`SELECT id, 'azienda' as tipo FROM clienti_aziende WHERE unsubscribe_token = ?`, [token]);
            cliente = privato.rows[0] || azienda.rows[0];
        } else if (email) {
            const privato = await pool.query(`SELECT id, 'privato' as tipo FROM clienti_privati WHERE email_principale = ?`, [email]);
            const azienda = await pool.query(`SELECT id, 'azienda' as tipo FROM clienti_aziende WHERE email_referente = ?`, [email]);
            cliente = privato.rows[0] || azienda.rows[0];
        }
        
        if (!cliente) {
            return res.status(404).send('<html><body><h1>❌ Cliente non trovato</h1></body></html>');
        }
        
        // Disattiva newsletter
        const table = (cliente as any).tipo === 'privato' ? 'clienti_privati' : 'clienti_aziende';
        await pool.query(`UPDATE ${table} SET newsletter_attiva = 0 WHERE id = ?`, [(cliente as any).id]);
        
        res.send(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Disiscrizione Completata</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                    .container { background: white; max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #4CAF50; }
                    p { color: #666; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ Disiscrizione Completata</h1>
                    <p>Ti sei disiscritto con successo dalle nostre email di marketing.</p>
                    <p>Non riceverai più email promozionali da parte nostra.</p>
                    <p><small>Continuerai a ricevere email importanti relative ai tuoi contratti attivi.</small></p>
                </div>
            </body>
            </html>
        `);
        
    } catch (error) {
        res.status(500).send('<html><body><h1>❌ Errore durante la disiscrizione</h1></body></html>');
    }
});

// ═══════════════════════════════════════════════════
// AUTHENTICATED ENDPOINTS
// ═══════════════════════════════════════════════════
router.use(authenticate);

/**
 * GET /api/emails/templates
 * Lista template email
 */
router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await pool.query(`
            SELECT * FROM email_templates 
            WHERE attivo = 1
            ORDER BY tipo, nome
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/emails/templates
 * Crea template email
 */
router.post('/templates', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { nome, subject, html_content, design_json, tipo } = req.body;
        
        if (!nome || !html_content) {
            return res.status(400).json({
                success: false,
                message: 'Nome e contenuto HTML sono richiesti'
            });
        }
        
        const { randomUUID } = require('crypto');
        const templateId = randomUUID();
        
        await pool.query(`
            INSERT INTO email_templates (
                id, nome, tipo, subject, html_content, design_json, attivo, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `, [templateId, nome, tipo || 'custom', subject || nome, html_content, design_json || null]);
        
        const result = await pool.query(`SELECT * FROM email_templates WHERE id = ?`, [templateId]);
        
        res.status(201).json({
            success: true,
            message: 'Template creato con successo',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/emails/templates/:id
 * Aggiorna template email
 */
router.put('/templates/:id', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { nome, subject, html_content, design_json, tipo } = req.body;
        
        if (!nome || !html_content) {
            return res.status(400).json({
                success: false,
                message: 'Nome e contenuto HTML sono richiesti'
            });
        }
        
        await pool.query(`
            UPDATE email_templates 
            SET nome = ?, tipo = ?, subject = ?, html_content = ?, design_json = ?, updated_at = datetime('now')
            WHERE id = ?
        `, [nome, tipo || 'custom', subject || nome, html_content, design_json || null, id]);
        
        const result = await pool.query(`SELECT * FROM email_templates WHERE id = ?`, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Template non trovato'
            });
        }
        
        res.json({
            success: true,
            message: 'Template aggiornato con successo',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/emails/campaigns
 * Lista campagne email
 */
router.get('/campaigns', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stato = req.query.stato as string;
        
        let query = 'SELECT * FROM email_campaigns';
        const params: any[] = [];
        
        if (stato) {
            query += ' WHERE stato = $1';
            params.push(stato);
        }
        
        query += ' ORDER BY created_at DESC';
        
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
 * POST /api/emails/campaigns
 * Crea campagna email
 */
router.post('/campaigns', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            nome, tipo, template_id, target_clienti,
            offerta_id, scheduled_at, scheduled_end_at, subject,
            selected_client_ids, manual_emails
        } = req.body;
        
        const { randomUUID } = require('crypto');
        const campaignId = randomUUID();
        
        // Prepara filtri di targeting (per selezione manuale)
        let filtri_targeting = null;
        if (target_clienti === 'selezione_manuale') {
            filtri_targeting = JSON.stringify({
                selected_client_ids: selected_client_ids || [],
                manual_emails: manual_emails || []
            });
        }
        
        // Calcola total_recipients per selezione manuale
        let totalRecipients = 0;
        if (target_clienti === 'selezione_manuale') {
            totalRecipients = (selected_client_ids || []).length + (manual_emails || []).length;
        }
        
        await pool.query(`
            INSERT INTO email_campaigns (
                id, nome, tipo, template_id, target_clienti,
                offerta_id, scheduled_at, scheduled_end_at, stato, creato_da,
                subject, filtri_targeting, total_recipients, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            campaignId, nome, tipo || 'promozionale', template_id || null, target_clienti || 'entrambi',
            offerta_id || null, scheduled_at || null, scheduled_end_at || null, scheduled_at ? 'programmata' : 'bozza',
            req.user!.userId, subject || nome,
            filtri_targeting, totalRecipients
        ]);
        
        const result = await pool.query(`SELECT * FROM email_campaigns WHERE id = ?`, [campaignId]);
        
        res.status(201).json({
            success: true,
            message: `Campagna creata con successo${totalRecipients > 0 ? ` con ${totalRecipients} destinatari` : ''}`,
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/emails/campaigns/:id
 * Dettagli completi campagna
 */
router.get('/campaigns/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        // Recupera campagna con statistiche
        const campaign = await pool.query(`
            SELECT 
                c.*,
                t.nome as template_nome,
                u.nome as creato_da_nome
            FROM email_campaigns c
            LEFT JOIN email_templates t ON c.template_id = t.id
            LEFT JOIN users u ON c.creato_da = u.id
            WHERE c.id = ?
        `, [id]);
        
        if (campaign.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Campagna non trovata' });
        }
        
        const campaignData = campaign.rows[0] as any;
        
        // Parse filtri_targeting se presente
        if (campaignData.filtri_targeting) {
            try {
                campaignData.filtri_targeting = JSON.parse(campaignData.filtri_targeting);
            } catch (e) {
                campaignData.filtri_targeting = null;
            }
        }
        
        // Recupera statistiche email
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as totale_invii,
                SUM(CASE WHEN stato = 'inviato' THEN 1 ELSE 0 END) as invii_riusciti,
                SUM(CASE WHEN stato = 'fallito' THEN 1 ELSE 0 END) as invii_falliti,
                SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as totale_aperture,
                SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as totale_click
            FROM email_logs
            WHERE campaign_id = ?
        `, [id]);
        
        const statsData = stats.rows[0] as any;
        const totale = statsData.totale_invii || 0;
        
        campaignData.statistiche = {
            totale_invii: totale,
            invii_riusciti: statsData.invii_riusciti || 0,
            invii_falliti: statsData.invii_falliti || 0,
            totale_aperture: statsData.totale_aperture || 0,
            totale_click: statsData.totale_click || 0,
            tasso_apertura: totale > 0 ? ((statsData.totale_aperture || 0) / totale * 100).toFixed(2) : '0.00',
            tasso_click: totale > 0 ? ((statsData.totale_click || 0) / totale * 100).toFixed(2) : '0.00'
        };
        
        res.json({
            success: true,
            data: campaignData
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/emails/campaigns/:id
 * Modifica campagna (solo se bozza o programmata)
 */
router.put('/campaigns/:id', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { nome, tipo, template_id, target_clienti, subject, scheduled_at, scheduled_end_at, selected_client_ids, manual_emails } = req.body;
        
        // Verifica che la campagna esista e sia modificabile
        const campaign = await pool.query(`SELECT stato FROM email_campaigns WHERE id = ?`, [id]);
        
        if (campaign.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Campagna non trovata' });
        }
        
        const currentStato = (campaign.rows[0] as any).stato;
        
        if (!['bozza', 'programmata'].includes(currentStato)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Impossibile modificare campagna già inviata o in corso' 
            });
        }
        
        // Prepara filtri di targeting per selezione manuale
        let filtri_targeting = null;
        let totalRecipients = 0;
        
        if (target_clienti === 'selezione_manuale') {
            filtri_targeting = JSON.stringify({
                selected_client_ids: selected_client_ids || [],
                manual_emails: manual_emails || []
            });
            totalRecipients = (selected_client_ids || []).length + (manual_emails || []).length;
        }
        
        // Determina nuovo stato
        const newStato = scheduled_at ? 'programmata' : 'bozza';
        
        // Aggiorna campagna
        await pool.query(`
            UPDATE email_campaigns 
            SET nome = ?, tipo = ?, template_id = ?, target_clienti = ?, 
                subject = ?, scheduled_at = ?, scheduled_end_at = ?, stato = ?, filtri_targeting = ?, 
                total_recipients = ?, updated_at = datetime('now')
            WHERE id = ?
        `, [
            nome, tipo, template_id || null, target_clienti, 
            subject, scheduled_at || null, scheduled_end_at || null, newStato, filtri_targeting,
            totalRecipients, id
        ]);
        
        // Recupera campagna aggiornata
        const updated = await pool.query(`SELECT * FROM email_campaigns WHERE id = ?`, [id]);
        
        res.json({
            success: true,
            message: 'Campagna aggiornata con successo',
            data: updated.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/emails/campaigns/:id
 * Elimina campagna (solo se bozza)
 */
router.delete('/campaigns/:id', authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        // Verifica che la campagna esista e sia eliminabile
        const campaign = await pool.query(`SELECT stato FROM email_campaigns WHERE id = ?`, [id]);
        
        if (campaign.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Campagna non trovata' });
        }
        
        const currentStato = (campaign.rows[0] as any).stato;
        
        if (currentStato !== 'bozza') {
            return res.status(400).json({ 
                success: false, 
                message: 'Impossibile eliminare campagna già programmata o inviata' 
            });
        }
        
        // Elimina log email associati (se presenti)
        await pool.query(`DELETE FROM email_logs WHERE campaign_id = ?`, [id]);
        
        // Elimina campagna
        await pool.query(`DELETE FROM email_campaigns WHERE id = ?`, [id]);
        
        res.json({
            success: true,
            message: 'Campagna eliminata con successo'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/emails/campaigns/:id/send
 * Invia immediatamente una campagna (solo se bozza)
 */
router.post('/campaigns/:id/send', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        // Verifica che la campagna esista e sia inviabile
        const campaign = await pool.query(`SELECT * FROM email_campaigns WHERE id = ?`, [id]);
        
        if (campaign.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Campagna non trovata' });
        }
        
        const campaignData = campaign.rows[0] as any;
        
        if (campaignData.stato !== 'bozza') {
            return res.status(400).json({ 
                success: false, 
                message: 'Impossibile inviare campagna già programmata o inviata' 
            });
        }
        
        // Avvia il processo di invio utilizzando la funzione riutilizzabile
        console.log(`🚀 [ENDPOINT] Chiamando sendSingleCampaign per campagna ${id}`);
        const result = await sendSingleCampaign(id);
        console.log(`📊 [ENDPOINT] Risultato sendSingleCampaign:`, result);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: result.message,
                data: { id, stato: 'in_invio' }
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: result.message
            });
        }
        
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/emails/campaigns/:id/cancel
 * Annulla programmazione campagna (solo se programmata)
 */
router.post('/campaigns/:id/cancel', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        // Verifica che la campagna esista e sia annullabile
        const campaign = await pool.query(`SELECT stato FROM email_campaigns WHERE id = ?`, [id]);
        
        if (campaign.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Campagna non trovata' });
        }
        
        const currentStato = (campaign.rows[0] as any).stato;
        
        if (currentStato !== 'programmata') {
            return res.status(400).json({ 
                success: false, 
                message: 'Impossibile annullare campagna non programmata' 
            });
        }
        
        // Aggiorna stato a "annullata"
        await pool.query(`
            UPDATE email_campaigns 
            SET stato = 'annullata', updated_at = datetime('now')
            WHERE id = ?
        `, [id]);
        
        const updated = await pool.query(`SELECT * FROM email_campaigns WHERE id = ?`, [id]);
        
        res.json({
            success: true,
            message: 'Programmazione campagna annullata',
            data: updated.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/emails/campaigns/:id/duplicate
 * Duplica una campagna esistente
 */
router.post('/campaigns/:id/duplicate', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        // Recupera campagna originale
        const original = await pool.query(`SELECT * FROM email_campaigns WHERE id = ?`, [id]);
        
        if (original.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Campagna non trovata' });
        }
        
        const campaign = original.rows[0] as any;
        const { randomUUID } = require('crypto');
        const newId = randomUUID();
        
        // Crea nuova campagna (copia)
        await pool.query(`
            INSERT INTO email_campaigns (
                id, nome, tipo, template_id, target_clienti,
                offerta_id, subject, stato, creato_da,
                filtri_targeting, total_recipients, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
            newId,
            `${campaign.nome} (Copia)`,
            campaign.tipo,
            campaign.template_id,
            campaign.target_clienti,
            campaign.offerta_id,
            campaign.subject,
            'bozza', // Sempre come bozza
            req.user!.userId,
            campaign.filtri_targeting,
            campaign.total_recipients
        ]);
        
        const newCampaign = await pool.query(`SELECT * FROM email_campaigns WHERE id = ?`, [newId]);
        
        res.status(201).json({
            success: true,
            message: 'Campagna duplicata con successo',
            data: newCampaign.rows[0]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/emails/campaigns/:id/preview
 * Anteprima email campagna
 */
router.post('/campaigns/:id/preview', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { email } = req.body;
        
        // Recupera campagna
        const campaign = await pool.query(`
            SELECT c.*, t.html_content, t.subject as template_subject
            FROM email_campaigns c
            LEFT JOIN email_templates t ON c.template_id = t.id
            WHERE c.id = ?
        `, [id]);
        
        if (campaign.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Campagna non trovata' });
        }
        
        const c = campaign.rows[0] as any;
        
        // Template HTML (o default)
        let html = c.html_content || '<html><body><h1>{{nome_cliente}}</h1><p>Contenuto email campagna</p></body></html>';
        const subject = c.subject || c.template_subject || c.nome;
        
        // Personalizza con dati fittizi per preview
        html = html
            .replace(/\{\{nome_cliente\}\}/g, 'Mario Rossi')
            .replace(/\{\{email_cliente\}\}/g, email || 'cliente@esempio.it');
        
        res.json({
            success: true,
            data: {
                subject,
                html,
                campaign_name: c.nome
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/emails/campaigns/:id/send-test
 * Invia email di test per una campagna
 */
router.post('/campaigns/:id/send-test', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email destinatario richiesta' });
        }
        
        // Recupera campagna e template
        const campaign = await pool.query(`
            SELECT c.*, t.html_content, t.subject as template_subject
            FROM email_campaigns c
            LEFT JOIN email_templates t ON c.template_id = t.id
            WHERE c.id = ?
        `, [id]);
        
        if (campaign.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Campagna non trovata' });
        }
        
        const c = campaign.rows[0] as any;
        
        // Template HTML
        let html = c.html_content || '<html><body><h1>{{nome_cliente}}</h1><p>[EMAIL TEST] Contenuto campagna</p></body></html>';
        const subject = `[TEST] ${c.subject || c.template_subject || c.nome}`;
        
        // Personalizza
        html = html
            .replace(/\{\{nome_cliente\}\}/g, 'Test Utente')
            .replace(/\{\{email_cliente\}\}/g, email);
        
        // Invia email
        const result = await sendEmail({
            to: email,
            subject,
            html,
            tipoCliente: 'privato',
            tipoEmail: 'custom',
            clientePrivatoId: undefined,
            clienteAziendaId: undefined
        });
        
        if (result.success) {
            res.json({
                success: true,
                message: `Email di test inviata a ${email}`
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error || 'Errore invio email'
            });
        }
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/emails/test
 * Invia email di test
 */
router.post('/test', authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email destinatario richiesta' });
        }
        
        const result = await sendTestEmail(email);
        
        if (result.success) {
            res.json({
                success: true,
                message: `Email di test inviata a ${email}`,
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.error
            });
        }
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/emails/stats/today
 * Statistiche email giornaliere
 */
router.get('/stats/today', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await getTodayEmailStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/emails/campaigns/:id/stats
 * Statistiche campagna
 */
router.get('/campaigns/:id/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        // Recupera campagna
        const campaign = await pool.query(`SELECT * FROM email_campaigns WHERE id = ?`, [id]);
        
        if (campaign.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Campagna non trovata' });
        }
        
        // Recupera log email
        const logs = await pool.query(`
            SELECT 
                COUNT(*) as totale_invii,
                SUM(CASE WHEN stato = 'inviato' THEN 1 ELSE 0 END) as invii_riusciti,
                SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as totale_aperture,
                SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as totale_click
            FROM email_logs
            WHERE campaign_id = ?
        `, [id]);
        
        const stats = logs.rows[0] as any;
        const totale = stats.totale_invii || 0;
        const campaignData = campaign.rows[0] as any;
        
        res.json({
            success: true,
            data: {
                ...campaignData,
                totale_invii: totale,
                invii_riusciti: stats.invii_riusciti || 0,
                totale_aperture: stats.totale_aperture || 0,
                totale_click: stats.totale_click || 0,
                tasso_apertura: totale > 0 ? ((stats.totale_aperture || 0) / totale * 100).toFixed(2) : 0,
                tasso_click: totale > 0 ? ((stats.totale_click || 0) / totale * 100).toFixed(2) : 0
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/emails/campaigns/:id/export-recipients
 * Export CSV destinatari campagna
 */
router.get('/campaigns/:id/export-recipients', authorize('operatore', 'admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        
        // Recupera campagna
        const campaign = await pool.query(`SELECT * FROM email_campaigns WHERE id = ?`, [id]);
        
        if (campaign.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Campagna non trovata' });
        }
        
        const campaignData = campaign.rows[0] as any;
        
        // Recupera destinatari con status invio
        const recipients = await pool.query(`
            SELECT 
                el.email_destinatario as email,
                el.tipo_cliente,
                COALESCE(cp.nome || ' ' || cp.cognome, ca.ragione_sociale) as nome_cliente,
                COALESCE(cp.telefono_principale, ca.telefono_referente) as telefono,
                el.stato,
                el.sent_at as data_invio,
                el.opened_at as data_apertura,
                el.clicked_at as data_click
            FROM email_logs el
            LEFT JOIN clienti_privati cp ON el.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON el.cliente_azienda_id = ca.id
            WHERE el.campaign_id = ?
            ORDER BY el.sent_at DESC
        `, [id]);
        
        // Prepara dati per CSV
        const csvData = recipients.rows.map((r: any) => ({
            'Email': r.email,
            'Nome Cliente': r.nome_cliente || 'N/A',
            'Tipo': r.tipo_cliente === 'privato' ? 'Privato' : 'Azienda',
            'Telefono': r.telefono || 'N/A',
            'Stato Invio': r.stato,
            'Data Invio': r.data_invio ? new Date(r.data_invio).toLocaleString('it-IT') : 'N/A',
            'Aperta': r.data_apertura ? 'Sì' : 'No',
            'Data Apertura': r.data_apertura ? new Date(r.data_apertura).toLocaleString('it-IT') : 'N/A',
            'Click': r.data_click ? 'Sì' : 'No'
        }));
        
        // Genera CSV
        const parser = new Parser({
            delimiter: ';',
            withBOM: true // Per compatibilità Excel
        });
        const csv = parser.parse(csvData);
        
        // Invia file CSV
        const filename = `campagna_${campaignData.nome}_destinatari_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
        
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/emails/export-all-clients
 * Export CSV tutti i clienti con consenso marketing
 */
router.get('/export-all-clients', authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Clienti privati con newsletter attiva
        const privati = await pool.query(`
            SELECT 
                'Privato' as tipo,
                nome || ' ' || cognome as nome_completo,
                email_principale as email,
                telefono_principale as telefono,
                citta_residenza as citta,
                'Sì' as newsletter_attiva
            FROM clienti_privati
            WHERE newsletter_attiva = 1
        `);
        
        // Clienti aziende con newsletter attiva
        const aziende = await pool.query(`
            SELECT 
                'Azienda' as tipo,
                ragione_sociale as nome_completo,
                email_referente as email,
                telefono_referente as telefono,
                citta_sede as citta,
                'Sì' as newsletter_attiva
            FROM clienti_aziende
            WHERE newsletter_attiva = 1
        `);
        
        const allClients = [...privati.rows, ...aziende.rows];
        
        // Prepara dati per CSV
        const csvData = allClients.map((c: any) => ({
            'Tipo Cliente': c.tipo,
            'Nome/Ragione Sociale': c.nome_completo,
            'Email': c.email,
            'Telefono': c.telefono || 'N/A',
            'Città': c.citta || 'N/A',
            'Newsletter': c.newsletter_attiva
        }));
        
        // Genera CSV
        const parser = new Parser({
            delimiter: ';',
            withBOM: true
        });
        const csv = parser.parse(csvData);
        
        // Invia file CSV
        const filename = `clienti_email_marketing_${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
        
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/emails/storico-cliente/:tipo/:id
 * Recupera storico email inviate a un cliente
 */
router.get('/storico-cliente/:tipo/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tipo, id } = req.params;
        
        const field = tipo === 'privato' ? 'cliente_privato_id' : 'cliente_azienda_id';
        
        const result = await pool.query(`
            SELECT 
                el.*,
                ec.nome as nome_campagna,
                ec.tipo as tipo_campagna,
                et.nome as nome_template
            FROM email_logs el
            LEFT JOIN email_campaigns ec ON el.campaign_id = ec.id
            LEFT JOIN email_templates et ON ec.template_id = et.id
            WHERE el.${field} = ?
            ORDER BY el.sent_at DESC
            LIMIT 100
        `, [id]);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/emails/logs
 * Lista email inviate con filtri per periodo
 */
router.get('/logs', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { periodo = 'giorno', page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const offset = (pageNum - 1) * limitNum;
        
        let dateFilter = '';
        let dateFilterWithAlias = ''; // Per query con JOIN
        let groupBy = '';
        
        // Calcola filtro data in base al periodo
        switch (periodo) {
            case 'giorno':
                dateFilter = "date(sent_at) = date('now')";
                dateFilterWithAlias = "date(el.sent_at) = date('now')";
                groupBy = "date(sent_at)";
                break;
            case 'settimana':
                dateFilter = "date(sent_at) >= date('now', '-7 days')";
                dateFilterWithAlias = "date(el.sent_at) >= date('now', '-7 days')";
                groupBy = "strftime('%Y-%W', sent_at)";
                break;
            case 'mese':
                dateFilter = "date(sent_at) >= date('now', '-30 days')";
                dateFilterWithAlias = "date(el.sent_at) >= date('now', '-30 days')";
                groupBy = "strftime('%Y-%m', sent_at)";
                break;
            case 'anno':
                dateFilter = "date(sent_at) >= date('now', '-365 days')";
                dateFilterWithAlias = "date(el.sent_at) >= date('now', '-365 days')";
                groupBy = "strftime('%Y', sent_at)";
                break;
            case 'tutto':
                dateFilter = '1=1'; // Nessun filtro
                dateFilterWithAlias = '1=1';
                groupBy = "strftime('%Y-%m', sent_at)";
                break;
            default:
                dateFilter = "date(sent_at) = date('now')";
                dateFilterWithAlias = "date(el.sent_at) = date('now')";
                groupBy = "date(sent_at)";
        }
        
        // Query per lista email
        const logsQuery = `
            SELECT 
                el.id,
                el.email_destinatario,
                el.subject,
                el.tipo_email,
                el.stato,
                el.sent_at,
                el.delivered_at,
                el.opened_at,
                el.clicked_at,
                el.errore,
                ec.nome as campagna_nome,
                cp.nome || ' ' || cp.cognome as cliente_nome_privato,
                ca.ragione_sociale as cliente_nome_azienda
            FROM email_logs el
            LEFT JOIN email_campaigns ec ON el.campaign_id = ec.id
            LEFT JOIN clienti_privati cp ON el.cliente_privato_id = cp.id
            LEFT JOIN clienti_aziende ca ON el.cliente_azienda_id = ca.id
            WHERE ${dateFilterWithAlias}
            ORDER BY el.sent_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const logs = await pool.query(logsQuery, [limitNum, offset]);
        
        // Query per totali
        const countQuery = `
            SELECT COUNT(*) as total
            FROM email_logs
            WHERE ${dateFilter}
        `;
        
        const countResult = await pool.query(countQuery);
        const total = (countResult.rows[0] as any).total;
        
        // Query per statistiche raggruppate per periodo
        const statsQuery = `
            SELECT 
                ${groupBy} as periodo,
                COUNT(*) as totale,
                SUM(CASE WHEN stato = 'inviato' THEN 1 ELSE 0 END) as inviate,
                SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as aperte,
                SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as cliccate,
                SUM(CASE WHEN stato = 'fallito' THEN 1 ELSE 0 END) as fallite
            FROM email_logs
            WHERE ${dateFilter}
            GROUP BY ${groupBy}
            ORDER BY periodo DESC
        `;
        
        const stats = await pool.query(statsQuery);
        
        res.json({
            success: true,
            data: {
                logs: logs.rows,
                stats: stats.rows,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/emails/campaigns/check-scheduled
 * Trigger manuale controllo campagne programmate
 * @auth admin, super_admin
 */
router.post('/campaigns/check-scheduled', authorize('admin', 'super_admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('🧪 Trigger manuale controllo campagne programmate...');
        
        const result = await runManualCampaignCheck();
        
        res.json({
            success: true,
            message: 'Controllo campagne eseguito',
            data: result
        });
    } catch (error) {
        console.error('❌ Errore trigger manuale:', error);
        next(error);
    }
});

export default router;

