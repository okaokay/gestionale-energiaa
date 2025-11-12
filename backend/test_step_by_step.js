const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

console.log('🚀 INIZIO TEST IMPORTAZIONE');
console.log('===========================');

async function step1_login() {
    console.log('\n🔐 STEP 1: LOGIN');
    try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@gestionale.it',
                password: 'Admin123!'
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ Login riuscito');
            return data.data.token;
        } else {
            console.log('❌ Login fallito:', data.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Errore login:', error.message);
        return null;
    }
}

async function step2_upload(token) {
    console.log('\n📤 STEP 2: UPLOAD FILE');
    try {
        const csvContent = fs.readFileSync('./test_contratti_corretto.csv');
        console.log(`📁 File letto: ${csvContent.length} bytes`);
        
        const formData = new FormData();
        formData.append('file', csvContent, {
            filename: 'test_contratti_corretto.csv',
            contentType: 'text/csv'
        });
        formData.append('entityType', 'contratti');
        
        const response = await fetch('http://localhost:3001/api/unified-import/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ Upload riuscito');
            console.log('📊 ImportId:', data.data.importId);
            return data.data.importId;
        } else {
            console.log('❌ Upload fallito:', data.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Errore upload:', error.message);
        return null;
    }
}

async function step3_monitor(token, importId) {
    console.log('\n⏳ STEP 3: MONITORAGGIO');
    try {
        for (let i = 1; i <= 10; i++) {
            console.log(`🔍 Controllo ${i}/10...`);
            
            const response = await fetch(`http://localhost:3001/api/unified-import/progress/${importId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            if (data.success) {
                console.log(`📊 Status: ${data.data.status} - Progress: ${data.data.progress}%`);
                if (data.data.status === 'completed' || data.data.status === 'failed') {
                    return data.data.status;
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        return 'timeout';
    } catch (error) {
        console.log('❌ Errore monitoraggio:', error.message);
        return 'error';
    }
}

async function step4_result(token, importId) {
    console.log('\n📊 STEP 4: RISULTATO');
    try {
        const response = await fetch(`http://localhost:3001/api/unified-import/result/${importId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ Risultato ottenuto');
            const result = data.data;
            console.log(`📁 File: ${result.fileName}`);
            console.log(`📊 Totali: ${result.totalRows}`);
            console.log(`✅ Inserite: ${result.insertedRows}`);
            console.log(`❌ Errori: ${result.errorRows}`);
            return result;
        } else {
            console.log('❌ Errore nel risultato:', data.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Errore risultato:', error.message);
        return null;
    }
}

async function runTest() {
    const token = await step1_login();
    if (!token) return;
    
    const importId = await step2_upload(token);
    if (!importId) return;
    
    const status = await step3_monitor(token, importId);
    console.log(`\n🏁 Status finale: ${status}`);
    
    if (status === 'completed') {
        await step4_result(token, importId);
    }
    
    console.log('\n🎯 TEST COMPLETATO');
}

runTest().catch(console.error);