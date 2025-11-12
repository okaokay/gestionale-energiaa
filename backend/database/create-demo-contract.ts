/**
 * Crea contratto demo in scadenza per test email
 */

import { pool, generateUUID } from '../config/database';

async function createDemoContract() {
    try {
        console.log('🔄 Creazione contratto demo per test email...');
        
        const email = 'dusmomusic@gmail.com';
        
        // 1. Verifica se esiste un cliente con questa email
        let cliente = await pool.query(`
            SELECT id, nome, cognome FROM clienti_privati 
            WHERE email_principale = ?
        `, [email]);
        
        let clienteId: string;
        let nomeCliente: string;
        
        if (cliente.rows.length === 0) {
            // Crea nuovo cliente
            clienteId = generateUUID();
            nomeCliente = 'Test Demo';
            
            await pool.query(`
                INSERT INTO clienti_privati (
                    id, nome, cognome, codice_fiscale, data_nascita, 
                    email_principale, telefono_mobile,
                    created_at, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
            `, [
                clienteId,
                'Test',
                'Demo Email Marketing',
                'TSTDMO90A01H501X', // codice_fiscale fittizio
                '1990-01-01', // data_nascita
                email,
                '3331234567',
                '00000000-0000-0000-0000-000000000001' // sistema
            ]);
            
            console.log(`✅ Cliente demo creato: ${email}`);
        } else {
            clienteId = (cliente.rows[0] as any).id;
            nomeCliente = `${(cliente.rows[0] as any).nome} ${(cliente.rows[0] as any).cognome}`;
            console.log(`✅ Cliente esistente trovato: ${nomeCliente}`);
        }
        
        // 2. Crea contratto GAS in scadenza tra 5 giorni
        const contrattoId = generateUUID();
        const dataOggi = new Date();
        const dataScadenza = new Date();
        dataScadenza.setDate(dataScadenza.getDate() + 5); // Scade tra 5 giorni
        
        const dataAttivazione = new Date();
        dataAttivazione.setFullYear(dataAttivazione.getFullYear() - 1); // Attivato 1 anno fa
        
        await pool.query(`
            INSERT INTO contratti_gas (
                id, cliente_privato_id, tipo_cliente, numero_contratto, pdr, fornitore,
                data_attivazione, data_scadenza, prezzo_gas,
                stato, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            contrattoId,
            clienteId,
            'privato',
            `GAS-DEMO-${Date.now()}`,
            `IT00${Math.floor(Math.random() * 10000000000)}`.substring(0, 14),
            'Demo Energia S.p.A.',
            dataAttivazione.toISOString().split('T')[0],
            dataScadenza.toISOString().split('T')[0],
            0.85, // prezzo_gas
            'attivo',
            'Contratto demo creato per test sistema email marketing'
        ]);
        
        console.log(`✅ Contratto GAS demo creato!`);
        console.log(`   ID Contratto: ${contrattoId}`);
        console.log(`   Cliente: ${nomeCliente}`);
        console.log(`   Email: ${email}`);
        console.log(`   Data Scadenza: ${dataScadenza.toLocaleDateString('it-IT')}`);
        console.log(`   Giorni a scadenza: 5`);
        console.log('');
        console.log('🎯 Vai su "Email Marketing" → "Scadenze Automatiche" per testare!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Errore durante la creazione:', error);
        process.exit(1);
    }
}

createDemoContract();

