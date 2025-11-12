/**
 * Migrazione: Aggiunta colonne complete per clienti_privati e clienti_aziende
 * Esegui: npm run db:migrate-clienti
 */

import Database from 'better-sqlite3';

const DB_PATH = process.env.DATABASE_PATH || './gestionale_energia.db';
const db = new Database(DB_PATH);

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  MIGRAZIONE CLIENTI - Aggiunta colonne complete           ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

try {
    console.log('📦 Aggiunta colonne a clienti_privati...');
    
    // Aggiungi colonne mancanti a clienti_privati
    const columnsPrivati = [
        'ALTER TABLE clienti_privati ADD COLUMN email_secondaria TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN telefono_fisso TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN pec TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN civico_residenza TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN cap_residenza TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN provincia_residenza TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN via_fornitura TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN civico_fornitura TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN cap_fornitura TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN citta_fornitura TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN provincia_fornitura TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN tipo_documento TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN numero_documento TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN ente_rilascio TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN data_scadenza_documento TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN iban TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN preferenza_email INTEGER DEFAULT 1',
        'ALTER TABLE clienti_privati ADD COLUMN preferenza_sms INTEGER DEFAULT 1',
        'ALTER TABLE clienti_privati ADD COLUMN preferenza_telefono INTEGER DEFAULT 1',
        'ALTER TABLE clienti_privati ADD COLUMN note TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN data_consenso TEXT',
        'ALTER TABLE clienti_privati ADD COLUMN created_by TEXT'
    ];
    
    for (const sql of columnsPrivati) {
        try {
            db.exec(sql);
            console.log(`✅ ${sql.split('ADD COLUMN ')[1]?.split(' ')[0] || 'colonna'}`);
        } catch (error: any) {
            if (error.message.includes('duplicate column name')) {
                console.log(`⚠️  ${sql.split('ADD COLUMN ')[1]?.split(' ')[0]} già esistente, skip`);
            } else {
                throw error;
            }
        }
    }
    
    console.log('\n📦 Aggiunta colonne a clienti_aziende...');
    
    // Aggiungi colonne mancanti a clienti_aziende
    const columnsAziende = [
        'ALTER TABLE clienti_aziende ADD COLUMN codice_fiscale TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN descrizione_ateco TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN pec_aziendale TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN via_sede_legale TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN civico_sede_legale TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN cap_sede_legale TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN provincia_sede_legale TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN via_sede_operativa TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN civico_sede_operativa TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN cap_sede_operativa TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN citta_sede_operativa TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN provincia_sede_operativa TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN nome_referente TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN cognome_referente TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN ruolo_referente TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN dimensione_azienda TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN settore_merceologico TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN fatturato_annuo REAL',
        'ALTER TABLE clienti_aziende ADD COLUMN iban_aziendale TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN codice_sdi TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN note TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN data_consenso TEXT',
        'ALTER TABLE clienti_aziende ADD COLUMN created_by TEXT'
    ];
    
    for (const sql of columnsAziende) {
        try {
            db.exec(sql);
            console.log(`✅ ${sql.split('ADD COLUMN ')[1]?.split(' ')[0] || 'colonna'}`);
        } catch (error: any) {
            if (error.message.includes('duplicate column name')) {
                console.log(`⚠️  ${sql.split('ADD COLUMN ')[1]?.split(' ')[0]} già esistente, skip`);
            } else {
                throw error;
            }
        }
    }
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║          MIGRAZIONE COMPLETATA CON SUCCESSO! 🎉           ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Colonne aggiunte:                                        ║');
    console.log('║  ✅ clienti_privati: +22 colonne                         ║');
    console.log('║  ✅ clienti_aziende: +23 colonne                         ║');
    console.log('║                                                           ║');
    console.log('║  Ora puoi creare clienti con tutti i dati completi!      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
} catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    process.exit(1);
} finally {
    db.close();
}

