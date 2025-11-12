const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

console.log('🔍 TEST DIRETTO DATABASE CLIENTI');
console.log('=================================');

const db = new sqlite3.Database('./gestionale_energia.db');

// Test diretto delle tabelle clienti
console.log('📊 Verifica dati nelle tabelle clienti...');

// Conta clienti privati
db.get("SELECT COUNT(*) as count FROM clienti_privati", (err, row) => {
    if (err) {
        console.error('❌ Errore clienti_privati:', err.message);
        return;
    }
    console.log(`👥 Clienti privati: ${row.count}`);
    
    if (row.count > 0) {
        // Mostra clienti privati
        db.all("SELECT * FROM clienti_privati ORDER BY id", (err, rows) => {
            if (err) {
                console.error('❌ Errore recupero privati:', err.message);
                return;
            }
            
            console.log('\n📋 CLIENTI PRIVATI:');
            rows.forEach((cliente, index) => {
                console.log(`${index + 1}. ID: ${cliente.id}, Nome: ${cliente.nome} ${cliente.cognome}, Email: ${cliente.email_principale}, Tel: ${cliente.telefono_mobile}`);
            });
        });
    }
});

// Conta clienti aziende
db.get("SELECT COUNT(*) as count FROM clienti_aziende", (err, row) => {
    if (err) {
        console.error('❌ Errore clienti_aziende:', err.message);
        return;
    }
    console.log(`🏢 Clienti aziende: ${row.count}`);
    
    if (row.count > 0) {
        // Mostra clienti aziende
        db.all("SELECT * FROM clienti_aziende ORDER BY id", (err, rows) => {
            if (err) {
                console.error('❌ Errore recupero aziende:', err.message);
                return;
            }
            
            console.log('\n📋 CLIENTI AZIENDE:');
            rows.forEach((azienda, index) => {
                console.log(`${index + 1}. ID: ${azienda.id}, Ragione Sociale: ${azienda.ragione_sociale}, Email: ${azienda.email_principale}, Tel: ${azienda.telefono_principale}`);
            });
        });
    }
});

// Genera CSV combinato dopo un breve delay
setTimeout(() => {
    console.log('\n📄 GENERAZIONE CSV COMPLETO...');
    console.log('===============================');
    
    // Query unificata per tutti i clienti
    const query = `
        SELECT 
            id,
            'privato' as tipo,
            nome,
            cognome,
            NULL as ragione_sociale,
            codice_fiscale,
            NULL as partita_iva,
            email_principale as email,
            telefono_mobile as telefono,
            telefono_fisso,
            citta_residenza as citta,
            NULL as citta_sede_legale,
            created_at
        FROM clienti_privati
        
        UNION ALL
        
        SELECT 
            id,
            'azienda' as tipo,
            NULL as nome,
            NULL as cognome,
            ragione_sociale,
            codice_fiscale,
            partita_iva,
            email_principale as email,
            telefono_principale as telefono,
            telefono_secondario as telefono_fisso,
            NULL as citta_residenza,
            citta_sede_legale as citta,
            created_at
        FROM clienti_aziende
        
        ORDER BY tipo, id
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('❌ Errore query unificata:', err.message);
            db.close();
            return;
        }
        
        console.log(`✅ Recuperati ${rows.length} clienti totali`);
        
        if (rows.length === 0) {
            console.log('⚠️  Nessun cliente trovato nel database');
            db.close();
            return;
        }
        
        // Verifica ID
        const clientiSenzaId = rows.filter(c => !c.id);
        if (clientiSenzaId.length > 0) {
            console.log(`❌ ATTENZIONE: ${clientiSenzaId.length} clienti senza ID!`);
        } else {
            console.log('✅ Tutti i clienti hanno un ID valido');
        }
        
        // Genera CSV
        const csvHeader = 'id,tipo,nome,cognome,ragione_sociale,codice_fiscale,partita_iva,email,telefono,telefono_fisso,citta_residenza,citta_sede_legale,created_at\n';
        
        const csvRows = rows.map(cliente => {
            return [
                cliente.id || '',
                cliente.tipo || '',
                cliente.nome || '',
                cliente.cognome || '',
                cliente.ragione_sociale || '',
                cliente.codice_fiscale || '',
                cliente.partita_iva || '',
                cliente.email || '',
                cliente.telefono || '',
                cliente.telefono_fisso || '',
                cliente.citta_residenza || '',
                cliente.citta_sede_legale || '',
                cliente.created_at || ''
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        const csvFileName = './clienti_export_' + new Date().toISOString().slice(0,10) + '.csv';
        
        try {
            fs.writeFileSync(csvFileName, csvContent, 'utf8');
            console.log(`✅ CSV generato: ${csvFileName}`);
            console.log(`📊 Righe nel CSV: ${rows.length + 1} (header + ${rows.length} clienti)`);
            
            // Mostra anteprima
            console.log('\n📋 ANTEPRIMA CSV:');
            console.log('================');
            const csvLines = csvContent.split('\n');
            csvLines.slice(0, Math.min(6, csvLines.length)).forEach((line, index) => {
                if (line.trim()) {
                    console.log(`${index === 0 ? 'HEADER' : 'ROW ' + index}: ${line}`);
                }
            });
            
            // Verifica campi
            console.log('\n🔍 CAMPI NEL CSV:');
            console.log('=================');
            const headerFields = csvHeader.replace('\n', '').split(',');
            console.log(`📋 Totale campi: ${headerFields.length}`);
            headerFields.forEach((field, index) => {
                console.log(`   ${index + 1}. ${field}`);
            });
            
            console.log('\n✅ TEST COMPLETATO CON SUCCESSO!');
            console.log(`📁 File CSV: ${csvFileName}`);
            console.log(`📊 Clienti esportati: ${rows.length}`);
            
        } catch (writeError) {
            console.error('❌ Errore scrittura CSV:', writeError.message);
        }
        
        db.close();
    });
}, 1000);