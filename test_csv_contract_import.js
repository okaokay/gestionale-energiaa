/**
 * Test specifico per l'importazione CSV dei contratti
 * Verifica che i contratti vengano correttamente importati dal file CSV
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configurazione database
const dbPath = path.join(__dirname, 'gestionale_energia.db');

async function testCsvContractImport() {
    console.log('🧪 TEST IMPORTAZIONE CSV CONTRATTI');
    console.log('=' .repeat(50));

    try {
        // 1. Verifica che il file CSV esista
        const csvPath = path.join(__dirname, 'test_import_corretto.csv');
        if (!fs.existsSync(csvPath)) {
            console.error('❌ File CSV non trovato:', csvPath);
            return;
        }

        console.log('✅ File CSV trovato:', csvPath);

        // 2. Leggi il contenuto del CSV
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n');
        console.log(`📄 Righe nel CSV: ${lines.length}`);

        // 3. Analizza le righe per identificare i contratti
        const headers = lines[0].split(',');
        console.log('📋 Headers CSV:', headers);

        // Cerca campi specifici dei contratti
        const contractFields = {
            luce: ['tipo_contratto', 'numero_contratto', 'pod', 'fornitore', 'commodity'],
            gas: ['tipo_contratto', 'numero_contratto', 'pdr', 'fornitore', 'commodity']
        };

        let hasContractFields = false;
        for (const field of [...contractFields.luce, ...contractFields.gas]) {
            if (headers.includes(field)) {
                hasContractFields = true;
                console.log(`✅ Campo contratto trovato: ${field}`);
            }
        }

        if (!hasContractFields) {
            console.error('❌ Nessun campo contratto trovato nel CSV');
            return;
        }

        // 4. Conta le righe con dati di contratto
        let contractRows = 0;
        let luceContracts = 0;
        let gasContracts = 0;

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = lines[i].split(',');
            const record = {};
            headers.forEach((header, index) => {
                record[header] = values[index] || '';
            });

            // Verifica se la riga contiene dati di contratto
            if (record.tipo_contratto || record.numero_contratto || record.pod || record.pdr) {
                contractRows++;
                
                if (record.pod && record.pod.trim() !== '') {
                    luceContracts++;
                    console.log(`🔌 Contratto Luce trovato: POD=${record.pod}, Numero=${record.numero_contratto}`);
                }
                
                if (record.pdr && record.pdr.trim() !== '') {
                    gasContracts++;
                    console.log(`🔥 Contratto Gas trovato: PDR=${record.pdr}, Numero=${record.numero_contratto}`);
                }
            }
        }

        console.log(`\n📊 STATISTICHE CONTRATTI NEL CSV:`);
        console.log(`   Righe con dati contratto: ${contractRows}`);
        console.log(`   Contratti Luce: ${luceContracts}`);
        console.log(`   Contratti Gas: ${gasContracts}`);

        // 5. Verifica stato database prima dell'import
        console.log('\n🗄️ VERIFICA DATABASE PRIMA DELL\'IMPORT:');
        const db = new sqlite3.Database(dbPath);
        
        const countBefore = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    (SELECT COUNT(*) FROM contratti_luce) as luce_count,
                    (SELECT COUNT(*) FROM contratti_gas) as gas_count
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]);
            });
        });

        console.log(`   Contratti Luce nel DB: ${countBefore.luce_count}`);
        console.log(`   Contratti Gas nel DB: ${countBefore.gas_count}`);

        // 6. Test del servizio di import
        console.log('\n🚀 TEST SERVIZIO IMPORT:');
        
        // Simula una chiamata API di import
        const fileBuffer = Buffer.from(csvContent, 'utf8');
        
        // Importa il servizio (se compilato)
        let importResult = null;
        try {
            const { UnifiedImportService } = require('./backend/dist/services/unifiedImportService');
            const importService = new UnifiedImportService();
            
            console.log('📤 Avvio import CSV...');
            importResult = await importService.importFile(
                fileBuffer,
                'test_import_corretto.csv',
                {
                    dryRun: false, // Import reale
                    confidenceThreshold: 0.5,
                    batchSize: 100,
                    skipValidation: false
                }
            );

            console.log(`✅ Import completato: ${importResult.success}`);
            console.log(`📊 Righe totali: ${importResult.totalRows}`);
            console.log(`📊 Righe processate: ${importResult.processedRows}`);
            console.log(`📊 Righe inserite: ${importResult.insertedRows}`);
            console.log(`📊 Righe aggiornate: ${importResult.updatedRows}`);
            console.log(`📊 Righe con errori: ${importResult.errorRows}`);

            if (importResult.insertedRecords) {
                console.log('\n📋 RECORD INSERITI PER TIPO:');
                Object.keys(importResult.insertedRecords).forEach(type => {
                    const count = importResult.insertedRecords[type].length;
                    console.log(`   ${type}: ${count} record`);
                });
            }

        } catch (error) {
            console.error('❌ Errore durante l\'import:', error.message);
            console.log('💡 Suggerimento: Assicurati che il backend sia compilato (npm run build)');
        }

        // 7. Verifica stato database dopo l'import
        console.log('\n🗄️ VERIFICA DATABASE DOPO L\'IMPORT:');
        
        const countAfter = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    (SELECT COUNT(*) FROM contratti_luce) as luce_count,
                    (SELECT COUNT(*) FROM contratti_gas) as gas_count
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]);
            });
        });

        console.log(`   Contratti Luce nel DB: ${countAfter.luce_count} (era ${countBefore.luce_count})`);
        console.log(`   Contratti Gas nel DB: ${countAfter.gas_count} (era ${countBefore.gas_count})`);

        const luceAdded = countAfter.luce_count - countBefore.luce_count;
        const gasAdded = countAfter.gas_count - countBefore.gas_count;

        console.log(`\n📈 CONTRATTI AGGIUNTI:`);
        console.log(`   Luce: +${luceAdded}`);
        console.log(`   Gas: +${gasAdded}`);

        // 8. Verifica dettagli contratti aggiunti
        if (luceAdded > 0 || gasAdded > 0) {
            console.log('\n🔍 DETTAGLI ULTIMI CONTRATTI AGGIUNTI:');
            
            if (luceAdded > 0) {
                const latestLuce = await new Promise((resolve, reject) => {
                    db.all(`
                        SELECT numero_contratto, pod, fornitore, stato, created_at
                        FROM contratti_luce 
                        ORDER BY created_at DESC 
                        LIMIT ${luceAdded}
                    `, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                console.log('   Contratti Luce aggiunti:');
                latestLuce.forEach(contract => {
                    console.log(`     - ${contract.numero_contratto} (POD: ${contract.pod}, Fornitore: ${contract.fornitore})`);
                });
            }

            if (gasAdded > 0) {
                const latestGas = await new Promise((resolve, reject) => {
                    db.all(`
                        SELECT numero_contratto, pdr, fornitore, stato, created_at
                        FROM contratti_gas 
                        ORDER BY created_at DESC 
                        LIMIT ${gasAdded}
                    `, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });

                console.log('   Contratti Gas aggiunti:');
                latestGas.forEach(contract => {
                    console.log(`     - ${contract.numero_contratto} (PDR: ${contract.pdr}, Fornitore: ${contract.fornitore})`);
                });
            }
        }

        db.close();

        // 9. Conclusioni
        console.log('\n🎯 CONCLUSIONI:');
        if (luceAdded === 0 && gasAdded === 0) {
            console.log('❌ PROBLEMA: Nessun contratto è stato importato dal CSV');
            console.log('💡 Possibili cause:');
            console.log('   - Errori nel rilevamento del tipo di record');
            console.log('   - Problemi nella validazione dei dati');
            console.log('   - Errori nell\'associazione cliente-contratto');
            console.log('   - Contratti già esistenti (UPSERT)');
        } else {
            console.log('✅ SUCCESS: Contratti importati correttamente dal CSV');
        }

    } catch (error) {
        console.error('❌ Errore durante il test:', error);
    }
}

// Esegui il test
testCsvContractImport().catch(console.error);