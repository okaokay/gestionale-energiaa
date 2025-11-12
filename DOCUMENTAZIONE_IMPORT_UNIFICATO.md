# Documentazione Import Unificato (CSV)

Questa guida spiega come preparare e importare correttamente i dati di **clienti** e **contratti** (luce/gas) tramite la funzionalità di **Import Unificato**.

## Obiettivi
- Creare/aggiornare clienti privati e aziende.
- Importare contratti luce e gas collegati ai clienti.
- Assegnare i clienti/contratti agli agenti.
- Gestire lo stato dei contratti.

## Prerequisiti
- File in formato `CSV` con intestazioni di colonna.
- Ogni riga deve avere la colonna `tipo_record` che identifica cosa stai importando.
- Autenticazione attiva nell'applicazione per usare l'import.

## tipo_record supportati
- `cliente_privato`
- `cliente_azienda`
- `contratto_luce`
- `contratto_gas`

## Campi per Clienti Privati (`tipo_record=cliente_privato`)
- Obbligatori: `nome`, `cognome`, `codice_fiscale`
- Consigliati: `email_principale`, `telefono_mobile`, indirizzo: `via_residenza`, `civico_residenza`, `cap_residenza`, `citta_residenza`, `provincia_residenza`
- Assegnazione agente (uno dei seguenti):
  - ID: `assigned_agent_id` | `agente_id` | `agent_id`
  - Email: `assigned_agent_email` | `agente_email` | `agent_email` | `assegnato_a_email`

## Campi per Clienti Aziende (`tipo_record=cliente_azienda`)
- Obbligatori: `ragione_sociale`, `partita_iva`
- Consigliati: `email_principale`, indirizzo sede legale: `via_sede_legale`, `civico_sede_legale`, `cap_sede_legale`, `citta_sede_legale`, `provincia_sede_legale`
- Assegnazione agente: stessi campi dei clienti privati.

## Campi per Contratti Luce (`tipo_record=contratto_luce`)
- Obbligatori: `pod` (oppure `numero_contratto_luce`), `fornitore`, `data_attivazione`
- Opzionali utili: `data_scadenza`, `prezzo_energia`, `stato` (esempi: `attivo`, `scaduto`, `disdetto`, `compilazione`)
- Associazione al cliente:
  - Automatica se nella stessa riga fornisci dati cliente (`codice_fiscale` / `partita_iva` / `email_principale`).
  - Diretta tramite ID: `cliente_privato_id` / `cliente_azienda_id`.

## Campi per Contratti Gas (`tipo_record=contratto_gas`)
- Obbligatori: `pdr` (oppure `numero_contratto_gas`), `fornitore`, `data_attivazione`
- Opzionali utili: `data_scadenza`, `prezzo_gas`, `stato` (come sopra)
- Associazione al cliente: come per luce.

## Gestione dello Stato dei Contratti
- Se la colonna `stato` è presente ma senza valore, il sistema imposta **`compilazione`** come default.
- Puoi aggiornare `stato` successivamente nella UI.

## Campi che puoi omettere e aggiungere dopo
- Indirizzi completi dei clienti.
- Prezzi (`prezzo_energia`, `prezzo_gas`) e altri dettagli economici.
- Note interne e flag di consenso (`note`, `consenso_marketing`, `news_letter`).
- `stato` dei contratti (se non essenziale inizialmente).

## Esempi di CSV

### Cliente Privato
```
tipo_record,nome,cognome,codice_fiscale,email_principale,assigned_agent_email
cliente_privato,Mario,Rossi,RSSMRA80A01H501Z,mario.rossi@example.com,agente1@example.com
```

### Cliente Azienda
```
tipo_record,ragione_sociale,partita_iva,email_principale,agente_id
cliente_azienda,Acme Srl,01234567890,info@acmesrl.it,42
```

### Contratto Luce con associazione automatica al cliente
```
tipo_record,pod,fornitore,data_attivazione,codice_fiscale,stato
contratto_luce,IT001E123456789,Enel,2023-05-10,RSSMRA80A01H501Z,attivo
```

### Contratto Gas con associazione via ID cliente
```
tipo_record,pdr,fornitore,data_attivazione,cliente_privato_id
contratto_gas,IT001G987654321,Hera,2023-06-15,101
```

## Procedura di Import
1. Apri l’app e accedi con un utente abilitato.
2. Vai alla pagina che apre la modale **Import Unificato (beta)**.
3. Seleziona il file CSV e, se necessario, attiva **Dry run** per testare senza scrivere su DB.
4. Avvia l’import e poi clicca **Mostra Risultato** per vedere righe processate, inserimenti ed eventuali errori.
5. Se l’esito è corretto, esegui senza **Dry run** per applicare le modifiche.

## Risoluzione problemi
- "Token di autenticazione mancante": esegui login e riprova.
- Errori su `pod`/`pdr`: verifica formati e la presenza del fornitore e date.
- Agent non assegnato: controlla che almeno uno dei campi ID o email dell’agente sia valido.
- Righe non processate: usa la funzione **Mostra Risultato** per leggere messaggi di errore dettagliati.

## Note
- Il sistema può **rilevare automaticamente** il tipo record se il flag apposito è attivo.
- Il CSV può contenere righe miste (clienti e contratti) purché ogni riga abbia `tipo_record` corretto.

## Prevenzione Duplicati (contratti luce/gas)
- Per evitare duplicazioni durante re-import dello stesso file, l'import effettua **aggiornamento automatico** se trova un contratto esistente con stesso identificativo:
  - Luce: match su `numero_contratto` oppure su `pod` (eventualmente in contesto cliente).
  - Gas: match su `numero_contratto` oppure su `pdr` (eventualmente in contesto cliente).
- Quando viene trovato un match, il contratto esistente viene **aggiornato** con i nuovi dati (date, fornitore, prezzo, stato), invece di creare un nuovo record.
- Se desideri forzare un nuovo inserimento, assicurati che **`numero_contratto` e `pod/pdr`** non coincidano con un record già presente per lo stesso cliente.