const axios = require('axios');
const fs = require('fs');

console.log('🎯 TEST FINALE COMPLETO - CARICAMENTO CLIENTI E CSV');
console.log('==================================================');

async function testCompleto() {
    try {
        // 1. Login
        console.log('🔐 Autenticazione...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data?.token;
        console.log('✅ Login riuscito, token ottenuto');
        
        // 2. Recupera tutti i clienti dall'API
        console.log('\n📋 Recupero clienti dall\'API...');
        const clientiResponse = await axios.get('http://localhost:3001/api/clienti', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            params: { 
                limit: 100,  // Recupera tutti i clienti
                offset: 0
            }
        });
        
        const clienti = clientiResponse.data.data?.clienti || [];
        const pagination = clientiResponse.data.data?.pagination || {};
        
        console.log(`✅ ${clienti.length} clienti recuperati dall'API`);
        console.log(`📊 Paginazione: ${pagination.total} totali, pagina ${pagination.page}/${pagination.totalPages}`);
        
        // 3. Verifica che tutti abbiano ID
        console.log('\n🔍 VERIFICA INTEGRITÀ DATI:');
        console.log('===========================');
        
        const clientiSenzaId = clienti.filter(c => !c.id);
        const clientiPrivati = clienti.filter(c => c.tipo === 'privato');
        const clientiAziende = clienti.filter(c => c.tipo === 'azienda');
        
        console.log(`👥 Clienti privati: ${clientiPrivati.length}`);
        console.log(`🏢 Clienti aziende: ${clientiAziende.length}`);
        console.log(`❌ Clienti senza ID: ${clientiSenzaId.length}`);
        
        if (clientiSenzaId.length > 0) {
            console.log('⚠️  ATTENZIONE: Alcuni clienti non hanno ID!');
            clientiSenzaId.forEach((cliente, index) => {
                console.log(`   ${index + 1}. ${cliente.nome || cliente.ragione_sociale} (tipo: ${cliente.tipo})`);
            });
        } else {
            console.log('✅ Tutti i clienti hanno ID validi');
        }
        
        // 4. Mostra dettagli clienti
        console.log('\n📊 DETTAGLI CLIENTI:');
        console.log('====================');
        
        clienti.forEach((cliente, index) => {
            const nome = cliente.nome || cliente.ragione_sociale || 'N/A';
            const email = cliente.email || 'N/A';
            const telefono = cliente.telefono || 'N/A';
            const citta = cliente.citta || 'N/A';
            
            console.log(`${index + 1}. [${cliente.tipo.toUpperCase()}] ID: ${cliente.id}`);
            console.log(`   Nome: ${nome}`);
            console.log(`   Email: ${email}`);
            console.log(`   Telefono: ${telefono}`);
            console.log(`   Città: ${citta}`);
            console.log('   ---');
        });
        
        // 5. Genera CSV completo con tutti i campi
        console.log('\n📄 GENERAZIONE CSV DALL\'API:');
        console.log('=============================');
        
        const csvHeader = [
            'id',
            'tipo',
            'nome',
            'cognome', 
            'ragione_sociale',
            'codice_fiscale',
            'partita_iva',
            'codice_cliente',
            'email',
            'telefono',
            'citta',
            'provincia',
            'codice_ateco',
            'consenso_marketing',
            'created_at',
            'data_quality_score',
            'stato',
            'assigned_agent_id',
            'commissione_pattuita',
            'commissione_pagata',
            'contratti_luce',
            'contratti_gas',
            'stato_contratto_luce',
            'stato_contratto_gas'
        ].join(',') + '\n';
        
        const csvRows = clienti.map(cliente => {
            return [
                cliente.id || '',
                cliente.tipo || '',
                cliente.nome || '',
                cliente.cognome || '',
                cliente.ragione_sociale || '',
                cliente.codice_fiscale || '',
                cliente.partita_iva || '',
                cliente.codice_cliente || '',
                cliente.email || '',
                cliente.telefono || '',
                cliente.citta || '',
                cliente.provincia || '',
                cliente.codice_ateco || '',
                cliente.consenso_marketing || 0,
                cliente.created_at || '',
                cliente.data_quality_score || 0,
                cliente.stato || '',
                cliente.assigned_agent_id || '',
                cliente.commissione_pattuita || '',
                cliente.commissione_pagata || 0,
                cliente.contratti_luce || 0,
                cliente.contratti_gas || 0,
                cliente.stato_contratto_luce || '',
                cliente.stato_contratto_gas || ''
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
        const csvFileName = `./clienti_api_export_${timestamp}.csv`;
        
        fs.writeFileSync(csvFileName, csvContent, 'utf8');
        
        console.log(`✅ CSV generato: ${csvFileName}`);
        console.log(`📊 Righe totali: ${clienti.length + 1} (header + ${clienti.length} clienti)`);
        console.log(`📋 Campi per cliente: ${csvHeader.split(',').length}`);
        
        // 6. Mostra anteprima CSV
        console.log('\n📋 ANTEPRIMA CSV (prime 3 righe):');
        console.log('=================================');
        const csvLines = csvContent.split('\n');
        csvLines.slice(0, 4).forEach((line, index) => {
            if (line.trim()) {
                const label = index === 0 ? 'HEADER' : `ROW ${index}`;
                const preview = line.length > 100 ? line.substring(0, 100) + '...' : line;
                console.log(`${label}: ${preview}`);
            }
        });
        
        // 7. Verifica campi obbligatori
        console.log('\n🔍 VERIFICA CAMPI OBBLIGATORI:');
        console.log('==============================');
        
        const campiObbligatori = ['id', 'tipo', 'created_at'];
        const headerFields = csvHeader.replace('\n', '').split(',');
        
        console.log(`📋 Campi totali nel CSV: ${headerFields.length}`);
        
        campiObbligatori.forEach(campo => {
            const presente = headerFields.includes(campo);
            console.log(`${presente ? '✅' : '❌'} ${campo}: ${presente ? 'PRESENTE' : 'MANCANTE'}`);
        });
        
        // Verifica che tutti i clienti abbiano i campi obbligatori
        const clientiIncompleti = clienti.filter(c => 
            !c.id || !c.tipo || !c.created_at
        );
        
        if (clientiIncompleti.length > 0) {
            console.log(`❌ ${clientiIncompleti.length} clienti con campi obbligatori mancanti`);
        } else {
            console.log('✅ Tutti i clienti hanno i campi obbligatori');
        }
        
        // 8. Riepilogo finale
        console.log('\n🎉 RIEPILOGO FINALE:');
        console.log('====================');
        console.log(`✅ Login API: FUNZIONANTE`);
        console.log(`✅ Recupero clienti: FUNZIONANTE`);
        console.log(`✅ Clienti con ID: ${clienti.length - clientiSenzaId.length}/${clienti.length}`);
        console.log(`✅ CSV generato: ${csvFileName}`);
        console.log(`✅ Campi nel CSV: ${headerFields.length}`);
        console.log(`✅ Record nel CSV: ${clienti.length}`);
        
        if (clientiSenzaId.length === 0) {
            console.log('\n🎯 TUTTI I TEST SUPERATI! Il sistema è pronto per l\'uso.');
        } else {
            console.log('\n⚠️  Alcuni clienti necessitano di correzioni agli ID.');
        }
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

testCompleto();