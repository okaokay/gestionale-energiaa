const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./gestionale_energia.db');

console.log('🔧 Correggendo ID null nei clienti privati...');

// Prima verifichiamo la situazione attuale
db.get("SELECT COUNT(*) as total FROM clienti_privati", (err, totalResult) => {
    if (err) {
        console.error('❌ Errore:', err);
        return;
    }
    
    db.get("SELECT COUNT(*) as nullCount FROM clienti_privati WHERE id IS NULL", (err, nullResult) => {
        if (err) {
            console.error('❌ Errore:', err);
            return;
        }
        
        console.log(`📊 Totale clienti privati: ${totalResult.total}`);
        console.log(`⚠️  Clienti con ID null: ${nullResult.nullCount}`);
        
        if (nullResult.nullCount > 0) {
            console.log('\n🔧 Iniziando correzione...');
            
            // Ottieni il massimo ID esistente (se ce ne sono)
            db.get("SELECT MAX(id) as maxId FROM clienti_privati WHERE id IS NOT NULL", (err, maxResult) => {
                if (err) {
                    console.error('❌ Errore nel trovare max ID:', err);
                    return;
                }
                
                let startId = (maxResult.maxId || 0) + 1;
                console.log(`🔢 Iniziando assegnazione ID da: ${startId}`);
                
                // Ottieni tutti i record con ID null
                db.all("SELECT rowid, nome, cognome FROM clienti_privati WHERE id IS NULL ORDER BY rowid", (err, rows) => {
                    if (err) {
                        console.error('❌ Errore nel recuperare record:', err);
                        return;
                    }
                    
                    console.log(`📝 Trovati ${rows.length} record da correggere`);
                    
                    // Inizia transazione
                    db.serialize(() => {
                        db.run("BEGIN TRANSACTION");
                        
                        let completed = 0;
                        
                        rows.forEach((row, index) => {
                            const newId = startId + index;
                            
                            db.run(
                                "UPDATE clienti_privati SET id = ? WHERE rowid = ?",
                                [newId, row.rowid],
                                function(err) {
                                    if (err) {
                                        console.error(`❌ Errore aggiornamento record ${row.rowid}:`, err);
                                        db.run("ROLLBACK");
                                        return;
                                    }
                                    
                                    completed++;
                                    console.log(`✅ Aggiornato: ${row.nome} ${row.cognome} -> ID: ${newId}`);
                                    
                                    if (completed === rows.length) {
                                        db.run("COMMIT", (err) => {
                                            if (err) {
                                                console.error('❌ Errore commit:', err);
                                            } else {
                                                console.log('\n🎉 Correzione completata con successo!');
                                                
                                                // Verifica finale
                                                db.get("SELECT COUNT(*) as nullCount FROM clienti_privati WHERE id IS NULL", (err, finalResult) => {
                                                    if (err) {
                                                        console.error('❌ Errore verifica finale:', err);
                                                    } else {
                                                        console.log(`✅ Clienti con ID null rimasti: ${finalResult.nullCount}`);
                                                    }
                                                    
                                                    db.close();
                                                });
                                            }
                                        });
                                    }
                                }
                            );
                        });
                    });
                });
            });
        } else {
            console.log('✅ Nessun ID null trovato, tutto a posto!');
            db.close();
        }
    });
});