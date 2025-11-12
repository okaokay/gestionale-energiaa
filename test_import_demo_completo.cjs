const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testImportDemoCompleto() {
    try {
        console.log('🚀 === TEST IMPORT DEMO COMPLETO ===\n');
        
        // 1. LOGIN
        console.log('🔐 1. Login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.token;
        console.log('✅ Login riuscito\n');
        
        // 2. PULIZIA DATABASE (elimina dati esistenti)
        console.log('🧹 2. Pulizia database...');
        try {
            await axios.delete('http://localhost:3001/api/clienti/cleanup-all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ Database pulito\n');
        } catch (error) {
            console.log('⚠️ Pulizia non necessaria o non disponibile\n');
        }
        
        // 3. IMPORT CSV
        console.log('📤 3. Import CSV demo completo...');
        const csvPath = path.join(__dirname, 'test_import_demo_completo.csv');
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`File CSV non trovato: ${csvPath}`);
        }
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));
        formData.append('importType', 'unified');
        
        const importResponse = await axios.post('http://localhost:3001/api/unified-import/upload', formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        
        const importId = importResponse.data.data.importId;
        console.log(`✅ Import avviato - ID: ${importId}\n`);
        
        // 4. ATTESA COMPLETAMENTO
        console.log('⏳ 4. Attesa completamento import...');
        let importCompleted = false;
        let attempts = 0;
        const maxAttempts = 30;
        
        while (!importCompleted && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
                const statusResponse = await axios.get(`http://localhost:3001/api/unified-import/status/${importId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const status = statusResponse.data.data.status;
                console.log(`   Status: ${status}`);
                
                if (status === 'completed' || status === 'failed') {
                    importCompleted = true;
                }
            } catch (error) {
                console.log(`   Tentativo ${attempts + 1}: in attesa...`);
            }
            
            attempts++;
        }
        
        if (!importCompleted) {
            throw new Error('Import non completato entro il timeout');
        }
        
        console.log('✅ Import completato\n');
        
        // 5. VERIFICA RISULTATI IMPORT
        console.log('📊 5. Verifica risultati import...');
        const resultResponse = await axios.get(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = resultResponse.data.data;
        console.log(`   Righe totali: ${result.totalRows}`);
        console.log(`   Righe elaborate: ${result.processedRows}`);
        console.log(`   Righe inserite: ${result.insertedRows}`);
        console.log(`   Righe con errori: ${result.errorRows}`);
        console.log(`   Righe saltate: ${result.skippedRows}\n`);
        
        if (result.errorRows > 0) {
            console.log('⚠️ Errori trovati:');
            result.errors?.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.message || 'Errore sconosciuto'}`);
            });
            console.log('');
        }
        
        // 6. VERIFICA CLIENTI PRIVATI
        console.log('👤 6. Verifica clienti privati...');
        const clientiPrivatiResponse = await axios.get('http://localhost:3001/api/clienti?tipo=privato&limit=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const clientiPrivati = clientiPrivatiResponse.data.data || [];
        console.log(`   Clienti privati trovati: ${clientiPrivati.length}`);
        
        // Verifica dati specifici clienti privati
        const marioRossi = clientiPrivati.find(c => c.nome === 'Mario' && c.cognome === 'Rossi');
        if (marioRossi) {
            console.log('   ✅ Mario Rossi trovato:');
            console.log(`      - Email: ${marioRossi.email_principale}`);
            console.log(`      - Telefono: ${marioRossi.telefono_mobile}`);
            console.log(`      - Codice Fiscale: ${marioRossi.codice_fiscale}`);
            console.log(`      - Città: ${marioRossi.citta_residenza}`);
        } else {
            console.log('   ❌ Mario Rossi NON trovato');
        }
        
        const lauraBianchi = clientiPrivati.find(c => c.nome === 'Laura' && c.cognome === 'Bianchi');
        if (lauraBianchi) {
            console.log('   ✅ Laura Bianchi trovata');
        } else {
            console.log('   ❌ Laura Bianchi NON trovata');
        }
        
        // 7. VERIFICA CLIENTI AZIENDE
        console.log('\n🏢 7. Verifica clienti aziende...');
        const clientiAziendeResponse = await axios.get('http://localhost:3001/api/clienti?tipo=azienda&limit=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const clientiAziende = clientiAziendeResponse.data.data || [];
        console.log(`   Clienti aziende trovati: ${clientiAziende.length}`);
        
        const ristorante = clientiAziende.find(c => c.ragione_sociale === 'Ristorante Da Mario');
        if (ristorante) {
            console.log('   ✅ Ristorante Da Mario trovato:');
            console.log(`      - P.IVA: ${ristorante.partita_iva}`);
            console.log(`      - Codice ATECO: ${ristorante.codice_ateco}`);
            console.log(`      - Email: ${ristorante.email_referente}`);
        } else {
            console.log('   ❌ Ristorante Da Mario NON trovato');
        }
        
        // 8. VERIFICA CONTRATTI LUCE
        console.log('\n⚡ 8. Verifica contratti luce...');
        const contrattiLuceResponse = await axios.get('http://localhost:3001/api/contratti/luce?limit=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const contrattiLuce = contrattiLuceResponse.data.data || [];
        console.log(`   Contratti luce trovati: ${contrattiLuce.length}`);
        
        contrattiLuce.forEach((contratto, index) => {
            console.log(`   ${index + 1}. Contratto ${contratto.numero_contratto}:`);
            console.log(`      - POD: ${contratto.pod}`);
            console.log(`      - Fornitore: ${contratto.fornitore}`);
            console.log(`      - Prezzo: €${contratto.prezzo_energia}/kWh`);
            console.log(`      - Scadenza: ${contratto.data_scadenza}`);
            console.log(`      - Stato: ${contratto.stato}`);
        });
        
        // 9. VERIFICA CONTRATTI GAS
        console.log('\n🔥 9. Verifica contratti gas...');
        const contrattiGasResponse = await axios.get('http://localhost:3001/api/contratti/gas?limit=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const contrattiGas = contrattiGasResponse.data.data || [];
        console.log(`   Contratti gas trovati: ${contrattiGas.length}`);
        
        contrattiGas.forEach((contratto, index) => {
            console.log(`   ${index + 1}. Contratto ${contratto.numero_contratto}:`);
            console.log(`      - PDR: ${contratto.pdr}`);
            console.log(`      - Fornitore: ${contratto.fornitore}`);
            console.log(`      - Prezzo: €${contratto.prezzo_gas}/Smc`);
            console.log(`      - Scadenza: ${contratto.data_scadenza}`);
            console.log(`      - Stato: ${contratto.stato}`);
        });
        
        // 10. VERIFICA OFFERTE
        console.log('\n💡 10. Verifica offerte...');
        const offerteResponse = await axios.get('http://localhost:3001/api/offerte?limit=100', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const offerte = offerteResponse.data.data || [];
        console.log(`   Offerte trovate: ${offerte.length}`);
        
        offerte.forEach((offerta, index) => {
            console.log(`   ${index + 1}. ${offerta.nome_offerta}:`);
            console.log(`      - Fornitore: ${offerta.fornitore}`);
            console.log(`      - Tipo: ${offerta.tipo_offerta}`);
        });
        
        // 11. RIEPILOGO FINALE
        console.log('\n📋 === RIEPILOGO FINALE ===');
        console.log(`✅ Clienti privati: ${clientiPrivati.length}/3 attesi`);
        console.log(`✅ Clienti aziende: ${clientiAziende.length}/2 attesi`);
        console.log(`✅ Contratti luce: ${contrattiLuce.length}/4 attesi`);
        console.log(`✅ Contratti gas: ${contrattiGas.length}/3 attesi`);
        console.log(`✅ Offerte: ${offerte.length}/1 attese`);
        
        const totalExpected = 3 + 2 + 4 + 3 + 1; // 13 record totali
        const totalImported = clientiPrivati.length + clientiAziende.length + contrattiLuce.length + contrattiGas.length + offerte.length;
        
        console.log(`\n🎯 RISULTATO: ${totalImported}/${totalExpected} record importati`);
        
        if (totalImported === totalExpected) {
            console.log('🎉 IMPORT DEMO COMPLETO AL 100% RIUSCITO!');
        } else {
            console.log('⚠️ Import parzialmente riuscito - verificare errori sopra');
        }
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error.response?.data || error.message);
        process.exit(1);
    }
}

testImportDemoCompleto();