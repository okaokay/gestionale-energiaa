const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

console.log('🔍 TEST COMPLETO CARICAMENTO CLIENTI');
console.log('=====================================');

const db = new sqlite3.Database('./gestionale_energia.db');

// Test 1: Verifica struttura tabelle clienti
console.log('\n📋 1. STRUTTURA TABELLE CLIENTI');
console.log('--------------------------------');

db.all("PRAGMA table_info(clienti_privati)", (err, rows) => {
    if (err) {
        console.error('❌ Errore nel recuperare info tabella clienti_privati:', err);
        return;
    }
    
    console.log('\n🏠 CLIENTI_PRIVATI - Struttura:');
    rows.forEach(col => {
        console.log(`  ${col.name} (${col.type}) ${col.pk ? '- PRIMARY KEY' : ''} ${col.notnull ? '- NOT NULL' : ''}`);
    });
});

db.all("PRAGMA table_info(clienti_aziende)", (err, rows) => {
    if (err) {
        console.error('❌ Errore nel recuperare info tabella clienti_aziende:', err);
        return;
    }
    
    console.log('\n🏢 CLIENTI_AZIENDE - Struttura:');
    rows.forEach(col => {
        console.log(`  ${col.name} (${col.type}) ${col.pk ? '- PRIMARY KEY' : ''} ${col.notnull ? '- NOT NULL' : ''}`);
    });
});

// Test 2: Conteggio clienti e verifica ID
console.log('\n📊 2. CONTEGGIO E VERIFICA ID');
console.log('-----------------------------');

db.get("SELECT COUNT(*) as total FROM clienti_privati", (err, row) => {
    if (err) {
        console.error('❌ Errore conteggio clienti privati:', err);
        return;
    }
    console.log(`👥 Clienti privati totali: ${row.total}`);
});

db.get("SELECT COUNT(*) as total FROM clienti_aziende", (err, row) => {
    if (err) {
        console.error('❌ Errore conteggio clienti aziende:', err);
        return;
    }
    console.log(`🏢 Clienti aziende totali: ${row.total}`);
});

// Verifica ID nulli
db.get("SELECT COUNT(*) as null_ids FROM clienti_privati WHERE id IS NULL", (err, row) => {
    if (err) {
        console.error('❌ Errore verifica ID nulli privati:', err);
        return;
    }
    console.log(`❌ Clienti privati con ID NULL: ${row.null_ids}`);
});

db.get("SELECT COUNT(*) as null_ids FROM clienti_aziende WHERE id IS NULL", (err, row) => {
    if (err) {
        console.error('❌ Errore verifica ID nulli aziende:', err);
        return;
    }
    console.log(`❌ Clienti aziende con ID NULL: ${row.null_ids}`);
});

// Test 3: Campione dati clienti privati
console.log('\n🏠 3. CAMPIONE CLIENTI PRIVATI (primi 5)');
console.log('----------------------------------------');

db.all(`
    SELECT 
        id, nome, cognome, codice_fiscale, telefono, email, 
        indirizzo, citta, cap, provincia, data_nascita, 
        created_at, updated_at
    FROM clienti_privati 
    ORDER BY id 
    LIMIT 5
`, (err, rows) => {
    if (err) {
        console.error('❌ Errore nel recuperare clienti privati:', err);
        return;
    }
    
    if (rows.length === 0) {
        console.log('⚠️  Nessun cliente privato trovato');
        return;
    }
    
    rows.forEach((cliente, index) => {
        console.log(`\n👤 Cliente ${index + 1}:`);
        console.log(`  ID: ${cliente.id}`);
        console.log(`  Nome: ${cliente.nome || 'N/A'}`);
        console.log(`  Cognome: ${cliente.cognome || 'N/A'}`);
        console.log(`  CF: ${cliente.codice_fiscale || 'N/A'}`);
        console.log(`  Tel: ${cliente.telefono || 'N/A'}`);
        console.log(`  Email: ${cliente.email || 'N/A'}`);
        console.log(`  Indirizzo: ${cliente.indirizzo || 'N/A'}`);
        console.log(`  Città: ${cliente.citta || 'N/A'}`);
        console.log(`  CAP: ${cliente.cap || 'N/A'}`);
        console.log(`  Provincia: ${cliente.provincia || 'N/A'}`);
        console.log(`  Data nascita: ${cliente.data_nascita || 'N/A'}`);
        console.log(`  Creato: ${cliente.created_at || 'N/A'}`);
        console.log(`  Aggiornato: ${cliente.updated_at || 'N/A'}`);
    });
});

// Test 4: Campione dati clienti aziende
console.log('\n🏢 4. CAMPIONE CLIENTI AZIENDE (primi 5)');
console.log('---------------------------------------');

db.all(`
    SELECT 
        id, ragione_sociale, partita_iva, codice_fiscale, 
        telefono, email, indirizzo, citta, cap, provincia,
        created_at, updated_at
    FROM clienti_aziende 
    ORDER BY id 
    LIMIT 5
`, (err, rows) => {
    if (err) {
        console.error('❌ Errore nel recuperare clienti aziende:', err);
        return;
    }
    
    if (rows.length === 0) {
        console.log('⚠️  Nessun cliente aziendale trovato');
        return;
    }
    
    rows.forEach((cliente, index) => {
        console.log(`\n🏢 Azienda ${index + 1}:`);
        console.log(`  ID: ${cliente.id}`);
        console.log(`  Ragione Sociale: ${cliente.ragione_sociale || 'N/A'}`);
        console.log(`  P.IVA: ${cliente.partita_iva || 'N/A'}`);
        console.log(`  CF: ${cliente.codice_fiscale || 'N/A'}`);
        console.log(`  Tel: ${cliente.telefono || 'N/A'}`);
        console.log(`  Email: ${cliente.email || 'N/A'}`);
        console.log(`  Indirizzo: ${cliente.indirizzo || 'N/A'}`);
        console.log(`  Città: ${cliente.citta || 'N/A'}`);
        console.log(`  CAP: ${cliente.cap || 'N/A'}`);
        console.log(`  Provincia: ${cliente.provincia || 'N/A'}`);
        console.log(`  Creato: ${cliente.created_at || 'N/A'}`);
        console.log(`  Aggiornato: ${cliente.updated_at || 'N/A'}`);
    });
});

// Test 5: Test API endpoint /api/clienti
console.log('\n🌐 5. TEST API ENDPOINT /api/clienti');
console.log('-----------------------------------');

setTimeout(async () => {
    try {
        const axios = require('axios');
        
        // Prima facciamo login
        console.log('🔐 Effettuando login...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@gestionale.it',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login effettuato con successo');
        
        // Ora testiamo l'API clienti
        console.log('📋 Recuperando clienti via API...');
        const clientiResponse = await axios.get('http://localhost:3001/api/clienti', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                limit: 10
            }
        });
        
        const clienti = clientiResponse.data;
        console.log(`✅ API risposta ricevuta - Totale clienti: ${clienti.length}`);
        
        if (clienti.length > 0) {
            console.log('\n📋 Primi 3 clienti dall\'API:');
            clienti.slice(0, 3).forEach((cliente, index) => {
                console.log(`\n${index + 1}. ${cliente.tipo === 'privato' ? '👤' : '🏢'} ${cliente.nome || cliente.ragione_sociale}`);
                console.log(`   ID: ${cliente.id}`);
                console.log(`   Tipo: ${cliente.tipo}`);
                console.log(`   Email: ${cliente.email || 'N/A'}`);
                console.log(`   Telefono: ${cliente.telefono || 'N/A'}`);
                console.log(`   Città: ${cliente.citta || 'N/A'}`);
            });
            
            // Verifica ID
            const clientiConIdNull = clienti.filter(c => c.id === null || c.id === undefined);
            if (clientiConIdNull.length > 0) {
                console.log(`\n❌ ATTENZIONE: ${clientiConIdNull.length} clienti hanno ID null/undefined!`);
                clientiConIdNull.forEach((cliente, index) => {
                    console.log(`   ${index + 1}. ${cliente.nome || cliente.ragione_sociale} - ID: ${cliente.id}`);
                });
            } else {
                console.log('\n✅ Tutti i clienti hanno ID validi');
            }
        }
        
    } catch (error) {
        console.error('❌ Errore nel test API:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
    
    // Test 6: Generazione CSV di test
    console.log('\n📄 6. GENERAZIONE CSV DI TEST');
    console.log('-----------------------------');
    
    db.all(`
        SELECT 
            'privato' as tipo,
            id, nome, cognome, codice_fiscale, telefono, email, 
            indirizzo, citta, cap, provincia, data_nascita,
            NULL as ragione_sociale, NULL as partita_iva
        FROM clienti_privati 
        UNION ALL
        SELECT 
            'azienda' as tipo,
            id, NULL as nome, NULL as cognome, codice_fiscale, telefono, email,
            indirizzo, citta, cap, provincia, NULL as data_nascita,
            ragione_sociale, partita_iva
        FROM clienti_aziende
        ORDER BY tipo, id
        LIMIT 20
    `, (err, rows) => {
        if (err) {
            console.error('❌ Errore nel generare dati CSV:', err);
            return;
        }
        
        if (rows.length === 0) {
            console.log('⚠️  Nessun dato per CSV');
            db.close();
            return;
        }
        
        // Genera CSV
        const csvHeader = 'tipo,id,nome,cognome,ragione_sociale,codice_fiscale,partita_iva,telefono,email,indirizzo,citta,cap,provincia,data_nascita\n';
        const csvRows = rows.map(row => {
            return [
                row.tipo,
                row.id,
                row.nome || '',
                row.cognome || '',
                row.ragione_sociale || '',
                row.codice_fiscale || '',
                row.partita_iva || '',
                row.telefono || '',
                row.email || '',
                row.indirizzo || '',
                row.citta || '',
                row.cap || '',
                row.provincia || '',
                row.data_nascita || ''
            ].map(field => `"${field}"`).join(',');
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        
        fs.writeFileSync('./test_clienti_export.csv', csvContent);
        console.log('✅ CSV generato: test_clienti_export.csv');
        console.log(`📊 Righe esportate: ${rows.length}`);
        
        // Mostra anteprima
        console.log('\n📋 Anteprima CSV (prime 5 righe):');
        const lines = csvContent.split('\n');
        lines.slice(0, 6).forEach((line, index) => {
            console.log(`${index === 0 ? 'HEADER' : `ROW ${index}`}: ${line}`);
        });
        
        db.close();
        console.log('\n✅ Test completato!');
    });
    
}, 2000);