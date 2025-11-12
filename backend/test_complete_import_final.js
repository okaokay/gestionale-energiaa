const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3001/api';
let authToken = null;

// Funzione per il login
async function login() {
    try {
        console.log('🔐 FASE 1: Login...');
        
        const response = await axios.post(`${API_BASE}/auth/login`, {
             email: 'admin@gestionale.it',
             password: 'Admin123!'
         });
        
        if (response.data.success && response.data.data && response.data.data.token) {
            authToken = response.data.data.token;
            console.log('✅ Login effettuato con successo');
            return true;
        } else {
            console.error('❌ Login fallito:', response.data);
            return false;
        }
    } catch (error) {
        console.error('❌ Errore durante il login:', error.response?.data || error.message);
        return false;
    }
}

// Funzione per testare l'upload del file (asincrono)
async function testFileUpload() {
    try {
        console.log('\n📤 FASE 2: Upload file CSV (asincrono)...');
        
        const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
        
        if (!fs.existsSync(csvPath)) {
            console.error(`❌ File CSV non trovato: ${csvPath}`);
            return null;
        }
        
        console.log(`📁 File: ${csvPath}`);
        console.log(`📊 Dimensione: ${fs.statSync(csvPath).size} bytes`);
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(csvPath));
        
        const response = await axios.post(`${API_BASE}/unified-import/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${authToken}`
            },
            timeout: 30000
        });
        
        console.log('✅ Upload avviato con successo');
        console.log('📋 Risposta server:');
        console.log(`   🆔 Import ID: ${response.data.data?.importId}`);
        console.log(`   📝 Messaggio: ${response.data.data?.message}`);
        
        return response.data.data?.importId;
        
    } catch (error) {
        console.error('❌ Errore durante l\'upload:', error.response?.data || error.message);
        return null;
    }
}

// Funzione per monitorare il progresso dell'import
async function monitorImportProgress(importId) {
    try {
        console.log(`\n⏳ FASE 3: Monitoraggio progresso import ${importId}...`);
        
        let attempts = 0;
        const maxAttempts = 30; // 30 tentativi = 30 secondi
        
        while (attempts < maxAttempts) {
            try {
                const response = await axios.get(`${API_BASE}/unified-import/progress/${importId}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                const progress = response.data.data;
                console.log(`📊 Progresso: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
                
                if (progress.errors > 0) {
                    console.log(`⚠️ Errori: ${progress.errors}`);
                }
                
                if (progress.warnings > 0) {
                    console.log(`⚠️ Warning: ${progress.warnings}`);
                }
                
                // Se completato o fallito, esci dal loop
                if (progress.stage === 'completed' || progress.stage === 'failed') {
                    return progress;
                }
                
                // Aspetta 1 secondo prima del prossimo controllo
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
                
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log('⏳ Import non ancora disponibile, riprovo...');
                } else {
                    console.error('❌ Errore nel controllo progresso:', error.response?.data || error.message);
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }
        }
        
        console.log('⏰ Timeout raggiunto nel monitoraggio del progresso');
        return null;
        
    } catch (error) {
        console.error('❌ Errore durante il monitoraggio:', error.message);
        return null;
    }
}

// Funzione per ottenere il risultato finale dell'import
async function getImportResult(importId) {
    try {
        console.log(`\n📊 FASE 4: Recupero risultato finale import ${importId}...`);
        
        const response = await axios.get(`${API_BASE}/unified-import/result/${importId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = response.data.data;
        console.log('✅ Risultato finale recuperato:');
        console.log(`   📊 Righe totali: ${result.totalRows}`);
        console.log(`   ✅ Righe inserite: ${result.insertedRows}`);
        console.log(`   🔄 Righe aggiornate: ${result.updatedRows}`);
        console.log(`   ⏭️ Righe saltate: ${result.skippedRows}`);
        console.log(`   ❌ Righe con errori: ${result.errorRows}`);
        console.log(`   ⏱️ Durata: ${result.duration}ms`);
        
        if (result.detectionResult) {
            console.log(`   🔍 Tipo rilevato: ${result.detectionResult.detectedType} (confidenza: ${result.detectionResult.confidence})`);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Errore nel recupero risultato:', error.response?.data || error.message);
        return null;
    }
}

// Funzione per verificare i dati nel database
async function verifyImportedData() {
    try {
        console.log('\n🔍 FASE 5: Verifica dati importati...');
        
        // Verifica clienti
        const clientiResponse = await axios.get(`${API_BASE}/clienti`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log(`👥 Clienti trovati: ${clientiResponse.data.data?.length || 0}`);
        
        // Verifica contratti luce
        const contrattiLuceResponse = await axios.get(`${API_BASE}/contratti/luce`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log(`💡 Contratti luce trovati: ${contrattiLuceResponse.data.data?.length || 0}`);
        
        // Verifica contratti gas
        const contrattiGasResponse = await axios.get(`${API_BASE}/contratti/gas`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        console.log(`🔥 Contratti gas trovati: ${contrattiGasResponse.data.data?.length || 0}`);
        
        return {
            clienti: clientiResponse.data.data?.length || 0,
            contrattiLuce: contrattiLuceResponse.data.data?.length || 0,
            contrattiGas: contrattiGasResponse.data.data?.length || 0
        };
        
    } catch (error) {
        console.error('❌ Errore nella verifica dati:', error.response?.data || error.message);
        return null;
    }
}

// Funzione principale
async function runCompleteImportTest() {
    console.log('🚀 TEST IMPORT COMPLETO CSV - VERSIONE ASINCRONA');
    console.log('='.repeat(60));
    
    try {
        // 1. Login
        const loginSuccess = await login();
        if (!loginSuccess) {
            console.error('❌ Test fallito: impossibile effettuare il login');
            return;
        }
        
        // 2. Upload file (avvia import asincrono)
        const importId = await testFileUpload();
        if (!importId) {
            console.error('❌ Test fallito: impossibile avviare l\'import');
            return;
        }
        
        // 3. Monitora progresso
        const finalProgress = await monitorImportProgress(importId);
        if (!finalProgress) {
            console.error('❌ Test fallito: impossibile monitorare il progresso');
            return;
        }
        
        // 4. Ottieni risultato finale
        const importResult = await getImportResult(importId);
        if (!importResult) {
            console.error('❌ Test fallito: impossibile ottenere il risultato finale');
            return;
        }
        
        // 5. Verifica dati nel database
        const verificationResult = await verifyImportedData();
        if (!verificationResult) {
            console.error('❌ Test fallito: impossibile verificare i dati');
            return;
        }
        
        // Riepilogo finale
        console.log('\n🎉 RIEPILOGO FINALE');
        console.log('='.repeat(40));
        console.log(`✅ Import completato con successo!`);
        console.log(`📊 Stato finale: ${finalProgress.stage}`);
        console.log(`📈 Progresso: ${finalProgress.progress}%`);
        console.log(`📝 Messaggio: ${finalProgress.message}`);
        console.log(`👥 Clienti nel database: ${verificationResult.clienti}`);
        console.log(`💡 Contratti luce nel database: ${verificationResult.contrattiLuce}`);
        console.log(`🔥 Contratti gas nel database: ${verificationResult.contrattiGas}`);
        
        if (finalProgress.stage === 'completed' && importResult.insertedRows > 0) {
            console.log('\n🎯 TEST COMPLETATO CON SUCCESSO! 🎯');
        } else {
            console.log('\n⚠️ TEST COMPLETATO MA CON PROBLEMI ⚠️');
        }
        
    } catch (error) {
        console.error('❌ Errore generale nel test:', error.message);
    }
}

// Avvia il test
runCompleteImportTest();