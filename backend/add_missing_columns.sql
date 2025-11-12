-- Script SQL per aggiungere le colonne mancanti al database gestionale_energia.db
-- Generato automaticamente dall'analisi delle colonne mancanti

-- ========================================
-- COLONNE CRITICHE PER L'IMPORTAZIONE
-- ========================================

-- Aggiungere stato_contratto alla tabella contratti_gas
-- Questa colonna è richiesta dal CSV e mancante nella tabella
ALTER TABLE contratti_gas ADD COLUMN stato_contratto TEXT;

-- Aggiungere stato_contratto alla tabella contratti_luce  
-- Per consistenza con contratti_gas e supporto CSV
ALTER TABLE contratti_luce ADD COLUMN stato_contratto TEXT;

-- ========================================
-- VERIFICA DELLE MODIFICHE
-- ========================================

-- Verifica che le colonne siano state aggiunte correttamente
PRAGMA table_info(contratti_gas);
PRAGMA table_info(contratti_luce);

-- ========================================
-- NOTE IMPORTANTI
-- ========================================

-- 1. Dopo aver eseguito questo script:
--    - Ricompilare il backend: npm run build
--    - Riavviare il server: node dist/server.js
--    - Testare nuovamente l'importazione

-- 2. Le colonne pod/pdr e prezzo_energia/prezzo_gas sono specifiche
--    per tipo di contratto e non dovrebbero essere aggiunte all'altra tabella

-- 3. La colonna stato_contratto è ora presente in entrambe le tabelle
--    per supportare completamente l'importazione unificata