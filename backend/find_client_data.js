const sqlite3 = require('sqlite3').verbose();

console.log('🔍 RICERCA DATI CLIENTI NEL DATABASE');
console.log('===================================');

const db = new sqlite3.Database('./gestionale_energia.db');

// Controlla tabelle con dati
const tablesToCheck = [
    'clienti_privati',
    'clienti_aziende', 
    'contracts',
    'contratti_luce',
    'contratti_gas',
    'users'
];

let checkCount = 0;

tablesToCheck.forEach(tableName => {
    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
        if (err) {
            console.error(`❌ Errore ${tableName}:`, err.message);
        } else {
            console.log(`📊 ${tableName}: ${row.count} record`);
            
            if (row.count > 0) {
                // Mostra struttura e alcuni dati
                db.all(`PRAGMA table_info(${tableName})`, (err, cols) => {
                    if (err) {
                        console.error(`❌ Errore struttura ${tableName}:`, err);
                        return;
                    }
                    
                    console.log(`\n📋 Struttura ${tableName}:`);
                    const importantCols = cols.filter(col => 
                        col.name.includes('id') || 
                        col.name.includes('nome') || 
                        col.name.includes('email') || 
                        col.name.includes('cliente') ||
                        col.name.includes('ragione') ||
                        col.name.includes('codice')
                    );
                    
                    if (importantCols.length > 0) {
                        console.log('  Colonne importanti:');
                        importantCols.forEach(col => {
                            console.log(`    - ${col.name} (${col.type})`);
                        });
                    }
                    
                    // Mostra primi record
                    db.all(`SELECT * FROM ${tableName} LIMIT 3`, (err, rows) => {
                        if (err) {
                            console.error(`❌ Errore dati ${tableName}:`, err);
                            return;
                        }
                        
                        if (rows.length > 0) {
                            console.log(`\n📄 Primi ${rows.length} record di ${tableName}:`);
                            rows.forEach((row, index) => {
                                console.log(`  ${index + 1}. ${JSON.stringify(row, null, 2)}`);
                            });
                        }
                    });
                });
            }
        }
        
        checkCount++;
        if (checkCount === tablesToCheck.length) {
            // Dopo aver controllato tutte le tabelle, proviamo a inserire alcuni clienti di test
            setTimeout(() => {
                console.log('\n🔧 INSERIMENTO CLIENTI DI TEST');
                console.log('==============================');
                
                // Inserisci alcuni clienti privati di test
                const insertPrivato = db.prepare(`
                    INSERT INTO clienti_privati (
                        id, nome, cognome, codice_fiscale, email_principale, 
                        telefono_mobile, citta_residenza, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `);
                
                const clientiPrivati = [
                    ['1', 'Mario', 'Rossi', 'RSSMRA80A01H501Z', 'mario.rossi@email.com', '3331234567', 'Roma'],
                    ['2', 'Giulia', 'Bianchi', 'BNCGLI85B02F205X', 'giulia.bianchi@email.com', '3337654321', 'Milano'],
                    ['3', 'Luca', 'Verdi', 'VRDLCU90C03L219Y', 'luca.verdi@email.com', '3339876543', 'Napoli']
                ];
                
                console.log('👥 Inserendo clienti privati...');
                clientiPrivati.forEach((cliente, index) => {
                    try {
                        insertPrivato.run(...cliente);
                        console.log(`✅ ${index + 1}. ${cliente[1]} ${cliente[2]} inserito`);
                    } catch (error) {
                        console.error(`❌ Errore inserimento ${cliente[1]}:`, error.message);
                    }
                });
                
                // Inserisci alcuni clienti aziende di test
                const insertAzienda = db.prepare(`
                    INSERT INTO clienti_aziende (
                        id, ragione_sociale, partita_iva, codice_fiscale, 
                        email_principale, telefono_principale, citta_sede_legale, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `);
                
                const clientiAziende = [
                    ['1', 'Tech Solutions SRL', '12345678901', '12345678901', 'info@techsolutions.it', '0612345678', 'Roma'],
                    ['2', 'Green Energy SpA', '98765432109', '98765432109', 'contact@greenenergy.it', '0287654321', 'Milano']
                ];
                
                console.log('\n🏢 Inserendo clienti aziende...');
                clientiAziende.forEach((azienda, index) => {
                    try {
                        insertAzienda.run(...azienda);
                        console.log(`✅ ${index + 1}. ${azienda[1]} inserita`);
                    } catch (error) {
                        console.error(`❌ Errore inserimento ${azienda[1]}:`, error.message);
                    }
                });
                
                // Verifica inserimenti
                setTimeout(() => {
                    db.get("SELECT COUNT(*) as count FROM clienti_privati", (err, row) => {
                        if (err) {
                            console.error('❌ Errore verifica privati:', err);
                        } else {
                            console.log(`\n📊 Clienti privati dopo inserimento: ${row.count}`);
                        }
                    });
                    
                    db.get("SELECT COUNT(*) as count FROM clienti_aziende", (err, row) => {
                        if (err) {
                            console.error('❌ Errore verifica aziende:', err);
                        } else {
                            console.log(`📊 Clienti aziende dopo inserimento: ${row.count}`);
                        }
                        
                        // Ora testa l'API
                        setTimeout(async () => {
                            console.log('\n🌐 TEST API DOPO INSERIMENTO');
                            console.log('============================');
                            
                            try {
                                const axios = require('axios');
                                
                                // Login
                                console.log('🔐 Login...');
                                const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
                                    email: 'admin@gestionale.it',
                                    password: 'Admin123!'
                                });
                                
                                const token = loginResponse.data.token;
                                console.log('✅ Login OK');
                                
                                // Test API clienti
                                console.log('📋 Test API clienti...');
                                const clientiResponse = await axios.get('http://localhost:3001/api/clienti', {
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    },
                                    params: { limit: 10 }
                                });
                                
                                const clienti = clientiResponse.data;
                                console.log(`✅ API OK - ${clienti.length} clienti ricevuti`);
                                
                                if (clienti.length > 0) {
                                    console.log('\n📋 Clienti dall\'API:');
                                    clienti.forEach((cliente, index) => {
                                        console.log(`${index + 1}. ID: ${cliente.id}, Nome: ${cliente.nome || cliente.ragione_sociale}, Tipo: ${cliente.tipo}`);
                                    });
                                    
                                    // Genera CSV
                                    console.log('\n📄 Generazione CSV...');
                                    const csvHeader = 'id,tipo,nome,cognome,ragione_sociale,email,telefono,citta\n';
                                    const csvRows = clienti.map(c => {
                                        return [
                                            c.id,
                                            c.tipo,
                                            c.nome || '',
                                            c.cognome || '',
                                            c.ragione_sociale || '',
                                            c.email || '',
                                            c.telefono || '',
                                            c.citta || ''
                                        ].map(field => `"${field}"`).join(',');
                                    }).join('\n');
                                    
                                    const csvContent = csvHeader + csvRows;
                                    require('fs').writeFileSync('./clienti_export_test.csv', csvContent);
                                    console.log('✅ CSV generato: clienti_export_test.csv');
                                    console.log('\nContenuto CSV:');
                                    console.log(csvContent);
                                }
                                
                            } catch (error) {
                                console.error('❌ Errore test API:', error.message);
                                if (error.response) {
                                    console.error('Status:', error.response.status);
                                    console.error('Data:', error.response.data);
                                }
                            }
                            
                            db.close();
                            console.log('\n✅ Test completato!');
                        }, 1000);
                    });
                }, 500);
            }, 1000);
        }
    });
});