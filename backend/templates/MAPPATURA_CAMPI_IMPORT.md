# MAPPATURA CAMPI IMPORT UNIVERSALE

## Panoramica
Questo documento descrive la mappatura completa dei campi per il sistema di import universale CSV basato sull'analisi completa dello schema database (16 tabelle principali). Il sistema supporta l'import di diversi tipi di record con auto-detection intelligente.

## Logica Auto-Detection

### Identificazione Tipo Record
Il sistema identifica automaticamente il tipo di record in base al campo `tipo_record` (obbligatorio) e ai campi compilati:

1. **cliente_privato**: `tipo_record=cliente_privato` + presenza di `nome`, `cognome`, `codice_fiscale`
2. **cliente_azienda**: `tipo_record=cliente_azienda` + presenza di `ragione_sociale`, `partita_iva`
3. **contratto_luce**: `tipo_record=contratto_luce` + presenza di `numero_contratto` o `pod`
4. **contratto_gas**: `tipo_record=contratto_gas` + presenza di `numero_contratto` o `pdr`
5. **compenso**: `tipo_record=compenso` + presenza di `importo_compenso`, `tipo_compenso`
6. **offerta**: `tipo_record=offerta` + presenza di `nome_offerta`, `fornitore`
7. **task**: `tipo_record=task` + presenza di `titolo_task`, `tipo_task`
8. **documento**: `tipo_record=documento` + presenza di `nome_file`, `percorso_file`
9. **ai_match**: `tipo_record=ai_match` + presenza di `score_matching`, `categoria_lead`
10. **email_template**: `tipo_record=email_template` + presenza di `nome_template`, `oggetto_email`
11. **email_campaign**: `tipo_record=email_campaign` + presenza di `nome_campagna`, `tipologia_campagna`
12. **consenso_gdpr**: `tipo_record=consenso_gdpr` + presenza di `tipo_consenso_gdpr`, `consenso_dato`

## Mappatura Campi per Entità

---

## 🗂️ **MAPPATURA CAMPI DATABASE**

### **👤 CLIENTI PRIVATI → `clienti_privati`**

| **Campo CSV** | **Campo DB** | **Tipo** | **Note** |
|---------------|--------------|----------|----------|
| `nome` | `nome` | VARCHAR(100) | Obbligatorio |
| `cognome` | `cognome` | VARCHAR(100) | Obbligatorio |
| `codice_fiscale` | `codice_fiscale` | VARCHAR(16) | Unique, obbligatorio |
| `data_nascita` | `data_nascita` | DATE | Formato: YYYY-MM-DD |
| `luogo_nascita` | `luogo_nascita` | VARCHAR(100) | |
| `provincia_nascita` | `provincia_nascita` | VARCHAR(2) | Sigla provincia |
| `sesso` | `sesso` | ENUM('M','F') | M o F |
| `stato_civile` | `stato_civile` | VARCHAR(50) | |
| `professione` | `professione` | VARCHAR(100) | |
| `telefono` | `telefono` | VARCHAR(20) | |
| `email` | `email` | VARCHAR(255) | Unique se presente |
| `pec` | `pec` | VARCHAR(255) | |
| `indirizzo_residenza` | `indirizzo_residenza` | VARCHAR(255) | |
| `civico_residenza` | `civico_residenza` | VARCHAR(10) | |
| `cap_residenza` | `cap_residenza` | VARCHAR(5) | |
| `citta_residenza` | `citta_residenza` | VARCHAR(100) | |
| `provincia_residenza` | `provincia_residenza` | VARCHAR(2) | |
| `indirizzo_domicilio` | `indirizzo_domicilio` | VARCHAR(255) | |
| `civico_domicilio` | `civico_domicilio` | VARCHAR(10) | |
| `cap_domicilio` | `cap_domicilio` | VARCHAR(5) | |
| `citta_domicilio` | `citta_domicilio` | VARCHAR(100) | |
| `provincia_domicilio` | `provincia_domicilio` | VARCHAR(2) | |
| `indirizzo_fornitura` | `indirizzo_fornitura` | VARCHAR(255) | |
| `civico_fornitura` | `civico_fornitura` | VARCHAR(10) | |
| `cap_fornitura` | `cap_fornitura` | VARCHAR(5) | |
| `citta_fornitura` | `citta_fornitura` | VARCHAR(100) | |
| `provincia_fornitura` | `provincia_fornitura` | VARCHAR(2) | |
| `tipo_documento` | `tipo_documento` | VARCHAR(50) | |
| `numero_documento` | `numero_documento` | VARCHAR(50) | |
| `data_rilascio_documento` | `data_rilascio_documento` | DATE | |
| `scadenza_documento` | `scadenza_documento` | DATE | |
| `ente_rilascio` | `ente_rilascio` | VARCHAR(100) | |
| `iban` | `iban` | VARCHAR(34) | |
| `intestatario_conto` | `intestatario_conto` | VARCHAR(255) | |
| `banca` | `banca` | VARCHAR(100) | |
| `commissione_luce` | `commissione_luce` | DECIMAL(10,2) | |
| `commissione_gas` | `commissione_gas` | DECIMAL(10,2) | |
| `agente_email` | `assigned_agent_id` | INT | FK → users(id) via email |

### **🏢 CLIENTI AZIENDE → `clienti_aziende`**

| **Campo CSV** | **Campo DB** | **Tipo** | **Note** |
|---------------|--------------|----------|----------|
| `ragione_sociale` | `ragione_sociale` | VARCHAR(255) | Obbligatorio |
| `partita_iva` | `partita_iva` | VARCHAR(11) | Unique, obbligatorio |
| `codice_fiscale_azienda` | `codice_fiscale` | VARCHAR(16) | |
| `forma_giuridica` | `forma_giuridica` | VARCHAR(100) | |
| `codice_ateco` | `codice_ateco` | VARCHAR(10) | |
| `descrizione_ateco` | `descrizione_ateco` | VARCHAR(255) | |
| `data_costituzione` | `data_costituzione` | DATE | |
| `capitale_sociale` | `capitale_sociale` | DECIMAL(15,2) | |
| `numero_dipendenti` | `numero_dipendenti` | INT | |
| `fatturato_annuo` | `fatturato_annuo` | DECIMAL(15,2) | |
| `telefono_azienda` | `telefono` | VARCHAR(20) | |
| `email_azienda` | `email` | VARCHAR(255) | |
| `pec_azienda` | `pec` | VARCHAR(255) | |
| `sito_web` | `sito_web` | VARCHAR(255) | |
| `indirizzo_sede_legale` | `indirizzo_sede_legale` | VARCHAR(255) | |
| `civico_sede_legale` | `civico_sede_legale` | VARCHAR(10) | |
| `cap_sede_legale` | `cap_sede_legale` | VARCHAR(5) | |
| `citta_sede_legale` | `citta_sede_legale` | VARCHAR(100) | |
| `provincia_sede_legale` | `provincia_sede_legale` | VARCHAR(2) | |
| `indirizzo_sede_operativa` | `indirizzo_sede_operativa` | VARCHAR(255) | |
| `civico_sede_operativa` | `civico_sede_operativa` | VARCHAR(10) | |
| `cap_sede_operativa` | `cap_sede_operativa` | VARCHAR(5) | |
| `citta_sede_operativa` | `citta_sede_operativa` | VARCHAR(100) | |
| `provincia_sede_operativa` | `provincia_sede_operativa` | VARCHAR(2) | |
| `nome_referente` | `nome_referente` | VARCHAR(100) | |
| `cognome_referente` | `cognome_referente` | VARCHAR(100) | |
| `ruolo_referente` | `ruolo_referente` | VARCHAR(100) | |
| `telefono_referente` | `telefono_referente` | VARCHAR(20) | |
| `email_referente` | `email_referente` | VARCHAR(255) | |
| `iban_azienda` | `iban` | VARCHAR(34) | |
| `intestatario_conto_azienda` | `intestatario_conto` | VARCHAR(255) | |
| `banca_azienda` | `banca` | VARCHAR(100) | |
| `commissione_luce` | `commissione_luce` | DECIMAL(10,2) | |
| `commissione_gas` | `commissione_gas` | DECIMAL(10,2) | |
| `agente_email` | `assigned_agent_id` | INT | FK → users(id) via email |

### **⚡ CONTRATTI LUCE → `contratti_luce`**

| **Campo CSV** | **Campo DB** | **Tipo** | **Note** |
|---------------|--------------|----------|----------|
| `numero_contratto_luce` | `numero_contratto` | VARCHAR(100) | |
| `pod` | `pod` | VARCHAR(14) | Obbligatorio, unique |
| `fornitore_luce` | `fornitore` | VARCHAR(100) | |
| `data_attivazione_luce` | `data_attivazione` | DATE | |
| `data_scadenza_luce` | `data_scadenza` | DATE | |
| `tipo_mercato_luce` | `tipo_mercato` | ENUM('libero','tutelato') | |
| `potenza_impegnata` | `potenza_impegnata` | DECIMAL(8,2) | kW |
| `potenza_disponibile` | `potenza_disponibile` | DECIMAL(8,2) | kW |
| `consumo_annuo_stimato_luce` | `consumo_annuo_stimato` | DECIMAL(10,2) | kWh |
| `consumo_annuo_reale_luce` | `consumo_annuo_reale` | DECIMAL(10,2) | kWh |
| `fascia_oraria` | `fascia_oraria` | VARCHAR(20) | |
| `prezzo_energia_luce` | `prezzo_energia` | DECIMAL(8,4) | €/kWh |
| `costo_fisso_mensile_luce` | `costo_fisso_mensile` | DECIMAL(8,2) | € |
| `tipo_tariffa_luce` | `tipo_tariffa` | VARCHAR(50) | |
| `bonus_luce` | `bonus` | DECIMAL(8,2) | € |
| `stato_contratto_luce` | `stato` | ENUM('attivo','sospeso','cessato','in_attivazione') | |
| `alert_scadenza_luce` | `alert_scadenza` | BOOLEAN | |

### **🔥 CONTRATTI GAS → `contratti_gas`**

| **Campo CSV** | **Campo DB** | **Tipo** | **Note** |
|---------------|--------------|----------|----------|
| `numero_contratto_gas` | `numero_contratto` | VARCHAR(100) | |
| `pdr` | `pdr` | VARCHAR(14) | Obbligatorio, unique |
| `fornitore_gas` | `fornitore` | VARCHAR(100) | |
| `data_attivazione_gas` | `data_attivazione` | DATE | |
| `data_scadenza_gas` | `data_scadenza` | DATE | |
| `tipo_mercato_gas` | `tipo_mercato` | ENUM('libero','tutelato') | |
| `classe_contatore` | `classe_contatore` | VARCHAR(10) | |
| `consumo_annuo_stimato_gas` | `consumo_annuo_stimato` | DECIMAL(10,2) | Smc |
| `consumo_annuo_reale_gas` | `consumo_annuo_reale` | DECIMAL(10,2) | Smc |
| `coefficiente_c` | `coefficiente_c` | DECIMAL(8,4) | |
| `zona_tariffaria` | `zona_tariffaria` | VARCHAR(10) | |
| `prezzo_gas` | `prezzo_gas` | DECIMAL(8,4) | €/Smc |
| `costo_fisso_mensile_gas` | `costo_fisso_mensile` | DECIMAL(8,2) | € |
| `tipo_tariffa_gas` | `tipo_tariffa` | VARCHAR(50) | |
| `bonus_gas` | `bonus` | DECIMAL(8,2) | € |
| `stato_contratto_gas` | `stato` | ENUM('attivo','sospeso','cessato','in_attivazione') | |
| `alert_scadenza_gas` | `alert_scadenza` | BOOLEAN | |

### **💰 COMPENSI → `compensi`**

| **Campo CSV** | **Campo DB** | **Tipo** | **Note** |
|---------------|--------------|----------|----------|
| `importo_compenso` | `importo` | DECIMAL(10,2) | Obbligatorio |
| `tipo_compenso` | `tipo` | VARCHAR(50) | Obbligatorio |
| `descrizione_compenso` | `descrizione` | TEXT | |
| `stato_compenso` | `stato` | ENUM('maturato','pagato','sospeso') | |
| `data_maturazione` | `data_maturazione` | DATE | |
| `data_pagamento` | `data_pagamento` | DATE | |
| `contratto_tipo_compenso` | `contratto_tipo` | ENUM('luce','gas','generale') | |
| `agente_email` | `agente_id` | INT | FK → users(id) via email |

### **🎯 OFFERTE → `offerte`**

| **Campo CSV** | **Campo DB** | **Tipo** | **Note** |
|---------------|--------------|----------|----------|
| `nome_offerta` | `nome_offerta` | VARCHAR(255) | Obbligatorio |
| `fornitore_offerta` | `fornitore` | VARCHAR(100) | Obbligatorio |
| `tipo_energia_offerta` | `tipo_energia` | ENUM('luce','gas','dual') | Obbligatorio |
| `data_inizio_validita` | `data_inizio_validita` | DATE | |
| `data_fine_validita` | `data_fine_validita` | DATE | |
| `prezzo_energia_offerta` | `prezzo_energia` | DECIMAL(8,4) | |
| `prezzo_gas_offerta` | `prezzo_gas` | DECIMAL(8,4) | |
| `costo_fisso_mensile_offerta` | `costo_fisso_mensile` | DECIMAL(8,2) | |
| `tipo_tariffa_offerta` | `tipo_tariffa` | VARCHAR(50) | |
| `durata_contratto_offerta` | `durata_contratto` | INT | Mesi |
| `target_clienti` | `target_clienti` | ENUM('privati','aziende','entrambi') | |
| `consumo_min` | `consumo_min` | DECIMAL(10,2) | |
| `consumo_max` | `consumo_max` | DECIMAL(10,2) | |
| `potenza_min` | `potenza_min` | DECIMAL(8,2) | |
| `potenza_max` | `potenza_max` | DECIMAL(8,2) | |
| `codici_ateco_ammessi` | `codici_ateco_ammessi` | TEXT | JSON array |
| `zone_geografiche` | `zone_geografiche` | TEXT | JSON array |
| `bonus_offerta` | `bonus` | DECIMAL(8,2) | |
| `incentivi` | `incentivi` | TEXT | |
| `penali` | `penali` | TEXT | |
| `condizioni_speciali` | `condizioni_speciali` | TEXT | |
| `stato_offerta` | `stato` | ENUM('attiva','sospesa','scaduta') | |

### **📋 TASK → `tasks`**

| **Campo CSV** | **Campo DB** | **Tipo** | **Note** |
|---------------|--------------|----------|----------|
| `titolo_task` | `titolo` | VARCHAR(255) | Obbligatorio |
| `descrizione_task` | `descrizione` | TEXT | |
| `tipo_task` | `tipo` | VARCHAR(50) | Obbligatorio |
| `priorita_task` | `priorita` | ENUM('bassa','media','alta','urgente') | |
| `data_scadenza_task` | `data_scadenza` | DATE | |
| `assegnato_a_email` | `assegnato_a` | INT | FK → users(id) via email |
| `stato_task` | `stato` | ENUM('aperto','in_corso','completato','annullato') | |
| `note_completamento` | `note_completamento` | TEXT | |

---

## 🔄 **LOGICA DI COLLEGAMENTO**

### **🔗 Associazione Cliente-Contratto**

Il sistema collega automaticamente contratti ai clienti usando:

1. **Ricerca per Email**: Se presente `email` nel contratto, cerca cliente con stessa email
2. **Ricerca per Codice Fiscale**: Se presente `codice_fiscale`, cerca cliente corrispondente
3. **Ricerca per P.IVA**: Per aziende, cerca per `partita_iva`
4. **Creazione Automatica**: Se cliente non esiste, lo crea automaticamente

### **🎯 Associazione Agente**

Gli agenti vengono associati tramite:

1. **Email Agente**: Campo `agente_email` deve corrispondere a un utente esistente
2. **Ruolo Valido**: L'utente deve avere ruolo `operatore`, `admin` o `super_admin`
3. **Stato Attivo**: L'agente deve essere attivo nel sistema

### **💰 Gestione Compensi**

I compensi vengono collegati automaticamente:

1. **Agente**: Via `agente_email`
2. **Cliente**: Via associazione contratto-cliente
3. **Contratto**: Via `numero_contratto` o `pod`/`pdr`
4. **Tipo**: Automatico in base al tipo di contratto

---

## ⚠️ **VALIDAZIONI E CONTROLLI**

### **🔍 Controlli Obbligatori**

- **Codice Fiscale**: Validazione algoritmo di controllo
- **Partita IVA**: Validazione formato e check digit
- **Email**: Formato RFC compliant
- **POD**: 14 caratteri alfanumerici
- **PDR**: 14 caratteri numerici
- **IBAN**: Validazione IBAN europeo
- **Date**: Formato ISO (YYYY-MM-DD)

### **🚫 Controlli Duplicati**

- **Clienti Privati**: `codice_fiscale` + `email` (se presente)
- **Clienti Aziende**: `partita_iva` + `email` (se presente)
- **Contratti Luce**: `pod`
- **Contratti Gas**: `pdr`
- **Offerte**: `nome_offerta` + `fornitore`

### **🔄 Aggiornamenti**

Se un record esiste già:

1. **Modalità UPDATE**: Aggiorna campi non vuoti
2. **Modalità SKIP**: Salta record duplicato
3. **Modalità ERROR**: Interrompe import con errore

---

## 📊 **REPORT IMPORT**

Al termine dell'import viene generato un report con:

- **Totale Record Processati**
- **Record Creati per Tipo**
- **Record Aggiornati**
- **Record Saltati**
- **Errori e Warning**
- **Associazioni Create**
- **Tempo di Elaborazione**