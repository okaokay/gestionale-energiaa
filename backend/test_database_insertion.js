const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Test per verificare l'inserimento nel database
async function testDatabaseInsertion() {
    console.log('🔍 TEST INSERIMENTO DATABASE');
    console.log('============================');
    
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    
    if (!fs.existsSync(dbPath)) {
        console.error('❌ Database non trovato:', dbPath);
        return;
    }
    
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Verifica struttura tabelle
        console.log('📋 VERIFICA STRUTTURA TABELLE');
        console.log('------------------------------');
        
        const tables = await new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('Tabelle presenti:', tables.map(t => t.name).join(', '));
        
        // Verifica tabelle specifiche
        const requiredTables = ['clienti_privati', 'contratti_luce', 'contratti_gas'];
        const missingTables = requiredTables.filter(table => 
            !tables.some(t => t.name === table)
        );
        
        if (missingTables.length > 0) {
            console.error('❌ Tabelle mancanti:', missingTables.join(', '));
            return;
        }
        
        console.log('✅ Tutte le tabelle richieste sono presenti');
        console.log('');
        
        // Conta record attuali
        console.log('📊 CONTEGGIO RECORD ATTUALI');
        console.log('----------------------------');
        
        const clientiCount = await new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM clienti_privati", (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        
        const contrattiLuceCount = await new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM contratti_luce", (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        
        const contrattiGasCount = await new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM contratti_gas", (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        
        console.log(`Clienti privati: ${clientiCount}`);
        console.log(`Contratti luce: ${contrattiLuceCount}`);
        console.log(`Contratti gas: ${contrattiGasCount}`);
        console.log('');
        
        // Verifica struttura colonne delle tabelle
        console.log('🏗️ STRUTTURA COLONNE TABELLE');
        console.log('-----------------------------');
        
        for (const tableName of requiredTables) {
            const columns = await new Promise((resolve, reject) => {
                db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            console.log(`\\n${tableName}:`);
            columns.forEach(col => {
                console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
            });
        }
        
        console.log('');
        
        // Verifica ultimi record inseriti
        console.log('📝 ULTIMI RECORD INSERITI');
        console.log('-------------------------');
        
        if (clientiCount > 0) {
            const ultimiClienti = await new Promise((resolve, reject) => {
                db.all("SELECT id, nome, cognome, codice_fiscale, created_at FROM clienti_privati ORDER BY created_at DESC LIMIT 5", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            console.log('\\nUltimi 5 clienti:');
            ultimiClienti.forEach(cliente => {
                console.log(`  ${cliente.id}: ${cliente.nome} ${cliente.cognome} (${cliente.codice_fiscale}) - ${cliente.created_at}`);
            });
        }
        
        if (contrattiLuceCount > 0) {
            const ultimiContrattiLuce = await new Promise((resolve, reject) => {
                db.all("SELECT id, pod, cliente_id, fornitore, created_at FROM contratti_luce ORDER BY created_at DESC LIMIT 5", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            console.log('\\nUltimi 5 contratti luce:');
            ultimiContrattiLuce.forEach(contratto => {
                console.log(`  ${contratto.id}: POD ${contratto.pod} - Cliente ${contratto.cliente_id} - ${contratto.fornitore} - ${contratto.created_at}`);
            });
        }
        
        if (contrattiGasCount > 0) {
            const ultimiContrattiGas = await new Promise((resolve, reject) => {
                db.all("SELECT id, pdr, cliente_id, fornitore, created_at FROM contratti_gas ORDER BY created_at DESC LIMIT 5", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            console.log('\\nUltimi 5 contratti gas:');
            ultimiContrattiGas.forEach(contratto => {
                console.log(`  ${contratto.id}: PDR ${contratto.pdr} - Cliente ${contratto.cliente_id} - ${contratto.fornitore} - ${contratto.created_at}`);
            });
        }
        
        // Verifica associazioni
        console.log('');
        console.log('🔗 VERIFICA ASSOCIAZIONI');
        console.log('------------------------');
        
        if (contrattiLuceCount > 0) {
            const contrattiLuceSenzaCliente = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT cl.id, cl.pod, cl.cliente_id 
                    FROM contratti_luce cl 
                    LEFT JOIN clienti_privati cp ON cl.cliente_id = cp.id 
                    WHERE cp.id IS NULL
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            console.log(`Contratti luce senza cliente: ${contrattiLuceSenzaCliente.length}`);
            if (contrattiLuceSenzaCliente.length > 0) {
                contrattiLuceSenzaCliente.forEach(c => {
                    console.log(`  - Contratto ${c.id} (POD: ${c.pod}) riferisce cliente_id ${c.cliente_id} che non esiste`);
                });
            }
        }
        
        if (contrattiGasCount > 0) {
            const contrattiGasSenzaCliente = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT cg.id, cg.pdr, cg.cliente_id 
                    FROM contratti_gas cg 
                    LEFT JOIN clienti_privati cp ON cg.cliente_id = cp.id 
                    WHERE cp.id IS NULL
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            console.log(`Contratti gas senza cliente: ${contrattiGasSenzaCliente.length}`);
            if (contrattiGasSenzaCliente.length > 0) {
                contrattiGasSenzaCliente.forEach(c => {
                    console.log(`  - Contratto ${c.id} (PDR: ${c.pdr}) riferisce cliente_id ${c.cliente_id} che non esiste`);
                });
            }
        }
        
        console.log('');
        console.log('✅ Test database completato!');
        
    } catch (error) {
        console.error('❌ Errore durante il test:', error);
    } finally {
        db.close();
    }
}

// Esegui il test
testDatabaseInsertion().catch(console.error);