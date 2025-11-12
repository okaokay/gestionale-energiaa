/**
 * Script per aggiungere email demo nella tabella email_logs
 * Usato per testare le statistiche e la lista email
 */

import { pool, generateUUID } from '../config/database';

async function seedEmailLogs() {
    console.log('🔄 Inizio seed email logs demo...\n');
    
    try {
        // Recupera l'email dell'utente demo esistente
        const demoUser = await pool.query(`
            SELECT id, email_principale, nome, cognome 
            FROM clienti_privati 
            WHERE email_principale = ?
            LIMIT 1
        `, ['dusmomusic@gmail.com']);
        
        let clienteId = null;
        if (demoUser.rows.length > 0) {
            clienteId = (demoUser.rows[0] as any).id;
            console.log('✅ Trovato cliente demo esistente');
        }
        
        // Crea 30 email demo distribuite negli ultimi 30 giorni
        const emailTypes = ['scadenza_60d', 'scadenza_30d', 'scadenza_15d', 'scadenza_7d', 'promozionale', 'custom'];
        const stati = ['inviato', 'inviato', 'inviato', 'inviato', 'fallito']; // 80% successo
        
        const emails = [
            'dusmomusic@gmail.com',
            'cliente1@test.it',
            'cliente2@test.it',
            'cliente3@test.it',
            'azienda1@test.it'
        ];
        
        for (let i = 0; i < 30; i++) {
            const id = generateUUID();
            const daysAgo = i; // Distribuisci negli ultimi 30 giorni
            const tipoEmail = emailTypes[Math.floor(Math.random() * emailTypes.length)];
            const stato = stati[Math.floor(Math.random() * stati.length)];
            const email = emails[Math.floor(Math.random() * emails.length)];
            
            // Calcola data sent_at (X giorni fa)
            const sentAt = new Date();
            sentAt.setDate(sentAt.getDate() - daysAgo);
            sentAt.setHours(9 + Math.floor(Math.random() * 9)); // Orario casuale 9-18
            
            // Se inviato, calcola apertura/click con probabilità
            const wasOpened = stato === 'inviato' && Math.random() > 0.4; // 60% apertura
            const wasClicked = wasOpened && Math.random() > 0.7; // 30% click (tra gli aperti)
            
            const openedAt = wasOpened ? new Date(sentAt.getTime() + Math.random() * 3600000 * 5) : null; // Aperto entro 5 ore
            const clickedAt = wasClicked ? new Date(openedAt!.getTime() + Math.random() * 1800000) : null; // Click entro 30 min dall'apertura
            
            await pool.query(`
                INSERT INTO email_logs (
                    id,
                    cliente_privato_id,
                    email_destinatario,
                    subject,
                    tipo_email,
                    stato,
                    sent_at,
                    delivered_at,
                    opened_at,
                    clicked_at,
                    brevo_message_id,
                    errore
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id,
                email === 'dusmomusic@gmail.com' ? clienteId : null,
                email,
                tipoEmail.includes('scadenza') 
                    ? `⏰ Scadenza contratto in ${tipoEmail.replace('scadenza_', '').replace('d', ' giorni')}`
                    : tipoEmail === 'promozionale'
                    ? '🎯 Nuove offerte energia - Risparmia fino al 25%'
                    : '📧 Comunicazione importante',
                tipoEmail,
                stato,
                sentAt.toISOString(),
                stato === 'inviato' ? sentAt.toISOString() : null,
                openedAt ? openedAt.toISOString() : null,
                clickedAt ? clickedAt.toISOString() : null,
                `<${generateUUID()}@smtp-brevo.com>`,
                stato === 'fallito' ? 'Indirizzo email non valido o casella piena' : null
            ]);
            
            console.log(`✅ Email ${i + 1}/30 inserita - ${email} (${stato})`);
        }
        
        console.log('\n✅ Seed completato! 30 email demo aggiunte al database');
        console.log('\n🎯 Vai su "Email Marketing" → "Statistiche" per visualizzare i dati!');
        
    } catch (error) {
        console.error('❌ Errore durante seed:', error);
        throw error;
    }
}

seedEmailLogs().catch(err => {
    console.error('Errore critico:', err);
    process.exit(1);
});

