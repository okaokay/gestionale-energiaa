const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function testImport() {
    try {
        console.log('🔐 Login con credenziali corrette...');
        
        // Login con credenziali corrette
        const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@gestionale.it',
                password: 'Admin123!'
            })
        });

        const loginData = await loginResponse.json();
        console.log('📊 Risposta login:', JSON.stringify(loginData, null, 2));
        
        if (!loginData.success) {
            throw new Error('Login fallito');
        }

        const token = loginData.data.token;
        console.log('✅ Login OK - Token ottenuto');

        // Preparazione file
        const csvContent = fs.readFileSync('./test_contratti_corretto.csv');
        const formData = new FormData();
        formData.append('file', csvContent, {
            filename: 'test_contratti_corretto.csv',
            contentType: 'text/csv'
        });
        formData.append('entityType', 'contratti');

        console.log('🚀 Invio importazione...');

        // Import
        const importResponse = await fetch('http://localhost:3001/api/unified-import/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        const importData = await importResponse.json();
        console.log('📊 Risposta importazione:', JSON.stringify(importData, null, 2));

        if (importData.success && importData.data.importId) {
            const importId = importData.data.importId;
            console.log(`⏳ Monitoraggio importazione: ${importId}`);

            // Monitora il progresso
            let attempts = 0;
            const maxAttempts = 15;
            
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;
                
                try {
                    const progressResponse = await fetch(`http://localhost:3001/api/unified-import/progress/${importId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    const progressData = await progressResponse.json();
                    console.log(`📊 Tentativo ${attempts}: ${progressData.data.status} - ${progressData.data.progress}% - ${progressData.data.message}`);
                    
                    if (progressData.data.status === 'completed' || progressData.data.status === 'failed') {
                        break;
                    }
                } catch (error) {
                    console.log(`⚠️ Errore nel controllo progresso: ${error.message}`);
                }
            }

            // Ottieni il risultato finale
            try {
                const resultResponse = await fetch(`http://localhost:3001/api/unified-import/result/${importId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const resultData = await resultResponse.json();
                console.log('\n📊 RISULTATO FINALE COMPLETO:');
                console.log('============================');
                console.log(JSON.stringify(resultData, null, 2));
                
                if (resultData.success && resultData.data) {
                    const result = resultData.data;
                    console.log('\n📊 RIEPILOGO:');
                    console.log(`📁 File: ${result.fileName || 'N/A'}`);
                    console.log(`📊 Righe totali: ${result.totalRows || 'N/A'}`);
                    console.log(`📊 Righe processate: ${result.processedRows || 'N/A'}`);
                    console.log(`✅ Righe inserite: ${result.insertedRows || 'N/A'}`);
                    console.log(`🔄 Righe aggiornate: ${result.updatedRows || 'N/A'}`);
                    console.log(`⚠️ Righe saltate: ${result.skippedRows || 'N/A'}`);
                    console.log(`❌ Righe con errori: ${result.errorRows || 'N/A'}`);
                }
            } catch (error) {
                console.error('❌ Errore nel recupero risultato:', error.message);
            }
        }

    } catch (error) {
        console.error('❌ Errore generale:', error.message);
    }
}

testImport();