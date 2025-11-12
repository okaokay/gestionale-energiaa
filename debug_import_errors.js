const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const IMPORT_ID = '22943c37-be9c-448b-bea5-bbf008d164ea'; // ID dall'ultimo import

async function debugImportErrors() {
    try {
        console.log('🔍 DEBUG ERRORI IMPORTAZIONE CSV\n');

        // 1. Login
        console.log('🔐 Login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        if (!loginResponse.data.success) {
            throw new Error('Login fallito');
        }

        const token = loginResponse.data.data.token;
        console.log('✅ Login OK\n');

        // 2. Recupera il risultato dettagliato dell'import
        console.log(`📋 Recupero risultato import ID: ${IMPORT_ID}...`);
        try {
            const resultResponse = await axios.get(`${BASE_URL}/api/unified-import/result/${IMPORT_ID}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('✅ Risultato recuperato:');
            console.log(JSON.stringify(resultResponse.data, null, 2));

            if (resultResponse.data.data && resultResponse.data.data.errorReport) {
                const errorReport = resultResponse.data.data.errorReport;
                console.log('\n🚨 DETTAGLI ERRORI:');
                console.log(`- Totale errori: ${errorReport.totalErrors}`);
                console.log(`- Righe con errori: ${errorReport.errorRows}`);
                console.log(`- Righe totali: ${errorReport.totalRows}`);
                
                if (errorReport.errors && errorReport.errors.length > 0) {
                    console.log('\n📝 PRIMI 10 ERRORI:');
                    errorReport.errors.slice(0, 10).forEach((error, index) => {
                        console.log(`${index + 1}. Riga ${error.row}: ${error.message}`);
                        if (error.details) {
                            console.log(`   Dettagli: ${JSON.stringify(error.details)}`);
                        }
                    });
                }
            }

        } catch (resultError) {
            console.error('❌ Errore nel recupero risultato:', resultError.response?.data || resultError.message);
        }

        // 3. Verifica il contenuto del file CSV
        console.log('\n📄 Verifica contenuto file CSV...');
        const fs = require('fs');
        const csvPath = './import_10_clienti_completi_super_import.csv';
        
        if (fs.existsSync(csvPath)) {
            const csvContent = fs.readFileSync(csvPath, 'utf8');
            const lines = csvContent.split('\n').filter(line => line.trim());
            
            console.log(`📊 File CSV trovato: ${lines.length} righe totali`);
            console.log('🔤 Header:', lines[0]);
            console.log('📝 Prima riga dati:', lines[1] || 'Nessuna riga dati');
            console.log('📝 Seconda riga dati:', lines[2] || 'Solo una riga dati');
            
            // Mostra tutte le righe per debug
            console.log('\n📋 TUTTE LE RIGHE DEL CSV:');
            lines.forEach((line, index) => {
                console.log(`${index}: ${line}`);
            });
        } else {
            console.log('❌ File CSV non trovato');
        }

        // 4. Verifica i tipi di record supportati
        console.log('\n🔧 Verifica tipi di record supportati...');
        try {
            const typesResponse = await axios.get(`${BASE_URL}/api/unified-import/supported-types`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('✅ Tipi supportati:', typesResponse.data.data.types);
        } catch (typesError) {
            console.error('❌ Errore nel recupero tipi supportati:', typesError.response?.data || typesError.message);
        }

    } catch (error) {
        console.error('❌ Errore generale:', error.message);
    }
}

debugImportErrors();