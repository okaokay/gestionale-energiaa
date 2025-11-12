const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testContractsErrorFix() {
    console.log('🧪 TEST CORREZIONE ERRORI CONTRATTI');
    console.log('===================================\n');

    try {
        // 1. Login
        console.log('🔐 Login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login riuscito\n');

        // 2. Cerca specificamente il file con i contratti
        const uploadsDir = path.join(__dirname, 'uploads', 'csv-import');
        const files = fs.readdirSync(uploadsDir)
            .filter(file => file.includes('super_import') || file.includes('completi'))
            .map(file => ({
                name: file,
                path: path.join(uploadsDir, file),
                mtime: fs.statSync(path.join(uploadsDir, file)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);

        if (files.length === 0) {
            console.log('❌ Nessun file con contratti trovato');
            return;
        }

        const csvFile = files[0];
        console.log(`📁 File CSV: ${csvFile.name}`);
        console.log(`📅 Data modifica: ${csvFile.mtime.toLocaleString()}\n`);

        // 3. Upload file
        console.log('📤 Caricamento file per import...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvFile.path));

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

        // 4. Attendi elaborazione
        console.log('⏳ Attendo elaborazione (10 secondi)...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // 5. Ottieni risultati
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

        // 6. Analizza errori se presenti
        if (result.errorRows > 0 && result.errorReport && result.errorReport.errors) {
            console.log('\n🔍 ANALISI ERRORI CONTRATTI:');
            
            // Filtra errori per contratti
            const contractErrors = result.errorReport.errors.filter(error => 
                error.recordType === 'contratto_luce' || error.recordType === 'contratto_gas'
            );
            
            console.log(`📊 Errori contratti: ${contractErrors.length}`);
            
            if (contractErrors.length > 0) {
                console.log('\n--- Primi 5 errori contratti ---');
                contractErrors.slice(0, 5).forEach((error, index) => {
                    console.log(`\n${index + 1}. Errore contratto:`);
                    console.log(`   ID: ${error.id}`);
                    console.log(`   Riga: ${error.rowNumber}`);
                    console.log(`   Tipo: ${error.recordType}`);
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

                // Statistiche per tipo di contratto
                const luceErrors = contractErrors.filter(e => e.recordType === 'contratto_luce').length;
                const gasErrors = contractErrors.filter(e => e.recordType === 'contratto_gas').length;
                
                console.log(`\n📈 STATISTICHE CONTRATTI:`);
                console.log(`   ⚡ Errori contratti luce: ${luceErrors}`);
                console.log(`   🔥 Errori contratti gas: ${gasErrors}`);
                
                // Analizza i codici di errore
                const contractErrorCodes = {};
                contractErrors.forEach(error => {
                    contractErrorCodes[error.code] = (contractErrorCodes[error.code] || 0) + 1;
                });
                console.log(`   📋 Codici errore: ${JSON.stringify(contractErrorCodes, null, 2)}`);
            }

            // Analizza anche errori clienti
            const clientErrors = result.errorReport.errors.filter(error => 
                error.recordType === 'cliente_azienda' || error.recordType === 'cliente_privato'
            );
            
            if (clientErrors.length > 0) {
                console.log(`\n👥 Errori clienti: ${clientErrors.length}`);
                console.log('   Primo errore cliente:', clientErrors[0].message);
            }

        } else {
            console.log('\n✅ Nessun errore rilevato!');
        }

    } catch (error) {
        console.error('❌ Errore durante il test:', error.response?.data || error.message);
    }
}

testContractsErrorFix().catch(console.error);