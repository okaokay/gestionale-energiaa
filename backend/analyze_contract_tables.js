const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');
const db = new Database(dbPath);

console.log('🔍 ANALISI TABELLE CONTRATTI');
console.log('============================\n');

try {
    // 1. Lista tutte le tabelle che contengono "contratt"
    console.log('📋 TABELLE CONTRATTI TROVATE:');
    console.log('==============================');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%contratt%'").all();
    
    if (tables.length === 0) {
        console.log('❌ Nessuna tabella contratti trovata!');
    } else {
        tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table.name}`);
        });
    }
    console.log('');

    // 2. Analizza ogni tabella contratti
    for (const table of tables) {
        console.log(`🔍 ANALISI TABELLA: ${table.name}`);
        console.log('='.repeat(30 + table.name.length));
        
        // Struttura della tabella
        const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
        console.log('📋 Colonne:');
        columns.forEach(col => {
            const nullable = col.notnull ? 'NOT NULL' : 'NULL';
            const defaultVal = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
            const pk = col.pk ? ' [PRIMARY KEY]' : '';
            console.log(`   - ${col.name}: ${col.type} ${nullable}${defaultVal}${pk}`);
        });
        
        // Conteggio record
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        console.log(`📊 Record totali: ${count.count}`);
        
        // Mostra primi 3 record se esistono
        if (count.count > 0) {
            console.log('📄 Primi 3 record:');
            const records = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
            records.forEach((record, index) => {
                console.log(`   Record ${index + 1}:`, JSON.stringify(record, null, 2));
            });
        }
        console.log('');
    }

    // 3. Verifica associazioni con clienti
    console.log('🔗 VERIFICA ASSOCIAZIONI CLIENTI-CONTRATTI:');
    console.log('============================================');
    
    // Controlla se ci sono foreign key verso clienti
    for (const table of tables) {
        const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
        if (foreignKeys.length > 0) {
            console.log(`📎 Foreign Keys in ${table.name}:`);
            foreignKeys.forEach(fk => {
                console.log(`   - ${fk.from} -> ${fk.table}.${fk.to}`);
            });
        }
    }

    // 4. Cerca colonne che potrebbero collegare ai clienti
    console.log('\n🔍 COLONNE DI COLLEGAMENTO AI CLIENTI:');
    console.log('======================================');
    
    for (const table of tables) {
        const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
        const clientColumns = columns.filter(col => 
            col.name.toLowerCase().includes('client') || 
            col.name.toLowerCase().includes('utente') ||
            col.name.toLowerCase().includes('user') ||
            col.name.toLowerCase().includes('id_cliente') ||
            col.name.toLowerCase().includes('cliente_id')
        );
        
        if (clientColumns.length > 0) {
            console.log(`📋 In ${table.name}:`);
            clientColumns.forEach(col => {
                console.log(`   - ${col.name}: ${col.type}`);
            });
        }
    }

    // 5. Verifica se ci sono contratti associati ai clienti esistenti
    console.log('\n🔍 VERIFICA CONTRATTI ESISTENTI PER CLIENTI:');
    console.log('============================================');
    
    // Prova diverse possibili associazioni
    const possibleAssociations = [
        'cliente_id',
        'client_id', 
        'user_id',
        'utente_id',
        'id_cliente'
    ];

    for (const table of tables) {
        const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
        const columnNames = columns.map(col => col.name);
        
        for (const assocCol of possibleAssociations) {
            if (columnNames.includes(assocCol)) {
                try {
                    const contractsWithClients = db.prepare(`
                        SELECT ${assocCol}, COUNT(*) as count 
                        FROM ${table.name} 
                        WHERE ${assocCol} IS NOT NULL 
                        GROUP BY ${assocCol}
                    `).all();
                    
                    if (contractsWithClients.length > 0) {
                        console.log(`📊 ${table.name}.${assocCol}:`);
                        contractsWithClients.forEach(row => {
                            console.log(`   Cliente ${row[assocCol]}: ${row.count} contratti`);
                        });
                    }
                } catch (error) {
                    // Ignora errori di query
                }
            }
        }
    }

    console.log('\n✅ Analisi completata!');

} catch (error) {
    console.error('❌ Errore durante l\'analisi:', error.message);
} finally {
    db.close();
}