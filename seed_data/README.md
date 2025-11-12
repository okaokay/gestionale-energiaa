# Seed Data per Deploy Hostinger/VPS

Questa cartella viene copiata nell’immagine Docker (`COPY seed_data ./seed_data`) e usata dallo script di avvio `scripts/start-with-migrate.js` per ripristinare database e uploads quando `FORCE_SEED_RESTORE=true`.

## Cosa inserire prima del deploy

- Posiziona il tuo database locale:
  - Copia `gestionale_energia.db` qui e rinominalo `gestionale_energia_seed.db`.
- (Opzionale) Ripristino allegati:
  - Metti la tua cartella `uploads/` dentro `uploads_seed/` (mantieni la struttura interna).

## Cosa succede all’avvio con FORCE_SEED_RESTORE=true

- Copia il DB seed in `DATABASE_PATH` (come definito nel Compose).
- Ripristina gli uploads seed nella cartella `/app/uploads` del container.
- Esegue migrazioni e patch idempotenti (incluse colonne come `news_letter`).

## Note

- Dopo il primo ripristino, disattiva `FORCE_SEED_RESTORE` per evitare sovrascritture involontarie.
- Se il DB contiene le configurazioni Brevo (SMTP/API) nella tabella `configurazioni`, verranno usate al posto delle variabili d’ambiente.
- Per sicurezza, non committare API key reali in repository pubblici.