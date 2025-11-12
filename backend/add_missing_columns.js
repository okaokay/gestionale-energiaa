const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔧 Aggiunta colonne mancanti al database...');
console.log(`📁 Database: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore apertura database:', err.message);
        process.exit(1);
    }
    console.log('✅ Database aperto con successo');
});

// Funzione per eseguire una query e restituire una Promise
function runQuery(sql, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔄 ${description}...`);
        console.log(`📝 SQL: ${sql}`);
        
        db.run(sql, function(err) {
            if (err) {
                // Controlla se l'errore è dovuto al fatto che la colonna esiste già
                if (err.message.includes('duplicate column name')) {
                    console.log(`⚠️  Colonna già esistente: ${err.message}`);
                    resolve();
                } else {
                    console.error(`❌ Errore: ${err.message}`);
                    reject(err);
                }
            } else {
                console.log(`✅ ${description} completata`);
                resolve();
            }
        });
    });
}

// Funzione per verificare la struttura di una tabella
function checkTableStructure(tableName) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔍 Verifica struttura tabella ${tableName}:`);
        
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) {
                console.error(`❌ Errore verifica ${tableName}:`, err.message);
                reject(err);
            } else {
                console.log(`📋 Colonne in ${tableName}:`);
                rows.forEach(row => {
                    console.log(`   - ${row.name} (${row.type})`);
                });
                
                // Controlla se stato_contratto è presente
                const hasStatoContratto = rows.some(row => row.name === 'stato_contratto');
                console.log(`🎯 stato_contratto presente: ${hasStatoContratto ? '✅ SÌ' : '❌ NO'}`);
                
                resolve(hasStatoContratto);
            }
        });
    });
}

async function addMissingColumns() {
    try {
        console.log('\n🚀 INIZIO PROCESSO DI AGGIUNTA COLONNE');
        console.log('=====================================');
        
        // Verifica struttura iniziale
        console.log('\n📊 VERIFICA STRUTTURA INIZIALE:');
        const gasHasStato = await checkTableStructure('contratti_gas');
        const luceHasStato = await checkTableStructure('contratti_luce');
        
        // Aggiungi colonne mancanti
        console.log('\n🔧 AGGIUNTA COLONNE MANCANTI:');
        
        if (!gasHasStato) {
            await runQuery(
                'ALTER TABLE contratti_gas ADD COLUMN stato_contratto TEXT',
                'Aggiunta stato_contratto a contratti_gas'
            );
        } else {
            console.log('⚠️  stato_contratto già presente in contratti_gas');
        }
        
        if (!luceHasStato) {
            await runQuery(
                'ALTER TABLE contratti_luce ADD COLUMN stato_contratto TEXT',
                'Aggiunta stato_contratto a contratti_luce'
            );
        } else {
            console.log('⚠️  stato_contratto già presente in contratti_luce');
        }
        
        // Verifica struttura finale
        console.log('\n📊 VERIFICA STRUTTURA FINALE:');
        await checkTableStructure('contratti_gas');
        await checkTableStructure('contratti_luce');
        
        console.log('\n🎉 PROCESSO COMPLETATO CON SUCCESSO!');
        console.log('=====================================');
        console.log('💡 PROSSIMI PASSI:');
        console.log('1. Ricompilare il backend: npm run build');
        console.log('2. Riavviare il server: node dist/server.js');
        console.log('3. Testare nuovamente l\'importazione');
        
    } catch (error) {
        console.error('\n💥 ERRORE DURANTE IL PROCESSO:', error.message);
        process.exit(1);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Errore chiusura database:', err.message);
            } else {
                console.log('\n🔒 Database chiuso correttamente');
            }
        });
    }
}

// Avvia il processo
addMissingColumns();