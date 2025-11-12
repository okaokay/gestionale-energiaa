/**
 * Email Scheduler - Cron Job per Alert Scadenze Automatiche
 * Controlla contratti in scadenza e invia email automatiche
 */

import * as cron from 'node-cron';
import { pool } from '../config/database';
import { sendEmail } from '../services/emailService';
import { renderExpiryEmail } from '../services/templateService';
import { emailConfig } from '../config/email';

// ═══════════════════════════════════════════════════
// CONFIGURAZIONE SOGLIE SCADENZA
// ═══════════════════════════════════════════════════
const SOGLIE_GIORNI = [60, 30, 15, 7]; // Giorni prima scadenza

// ═══════════════════════════════════════════════════
// FUNZIONE PRINCIPALE: Controlla Scadenze e Invia Email
// ═══════════════════════════════════════════════════
export async function checkAndSendExpiryAlerts(): Promise<void> {
    console.log('⏰ Inizio controllo scadenze contratti...');
    
    try {
        let totalAlerts = 0;
        
        for (const giorni of SOGLIE_GIORNI) {
            // Controlla contratti LUCE in scadenza
            const contrattiLuce = await pool.query(`
                SELECT cl.*, 
                       cp.id as cliente_id, cp.nome, cp.cognome, cp.email_principale,
                       ca.id as azienda_id, ca.ragione_sociale, ca.email_referente,
                       'privato' as tipo_cliente_calc
                FROM contratti_luce cl
                LEFT JOIN clienti_privati cp ON cl.cliente_privato_id = cp.id
                LEFT JOIN clienti_aziende ca ON cl.cliente_azienda_id = ca.id
                WHERE cl.stato = 'attivo'
                AND julianday(cl.data_scadenza) - julianday('now') BETWEEN ? AND ?
                AND cl.alert_sent_${giorni}d = 0
            `, [giorni - 1, giorni + 1]);
            
            for (const contratto of contrattiLuce.rows) {
                const c = contratto as any;
                const clienteId = c.cliente_privato_id || c.cliente_azienda_id;
                const tipoCliente = c.cliente_privato_id ? 'privato' : 'azienda';
                const emailDest = c.email_principale || c.email_referente;
                
                if (!clienteId || !emailDest) continue;
                
                try {
                    // Genera email da template
                    const { subject, html } = await renderExpiryEmail(clienteId, tipoCliente, c.id, 'luce');
                    
                    // Invia email
                    const result = await sendEmail({
                        to: emailDest,
                        subject,
                        html,
                        clientePrivatoId: c.cliente_privato_id,
                        clienteAziendaId: c.cliente_azienda_id,
                        tipoCliente,
                        tipoEmail: `scadenza_${giorni}d` as any
                    });
                    
                    if (result.success) {
                        // Marca alert come inviato
                        await pool.query(`
                            UPDATE contratti_luce 
                            SET alert_sent_${giorni}d = 1
                            WHERE id = ?
                        `, [c.id]);
                        
                        totalAlerts++;
                        console.log(`✅ Alert ${giorni}g inviato: ${emailDest} (Luce)`);
                    }
                } catch (error: any) {
                    console.error(`❌ Errore invio alert luce ${giorni}g:`, error.message);
                }
            }
            
            // Controlla contratti GAS in scadenza
            const contrattiGas = await pool.query(`
                SELECT cg.*, 
                       cp.id as cliente_id, cp.nome, cp.cognome, cp.email_principale,
                       ca.id as azienda_id, ca.ragione_sociale, ca.email_referente
                FROM contratti_gas cg
                LEFT JOIN clienti_privati cp ON cg.cliente_privato_id = cp.id
                LEFT JOIN clienti_aziende ca ON cg.cliente_azienda_id = ca.id
                WHERE cg.stato = 'attivo'
                AND julianday(cg.data_scadenza) - julianday('now') BETWEEN ? AND ?
                AND cg.alert_sent_${giorni}d = 0
            `, [giorni - 1, giorni + 1]);
            
            for (const contratto of contrattiGas.rows) {
                const c = contratto as any;
                const clienteId = c.cliente_privato_id || c.cliente_azienda_id;
                const tipoCliente = c.cliente_privato_id ? 'privato' : 'azienda';
                const emailDest = c.email_principale || c.email_referente;
                
                if (!clienteId || !emailDest) continue;
                
                try {
                    // Genera email da template
                    const { subject, html } = await renderExpiryEmail(clienteId, tipoCliente, c.id, 'gas');
                    
                    // Invia email
                    const result = await sendEmail({
                        to: emailDest,
                        subject,
                        html,
                        clientePrivatoId: c.cliente_privato_id,
                        clienteAziendaId: c.cliente_azienda_id,
                        tipoCliente,
                        tipoEmail: `scadenza_${giorni}d` as any
                    });
                    
                    if (result.success) {
                        // Marca alert come inviato
                        await pool.query(`
                            UPDATE contratti_gas 
                            SET alert_sent_${giorni}d = 1
                            WHERE id = ?
                        `, [c.id]);
                        
                        totalAlerts++;
                        console.log(`✅ Alert ${giorni}g inviato: ${emailDest} (Gas)`);
                    }
                } catch (error: any) {
                    console.error(`❌ Errore invio alert gas ${giorni}g:`, error.message);
                }
            }
        }
        
        console.log(`✅ Controllo scadenze completato: ${totalAlerts} alert inviati\n`);
        
    } catch (error) {
        console.error('❌ Errore durante controllo scadenze:', error);
    }
}

// ═══════════════════════════════════════════════════
// AVVIO CRON JOB
// ═══════════════════════════════════════════════════
export function startEmailScheduler(): void {
    if (!emailConfig.cron.enabled) {
        console.log('⏸️  Cron job email disabilitato (CRON_ENABLED=false)');
        return;
    }
    
    const schedule = emailConfig.cron.expiryAlerts;
    
    console.log(`⏰ Avvio cron job alert scadenze: ${schedule}`);
    
    // Schedule cron job
    cron.schedule(schedule, async () => {
        console.log(`\n⏰ [${new Date().toLocaleString('it-IT')}] Esecuzione cron job alert scadenze`);
        await checkAndSendExpiryAlerts();
    });
    
    console.log('✅ Cron job email scheduler attivo\n');
}

// ═══════════════════════════════════════════════════
// UTILITY: Esecuzione manuale (per test)
// ═══════════════════════════════════════════════════
export async function runManualCheck(): Promise<{ success: boolean; alertsSent: number }> {
    console.log('🧪 Esecuzione manuale controllo scadenze...');
    
    try {
        await checkAndSendExpiryAlerts();
        return { success: true, alertsSent: 0 };
    } catch (error) {
        console.error('❌ Errore esecuzione manuale:', error);
        return { success: false, alertsSent: 0 };
    }
}

