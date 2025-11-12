const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';

// Funzione per il login
async function login() {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        return response.data.token;
    } catch (error) {
        console.error('❌ Errore durante il login:', error.response?.data || error.message);
        throw error;
    }
}

// Funzione per pulire il database
async function cleanDatabase(token) {
    try {
        console.log('🧹 Pulizia database...');
        await axios.delete(`${BASE_URL}/api/clienti/all`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Database pulito');
    } catch (error) {
        console.log('⚠️ Errore pulizia database (potrebbe essere normale):', error.response?.data?.message || error.message);
    }
}

// Funzione per importare un file CSV
async function importCsv(token, filePath, fileName) {
    try {
        console.log(`📤 Importazione ${fileName}...`);
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        
        const response = await axios.post(`${BASE_URL}/api/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log(`✅ Import ${fileName} avviato con ID:`, response.data.importId);
        return response.data.importId;
    } catch (error) {
        console.error(`❌ Errore import ${fileName}:`, error.response?.data || error.message);
        throw error;
    }
}

// Funzione per verificare lo stato dell'import
async function checkImportStatus(token, importId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await axios.get(`${BASE_URL}/api/unified-import/status/${importId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const status = response.data;
            console.log(`📊 Tentativo ${i + 1}: Stato = ${status.status}, Progresso = ${status.progress}%`);
            
            if (status.status === 'completed') {
                return status;
            } else if (status.status === 'failed') {
                throw new Error(`Import fallito: ${status.error}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            if (error.response?.status === 404) {
                console.log(`⏳ Import ${importId} non ancora disponibile, attendo...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
            throw error;
        }
    }
    throw new Error('Timeout: Import non completato entro il tempo limite');
}

// Funzione per ottenere i risultati dell'import
async function getImportResults(token, importId) {
    try {
        const response = await axios.get(`${BASE_URL}/api/unified-import/results/${importId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Errore nel recupero risultati:', error.response?.data || error.message);
        return null;
    }
}

// Funzione per verificare i dati nel database con dettagli
async function verifyDatabaseData(token) {
    try {
        console.log('🔍 Verifica dettagliata dati nel database...');
        
        // Verifica clienti privati
        const clientiPrivati = await axios.get(`${BASE_URL}/api/clienti?tipo=privato`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`👥 Clienti privati trovati: ${clientiPrivati.data.length}`);
        if (clientiPrivati.data.length > 0) {
            console.log('   Dettagli clienti privati:');
            clientiPrivati.data.forEach((cliente, index) => {
                console.log(`   ${index + 1}. ${cliente.nome} ${cliente.cognome} (${cliente.codice_fiscale})`);
            });
        }
        
        // Verifica clienti azienda
        const clientiAzienda = await axios.get(`${BASE_URL}/api/clienti?tipo=azienda`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`🏢 Clienti azienda trovati: ${clientiAzienda.data.length}`);
        if (clientiAzienda.data.length > 0) {
            console.log('   Dettagli clienti azienda:');
            clientiAzienda.data.forEach((cliente, index) => {
                console.log(`   ${index + 1}. ${cliente.ragione_sociale} (${cliente.partita_iva})`);
            });
        }
        
        // Verifica contratti luce
        const contrattiLuce = await axios.get(`${BASE_URL}/api/contratti?tipo=luce`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`💡 Contratti luce trovati: ${contrattiLuce.data.length}`);
        if (contrattiLuce.data.length > 0) {
            console.log('   Dettagli contratti luce:');
            contrattiLuce.data.forEach((contratto, index) => {
                console.log(`   ${index + 1}. POD: ${contratto.pod}, Cliente: ${contratto.cliente_id}, Numero: ${contratto.numero_contratto}`);
            });
        }
        
        // Verifica contratti gas
        const contrattiGas = await axios.get(`${BASE_URL}/api/contratti?tipo=gas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`🔥 Contratti gas trovati: ${contrattiGas.data.length}`);
        if (contrattiGas.data.length > 0) {
            console.log('   Dettagli contratti gas:');
            contrattiGas.data.forEach((contratto, index) => {
                console.log(`   ${index + 1}. PDR: ${contratto.pdr}, Cliente: ${contratto.cliente_id}, Numero: ${contratto.numero_contratto}`);
            });
        }
        
        return {
            clientiPrivati: clientiPrivati.data,
            clientiAzienda: clientiAzienda.data,
            contrattiLuce: contrattiLuce.data,
            contrattiGas: contrattiGas.data
        };
    } catch (error) {
        console.error('❌ Errore verifica database:', error.response?.data || error.message);
        return null;
    }
}

// Funzione principale di test
async function runContractDebugTest() {
    try {
        console.log('🧪 TEST DEBUG CONTRATTI - IMPORT COMPLETO');
        console.log('==========================================\n');
        
        // Login
        const token = await login();
        console.log('✅ Login effettuato\n');
        
        // Pulisci database
        await cleanDatabase(token);
        
        // File da testare
        const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File non trovato: ${csvPath}`);
        }
        
        console.log(`📄 File da importare: ${csvPath}`);
        
        // Analizza il contenuto del file prima dell'import
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n');
        console.log(`📊 Righe totali nel file: ${lines.length}`);
        
        const headers = lines[0].split(',');
        console.log(`📋 Headers: ${headers.join(', ')}`);
        
        // Conta i tipi di record
        const recordTypes = {};
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const columns = lines[i].split(',');
                const tipo = columns[0] || 'unknown';
                recordTypes[tipo] = (recordTypes[tipo] || 0) + 1;
            }
        }
        
        console.log('📊 Tipi di record nel file:');
        Object.entries(recordTypes).forEach(([type, count]) => {
            console.log(`   - ${type}: ${count} record`);
        });
        
        console.log('\n🚀 Avvio importazione...');
        
        // Importa il file
        const importId = await importCsv(token, csvPath, 'Import Completo Debug');
        
        // Attendi completamento
        const status = await checkImportStatus(token, importId);
        console.log('✅ Import completato');
        
        // Ottieni risultati dettagliati
        const results = await getImportResults(token, importId);
        if (results) {
            console.log('\n📊 RISULTATI IMPORT:');
            console.log(`   - Righe processate: ${results.totalRows || 'N/A'}`);
            console.log(`   - Righe inserite: ${results.insertedRows || 'N/A'}`);
            console.log(`   - Errori: ${results.errors?.length || 0}`);
            console.log(`   - Tipo rilevato: ${results.detectedType || 'N/A'}`);
            console.log(`   - Confidenza: ${results.confidence || 'N/A'}%`);
            
            if (results.errors && results.errors.length > 0) {
                console.log('\n❌ ERRORI DETTAGLIATI:');
                results.errors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error}`);
                });
            }
            
            if (results.summary) {
                console.log('\n📈 RIEPILOGO:');
                Object.entries(results.summary).forEach(([key, value]) => {
                    console.log(`   - ${key}: ${value}`);
                });
            }
        }
        
        // Verifica dati nel database
        console.log('\n🔍 VERIFICA DATABASE:');
        const dbData = await verifyDatabaseData(token);
        
        // Analisi finale
        console.log('\n🎯 ANALISI FINALE:');
        if (dbData) {
            const totalClienti = dbData.clientiPrivati.length + dbData.clientiAzienda.length;
            const totalContratti = dbData.contrattiLuce.length + dbData.contrattiGas.length;
            
            console.log(`   - Clienti totali importati: ${totalClienti}`);
            console.log(`   - Contratti totali importati: ${totalContratti}`);
            
            if (totalClienti > 0 && totalContratti === 0) {
                console.log('⚠️  PROBLEMA IDENTIFICATO: I clienti sono stati importati ma i contratti NO!');
                console.log('   Questo conferma che il problema è nell\'importazione dei contratti.');
            } else if (totalContratti > 0) {
                console.log('✅ I contratti sono stati importati correttamente.');
            }
        }
        
        console.log('\n🎉 Test debug contratti completato!');
        
    } catch (error) {
        console.error('❌ Errore generale:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Avvia il test
runContractDebugTest();