/**
 * Migrazione: Aggiunge colonna note se non esiste
 */

import { pool } from '../config/database';

async function migrate() {
    try {
        console.log('🔄 Inizio migrazione: aggiunta colonna note...');
        
        // Controlla se la colonna note esiste già in contratti_luce
        try {
            await pool.query('SELECT note FROM contratti_luce LIMIT 1');
            console.log('✅ Colonna note già presente in contratti_luce');
        } catch (error) {
            // Colonna non esiste, la creo
            await pool.query('ALTER TABLE contratti_luce ADD COLUMN note TEXT');
            console.log('✅ Colonna note aggiunta a contratti_luce');
        }
        
        // Controlla se la colonna note esiste già in contratti_gas
        try {
            await pool.query('SELECT note FROM contratti_gas LIMIT 1');
            console.log('✅ Colonna note già presente in contratti_gas');
        } catch (error) {
            // Colonna non esiste, la creo
            await pool.query('ALTER TABLE contratti_gas ADD COLUMN note TEXT');
            console.log('✅ Colonna note aggiunta a contratti_gas');
        }
        
        console.log('✅ Migrazione completata con successo!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Errore durante la migrazione:', error);
        process.exit(1);
    }
}

migrate();

