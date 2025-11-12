# Guida Import CSV Unificato

## Panoramica

Il sistema di import CSV unificato permette di importare diversi tipi di record attraverso un singolo file CSV. Il sistema utilizza il campo `tipo_record` per identificare automaticamente il tipo di dato da importare e mappare i campi appropriati.

## Tipi di Record Supportati

### 1. Cliente Privato (`cliente_privato`)
**Campi obbligatori:**
- `tipo_record`: "cliente_privato"
- `nome`: Nome del cliente
- `cognome`: Cognome del cliente
- `codice_fiscale`: Codice fiscale (formato: AAABBB##A##A###A)

**Campi opzionali:**
- `data_nascita`: Data di nascita (formato: YYYY-MM-DD)
- `email_principale`: Email principale
- `telefono_mobile`: Numero di telefono mobile
- `via_residenza`, `civico_residenza`, `cap_residenza`, `citta_residenza`, `provincia_residenza`: Indirizzo di residenza

**Esempio:**
```csv
tipo_record,nome,cognome,codice_fiscale,data_nascita,email_principale,telefono_mobile
cliente_privato,Mario,Rossi,RSSMRA80A01H501Z,1980-01-01,mario.rossi@email.com,3331234567
```

### 2. Cliente Azienda (`cliente_azienda`)
**Campi obbligatori:**
- `tipo_record`: "cliente_azienda"
- `ragione_sociale`: Ragione sociale dell'azienda
- `partita_iva`: Partita IVA (11 cifre)

**Campi opzionali:**
- `codice_ateco`: Codice ATECO dell'attività
- `pec_aziendale`: PEC aziendale
- `via_sede_legale`, `civico_sede_legale`, `cap_sede_legale`, `citta_sede_legale`, `provincia_sede_legale`: Indirizzo sede legale
- `nome_referente`, `cognome_referente`, `email_referente`, `telefono_referente`: Dati del referente aziendale

**Esempio:**
```csv
tipo_record,ragione_sociale,partita_iva,codice_ateco,pec_aziendale
cliente_azienda,Acme S.r.l.,12345678901,62.01.01,acme@pec.it
```

### 3. Contratto Luce (`contratto_luce`)
**Campi obbligatori:**
- `tipo_record`: "contratto_luce"
- `numero_contratto`: Numero del contratto
- `pod`: Codice POD (formato: IT###E############)
- `fornitore`: Nome del fornitore

**Campi di associazione cliente (uno dei due gruppi):**
- Per cliente privato: `nome`, `cognome`, `codice_fiscale`
- Per cliente azienda: `ragione_sociale`, `partita_iva`

**Campi opzionali:**
- `data_attivazione`, `data_scadenza`: Date del contratto (formato: YYYY-MM-DD)
- `tipologia_mercato`: "libero" o "tutelato"
- `potenza_impegnata`: Potenza in kW
- `consumo_annuo_stimato`: Consumo annuo in kWh
- `prezzo_energia`: Prezzo dell'energia in €/kWh
- `costo_fisso_mensile`: Costo fisso mensile in €
- `tipo_tariffa`: Tipo di tariffa (es. "Bioraria", "Trioraria")
- `stato_contratto`: Stato del contratto
- `assigned_agent_email`: Email dell'agente assegnato

### 4. Contratto Gas (`contratto_gas`)
**Campi obbligatori:**
- `tipo_record`: "contratto_gas"
- `numero_contratto`: Numero del contratto
- `pdr`: Codice PDR (14 cifre)
- `fornitore`: Nome del fornitore

**Campi di associazione cliente:** (come per contratto luce)

**Campi opzionali:**
- `data_attivazione`, `data_scadenza`: Date del contratto
- `tipologia_mercato`: "libero" o "tutelato"
- `classe_contatore`: Classe del contatore (es. "G4", "G6")
- `consumo_annuo_stimato`: Consumo annuo in Smc
- `prezzo_gas`: Prezzo del gas in €/Smc
- `costo_fisso_mensile`: Costo fisso mensile in €
- `tipo_tariffa`: Tipo di tariffa
- `stato_contratto`: Stato del contratto
- `assigned_agent_email`: Email dell'agente assegnato

### 5. Compenso (`compenso`)
**Campi obbligatori:**
- `tipo_record`: "compenso"
- `importo_compenso`: Importo del compenso in €
- `tipo_compenso`: Tipo di compenso (es. "commissione_contratto")
- `stato_compenso`: Stato del compenso (es. "maturato", "pagato")

**Campi di associazione:**
- Cliente: `nome`, `cognome`, `codice_fiscale` OPPURE `ragione_sociale`, `partita_iva`
- Contratto: `numero_contratto` (luce o gas)
- Agente: `assigned_agent_email`

**Campi opzionali:**
- `descrizione_compenso`: Descrizione del compenso
- `data_maturazione`: Data di maturazione (formato: YYYY-MM-DD)

### 6. Offerta (`offerta`)
**Campi obbligatori:**
- `tipo_record`: "offerta"
- `nome_offerta`: Nome dell'offerta
- `tipo_energia`: "luce", "gas", o "dual"
- `stato_offerta`: Stato dell'offerta (es. "attiva", "sospesa")

**Campi opzionali:**
- `data_inizio_validita`, `data_fine_validita`: Periodo di validità
- `prezzo_luce_offerta`: Prezzo energia elettrica
- `durata_vincolo_mesi`: Durata del vincolo in mesi
- `target_clienti`: Target clienti (es. "privati", "aziende")

### 7. Task (`task`)
**Campi obbligatori:**
- `tipo_record`: "task"
- `titolo_task`: Titolo del task
- `tipo_task`: Tipo di task (es. "chiamata", "appuntamento")
- `priorita_task`: Priorità (es. "alta", "media", "bassa")

**Campi di associazione cliente:** (come per contratti)

**Campi opzionali:**
- `data_scadenza_task`: Data di scadenza (formato: YYYY-MM-DD HH:MM:SS)
- `assigned_user_email`: Email dell'utente assegnato
- `completato`: true/false

### 8. Documento (`documento`)
**Campi obbligatori:**
- `tipo_record`: "documento"
- `nome_file`: Nome del file
- `percorso_file`: Percorso del file
- `tipo_documento_allegato`: Tipo di documento

**Campi di associazione cliente:** (come per contratti)

### 9. AI Match (`ai_match`)
**Campi obbligatori:**
- `tipo_record`: "ai_match"
- `score_matching`: Score di matching (0-100)
- `categoria_lead`: Categoria del lead (es. "hot", "warm", "cold")

**Campi di associazione cliente:** (come per contratti)

**Campi opzionali:**
- `risparmio_stimato_annuo`: Risparmio stimato annuo in €
- `stato_contatto`: Stato del contatto

### 10. Email Template (`email_template`)
**Campi obbligatori:**
- `tipo_record`: "email_template"
- `nome_template`: Nome del template
- `tipologia_template`: Tipologia del template
- `oggetto_email`: Oggetto dell'email
- `corpo_html`: Corpo HTML dell'email

**Campi opzionali:**
- `attivo_template`: true/false

### 11. Email Campaign (`email_campaign`)
**Campi obbligatori:**
- `tipo_record`: "email_campaign"
- `nome_campagna`: Nome della campagna
- `tipologia_campagna`: Tipologia della campagna

**Campi opzionali:**
- `data_schedulata`: Data di schedulazione (formato: YYYY-MM-DD HH:MM:SS)
- `stato_campagna`: Stato della campagna

### 12. Consenso GDPR (`consenso_gdpr`)
**Campi obbligatori:**
- `tipo_record`: "consenso_gdpr"
- `tipo_consenso_gdpr`: Tipo di consenso (es. "privacy", "marketing")
- `consenso_dato`: true/false

**Campi di associazione cliente:** (come per contratti)

**Campi opzionali:**
- `data_consenso`: Data del consenso (formato: YYYY-MM-DD HH:MM:SS)
- `modalita_acquisizione_consenso`: Modalità di acquisizione (es. "web", "telefono")

## Logica di Auto-Detection

Il sistema utilizza la seguente logica per identificare automaticamente il tipo di record:

1. **Campo `tipo_record`**: Se presente e valido, viene utilizzato direttamente
2. **Fallback automatico**: Se `tipo_record` è assente o non valido, il sistema analizza i campi presenti:
   - Presenza di `ragione_sociale` + `partita_iva` → `cliente_azienda`
   - Presenza di `nome` + `cognome` + `codice_fiscale` → `cliente_privato`
   - Presenza di `pod` → `contratto_luce`
   - Presenza di `pdr` → `contratto_gas`
   - Presenza di `importo_compenso` → `compenso`
   - Presenza di `nome_offerta` → `offerta`
   - Presenza di `titolo_task` → `task`
   - Presenza di `nome_file` + `percorso_file` → `documento`
   - Presenza di `score_matching` → `ai_match`
   - Presenza di `nome_template` → `email_template`
   - Presenza di `nome_campagna` → `email_campaign`
   - Presenza di `tipo_consenso_gdpr` → `consenso_gdpr`

## Associazioni tra Record

### Associazione Cliente-Contratto
I contratti vengono automaticamente associati ai clienti tramite:
- **Cliente privato**: `nome` + `cognome` + `codice_fiscale`
- **Cliente azienda**: `ragione_sociale` + `partita_iva`

### Associazione Agente
L'associazione con gli agenti avviene tramite il campo `assigned_agent_email` che deve corrispondere all'email di un utente esistente nel sistema.

### Associazione Contratto-Compenso
I compensi vengono associati ai contratti tramite il campo `numero_contratto`.

## Validazioni

### Codice Fiscale
- Formato: 16 caratteri alfanumerici
- Controllo checksum automatico

### Partita IVA
- Formato: 11 cifre numeriche
- Controllo checksum automatico

### POD (Point of Delivery)
- Formato: IT + 3 cifre + E + 12 cifre
- Esempio: IT001E123456789012

### PDR (Punto di Riconsegna)
- Formato: 14 cifre numeriche
- Esempio: 12345678901234

### Email
- Validazione formato email standard
- Controllo dominio per email aziendali

### Date
- Formato accettato: YYYY-MM-DD
- Formato con orario: YYYY-MM-DD HH:MM:SS

## Gestione Errori

Il sistema gestisce i seguenti tipi di errori:

1. **Errori di formato**: Campi con formato non valido
2. **Errori di validazione**: Dati che non superano le validazioni
3. **Errori di associazione**: Impossibilità di associare record correlati
4. **Duplicati**: Record già esistenti nel sistema
5. **Campi obbligatori mancanti**: Campi richiesti non presenti

Ogni errore viene registrato con:
- Numero di riga del CSV
- Campo interessato
- Tipo di errore
- Messaggio descrittivo
- Suggerimento per la correzione

## Best Practices

1. **Ordine di import**: Importare prima i clienti, poi i contratti, infine gli altri record correlati
2. **Encoding**: Utilizzare UTF-8 per caratteri speciali
3. **Separatori**: Utilizzare virgola (,) come separatore
4. **Quote**: Racchiudere tra virgolette i campi contenenti virgole o a capo
5. **Date**: Utilizzare sempre il formato ISO (YYYY-MM-DD)
6. **Email**: Verificare che le email degli agenti esistano nel sistema
7. **Backup**: Effettuare sempre un backup prima di import massivi

## Esempi di File CSV

Vedere il file `esempi_import_test.csv` per esempi completi di ogni tipo di record.