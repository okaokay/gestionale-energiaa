/**
 * Script per creare la tabella import_logs
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../gestionale_energia.db');

try {
    console.log('🚀 Creazione tabella import_logs...');
    
    const db = new Database(dbPath);
    
    // Abilita foreign keys
    db.pragma('foreign_keys = ON');
    
    // Crea la tabella import_logs
    db.exec(`
        CREATE TABLE IF NOT EXISTS import_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            import_id TEXT UNIQUE NOT NULL,
            user_id TEXT,
            filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            total_rows INTEGER DEFAULT 0,
            successful_imports INTEGER DEFAULT 0,
            failed_imports INTEGER DEFAULT 0,
            incomplete_imports INTEGER DEFAULT 0,
            mapping_config TEXT,
            error_log TEXT,
            import_date TEXT DEFAULT CURRENT_TIMESTAMP,
            duration_seconds INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `);
    
    console.log('✅ Tabella import_logs creata con successo!');
    
    // Verifica la struttura della tabella
    const tableInfo = db.prepare(`PRAGMA table_info(import_logs)`).all();
    console.log('\n📊 Struttura tabella import_logs:');
    tableInfo.forEach(column => {
        console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    db.close();
    console.log('\n🎉 Operazione completata con successo!');
    
} catch (error) {
    console.error('❌ Errore durante la creazione della tabella:', error);
    process.exit(1);
}