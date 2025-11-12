const axios = require('axios');

async function checkImportErrors() {
    try {
        // Login
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login riuscito\n');
        
        // Verifica import ID: 5e024a2a-a8f6-4b02-8642-d6a2fbf18721
        const importId = '5e024a2a-a8f6-4b02-8642-d6a2fbf18721';
        
        console.log(`🔍 Analisi dettagliata import: ${importId}\n`);
        
        const resultResponse = await axios.get(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = resultResponse.data.data;
        
        console.log('📊 === RIEPILOGO IMPORT ===');
        console.log(`Righe totali: ${result.totalRows}`);
        console.log(`Righe elaborate: ${result.processedRows}`);
        console.log(`Righe inserite: ${result.insertedRows}`);
        console.log(`Righe saltate: ${result.skippedRows}`);
        console.log(`Righe con errori: ${result.errorRows}\n`);
        
        console.log('🔍 === RILEVAMENTO TIPO ===');
        console.log(`Tipo rilevato: ${result.detectionResult.type}`);
        console.log(`Confidenza: ${result.detectionResult.confidence}%`);
        console.log(`Campi rilevati: ${result.detectionResult.detectedFields.join(', ')}`);
        console.log(`Campi mancanti: ${result.detectionResult.missingRequiredFields.join(', ')}\n`);
        
        console.log('❌ === ERRORI DETTAGLIATI ===');
        if (result.errorReport.errors && result.errorReport.errors.length > 0) {
            result.errorReport.errors.forEach((error, index) => {
                console.log(`${index + 1}. Riga ${error.row || 'N/A'}:`);
                console.log(`   Messaggio: ${error.message || 'Nessun messaggio'}`);
                console.log(`   Tipo: ${error.type || 'N/A'}`);
                console.log(`   Campo: ${error.field || 'N/A'}`);
                console.log(`   Valore: ${error.value || 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('Nessun errore dettagliato disponibile\n');
        }
        
        console.log('📋 === RECORD INSERITI ===');
        if (result.insertedRecords) {
            Object.keys(result.insertedRecords).forEach(recordType => {
                const records = result.insertedRecords[recordType];
                console.log(`${recordType}: ${records.length} record`);
                records.forEach((record, index) => {
                    if (recordType === 'cliente_privato') {
                        console.log(`   ${index + 1}. ${record.nome} ${record.cognome} (${record.email_principale})`);
                    } else if (recordType === 'cliente_azienda') {
                        console.log(`   ${index + 1}. ${record.ragione_sociale} (${record.partita_iva})`);
                    } else if (recordType === 'contratto_luce') {
                        console.log(`   ${index + 1}. ${record.numero_contratto} - POD: ${record.pod}`);
                    } else if (recordType === 'contratto_gas') {
                        console.log(`   ${index + 1}. ${record.numero_contratto} - PDR: ${record.pdr}`);
                    } else if (recordType === 'offerta') {
                        console.log(`   ${index + 1}. ${record.nome_offerta} (${record.fornitore})`);
                    } else {
                        console.log(`   ${index + 1}. Record inserito`);
                    }
                });
            });
        }
        
        console.log('\n🔍 === SUGGERIMENTI ===');
        if (result.detectionResult.suggestions && result.detectionResult.suggestions.length > 0) {
            result.detectionResult.suggestions.forEach((suggestion, index) => {
                console.log(`${index + 1}. ${suggestion}`);
            });
        } else {
            console.log('Nessun suggerimento disponibile');
        }
        
        // Verifica database
        console.log('\n📊 === VERIFICA DATABASE ===');
        
        // Clienti
        const clientiResponse = await axios.get('http://localhost:3001/api/clienti?limit=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`👥 Clienti totali nel database: ${clientiResponse.data.data?.length || 0}`);
        
        // Contratti luce
        const contrattiLuceResponse = await axios.get('http://localhost:3001/api/contratti/luce?limit=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`⚡ Contratti luce nel database: ${contrattiLuceResponse.data.data?.length || 0}`);
        
        // Contratti gas
        const contrattiGasResponse = await axios.get('http://localhost:3001/api/contratti/gas?limit=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`🔥 Contratti gas nel database: ${contrattiGasResponse.data.data?.length || 0}`);
        
    } catch (error) {
        console.error('❌ Errore:', error.response?.data || error.message);
    }
}

checkImportErrors();