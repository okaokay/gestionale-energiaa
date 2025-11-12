/**
 * Script per verificare le tabelle esistenti nel database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

async function checkTables() {
    console.log('🗄️ VERIFICA TABELLE DATABASE');
    console.log('=' .repeat(40));
    
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Lista tutte le tabelle
        const tables = await new Promise((resolve, reject) => {
            db.all(`
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                ORDER BY name
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('📋 Tabelle esistenti:');
        tables.forEach(table => {
            console.log(`   - ${table.name}`);
        });
        
        // Verifica specificamente le tabelle dei contratti
        const contractTables = ['contratti_luce', 'contratti_gas'];
        console.log('\n🔍 Verifica tabelle contratti:');
        
        for (const tableName of contractTables) {
            const exists = tables.some(t => t.name === tableName);
            if (exists) {
                console.log(`✅ ${tableName}: ESISTE`);
                
                // Conta i record
                const count = await new Promise((resolve, reject) => {
                    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
                        if (err) reject(err);
                        else resolve(row.count);
                    });
                });
                console.log(`   Record: ${count}`);
                
                // Mostra struttura
                const schema = await new Promise((resolve, reject) => {
                    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });
                console.log(`   Colonne: ${schema.map(col => col.name).join(', ')}`);
                
            } else {
                console.log(`❌ ${tableName}: NON ESISTE`);
            }
        }
        
        // Verifica se esistono tabelle alternative per i contratti
        console.log('\n🔍 Ricerca tabelle alternative:');
        const contractRelated = tables.filter(t => 
            t.name.toLowerCase().includes('contract') || 
            t.name.toLowerCase().includes('contratt')
        );
        
        if (contractRelated.length > 0) {
            console.log('📋 Tabelle correlate ai contratti:');
            contractRelated.forEach(table => {
                console.log(`   - ${table.name}`);
            });
        } else {
            console.log('❌ Nessuna tabella correlata ai contratti trovata');
        }
        
    } catch (error) {
        console.error('❌ Errore:', error);
    } finally {
        db.close();
    }
}

checkTables().catch(console.error);