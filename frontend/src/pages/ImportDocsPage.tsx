import { BookOpen, FileText, Link as LinkIcon } from 'lucide-react';

export default function ImportDocsPage() {
  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="text-blue-700" size={28} />
          <h1 className="text-2xl font-bold text-blue-800">Documentazione Import Unificato</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white shadow rounded border p-4">
            <h2 className="font-semibold mb-2">Obiettivi</h2>
            <ul className="list-disc pl-5 text-sm">
              <li>Import clienti privati e aziende</li>
              <li>Import contratti luce e gas</li>
              <li>Assegnazione agli agenti</li>
              <li>Gestione stato contratti</li>
            </ul>
          </div>
          <div className="bg-white shadow rounded border p-4">
            <h2 className="font-semibold mb-2">Prerequisiti</h2>
            <ul className="list-disc pl-5 text-sm">
              <li>File CSV con intestazioni</li>
              <li>Colonna <code>tipo_record</code> per ogni riga</li>
              <li>Utente autenticato nell’app</li>
            </ul>
          </div>
          <div className="bg-white shadow rounded border p-4">
            <h2 className="font-semibold mb-2">tipo_record supportati</h2>
            <ul className="list-disc pl-5 text-sm">
              <li><code>cliente_privato</code></li>
              <li><code>cliente_azienda</code></li>
              <li><code>contratto_luce</code></li>
              <li><code>contratto_gas</code></li>
            </ul>
          </div>
        </div>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Clienti Privati</h2>
          <div className="bg-white shadow rounded border p-4">
            <p className="text-sm mb-2"><code>tipo_record=cliente_privato</code></p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li><strong>Obbligatori:</strong> <code>nome</code>, <code>cognome</code>, <code>codice_fiscale</code></li>
              <li><strong>Consigliati:</strong> <code>email_principale</code>, <code>telefono_mobile</code>, indirizzo residenza</li>
              <li><strong>Assegnazione agente (uno di):</strong> ID (<code>assigned_agent_id</code> | <code>agente_id</code> | <code>agent_id</code>) oppure Email (<code>assigned_agent_email</code> | <code>agente_email</code> | <code>agent_email</code> | <code>assegnato_a_email</code>)</li>
            </ul>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Clienti Aziende</h2>
          <div className="bg-white shadow rounded border p-4">
            <p className="text-sm mb-2"><code>tipo_record=cliente_azienda</code></p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li><strong>Obbligatori:</strong> <code>ragione_sociale</code>, <code>partita_iva</code></li>
              <li><strong>Consigliati:</strong> <code>email_principale</code>, indirizzo sede legale</li>
              <li><strong>Assegnazione agente:</strong> come sopra</li>
            </ul>
          </div>
        </section>

        <section className="mb-6 grid md:grid-cols-2 gap-4">
          <div className="bg-white shadow rounded border p-4">
            <h3 className="font-semibold mb-2">Contratti Luce</h3>
            <p className="text-sm mb-2"><code>tipo_record=contratto_luce</code></p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li><strong>Obbligatori:</strong> <code>pod</code> (o <code>numero_contratto_luce</code>), <code>fornitore</code>, <code>data_attivazione</code></li>
              <li><strong>Opzionali:</strong> <code>data_scadenza</code>, <code>prezzo_energia</code>, <code>stato</code></li>
              <li><strong>Associazione cliente:</strong> match su dati cliente (CF/PI/Email) o ID diretto (<code>cliente_privato_id</code>/<code>cliente_azienda_id</code>)</li>
            </ul>
          </div>
          <div className="bg-white shadow rounded border p-4">
            <h3 className="font-semibold mb-2">Contratti Gas</h3>
            <p className="text-sm mb-2"><code>tipo_record=contratto_gas</code></p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li><strong>Obbligatori:</strong> <code>pdr</code> (o <code>numero_contratto_gas</code>), <code>fornitore</code>, <code>data_attivazione</code></li>
              <li><strong>Opzionali:</strong> <code>data_scadenza</code>, <code>prezzo_gas</code>, <code>stato</code></li>
              <li><strong>Associazione cliente:</strong> come per luce</li>
            </ul>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Esempi CSV</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded border p-3">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2"><FileText size={16} /> Cliente Privato</div>
              <pre className="text-xs overflow-auto"><code>{`tipo_record,nome,cognome,codice_fiscale,email_principale,assigned_agent_email
cliente_privato,Mario,Rossi,RSSMRA80A01H501Z,mario.rossi@example.com,agente1@example.com`}</code></pre>
            </div>
            <div className="bg-gray-50 rounded border p-3">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2"><FileText size={16} /> Contratto Luce</div>
              <pre className="text-xs overflow-auto"><code>{`tipo_record,pod,fornitore,data_attivazione,codice_fiscale,stato
contratto_luce,IT001E123456789,Enel,2023-05-10,RSSMRA80A01H501Z,attivo`}</code></pre>
            </div>
            <div className="bg-gray-50 rounded border p-3">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2"><FileText size={16} /> Cliente Azienda</div>
              <pre className="text-xs overflow-auto"><code>{`tipo_record,ragione_sociale,partita_iva,email_principale,agente_id
cliente_azienda,Acme Srl,01234567890,info@acmesrl.it,42`}</code></pre>
            </div>
            <div className="bg-gray-50 rounded border p-3">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2"><FileText size={16} /> Contratto Gas</div>
              <pre className="text-xs overflow-auto"><code>{`tipo_record,pdr,fornitore,data_attivazione,cliente_privato_id
contratto_gas,IT001G987654321,Hera,2023-06-15,101`}</code></pre>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Procedura</h2>
          <ol className="list-decimal pl-5 text-sm space-y-1">
            <li>Accedi con un utente abilitato</li>
            <li>Apri la modale Import Unificato (beta)</li>
            <li>Seleziona il CSV, usa "Dry run" per test</li>
            <li>Avvia import e mostra il risultato</li>
            <li>Se OK, ripeti senza "Dry run" per scrivere su DB</li>
          </ol>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Risoluzione Problemi</h2>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Token mancante: esegui login</li>
            <li>Errori su <code>pod</code>/<code>pdr</code>: verifica formati, fornitore e date</li>
            <li>Agente non assegnato: verifica ID o email</li>
            <li>Righe non processate: controlla gli errori nel risultato</li>
          </ul>
        </section>

        <div className="flex items-center gap-2 text-sm">
          <LinkIcon size={16} />
          <a className="text-blue-700 underline" href="/DOCUMENTAZIONE_IMPORT_UNIFICATO.md" target="_blank" rel="noopener noreferrer">
            Apri versione Markdown
          </a>
        </div>
      </div>
    </div>
  );
}