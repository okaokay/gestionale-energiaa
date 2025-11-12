const axios = require('axios');

async function checkImportResult() {
    try {
        console.log('🔍 Verifica risultato importazione...\n');
        
        // 1. Login per ottenere il token
        console.log('🔐 Effettuo login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login effettuato con successo\n');
        
        // 2. Verifica il risultato dell'ultimo import
        const importId = 'ba0784d4-fbee-4ee7-adb6-c6bbde2ba9b2'; // ID dall'ultimo test
        
        console.log(`📊 Controllo risultato import ID: ${importId}`);
        
        const resultResponse = await axios.get(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = resultResponse.data;
        
        console.log('\n📊 RISULTATO IMPORTAZIONE:');
        console.log('Status:', resultResponse.status);
        console.log('Response:', JSON.stringify(result, null, 2));
        
        if (result.success && result.data) {
            const data = result.data;
            console.log('\n✅ DETTAGLI IMPORTAZIONE:');
            console.log(`📈 Righe totali: ${data.totalRows || 'N/A'}`);
            console.log(`✅ Inserimenti: ${data.successfulImports || 0}`);
            console.log(`❌ Errori: ${data.failedImports || 0}`);
            console.log(`⚠️  Incompleti: ${data.incompleteImports || 0}`);
            
            if (data.contractsCreated) {
                console.log(`🔌 Contratti luce creati: ${data.contractsCreated.luce || 0}`);
                console.log(`⛽ Contratti gas creati: ${data.contractsCreated.gas || 0}`);
            }
            
            if (data.errors && data.errors.length > 0) {
                console.log('\n❌ DETTAGLI ERRORI:');
                data.errors.forEach((error, index) => {
                    console.log(`Riga ${error.row || index + 1}: ${error.message || error}`);
                });
            }
            
            if (data.warnings && data.warnings.length > 0) {
                console.log('\n⚠️  AVVISI:');
                data.warnings.forEach((warning, index) => {
                    console.log(`Riga ${warning.row || index + 1}: ${warning.message || warning}`);
                });
            }
        } else {
            console.log('\n❌ ERRORE O IMPORT NON COMPLETATO:');
            console.log(result.message || 'Risultato non disponibile');
        }
        
    } catch (error) {
        console.error('❌ Errore durante la verifica:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

checkImportResult();