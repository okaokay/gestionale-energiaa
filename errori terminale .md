[Sun Nov 09 2025 11:53:23.679]
gestionale-energia-app: 
::ffff:172.18.0.3 - - [09/Nov/2025:10:53:23 +0000] "GET /api/emails/templates HTTP/1.1" 200 26 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
[Sun Nov 09 2025 11:53:35.080]
gestionale-energia-app: 
✅ Email personalizzata inviata: lucatozzi1994@gmail.com | Subject: ciao
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
❌ Errore query SQLite: SqliteError: no such table: cliente_azioni
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
at Database.prepare (/app/node_modules/better-sqlite3/lib/methods/wrappers.js:5:21)
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
at Object.query (/app/dist/backend/config/database.js:56:33)
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
at /app/dist/backend/routes/clientActions.js:470:35
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
at process.processTicksAndRejections (node:internal/process/task_queues:95:5) {
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
code: 'SQLITE_ERROR'
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
}
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
↳ SQL:
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
INSERT INTO cliente_azioni (
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
id, cliente_id, tipo_cliente, tipo_azione, titolo, descrizione,
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
esito, utente_id, metadata
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
) VALUES (?, ?, ?, 'email', 'Email personalizzata inviata', ?, 'successo', ?, ?)
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
↳ Params: [
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
'6355f71b-f5a0-4088-a416-f3d5591356f6',
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
'86744df1-7c0c-4248-826a-1294681dddf6',
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
'privato',
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
'Oggetto: ciao',
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
'95305eb0-1280-4d15-916f-8d58c8c54ab6',
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
'{"destinatari":["lucatozzi1994@gmail.com"],"oggetto":"ciao","tipo":"custom"}'
[Sun Nov 09 2025 11:53:35.081]
gestionale-energia-app: 
]
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
❌ Errore invio email personalizzata: SqliteError: no such table: cliente_azioni
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
at Database.prepare (/app/node_modules/better-sqlite3/lib/methods/wrappers.js:5:21)
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
at Object.query (/app/dist/backend/config/database.js:56:33)
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
at /app/dist/backend/routes/clientActions.js:470:35
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
at process.processTicksAndRejections (node:internal/process/task_queues:95:5) {
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
code: 'SQLITE_ERROR'
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
}
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
❌ Errore: SqliteError: no such table: cliente_azioni
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
at Database.prepare (/app/node_modules/better-sqlite3/lib/methods/wrappers.js:5:21)
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
at Object.query (/app/dist/backend/config/database.js:56:33)
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
at /app/dist/backend/routes/clientActions.js:470:35
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
at process.processTicksAndRejections (node:internal/process/task_queues:95:5) {
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
code: 'SQLITE_ERROR'
[Sun Nov 09 2025 11:53:35.082]
gestionale-energia-app: 
}
[Sun Nov 09 2025 11:53:35.083]
gestionale-energia-app: 
::ffff:172.18.0.3 - - [09/Nov/2025:10:53:35 +0000] "POST /api/client-actions/send-custom-email HTTP/1.1" 500 64 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
