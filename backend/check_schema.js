const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');
const db = new Database(dbPath);

try {
    // Controlla lo schema delle tabelle
console.log('=== SCHEMA TABELLA clienti_privati ===');
const clientiPrivatiSchema = db.prepare("PRAGMA table_info(clienti_privati)").all();
clientiPrivatiSchema.forEach(col => {
    console.log(`${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
});

console.log('\n=== SCHEMA TABELLA clienti_aziende ===');
const clientiAziendeSchema = db.prepare("PRAGMA table_info(clienti_aziende)").all();
clientiAziendeSchema.forEach(col => {
    console.log(`${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
});

console.log('\n=== SCHEMA TABELLA contratti_luce ===');
    const contrattiLuceSchema = db.prepare("PRAGMA table_info(contratti_luce)").all();
    contrattiLuceSchema.forEach(col => {
        console.log(`${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    console.log('\n=== FOREIGN KEYS contratti_luce ===');
    const contrattiLuceForeignKeys = db.prepare("PRAGMA foreign_key_list(contratti_luce)").all();
    contrattiLuceForeignKeys.forEach(fk => {
        console.log(`${fk.from} -> ${fk.table}.${fk.to}`);
    });
    
    console.log('\n=== SCHEMA TABELLA contratti_gas ===');
    const contrattiGasSchema = db.prepare("PRAGMA table_info(contratti_gas)").all();
    contrattiGasSchema.forEach(col => {
        console.log(`${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    console.log('\n=== FOREIGN KEYS contratti_gas ===');
    const contrattiGasForeignKeys = db.prepare("PRAGMA foreign_key_list(contratti_gas)").all();
    contrattiGasForeignKeys.forEach(fk => {
        console.log(`${fk.from} -> ${fk.table}.${fk.to}`);
    });
    
} catch (error) {
    console.error('Errore:', error.message);
} finally {
    db.close();
}