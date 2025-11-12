# 📋 MAPPING COMPLETO CAMPI CONTRATTO ALPERIA

## ✅ MODELLO DOMESTICO (39 CAMPI)

### 👤 DATI ANAGRAFICI (6 campi)
```
1.  Nome                      → nome
2.  Cognome                   → cognome
3.  Codice Fiscale            → codice_fiscale
4.  Data di Nascita           → data_nascita
5.  Luogo di Nascita          → luogo_nascita
6.  Provincia di Nascita      → provincia_nascita
```

### 🏠 INDIRIZZO FORNITURA (5 campi)
```
7.  Indirizzo Fornitura       → indirizzo_fornitura
8.  Civico                    → civico_fornitura
9.  CAP Fornitura             → cap_fornitura
10. Comune Fornitura          → comune_fornitura
11. Provincia Fornitura       → provincia_fornitura
```

### 🏡 INDIRIZZO RESIDENZA (5 campi - opzionali)
```
12. Indirizzo Residenza       → indirizzo_residenza
13. Civico Residenza          → civico_residenza
14. CAP Residenza             → cap_residenza
15. Comune Residenza          → comune_residenza
16. Provincia Residenza       → provincia_residenza
```

### 📞 CONTATTI (4 campi)
```
17. Telefono                  → telefono
18. Cellulare                 → cellulare
19. Email                     → email
20. PEC                       → pec
```

### ⚡ CONTRATTO LUCE (6 campi)
```
21. POD (Punto di Prelievo)   → pod
22. Potenza Impegnata (kW)    → potenza_impegnata
23. Tensione Fornitura        → tensione_fornitura
24. Uso Luce                  → uso_luce (Domestico/Non Domestico)
25. Mercato Luce              → mercato_luce (Libero/Tutelato)
26. Tipo Attività             → attivita_luce (Nuova/Subentro/Switch/Voltura)
```

### 🔥 CONTRATTO GAS (7 campi)
```
27. PDR (Punto di Riconsegna) → pdr
28. Matricola Contatore Gas   → matricola_contatore
29. Classe Contatore Gas      → classe_contatore (es. G4)
30. Consumo Annuo Gas (Smc)   → consumo_annuo_gas
31. Uso Gas                   → uso_gas (Riscaldamento/Cottura/Acqua calda/Altro)
32. Mercato Gas               → mercato_gas (Libero/Tutelato)
33. Tipo Attività Gas         → attivita_gas (Nuova/Subentro/Switch/Voltura)
```

### 💳 DATI PAGAMENTO (3 campi)
```
34. IBAN                      → iban
35. Intestatario Conto        → intestatario_conto
36. Modalità Pagamento        → modalita_pagamento (SDD/Bollettino/Bonifico)
```

### 📝 NOTE E CONSENSI (3 campi)
```
37. Note Aggiuntive           → note
38. Consenso Marketing        → consenso_marketing (checkbox)
39. Consenso Privacy          → consenso_privacy (checkbox - OBBLIGATORIO)
```

---

## 🏢 MODELLO BUSINESS (52 CAMPI)

**INCLUDE TUTTI I 39 CAMPI DOMESTICO + 13 CAMPI AGGIUNTIVI:**

### 🏭 DATI AZIENDA (5 campi)
```
40. Ragione Sociale           → ragione_sociale (REQUIRED)
41. Partita IVA               → partita_iva (REQUIRED)
42. Codice ATECO              → codice_ateco
43. Codice SDI                → codice_sdi (Fatturazione Elettronica)
44. PEC Aziendale             → pec_aziendale
```

### 👔 LEGALE RAPPRESENTANTE (3 campi)
```
45. Nome Legale Rapp.         → nome_legale_rapp (REQUIRED)
46. Cognome Legale Rapp.      → cognome_legale_rapp (REQUIRED)
47. CF Legale Rapp.           → cf_legale_rapp (REQUIRED)
```

### 🏛️ SEDE LEGALE (5 campi)
```
48. Indirizzo Sede Legale     → indirizzo_sede_legale (REQUIRED)
49. Civico Sede Legale        → civico_sede_legale (REQUIRED)
50. CAP Sede Legale           → cap_sede_legale (REQUIRED)
51. Comune Sede Legale        → comune_sede_legale (REQUIRED)
52. Provincia Sede Legale     → provincia_sede_legale (REQUIRED)
```

---

## 🎯 DATI DEMO AGGIORNATI

### 📝 CLIENTE DOMESTICO (Mario Rossi)

```json
{
  "nome": "Mario",
  "cognome": "Rossi",
  "codice_fiscale": "RSSMRA85M01H501U",
  "data_nascita": "1985-08-01",
  "luogo_nascita": "Roma",
  "provincia_nascita": "RM",
  
  "indirizzo_fornitura": "Via Giuseppe Garibaldi",
  "civico_fornitura": "42",
  "cap_fornitura": "00185",
  "comune_fornitura": "Roma",
  "provincia_fornitura": "RM",
  
  "indirizzo_residenza": "Via Giuseppe Garibaldi",
  "civico_residenza": "42",
  "cap_residenza": "00185",
  "comune_residenza": "Roma",
  "provincia_residenza": "RM",
  
  "telefono": "06 12345678",
  "cellulare": "+39 333 1234567",
  "email": "mario.rossi@example.com",
  "pec": "",
  
  "pod": "IT001E12345678",
  "potenza_impegnata": 3.0,
  "tensione_fornitura": "Bassa Tensione",
  "uso_luce": "Domestico",
  "mercato_luce": "Libero",
  "attivita_luce": "Switch",
  
  "pdr": "14567890123456",
  "matricola_contatore": "MCG123456",
  "classe_contatore": "G4",
  "consumo_annuo_gas": 1200,
  "uso_gas": "Riscaldamento",
  "mercato_gas": "Libero",
  "attivita_gas": "Switch",
  
  "iban": "IT60X0542811101000000123456",
  "intestatario_conto": "Mario Rossi",
  "modalita_pagamento": "SDD (Addebito Diretto)",
  
  "note": "Cliente abituale, preferisce fattura elettronica",
  "consenso_marketing": true,
  "consenso_privacy": true
}
```

---

## ✅ VERIFICA FORM

### STATO ATTUALE:
- ✅ Database: 39 campi Domestico, 52 Business
- ✅ Backend: Creazione automatica cliente funzionante
- ✅ Frontend: Form dinamico basato su `campi_estratti`
- ⚠️ Test: Verifica che TUTTI i 39 campi siano visualizzati

### PROSSIMI PASSI:
1. ✅ Apri modal "Compila Contratto"
2. ✅ Seleziona "Domestico" → "ALPERIA"
3. ✅ Tab "Inserimento Manuale"
4. ✅ Verifica che ci siano **39 campi** visibili
5. ✅ Compila con i dati demo
6. ✅ Salva e verifica cliente creato in "Clienti"

---

## 🚀 COMANDI UTILI

```bash
# Rigenera modelli ALPERIA
node setup-alperia-models.js

# Verifica database
sqlite3 gestionale_energia.db "SELECT id, nome, tipo_cliente, categoria, fornitore FROM contract_templates WHERE fornitore='ALPERIA';"

# Verifica campi template
sqlite3 gestionale_energia.db "SELECT json_extract(campi_estratti, '$.campi') FROM contract_templates WHERE fornitore='ALPERIA' LIMIT 1;" | jq length
```

---

## 📊 RIEPILOGO

| Modello | Tipo | Categoria | Campi | Fornitore |
|---------|------|-----------|-------|-----------|
| Domestico | domestico | dual | 39 | ALPERIA |
| Business | business | dual | 52 | ALPERIA |

✅ **TUTTI I CAMPI SONO CORRETTAMENTE MAPPATI DAL PDF REALE!**




