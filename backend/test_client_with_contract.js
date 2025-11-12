/**
 * Test per inserimento cliente con contratto
 * Verifica che il cliente e il contratto vengano inseriti correttamente
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

async function testClientWithContract() {
    console.log('🔍 Test Inserimento Cliente con Contratto');
    console.log('==========================================');

    try {
        // 1. Login
        console.log('\n🔐 Effettuo login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });

        const token = loginResponse.data.data.token;
        console.log('✅ Login effettuato');

        // 2. Crea CSV con cliente e contratto nel formato corretto
         const csvContent = `tipo,nome,cognome,email_principale,telefono_mobile,codice_fiscale,data_nascita,luogo_nascita,provincia_nascita,email_secondaria,telefono_fisso,via,numero_civico,citta,cap,provincia,nazione,consenso_marketing,note,ragione_sociale,partita_iva,codice_ateco,pec,codice_sdi,nome_referente,cognome_referente,email_referente,telefono_referente,tipo_contratto,numero_contratto,pod,fornitore,data_stipula,data_attivazione,data_scadenza,agente,nome_offerta,validita_offerta,stato_contratto,prezzo,note_contratto
privato,Giuseppe,Verdi,giuseppe.verdi@email.com,3339876543,VRDGPP85B15F205X,1985-02-15,Milano,MI,,,,,,,,Italia,1,,,,,,,,,,,luce,LUC987654321,IT001E98765432101234,Enel,2024-01-15,2024-01-15,2025-01-15,,Offerta Test,2025-01-15,attivo,0.25,Contratto di test`;

        const tempCsvPath = path.join(__dirname, 'temp_client_contract.csv');
        fs.writeFileSync(tempCsvPath, csvContent);

        console.log('\n📝 Test con cliente e contratto...');
        console.log('CSV creato:', csvContent);

        // 3. Importa il file
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(tempCsvPath);
        const blob = new Blob([fileBuffer], { type: 'text/csv' });
        formData.append('file', blob, 'temp_client_contract.csv');

        const importResponse = await axios.post(`${BASE_URL}/api/unified-import/upload`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        });

        const importId = importResponse.data.data.importId;
        console.log('✅ Import avviato con ID:', importId);

        // 4. Attendi completamento
        console.log('\n⏳ Attendo completamento...');
        let completed = false;
        let attempts = 0;
        const maxAttempts = 30;

        while (!completed && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const progressResponse = await axios.get(`${BASE_URL}/api/unified-import/progress/${importId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (progressResponse.data.completed) {
                completed = true;
            }
            attempts++;
        }

        if (!completed) {
            throw new Error('Import non completato entro il timeout');
        }

        // 5. Ottieni risultato
        const resultResponse = await axios.get(`${BASE_URL}/api/unified-import/result/${importId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const result = resultResponse.data;
        console.log('\n📊 RISULTATO DETTAGLIATO:');
        console.log('========================');
        console.log('Successo:', result.success);
        console.log('File:', result.fileName);
        console.log('Righe totali:', result.totalRows);
        console.log('Righe processate:', result.processedRows);
        console.log('Righe inserite:', result.insertedRows);
        console.log('Righe saltate:', result.skippedRows);
        console.log('Righe con errori:', result.errorRows);

        // 6. Verifica cliente nel database
        console.log('\n🔍 Verifica cliente nel database...');
        const clientsResponse = await axios.get(`${BASE_URL}/api/clienti`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        let clients = [];
        if (clientsResponse.data.data && clientsResponse.data.data.clienti && Array.isArray(clientsResponse.data.data.clienti)) {
            clients = clientsResponse.data.data.clienti;
        }
        
        console.log('📋 Clienti trovati:', clients.length);
        const foundClient = clients.find(c => c.nome === 'Mario' && c.cognome === 'Rossi');
        
        if (foundClient) {
            console.log('✅ Cliente trovato nel database:', {
                id: foundClient.id,
                nome: foundClient.nome,
                cognome: foundClient.cognome,
                email: foundClient.email,
                codice_fiscale: foundClient.codice_fiscale
            });

            // 7. Verifica contratti del cliente
            console.log('\n🔍 Verifica contratti del cliente...');
            const contractsResponse = await axios.get(`${BASE_URL}/api/contratti`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('📊 Struttura risposta contratti:', JSON.stringify(contractsResponse.data, null, 2));

            // Cerca contratti associati al cliente
            let clientContracts = [];
            if (contractsResponse.data && contractsResponse.data.data) {
                const allContracts = contractsResponse.data.data;
                
                // Cerca contratti luce
                if (allContracts.luce && Array.isArray(allContracts.luce)) {
                    const luceContracts = allContracts.luce.filter(c => 
                        c.cliente_privato_id === foundClient.id || 
                        (c.cliente && c.cliente.id === foundClient.id)
                    );
                    clientContracts.push(...luceContracts.map(c => ({...c, tipo: 'luce'})));
                }

                // Cerca contratti gas
                if (allContracts.gas && Array.isArray(allContracts.gas)) {
                    const gasContracts = allContracts.gas.filter(c => 
                        c.cliente_privato_id === foundClient.id || 
                        (c.cliente && c.cliente.id === foundClient.id)
                    );
                    clientContracts.push(...gasContracts.map(c => ({...c, tipo: 'gas'})));
                }
            }

            console.log('📋 Contratti del cliente trovati:', clientContracts.length);
            
            if (clientContracts.length > 0) {
                console.log('✅ Contratti trovati:');
                clientContracts.forEach(contract => {
                    console.log(`   - ${contract.tipo.toUpperCase()}: ${contract.numero_contratto} (${contract.pod || contract.pdr})`);
                    console.log(`     Fornitore: ${contract.fornitore}, Stato: ${contract.stato}`);
                });
            } else {
                console.log('❌ Nessun contratto trovato per il cliente');
            }

        } else {
            console.log('❌ Cliente NON trovato nel database');
        }

        // Cleanup
        fs.unlinkSync(tempCsvPath);
        console.log('\n✅ Test completato!');

        return {
            clientFound: !!foundClient,
            contractsCount: clientContracts ? clientContracts.length : 0,
            importResult: result
        };

    } catch (error) {
        console.error('\n❌ Errore durante il test:', error.message);
        console.error('Stack trace:', error.stack);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
}

// Esegui il test
if (require.main === module) {
    testClientWithContract().catch(console.error);
}

module.exports = { testClientWithContract };