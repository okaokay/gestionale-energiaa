const Database = require('better-sqlite3');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

console.log('🧹 PULIZIA COMPLETA DATABASE E TEST IMPORTAZIONE');
console.log('================================================');

async function cleanDatabase() {
    console.log('\n🗄️ STEP 1: PULIZIA DATABASE');
    
    const dbPath = path.join(__dirname, '..', 'gestionale_energia.db');
    const db = new Database(dbPath);
    
    try {
        // Pulisci tutte le tabelle principali
        const tables = ['contratti_gas', 'contratti_luce', 'clienti_aziende', 'clienti_privati'];
        
        for (const table of tables) {
            try {
                const result = db.prepare(`DELETE FROM ${table}`).run();
                console.log(`✅ ${table}: ${result.changes} record eliminati`);
            } catch (error) {
                console.log(`❌ Errore pulizia ${table}:`, error.message);
            }
        }
        
        // Pulisci anche i log di importazione per un test pulito
        try {
            const result = db.prepare('DELETE FROM import_logs').run();
            console.log(`✅ import_logs: ${result.changes} record eliminati`);
        } catch (error) {
            console.log(`⚠️ import_logs: ${error.message}`);
        }
        
        db.close();
        console.log('✅ Database pulito completamente');
        
    } catch (error) {
        console.error('❌ Errore pulizia database:', error.message);
        db.close();
        return false;
    }
    
    return true;
}

async function testImport() {
    console.log('\n🚀 STEP 2: TEST IMPORTAZIONE COMPLETA');
    
    try {
        // Login
        console.log('🔐 Login...');
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@gestionale.it',
                password: 'Admin123!'
            })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            console.log('❌ Login fallito:', loginData.message);
            return false;
        }
        
        const token = loginData.data.token;
        console.log('✅ Login riuscito');
        
        // Upload file
        console.log('\n📤 Upload file CSV...');
        const csvContent = fs.readFileSync('./test_contratti_corretto.csv');
        console.log(`📁 File letto: ${csvContent.length} bytes`);
        
        const formData = new FormData();
        formData.append('file', csvContent, {
            filename: 'test_contratti_corretto.csv',
            contentType: 'text/csv'
        });
        formData.append('entityType', 'contratti');
        
        const uploadResponse = await fetch('http://localhost:3001/api/unified-import/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        const uploadData = await uploadResponse.json();
        if (!uploadData.success) {
            console.log('❌ Upload fallito:', uploadData.message);
            return false;
        }
        
        const importId = uploadData.data.importId;
        console.log('✅ Upload riuscito - ImportId:', importId);
        
        // Monitoraggio
        console.log('\n⏳ Monitoraggio importazione...');
        let completed = false;
        let attempts = 0;
        const maxAttempts = 15;
        
        while (!completed && attempts < maxAttempts) {
            attempts++;
            console.log(`🔍 Controllo ${attempts}/${maxAttempts}...`);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const progressResponse = await fetch(`http://localhost:3001/api/unified-import/progress/${importId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const progressData = await progressResponse.json();
            if (progressData.success) {
                const { status, progress } = progressData.data;
                console.log(`📊 Status: ${status || 'processing'} - Progress: ${progress}%`);
                
                if (progress >= 100 || status === 'completed' || status === 'failed') {
                    completed = true;
                }
            }
        }
        
        // Risultato finale
        console.log('\n📊 Recupero risultato finale...');
        const resultResponse = await fetch(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const resultData = await resultResponse.json();
        if (resultData.success) {
            const result = resultData.data;
            console.log('\n🎯 RISULTATO IMPORTAZIONE:');
            console.log(`📁 File: ${result.fileName}`);
            console.log(`📊 Righe totali: ${result.totalRows}`);
            console.log(`✅ Inserite: ${result.insertedRows}`);
            console.log(`🔄 Aggiornate: ${result.updatedRows}`);
            console.log(`⏭️ Saltate: ${result.skippedRows}`);
            console.log(`❌ Errori: ${result.errorRows}`);
            
            return true;
        } else {
            console.log('❌ Errore nel risultato:', resultData.message);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Errore test importazione:', error.message);
        return false;
    }
}

async function verifyDatabase() {
    console.log('\n🔍 STEP 3: VERIFICA DATABASE FINALE');
    
    const dbPath = path.join(__dirname, '..', 'gestionale_energia.db');
    const db = new Database(dbPath);
    
    try {
        const tables = ['clienti_privati', 'clienti_aziende', 'contratti_luce', 'contratti_gas'];
        
        for (const table of tables) {
            try {
                const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
                console.log(`📊 ${table}: ${count.count} record`);
                
                if (count.count > 0) {
                    const sample = db.prepare(`SELECT * FROM ${table} LIMIT 2`).all();
                    sample.forEach((record, index) => {
                        console.log(`   Record ${index + 1}:`, {
                            id: record.id,
                            nome: record.nome || record.ragione_sociale || 'N/A',
                            email: record.email_principale || 'N/A'
                        });
                    });
                }
            } catch (error) {
                console.log(`❌ Errore ${table}:`, error.message);
            }
        }
        
        db.close();
        
    } catch (error) {
        console.error('❌ Errore verifica database:', error.message);
        db.close();
    }
}

async function runCompleteTest() {
    const cleanSuccess = await cleanDatabase();
    if (!cleanSuccess) {
        console.log('❌ Test interrotto: pulizia database fallita');
        return;
    }
    
    const importSuccess = await testImport();
    if (!importSuccess) {
        console.log('❌ Test interrotto: importazione fallita');
        return;
    }
    
    await verifyDatabase();
    
    console.log('\n🎉 TEST COMPLETO TERMINATO');
}

runCompleteTest().catch(console.error);