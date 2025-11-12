const { pool } = require('./config/database');

async function checkUsersTable() {
    try {
        console.log('🔍 Verifica database...\n');
        
        // Lista tutte le tabelle
        const tables = await pool.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('📋 Tabelle presenti nel database:');
        tables.rows.forEach(table => {
            console.log(`   - ${table.name}`);
        });
        
        // Se esiste la tabella users, mostra la struttura
        const userTableExists = tables.rows.some(table => table.name === 'users');
        if (userTableExists) {
            console.log('\n📋 Struttura tabella users:');
            const structure = await pool.query('PRAGMA table_info(users)');
            structure.rows.forEach(row => {
                console.log(`   - ${row.name} (${row.type}) ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
            });
            
            console.log('\n👤 Utenti presenti:');
            const users = await pool.query('SELECT * FROM users LIMIT 5');
            users.rows.forEach(user => {
                console.log(`   - ${JSON.stringify(user)}`);
            });
        } else {
            console.log('\n⚠️ Tabella users non trovata!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Errore:', error);
        process.exit(1);
    }
}

checkUsersTable();