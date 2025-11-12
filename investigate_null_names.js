const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

function investigateNullNames() {
    const db = new sqlite3.Database(dbPath);
    
    console.log('🔍 Investigating null names in clienti_privati...\n');
    
    // Count total clients
    db.all("SELECT COUNT(*) as total FROM clienti_privati", (err, rows) => {
        if (err) {
            console.error('Error counting total clients:', err);
        } else {
            console.log(`📊 Total clients: ${rows[0].total}`);
        }
    });
    
    // Count clients with null names
    db.all("SELECT COUNT(*) as null_count FROM clienti_privati WHERE nome IS NULL OR cognome IS NULL", (err, rows) => {
        if (err) {
            console.error('Error counting null names:', err);
        } else {
            console.log(`❌ Clients with null nome or cognome: ${rows[0].null_count}`);
        }
    });
    
    // Count clients with both null
    db.all("SELECT COUNT(*) as both_null FROM clienti_privati WHERE nome IS NULL AND cognome IS NULL", (err, rows) => {
        if (err) {
            console.error('Error counting both null:', err);
        } else {
            console.log(`💀 Clients with both nome AND cognome null: ${rows[0].both_null}`);
        }
    });
    
    // Show clients with valid names
    db.all("SELECT nome, cognome, email_principale, created_at FROM clienti_privati WHERE nome IS NOT NULL AND cognome IS NOT NULL LIMIT 5", (err, rows) => {
        if (err) {
            console.error('Error getting valid names:', err);
        } else {
            console.log('\n✅ Clients with valid names:');
            rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.nome} ${row.cognome} (${row.email_principale || 'no email'}) - Created: ${row.created_at}`);
            });
        }
    });
    
    // Show clients with null names
    db.all("SELECT id, nome, cognome, email_principale, created_at, import_source FROM clienti_privati WHERE nome IS NULL OR cognome IS NULL LIMIT 10", (err, rows) => {
        if (err) {
            console.error('Error getting null names:', err);
        } else {
            console.log('\n❌ Clients with null names:');
            rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.nome || 'NULL'} ${row.cognome || 'NULL'} (${row.email_principale || 'no email'}) - Source: ${row.import_source || 'unknown'} - Created: ${row.created_at}`);
            });
        }
        
        db.close();
    });
}

investigateNullNames();