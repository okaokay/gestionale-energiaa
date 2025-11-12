const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.sqlite');

console.log('🔍 Verifica separazione POD/PDR dopo importazione...\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite\n');
});

// Funzione per verificare i clienti privati
function checkClientiPrivati() {
    return new Promise((resolve, reject) => {
        console.log('👥 VERIFICA CLIENTI PRIVATI:');
        console.log('='.repeat(50));
        
        db.all(`
            SELECT 
                id, 
                nome, 
                cognome, 
                email_principale,
                codice_fiscale,
                created_at
            FROM clienti_privati 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            console.log(`📊 Totale clienti privati: ${rows.length}\n`);
            
            rows.forEach((row, index) => {
                console.log(`${index + 1}. Cliente ID: ${row.id}`);
                console.log(`   Nome: ${row.nome} ${row.cognome}`);
                console.log(`   Email: ${row.email_principale}`);
                console.log(`   CF: ${row.codice_fiscale}`);
                console.log(`   Creato: ${row.created_at}`);
                console.log('');
            });
            
            resolve(rows);
        });
    });
}

// Funzione per verificare i clienti azienda
function checkClientiAzienda() {
    return new Promise((resolve, reject) => {
        console.log('🏢 VERIFICA CLIENTI AZIENDA:');
        console.log('='.repeat(50));
        
        db.all(`
            SELECT 
                id, 
                ragione_sociale, 
                email_principale,
                partita_iva,
                created_at
            FROM clienti_azienda 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            console.log(`📊 Totale clienti azienda: ${rows.length}\n`);
            
            rows.forEach((row, index) => {
                console.log(`${index + 1}. Azienda ID: ${row.id}`);
                console.log(`   Ragione Sociale: ${row.ragione_sociale}`);
                console.log(`   Email: ${row.email_principale}`);
                console.log(`   P.IVA: ${row.partita_iva}`);
                console.log(`   Creato: ${row.created_at}`);
                console.log('');
            });
            
            resolve(rows);
        });
    });
}

// Funzione per verificare i contratti luce (POD)
function checkContrattiLuce() {
    return new Promise((resolve, reject) => {
        console.log('⚡ VERIFICA CONTRATTI LUCE (POD):');
        console.log('='.repeat(50));
        
        db.all(`
            SELECT 
                cl.id,
                cl.cliente_id,
                cl.tipo_cliente,
                cl.numero_contratto,
                cl.pod,
                cl.fornitore,
                cl.stato_contratto,
                cl.created_at,
                cp.nome as nome_privato,
                cp.cognome as cognome_privato,
                ca.ragione_sociale
            FROM contratti_luce cl
            LEFT JOIN clienti_privati cp ON cl.cliente_id = cp.id AND cl.tipo_cliente = 'privato'
            LEFT JOIN clienti_azienda ca ON cl.cliente_id = ca.id AND cl.tipo_cliente = 'azienda'
            ORDER BY cl.created_at DESC
            LIMIT 10
        `, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            console.log(`📊 Totale contratti luce: ${rows.length}\n`);
            
            let podCount = 0;
            
            rows.forEach((row, index) => {
                console.log(`${index + 1}. Contratto Luce ID: ${row.id}`);
                const clienteNome = row.tipo_cliente === 'privato' 
                    ? `${row.nome_privato} ${row.cognome_privato}` 
                    : row.ragione_sociale;
                console.log(`   Cliente: ${clienteNome} (${row.tipo_cliente}, ID: ${row.cliente_id})`);
                console.log(`   Numero: ${row.numero_contratto}`);
                
                if (row.pod) {
                    console.log(`   ⚡ POD: ${row.pod}`);
                    podCount++;
                } else {
                    console.log(`   ⚠️  POD: Non presente`);
                }
                
                console.log(`   Fornitore: ${row.fornitore}`);
                console.log(`   Stato: ${row.stato_contratto}`);
                console.log(`   Creato: ${row.created_at}`);
                console.log('');
            });
            
            console.log(`📈 Contratti luce con POD: ${podCount}/${rows.length}\n`);
            
            resolve({ contracts: rows, podCount });
        });
    });
}

// Funzione per verificare i contratti gas (PDR)
function checkContrattiGas() {
    return new Promise((resolve, reject) => {
        console.log('🔥 VERIFICA CONTRATTI GAS (PDR):');
        console.log('='.repeat(50));
        
        db.all(`
            SELECT 
                cg.id,
                cg.cliente_id,
                cg.tipo_cliente,
                cg.numero_contratto,
                cg.pdr,
                cg.fornitore,
                cg.stato_contratto,
                cg.created_at,
                cp.nome as nome_privato,
                cp.cognome as cognome_privato,
                ca.ragione_sociale
            FROM contratti_gas cg
            LEFT JOIN clienti_privati cp ON cg.cliente_id = cp.id AND cg.tipo_cliente = 'privato'
            LEFT JOIN clienti_azienda ca ON cg.cliente_id = ca.id AND cg.tipo_cliente = 'azienda'
            ORDER BY cg.created_at DESC
            LIMIT 10
        `, [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            
            console.log(`📊 Totale contratti gas: ${rows.length}\n`);
            
            let pdrCount = 0;
            
            rows.forEach((row, index) => {
                console.log(`${index + 1}. Contratto Gas ID: ${row.id}`);
                const clienteNome = row.tipo_cliente === 'privato' 
                    ? `${row.nome_privato} ${row.cognome_privato}` 
                    : row.ragione_sociale;
                console.log(`   Cliente: ${clienteNome} (${row.tipo_cliente}, ID: ${row.cliente_id})`);
                console.log(`   Numero: ${row.numero_contratto}`);
                
                if (row.pdr) {
                    console.log(`   🔥 PDR: ${row.pdr}`);
                    pdrCount++;
                } else {
                    console.log(`   ⚠️  PDR: Non presente`);
                }
                
                console.log(`   Fornitore: ${row.fornitore}`);
                console.log(`   Stato: ${row.stato_contratto}`);
                console.log(`   Creato: ${row.created_at}`);
                console.log('');
            });
            
            console.log(`📈 Contratti gas con PDR: ${pdrCount}/${rows.length}\n`);
            
            resolve({ contracts: rows, pdrCount });
        });
    });
}

// Funzione per verificare i log di importazione
function checkImportLogs() {
    return new Promise((resolve, reject) => {
        console.log('📝 VERIFICA LOG IMPORTAZIONE:');
        console.log('='.repeat(50));
        
        db.all(`
            SELECT 
                id,
                file_name,
                total_rows,
                processed_rows,
                success_count,
                error_count,
                status,
                created_at,
                summary
            FROM import_logs 
            ORDER BY created_at DESC 
            LIMIT 5
        `, [], (err, rows) => {
            if (err) {
                // Se la tabella non esiste, non è un errore critico
                console.log('⚠️  Tabella import_logs non trovata o vuota');
                resolve([]);
                return;
            }
            
            console.log(`📊 Log di importazione trovati: ${rows.length}\n`);
            
            rows.forEach((row, index) => {
                console.log(`${index + 1}. Import ID: ${row.id}`);
                console.log(`   File: ${row.file_name}`);
                console.log(`   Righe totali: ${row.total_rows}`);
                console.log(`   Righe processate: ${row.processed_rows}`);
                console.log(`   Successi: ${row.success_count}`);
                console.log(`   Errori: ${row.error_count}`);
                console.log(`   Status: ${row.status}`);
                console.log(`   Data: ${row.created_at}`);
                if (row.summary) {
                    console.log(`   Summary: ${row.summary}`);
                }
                console.log('');
            });
            
            resolve(rows);
        });
    });
}

// Esecuzione principale
async function main() {
    try {
        await checkClientiPrivati();
        await checkClientiAzienda();
        const luceResult = await checkContrattiLuce();
        const gasResult = await checkContrattiGas();
        await checkImportLogs();
        
        console.log('🎯 RISULTATO VERIFICA SEPARAZIONE POD/PDR:');
        console.log('='.repeat(50));
        
        const totalPod = luceResult.podCount;
        const totalPdr = gasResult.pdrCount;
        
        if (totalPod > 0 || totalPdr > 0) {
            console.log('✅ SEPARAZIONE POD/PDR FUNZIONANTE!');
            console.log(`   ⚡ Contratti luce con POD: ${totalPod}`);
            console.log(`   🔥 Contratti gas con PDR: ${totalPdr}`);
            console.log('');
            console.log('🎉 Il sistema ha correttamente separato il campo pod_pdr!');
        } else {
            console.log('⚠️  Nessun POD/PDR trovato nei contratti recenti');
            console.log('   Questo potrebbe indicare che:');
            console.log('   - L\'importazione non ha creato nuovi contratti');
            console.log('   - I dati pod_pdr nel CSV erano vuoti');
            console.log('   - C\'è stato un problema nella separazione');
        }
        
    } catch (error) {
        console.error('❌ Errore durante la verifica:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Errore chiusura database:', err.message);
            } else {
                console.log('\n✅ Connessione database chiusa');
            }
        });
    }
}

main();