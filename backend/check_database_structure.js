const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkDatabaseStructure() {
    console.log('🔍 VERIFICA STRUTTURA DATABASE');
    console.log('==============================\n');

    const dbPath = path.join(__dirname, 'gestionale_energia.db');
    
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Errore connessione database:', err.message);
                reject(err);
                return;
            }
            console.log('✅ Connesso al database SQLite\n');
        });

        // Verifica struttura tabella clienti_privati
        console.log('👥 STRUTTURA TABELLA clienti_privati:');
        db.all("PRAGMA table_info(clienti_privati)", (err, rows) => {
            if (err) {
                console.error('❌ Errore:', err.message);
            } else {
                rows.forEach(row => {
                    console.log(`   ${row.name} (${row.type}) - ${row.notnull ? 'NOT NULL' : 'NULL'} - ${row.dflt_value ? 'DEFAULT: ' + row.dflt_value : 'NO DEFAULT'}`);
                });
            }
            console.log('');

            // Verifica struttura tabella contratti_luce
            console.log('💡 STRUTTURA TABELLA contratti_luce:');
            db.all("PRAGMA table_info(contratti_luce)", (err, rows) => {
                if (err) {
                    console.error('❌ Errore:', err.message);
                } else {
                    rows.forEach(row => {
                        console.log(`   ${row.name} (${row.type}) - ${row.notnull ? 'NOT NULL' : 'NULL'} - ${row.dflt_value ? 'DEFAULT: ' + row.dflt_value : 'NO DEFAULT'}`);
                    });
                }
                console.log('');

                // Verifica struttura tabella contratti_gas
                console.log('🔥 STRUTTURA TABELLA contratti_gas:');
                db.all("PRAGMA table_info(contratti_gas)", (err, rows) => {
                    if (err) {
                        console.error('❌ Errore:', err.message);
                    } else {
                        rows.forEach(row => {
                            console.log(`   ${row.name} (${row.type}) - ${row.notnull ? 'NOT NULL' : 'NULL'} - ${row.dflt_value ? 'DEFAULT: ' + row.dflt_value : 'NO DEFAULT'}`);
                        });
                    }
                    console.log('');

                    // Verifica se ci sono dati esistenti
                    console.log('📊 CONTEGGIO RECORD ESISTENTI:');
                    
                    db.get("SELECT COUNT(*) as count FROM clienti_privati", (err, row) => {
                        if (err) {
                            console.error('❌ Errore clienti_privati:', err.message);
                        } else {
                            console.log(`   👥 Clienti privati: ${row.count}`);
                        }

                        db.get("SELECT COUNT(*) as count FROM contratti_luce", (err, row) => {
                            if (err) {
                                console.error('❌ Errore contratti_luce:', err.message);
                            } else {
                                console.log(`   💡 Contratti luce: ${row.count}`);
                            }

                            db.get("SELECT COUNT(*) as count FROM contratti_gas", (err, row) => {
                                if (err) {
                                    console.error('❌ Errore contratti_gas:', err.message);
                                } else {
                                    console.log(`   🔥 Contratti gas: ${row.count}`);
                                }

                                // Verifica se la colonna stato_contratto esiste
                                console.log('\n🔍 VERIFICA COLONNA stato_contratto:');
                                
                                db.all("PRAGMA table_info(contratti_luce)", (err, rows) => {
                                    if (err) {
                                        console.error('❌ Errore:', err.message);
                                    } else {
                                        const hasStatoContratto = rows.some(row => row.name === 'stato_contratto');
                                        console.log(`   💡 contratti_luce.stato_contratto: ${hasStatoContratto ? '✅ PRESENTE' : '❌ MANCANTE'}`);
                                    }

                                    db.all("PRAGMA table_info(contratti_gas)", (err, rows) => {
                                        if (err) {
                                            console.error('❌ Errore:', err.message);
                                        } else {
                                            const hasStatoContratto = rows.some(row => row.name === 'stato_contratto');
                                            console.log(`   🔥 contratti_gas.stato_contratto: ${hasStatoContratto ? '✅ PRESENTE' : '❌ MANCANTE'}`);
                                        }

                                        // Chiudi la connessione
                                        db.close((err) => {
                                            if (err) {
                                                console.error('❌ Errore chiusura database:', err.message);
                                                reject(err);
                                            } else {
                                                console.log('\n✅ Database chiuso correttamente');
                                                resolve();
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

checkDatabaseStructure().catch(console.error);