const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./gestionale_energia.db');

console.log('🔍 Controllando tabelle nel database gestionale_energia.db...');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error('❌ Errore:', err);
        return;
    }
    
    console.log(`📋 Tabelle trovate:`);
    rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.name}`);
    });
    
    // Controlliamo se esiste la tabella users
    db.all("SELECT email, role FROM users WHERE role = 'admin' OR role = 'super_admin'", (err, rows) => {
        if (err) {
            console.error('❌ Errore con tabella users:', err.message);
        } else {
            console.log(`\n👤 Utenti admin/super_admin trovati:`);
            rows.forEach((row, index) => {
                console.log(`  ${index + 1}. Email: ${row.email}, Ruolo: ${row.role}`);
            });
        }
        
        db.close();
    });
});