const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

function checkCompanyTable() {
    console.log('🔍 Checking clienti_aziende table structure...\n');
    
    const db = new sqlite3.Database(dbPath);
    
    // Get table schema
    db.all("PRAGMA table_info(clienti_aziende)", (err, rows) => {
        if (err) {
            console.error('Error getting table info:', err);
        } else {
            console.log('📋 clienti_aziende table structure:');
            rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : 'NULL'} ${row.pk ? 'PRIMARY KEY' : ''}`);
            });
        }
        
        // Check if table has any data
        db.get("SELECT COUNT(*) as count FROM clienti_aziende", (err, row) => {
            if (err) {
                console.error('Error counting records:', err);
            } else {
                console.log(`\n📊 Records in clienti_aziende: ${row.count}`);
            }
            
            db.close();
        });
    });
}

checkCompanyTable();