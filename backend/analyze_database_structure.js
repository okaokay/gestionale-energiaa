const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./gestionale_energia.db');

console.log('🔍 ANALISI COMPLETA DATABASE GESTIONALE_ENERGIA.DB');
console.log('=' .repeat(60));

// Funzione per ottenere la struttura di una tabella
function getTableStructure(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Funzione per ottenere tutte le tabelle
function getAllTables() {
    return new Promise((resolve, reject) => {
        db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows.map(row => row.name));
            }
        });
    });
}

async function analyzeDatabase() {
    try {
        console.log('\n📋 ELENCO TUTTE LE TABELLE:');
        const tables = await getAllTables();
        tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table}`);
        });

        console.log('\n🔍 STRUTTURA DETTAGLIATA DELLE TABELLE:');
        console.log('=' .repeat(60));

        const tableStructures = {};

        for (const table of tables) {
            console.log(`\n📊 TABELLA: ${table.toUpperCase()}`);
            console.log('-' .repeat(40));
            
            try {
                const structure = await getTableStructure(table);
                tableStructures[table] = structure;
                
                structure.forEach(column => {
                    const nullable = column.notnull ? 'NOT NULL' : 'NULL';
                    const defaultVal = column.dflt_value ? ` DEFAULT ${column.dflt_value}` : '';
                    const pk = column.pk ? ' PRIMARY KEY' : '';
                    console.log(`  ${column.name.padEnd(25)} ${column.type.padEnd(15)} ${nullable.padEnd(10)}${defaultVal}${pk}`);
                });
                
                console.log(`  📊 Totale colonne: ${structure.length}`);
            } catch (error) {
                console.log(`  ❌ Errore nel leggere la struttura: ${error.message}`);
            }
        }

        // Confronto specifico tra contratti_luce e contratti_gas
        console.log('\n🔄 CONFRONTO CONTRATTI_LUCE vs CONTRATTI_GAS:');
        console.log('=' .repeat(60));

        if (tableStructures.contratti_luce && tableStructures.contratti_gas) {
            const luceColumns = tableStructures.contratti_luce.map(col => col.name);
            const gasColumns = tableStructures.contratti_gas.map(col => col.name);

            console.log('\n💡 COLONNE IN CONTRATTI_LUCE:');
            luceColumns.forEach(col => console.log(`  ✓ ${col}`));

            console.log('\n🔥 COLONNE IN CONTRATTI_GAS:');
            gasColumns.forEach(col => console.log(`  ✓ ${col}`));

            console.log('\n❌ COLONNE MANCANTI IN CONTRATTI_GAS:');
            const missingInGas = luceColumns.filter(col => !gasColumns.includes(col));
            if (missingInGas.length > 0) {
                missingInGas.forEach(col => {
                    const luceCol = tableStructures.contratti_luce.find(c => c.name === col);
                    console.log(`  🚫 ${col} (${luceCol.type})`);
                });
            } else {
                console.log('  ✅ Nessuna colonna mancante');
            }

            console.log('\n❌ COLONNE MANCANTI IN CONTRATTI_LUCE:');
            const missingInLuce = gasColumns.filter(col => !luceColumns.includes(col));
            if (missingInLuce.length > 0) {
                missingInLuce.forEach(col => {
                    const gasCol = tableStructures.contratti_gas.find(c => c.name === col);
                    console.log(`  🚫 ${col} (${gasCol.type})`);
                });
            } else {
                console.log('  ✅ Nessuna colonna mancante');
            }
        }

        // Analisi delle tabelle clienti
        console.log('\n👥 ANALISI TABELLE CLIENTI:');
        console.log('=' .repeat(60));

        const clientTables = tables.filter(table => table.includes('client'));
        if (clientTables.length > 0) {
            clientTables.forEach(table => {
                console.log(`\n📊 ${table.toUpperCase()}:`);
                if (tableStructures[table]) {
                    tableStructures[table].forEach(col => {
                        console.log(`  ${col.name} (${col.type})`);
                    });
                }
            });
        }

        // Controllo import_logs
        console.log('\n📋 STRUTTURA IMPORT_LOGS:');
        console.log('=' .repeat(60));
        if (tableStructures.import_logs) {
            tableStructures.import_logs.forEach(col => {
                console.log(`  ${col.name.padEnd(25)} ${col.type.padEnd(15)}`);
            });
        }

        console.log('\n✅ ANALISI COMPLETATA!');
        
    } catch (error) {
        console.error('❌ Errore durante l\'analisi:', error);
    } finally {
        db.close();
    }
}

analyzeDatabase();