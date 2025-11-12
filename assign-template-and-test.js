/**
 * Script per assegnare un template a una campagna e testare l'invio
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Percorso database
const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔧 Assegnazione template e test invio');
console.log('====================================\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite\n');
});

async function assignTemplateAndTest() {
    try {
        // 1. Trova una campagna programmata
        console.log('1️⃣ Ricerca campagna programmata...');
        
        const campaign = await new Promise((resolve, reject) => {
            db.get(`
                SELECT id, nome, stato, scheduled_at, tipo, target_clienti
                FROM email_campaigns 
                WHERE stato = 'programmata' AND template_id IS NULL
                ORDER BY scheduled_at ASC
                LIMIT 1
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!campaign) {
            console.log('   ❌ Nessuna campagna programmata senza template trovata');
            return;
        }

        console.log(`   ✅ Campagna trovata: "${campaign.nome}"`);
        console.log(`      ID: ${campaign.id}`);
        console.log(`      Tipo: ${campaign.tipo}`);
        console.log(`      Target: ${campaign.target_clienti}`);

        // 2. Trova un template appropriato
        console.log('\n2️⃣ Selezione template...');
        
        const template = await new Promise((resolve, reject) => {
            db.get(`
                SELECT id, nome, tipo, subject, html_content
                FROM email_templates 
                WHERE attivo = 1
                ORDER BY nome
                LIMIT 1
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!template) {
            console.log('   ❌ Nessun template attivo trovato');
            return;
        }

        console.log(`   ✅ Template selezionato: "${template.nome}"`);
        console.log(`      Tipo: ${template.tipo}`);
        console.log(`      Subject: ${template.subject}`);

        // 3. Assegna il template alla campagna
        console.log('\n3️⃣ Assegnazione template...');
        
        await new Promise((resolve, reject) => {
            db.run(`
                UPDATE email_campaigns 
                SET template_id = ?
                WHERE id = ?
            `, [template.id, campaign.id], function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        console.log('   ✅ Template assegnato con successo');

        // 4. Verifica target clienti
        console.log('\n4️⃣ Verifica target clienti...');
        
        // Conta clienti privati
        const clientiPrivatiCount = await new Promise((resolve, reject) => {
            db.get(`
                SELECT COUNT(*) as count
                FROM clienti_privati 
                WHERE stato NOT IN ('Annullato', 'Rifiutato') 
                AND (email_principale IS NOT NULL AND email_principale != '')
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Conta clienti aziende
        const clientiAziendeCount = await new Promise((resolve, reject) => {
            db.get(`
                SELECT COUNT(*) as count
                FROM clienti_aziende 
                WHERE stato NOT IN ('Annullato', 'Rifiutato') 
                AND (email_principale IS NOT NULL AND email_principale != '')
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        const totalClientCount = clientiPrivatiCount + clientiAziendeCount;

        console.log(`   ✅ Clienti privati attivi con email: ${clientiPrivatiCount}`);
        console.log(`   ✅ Clienti aziende attivi con email: ${clientiAziendeCount}`);
        console.log(`   ✅ Totale clienti attivi con email: ${totalClientCount}`);

        if (totalClientCount === 0) {
            console.log('   ⚠️  Nessun cliente con email valida trovato');
            
            // Mostra alcuni clienti per debug
            const samplePrivati = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT id, nome, cognome, email_principale, stato
                    FROM clienti_privati 
                    LIMIT 3
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            const sampleAziende = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT id, ragione_sociale, email_principale, stato
                    FROM clienti_aziende 
                    LIMIT 3
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            console.log('\n   📋 Primi 3 clienti privati nel database:');
            samplePrivati.forEach((client, index) => {
                const emailStatus = client.email_principale ? '✅' : '❌';
                console.log(`      ${index + 1}. ${client.nome} ${client.cognome} - Email: ${emailStatus} - Stato: ${client.stato}`);
            });

            console.log('\n   📋 Primi 3 clienti aziende nel database:');
            sampleAziende.forEach((client, index) => {
                const emailStatus = client.email_principale ? '✅' : '❌';
                console.log(`      ${index + 1}. ${client.ragione_sociale} - Email: ${emailStatus} - Stato: ${client.stato}`);
            });
        }

        // 5. Verifica configurazione email
        console.log('\n5️⃣ Verifica configurazione email...');
        
        const emailConfig = await new Promise((resolve, reject) => {
            db.all(`
                SELECT chiave, valore
                FROM configurazioni 
                WHERE chiave IN ('brevo_api_key', 'brevo_webhook_url', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password')
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const config = {};
        emailConfig.forEach(row => {
            config[row.chiave] = row.valore;
        });

        console.log('   📧 Configurazioni email:');
        console.log(`      Brevo API Key: ${config.brevo_api_key ? '✅ Configurata' : '❌ Mancante'}`);
        console.log(`      Brevo Webhook: ${config.brevo_webhook_url ? '✅ Configurata' : '❌ Mancante'}`);
        console.log(`      SMTP Host: ${config.smtp_host ? '✅ Configurata' : '❌ Mancante'}`);
        console.log(`      SMTP Port: ${config.smtp_port ? '✅ Configurata' : '❌ Mancante'}`);
        console.log(`      SMTP User: ${config.smtp_user ? '✅ Configurata' : '❌ Mancante'}`);
        console.log(`      SMTP Password: ${config.smtp_password ? '✅ Configurata' : '❌ Mancante'}`);

        // 6. Riepilogo stato
        console.log('\n6️⃣ Riepilogo stato campagna:');
        console.log(`   📧 Campagna: ${campaign.nome}`);
        console.log(`   📝 Template: ${template.nome}`);
        console.log(`   👥 Clienti target: ${totalClientCount}`);
        
        const hasEmailConfig = config.brevo_api_key || (config.smtp_host && config.smtp_user);
        console.log(`   ⚙️  Configurazione email: ${hasEmailConfig ? '✅ OK' : '❌ Mancante'}`);
        
        if (totalClientCount > 0 && hasEmailConfig) {
            console.log('\n🚀 La campagna è pronta per essere inviata!');
        } else {
            console.log('\n⚠️  La campagna non può essere inviata:');
            if (totalClientCount === 0) console.log('   - Nessun cliente target');
            if (!hasEmailConfig) console.log('   - Configurazione email mancante');
        }

    } catch (error) {
        console.error('\n❌ Errore durante il processo:', error.message);
    } finally {
        db.close();
    }
}

assignTemplateAndTest();