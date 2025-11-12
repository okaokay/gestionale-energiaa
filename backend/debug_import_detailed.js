const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

console.log('🔍 DEBUG IMPORTAZIONE DETTAGLIATO');
console.log('=================================');

async function debugImport() {
    try {
        // 1. Login
        console.log('\n🔐 STEP 1: LOGIN');
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@gestionale.it',
                password: 'Admin123!'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('Login response:', JSON.stringify(loginData, null, 2));
        
        if (!loginData.success) {
            console.log('❌ Login fallito');
            return;
        }
        
        const token = loginData.data.token;
        console.log('✅ Token ottenuto');
        
        // 2. Analisi file CSV
        console.log('\n📁 STEP 2: ANALISI FILE CSV');
        const csvContent = fs.readFileSync('./test_contratti_corretto.csv', 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        console.log(`📊 File CSV: ${lines.length} righe totali`);
        console.log('Header:', lines[0]);
        
        lines.slice(1).forEach((line, index) => {
            const fields = line.split(',');
            console.log(`Riga ${index + 2}: tipo_record="${fields[0]}", nome="${fields[5]}", cognome="${fields[6]}", ragione_sociale="${fields[8]}"`);
        });
        
        // 3. Upload con debug
        console.log('\n📤 STEP 3: UPLOAD CON DEBUG');
        const fileBuffer = fs.readFileSync('./test_contratti_corretto.csv');
        
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: 'test_contratti_corretto.csv',
            contentType: 'text/csv'
        });
        formData.append('entityType', 'contratti');
        formData.append('autoDetectType', 'true');
        formData.append('skipValidation', 'false');
        formData.append('dryRun', 'false');
        
        console.log('📋 Parametri upload:');
        console.log('- entityType: contratti');
        console.log('- autoDetectType: true');
        console.log('- skipValidation: false');
        console.log('- dryRun: false');
        
        const uploadResponse = await fetch('http://localhost:3001/api/unified-import/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        const uploadData = await uploadResponse.json();
        console.log('Upload response:', JSON.stringify(uploadData, null, 2));
        
        if (!uploadData.success) {
            console.log('❌ Upload fallito');
            return;
        }
        
        const importId = uploadData.data.importId;
        console.log(`✅ ImportId: ${importId}`);
        
        // 4. Monitoraggio dettagliato
        console.log('\n⏳ STEP 4: MONITORAGGIO DETTAGLIATO');
        
        for (let i = 1; i <= 10; i++) {
            console.log(`\n🔍 Controllo ${i}/10:`);
            
            // Progress
            const progressResponse = await fetch(`http://localhost:3001/api/unified-import/progress/${importId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const progressData = await progressResponse.json();
            console.log('Progress response:', JSON.stringify(progressData, null, 2));
            
            if (progressData.success && progressData.data.progress >= 100) {
                console.log('✅ Importazione completata');
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // 5. Risultato dettagliato
        console.log('\n📊 STEP 5: RISULTATO DETTAGLIATO');
        
        const resultResponse = await fetch(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const resultData = await resultResponse.json();
        console.log('Result response completo:', JSON.stringify(resultData, null, 2));
        
        if (resultData.success) {
            const result = resultData.data;
            console.log('\n🎯 RIEPILOGO FINALE:');
            console.log(`📁 File: ${result.fileName}`);
            console.log(`📊 Righe totali: ${result.totalRows}`);
            console.log(`🔄 Processate: ${result.processedRows}`);
            console.log(`✅ Inserite: ${result.insertedRows}`);
            console.log(`🔄 Aggiornate: ${result.updatedRows}`);
            console.log(`⏭️ Saltate: ${result.skippedRows}`);
            console.log(`❌ Errori: ${result.errorRows}`);
            
            // Mostra errori se presenti
            if (result.errorReport && result.errorReport.errors && result.errorReport.errors.length > 0) {
                console.log('\n❌ ERRORI DETTAGLIATI:');
                result.errorReport.errors.slice(0, 10).forEach((error, index) => {
                    console.log(`${index + 1}. Riga ${error.rowNumber}: ${error.message} (${error.code})`);
                });
            }
            
            // Mostra record inseriti per tipo
            if (result.insertedRecords) {
                console.log('\n📋 RECORD INSERITI PER TIPO:');
                Object.entries(result.insertedRecords).forEach(([type, records]) => {
                    console.log(`${type}: ${records.length} record`);
                    if (records.length > 0) {
                        console.log(`  Esempio: ${JSON.stringify(records[0], null, 2)}`);
                    }
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Errore debug:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugImport();