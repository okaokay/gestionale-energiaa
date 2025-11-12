const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Percorso del database
const dbPath = path.join(__dirname, '..', 'gestionale_energia.db');

console.log('🔍 Test import con dati reali');
console.log('📁 Percorso database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite');
});

async function testImport() {
    try {
        // 1. Verifica clienti esistenti
        console.log('\n📊 VERIFICA CLIENTI ESISTENTI:');
        
        const clientiPrivati = await new Promise((resolve, reject) => {
            db.all('SELECT id, nome, cognome, codice_fiscale, email_principale FROM clienti_privati LIMIT 5', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('👥 Clienti privati trovati:', clientiPrivati.length);
        clientiPrivati.forEach(cliente => {
            console.log(`  - ${cliente.nome} ${cliente.cognome} (CF: ${cliente.codice_fiscale}, Email: ${cliente.email_principale})`);
        });

        // 2. Simula dati CSV per contratto luce
        console.log('\n🔍 TEST INSERIMENTO CONTRATTO LUCE:');
        
        if (clientiPrivati.length > 0) {
            const clienteTest = clientiPrivati[0];
            console.log('👤 Cliente test selezionato:', clienteTest.nome, clienteTest.cognome);
            
            // Simula record CSV con dati del cliente esistente
            const recordCSV = {
                // Dati cliente per associazione
                codice_fiscale: clienteTest.codice_fiscale,
                email_principale: clienteTest.email_principale,
                
                // Dati contratto luce
                numero_contratto: 'TEST_LUCE_001',
                pod: 'IT001E12345678',
                fornitore: 'Enel Energia',
                data_attivazione: '2024-01-15',
                data_scadenza: '2025-01-15',
                data_stipula: '2024-01-10',
                prezzo_energia: '0.25',
                commodity: 'luce',
                procedure: 'voltura',
                agente: 'Mario Rossi',
                nome_offerta: 'Offerta Casa',
                tipo_offerta: 'prezzo_fisso',
                stato: 'attivo'
            };
            
            console.log('📝 Record CSV simulato:', JSON.stringify(recordCSV, null, 2));
            
            // Test inserimento manuale
            const contrattoId = 'test-' + Date.now();
            
            try {
                await new Promise((resolve, reject) => {
                    const query = `
                        INSERT INTO contratti_luce (
                            id, cliente_privato_id, cliente_azienda_id, tipo_cliente,
                            numero_contratto, pod, fornitore, data_attivazione, data_scadenza,
                            data_stipula, prezzo_energia, commodity, procedure, agente,
                            nome_offerta, tipo_offerta, stato
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    db.run(query, [
                        contrattoId,
                        clienteTest.id,  // cliente_privato_id
                        null,            // cliente_azienda_id
                        'privato',       // tipo_cliente
                        recordCSV.numero_contratto,
                        recordCSV.pod,
                        recordCSV.fornitore,
                        recordCSV.data_attivazione,
                        recordCSV.data_scadenza,
                        recordCSV.data_stipula,
                        parseFloat(recordCSV.prezzo_energia),
                        recordCSV.commodity,
                        recordCSV.procedure,
                        recordCSV.agente,
                        recordCSV.nome_offerta,
                        recordCSV.tipo_offerta,
                        recordCSV.stato
                    ], function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    });
                });
                
                console.log('✅ Contratto luce inserito con successo!');
                console.log('🆔 ID contratto:', contrattoId);
                
                // Verifica inserimento
                const contrattoInserito = await new Promise((resolve, reject) => {
                    db.get('SELECT * FROM contratti_luce WHERE id = ?', [contrattoId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
                
                console.log('📋 Contratto verificato:', contrattoInserito ? 'TROVATO' : 'NON TROVATO');
                
            } catch (insertError) {
                console.error('❌ Errore inserimento contratto luce:', insertError.message);
                console.error('📝 Dettagli errore:', insertError);
            }
        }

        // 3. Test inserimento contratto gas
        console.log('\n🔍 TEST INSERIMENTO CONTRATTO GAS:');
        
        if (clientiPrivati.length > 0) {
            const clienteTest = clientiPrivati[0];
            
            const recordCSVGas = {
                codice_fiscale: clienteTest.codice_fiscale,
                email_principale: clienteTest.email_principale,
                numero_contratto: 'TEST_GAS_001',
                pdr: '12345678901234',
                fornitore: 'Eni Gas',
                data_attivazione: '2024-01-15',
                data_scadenza: '2025-01-15',
                data_stipula: '2024-01-10',
                prezzo_gas: '0.85',
                commodity: 'gas',
                procedure: 'voltura',
                agente: 'Mario Rossi',
                nome_offerta: 'Offerta Casa Gas',
                tipo_offerta: 'prezzo_fisso',
                stato: 'attivo'
            };
            
            const contrattoGasId = 'test-gas-' + Date.now();
            
            try {
                await new Promise((resolve, reject) => {
                    const query = `
                        INSERT INTO contratti_gas (
                            id, cliente_privato_id, cliente_azienda_id, tipo_cliente,
                            numero_contratto, pdr, fornitore, data_attivazione, data_scadenza,
                            data_stipula, prezzo_gas, commodity, procedure, agente,
                            nome_offerta, tipo_offerta, stato, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    `;
                    
                    db.run(query, [
                        contrattoGasId,
                        clienteTest.id,
                        null,
                        'privato',
                        recordCSVGas.numero_contratto,
                        recordCSVGas.pdr,
                        recordCSVGas.fornitore,
                        recordCSVGas.data_attivazione,
                        recordCSVGas.data_scadenza,
                        recordCSVGas.data_stipula,
                        parseFloat(recordCSVGas.prezzo_gas),
                        recordCSVGas.commodity,
                        recordCSVGas.procedure,
                        recordCSVGas.agente,
                        recordCSVGas.nome_offerta,
                        recordCSVGas.tipo_offerta,
                        recordCSVGas.stato
                    ], function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    });
                });
                
                console.log('✅ Contratto gas inserito con successo!');
                console.log('🆔 ID contratto gas:', contrattoGasId);
                
            } catch (insertError) {
                console.error('❌ Errore inserimento contratto gas:', insertError.message);
            }
        }

        // 4. Verifica totali contratti
        console.log('\n📊 VERIFICA TOTALI CONTRATTI:');
        
        const totaliContratti = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    (SELECT COUNT(*) FROM contratti_luce) as contratti_luce,
                    (SELECT COUNT(*) FROM contratti_gas) as contratti_gas
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]);
            });
        });
        
        console.log('📈 Totale contratti luce:', totaliContratti.contratti_luce);
        console.log('📈 Totale contratti gas:', totaliContratti.contratti_gas);

    } catch (error) {
        console.error('❌ Errore durante il test:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Errore chiusura database:', err.message);
            } else {
                console.log('✅ Connessione database chiusa');
            }
        });
    }
}

testImport();