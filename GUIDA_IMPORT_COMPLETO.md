# 📊 Guida Importazione Completa Clienti + Contratti

## ✅ IMPLEMENTAZIONE COMPLETATA!

Il sistema di importazione è ora **100% completo** e supporta l'importazione di:
- ✅ Clienti privati
- ✅ Clienti aziendali
- ✅ Contratti luce associati
- ✅ Contratti gas associati
- ✅ Tutti i campi opzionali

---

## 📋 CAMPI DISPONIBILI

### 👤 CLIENTI PRIVATI
**Obbligatori:**
- `tipo`: "privato"
- `nome`: Nome del cliente
- `cognome`: Cognome del cliente
- `email_principale`: Email principale

**Opzionali:**
- `codice_fiscale`, `data_nascita`, `luogo_nascita`, `provincia_nascita`
- `email_secondaria`, `telefono_mobile`, `telefono_fisso`
- `via`, `numero_civico`, `citta`, `cap`, `provincia`, `nazione`
- `consenso_marketing` (1/0)
- `note`

### 🏢 CLIENTI AZIENDALI
**Obbligatori:**
- `tipo`: "azienda"
- `ragione_sociale`: Ragione sociale dell'azienda
- `email_referente` o `email_principale`: Email di contatto

**Opzionali:**
- `partita_iva`, `codice_fiscale`, `codice_ateco` ⭐ **NUOVO!**
- `pec`, `codice_sdi`
- `via`, `numero_civico`, `citta`, `cap`, `provincia`, `nazione`
- `nome_referente`, `cognome_referente`, `telefono_referente`
- `consenso_marketing` (1/0)
- `note`

### ⚡ CONTRATTI (Opzionali ma collegati)
**Per creare un contratto, compila almeno:**
- `tipo_contratto`: "luce" o "gas"
- `fornitore`: Nome fornitore (es: Enel, Eni, etc.)

**Altri campi contratto:**
- `numero_contratto`: Numero identificativo contratto
- `pod_pdr`: POD (per luce) o PDR (per gas)
- `data_stipula`: Data stipula contratto (YYYY-MM-DD) ⭐ **NUOVO!**
- `data_attivazione`: Data attivazione (YYYY-MM-DD)
- `data_scadenza`: Data scadenza (YYYY-MM-DD)
- `agente`: Nome agente responsabile ⭐ **NUOVO!**
- `nome_offerta`: Nome dell'offerta commerciale ⭐ **NUOVO!**
- `validita_offerta`: Data validità offerta (YYYY-MM-DD) ⭐ **NUOVO!**
- `stato_contratto`: Stato (attivo/sospeso/chiuso)
- `prezzo`: Prezzo energia/gas (numero decimale, es: 0.25)
- `note_contratto`: Note specifiche del contratto

---

## 🎯 COME FUNZIONA

1. **Solo Cliente**: Se compili solo i campi del cliente → viene creato **solo il cliente**
2. **Cliente + Contratto**: Se compili `tipo_contratto` + `fornitore` → viene creato **cliente + contratto associato**
3. **Tolleranza errori**: Se una riga ha errori, viene saltata ma l'importazione continua con le altre righe!

---

## 📄 TEMPLATE CSV

Nella pagina **Clienti**, clicca su **"Importa"** (pulsante viola) e poi **"Scarica Template CSV"** per ottenere un file di esempio completo con:
- 1 cliente privato con contratto luce completo
- 1 cliente privato senza contratto
- 1 azienda con contratto gas completo
- 1 cliente privato con dati minimi

---

## 💡 ESEMPI

### Esempio 1: Cliente privato con contratto luce
```csv
privato,Mario,Rossi,mario.rossi@email.it,3331234567,RSSMRA80A01H501U,1980-01-01,Roma,RM,,,Via Roma,10,Roma,00100,RM,Italia,1,Cliente VIP,,,,,,,,,luce,LUCE123456,IT001E12345678,Enel,2024-01-15,2024-02-01,2026-02-01,Giovanni Bianchi,Offerta Luce Flex,2026-01-31,attivo,0.25,Contratto vantaggioso
```

### Esempio 2: Azienda con contratto gas
```csv
azienda,,,info@azienda.it,,,,,,,,,Via Torino,15,Torino,10100,TO,Italia,1,Nota azienda,Azienda SRL,12345678901,47.11.20,pec@azienda.it,ABCDEFG,Giovanni,Verdi,g.verdi@azienda.it,3331112222,gas,GAS789012,IT002G98765432,Eni,2024-03-10,2024-04-01,2027-04-01,Maria Neri,Offerta Gas Business,2027-03-31,attivo,0.75,Contratto aziendale
```

### Esempio 3: Cliente senza contratto (dati minimi)
```csv
privato,Paolo,Neri,paolo.neri@libero.it,3334445566,,,,,,,,,,,,Italia,1,,,,,,,,,,,,,,,,,,,,,
```

---

## ⚙️ MODIFICHE TECNICHE EFFETTUATE

### Database
1. ✅ Aggiunto `codice_ateco` a `clienti_aziende`
2. ✅ Aggiunto `data_stipula` a `contratti_luce` e `contratti_gas`
3. ✅ Aggiunto `agente` a `contratti_luce` e `contratti_gas`
4. ✅ Aggiunto `nome_offerta` a `contratti_luce` e `contratti_gas`
5. ✅ Aggiunto `validita_offerta` a `contratti_luce` e `contratti_gas`
6. ✅ Aggiunto `created_by` a `contratti_luce` e `contratti_gas`

### Backend
- ✅ Endpoint `/api/clienti/import` aggiornato per supportare creazione contratti
- ✅ Validazione automatica di tutti i campi
- ✅ Gestione intelligente dei contratti (se mancano campi, non vengono creati)
- ✅ Tracciamento utente che ha importato (`created_by`)

### Frontend
- ✅ Modal di importazione aggiornato con nuove istruzioni
- ✅ Template CSV completo con tutti i campi
- ✅ Download template aggiornato con esempi reali

---

## 🚀 COME USARLO

1. Vai su **Clienti** nella sidebar
2. Clicca sul pulsante **viola "Importa"**
3. Clicca **"Scarica Template CSV"**
4. Compila il CSV con i tuoi dati (anche parziali!)
5. Carica il file e clicca **"Importa Clienti"**
6. Vedi i risultati: quanti importati, quanti errori, dettagli

---

## 🎉 VANTAGGI

- ✅ **Importazione massiva**: Carica centinaia di clienti in pochi secondi
- ✅ **Clienti + Contratti insieme**: Un solo file per tutto
- ✅ **Tolleranza errori**: Una riga errata non blocca l'intera importazione
- ✅ **Campi opzionali**: Compila solo quello che hai
- ✅ **Flessibile**: Supporta privati, aziende, luce, gas
- ✅ **Tracciabile**: Ogni record sa chi l'ha importato e quando

---

## 📞 SUPPORTO

Se hai domande o problemi, controlla i risultati dell'importazione nella sezione "Risultato Importazione" del modal.

**PRONTO PER L'USO! 🎊**


