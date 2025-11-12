const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./gestionale_energia.db');

console.log('🔍 Controllo dati dopo importazione...');

// Controlla clienti privati
db.get('SELECT COUNT(*) as count FROM clienti_privati', (err, row) => {
    if (err) {
        console.error('Errore clienti privati:', err);
    } else {
        console.log('👥 Clienti privati:', row.count);
    }
    
    // Controlla contratti luce
    db.get('SELECT COUNT(*) as count FROM contratti_luce', (err, row) => {
        if (err) {
            console.error('Errore contratti luce:', err);
        } else {
            console.log('💡 Contratti luce:', row.count);
        }
        
        // Controlla contratti gas
        db.get('SELECT COUNT(*) as count FROM contratti_gas', (err, row) => {
            if (err) {
                console.error('Errore contratti gas:', err);
            } else {
                console.log('🔥 Contratti gas:', row.count);
            }
            
            // Controlla log importazione
            db.get('SELECT COUNT(*) as count FROM import_logs', (err, row) => {
                if (err) {
                    console.error('Errore import logs:', err);
                } else {
                    console.log('📋 Log importazione:', row.count);
                }
                
                // Mostra gli ultimi log
                db.all('SELECT * FROM import_logs ORDER BY id DESC LIMIT 3', (err, rows) => {
                    if (err) {
                        console.error('Errore nel recupero log:', err);
                    } else {
                        console.log('\n📊 Ultimi log importazione:');
                        rows.forEach((row, index) => {
                            console.log(`${index + 1}. File: ${row.filename}`);
                            console.log(`   Totale righe: ${row.total_rows}`);
                            console.log(`   Successi: ${row.successful_imports}`);
                            console.log(`   Fallimenti: ${row.failed_imports}`);
                            console.log(`   Data: ${row.import_date}`);
                            console.log('   ---');
                        });
                    }
                    
                    // Se ci sono dati, mostra alcuni esempi
                    if (rows.length > 0) {
                        console.log('\n🔍 Controllo esempi di dati inseriti...');
                        
                        // Mostra alcuni clienti
                        db.all('SELECT * FROM clienti_privati LIMIT 3', (err, clients) => {
                            if (err) {
                                console.error('Errore nel recupero clienti:', err);
                            } else if (clients.length > 0) {
                                console.log('\n👥 Esempi clienti privati:');
                                clients.forEach((client, index) => {
                                    console.log(`${index + 1}. ${client.nome} ${client.cognome} - CF: ${client.codice_fiscale}`);
                                });
                            }
                            
                            // Mostra alcuni contratti luce
                            db.all('SELECT * FROM contratti_luce LIMIT 3', (err, contracts) => {
                                if (err) {
                                    console.error('Errore nel recupero contratti luce:', err);
                                } else if (contracts.length > 0) {
                                    console.log('\n💡 Esempi contratti luce:');
                                    contracts.forEach((contract, index) => {
                                        console.log(`${index + 1}. POD: ${contract.pod} - Cliente ID: ${contract.cliente_id}`);
                                    });
                                }
                                
                                db.close();
                            });
                        });
                    } else {
                        db.close();
                    }
                });
            });
        });
    });
});