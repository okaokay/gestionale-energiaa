const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Configurazione database
const dbPath = './gestionale_energia.db';
const db = new Database(dbPath);

console.log('🧪 TEST COMPLETO IMPORTAZIONE CLIENTI E CONTRATTI');
console.log('='.repeat(60));

async function testCompleteImport() {
    try {
        // 1. Stato iniziale del database
        console.log('\n📊 STATO INIZIALE DEL DATABASE:');
        
        const clientiPrivati = db.prepare('SELECT COUNT(*) as count FROM clienti_privati').get();
        const clientiAziende = db.prepare('SELECT COUNT(*) as count FROM clienti_aziende').get();
        const contrattiLuce = db.prepare('SELECT COUNT(*) as count FROM contratti_luce').get();
        const contrattiGas = db.prepare('SELECT COUNT(*) as count FROM contratti_gas').get();
        
        console.log(`   Clienti Privati: ${clientiPrivati.count}`);
        console.log(`   Clienti Aziende: ${clientiAziende.count}`);
        console.log(`   Contratti Luce: ${contrattiLuce.count}`);
        console.log(`   Contratti Gas: ${contrattiGas.count}`);

        // 2. Test importazione file con contratti
        console.log('\n🔄 TEST IMPORTAZIONE FILE CON CONTRATTI:');
        
        const testFiles = [
            'test_contratti_corretto.csv',
            'test_super_admin_complete.csv'
        ];

        for (const fileName of testFiles) {
            const filePath = path.join(__dirname, fileName);
            
            if (!fs.existsSync(filePath)) {
                console.log(`   ⚠️ File ${fileName} non trovato, skip`);
                continue;
            }

            console.log(`\n   📁 Testando file: ${fileName}`);
            
            try {
                // Simula chiamata API di importazione
                const { UnifiedImportService } = require('./dist/services/unifiedImportService');
                const importService = new UnifiedImportService();
                
                const fileBuffer = fs.readFileSync(filePath);
                const result = await importService.importFile(fileBuffer, fileName, {
                    dryRun: false,
                    skipValidation: false,
                    skipAssociation: false,
                    confidenceThreshold: 0.7,
                    batchSize: 100
                });

                console.log(`   ✅ Importazione completata:`);
                console.log(`      - Righe totali: ${result.totalRows}`);
                console.log(`      - Righe processate: ${result.processedRows}`);
                console.log(`      - Righe inserite: ${result.insertedRows}`);
                console.log(`      - Righe aggiornate: ${result.updatedRows}`);
                console.log(`      - Righe saltate: ${result.skippedRows}`);
                console.log(`      - Righe con errori: ${result.errorRows}`);

                if (result.insertedRecords) {
                    Object.entries(result.insertedRecords).forEach(([type, records]) => {
                        if (records.length > 0) {
                            console.log(`      - ${type}: ${records.length} record`);
                        }
                    });
                }

            } catch (error) {
                console.log(`   ❌ Errore importazione: ${error.message}`);
                console.log(`   📋 Stack trace:`, error.stack);
            }
        }

        // 3. Stato finale del database
        console.log('\n📊 STATO FINALE DEL DATABASE:');
        
        const clientiPrivatiFinal = db.prepare('SELECT COUNT(*) as count FROM clienti_privati').get();
        const clientiAziendeFinal = db.prepare('SELECT COUNT(*) as count FROM clienti_aziende').get();
        const contrattiLuceFinal = db.prepare('SELECT COUNT(*) as count FROM contratti_luce').get();
        const contrattiGasFinal = db.prepare('SELECT COUNT(*) as count FROM contratti_gas').get();
        
        console.log(`   Clienti Privati: ${clientiPrivatiFinal.count} (+${clientiPrivatiFinal.count - clientiPrivati.count})`);
        console.log(`   Clienti Aziende: ${clientiAziendeFinal.count} (+${clientiAziendeFinal.count - clientiAziende.count})`);
        console.log(`   Contratti Luce: ${contrattiLuceFinal.count} (+${contrattiLuceFinal.count - contrattiLuce.count})`);
        console.log(`   Contratti Gas: ${contrattiGasFinal.count} (+${contrattiGasFinal.count - contrattiGas.count})`);

        // 4. Verifica associazioni clienti-contratti
        console.log('\n🔗 VERIFICA ASSOCIAZIONI CLIENTI-CONTRATTI:');
        
        // Contratti luce con clienti privati
        const contrattiLucePrivati = db.prepare(`
            SELECT cl.id, cl.pod, cl.fornitore, cp.nome, cp.cognome 
            FROM contratti_luce cl 
            JOIN clienti_privati cp ON cl.cliente_privato_id = cp.id
        `).all();
        
        console.log(`   Contratti Luce → Clienti Privati: ${contrattiLucePrivati.length}`);
        contrattiLucePrivati.forEach(c => {
            console.log(`      - POD: ${c.pod} | Cliente: ${c.nome} ${c.cognome} | Fornitore: ${c.fornitore}`);
        });

        // Contratti luce con clienti aziende
        const contrattiLuceAziende = db.prepare(`
            SELECT cl.id, cl.pod, cl.fornitore, ca.ragione_sociale 
            FROM contratti_luce cl 
            JOIN clienti_aziende ca ON cl.cliente_azienda_id = ca.id
        `).all();
        
        console.log(`   Contratti Luce → Clienti Aziende: ${contrattiLuceAziende.length}`);
        contrattiLuceAziende.forEach(c => {
            console.log(`      - POD: ${c.pod} | Azienda: ${c.ragione_sociale} | Fornitore: ${c.fornitore}`);
        });

        // Contratti gas con clienti privati
        const contrattiGasPrivati = db.prepare(`
            SELECT cg.id, cg.pdr, cg.fornitore, cp.nome, cp.cognome 
            FROM contratti_gas cg 
            JOIN clienti_privati cp ON cg.cliente_privato_id = cp.id
        `).all();
        
        console.log(`   Contratti Gas → Clienti Privati: ${contrattiGasPrivati.length}`);
        contrattiGasPrivati.forEach(c => {
            console.log(`      - PDR: ${c.pdr} | Cliente: ${c.nome} ${c.cognome} | Fornitore: ${c.fornitore}`);
        });

        // Contratti gas con clienti aziende
        const contrattiGasAziende = db.prepare(`
            SELECT cg.id, cg.pdr, cg.fornitore, ca.ragione_sociale 
            FROM contratti_gas cg 
            JOIN clienti_aziende ca ON cg.cliente_azienda_id = ca.id
        `).all();
        
        console.log(`   Contratti Gas → Clienti Aziende: ${contrattiGasAziende.length}`);
        contrattiGasAziende.forEach(c => {
            console.log(`      - PDR: ${c.pdr} | Azienda: ${c.ragione_sociale} | Fornitore: ${c.fornitore}`);
        });

        // 5. Verifica clienti senza contratti
        console.log('\n⚠️ CLIENTI SENZA CONTRATTI:');
        
        const clientiPrivatiSenzaContratti = db.prepare(`
            SELECT cp.id, cp.nome, cp.cognome, cp.codice_fiscale
            FROM clienti_privati cp
            WHERE cp.id NOT IN (
                SELECT DISTINCT cliente_privato_id FROM contratti_luce WHERE cliente_privato_id IS NOT NULL
                UNION
                SELECT DISTINCT cliente_privato_id FROM contratti_gas WHERE cliente_privato_id IS NOT NULL
            )
        `).all();
        
        console.log(`   Clienti Privati senza contratti: ${clientiPrivatiSenzaContratti.length}`);
        clientiPrivatiSenzaContratti.forEach(c => {
            console.log(`      - ${c.nome} ${c.cognome} (${c.codice_fiscale})`);
        });

        const clientiAziendeSenzaContratti = db.prepare(`
            SELECT ca.id, ca.ragione_sociale, ca.partita_iva
            FROM clienti_aziende ca
            WHERE ca.id NOT IN (
                SELECT DISTINCT cliente_azienda_id FROM contratti_luce WHERE cliente_azienda_id IS NOT NULL
                UNION
                SELECT DISTINCT cliente_azienda_id FROM contratti_gas WHERE cliente_azienda_id IS NOT NULL
            )
        `).all();
        
        console.log(`   Clienti Aziende senza contratti: ${clientiAziendeSenzaContratti.length}`);
        clientiAziendeSenzaContratti.forEach(c => {
            console.log(`      - ${c.ragione_sociale} (${c.partita_iva})`);
        });

        // 6. Riepilogo finale
        console.log('\n📋 RIEPILOGO FINALE:');
        const totalClienti = clientiPrivatiFinal.count + clientiAziendeFinal.count;
        const totalContratti = contrattiLuceFinal.count + contrattiGasFinal.count;
        const clientiConContratti = contrattiLucePrivati.length + contrattiLuceAziende.length + 
                                   contrattiGasPrivati.length + contrattiGasAziende.length;
        
        console.log(`   📊 Totale Clienti: ${totalClienti}`);
        console.log(`   📊 Totale Contratti: ${totalContratti}`);
        console.log(`   📊 Associazioni Cliente-Contratto: ${clientiConContratti}`);
        console.log(`   📊 Tasso di associazione: ${totalContratti > 0 ? ((clientiConContratti / totalContratti) * 100).toFixed(1) : 0}%`);

        if (totalContratti > 0) {
            console.log('\n✅ SISTEMA DI IMPORTAZIONE CONTRATTI FUNZIONANTE!');
        } else {
            console.log('\n❌ PROBLEMA: Nessun contratto importato!');
        }

    } catch (error) {
        console.error('❌ Errore durante il test:', error);
    } finally {
        db.close();
    }
}

// Esegui il test
testCompleteImport().then(() => {
    console.log('\n🏁 Test completato!');
}).catch(error => {
    console.error('❌ Errore fatale:', error);
});