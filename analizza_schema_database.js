const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Percorso del database
const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔍 ANALISI COMPLETA SCHEMA DATABASE gestionale_energia.db');
console.log('=' .repeat(80));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore apertura database:', err.message);
        return;
    }
    console.log('✅ Database aperto correttamente');
    console.log('📍 Percorso:', dbPath);
    console.log('');
});

// Funzione per ottenere tutte le tabelle
function getAllTables() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Funzione per ottenere la struttura di una tabella
function getTableSchema(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Funzione per contare i record in una tabella
function getTableCount(tableName) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
        });
    });
}

// Funzione per ottenere gli indici di una tabella
function getTableIndexes(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA index_list(${tableName})`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Funzione per ottenere le foreign keys di una tabella
function getTableForeignKeys(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA foreign_key_list(${tableName})`, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Funzione principale di analisi
async function analyzeDatabase() {
    try {
        console.log('📊 ELENCO TABELLE NEL DATABASE');
        console.log('-'.repeat(50));
        
        const tables = await getAllTables();
        console.log(`Numero totale tabelle: ${tables.length}`);
        console.log('');
        
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            const tableName = table.name;
            
            console.log(`\n🗂️  TABELLA ${i + 1}: ${tableName.toUpperCase()}`);
            console.log('='.repeat(60));
            
            try {
                // Conta record
                const count = await getTableCount(tableName);
                console.log(`📈 Record presenti: ${count}`);
                
                // Schema della tabella
                const schema = await getTableSchema(tableName);
                console.log('\n📋 STRUTTURA COLONNE:');
                console.log('┌─────┬─────────────────────┬─────────────────┬─────────┬─────────────┬────────┐');
                console.log('│ CID │ Nome Colonna        │ Tipo            │ NotNull │ Default     │ PK     │');
                console.log('├─────┼─────────────────────┼─────────────────┼─────────┼─────────────┼────────┤');
                
                schema.forEach(col => {
                    const cid = col.cid.toString().padEnd(3);
                    const name = col.name.padEnd(19);
                    const type = col.type.padEnd(15);
                    const notNull = col.notnull ? 'YES' : 'NO';
                    const notNullPad = notNull.padEnd(7);
                    const defaultVal = (col.dflt_value || 'NULL').toString().padEnd(11);
                    const pk = col.pk ? 'YES' : 'NO';
                    
                    console.log(`│ ${cid} │ ${name} │ ${type} │ ${notNullPad} │ ${defaultVal} │ ${pk}    │`);
                });
                console.log('└─────┴─────────────────────┴─────────────────┴─────────┴─────────────┴────────┘');
                
                // Indici
                const indexes = await getTableIndexes(tableName);
                if (indexes.length > 0) {
                    console.log('\n🔗 INDICI:');
                    indexes.forEach(idx => {
                        console.log(`   - ${idx.name} (unique: ${idx.unique ? 'YES' : 'NO'})`);
                    });
                }
                
                // Foreign Keys
                const foreignKeys = await getTableForeignKeys(tableName);
                if (foreignKeys.length > 0) {
                    console.log('\n🔑 FOREIGN KEYS:');
                    foreignKeys.forEach(fk => {
                        console.log(`   - ${fk.from} → ${fk.table}.${fk.to}`);
                    });
                }
                
            } catch (error) {
                console.log(`❌ Errore analisi tabella ${tableName}:`, error.message);
            }
        }
        
        // Riepilogo finale
        console.log('\n\n📊 RIEPILOGO FINALE');
        console.log('='.repeat(50));
        console.log(`Totale tabelle analizzate: ${tables.length}`);
        
        // Cerca tabelle specifiche per contratti
        const contractTables = tables.filter(t => 
            t.name.toLowerCase().includes('contratt') || 
            t.name.toLowerCase().includes('contract')
        );
        
        if (contractTables.length > 0) {
            console.log('\n🔍 TABELLE CONTRATTI IDENTIFICATE:');
            contractTables.forEach(t => {
                console.log(`   - ${t.name}`);
            });
        }
        
        // Cerca tabelle specifiche per clienti
        const clientTables = tables.filter(t => 
            t.name.toLowerCase().includes('client') || 
            t.name.toLowerCase().includes('customer')
        );
        
        if (clientTables.length > 0) {
            console.log('\n👥 TABELLE CLIENTI IDENTIFICATE:');
            clientTables.forEach(t => {
                console.log(`   - ${t.name}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Errore durante l\'analisi:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Errore chiusura database:', err.message);
            } else {
                console.log('\n✅ Database chiuso correttamente');
            }
        });
    }
}

// Avvia l'analisi
analyzeDatabase();