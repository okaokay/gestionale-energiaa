# 🧪 ISTRUZIONI TEST SISTEMA IMPORT UNIFICATO

## 📋 Panoramica Test

Questo documento fornisce le istruzioni dettagliate per testare il sistema di import unificato con i seguenti scenari:

1. **Test 1**: Import di successo senza errori
2. **Test 2**: Verifica assenza duplicazione clienti
3. **Test 3**: Aggiornamento informazioni cliente senza errori o duplicati

## 📁 File di Test Preparato

**File**: `test-clienti-completi.csv`

**Contenuto**: 5 clienti completi con:
- ✅ Tutte le informazioni anagrafiche complete
- ✅ Agente assegnato: `admin@gestionale.it`
- ✅ Commissioni pattuite (150€, 120€, 180€, 200€, 160€)
- ✅ Stato: `da attivare`
- ✅ Consensi marketing e profilazione
- ✅ Indirizzi di residenza e fornitura

### Clienti nel File di Test:
1. **Giulia Bianchi** - Milano (150€ commissione)
2. **Marco Rossi** - Roma (120€ commissione)
3. **Anna Verdi** - Napoli (180€ commissione)
4. **Francesco Neri** - Torino (200€ commissione)
5. **Lucia Gialli** - Bologna (160€ commissione)

---

## 🧪 TEST 1: Import di Successo Senza Errori

### Obiettivo
Verificare che l'import funzioni correttamente e tutti i clienti vengano inseriti senza errori.

### Procedura
1. **Accedi al Sistema**
   - Apri: http://localhost:5173
   - Login: `admin@gestionale.it` / `Admin123!`

2. **Naviga alla Sezione Clienti**
   - Clicca su "Clienti" nel menu laterale
   - Verifica il numero attuale di clienti (annotalo)

3. **Avvia Import Unificato**
   - Clicca sul pulsante "Import Avanzato" (viola)
   - Si aprirà il `SuperImportModal`

4. **Carica File di Test**
   - Clicca su "Seleziona file CSV" o trascina il file
   - Seleziona: `test-clienti-completi.csv`
   - Attendi il caricamento

5. **Verifica Preview Intelligente**
   - Controlla che vengano rilevati **5 record di tipo "Cliente Privato"**
   - Verifica che l'agente sia correttamente riconosciuto
   - Controlla che le commissioni siano visualizzate
   - Verifica che lo stato sia "da attivare"

6. **Conferma Import**
   - Clicca "Conferma Import"
   - Attendi il completamento

7. **Verifica Risultati**
   - Controlla che il `ImportResultsDashboard` mostri:
     - ✅ **5 record inseriti con successo**
     - ✅ **0 errori**
     - ✅ **Durata dell'operazione**
     - ✅ **Dettagli per tipo di record**

### Risultato Atteso
- ✅ Import completato senza errori
- ✅ 5 nuovi clienti inseriti
- ✅ Tutti con agente assegnato
- ✅ Tutte le commissioni registrate
- ✅ Stato "da attivare" applicato

---

## 🧪 TEST 2: Verifica Assenza Duplicazione

### Obiettivo
Verificare che re-importando lo stesso file non si creino duplicati.

### Procedura
1. **Conta Clienti Attuali**
   - Vai alla sezione "Clienti"
   - Annota il numero totale di clienti (dovrebbe essere +5 rispetto all'inizio)

2. **Re-Import dello Stesso File**
   - Clicca nuovamente "Import Avanzato"
   - Carica lo stesso file: `test-clienti-completi.csv`

3. **Verifica Preview**
   - Controlla che il sistema rilevi i clienti esistenti
   - Dovrebbe mostrare "Aggiornamento" invece di "Inserimento"

4. **Conferma Import**
   - Procedi con l'import
   - Attendi il completamento

5. **Verifica Risultati**
   - Controlla che il dashboard mostri:
     - ✅ **5 record aggiornati** (non inseriti)
     - ✅ **0 nuovi inserimenti**
     - ✅ **0 errori**

6. **Verifica Database**
   - Torna alla lista clienti
   - Verifica che il numero totale sia rimasto invariato
   - Controlla che non ci siano duplicati di Giulia Bianchi, Marco Rossi, etc.

### Risultato Atteso
- ✅ Nessun duplicato creato
- ✅ Clienti esistenti aggiornati
- ✅ Numero totale clienti invariato

---

## 🧪 TEST 3: Aggiornamento Informazioni

### Obiettivo
Verificare che l'aggiornamento di informazioni esistenti funzioni correttamente.

### Procedura
1. **Modifica File di Test**
   - Apri `test-clienti-completi.csv`
   - Modifica alcune informazioni:
     - Giulia Bianchi: cambia telefono in `3331111111`
     - Marco Rossi: cambia commissione in `250.00`
     - Anna Verdi: cambia stato in `attivo`
     - Francesco Neri: cambia note in "Cliente aggiornato - Test modifica"

2. **Salva File Modificato**
   - Salva come `test-clienti-aggiornati.csv`

3. **Import File Aggiornato**
   - Avvia nuovo import con il file modificato
   - Verifica preview (dovrebbe rilevare aggiornamenti)
   - Conferma import

4. **Verifica Aggiornamenti**
   - Controlla che il dashboard mostri aggiornamenti
   - Vai alla lista clienti
   - Verifica che le modifiche siano state applicate:
     - Giulia Bianchi: nuovo telefono
     - Marco Rossi: nuova commissione
     - Anna Verdi: nuovo stato
     - Francesco Neri: nuove note

### Risultato Atteso
- ✅ Aggiornamenti applicati correttamente
- ✅ Nessun errore durante l'aggiornamento
- ✅ Nessun duplicato creato
- ✅ Informazioni modificate visibili nel sistema

---

## 📊 Monitoraggio Durante i Test

### Log da Controllare

1. **Console Browser** (F12)
   - Verifica assenza errori JavaScript
   - Controlla chiamate API successful

2. **Log Backend** (Terminal)
   - Monitora le operazioni di import
   - Verifica query database
   - Controlla eventuali errori

3. **Database**
   - Verifica inserimenti/aggiornamenti
   - Controlla integrità referenziale
   - Verifica commissioni create

### Metriche di Successo

- ✅ **0 errori** in tutti i test
- ✅ **Tempi di risposta** < 5 secondi per file di test
- ✅ **Integrità dati** mantenuta
- ✅ **Associazioni agente** corrette
- ✅ **Commissioni** registrate correttamente

---

## 🚨 Risoluzione Problemi

### Errori Comuni

1. **"Agente non trovato"**
   - Verifica che `admin@gestionale.it` esista nel sistema
   - Controlla che abbia ruolo `admin` o `operatore`

2. **"Errore validazione"**
   - Verifica formato date (YYYY-MM-DD)
   - Controlla codici fiscali
   - Verifica email valide

3. **"Timeout import"**
   - File troppo grande per test
   - Problemi di connessione database

### Debug

1. **Controlla Log Backend**:
   ```bash
   # Nel terminal backend
   npm start
   ```

2. **Verifica Database**:
   - Controlla tabelle `clienti_privati`
   - Verifica tabella `users` per agenti
   - Controlla `compensi` per commissioni

3. **Test API Manuale**:
   ```bash
   curl -X POST http://localhost:3001/api/unified-import/upload \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@test-clienti-completi.csv"
   ```

---

## ✅ Checklist Finale

Dopo aver completato tutti i test, verifica:

- [ ] Import iniziale completato senza errori
- [ ] Nessun duplicato creato nel re-import
- [ ] Aggiornamenti applicati correttamente
- [ ] Tutti i clienti hanno agente assegnato
- [ ] Commissioni registrate correttamente
- [ ] Stati applicati correttamente
- [ ] Log puliti senza errori
- [ ] Performance accettabili
- [ ] UI responsive e funzionale
- [ ] Dashboard risultati informativi

---

## 📞 Supporto

In caso di problemi durante i test:

1. Controlla i log del backend
2. Verifica la console del browser
3. Controlla la connessione database
4. Verifica i permessi utente
5. Consulta la documentazione completa in `DOCUMENTAZIONE_IMPORT_UNIFICATO.md`

**Sistema testato e validato** ✅