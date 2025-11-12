const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const CSV_FILE_PATH = path.join(__dirname, 'test_import_completo.csv');

// Test configuration
const TEST_CONFIG = {
    expectedClients: 4, // 2 private + 2 companies
    expectedContracts: 8, // 4 light + 4 gas contracts
    testEmail: 'mario.rossi@email.com' // One of our test clients
};

async function loginAndGetToken() {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        return response.data.data.token;
    } catch (error) {
        console.error('❌ Errore durante il login:', error.message);
        throw error;
    }
}

async function getInitialCounts(token) {
    try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const [clientsResponse, lightContractsResponse, gasContractsResponse] = await Promise.all([
            axios.get(`${BASE_URL}/api/clienti?limit=1000`, { headers }),
            axios.get(`${BASE_URL}/api/contratti/luce?limit=1000`, { headers }),
            axios.get(`${BASE_URL}/api/contratti/gas?limit=1000`, { headers })
        ]);

        return {
            clients: clientsResponse.data.clienti?.length || 0,
            lightContracts: lightContractsResponse.data.contratti?.length || 0,
            gasContracts: gasContractsResponse.data.contratti?.length || 0
        };
    } catch (error) {
        console.error('❌ Errore nel recupero dei conteggi iniziali:', error.message);
        throw error;
    }
}

async function uploadCSVFile(token) {
    try {
        if (!fs.existsSync(CSV_FILE_PATH)) {
            throw new Error(`File CSV non trovato: ${CSV_FILE_PATH}`);
        }

        const form = new FormData();
        form.append('file', fs.createReadStream(CSV_FILE_PATH));

        const response = await axios.post(`${BASE_URL}/api/unified-import/upload`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('❌ Errore durante l\'upload del CSV:', error.response?.data || error.message);
        throw error;
    }
}

async function getFinalCounts(token) {
    try {
        const headers = { Authorization: `Bearer ${token}` };
        
        const [clientsResponse, lightContractsResponse, gasContractsResponse] = await Promise.all([
            axios.get(`${BASE_URL}/api/clienti?limit=1000`, { headers }),
            axios.get(`${BASE_URL}/api/contratti/luce?limit=1000`, { headers }),
            axios.get(`${BASE_URL}/api/contratti/gas?limit=1000`, { headers })
        ]);

        return {
            clients: clientsResponse.data.clienti?.length || 0,
            lightContracts: lightContractsResponse.data.contratti?.length || 0,
            gasContracts: gasContractsResponse.data.contratti?.length || 0,
            clientsData: clientsResponse.data.clienti || [],
            lightContractsData: lightContractsResponse.data.contratti || [],
            gasContractsData: gasContractsResponse.data.contratti || []
        };
    } catch (error) {
        console.error('❌ Errore nel recupero dei conteggi finali:', error.message);
        throw error;
    }
}

async function verifySpecificClient(token, email) {
    try {
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`${BASE_URL}/api/clienti?search=${email}`, { headers });
        
        const clients = response.data.clienti || [];
        const client = clients.find(c => c.email_principale === email);
        
        if (!client) {
            return { found: false };
        }

        // Get contracts for this client
        const [lightResponse, gasResponse] = await Promise.all([
            axios.get(`${BASE_URL}/api/contratti/luce?cliente_id=${client.id}`, { headers }),
            axios.get(`${BASE_URL}/api/contratti/gas?cliente_id=${client.id}`, { headers })
        ]);

        return {
            found: true,
            client: client,
            lightContracts: lightResponse.data.contratti || [],
            gasContracts: gasResponse.data.contratti || []
        };
    } catch (error) {
        console.error(`❌ Errore nella verifica del cliente ${email}:`, error.message);
        return { found: false, error: error.message };
    }
}

async function runCompleteTest() {
    console.log('🚀 Avvio test completo import CSV...\n');

    try {
        // Step 1: Login
        console.log('1️⃣ Effettuo login...');
        const token = await loginAndGetToken();
        console.log('✅ Login effettuato con successo\n');

        // Step 2: Get initial counts
        console.log('2️⃣ Recupero conteggi iniziali...');
        const initialCounts = await getInitialCounts(token);
        console.log(`📊 Conteggi iniziali:
   - Clienti: ${initialCounts.clients}
   - Contratti Luce: ${initialCounts.lightContracts}
   - Contratti Gas: ${initialCounts.gasContracts}\n`);

        // Step 3: Upload CSV
        console.log('3️⃣ Carico file CSV...');
        const uploadResult = await uploadCSVFile(token);
        console.log('✅ File CSV caricato con successo');
        console.log(`📋 Risultato upload:`, uploadResult);
        console.log('');

        // Wait a moment for processing
        console.log('⏳ Attendo elaborazione...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 4: Get final counts
        console.log('4️⃣ Recupero conteggi finali...');
        const finalCounts = await getFinalCounts(token);
        console.log(`📊 Conteggi finali:
   - Clienti: ${finalCounts.clients}
   - Contratti Luce: ${finalCounts.lightContracts}
   - Contratti Gas: ${finalCounts.gasContracts}\n`);

        // Step 5: Calculate differences
        const differences = {
            clients: finalCounts.clients - initialCounts.clients,
            lightContracts: finalCounts.lightContracts - initialCounts.lightContracts,
            gasContracts: finalCounts.gasContracts - initialCounts.gasContracts
        };

        console.log(`📈 Differenze (nuovi record):
   - Clienti: +${differences.clients}
   - Contratti Luce: +${differences.lightContracts}
   - Contratti Gas: +${differences.gasContracts}\n`);

        // Step 6: Verify specific client
        console.log('5️⃣ Verifico cliente specifico...');
        const clientVerification = await verifySpecificClient(token, TEST_CONFIG.testEmail);
        
        if (clientVerification.found) {
            console.log(`✅ Cliente trovato: ${clientVerification.client.nome} ${clientVerification.client.cognome}`);
            console.log(`   - Email: ${clientVerification.client.email_principale}`);
            console.log(`   - Tipo: ${clientVerification.client.tipo_cliente}`);
            console.log(`   - Contratti Luce: ${clientVerification.lightContracts.length}`);
            console.log(`   - Contratti Gas: ${clientVerification.gasContracts.length}`);
        } else {
            console.log(`❌ Cliente ${TEST_CONFIG.testEmail} non trovato`);
        }
        console.log('');

        // Step 7: Final analysis
        console.log('6️⃣ Analisi finale...');
        
        const success = {
            clientsImported: differences.clients >= TEST_CONFIG.expectedClients,
            contractsImported: (differences.lightContracts + differences.gasContracts) >= TEST_CONFIG.expectedContracts,
            specificClientFound: clientVerification.found
        };

        const overallSuccess = Object.values(success).every(Boolean);

        console.log(`🎯 Risultati attesi vs effettivi:
   - Clienti attesi: ${TEST_CONFIG.expectedClients}, importati: ${differences.clients} ${success.clientsImported ? '✅' : '❌'}
   - Contratti attesi: ${TEST_CONFIG.expectedContracts}, importati: ${differences.lightContracts + differences.gasContracts} ${success.contractsImported ? '✅' : '❌'}
   - Cliente test trovato: ${success.specificClientFound ? '✅' : '❌'}\n`);

        if (overallSuccess) {
            console.log('🎉 TEST COMPLETATO CON SUCCESSO!');
            console.log('✅ L\'import CSV funziona correttamente per clienti e contratti');
        } else {
            console.log('⚠️ TEST PARZIALMENTE FALLITO');
            console.log('❌ Alcuni dati potrebbero non essere stati importati correttamente');
        }

        return {
            success: overallSuccess,
            initialCounts,
            finalCounts,
            differences,
            clientVerification,
            uploadResult
        };

    } catch (error) {
        console.error('💥 ERRORE DURANTE IL TEST:', error.message);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    runCompleteTest()
        .then(result => {
            console.log('\n📋 Test completato');
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 Test fallito:', error.message);
            process.exit(1);
        });
}

module.exports = { runCompleteTest };