const fs = require('fs');
const path = require('path');

// Simula l'importazione di un file CSV per debug
async function debugContractImport() {
    console.log('🔍 DEBUG IMPORTAZIONE CONTRATTI DA CSV');
    console.log('='.repeat(60));
    
    try {
        // Leggi uno dei file CSV che dovrebbe contenere contratti
        const csvFiles = [
            'test_import_completo.csv',
            'clienti_misti_con_contratti.csv',
            'import_10_clienti_completi_super_import.csv'
        ];
        
        for (const fileName of csvFiles) {
            const filePath = path.join(__dirname, fileName);
            
            if (fs.existsSync(filePath)) {
                console.log(`\n📄 Analizzando file: ${fileName}`);
                console.log('-'.repeat(40));
                
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());
                
                console.log(`📊 Righe totali: ${lines.length}`);
                
                if (lines.length > 0) {
                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                    console.log(`📋 Headers: ${headers.join(', ')}`);
                    
                    // Cerca campi relativi ai contratti
                    const contractFields = headers.filter(h => 
                        h.toLowerCase().includes('pod') || 
                        h.toLowerCase().includes('pdr') || 
                        h.toLowerCase().includes('contratto') ||
                        h.toLowerCase().includes('fornitore') ||
                        h.toLowerCase().includes('commodity')
                    );
                    
                    console.log(`🔌 Campi contratto trovati: ${contractFields.join(', ')}`);
                    
                    // Analizza le prime 3 righe di dati
                    console.log('\n📝 Analisi prime 3 righe di dati:');
                    for (let i = 1; i <= Math.min(4, lines.length - 1); i++) {
                        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                        console.log(`\nRiga ${i}:`);
                        
                        headers.forEach((header, index) => {
                            const value = values[index] || '';
                            if (contractFields.includes(header) && value) {
                                console.log(`  ${header}: ${value}`);
                            }
                        });
                        
                        // Verifica se ci sono POD/PDR
                        const podIndex = headers.findIndex(h => h.toLowerCase().includes('pod'));
                        const pdrIndex = headers.findIndex(h => h.toLowerCase().includes('pdr'));
                        const podPdrIndex = headers.findIndex(h => h.toLowerCase().includes('pod_pdr'));
                        
                        if (podIndex >= 0 && values[podIndex]) {
                            console.log(`  ⚡ POD rilevato: ${values[podIndex]}`);
                        }
                        if (pdrIndex >= 0 && values[pdrIndex]) {
                            console.log(`  🔥 PDR rilevato: ${values[pdrIndex]}`);
                        }
                        if (podPdrIndex >= 0 && values[podPdrIndex]) {
                            console.log(`  🔌 POD_PDR rilevato: ${values[podPdrIndex]} (NECESSITA SEPARAZIONE)`);
                        }
                    }
                }
                
                console.log('\n' + '='.repeat(40));
            } else {
                console.log(`⚠️ File non trovato: ${fileName}`);
            }
        }
        
        // Test di chiamata diretta all'API di importazione
        console.log('\n🚀 TEST CHIAMATA API IMPORTAZIONE');
        console.log('='.repeat(60));
        
        const testFile = 'test_import_completo.csv';
        const testFilePath = path.join(__dirname, testFile);
        
        if (fs.existsSync(testFilePath)) {
            console.log(`📤 Preparazione test con file: ${testFile}`);
            
            // Simula la chiamata HTTP
            const FormData = require('form-data');
            const axios = require('axios');
            
            const form = new FormData();
            form.append('file', fs.createReadStream(testFilePath));
            form.append('forceRecordType', 'auto'); // Lascia che il sistema rilevi automaticamente
            
            try {
                console.log('📡 Invio richiesta a http://localhost:3001/api/clienti/import-advanced...');
                
                const response = await axios.post('http://localhost:3001/api/clienti/import-advanced', form, {
                    headers: {
                        ...form.getHeaders(),
                        'Authorization': 'Bearer test-token' // Token di test
                    },
                    timeout: 30000
                });
                
                console.log('✅ Risposta ricevuta:');
                console.log('Status:', response.status);
                console.log('Data:', JSON.stringify(response.data, null, 2));
                
                // Analizza i risultati
                if (response.data.success) {
                    console.log('\n📊 ANALISI RISULTATI:');
                    console.log(`- Righe totali: ${response.data.totalRows}`);
                    console.log(`- Righe processate: ${response.data.processedRows}`);
                    console.log(`- Righe inserite: ${response.data.insertedRows}`);
                    console.log(`- Righe aggiornate: ${response.data.updatedRows}`);
                    console.log(`- Righe saltate: ${response.data.skippedRows}`);
                    console.log(`- Righe con errori: ${response.data.errorRows}`);
                    
                    if (response.data.detectionResult) {
                        console.log(`\n🔍 RILEVAMENTO TIPO:`)
                        console.log(`- Tipo rilevato: ${response.data.detectionResult.detectedType}`);
                        console.log(`- Confidenza: ${response.data.detectionResult.confidence}%`);
                    }
                    
                    if (response.data.insertedRecords) {
                        console.log('\n📝 RECORD INSERITI PER TIPO:');
                        Object.entries(response.data.insertedRecords).forEach(([type, records]) => {
                            console.log(`- ${type}: ${records.length} record`);
                        });
                    }
                    
                    if (response.data.errorReport && response.data.errorReport.errors.length > 0) {
                        console.log('\n❌ ERRORI RILEVATI:');
                        response.data.errorReport.errors.slice(0, 5).forEach((error, index) => {
                            console.log(`${index + 1}. Riga ${error.rowNumber}: ${error.message}`);
                        });
                    }
                } else {
                    console.log('❌ Importazione fallita:', response.data.error);
                }
                
            } catch (apiError) {
                console.log('❌ Errore chiamata API:', apiError.message);
                if (apiError.response) {
                    console.log('Status:', apiError.response.status);
                    console.log('Data:', apiError.response.data);
                }
            }
        } else {
            console.log(`⚠️ File di test non trovato: ${testFile}`);
        }
        
    } catch (error) {
        console.error('❌ Errore durante il debug:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Esegui il debug
debugContractImport();