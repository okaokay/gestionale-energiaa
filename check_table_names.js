const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

console.log('🔍 Verifica nomi tabelle nel database...\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite\n');
});

// Funzione per ottenere tutte le tabelle
function getAllTables() {
    return new Promise((resolve, reject) => {
        console.log('📋 TABELLE PRESENTI NEL DATABASE:');
        console.log('='.repeat(50));
        
        db.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        `, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            console.log(`📊 Totale tabelle: ${rows.length}\n`);
            
            rows.forEach((row, index) => {
                console.log(`${index + 1}. ${row.name}`);
            });
            
            console.log('');
            resolve(rows);
        });
    });
}

// Funzione per contare i record in ogni tabella
function countRecords(tableName) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM ${tableName}`, [], (err, row) => {
            if (err) {
                resolve({ table: tableName, count: 'Errore', error: err.message });
                return;
            }
            resolve({ table: tableName, count: row.count });
        });
    });
}

// Esecuzione principale
async function main() {
    try {
        const tables = await getAllTables();
        
        console.log('📊 CONTEGGIO RECORD PER TABELLA:');
        console.log('='.repeat(50));
        
        for (const table of tables) {
            const result = await countRecords(table.name);
            if (result.error) {
                console.log(`❌ ${result.table}: ${result.error}`);
            } else {
                console.log(`📈 ${result.table}: ${result.count} record`);
            }
        }
        
        console.log('');
        
        // Verifica specificamente le tabelle clienti
        console.log('👥 TABELLE CLIENTI IDENTIFICATE:');
        console.log('='.repeat(50));
        
        const clientTables = tables.filter(t => t.name.toLowerCase().includes('client'));
        if (clientTables.length > 0) {
            clientTables.forEach(table => {
                console.log(`✅ ${table.name}`);
            });
        } else {
            console.log('⚠️  Nessuna tabella clienti trovata con pattern "client"');
        }
        
        console.log('');
        
        // Verifica specificamente le tabelle contratti
        console.log('📋 TABELLE CONTRATTI IDENTIFICATE:');
        console.log('='.repeat(50));
        
        const contractTables = tables.filter(t => t.name.toLowerCase().includes('contratt'));
        if (contractTables.length > 0) {
            contractTables.forEach(table => {
                console.log(`✅ ${table.name}`);
            });
        } else {
            console.log('⚠️  Nessuna tabella contratti trovata con pattern "contratt"');
        }
        
    } catch (error) {
        console.error('❌ Errore durante la verifica:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Errore chiusura database:', err.message);
            } else {
                console.log('\n✅ Connessione database chiusa');
            }
        });
    }
}

main();