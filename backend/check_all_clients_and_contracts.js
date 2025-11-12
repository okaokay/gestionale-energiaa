const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔍 Controllando tutti i clienti e contratti nel database...');
console.log(`📁 Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite');
});

// Controlla tutti i clienti privati
db.all(`
    SELECT id, nome, cognome, codice_fiscale, email_principale, created_at
    FROM clienti_privati 
    ORDER BY created_at DESC
    LIMIT 20
`, (err, clienti) => {
    if (err) {
        console.error('❌ Errore ricerca clienti:', err);
        return;
    }
    
    console.log(`\n👥 Clienti privati trovati: ${clienti.length}`);
    clienti.forEach((cliente, index) => {
        console.log(`   ${index + 1}. ID: ${cliente.id} - ${cliente.nome} ${cliente.cognome} (${cliente.codice_fiscale})`);
        console.log(`      Email: ${cliente.email_principale}`);
        console.log(`      Creato: ${cliente.created_at}`);
        console.log('');
    });
    
    // Cerca specificamente Mario Rossi con pattern matching
    db.all(`
        SELECT id, nome, cognome, codice_fiscale, email_principale, created_at
        FROM clienti_privati 
        WHERE nome LIKE '%Mario%' OR cognome LIKE '%Rossi%' OR codice_fiscale LIKE '%RSSMRA%'
    `, (err, marioResults) => {
        if (err) {
            console.error('❌ Errore ricerca Mario:', err);
            return;
        }
        
        console.log(`\n🔍 Ricerca Mario Rossi (pattern matching): ${marioResults.length} risultati`);
        marioResults.forEach((cliente, index) => {
            console.log(`   ${index + 1}. ID: ${cliente.id} - ${cliente.nome} ${cliente.cognome} (${cliente.codice_fiscale})`);
        });
        
        // Controlla tutti i contratti luce
        db.all(`
            SELECT COUNT(*) as count FROM contratti_luce
        `, (err, luceCounts) => {
            if (err) {
                console.error('❌ Errore count luce:', err);
                return;
            }
            
            console.log(`\n⚡ Totale contratti luce: ${luceCounts[0].count}`);
            
            // Controlla tutti i contratti gas
            db.all(`
                SELECT COUNT(*) as count FROM contratti_gas
            `, (err, gasCounts) => {
                if (err) {
                    console.error('❌ Errore count gas:', err);
                    return;
                    }
                
                console.log(`🔥 Totale contratti gas: ${gasCounts[0].count}`);
                
                // Se ci sono contratti, mostra i dettagli
                if (luceCounts[0].count > 0 || gasCounts[0].count > 0) {
                    console.log('\n📋 Dettagli contratti esistenti:');
                    
                    db.all(`
                        SELECT cl.id, cl.numero_contratto, cl.pod, cl.fornitore, cl.stato, cl.created_at,
                               cp.nome, cp.cognome, cp.codice_fiscale
                        FROM contratti_luce cl
                        LEFT JOIN clienti_privati cp ON cl.cliente_privato_id = cp.id
                        ORDER BY cl.created_at DESC
                        LIMIT 10
                    `, (err, contrattiLuce) => {
                        if (err) {
                            console.error('❌ Errore dettagli luce:', err);
                            return;
                        }
                        
                        console.log('\n⚡ Contratti Luce:');
                        contrattiLuce.forEach((contratto, index) => {
                            console.log(`   ${index + 1}. ${contratto.numero_contratto} - ${contratto.nome} ${contratto.cognome} (${contratto.codice_fiscale})`);
                            console.log(`      POD: ${contratto.pod}, Fornitore: ${contratto.fornitore}, Stato: ${contratto.stato}`);
                            console.log(`      Creato: ${contratto.created_at}`);
                            console.log('');
                        });
                        
                        db.all(`
                            SELECT cg.id, cg.numero_contratto, cg.pdr, cg.fornitore, cg.stato, cg.created_at,
                                   cp.nome, cp.cognome, cp.codice_fiscale
                            FROM contratti_gas cg
                            LEFT JOIN clienti_privati cp ON cg.cliente_privato_id = cp.id
                            ORDER BY cg.created_at DESC
                            LIMIT 10
                        `, (err, contrattiGas) => {
                            if (err) {
                                console.error('❌ Errore dettagli gas:', err);
                                return;
                            }
                            
                            console.log('🔥 Contratti Gas:');
                            contrattiGas.forEach((contratto, index) => {
                                console.log(`   ${index + 1}. ${contratto.numero_contratto} - ${contratto.nome} ${contratto.cognome} (${contratto.codice_fiscale})`);
                                console.log(`      PDR: ${contratto.pdr}, Fornitore: ${contratto.fornitore}, Stato: ${contratto.stato}`);
                                console.log(`      Creato: ${contratto.created_at}`);
                                console.log('');
                            });
                            
                            db.close();
                        });
                    });
                } else {
                    console.log('\n❌ Nessun contratto trovato nel database');
                    db.close();
                }
            });
        });
    });
});