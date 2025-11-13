[Thu Nov 13 2025 18:59:46.719]
gestionale-energia-app: 
::ffff:172.18.0.2 - - [13/Nov/2025:17:59:46 +0000] "GET /api/contratti/cliente/privato/7113651a-c997-4731-8970-bd352dd28081 HTTP/1.1" 200 777 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
[Thu Nov 13 2025 18:59:49.474]
gestionale-energia-app: 
::ffff:172.18.0.2 - - [13/Nov/2025:17:59:49 +0000] "GET /api/contratti/cliente/privato/5e867faf-8ba9-472c-9e66-c374f2850cd1 HTTP/1.1" 200 765 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
[Thu Nov 13 2025 18:59:50.826]
gestionale-energia-app: 
::ffff:172.18.0.2 - - [13/Nov/2025:17:59:50 +0000] "GET /api/contratti/cliente/privato/5e867faf-8ba9-472c-9e66-c374f2850cd1 HTTP/1.1" 200 765 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
[Thu Nov 13 2025 18:59:50.908]
gestionale-energia-app: 
🔄 Stato cliente 5e867faf-8ba9-472c-9e66-c374f2850cd1 sincronizzato con contratto luce: Attivo
[Thu Nov 13 2025 18:59:50.908]
gestionale-energia-app: 
🔍 Verifica condizioni automazione commissione (da contratto LUCE):
[Thu Nov 13 2025 18:59:50.908]
gestionale-energia-app: 
- Stato nuovo: Attivo
[Thu Nov 13 2025 18:59:50.908]
gestionale-energia-app: 
- Stati che triggerano pagamento: [ 'Attivo', 'attivo', 'attiva', 'ATTIVA' ]
[Thu Nov 13 2025 18:59:50.908]
gestionale-energia-app: 
- Stato è valido? true
[Thu Nov 13 2025 18:59:50.908]
gestionale-energia-app: 
- Commissione già pagata? null
[Thu Nov 13 2025 18:59:50.908]
gestionale-energia-app: 
- Commissione LUCE: 11
[Thu Nov 13 2025 18:59:50.908]
gestionale-energia-app: 
- Agente assegnato: 0979aabb-fe9f-4298-aa69-092a4e36ef30
[Thu Nov 13 2025 18:59:50.908]
gestionale-energia-app: 
::ffff:172.18.0.2 - - [13/Nov/2025:17:59:50 +0000] "PUT /api/contratti/luce/248ece73-0375-495a-8257-44560360d03b HTTP/1.1" 200 756 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
❌ Errore query SQLite: SqliteError: FOREIGN KEY constraint failed
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
at Object.query (/app/dist/backend/config/database.js:60:37)
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
at /app/dist/backend/routes/storico-procedure.js:138:35
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
at process.processTicksAndRejections (node:internal/process/task_queues:105:5) {
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
code: 'SQLITE_CONSTRAINT_FOREIGNKEY'
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
}
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
↳ SQL:
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
INSERT INTO storico_procedure (
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
id,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
contratto_luce_id,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
tipo_contratto,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
procedura_precedente,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
procedura_nuova,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
note,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
allegato_filename,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
allegato_path,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
allegato_mimetype,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
allegato_size,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
created_by,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
created_at
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
↳ Params: [
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'b10309cf-54e3-4685-921c-08c212e064ee',
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'248ece73-0375-495a-8257-44560360d03b',
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'luce',
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
null,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'Switch',
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'Stato modificato dalla lista clienti',
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
null,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
null,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
null,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
null,
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'afa64685-9c41-414a-a931-44b01f65d6e7'
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
]
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
❌ Errore: SqliteError: FOREIGN KEY constraint failed
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
at Object.query (/app/dist/backend/config/database.js:60:37)
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
at /app/dist/backend/routes/storico-procedure.js:138:35
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
at process.processTicksAndRejections (node:internal/process/task_queues:105:5) {
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
code: 'SQLITE_CONSTRAINT_FOREIGNKEY'
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
}
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
=== DEBUG PROCEDURA_NUOVA ===
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
Valore ricevuto: "Switch"
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
Tipo: string
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
Lunghezza: 6
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
Valore trimmed: "Switch"
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
Valori validi: [
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'Switch',
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'Voltura',
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'Subentro',
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'Allaccio',
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'Attivazione su presa morosa',
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'Disattivazione',
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
'Voltura mortis causa'
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
]
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
È incluso nei valori validi? true
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
=============================
[Thu Nov 13 2025 18:59:50.985]
gestionale-energia-app: 
::ffff:172.18.0.2 - - [13/Nov/2025:17:59:50 +0000] "POST /api/storico-procedure/luce/248ece73-0375-495a-8257-44560360d03b HTTP/1.1" 500 64 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
