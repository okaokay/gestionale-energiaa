const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function testFlowCompleto() {
    console.log('🚀 TEST FLUSSO COMPLETO END-TO-END');
    console.log('==================================\n');

    try {
        // 1. Login
        console.log('🔐 STEP 1: Login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login riuscito\n');

        // 2. Upload del file CSV
        const csvFile = path.join(__dirname, 'test_completo_flow.csv');
        console.log('📤 STEP 2: Upload CSV...');
        console.log(`   File: test_completo_flow.csv`);

        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvFile));

        const uploadResponse = await axios.post('http://localhost:3001/api/unified-import/upload', formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            },
            params: {
                autoDetectType: true,
                skipValidation: false,
                dryRun: false
            }
        });

        const importId = uploadResponse.data.data.importId;
        console.log(`✅ Upload completato. Import ID: ${importId}\n`);

        // 3. Attendi elaborazione
        console.log('⏳ STEP 3: Attendo elaborazione (10 secondi)...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // 4. Ottieni risultati import
        console.log('📊 STEP 4: Recupero risultati import...');
        const resultResponse = await axios.get(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const result = resultResponse.data.data;
        
        console.log('\n📋 RISULTATI IMPORT:');
        console.log(`   🆔 Import ID: ${importId}`);
        console.log(`   ✅ Successo: ${result.success}`);
        console.log(`   📊 Righe totali: ${result.totalRows}`);
        console.log(`   📝 Righe processate: ${result.processedRows}`);
        console.log(`   ✅ Righe inserite: ${result.insertedRows}`);
        console.log(`   ❌ Righe con errori: ${result.errorRows}`);

        if (result.errorRows > 0) {
            console.log('\n⚠️ ERRORI RILEVATI:');
            if (result.errorReport && result.errorReport.errors) {
                result.errorReport.errors.slice(0, 3).forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error.message} (Riga: ${error.rowNumber})`);
                });
            }
        }

        // 5. Verifica database
        console.log('\n🔍 STEP 5: Verifica database...');
        const dbPath = path.join(__dirname, 'gestionale_energia.db');
        const db = new sqlite3.Database(dbPath);

        await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM clienti', [], (err, row) => {
                if (err) {
                    console.error('❌ Errore verifica clienti:', err.message);
                    reject(err);
                    return;
                }
                console.log(`   👥 Clienti nel DB: ${row.count}`);
                
                db.get('SELECT COUNT(*) as count FROM contratti_luce', [], (err, row) => {
                    if (err) {
                        console.error('❌ Errore verifica contratti luce:', err.message);
                        reject(err);
                        return;
                    }
                    console.log(`   ⚡ Contratti luce nel DB: ${row.count}`);
                    
                    db.get('SELECT COUNT(*) as count FROM contratti_gas', [], (err, row) => {
                        if (err) {
                            console.error('❌ Errore verifica contratti gas:', err.message);
                            reject(err);
                            return;
                        }
                        console.log(`   🔥 Contratti gas nel DB: ${row.count}`);
                        
                        db.close();
                        resolve();
                    });
                });
            });
        });

        // 6. Test API clienti
        console.log('\n🌐 STEP 6: Test API clienti...');
        const clientiResponse = await axios.get('http://localhost:3001/api/clienti', {
            headers: { Authorization: `Bearer ${token}` }
        });

        const clienti = clientiResponse.data.data || clientiResponse.data;
        console.log(`   📋 Clienti recuperati via API: ${clienti.length}`);

        if (clienti.length > 0) {
            console.log('\n👥 PRIMI 2 CLIENTI:');
            clienti.slice(0, 2).forEach((cliente, index) => {
                console.log(`   ${index + 1}. ${cliente.nome || cliente.ragione_sociale} (${cliente.codice_cliente})`);
                console.log(`      Email: ${cliente.email}`);
                console.log(`      Tipo: ${cliente.tipo_cliente}`);
            });
        }

        // 7. Test API contratti per primo cliente
        if (clienti.length > 0) {
            console.log('\n📄 STEP 7: Test contratti primo cliente...');
            const primoCliente = clienti[0];
            
            try {
                const contrattiResponse = await axios.get(`http://localhost:3001/api/contratti/cliente/${primoCliente.codice_cliente}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const contratti = contrattiResponse.data.data || contrattiResponse.data;
                console.log(`   📋 Contratti per ${primoCliente.codice_cliente}: ${contratti.length}`);
                
                if (contratti.length > 0) {
                    contratti.forEach((contratto, index) => {
                        console.log(`      ${index + 1}. ${contratto.tipo_contratto || 'N/A'} - ${contratto.numero_contratto}`);
                        console.log(`         Fornitore: ${contratto.fornitore}`);
                    });
                }
            } catch (error) {
                console.log(`   ⚠️ Errore recupero contratti: ${error.response?.status || error.message}`);
            }
        }

        console.log('\n🎉 TEST FLUSSO COMPLETO TERMINATO!');
        console.log('\n📊 RIEPILOGO:');
        console.log(`   ✅ Import eseguito: ${result.success ? 'SI' : 'NO'}`);
        console.log(`   👥 Clienti importati: ${result.insertedRows || 0}`);
        console.log(`   🌐 API clienti funzionante: ${clienti.length > 0 ? 'SI' : 'NO'}`);

    } catch (error) {
        console.error('❌ Errore durante il test:', error.response?.data || error.message);
    }
}

testFlowCompleto().catch(console.error);