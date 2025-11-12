const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testErrorFix() {
    console.log('🧪 TEST CORREZIONE SERIALIZZAZIONE ERRORI');
    console.log('=========================================\n');

    try {
        // 1. Login
        console.log('🔐 Login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login riuscito\n');

        // 2. Trova il file CSV più recente
        const uploadsDir = path.join(__dirname, 'uploads', 'csv-import');
        const files = fs.readdirSync(uploadsDir)
            .filter(file => file.endsWith('.csv'))
            .map(file => ({
                name: file,
                path: path.join(uploadsDir, file),
                mtime: fs.statSync(path.join(uploadsDir, file)).mtime
            }))
            .sort((a, b) => b.mtime - a.mtime);

        if (files.length === 0) {
            console.log('❌ Nessun file CSV trovato');
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
        console.log('⏳ Attendo elaborazione (8 secondi)...');
        await new Promise(resolve => setTimeout(resolve, 8000));

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
            console.log('\n🔍 ANALISI ERRORI (primi 3):');
            result.errorReport.errors.slice(0, 3).forEach((error, index) => {
                console.log(`\n--- Errore ${index + 1} ---`);
                console.log(`ID: ${error.id}`);
                console.log(`Riga: ${error.rowNumber}`);
                console.log(`Tipo record: ${error.recordType}`);
                console.log(`Codice: ${error.code}`);
                console.log(`Messaggio: ${error.message}`);
                console.log(`Tipo messaggio: ${typeof error.message}`);
                
                // Verifica se il messaggio è ancora [object Object]
                if (error.message && error.message.includes('[object Object]')) {
                    console.log('❌ PROBLEMA: Messaggio ancora serializzato male!');
                } else {
                    console.log('✅ Messaggio serializzato correttamente');
                }
            });

            console.log(`\n📈 STATISTICHE ERRORI:`);
            console.log(`Totale errori: ${result.errorReport.errors.length}`);
            
            const errorTypes = {};
            const errorCodes = {};
            result.errorReport.errors.forEach(error => {
                errorTypes[error.errorType] = (errorTypes[error.errorType] || 0) + 1;
                errorCodes[error.code] = (errorCodes[error.code] || 0) + 1;
            });
            
            console.log('Tipi di errore:', errorTypes);
            console.log('Codici errore:', errorCodes);
        } else {
            console.log('\n✅ Nessun errore rilevato!');
        }

    } catch (error) {
        console.error('❌ Errore durante il test:', error.response?.data || error.message);
    }
}

testErrorFix().catch(console.error);