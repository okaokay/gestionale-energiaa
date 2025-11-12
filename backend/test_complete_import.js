const { UnifiedImportService } = require('./dist/services/unifiedImportService');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Test completo dell'import CSV
async function testCompleteImport() {
    console.log('🧪 TEST IMPORT COMPLETO CSV');
    console.log('============================');
    
    const csvPath = path.join(__dirname, '..', 'import_10_clienti_completi_super_import.csv');
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    
    console.log('📁 File CSV:', csvPath);
    console.log('🗄️ Database:', dbPath);
    
    // Verifica stato iniziale del database
    console.log('\\n🔍 STATO INIZIALE DATABASE');
    console.log('---------------------------');
    
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Conta record iniziali
        const initialCounts = await Promise.all([
            new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM clienti_privati", (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            }),
            new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM contratti_luce", (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            }),
            new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM contratti_gas", (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            })
        ]);
        
        console.log(`Clienti privati iniziali: ${initialCounts[0]}`);
        console.log(`Contratti luce iniziali: ${initialCounts[1]}`);
        console.log(`Contratti gas iniziali: ${initialCounts[2]}`);
        
        // Esegui l'import
        console.log('\\n🚀 ESECUZIONE IMPORT');
        console.log('--------------------');
        
        const importService = new UnifiedImportService();
        
        // Leggi il file CSV come buffer
        const fileBuffer = fs.readFileSync(csvPath);
        const fileName = path.basename(csvPath);
        
        const result = await importService.importFile(fileBuffer, fileName, {
            userId: 1,
            confidenceThreshold: 0.7
        });
        
        console.log('\\n📊 RISULTATO IMPORT');
        console.log('-------------------');
        console.log('Risultato:', JSON.stringify(result, null, 2));
        
        // Verifica stato finale del database
        console.log('\\n🔍 STATO FINALE DATABASE');
        console.log('-------------------------');
        
        const finalCounts = await Promise.all([
            new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM clienti_privati", (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            }),
            new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM contratti_luce", (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            }),
            new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM contratti_gas", (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            })
        ]);
        
        console.log(`Clienti privati finali: ${finalCounts[0]}`);
        console.log(`Contratti luce finali: ${finalCounts[1]}`);
        console.log(`Contratti gas finali: ${finalCounts[2]}`);
        
        // Calcola differenze
        const clientiInseriti = finalCounts[0] - initialCounts[0];
        const contrattiLuceInseriti = finalCounts[1] - initialCounts[1];
        const contrattiGasInseriti = finalCounts[2] - initialCounts[2];
        
        console.log('\\n📈 RECORD INSERITI');
        console.log('------------------');
        console.log(`Clienti privati: +${clientiInseriti}`);
        console.log(`Contratti luce: +${contrattiLuceInseriti}`);
        console.log(`Contratti gas: +${contrattiGasInseriti}`);
        
        // Verifica dettagli dei contratti inseriti
        if (contrattiLuceInseriti > 0) {
            console.log('\\n💡 DETTAGLI CONTRATTI LUCE');
            console.log('---------------------------');
            
            const contrattiLuce = await new Promise((resolve, reject) => {
                db.all("SELECT * FROM contratti_luce ORDER BY id DESC LIMIT 5", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            contrattiLuce.forEach((contratto, index) => {
                console.log(`${index + 1}. POD: ${contratto.pod}, Fornitore: ${contratto.fornitore}, Cliente ID: ${contratto.cliente_id}`);
            });
        }
        
        if (contrattiGasInseriti > 0) {
            console.log('\\n🔥 DETTAGLI CONTRATTI GAS');
            console.log('--------------------------');
            
            const contrattiGas = await new Promise((resolve, reject) => {
                db.all("SELECT * FROM contratti_gas ORDER BY id DESC LIMIT 5", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            contrattiGas.forEach((contratto, index) => {
                console.log(`${index + 1}. PDR: ${contratto.pdr}, Fornitore: ${contratto.fornitore}, Cliente ID: ${contratto.cliente_id}`);
            });
        }
        
        // Valutazione finale
        console.log('\\n🎯 VALUTAZIONE FINALE');
        console.log('---------------------');
        
        const success = result.success && 
                       clientiInseriti > 0 && 
                       contrattiLuceInseriti > 0 && 
                       contrattiGasInseriti > 0;
        
        if (success) {
            console.log('✅ IMPORT COMPLETATO CON SUCCESSO!');
            console.log('   - Clienti inseriti correttamente');
            console.log('   - Contratti luce inseriti correttamente');
            console.log('   - Contratti gas inseriti correttamente');
            console.log('\\n🎉 Il bug dell\'import è stato risolto!');
        } else {
            console.log('❌ IMPORT FALLITO O INCOMPLETO');
            if (clientiInseriti === 0) console.log('   - Nessun cliente inserito');
            if (contrattiLuceInseriti === 0) console.log('   - Nessun contratto luce inserito');
            if (contrattiGasInseriti === 0) console.log('   - Nessun contratto gas inserito');
        }
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error);
    } finally {
        db.close();
    }
}

// Esegui il test
testCompleteImport().catch(console.error);