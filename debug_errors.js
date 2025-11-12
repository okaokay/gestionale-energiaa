const axios = require('axios');

async function debugErrors() {
    try {
        console.log('🔍 DEBUG ERRORI IMPORTAZIONE\n');
        
        // Login
        console.log('🔐 Login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        if (!loginResponse.data.success) {
            console.error('❌ Login fallito');
            return;
        }

        const token = loginResponse.data.data.token;
        console.log('✅ Login OK\n');

        // Recupera risultato dell'ultima importazione
        const importId = 'cc64b8e9-7430-41de-9b23-f18fe39c53f1';
        console.log(`📋 Recupero dettagli import: ${importId}`);
        
        const resultResponse = await axios.get(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!resultResponse.data.success) {
            console.error('❌ Errore recupero risultati:', resultResponse.data.message);
            return;
        }

        const result = resultResponse.data.data;
        console.log('\n📊 RISULTATO IMPORT:');
        console.log(`   Stage: ${result.stage}`);
        console.log(`   Progress: ${result.progress}%`);
        console.log(`   Message: ${result.message}`);
        console.log(`   Errori: ${result.errors}`);
        console.log(`   Warning: ${result.warnings}`);
        console.log(`   Record inseriti: ${result.recordsInserted || 0}`);

        // Mostra errori dettagliati
        if (result.errorDetails && result.errorDetails.length > 0) {
            console.log('\n🚨 ERRORI DETTAGLIATI:');
            result.errorDetails.forEach((error, index) => {
                console.log(`\n   Errore ${index + 1}:`);
                console.log(`   - Riga: ${error.row || 'N/A'}`);
                console.log(`   - Tipo: ${error.type || 'N/A'}`);
                console.log(`   - Messaggio: ${error.message || 'N/A'}`);
                if (error.data) {
                    console.log(`   - Dati: ${JSON.stringify(error.data, null, 6)}`);
                }
            });
        } else {
            console.log('\n⚠️ Nessun dettaglio errore disponibile');
        }

        // Mostra report completo se disponibile
        if (result.report) {
            console.log('\n📋 REPORT COMPLETO:');
            console.log(JSON.stringify(result.report, null, 2));
        }

    } catch (error) {
        console.error('❌ Errore:', error.response?.data || error.message);
        if (error.response?.status === 404) {
            console.log('💡 Suggerimento: L\'import potrebbe essere scaduto o non esistere');
        }
    }
}

debugErrors();