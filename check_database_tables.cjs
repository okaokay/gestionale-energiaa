const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

async function checkDatabaseTables() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Errore connessione database:', err.message);
                reject(err);
                return;
            }
            console.log('✅ Connesso al database SQLite');
        });

        console.log('🔍 Verificando struttura database...\n');

        // Lista tutte le tabelle
        db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
            if (err) {
                console.error('❌ Errore nel recupero tabelle:', err.message);
                reject(err);
                return;
            }

            console.log('📋 Tabelle presenti nel database:');
            if (tables.length > 0) {
                tables.forEach((table, index) => {
                    console.log(`  ${index + 1}. ${table.name}`);
                });
            } else {
                console.log('  ⚠️ Nessuna tabella trovata nel database!');
            }
            console.log('');

            // Cerca tabelle relative ai contratti
            const contractTables = tables.filter(t => t.name.includes('contratt'));
            console.log('🔍 Tabelle relative ai contratti:');
            if (contractTables.length > 0) {
                contractTables.forEach(table => {
                    console.log(`  - ${table.name}`);
                });
            } else {
                console.log('  ⚠️ Nessuna tabella contratti trovata');
            }
            console.log('');

            // Verifica se esiste la tabella contratti_luce
            const hasContrattiLuce = tables.some(t => t.name === 'contratti_luce');
            console.log(`📊 Tabella contratti_luce: ${hasContrattiLuce ? '✅ Presente' : '❌ Assente'}`);
            
            const hasContrattiGas = tables.some(t => t.name === 'contratti_gas');
            console.log(`📊 Tabella contratti_gas: ${hasContrattiGas ? '✅ Presente' : '❌ Assente'}`);

            // Se esiste contratti_luce, mostra la sua struttura
            if (hasContrattiLuce) {
                console.log('\n📋 Struttura tabella contratti_luce:');
                db.all("PRAGMA table_info(contratti_luce)", (err, columns) => {
                    if (err) {
                        console.error('❌ Errore nel recupero struttura contratti_luce:', err.message);
                    } else {
                        columns.forEach(col => {
                            console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
                        });
                    }

                    db.close((err) => {
                        if (err) {
                            console.error('❌ Errore chiusura database:', err.message);
                        } else {
                            console.log('\n✅ Verifica completata!');
                        }
                        resolve();
                    });
                });
            } else {
                db.close((err) => {
                    if (err) {
                        console.error('❌ Errore chiusura database:', err.message);
                    } else {
                        console.log('\n✅ Verifica completata!');
                    }
                    resolve();
                });
            }
        });
    });
}

checkDatabaseTables().catch(console.error);