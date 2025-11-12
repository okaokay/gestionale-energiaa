const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function testImportCompleto() {
    try {
        console.log('🚀 Test Import Completo CSV - Clienti e Contratti');
        console.log('================================================');

        // 1. Login
        console.log('\n1️⃣ Login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@test.com',
            password: 'admin123'
        });

        const token = loginResponse.data.token;
        console.log('✅ Login effettuato con successo');

        // 2. Verifica file CSV
        const csvPath = path.join(__dirname, 'clienti_misti_con_contratti.csv');
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File CSV non trovato: ${csvPath}`);
        }
        console.log(`✅ File CSV trovato: ${csvPath}`);

        // 3. Prepara FormData per upload
        console.log('\n2️⃣ Preparazione upload CSV...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));
        formData.append('modalita_import', 'update'); // Modalità update per gestire clienti esistenti

        // 4. Upload e avvio import
        console.log('\n3️⃣ Upload CSV e avvio import...');
        const uploadResponse = await axios.post(
            `${BASE_URL}/api/unified-import/upload`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${token}`
                },
                timeout: 60000 // 60 secondi timeout
            }
        );

        console.log('✅ Upload completato');
        console.log('📊 Risultato upload:', uploadResponse.data);

        if (uploadResponse.data.success) {
            const importId = uploadResponse.data.import_id;
            console.log(`🔄 Import ID: ${importId}`);

            // 5. Monitora progresso import
            console.log('\n4️⃣ Monitoraggio progresso import...');
            let completed = false;
            let attempts = 0;
            const maxAttempts = 30; // 30 tentativi = 5 minuti

            while (!completed && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Attendi 10 secondi
                attempts++;

                try {
                    const statusResponse = await axios.get(
                        `${BASE_URL}/api/unified-import/status/${importId}`,
                        {
                            headers: { 'Authorization': `Bearer ${token}` }
                        }
                    );

                    const status = statusResponse.data;
                    console.log(`📈 Tentativo ${attempts}/${maxAttempts} - Stato: ${status.stato}`);
                    
                    if (status.righe_elaborate !== undefined) {
                        console.log(`   📊 Righe elaborate: ${status.righe_elaborate}/${status.righe_totali}`);
                    }

                    if (status.stato === 'completato' || status.stato === 'errore') {
                        completed = true;
                        console.log('\n📋 RISULTATO FINALE:');
                        console.log('==================');
                        console.log(`Stato: ${status.stato}`);
                        console.log(`Righe totali: ${status.righe_totali}`);
                        console.log(`Righe elaborate: ${status.righe_elaborate}`);
                        console.log(`Clienti creati: ${status.clienti_creati || 0}`);
                        console.log(`Contratti creati: ${status.contratti_creati || 0}`);
                        console.log(`Errori: ${status.errori || 0}`);

                        if (status.errori_dettaglio && status.errori_dettaglio.length > 0) {
                            console.log('\n❌ ERRORI DETTAGLIATI:');
                            status.errori_dettaglio.forEach((errore, index) => {
                                console.log(`${index + 1}. ${errore}`);
                            });
                        }

                        if (status.stato === 'completato') {
                            console.log('\n🎉 IMPORT COMPLETATO CON SUCCESSO!');
                        } else {
                            console.log('\n❌ IMPORT FALLITO');
                        }
                    }
                } catch (statusError) {
                    console.log(`⚠️ Errore controllo status: ${statusError.message}`);
                }
            }

            if (!completed) {
                console.log('\n⏰ TIMEOUT: Import non completato entro il tempo limite');
            }

        } else {
            console.log('❌ Upload fallito:', uploadResponse.data.message);
        }

    } catch (error) {
        console.error('❌ Errore durante test import:', error.message);
        if (error.response) {
            console.error('📄 Dettagli errore:', error.response.data);
        }
    }
}

// Esegui test
testImportCompleto()
    .then(() => {
        console.log('\n✅ Test completato');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Errore fatale:', error);
        process.exit(1);
    });