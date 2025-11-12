const { pool } = require('./backend/config/database.cjs');

async function checkUsers() {
    try {
        console.log('🔍 Verifica utenti nel database...\n');
        
        // Query per ottenere tutti gli utenti
        const result = await pool.query(`
            SELECT id, email, role, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
        
        if (result.rows && result.rows.length > 0) {
            console.log(`📋 Trovati ${result.rows.length} utenti:`);
            console.log('=' .repeat(60));
            
            result.rows.forEach((user, index) => {
                console.log(`${index + 1}. Email: ${user.email}`);
                console.log(`   ID: ${user.id}`);
                console.log(`   Ruolo: ${user.role}`);
                console.log(`   Creato: ${user.created_at}`);
                console.log('');
            });
        } else {
            console.log('❌ Nessun utente trovato nel database!');
        }
        
        // Verifica se esiste un admin
        const adminResult = await pool.query(`
            SELECT email, role 
            FROM users 
            WHERE role = 'admin' OR role = 'operatore'
            LIMIT 5
        `);
        
        if (adminResult.rows && adminResult.rows.length > 0) {
            console.log('👑 Utenti con privilegi amministrativi:');
            adminResult.rows.forEach((admin, index) => {
                console.log(`   ${index + 1}. ${admin.email} (${admin.role})`);
            });
        } else {
            console.log('⚠️  Nessun utente admin/operatore trovato!');
        }
        
    } catch (error) {
        console.error('❌ Errore durante la verifica utenti:', error);
        throw error;
    }
}

// Esegui la verifica
if (require.main === module) {
    checkUsers()
        .then(() => {
            console.log('\n✅ Verifica completata!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Errore:', error.message);
            process.exit(1);
        });
}

module.exports = { checkUsers };