const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./gestionale_energia.db');

console.log('🔄 CONFRONTO DETTAGLIATO CONTRATTI_LUCE vs CONTRATTI_GAS');
console.log('=' .repeat(70));

// Funzione per ottenere la struttura di una tabella
function getTableStructure(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function compareContractTables() {
    try {
        const luceStructure = await getTableStructure('contratti_luce');
        const gasStructure = await getTableStructure('contratti_gas');

        console.log('\n💡 CONTRATTI_LUCE - Struttura completa:');
        console.log('-' .repeat(50));
        luceStructure.forEach((col, index) => {
            const nullable = col.notnull ? 'NOT NULL' : 'NULL';
            const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
            const pk = col.pk ? ' [PK]' : '';
            console.log(`${(index + 1).toString().padStart(2)}. ${col.name.padEnd(30)} ${col.type.padEnd(15)} ${nullable}${defaultVal}${pk}`);
        });
        console.log(`📊 Totale colonne: ${luceStructure.length}`);

        console.log('\n🔥 CONTRATTI_GAS - Struttura completa:');
        console.log('-' .repeat(50));
        gasStructure.forEach((col, index) => {
            const nullable = col.notnull ? 'NOT NULL' : 'NULL';
            const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
            const pk = col.pk ? ' [PK]' : '';
            console.log(`${(index + 1).toString().padStart(2)}. ${col.name.padEnd(30)} ${col.type.padEnd(15)} ${nullable}${defaultVal}${pk}`);
        });
        console.log(`📊 Totale colonne: ${gasStructure.length}`);

        // Confronto dettagliato
        const luceColumns = luceStructure.map(col => ({ name: col.name, type: col.type, notnull: col.notnull, dflt_value: col.dflt_value }));
        const gasColumns = gasStructure.map(col => ({ name: col.name, type: col.type, notnull: col.notnull, dflt_value: col.dflt_value }));

        console.log('\n❌ COLONNE MANCANTI IN CONTRATTI_GAS (presenti in LUCE):');
        console.log('-' .repeat(60));
        const missingInGas = luceColumns.filter(luceCol => 
            !gasColumns.some(gasCol => gasCol.name === luceCol.name)
        );
        
        if (missingInGas.length > 0) {
            missingInGas.forEach((col, index) => {
                console.log(`${index + 1}. 🚫 ${col.name.padEnd(30)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : 'NULL'}`);
            });
            console.log(`\n📊 Totale colonne mancanti in GAS: ${missingInGas.length}`);
        } else {
            console.log('✅ Nessuna colonna mancante in CONTRATTI_GAS');
        }

        console.log('\n❌ COLONNE MANCANTI IN CONTRATTI_LUCE (presenti in GAS):');
        console.log('-' .repeat(60));
        const missingInLuce = gasColumns.filter(gasCol => 
            !luceColumns.some(luceCol => luceCol.name === gasCol.name)
        );
        
        if (missingInLuce.length > 0) {
            missingInLuce.forEach((col, index) => {
                console.log(`${index + 1}. 🚫 ${col.name.padEnd(30)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : 'NULL'}`);
            });
            console.log(`\n📊 Totale colonne mancanti in LUCE: ${missingInLuce.length}`);
        } else {
            console.log('✅ Nessuna colonna mancante in CONTRATTI_LUCE');
        }

        // Controllo specifico per stato_contratto
        console.log('\n🔍 CONTROLLO SPECIFICO COLONNA "stato_contratto":');
        console.log('-' .repeat(50));
        const statoInLuce = luceColumns.find(col => col.name === 'stato_contratto');
        const statoInGas = gasColumns.find(col => col.name === 'stato_contratto');

        if (statoInLuce) {
            console.log(`✅ LUCE: stato_contratto presente (${statoInLuce.type})`);
        } else {
            console.log('❌ LUCE: stato_contratto NON presente');
        }

        if (statoInGas) {
            console.log(`✅ GAS: stato_contratto presente (${statoInGas.type})`);
        } else {
            console.log('❌ GAS: stato_contratto NON presente');
        }

        // Genera SQL per aggiungere colonne mancanti
        console.log('\n🛠️  SQL PER AGGIUNGERE COLONNE MANCANTI:');
        console.log('=' .repeat(50));
        
        if (missingInGas.length > 0) {
            console.log('\n-- Aggiungere a CONTRATTI_GAS:');
            missingInGas.forEach(col => {
                const nullable = col.notnull ? ' NOT NULL' : '';
                const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
                console.log(`ALTER TABLE contratti_gas ADD COLUMN ${col.name} ${col.type}${nullable}${defaultVal};`);
            });
        }

        if (missingInLuce.length > 0) {
            console.log('\n-- Aggiungere a CONTRATTI_LUCE:');
            missingInLuce.forEach(col => {
                const nullable = col.notnull ? ' NOT NULL' : '';
                const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
                console.log(`ALTER TABLE contratti_luce ADD COLUMN ${col.name} ${col.type}${nullable}${defaultVal};`);
            });
        }

        console.log('\n✅ CONFRONTO COMPLETATO!');
        
    } catch (error) {
        console.error('❌ Errore durante il confronto:', error);
    } finally {
        db.close();
    }
}

compareContractTables();