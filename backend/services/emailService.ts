/**
 * Email Service - Invio email con Nodemailer + Brevo
 * Gestisce: invio, retry, rate limiting, logging
 */

import nodemailer from 'nodemailer';
import { getEmailConfig, emailConfig } from '../config/email';
import { pool } from '../config/database';
import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════════════
// TRANSPORTER NODEMAILER (Brevo SMTP)
// ═══════════════════════════════════════════════════
let transporter: nodemailer.Transporter | null = null;
let lastConfigUpdate = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minuto

export async function initializeEmailTransporter(): Promise<nodemailer.Transporter> {
    // Ricarica configurazioni se cache scaduta
    const now = Date.now();
    if (!transporter || now - lastConfigUpdate > CONFIG_CACHE_TTL) {
        const config = await getEmailConfig();
        
        transporter = nodemailer.createTransport({
            host: config.brevo.host,
            port: config.brevo.port,
            secure: config.brevo.secure,
            auth: {
                user: config.brevo.auth.user,
                pass: config.brevo.auth.pass
            }
        });
        
        lastConfigUpdate = now;
        console.log('✅ Email transporter (Brevo) inizializzato con credenziali da DB');
        console.log(`   SMTP User: ${config.brevo.auth.user || 'NON CONFIGURATO'}`);
    }
    
    return transporter!;
}

// ═══════════════════════════════════════════════════
// INTERFACCE
// ═══════════════════════════════════════════════════
export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    campaignId?: string;
    clientePrivatoId?: string;
    clienteAziendaId?: string;
    tipoCliente?: 'privato' | 'azienda';
    tipoEmail: 'scadenza_60d' | 'scadenza_30d' | 'scadenza_15d' | 'scadenza_7d' | 'promozionale' | 'custom';
}

export interface EmailResult {
    success: boolean;
    messageId?: string;
    logId?: string;
    error?: string;
}

// ═══════════════════════════════════════════════════
// FUNZIONE PRINCIPALE: Invia Email
// ═══════════════════════════════════════════════════
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    const logId = randomUUID();
    
    try {
        // 1. Verifica rate limiting
        const canSend = await checkRateLimits();
        if (!canSend) {
            throw new Error('Rate limit giornaliero raggiunto (300 email/giorno)');
        }

        // 2. Crea log email in DB (stato: in_coda)
        await createEmailLog({
            id: logId,
            ...options,
            stato: 'in_coda'
        });

        // 3. Inizializza transporter se necessario
        const transport = await initializeEmailTransporter();
        const config = await getEmailConfig();

        // 4. Invia email tramite Brevo
        const mailOptions = {
            from: `"${config.defaultSender.name}" <${config.defaultSender.email}>`,
            to: options.to,
            subject: options.subject,
            html: options.html
        };

        const info = await transport.sendMail(mailOptions);

        // 5. Aggiorna log: email inviata
        await updateEmailLog(logId, {
            stato: 'inviato',
            brevo_message_id: info.messageId,
            sent_at: new Date().toISOString()
        });

        // 6. Aggiorna contatori campagna
        if (options.campaignId) {
            await incrementCampaignCounter(options.campaignId, 'sent');
        }

        console.log(`✅ Email inviata: ${options.to} | Subject: ${options.subject}`);

        return {
            success: true,
            messageId: info.messageId,
            logId
        };

    } catch (error: any) {
        console.error(`❌ Errore invio email a ${options.to}:`, error.message);

        // Aggiorna log: fallito
        await updateEmailLog(logId, {
            stato: 'fallito',
            errore: error.message
        });

        // Aggiorna contatori campagna
        if (options.campaignId) {
            await incrementCampaignCounter(options.campaignId, 'failed');
        }

        return {
            success: false,
            error: error.message,
            logId
        };
    }
}

// ═══════════════════════════════════════════════════
// RATE LIMITING: Verifica limiti giornalieri
// ═══════════════════════════════════════════════════
async function checkRateLimits(): Promise<boolean> {
    try {
        // Conta email inviate oggi
        const result = await pool.query(`
            SELECT COUNT(*) as count
            FROM email_logs
            WHERE DATE(sent_at) = DATE('now')
            AND stato = 'inviato'
        `);

        const todayCount = (result.rows[0] as any)?.count || 0;
        const config = await getEmailConfig();
        
        if (todayCount >= config.limits.dailyLimit) {
            console.warn(`⚠️  Rate limit raggiunto: ${todayCount}/${config.limits.dailyLimit} email oggi`);
            return false;
        }

        return true;
    } catch (error) {
        console.error('❌ Errore controllo rate limit:', error);
        return true; // In caso di errore, permetti invio
    }
}

// ═══════════════════════════════════════════════════
// DATABASE: Crea log email
// ═══════════════════════════════════════════════════
async function createEmailLog(data: {
    id: string;
    campaignId?: string;
    clientePrivatoId?: string;
    clienteAziendaId?: string;
    tipoCliente?: string;
    to: string;
    subject: string;
    tipoEmail: string;
    stato: string;
}): Promise<void> {
    try {
        await pool.query(`
            INSERT INTO email_logs (
                id, campaign_id, cliente_privato_id, cliente_azienda_id,
                tipo_cliente, email_destinatario, subject, tipo_email, stato
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.id,
            data.campaignId || null,
            data.clientePrivatoId || null,
            data.clienteAziendaId || null,
            data.tipoCliente || null,
            data.to,
            data.subject,
            data.tipoEmail,
            data.stato
        ]);
    } catch (error) {
        console.error('❌ Errore creazione log email:', error);
    }
}

// ═══════════════════════════════════════════════════
// DATABASE: Aggiorna log email
// ═══════════════════════════════════════════════════
async function updateEmailLog(logId: string, updates: {
    stato?: string;
    brevo_message_id?: string;
    sent_at?: string;
    errore?: string;
}): Promise<void> {
    try {
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.stato) {
            fields.push('stato = ?');
            values.push(updates.stato);
        }
        if (updates.brevo_message_id) {
            fields.push('brevo_message_id = ?');
            values.push(updates.brevo_message_id);
        }
        if (updates.sent_at) {
            fields.push('sent_at = ?');
            values.push(updates.sent_at);
        }
        if (updates.errore) {
            fields.push('errore = ?');
            values.push(updates.errore);
        }

        if (fields.length > 0) {
            values.push(logId);
            await pool.query(`
                UPDATE email_logs
                SET ${fields.join(', ')}
                WHERE id = ?
            `, values);
        }
    } catch (error) {
        console.error('❌ Errore aggiornamento log email:', error);
    }
}

// ═══════════════════════════════════════════════════
// DATABASE: Incrementa contatori campagna
// ═══════════════════════════════════════════════════
async function incrementCampaignCounter(campaignId: string, type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed'): Promise<void> {
    try {
        const fieldMap: Record<string, string> = {
            sent: 'sent_count',
            delivered: 'delivered_count',
            opened: 'opened_count',
            clicked: 'clicked_count',
            failed: 'failed_count'
        };

        const field = fieldMap[type];
        if (field) {
            await pool.query(`
                UPDATE email_campaigns
                SET ${field} = ${field} + 1,
                    updated_at = datetime('now')
                WHERE id = ?
            `, [campaignId]);
        }
    } catch (error) {
        console.error(`❌ Errore incremento contatore ${type}:`, error);
    }
}

// ═══════════════════════════════════════════════════
// UTILITY: Test connessione Brevo
// ═══════════════════════════════════════════════════
export async function testBrevoConnection(): Promise<{ success: boolean; message: string }> {
    try {
        const transport = await initializeEmailTransporter();
        await transport.verify();
        return {
            success: true,
            message: '✅ Connessione Brevo SMTP verificata con successo'
        };
    } catch (error: any) {
        return {
            success: false,
            message: `❌ Errore connessione Brevo: ${error.message}`
        };
    }
}

// ═══════════════════════════════════════════════════
// UTILITY: Invia email di test
// ═══════════════════════════════════════════════════
export async function sendTestEmail(toEmail: string): Promise<EmailResult> {
    return sendEmail({
        to: toEmail,
        subject: '🧪 Test Email - Gestionale Energia',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #667eea;">✅ Email Test Riuscita!</h1>
                <p>Questo è un messaggio di test del sistema Email Marketing del Gestionale Energia.</p>
                <p><strong>Dettagli test:</strong></p>
                <ul>
                    <li>Data: ${new Date().toLocaleString('it-IT')}</li>
                    <li>Sistema: Brevo SMTP + BullMQ</li>
                    <li>Rate limit: ${emailConfig.limits.dailyLimit} email/giorno</li>
                </ul>
                <p>Se hai ricevuto questa email, il sistema funziona correttamente! 🎉</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    ${emailConfig.agenzia.nome} | ${emailConfig.agenzia.email}
                </p>
            </div>
        `,
        tipoEmail: 'custom'
    });
}

// ═══════════════════════════════════════════════════
// UTILITY: Ottieni statistiche email oggi
// ═══════════════════════════════════════════════════
export async function getTodayEmailStats(): Promise<{
    sent: number;
    limit: number;
    remaining: number;
    percentage: number;
}> {
    try {
        const result = await pool.query(`
            SELECT COUNT(*) as count
            FROM email_logs
            WHERE DATE(sent_at) = DATE('now')
            AND stato = 'inviato'
        `);

        const sent = (result.rows[0] as any)?.count || 0;
        const limit = emailConfig.limits.dailyLimit;
        const remaining = Math.max(0, limit - sent);
        const percentage = (sent / limit) * 100;

        return { sent, limit, remaining, percentage };
    } catch (error) {
        console.error('❌ Errore statistiche email:', error);
        return { sent: 0, limit: emailConfig.limits.dailyLimit, remaining: emailConfig.limits.dailyLimit, percentage: 0 };
    }
}
