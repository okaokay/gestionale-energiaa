/**
 * Script per controllare il database nella directory root
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

try {
    console.log('🔍 Controllo database nella directory root...');
    
    // Percorso del database nella directory root (come configurato nel server)
    const dbPath = path.join(process.cwd(), 'gestionale_energia.db');
    console.log(`📁 Percorso database: ${dbPath}`);
    
    // Controlla se il file esiste
    if (!fs.existsSync(dbPath)) {
        console.log('❌ Il file database non esiste nella directory root');
        console.log('🔧 Questo spiega perché il server non riesce a salvare i dati');
        
        // Controlla se esiste nella directory backend
        const backendDbPath = path.join(__dirname, 'backend', 'gestionale_energia.db');
        if (fs.existsSync(backendDbPath)) {
            console.log(`✅ Trovato database in: ${backendDbPath}`);
            console.log('🔄 Il database è nella directory backend, ma il server cerca nella root');
        }
        
        return;
    }
    
    console.log('✅ File database trovato!');
    
    const db = new Database(dbPath);
    
    // Lista tutte le tabelle
    const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all();
    
    console.log('\n📋 Tabelle presenti nel database:');
    tables.forEach((table, index) => {
        console.log(`${index + 1}. ${table.name}`);
    });
    
    // Controlla se esiste la tabella import_logs
    const importLogsExists = tables.some(table => table.name === 'import_logs');
    
    if (!importLogsExists) {
        console.log('\n❌ La tabella import_logs NON esiste');
        console.log('🔧 Questo spiega perché non riusciamo a salvare i risultati dell\'importazione');
    } else {
        console.log('\n✅ La tabella import_logs esiste');
        
        // Mostra la struttura della tabella
        const tableInfo = db.prepare(`PRAGMA table_info(import_logs)`).all();
        console.log('\n📊 Struttura tabella import_logs:');
        tableInfo.forEach(column => {
            console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
        });
        
        // Mostra i record esistenti
        const importLogs = db.prepare(`SELECT * FROM import_logs ORDER BY id DESC LIMIT 5`).all();
        console.log('\n📊 Ultimi 5 record di import_logs:');
        if (importLogs.length === 0) {
            console.log('  Nessun record trovato');
        } else {
            importLogs.forEach(log => {
                console.log(`  - ID: ${log.id}, Import ID: ${log.import_id}, File: ${log.filename}, Errori: ${log.failed_imports}`);
            });
        }
    }
    
    db.close();
    
} catch (error) {
    console.error('❌ Errore durante il controllo database:', error.message);
}