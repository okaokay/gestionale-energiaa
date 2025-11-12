/**
 * Script per aggiungere la colonna import_id alla tabella import_logs
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../gestionale_energia.db');

try {
    console.log('🔧 Aggiornamento tabella import_logs...');
    
    const db = new Database(dbPath);
    
    // Abilita foreign keys
    db.pragma('foreign_keys = ON');
    
    // Controlla se la colonna import_id esiste già
    const tableInfo = db.prepare(`PRAGMA table_info(import_logs)`).all();
    const hasImportId = tableInfo.some(column => column.name === 'import_id');
    
    if (hasImportId) {
        console.log('✅ La colonna import_id esiste già!');
    } else {
        console.log('➕ Aggiunta colonna import_id...');
        
        // Aggiungi la colonna import_id
        db.exec(`
            ALTER TABLE import_logs 
            ADD COLUMN import_id TEXT UNIQUE;
        `);
        
        console.log('✅ Colonna import_id aggiunta con successo!');
    }
    
    // Verifica la struttura aggiornata della tabella
    const updatedTableInfo = db.prepare(`PRAGMA table_info(import_logs)`).all();
    console.log('\n📊 Struttura aggiornata tabella import_logs:');
    updatedTableInfo.forEach(column => {
        console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    db.close();
    console.log('\n🎉 Aggiornamento completato con successo!');
    
} catch (error) {
    console.error('❌ Errore durante l\'aggiornamento della tabella:', error);
    process.exit(1);
}