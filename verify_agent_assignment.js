const Database = require('better-sqlite3');
const path = require('path');

// Percorso DB: usa lo stesso del server (root: gestionale_energia.db)
const dbPath = path.join(process.cwd(), 'gestionale_energia.db');

function getUserById(db, userId) {
  if (!userId) return null;
  try {
    const u = db.prepare('SELECT id, email, nome, cognome, role FROM users WHERE id = ?').get(userId);
    return u || null;
  } catch (e) {
    return null;
  }
}

function main() {
  const db = new Database(dbPath);
  try {
    console.log('🔍 Verifica assegnazione agenti ai clienti');
    console.log('DB:', dbPath);

    const colsPrivati = db.prepare('PRAGMA table_info(clienti_privati)').all();
    const colsAziende = db.prepare('PRAGMA table_info(clienti_aziende)').all();
    const colNamesPrivati = colsPrivati.map(c => c.name);
    const colNamesAziende = colsAziende.map(c => c.name);
    console.log('\n🧱 Colonne clienti_privati:', colNamesPrivati.join(', '));
    console.log('🧱 Colonne clienti_aziende:', colsAziende.map(c => c.name).join(', '));
    console.log(`🔎 clienti_privati.has_assigned_agent_id: ${colNamesPrivati.includes('assigned_agent_id')}`);
    console.log(`🔎 clienti_aziende.has_assigned_agent_id: ${colNamesAziende.includes('assigned_agent_id')}`);

    const privatiTot = db.prepare('SELECT COUNT(*) AS c FROM clienti_privati').get().c;
    const privatiAssigned = db.prepare("SELECT COUNT(*) AS c FROM clienti_privati WHERE assigned_agent_id IS NOT NULL AND assigned_agent_id <> ''").get().c;
    const aziendeTot = db.prepare('SELECT COUNT(*) AS c FROM clienti_aziende').get().c;
    const aziendeAssigned = db.prepare("SELECT COUNT(*) AS c FROM clienti_aziende WHERE assigned_agent_id IS NOT NULL AND assigned_agent_id <> ''").get().c;

    console.log(`\n📈 Riepilogo:`);
    console.log(`- Clienti privati totali: ${privatiTot}`);
    console.log(`- Clienti privati assegnati: ${privatiAssigned}`);
    console.log(`- Clienti aziende totali: ${aziendeTot}`);
    console.log(`- Clienti aziende assegnati: ${aziendeAssigned}`);

    console.log('\n👥 Campione clienti privati assegnati (max 10):');
    const samplePrivati = db.prepare("SELECT id, nome, cognome, codice_fiscale, assigned_agent_id, created_at FROM clienti_privati WHERE assigned_agent_id IS NOT NULL AND assigned_agent_id <> '' ORDER BY created_at DESC LIMIT 10").all();
    if (samplePrivati.length === 0) {
      console.log('   Nessun cliente privato assegnato trovato.');
    } else {
      samplePrivati.forEach((c, i) => {
        const agent = getUserById(db, c.assigned_agent_id);
        console.log(`\n${i + 1}. ${c.nome || ''} ${c.cognome || ''} (CF: ${c.codice_fiscale || 'N/A'})`);
        console.log(`   Cliente ID: ${c.id}`);
        console.log(`   Agente ID: ${c.assigned_agent_id}`);
        console.log(`   Agente: ${agent ? `${agent.nome || ''} ${agent.cognome || ''} <${agent.email}> [${agent.role}]` : 'N/A'}`);
        console.log(`   Creato: ${c.created_at || 'N/A'}`);
      });
    }

    console.log('\n🏢 Campione clienti aziende assegnati (max 10):');
    const sampleAziende = db.prepare("SELECT id, ragione_sociale, partita_iva, assigned_agent_id, created_at FROM clienti_aziende WHERE assigned_agent_id IS NOT NULL AND assigned_agent_id <> '' ORDER BY created_at DESC LIMIT 10").all();
    if (sampleAziende.length === 0) {
      console.log('   Nessuna azienda assegnata trovata.');
    } else {
      sampleAziende.forEach((c, i) => {
        const agent = getUserById(db, c.assigned_agent_id);
        console.log(`\n${i + 1}. ${c.ragione_sociale || ''} (P.IVA: ${c.partita_iva || 'N/A'})`);
        console.log(`   Cliente ID: ${c.id}`);
        console.log(`   Agente ID: ${c.assigned_agent_id}`);
        console.log(`   Agente: ${agent ? `${agent.nome || ''} ${agent.cognome || ''} <${agent.email}> [${agent.role}]` : 'N/A'}`);
        console.log(`   Creato: ${c.created_at || 'N/A'}`);
      });
    }

    // Debug mirato: controllo cliente per CF noto (Mario Rossi)
    try {
      const mario = db.prepare("SELECT * FROM clienti_privati WHERE codice_fiscale = ?").get('RSSMRA80A01H501Z');
      console.log('\n🔎 Dettaglio Mario Rossi (CF RSSMRA80A01H501Z):');
      if (mario) {
        const agent = getUserById(db, mario.assigned_agent_id);
        const summary = {
          id: mario.id,
          nome: mario.nome,
          cognome: mario.cognome,
          codice_fiscale: mario.codice_fiscale,
          assigned_agent_id: mario.assigned_agent_id || null,
          agent: agent ? `${agent.nome || ''} ${agent.cognome || ''} <${agent.email}> [${agent.role}]` : null,
          created_at: mario.created_at
        };
        console.log(summary);
        console.log('Row completo:', mario);
      } else {
        console.log('Cliente non trovato');
      }
    } catch (e) {
      console.log('Errore controllo mirato:', e.message);
    }

    console.log('\n✅ Verifica completata');
  } catch (err) {
    console.error('❌ Errore verifica:', err.message);
  } finally {
    db.close();
  }
}

main();