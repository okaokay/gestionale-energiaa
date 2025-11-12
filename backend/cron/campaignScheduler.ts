/**
 * Campaign Scheduler - Worker per invio campagne programmate
 * Controlla e invia campagne email programmate
 */

import * as cron from 'node-cron';
import { pool } from '../config/database';
import { sendEmail } from '../services/emailService';

// ═══════════════════════════════════════════════════
// FUNZIONE RIUTILIZZABILE: Invia una singola campagna
// ═══════════════════════════════════════════════════
export async function sendSingleCampaign(campaignId: string): Promise<{ success: boolean; message: string; stats?: any }> {
    try {
        console.log(`🚀 Avvio invio campagna: ${campaignId}`);
        
        // Recupera dati campagna
        const campaignResult = await pool.query(`SELECT * FROM email_campaigns WHERE id = ?`, [campaignId]);
        if (campaignResult.rows.length === 0) {
            return { success: false, message: 'Campagna non trovata' };
        }
        
        const c = campaignResult.rows[0] as any;
        
        // Verifica che la campagna sia inviabile
        if (!['bozza', 'in_invio', 'programmata'].includes(c.stato)) {
            return { success: false, message: 'Campagna non inviabile (stato: ' + c.stato + ')' };
        }
        
        // Aggiorna stato a "in_invio" se non lo è già
        if (c.stato !== 'in_invio') {
            await pool.query(`
                UPDATE email_campaigns 
                SET stato = 'in_invio', sent_at = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
            `, [campaignId]);
        }
        
        // Recupera template email
        let templateHtml = '<html><body><h1>{{nome_cliente}}</h1><p>Email della campagna</p></body></html>';
        let templateSubject = c.subject || c.nome;
        
        if (c.template_id) {
            const template = await pool.query(`SELECT * FROM email_templates WHERE id = ?`, [c.template_id]);
            if (template.rows.length > 0) {
                const t = template.rows[0] as any;
                templateHtml = t.html_content;
                templateSubject = t.subject;
            }
        }
        
        // Determina destinatari in base al target
        let destinatari: any[] = [];
        
        console.log(`🔍 Debug campagna - target_clienti: ${c.target_clienti}`);
        console.log(`🔍 Debug campagna - filtri_targeting: ${c.filtri_targeting}`);
        
        if (c.target_clienti === 'selezione_manuale' && c.filtri_targeting) {
            // Selezione manuale - NON controlla consenso marketing (l'admin decide)
            console.log(`📋 Parsing filtri targeting...`);
            const filtri = JSON.parse(c.filtri_targeting);
            console.log(`📋 Filtri parsati:`, JSON.stringify(filtri, null, 2));
            
            // Clienti dal database
            if (filtri.selected_client_ids && filtri.selected_client_ids.length > 0) {
                console.log(`👥 Trovati ${filtri.selected_client_ids.length} client IDs selezionati`);
                const placeholders = filtri.selected_client_ids.map(() => '?').join(',');
                
                const privati = await pool.query(`
                    SELECT id, nome, cognome, email_principale as email, 'privato' as tipo
                    FROM clienti_privati 
                    WHERE id IN (${placeholders})
                `, filtri.selected_client_ids);
                
                const aziende = await pool.query(`
                    SELECT id, ragione_sociale as nome, '' as cognome, email_referente as email, 'azienda' as tipo
                    FROM clienti_aziende 
                    WHERE id IN (${placeholders})
                `, filtri.selected_client_ids);
                
                console.log(`👥 Clienti privati trovati: ${privati.rows.length}`);
                console.log(`🏢 Clienti aziende trovati: ${aziende.rows.length}`);
                
                destinatari = [...privati.rows, ...aziende.rows];
            } else {
                console.log(`⚠️ Nessun client ID selezionato`);
            }
            
            // Email manuali
            if (filtri.manual_emails && filtri.manual_emails.length > 0) {
                console.log(`📧 Trovate ${filtri.manual_emails.length} email manuali:`, filtri.manual_emails);
                const manualEmails = filtri.manual_emails.map((email: string) => ({
                    id: null,
                    nome: email.split('@')[0],
                    cognome: '',
                    email: email,
                    tipo: 'manuale'
                }));
                destinatari = [...destinatari, ...manualEmails];
                console.log(`📧 Email manuali aggiunte, totale destinatari: ${destinatari.length}`);
            } else {
                console.log(`⚠️ Nessuna email manuale trovata nei filtri`);
            }
        } else {
            console.log(`⚠️ Condizioni non soddisfatte - target_clienti: ${c.target_clienti}, filtri_targeting presente: ${!!c.filtri_targeting}`);
        }
        
        console.log(`👥 Destinatari trovati: ${destinatari.length}`);
        
        if (destinatari.length === 0) {
            await pool.query(`
                UPDATE email_campaigns 
                SET stato = 'fallita', updated_at = datetime('now')
                WHERE id = ?
            `, [campaignId]);
            return { success: false, message: 'Nessun destinatario trovato' };
        }
        
        // Invia email a tutti i destinatari
        let sentCount = 0;
        let failedCount = 0;
        
        for (const dest of destinatari) {
            const d = dest as any;
            
            try {
                // Personalizza template
                const nomeCliente = d.tipo === 'privato' 
                    ? `${d.nome} ${d.cognome}`.trim() 
                    : d.nome;
                
                const htmlPersonalizzato = templateHtml
                    .replace(/\{\{nome_cliente\}\}/g, nomeCliente)
                    .replace(/\{\{email_cliente\}\}/g, d.email);
                
                // Invia email
                const result = await sendEmail({
                    to: d.email,
                    subject: templateSubject,
                    html: htmlPersonalizzato,
                    clientePrivatoId: d.tipo === 'privato' ? d.id : null,
                    clienteAziendaId: d.tipo === 'azienda' ? d.id : null,
                    tipoCliente: d.tipo,
                    tipoEmail: 'promozionale',
                    campaignId: campaignId
                });
                
                if (result.success) {
                    sentCount++;
                    console.log(`✅ Email inviata a: ${d.email}`);
                } else {
                    failedCount++;
                    console.log(`❌ Errore invio a: ${d.email} - ${result.error}`);
                }
                
                // Piccola pausa tra invii (rate limiting)
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error: any) {
                console.error(`❌ Errore invio a ${d.email}:`, error.message);
                failedCount++;
            }
        }
        
        // Aggiorna stato campagna
        await pool.query(`
            UPDATE email_campaigns 
            SET stato = 'completata', 
                sent_count = ?,
                failed_count = ?,
                total_recipients = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `, [sentCount, failedCount, destinatari.length, campaignId]);
        
        const stats = { sentCount, failedCount, totalRecipients: destinatari.length };
        console.log(`✅ Campagna completata: ${sentCount} inviate, ${failedCount} fallite`);
        
        return { 
            success: true, 
            message: `Campagna completata: ${sentCount} inviate, ${failedCount} fallite`,
            stats 
        };
        
    } catch (error: any) {
        console.error(`❌ Errore elaborazione campagna ${campaignId}:`, error.message);
        
        // Segna campagna come fallita
        await pool.query(`
            UPDATE email_campaigns 
            SET stato = 'fallita', updated_at = datetime('now')
            WHERE id = ?
        `, [campaignId]);
        
        return { success: false, message: error.message };
    }
}

// ═══════════════════════════════════════════════════
// FUNZIONE PRINCIPALE: Controlla e Invia Campagne Programmate
// ═══════════════════════════════════════════════════
export async function checkAndSendScheduledCampaigns(): Promise<void> {
    console.log('📧 Inizio controllo campagne programmate...');
    
    try {
        // Trova campagne programmate pronte per l'invio (nella finestra temporale)
        // NOTA: scheduled_at è in formato locale, quindi usiamo 'localtime' per confrontare
        // IMPORTANTE: Gestiamo sia il formato datetime-local (2025-10-25T10:10) che quello completo (2025-10-25 10:10:32)
        const campaigns = await pool.query(`
            SELECT * FROM email_campaigns 
            WHERE stato = 'programmata'
            AND datetime(
                CASE 
                    WHEN scheduled_at LIKE '%:%:%' THEN REPLACE(scheduled_at, 'T', ' ')
                    ELSE REPLACE(scheduled_at, 'T', ' ') || ':00'
                END
            ) <= datetime('now', 'localtime')
            AND (scheduled_end_at IS NULL OR datetime(
                CASE 
                    WHEN scheduled_end_at LIKE '%:%:%' THEN REPLACE(scheduled_end_at, 'T', ' ')
                    ELSE REPLACE(scheduled_end_at, 'T', ' ') || ':00'
                END
            ) >= datetime('now', 'localtime'))
            ORDER BY scheduled_at ASC
        `);
        
        if (campaigns.rows.length === 0) {
            console.log('💤 Nessuna campagna programmata da inviare');
            return;
        }
        
        console.log(`📨 Trovate ${campaigns.rows.length} campagne da inviare`);
        
        for (const campaign of campaigns.rows) {
            const c = campaign as any;
            
            try {
                console.log(`\n🚀 Avvio invio campagna programmata: ${c.nome} (ID: ${c.id})`);
                
                // Utilizza la funzione riutilizzabile per inviare la campagna
                const result = await sendSingleCampaign(c.id);
                
                if (result.success) {
                    console.log(`✅ ${result.message}`);
                } else {
                    console.error(`❌ Errore invio campagna: ${result.message}`);
                }
                
            } catch (error: any) {
                console.error(`❌ Errore elaborazione campagna ${c.nome}:`, error.message);
                
                // Segna campagna come fallita
                await pool.query(`
                    UPDATE email_campaigns 
                    SET stato = 'fallita', updated_at = datetime('now')
                    WHERE id = ?
                `, [c.id]);
            }
        }
        
        console.log('\n✅ Controllo campagne programmate completato\n');
        
    } catch (error) {
        console.error('❌ Errore durante controllo campagne:', error);
    }
}

// ═══════════════════════════════════════════════════
// AVVIO CRON JOB
// ═══════════════════════════════════════════════════
export function startCampaignScheduler(): void {
    console.log('⏰ Avvio scheduler campagne email (ogni 5 minuti)');
    
    // Esegue ogni 5 minuti
    cron.schedule('*/5 * * * *', async () => {
        console.log(`\n⏰ [${new Date().toLocaleString('it-IT')}] Controllo campagne programmate`);
        await checkAndSendScheduledCampaigns();
    });
    
    console.log('✅ Campaign scheduler attivo\n');
}

// ═══════════════════════════════════════════════════
// UTILITY: Esecuzione manuale
// ═══════════════════════════════════════════════════
export async function runManualCampaignCheck(): Promise<{ success: boolean; campaignsSent: number }> {
    console.log('🧪 Esecuzione manuale controllo campagne...');
    
    try {
        await checkAndSendScheduledCampaigns();
        return { success: true, campaignsSent: 0 };
    } catch (error) {
        console.error('❌ Errore esecuzione manuale:', error);
        return { success: false, campaignsSent: 0 };
    }
}

