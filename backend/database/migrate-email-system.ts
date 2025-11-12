/**
 * Migrazione database per sistema Email Marketing
 * Aggiunge tabelle: email_campaigns, email_logs, email_templates
 * Modifica tabelle: contratti_luce, contratti_gas, clienti_privati, clienti_aziende
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../gestionale_energia.db');
const db = new Database(dbPath);

async function migrateEmailSystem() {
    try {
        console.log('🚀 Inizio migrazione sistema Email Marketing...\n');
        
        db.pragma('foreign_keys = ON');

        // ===============================================
        // RIMUOVI TABELLE ESISTENTI (per migrazione pulita)
        // ===============================================
        console.log('🗑️  Rimozione tabelle esistenti (se presenti)...');
        db.exec(`DROP TABLE IF EXISTS email_logs;`);
        db.exec(`DROP TABLE IF EXISTS email_campaigns;`);
        db.exec(`DROP TABLE IF EXISTS email_templates;`);
        console.log('✅ Tabelle rimosse\n');

        // ===============================================
        // TABELLA: email_templates
        // ===============================================
        console.log('📧 Creazione tabella email_templates...');
        db.exec(`
            CREATE TABLE email_templates (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                tipo TEXT NOT NULL,
                subject TEXT NOT NULL,
                html_content TEXT NOT NULL,
                placeholders TEXT,
                attivo INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabella email_templates creata\n');

        // ===============================================
        // TABELLA: email_campaigns
        // ===============================================
        console.log('📧 Creazione tabella email_campaigns...');
        db.exec(`
            CREATE TABLE email_campaigns (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                offerta_id TEXT,
                template_id TEXT,
                tipo TEXT NOT NULL,
                stato TEXT DEFAULT 'bozza',
                target_clienti TEXT NOT NULL,
                total_recipients INTEGER DEFAULT 0,
                sent_count INTEGER DEFAULT 0,
                delivered_count INTEGER DEFAULT 0,
                opened_count INTEGER DEFAULT 0,
                clicked_count INTEGER DEFAULT 0,
                failed_count INTEGER DEFAULT 0,
                scheduled_at TEXT,
                started_at TEXT,
                completed_at TEXT,
                creato_da TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (offerta_id) REFERENCES offerte(id) ON DELETE SET NULL,
                FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
                FOREIGN KEY (creato_da) REFERENCES users(id)
            );
        `);
        
        // Indici per performance
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_stato ON email_campaigns(stato);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_tipo ON email_campaigns(tipo);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_created ON email_campaigns(created_at);
        `);
        console.log('✅ Tabella email_campaigns creata con indici\n');

        // ===============================================
        // TABELLA: email_logs
        // ===============================================
        console.log('📧 Creazione tabella email_logs...');
        db.exec(`
            CREATE TABLE email_logs (
                id TEXT PRIMARY KEY,
                campaign_id TEXT,
                cliente_privato_id TEXT,
                cliente_azienda_id TEXT,
                tipo_cliente TEXT,
                email_destinatario TEXT NOT NULL,
                tipo_email TEXT NOT NULL,
                subject TEXT NOT NULL,
                stato TEXT DEFAULT 'in_coda',
                brevo_message_id TEXT,
                errore TEXT,
                sent_at TEXT,
                delivered_at TEXT,
                opened_at TEXT,
                clicked_at TEXT,
                unsubscribed_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
                FOREIGN KEY (cliente_privato_id) REFERENCES clienti_privati(id) ON DELETE CASCADE,
                FOREIGN KEY (cliente_azienda_id) REFERENCES clienti_aziende(id) ON DELETE CASCADE
            );
        `);
        
        // Indici critici per query performance (separati)
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs(campaign_id);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_email_logs_cliente_privato ON email_logs(cliente_privato_id);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_email_logs_cliente_azienda ON email_logs(cliente_azienda_id);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_email_logs_stato ON email_logs(stato);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_email_logs_tipo ON email_logs(tipo_email);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_email_logs_sent ON email_logs(sent_at);
        `);
        console.log('✅ Tabella email_logs creata con indici\n');

        // ===============================================
        // MODIFICA TABELLE CONTRATTI
        // ===============================================
        console.log('🔧 Aggiunta colonne alert scadenze a contratti_luce...');
        try {
            db.exec(`
                ALTER TABLE contratti_luce ADD COLUMN alert_sent_60d INTEGER DEFAULT 0;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna alert_sent_60d già esistente (ignorato)');
        }
        
        try {
            db.exec(`
                ALTER TABLE contratti_luce ADD COLUMN alert_sent_30d INTEGER DEFAULT 0;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna alert_sent_30d già esistente (ignorato)');
        }
        
        try {
            db.exec(`
                ALTER TABLE contratti_luce ADD COLUMN alert_sent_15d INTEGER DEFAULT 0;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna alert_sent_15d già esistente (ignorato)');
        }
        
        try {
            db.exec(`
                ALTER TABLE contratti_luce ADD COLUMN alert_sent_7d INTEGER DEFAULT 0;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna alert_sent_7d già esistente (ignorato)');
        }
        console.log('✅ Colonne alert scadenze aggiunte a contratti_luce\n');

        console.log('🔧 Aggiunta colonne alert scadenze a contratti_gas...');
        try {
            db.exec(`
                ALTER TABLE contratti_gas ADD COLUMN alert_sent_60d INTEGER DEFAULT 0;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna alert_sent_60d già esistente (ignorato)');
        }
        
        try {
            db.exec(`
                ALTER TABLE contratti_gas ADD COLUMN alert_sent_30d INTEGER DEFAULT 0;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna alert_sent_30d già esistente (ignorato)');
        }
        
        try {
            db.exec(`
                ALTER TABLE contratti_gas ADD COLUMN alert_sent_15d INTEGER DEFAULT 0;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna alert_sent_15d già esistente (ignorato)');
        }
        
        try {
            db.exec(`
                ALTER TABLE contratti_gas ADD COLUMN alert_sent_7d INTEGER DEFAULT 0;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna alert_sent_7d già esistente (ignorato)');
        }
        console.log('✅ Colonne alert scadenze aggiunte a contratti_gas\n');

        // ===============================================
        // MODIFICA TABELLE CLIENTI (GDPR)
        // ===============================================
        console.log('🔧 Aggiunta colonne marketing a clienti_privati...');
        try {
            db.exec(`
                ALTER TABLE clienti_privati ADD COLUMN newsletter_attiva INTEGER DEFAULT 1;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna newsletter_attiva già esistente (ignorato)');
        }
        
        try {
            db.exec(`
                ALTER TABLE clienti_privati ADD COLUMN unsubscribe_token TEXT;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna unsubscribe_token già esistente (ignorato)');
        }
        console.log('✅ Colonne marketing aggiunte a clienti_privati\n');

        console.log('🔧 Aggiunta colonne marketing a clienti_aziende...');
        try {
            db.exec(`
                ALTER TABLE clienti_aziende ADD COLUMN newsletter_attiva INTEGER DEFAULT 1;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna newsletter_attiva già esistente (ignorato)');
        }
        
        try {
            db.exec(`
                ALTER TABLE clienti_aziende ADD COLUMN unsubscribe_token TEXT;
            `);
        } catch (e) {
            console.log('   ⚠️  Colonna unsubscribe_token già esistente (ignorato)');
        }
        console.log('✅ Colonne marketing aggiunte a clienti_aziende\n');

        // ===============================================
        // SEED TEMPLATE PREDEFINITI
        // ===============================================
        console.log('🌱 Inserimento template email predefiniti...');
        
        const { randomUUID } = require('crypto');
        
        const templates = [
            {
                id: randomUUID(),
                nome: 'Alert Scadenza Contratto',
                tipo: 'scadenza',
                subject: '⚠️ Il tuo contratto {{tipo_energia}} scade tra {{giorni_scadenza}} giorni',
                html_content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Promemoria Scadenza Contratto</h1>
        </div>
        <div class="content">
            <p>Gentile <strong>{{nome_cliente}}</strong>,</p>
            
            <div class="alert-box">
                <strong>Il tuo contratto {{tipo_energia}} scadrà tra {{giorni_scadenza}} giorni!</strong>
            </div>
            
            <p><strong>Dettagli contratto:</strong></p>
            <ul>
                <li>Fornitore: {{fornitore}}</li>
                <li>Numero contratto: {{numero_contratto}}</li>
                <li>Data scadenza: {{data_scadenza}}</li>
                <li>{{codice_fornitura_label}}: {{codice_fornitura}}</li>
            </ul>
            
            <p>Non lasciare che il tuo contratto scada! Contattaci oggi per valutare le migliori offerte sul mercato.</p>
            
            <center>
                <a href="{{link_offerte}}" class="btn">Vedi Offerte Disponibili</a>
            </center>
            
            <p>Per qualsiasi informazione, siamo a tua disposizione.</p>
        </div>
        <div class="footer">
            <p>{{nome_agenzia}} | {{email_contatto}} | {{telefono_contatto}}</p>
            <p><a href="{{unsubscribe_link}}">Disiscriviti</a> dalle comunicazioni marketing</p>
        </div>
    </div>
</body>
</html>`,
                placeholders: 'nome_cliente,tipo_energia,giorni_scadenza,fornitore,numero_contratto,data_scadenza,codice_fornitura_label,codice_fornitura,link_offerte,nome_agenzia,email_contatto,telefono_contatto,unsubscribe_link'
            },
            {
                id: randomUUID(),
                nome: 'Offerta Promozionale',
                tipo: 'promozionale',
                subject: '💡 {{nome_offerta}} - Risparmia fino a {{risparmio_percentuale}}%',
                html_content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
        .promo-box { background: #e8f5e9; border: 2px dashed #4caf50; padding: 20px; margin: 20px 0; text-align: center; border-radius: 10px; }
        .price-compare { display: flex; justify-content: space-around; margin: 20px 0; }
        .price-old { text-decoration: line-through; color: #999; }
        .price-new { color: #4caf50; font-size: 24px; font-weight: bold; }
        .btn { display: inline-block; background: #4caf50; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 18px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💡 Offerta Speciale per Te!</h1>
        </div>
        <div class="content">
            <p>Ciao <strong>{{nome_cliente}}</strong>,</p>
            
            <div class="promo-box">
                <h2>{{nome_offerta}}</h2>
                <p style="font-size: 20px; margin: 10px 0;"><strong>Risparmia fino a {{risparmio_percentuale}}%</strong></p>
                <p>Risparmio stimato: <strong>€{{risparmio_annuo}}/anno</strong></p>
            </div>
            
            <p><strong>Dettagli offerta:</strong></p>
            <ul>
                <li>Fornitore: {{fornitore}}</li>
                <li>Tipo energia: {{tipo_energia}}</li>
                <li>Prezzo: €{{prezzo}}/{{unita_misura}}</li>
                <li>Vincolo: {{durata_vincolo}} mesi</li>
                <li>Valida fino al: {{data_fine_validita}}</li>
            </ul>
            
            <p><strong>Perché conviene:</strong></p>
            <p>{{condizioni_particolari}}</p>
            
            <center>
                <a href="{{link_dettagli}}" class="btn">Richiedi Subito</a>
            </center>
            
            <p style="color: #999; font-size: 14px;">Offerta riservata ai nostri clienti. Non perdere questa opportunità!</p>
        </div>
        <div class="footer">
            <p>{{nome_agenzia}} | {{email_contatto}} | {{telefono_contatto}}</p>
            <p><a href="{{unsubscribe_link}}">Disiscriviti</a> dalle comunicazioni marketing</p>
        </div>
    </div>
</body>
</html>`,
                placeholders: 'nome_cliente,nome_offerta,risparmio_percentuale,risparmio_annuo,fornitore,tipo_energia,prezzo,unita_misura,durata_vincolo,data_fine_validita,condizioni_particolari,link_dettagli,nome_agenzia,email_contatto,telefono_contatto,unsubscribe_link'
            },
            {
                id: randomUUID(),
                nome: 'Benvenuto Nuovo Cliente',
                tipo: 'benvenuto',
                subject: '👋 Benvenuto in {{nome_agenzia}}!',
                html_content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
        .welcome-box { background: #f3e5f5; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👋 Benvenuto!</h1>
        </div>
        <div class="content">
            <p>Ciao <strong>{{nome_cliente}}</strong>,</p>
            
            <div class="welcome-box">
                <h2>Grazie per esserti registrato!</h2>
                <p>Siamo felici di averti con noi.</p>
            </div>
            
            <p>Con <strong>{{nome_agenzia}}</strong> potrai:</p>
            <ul>
                <li>✓ Confrontare le migliori offerte luce e gas</li>
                <li>✓ Risparmiare sui costi energetici</li>
                <li>✓ Ricevere assistenza personalizzata</li>
                <li>✓ Monitorare le scadenze contratti</li>
            </ul>
            
            <center>
                <a href="{{link_dashboard}}" class="btn">Vai alla Dashboard</a>
                <a href="{{link_offerte}}" class="btn">Vedi Offerte</a>
            </center>
            
            <p>Per qualsiasi domanda, il nostro team è a tua disposizione.</p>
        </div>
        <div class="footer">
            <p>{{nome_agenzia}} | {{email_contatto}} | {{telefono_contatto}}</p>
            <p><a href="{{unsubscribe_link}}">Gestisci preferenze email</a></p>
        </div>
    </div>
</body>
</html>`,
                placeholders: 'nome_cliente,nome_agenzia,link_dashboard,link_offerte,email_contatto,telefono_contatto,unsubscribe_link'
            }
        ];

        const insertTemplate = db.prepare(`
            INSERT OR IGNORE INTO email_templates (id, nome, tipo, subject, html_content, placeholders, attivo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        templates.forEach(t => {
            insertTemplate.run(t.id, t.nome, t.tipo, t.subject, t.html_content, t.placeholders, 1);
        });

        console.log(`✅ ${templates.length} template predefiniti inseriti\n`);

        // ===============================================
        // GENERA UNSUBSCRIBE TOKEN PER CLIENTI ESISTENTI
        // ===============================================
        console.log('🔑 Generazione token unsubscribe per clienti esistenti...');
        
        // Privati
        const privati = db.prepare('SELECT id FROM clienti_privati WHERE unsubscribe_token IS NULL').all();
        const updatePrivato = db.prepare('UPDATE clienti_privati SET unsubscribe_token = ? WHERE id = ?');
        privati.forEach((p: any) => {
            updatePrivato.run(randomUUID(), p.id);
        });
        console.log(`   ✅ Token generati per ${privati.length} clienti privati`);

        // Aziende
        const aziende = db.prepare('SELECT id FROM clienti_aziende WHERE unsubscribe_token IS NULL').all();
        const updateAzienda = db.prepare('UPDATE clienti_aziende SET unsubscribe_token = ? WHERE id = ?');
        aziende.forEach((a: any) => {
            updateAzienda.run(randomUUID(), a.id);
        });
        console.log(`   ✅ Token generati per ${aziende.length} clienti aziende\n`);

        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 MIGRAZIONE EMAIL SYSTEM COMPLETATA CON SUCCESSO!');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log('📊 Riepilogo:');
        console.log(`   ✓ 3 tabelle create (email_templates, email_campaigns, email_logs)`);
        console.log(`   ✓ 6 indici database creati`);
        console.log(`   ✓ 8 colonne aggiunte (4 per contratti luce, 4 per gas)`);
        console.log(`   ✓ 4 colonne marketing GDPR aggiunte (clienti)`);
        console.log(`   ✓ ${templates.length} template predefiniti caricati`);
        console.log(`   ✓ ${privati.length + aziende.length} token unsubscribe generati\n`);

    } catch (error) {
        console.error('❌ Errore durante migrazione:', error);
        throw error;
    } finally {
        db.close();
    }
}

// Esegui migrazione
migrateEmailSystem()
    .then(() => {
        console.log('✅ Script completato');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Errore fatale:', error);
        process.exit(1);
    });

