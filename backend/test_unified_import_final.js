const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

async function testUnifiedImport() {
    console.log('🚀 Test Import Unificato - Versione Finale');
    console.log('==========================================\n');

    try {
        // 1. Login per ottenere il token
        console.log('🔐 1. Effettuo login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        if (!loginResponse.data.success) {
            throw new Error('Login fallito');
        }

        const token = loginResponse.data.data.token;
        console.log('✅ Login effettuato con successo');

        // 2. Verifica tipi supportati
        console.log('\n🔧 2. Verifico tipi di record supportati...');
        const typesResponse = await axios.get(`${BASE_URL}/api/unified-import/supported-types`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Tipi supportati:', typesResponse.data.data.types);

        // 3. Prepara il file CSV
        const csvPath = path.join(__dirname, '..', 'template_import_perfetto.csv');
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File CSV non trovato: ${csvPath}`);
        }

        console.log('\n📁 3. Preparo il file CSV...');
        console.log(`File: ${csvPath}`);
        
        // Leggi e mostra le prime righe del CSV
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').slice(0, 3);
        console.log('Prime righe del CSV:');
        lines.forEach((line, index) => {
            console.log(`${index}: ${line}`);
        });

        // 4. Esegui l'import
        console.log('\n🚀 4. Avvio import unificato...');
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));
        // Invia le opzioni nel campo "options" come JSON, come fa il frontend
        formData.append('options', JSON.stringify({
            dryRun: true,            // eseguiamo un dry run per il test
            autoDetectType: true,
            skipValidation: false,
            skipAssociation: false,
            batchSize: 100
        }));

        const importResponse = await axios.post(`${BASE_URL}/api/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`
            },
            timeout: 60000 // 60 secondi di timeout
        });

        if (!importResponse.data.success) {
            throw new Error(`Import fallito: ${importResponse.data.message}`);
        }

        const importId = importResponse.data.data.importId;
        console.log(`✅ Import avviato con ID: ${importId}`);

        // 5. Monitora il progresso
        console.log('\n📊 5. Monitoraggio progresso...');
        let completed = false;
        let attempts = 0;
        const maxAttempts = 30; // 30 tentativi = 30 secondi

        while (!completed && attempts < maxAttempts) {
            attempts++;
            
            try {
                const progressResponse = await axios.get(`${BASE_URL}/api/unified-import/progress/${importId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (progressResponse.data.success) {
                    const progress = progressResponse.data.data;
                    console.log(`📈 Progresso: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
                    
                    if (progress.stage === 'completed' || progress.stage === 'failed') {
                        completed = true;
                    }
                }
            } catch (progressError) {
                console.log(`⚠️ Errore nel monitoraggio progresso (tentativo ${attempts}):`, progressError.message);
            }

            if (!completed) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Aspetta 1 secondo
            }
        }

        // 6. Ottieni il risultato finale
        console.log('\n📋 6. Recupero risultato finale...');
        const resultResponse = await axios.get(`${BASE_URL}/api/unified-import/result/${importId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (resultResponse.data.success) {
            const result = resultResponse.data.data;
            console.log('\n🎉 RISULTATO IMPORT:');
            console.log('===================');
            console.log(`✅ Successo: ${result.success}`);
            console.log(`📁 File: ${result.fileName}`);
            console.log(`📊 Righe totali: ${result.totalRows}`);
            console.log(`✅ Righe processate: ${result.processedRows}`);
            console.log(`➕ Righe inserite: ${result.insertedRows}`);
            console.log(`🔄 Righe aggiornate: ${result.updatedRows}`);
            console.log(`⏭️ Righe saltate: ${result.skippedRows}`);
            console.log(`❌ Righe con errori: ${result.errorRows}`);
            console.log(`⏱️ Durata: ${result.duration} secondi`);

            if (result.detectionResult) {
                console.log('\n🔍 RILEVAMENTO TIPI:');
                console.log(`Tipo rilevato: ${result.detectionResult.type}`);
                console.log(`Confidenza: ${result.detectionResult.confidence}%`);
                console.log(`Campi rilevati: ${result.detectionResult.detectedFields?.length || 0}`);
            }

            if (result.insertedRecords) {
                console.log('\n📝 RECORD INSERITI PER TIPO:');
                Object.entries(result.insertedRecords).forEach(([type, records]) => {
                    console.log(`${type}: ${records.length} record`);
                });
            }

            if (result.errorReport && result.errorReport.length > 0) {
                console.log('\n❌ ERRORI:');
                result.errorReport.slice(0, 5).forEach((error, index) => {
                    console.log(`${index + 1}. ${error.message} (Riga: ${error.rowNumber})`);
                });
                if (result.errorReport.length > 5) {
                    console.log(`... e altri ${result.errorReport.length - 5} errori`);
                }
            }

        } else {
            console.log('❌ Errore nel recupero del risultato:', resultResponse.data.message);
        }

        console.log('\n✅ Test completato con successo!');

    } catch (error) {
        console.error('\n❌ Errore durante il test:', error.message);
        if (error.response?.data) {
            console.error('Dettagli errore:', error.response.data);
        }
    }
}

// Esegui il test
testUnifiedImport().catch(console.error);