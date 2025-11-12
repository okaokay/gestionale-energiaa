const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔍 Investigando i contratti di Mario Rossi...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite');
});

// Trova Mario Rossi
db.get(`
    SELECT id, nome, cognome, codice_fiscale, email_principale, created_at
    FROM clienti_privati 
    WHERE codice_fiscale = 'RSSMRA85M15F205X'
`, (err, cliente) => {
    if (err) {
        console.error('❌ Errore ricerca cliente:', err);
        return;
    }
    
    if (!cliente) {
        console.log('❌ Cliente Mario Rossi non trovato');
        return;
    }
    
    console.log('\n👤 Cliente trovato:');
    console.log(`   ID: ${cliente.id}`);
    console.log(`   Nome: ${cliente.nome} ${cliente.cognome}`);
    console.log(`   CF: ${cliente.codice_fiscale}`);
    console.log(`   Email: ${cliente.email_principale}`);
    console.log(`   Creato: ${cliente.created_at}`);
    
    // Controlla contratti luce
    db.all(`
        SELECT id, numero_contratto, pod, fornitore, stato, created_at, created_by
        FROM contratti_luce 
        WHERE cliente_privato_id = ?
        ORDER BY created_at DESC
    `, [cliente.id], (err, contrattiLuce) => {
        if (err) {
            console.error('❌ Errore ricerca contratti luce:', err);
            return;
        }
        
        console.log(`\n⚡ Contratti Luce trovati: ${contrattiLuce.length}`);
        contrattiLuce.forEach((contratto, index) => {
            console.log(`   ${index + 1}. ID: ${contratto.id}`);
            console.log(`      Numero: ${contratto.numero_contratto}`);
            console.log(`      POD: ${contratto.pod}`);
            console.log(`      Fornitore: ${contratto.fornitore}`);
            console.log(`      Stato: ${contratto.stato}`);
            console.log(`      Creato: ${contratto.created_at}`);
            console.log(`      Creato da: ${contratto.created_by}`);
            console.log('');
        });
        
        // Controlla contratti gas
        db.all(`
            SELECT id, numero_contratto, pdr, fornitore, stato, created_at, created_by
            FROM contratti_gas 
            WHERE cliente_privato_id = ?
            ORDER BY created_at DESC
        `, [cliente.id], (err, contrattiGas) => {
            if (err) {
                console.error('❌ Errore ricerca contratti gas:', err);
                return;
            }
            
            console.log(`🔥 Contratti Gas trovati: ${contrattiGas.length}`);
            contrattiGas.forEach((contratto, index) => {
                console.log(`   ${index + 1}. ID: ${contratto.id}`);
                console.log(`      Numero: ${contratto.numero_contratto}`);
                console.log(`      PDR: ${contratto.pdr}`);
                console.log(`      Fornitore: ${contratto.fornitore}`);
                console.log(`      Stato: ${contratto.stato}`);
                console.log(`      Creato: ${contratto.created_at}`);
                console.log(`      Creato da: ${contratto.created_by}`);
                console.log('');
            });
            
            // Controlla tutti i contratti nel database per vedere il pattern temporale
            console.log('\n📊 Analisi temporale di tutti i contratti:');
            
            db.all(`
                SELECT 'luce' as tipo, created_at, created_by, COUNT(*) as count
                FROM contratti_luce 
                GROUP BY created_at, created_by
                UNION ALL
                SELECT 'gas' as tipo, created_at, created_by, COUNT(*) as count
                FROM contratti_gas 
                GROUP BY created_at, created_by
                ORDER BY created_at DESC
                LIMIT 10
            `, (err, timeline) => {
                if (err) {
                    console.error('❌ Errore analisi timeline:', err);
                    return;
                }
                
                timeline.forEach(entry => {
                    console.log(`   ${entry.tipo.toUpperCase()}: ${entry.count} contratti creati il ${entry.created_at} da ${entry.created_by}`);
                });
                
                db.close();
            });
        });
    });
});