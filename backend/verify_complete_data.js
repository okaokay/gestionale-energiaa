const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 VERIFICA COMPLETA DATI IMPORTATI');
console.log('===================================\n');

db.serialize(() => {
    // Conta clienti privati
    db.get('SELECT COUNT(*) as count FROM clienti_privati', [], (err, row) => {
        if (err) {
            console.error('❌ Errore conteggio clienti_privati:', err.message);
        } else {
            console.log(`👤 Clienti privati: ${row.count}`);
        }
    });

    // Conta clienti aziende
    db.get('SELECT COUNT(*) as count FROM clienti_aziende', [], (err, row) => {
        if (err) {
            console.error('❌ Errore conteggio clienti_aziende:', err.message);
        } else {
            console.log(`🏢 Clienti aziende: ${row.count}`);
        }
    });

    // Conta contratti luce
    db.get('SELECT COUNT(*) as count FROM contratti_luce', [], (err, row) => {
        if (err) {
            console.error('❌ Errore conteggio contratti_luce:', err.message);
        } else {
            console.log(`💡 Contratti luce: ${row.count}`);
        }
    });

    // Conta contratti gas
    db.get('SELECT COUNT(*) as count FROM contratti_gas', [], (err, row) => {
        if (err) {
            console.error('❌ Errore conteggio contratti_gas:', err.message);
        } else {
            console.log(`🔥 Contratti gas: ${row.count}`);
        }
    });

    setTimeout(() => {
        console.log('\n📋 DETTAGLI CLIENTI PRIVATI:');
        console.log('============================');
        
        db.all('SELECT id, nome, cognome, codice_fiscale, email_principale, telefono_principale FROM clienti_privati LIMIT 10', [], (err, rows) => {
            if (err) {
                console.error('❌ Errore recupero clienti_privati:', err.message);
            } else {
                rows.forEach((row, index) => {
                    console.log(`${index + 1}. ${row.nome} ${row.cognome} (${row.codice_fiscale})`);
                    console.log(`   📧 ${row.email_principale || 'N/A'} | 📞 ${row.telefono_principale || 'N/A'}`);
                    console.log(`   🆔 ID: ${row.id}\n`);
                });
            }
        });

        setTimeout(() => {
            console.log('\n📋 DETTAGLI CONTRATTI LUCE:');
            console.log('===========================');
            
            db.all(`
                SELECT cl.id, cl.numero_contratto, cl.pod, cl.potenza, cl.consumo_annuo, 
                       cp.nome, cp.cognome, ca.ragione_sociale
                FROM contratti_luce cl
                LEFT JOIN clienti_privati cp ON cl.cliente_privato_id = cp.id
                LEFT JOIN clienti_aziende ca ON cl.cliente_azienda_id = ca.id
                LIMIT 10
            `, [], (err, rows) => {
                if (err) {
                    console.error('❌ Errore recupero contratti_luce:', err.message);
                } else {
                    rows.forEach((row, index) => {
                        const cliente = row.nome ? `${row.nome} ${row.cognome}` : row.ragione_sociale || 'Cliente non trovato';
                        console.log(`${index + 1}. Contratto: ${row.numero_contratto || 'N/A'}`);
                        console.log(`   👤 Cliente: ${cliente}`);
                        console.log(`   ⚡ POD: ${row.pod || 'N/A'} | Potenza: ${row.potenza || 'N/A'} kW`);
                        console.log(`   📊 Consumo: ${row.consumo_annuo || 'N/A'} kWh/anno\n`);
                    });
                }
            });

            setTimeout(() => {
                console.log('\n📋 DETTAGLI CONTRATTI GAS:');
                console.log('==========================');
                
                db.all(`
                    SELECT cg.id, cg.numero_contratto, cg.pdr, cg.consumo_annuo, 
                           cp.nome, cp.cognome, ca.ragione_sociale
                    FROM contratti_gas cg
                    LEFT JOIN clienti_privati cp ON cg.cliente_privato_id = cp.id
                    LEFT JOIN clienti_aziende ca ON cg.cliente_azienda_id = ca.id
                    LIMIT 10
                `, [], (err, rows) => {
                    if (err) {
                        console.error('❌ Errore recupero contratti_gas:', err.message);
                    } else {
                        rows.forEach((row, index) => {
                            const cliente = row.nome ? `${row.nome} ${row.cognome}` : row.ragione_sociale || 'Cliente non trovato';
                            console.log(`${index + 1}. Contratto: ${row.numero_contratto || 'N/A'}`);
                            console.log(`   👤 Cliente: ${cliente}`);
                            console.log(`   🔥 PDR: ${row.pdr || 'N/A'}`);
                            console.log(`   📊 Consumo: ${row.consumo_annuo || 'N/A'} mc/anno\n`);
                        });
                    }
                    
                    console.log('✅ Verifica completa terminata!');
                    db.close();
                });
            }, 1000);
        }, 1000);
    }, 1000);
});