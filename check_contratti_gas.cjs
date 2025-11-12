const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

async function checkContrattiGas() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Errore connessione database:', err.message);
                reject(err);
                return;
            }
            console.log('✅ Connesso al database SQLite');
        });

        console.log('🔍 Verificando contratti gas inseriti...\n');

        // Controlla la struttura della tabella
        db.all("PRAGMA table_info(contratti_gas)", (err, columns) => {
            if (err) {
                console.error('❌ Errore nel recupero struttura tabella:', err.message);
                reject(err);
                return;
            }

            console.log('📋 Struttura tabella contratti_gas:');
            columns.forEach(col => {
                console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.pk ? '(PRIMARY KEY)' : ''}`);
            });
            console.log('');

            // Conta i record totali
            db.get("SELECT COUNT(*) as total FROM contratti_gas", (err, row) => {
                if (err) {
                    console.error('❌ Errore nel conteggio record:', err.message);
                    reject(err);
                    return;
                }

                console.log(`📊 Totale contratti gas: ${row.total}\n`);

                if (row.total > 0) {
                    // Mostra gli ultimi contratti inseriti
                    db.all(`
                        SELECT 
                            numero_contratto,
                            pdr,
                            fornitore,
                            data_attivazione,
                            data_scadenza,
                            prezzo_gas,
                            cliente_id,
                            created_at
                        FROM contratti_gas 
                        ORDER BY created_at DESC 
                        LIMIT 10
                    `, (err, rows) => {
                        if (err) {
                            console.error('❌ Errore nel recupero contratti:', err.message);
                            reject(err);
                            return;
                        }

                        console.log('📋 Ultimi contratti gas inseriti:');
                        rows.forEach((contratto, index) => {
                            console.log(`\n${index + 1}. Contratto: ${contratto.numero_contratto}`);
                            console.log(`   PDR: ${contratto.pdr}`);
                            console.log(`   Fornitore: ${contratto.fornitore}`);
                            console.log(`   Attivazione: ${contratto.data_attivazione || 'N/A'}`);
                            console.log(`   Scadenza: ${contratto.data_scadenza || 'N/A'}`);
                            console.log(`   Prezzo: €${contratto.prezzo_gas || 'N/A'}`);
                            console.log(`   Cliente ID: ${contratto.cliente_id || 'N/A'}`);
                            console.log(`   Creato: ${contratto.created_at}`);
                        });

                        // Verifica associazioni con clienti
                        db.all(`
                            SELECT 
                                cg.numero_contratto,
                                cg.pdr,
                                cp.nome,
                                cp.cognome,
                                cp.codice_fiscale,
                                ca.ragione_sociale,
                                ca.partita_iva
                            FROM contratti_gas cg
                            LEFT JOIN clienti_privati cp ON cg.cliente_id = cp.id
                            LEFT JOIN clienti_aziende ca ON cg.cliente_id = ca.id
                            ORDER BY cg.created_at DESC
                            LIMIT 5
                        `, (err, associations) => {
                            if (err) {
                                console.error('❌ Errore nel recupero associazioni:', err.message);
                                reject(err);
                                return;
                            }

                            console.log('\n🔗 Associazioni contratti-clienti:');
                            associations.forEach((assoc, index) => {
                                console.log(`\n${index + 1}. Contratto: ${assoc.numero_contratto} (PDR: ${assoc.pdr})`);
                                if (assoc.nome && assoc.cognome) {
                                    console.log(`   Cliente Privato: ${assoc.nome} ${assoc.cognome} (${assoc.codice_fiscale})`);
                                } else if (assoc.ragione_sociale) {
                                    console.log(`   Cliente Azienda: ${assoc.ragione_sociale} (${assoc.partita_iva})`);
                                } else {
                                    console.log(`   ⚠️ Cliente non associato`);
                                }
                            });

                            db.close((err) => {
                                if (err) {
                                    console.error('❌ Errore chiusura database:', err.message);
                                } else {
                                    console.log('\n✅ Verifica completata!');
                                }
                                resolve();
                            });
                        });
                    });
                } else {
                    console.log('⚠️ Nessun contratto gas trovato nella tabella');
                    db.close();
                    resolve();
                }
            });
        });
    });
}

checkContrattiGas().catch(console.error);