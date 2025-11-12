const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function checkContractErrorsInDB() {
    console.log('🔍 CONTROLLO ERRORI CONTRATTI NEL DATABASE');
    console.log('==========================================\n');

    const dbPath = path.join(__dirname, 'gestionale_energia.db');
    const db = new sqlite3.Database(dbPath);

    // Query per trovare errori di contratti
    const query = `
        SELECT 
            id,
            import_id,
            row_number,
            record_type,
            error_type,
            error_code,
            message,
            created_at
        FROM import_errors 
        WHERE record_type IN ('contratto_luce', 'contratto_gas')
        ORDER BY created_at DESC, row_number ASC
        LIMIT 10
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Errore query:', err.message);
            return;
        }

        if (rows.length === 0) {
            console.log('ℹ️  Nessun errore di contratti trovato nel database');
            
            // Controlliamo se ci sono errori in generale
            db.get('SELECT COUNT(*) as total FROM import_errors', [], (err, result) => {
                if (err) {
                    console.error('❌ Errore conteggio:', err.message);
                } else {
                    console.log(`📊 Totale errori nel database: ${result.total}`);
                }
                db.close();
            });
            return;
        }

        console.log(`📊 Trovati ${rows.length} errori di contratti (ultimi 10):\n`);

        rows.forEach((row, index) => {
            console.log(`--- Errore ${index + 1} ---`);
            console.log(`ID: ${row.id}`);
            console.log(`Import ID: ${row.import_id}`);
            console.log(`Riga: ${row.row_number}`);
            console.log(`Tipo record: ${row.record_type}`);
            console.log(`Tipo errore: ${row.error_type}`);
            console.log(`Codice: ${row.error_code}`);
            console.log(`Messaggio: ${row.message}`);
            console.log(`Data: ${new Date(row.created_at).toLocaleString()}`);
            
            // Verifica se il messaggio è ancora [object Object]
            if (row.message && row.message.includes('[object Object]')) {
                console.log('❌ PROBLEMA: Messaggio ancora serializzato male!');
            } else {
                console.log('✅ Messaggio serializzato correttamente');
            }
            console.log('');
        });

        // Statistiche
        db.all(`
            SELECT 
                record_type,
                error_code,
                COUNT(*) as count
            FROM import_errors 
            WHERE record_type IN ('contratto_luce', 'contratto_gas')
            GROUP BY record_type, error_code
            ORDER BY record_type, count DESC
        `, [], (err, stats) => {
            if (err) {
                console.error('❌ Errore statistiche:', err.message);
            } else {
                console.log('📈 STATISTICHE ERRORI CONTRATTI:');
                stats.forEach(stat => {
                    console.log(`   ${stat.record_type}: ${stat.error_code} (${stat.count} volte)`);
                });
            }
            db.close();
        });
    });
}

checkContractErrorsInDB();