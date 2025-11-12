const Database = require('better-sqlite3');
const path = require('path');

function checkDatabaseStructure() {
    try {
        console.log('🔍 Controllo struttura database...\n');
        
        // Connetti al database
        const dbPath = path.join(__dirname, 'backend', 'gestionale_energia.db');
        console.log(`📁 Percorso database: ${dbPath}`);
        
        const db = new Database(dbPath);
        
        // Ottieni tutte le tabelle
        console.log('📋 Tabelle presenti nel database:');
        const tables = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        `).all();
        
        if (tables.length === 0) {
            console.log('❌ Nessuna tabella trovata nel database');
        } else {
            tables.forEach((table, i) => {
                console.log(`${i + 1}. ${table.name}`);
            });
        }
        
        // Controlla se esiste la tabella import_logs
        const importLogsExists = tables.some(table => table.name === 'import_logs');
        
        if (!importLogsExists) {
            console.log('\n❌ La tabella import_logs NON esiste');
            console.log('🔧 Questo spiega perché non riusciamo a salvare i risultati dell\'importazione');
            
            // Verifica se ci sono altre tabelle correlate all'import
            const importRelatedTables = tables.filter(table => 
                table.name.toLowerCase().includes('import') || 
                table.name.toLowerCase().includes('log')
            );
            
            if (importRelatedTables.length > 0) {
                console.log('\n📋 Tabelle correlate all\'import trovate:');
                importRelatedTables.forEach(table => {
                    console.log(`- ${table.name}`);
                });
            }
        } else {
            console.log('\n✅ La tabella import_logs esiste');
            
            // Mostra la struttura della tabella
            const tableInfo = db.prepare(`PRAGMA table_info(import_logs)`).all();
            console.log('\n📊 Struttura tabella import_logs:');
            tableInfo.forEach(column => {
                console.log(`- ${column.name}: ${column.type} ${column.notnull ? '(NOT NULL)' : ''} ${column.pk ? '(PRIMARY KEY)' : ''}`);
            });
        }
        
        db.close();
        
    } catch (error) {
        console.error('❌ Errore durante il controllo database:', error.message);
    }
}

checkDatabaseStructure();