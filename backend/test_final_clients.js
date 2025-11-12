const axios = require('axios');
const fs = require('fs');

console.log('🧪 TEST FINALE CARICAMENTO CLIENTI');
console.log('==================================');

async function testClienti() {
    try {
        // 1. Login
        console.log('🔐 Effettuando login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login riuscito');
        
        // 2. Test API clienti
        console.log('\n📋 Recuperando clienti dall\'API...');
        const clientiResponse = await axios.get('http://localhost:3001/api/clienti', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: { 
                limit: 50,
                offset: 0 
            }
        });
        
        const clienti = clientiResponse.data;
        console.log(`✅ API clienti OK - ${clienti.length} clienti ricevuti`);
        
        if (clienti.length === 0) {
            console.log('⚠️  Nessun cliente trovato');
            return;
        }
        
        // 3. Mostra dettagli clienti
        console.log('\n📊 DETTAGLI CLIENTI:');
        console.log('====================');
        
        clienti.forEach((cliente, index) => {
            console.log(`${index + 1}. ID: ${cliente.id || 'N/A'}`);
            console.log(`   Tipo: ${cliente.tipo || 'N/A'}`);
            console.log(`   Nome: ${cliente.nome || cliente.ragione_sociale || 'N/A'}`);
            console.log(`   Email: ${cliente.email || 'N/A'}`);
            console.log(`   Telefono: ${cliente.telefono || 'N/A'}`);
            console.log(`   Città: ${cliente.citta || 'N/A'}`);
            console.log('   ---');
        });
        
        // 4. Verifica che tutti abbiano ID
        const clientiSenzaId = clienti.filter(c => !c.id);
        if (clientiSenzaId.length > 0) {
            console.log(`❌ ATTENZIONE: ${clientiSenzaId.length} clienti senza ID!`);
            clientiSenzaId.forEach((cliente, index) => {
                console.log(`   ${index + 1}. ${cliente.nome || cliente.ragione_sociale}`);
            });
        } else {
            console.log('✅ Tutti i clienti hanno un ID valido');
        }
        
        // 5. Genera CSV completo
        console.log('\n📄 GENERAZIONE CSV:');
        console.log('===================');
        
        const csvHeader = 'id,tipo,nome,cognome,ragione_sociale,codice_fiscale,partita_iva,email_principale,telefono_mobile,telefono_fisso,citta_residenza,citta_sede_legale,created_at\n';
        
        const csvRows = clienti.map(cliente => {
            return [
                cliente.id || '',
                cliente.tipo || '',
                cliente.nome || '',
                cliente.cognome || '',
                cliente.ragione_sociale || '',
                cliente.codice_fiscale || '',
                cliente.partita_iva || '',
                cliente.email || cliente.email_principale || '',
                cliente.telefono_mobile || '',
                cliente.telefono_fisso || cliente.telefono_principale || '',
                cliente.citta || cliente.citta_residenza || '',
                cliente.citta_sede_legale || '',
                cliente.created_at || ''
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        const csvFileName = './clienti_completo_' + new Date().toISOString().slice(0,10) + '.csv';
        
        fs.writeFileSync(csvFileName, csvContent, 'utf8');
        console.log(`✅ CSV generato: ${csvFileName}`);
        console.log(`📊 Righe nel CSV: ${clienti.length + 1} (header + ${clienti.length} clienti)`);
        
        // 6. Mostra anteprima CSV
        console.log('\n📋 ANTEPRIMA CSV (prime 5 righe):');
        console.log('================================');
        const csvLines = csvContent.split('\n');
        csvLines.slice(0, 6).forEach((line, index) => {
            console.log(`${index === 0 ? 'HEADER' : 'ROW ' + index}: ${line}`);
        });
        
        // 7. Verifica campi nel CSV
        console.log('\n🔍 VERIFICA CAMPI CSV:');
        console.log('=====================');
        const headerFields = csvHeader.split(',').map(f => f.trim());
        console.log(`📋 Campi nel CSV: ${headerFields.length}`);
        headerFields.forEach((field, index) => {
            console.log(`   ${index + 1}. ${field}`);
        });
        
        console.log('\n✅ TEST COMPLETATO CON SUCCESSO!');
        console.log(`📁 File CSV salvato: ${csvFileName}`);
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testClienti();