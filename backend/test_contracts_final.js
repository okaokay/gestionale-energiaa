const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testContractsFinal() {
    console.log('🧪 TEST FINALE CORREZIONE ERRORI CONTRATTI');
    console.log('==========================================\n');

    try {
        // 1. Login
        console.log('🔐 Login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login riuscito\n');

        // 2. Upload del file di test
        const csvFile = path.join(__dirname, 'test_contratti_fix.csv');
        console.log(`📁 File CSV: test_contratti_fix.csv`);

        console.log('📤 Caricamento file per import...');
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
        console.log('⏳ Attendo elaborazione (8 secondi)...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        // 4. Ottieni risultati
        console.log('📊 Recupero risultati...');
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

        // 5. Analizza errori se presenti
        if (result.errorRows > 0 && result.errorReport && result.errorReport.errors) {
            console.log('\n🔍 ANALISI ERRORI:');
            
            // Filtra errori per tipo
            const clientErrors = result.errorReport.errors.filter(e => 
                e.recordType === 'cliente_privato' || e.recordType === 'cliente_azienda'
            );
            const contractErrors = result.errorReport.errors.filter(e => 
                e.recordType === 'contratto_luce' || e.recordType === 'contratto_gas'
            );
            
            console.log(`👥 Errori clienti: ${clientErrors.length}`);
            console.log(`📄 Errori contratti: ${contractErrors.length}`);
            
            if (contractErrors.length > 0) {
                console.log('\n--- ERRORI CONTRATTI (primi 3) ---');
                contractErrors.slice(0, 3).forEach((error, index) => {
                    console.log(`\n${index + 1}. Contratto ${error.recordType}:`);
                    console.log(`   Riga: ${error.rowNumber}`);
                    console.log(`   Codice: ${error.code}`);
                    console.log(`   Messaggio: ${error.message}`);
                    console.log(`   Tipo messaggio: ${typeof error.message}`);
                    
                    // Verifica se il messaggio è ancora [object Object]
                    if (error.message && error.message.includes('[object Object]')) {
                        console.log('   ❌ PROBLEMA: Messaggio ancora serializzato male!');
                    } else {
                        console.log('   ✅ Messaggio serializzato correttamente');
                    }
                });

                // Statistiche contratti
                const luceErrors = contractErrors.filter(e => e.recordType === 'contratto_luce').length;
                const gasErrors = contractErrors.filter(e => e.recordType === 'contratto_gas').length;
                
                console.log(`\n📈 STATISTICHE CONTRATTI:`);
                console.log(`   ⚡ Errori contratti luce: ${luceErrors}`);
                console.log(`   🔥 Errori contratti gas: ${gasErrors}`);
            }

            if (clientErrors.length > 0) {
                console.log('\n--- ERRORI CLIENTI (primo) ---');
                const error = clientErrors[0];
                console.log(`Riga: ${error.rowNumber}`);
                console.log(`Codice: ${error.code}`);
                console.log(`Messaggio: ${error.message}`);
                
                if (error.message && error.message.includes('[object Object]')) {
                    console.log('❌ PROBLEMA: Messaggio cliente serializzato male!');
                } else {
                    console.log('✅ Messaggio cliente serializzato correttamente');
                }
            }

        } else {
            console.log('\n✅ Nessun errore rilevato!');
        }

        console.log('\n🎉 TEST COMPLETATO!');

    } catch (error) {
        console.error('❌ Errore durante il test:', error.response?.data || error.message);
    }
}

testContractsFinal().catch(console.error);