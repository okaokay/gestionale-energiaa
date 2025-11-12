import { pool } from '../config/database';

/**
 * Migrazione per aggiungere campi commissioni separate per luce e gas
 * Aggiunge commissione_luce e commissione_gas alle tabelle clienti_privati e clienti_aziende
 */
export async function migrateCommissioniSeparate() {
    console.log('🔄 Inizio migrazione commissioni separate...');
    
    try {
        // Verifica se i campi esistono già
        const checkPrivatiQuery = `
            SELECT COUNT(*) as count 
            FROM pragma_table_info('clienti_privati') 
            WHERE name IN ('commissione_luce', 'commissione_gas')
        `;
        
        const checkAziendeQuery = `
            SELECT COUNT(*) as count 
            FROM pragma_table_info('clienti_aziende') 
            WHERE name IN ('commissione_luce', 'commissione_gas')
        `;
        
        const privatiCheck = await pool.query(checkPrivatiQuery);
        const aziendeCheck = await pool.query(checkAziendeQuery);
        
        const privatiHasFields = (privatiCheck.rows[0] as any).count > 0;
        const aziendeHasFields = (aziendeCheck.rows[0] as any).count > 0;
        
        // Aggiungi campi a clienti_privati se non esistono
        if (!privatiHasFields) {
            console.log('📋 Aggiunta campi commissioni a clienti_privati...');
            
            await pool.query(`
                ALTER TABLE clienti_privati 
                ADD COLUMN commissione_luce DECIMAL(10, 2) DEFAULT NULL
            `);
            
            await pool.query(`
                ALTER TABLE clienti_privati 
                ADD COLUMN commissione_gas DECIMAL(10, 2) DEFAULT NULL
            `);
            
            console.log('✅ Campi commissioni aggiunti a clienti_privati');
        } else {
            console.log('ℹ️ Campi commissioni già presenti in clienti_privati');
        }
        
        // Aggiungi campi a clienti_aziende se non esistono
        if (!aziendeHasFields) {
            console.log('📋 Aggiunta campi commissioni a clienti_aziende...');
            
            await pool.query(`
                ALTER TABLE clienti_aziende 
                ADD COLUMN commissione_luce DECIMAL(10, 2) DEFAULT NULL
            `);
            
            await pool.query(`
                ALTER TABLE clienti_aziende 
                ADD COLUMN commissione_gas DECIMAL(10, 2) DEFAULT NULL
            `);
            
            console.log('✅ Campi commissioni aggiunti a clienti_aziende');
        } else {
            console.log('ℹ️ Campi commissioni già presenti in clienti_aziende');
        }
        
        // Migra i dati esistenti da commissione_pattuita ai nuovi campi
        console.log('🔄 Migrazione dati esistenti...');
        
        // Per i clienti privati, se hanno commissione_pattuita, la copiamo in entrambi i campi
        await pool.query(`
            UPDATE clienti_privati 
            SET commissione_luce = commissione_pattuita,
                commissione_gas = commissione_pattuita
            WHERE commissione_pattuita IS NOT NULL 
            AND (commissione_luce IS NULL OR commissione_gas IS NULL)
        `);
        
        // Per i clienti aziende, se hanno commissione_pattuita, la copiamo in entrambi i campi
        await pool.query(`
            UPDATE clienti_aziende 
            SET commissione_luce = commissione_pattuita,
                commissione_gas = commissione_pattuita
            WHERE commissione_pattuita IS NOT NULL 
            AND (commissione_luce IS NULL OR commissione_gas IS NULL)
        `);
        
        console.log('✅ Migrazione commissioni separate completata con successo!');
        
        // Statistiche finali
        const statsPrivati = await pool.query(`
            SELECT 
                COUNT(*) as totale,
                COUNT(commissione_luce) as con_luce,
                COUNT(commissione_gas) as con_gas,
                COUNT(commissione_pattuita) as con_pattuita
            FROM clienti_privati
        `);
        
        const statsAziende = await pool.query(`
            SELECT 
                COUNT(*) as totale,
                COUNT(commissione_luce) as con_luce,
                COUNT(commissione_gas) as con_gas,
                COUNT(commissione_pattuita) as con_pattuita
            FROM clienti_aziende
        `);
        
        console.log('📊 Statistiche post-migrazione:');
        console.log('   Clienti Privati:', statsPrivati.rows[0]);
        console.log('   Clienti Aziende:', statsAziende.rows[0]);
        
    } catch (error) {
        console.error('❌ Errore durante la migrazione commissioni separate:', error);
        throw error;
    }
}

// Esegui migrazione se chiamato direttamente
if (require.main === module) {
    migrateCommissioniSeparate()
        .then(() => {
            console.log('🎉 Migrazione completata!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migrazione fallita:', error);
            process.exit(1);
        });
}