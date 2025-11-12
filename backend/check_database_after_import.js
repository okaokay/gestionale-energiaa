const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Script per verificare lo stato del database dopo l'import manuale
async function checkDatabaseAfterImport() {
    console.log('🔍 VERIFICA DATABASE DOPO IMPORT MANUALE');
    console.log('=========================================');
    
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Verifica tabelle esistenti
        console.log('\\n📋 TABELLE ESISTENTI');
        console.log('--------------------');
        
        const tables = await new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const tableNames = tables.map(t => t.name);
        console.log('Tabelle trovate:', tableNames.join(', '));
        
        // Verifica presenza tabelle contratti
        const hasContrattiLuce = tableNames.includes('contratti_luce');
        const hasContrattiGas = tableNames.includes('contratti_gas');
        
        console.log(`\\nTabelle contratti:`);
        console.log(`- contratti_luce: ${hasContrattiLuce ? '✅' : '❌'}`);
        console.log(`- contratti_gas: ${hasContrattiGas ? '✅' : '❌'}`);
        
        // Conta record in tutte le tabelle principali
        console.log('\\n📊 CONTEGGIO RECORD');
        console.log('-------------------');
        
        const counts = {};
        
        // Clienti
        if (tableNames.includes('clienti_privati')) {
            counts.clienti_privati = await new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM clienti_privati", (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });
        }
        
        if (tableNames.includes('clienti_aziende')) {
            counts.clienti_aziende = await new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM clienti_aziende", (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });
        }
        
        // Contratti
        if (hasContrattiLuce) {
            counts.contratti_luce = await new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM contratti_luce", (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });
        }
        
        if (hasContrattiGas) {
            counts.contratti_gas = await new Promise((resolve, reject) => {
                db.get("SELECT COUNT(*) as count FROM contratti_gas", (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });
        }
        
        // Mostra conteggi
        Object.entries(counts).forEach(([table, count]) => {
            console.log(`${table}: ${count} record`);
        });
        
        // Dettagli clienti inseriti
        if (counts.clienti_privati > 0) {
            console.log('\\n👥 ULTIMI CLIENTI PRIVATI INSERITI');
            console.log('----------------------------------');
            
            const clienti = await new Promise((resolve, reject) => {
                db.all("SELECT id, nome, cognome, codice_fiscale, created_at FROM clienti_privati ORDER BY id DESC LIMIT 10", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            clienti.forEach((cliente, index) => {
                console.log(`${index + 1}. ID: ${cliente.id}, Nome: ${cliente.nome} ${cliente.cognome}, CF: ${cliente.codice_fiscale}, Creato: ${cliente.created_at}`);
            });
        }
        
        // Dettagli contratti (se esistono)
        if (hasContrattiLuce && counts.contratti_luce > 0) {
            console.log('\\n💡 CONTRATTI LUCE TROVATI');
            console.log('-------------------------');
            
            const contrattiLuce = await new Promise((resolve, reject) => {
                db.all("SELECT id, cliente_id, pod, fornitore, numero_contratto, created_at FROM contratti_luce ORDER BY id DESC LIMIT 5", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            contrattiLuce.forEach((contratto, index) => {
                console.log(`${index + 1}. ID: ${contratto.id}, Cliente: ${contratto.cliente_id}, POD: ${contratto.pod}, Fornitore: ${contratto.fornitore}`);
            });
        }
        
        if (hasContrattiGas && counts.contratti_gas > 0) {
            console.log('\\n🔥 CONTRATTI GAS TROVATI');
            console.log('------------------------');
            
            const contrattiGas = await new Promise((resolve, reject) => {
                db.all("SELECT id, cliente_id, pdr, fornitore, numero_contratto, created_at FROM contratti_gas ORDER BY id DESC LIMIT 5", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            contrattiGas.forEach((contratto, index) => {
                console.log(`${index + 1}. ID: ${contratto.id}, Cliente: ${contratto.cliente_id}, PDR: ${contratto.pdr}, Fornitore: ${contratto.fornitore}`);
            });
        }
        
        // Verifica associazioni cliente-contratto
        if (counts.clienti_privati > 0 && (counts.contratti_luce > 0 || counts.contratti_gas > 0)) {
            console.log('\\n🔗 VERIFICA ASSOCIAZIONI CLIENTE-CONTRATTO');
            console.log('------------------------------------------');
            
            if (counts.contratti_luce > 0) {
                const associazioniLuce = await new Promise((resolve, reject) => {
                    db.all(`
                        SELECT c.nome, c.cognome, cl.pod, cl.fornitore 
                        FROM clienti_privati c 
                        JOIN contratti_luce cl ON c.id = cl.cliente_id 
                        LIMIT 5
                    `, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });
                
                console.log('Associazioni Luce:');
                associazioniLuce.forEach((assoc, index) => {
                    console.log(`  ${index + 1}. ${assoc.nome} ${assoc.cognome} -> POD: ${assoc.pod} (${assoc.fornitore})`);
                });
            }
            
            if (counts.contratti_gas > 0) {
                const associazioniGas = await new Promise((resolve, reject) => {
                    db.all(`
                        SELECT c.nome, c.cognome, cg.pdr, cg.fornitore 
                        FROM clienti_privati c 
                        JOIN contratti_gas cg ON c.id = cg.cliente_id 
                        LIMIT 5
                    `, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });
                
                console.log('Associazioni Gas:');
                associazioniGas.forEach((assoc, index) => {
                    console.log(`  ${index + 1}. ${assoc.nome} ${assoc.cognome} -> PDR: ${assoc.pdr} (${assoc.fornitore})`);
                });
            }
        }
        
        // Analisi finale
        console.log('\\n🎯 ANALISI RISULTATI');
        console.log('--------------------');
        
        const hasClienti = counts.clienti_privati > 0 || counts.clienti_aziende > 0;
        const hasContratti = (counts.contratti_luce || 0) > 0 || (counts.contratti_gas || 0) > 0;
        
        if (hasClienti && !hasContratti) {
            console.log('❌ PROBLEMA IDENTIFICATO: Clienti inseriti ma NESSUN contratto');
            console.log('   - I clienti sono stati importati correttamente');
            console.log('   - I contratti NON sono stati inseriti');
            console.log('   - Possibili cause:');
            console.log('     * Errori durante l\'inserimento dei contratti');
            console.log('     * Problemi di mapping dei campi CSV');
            console.log('     * Vincoli di foreign key non soddisfatti');
            console.log('     * Errori di validazione dei dati contratti');
        } else if (hasClienti && hasContratti) {
            console.log('✅ Import parzialmente riuscito');
            console.log(`   - Clienti: ${counts.clienti_privati || 0} privati, ${counts.clienti_aziende || 0} aziende`);
            console.log(`   - Contratti: ${counts.contratti_luce || 0} luce, ${counts.contratti_gas || 0} gas`);
        } else if (!hasClienti && !hasContratti) {
            console.log('❌ Import completamente fallito - nessun dato inserito');
        } else {
            console.log('⚠️ Situazione anomala - contratti senza clienti');
        }
        
    } catch (error) {
        console.error('❌ Errore durante la verifica:', error);
    } finally {
        db.close();
    }
}

// Esegui la verifica
checkDatabaseAfterImport().catch(console.error);