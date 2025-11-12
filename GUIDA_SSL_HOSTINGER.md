# Guida SSL per VPS Hostinger - gmgestionale.cloud

## 📋 Prerequisiti
- Dominio `gmgestionale.cloud` configurato e attivo
- VPS Hostinger con accesso SSH
- Applicazione deployata con Docker
- Accesso root al server

## ⚠️ IMPORTANTE: Configurazione per VPS (non Hosting Condiviso)

Dato che hai un **VPS** e non un piano hosting condiviso, devi configurare SSL direttamente sul server tramite SSH.

## 🔐 Configurazione SSL su VPS

### Passo 1: Accesso al VPS
```bash
# Connettiti al tuo VPS via SSH
ssh root@srv1072066.hstgr.cloud
# oppure
ssh root@[IP_DEL_TUO_VPS]
```

### Passo 2: Installazione Certbot (Let's Encrypt)
```bash
# Aggiorna il sistema
apt update && apt upgrade -y

# Installa Certbot
apt install certbot python3-certbot-nginx -y
```

### Passo 3: Generazione Certificato SSL
```bash
# Genera certificato SSL per il dominio
certbot --nginx -d gmgestionale.cloud -d www.gmgestionale.cloud

# Oppure solo per il dominio principale
certbot --nginx -d gmgestionale.cloud
```

### Passo 4: Configurazione Automatica Nginx
Certbot configurerà automaticamente Nginx per SSL, ma verifica che sia corretto.

### Passo 5: Verifica Configurazione
1. Verifica che lo stato SSL sia **Attivo**
2. Testa l'accesso a `https://gmgestionale.cloud`
3. Testa gli endpoint API: `https://gmgestionale.cloud/api/health`
4. Controlla che il certificato sia valido nel browser (icona lucchetto verde)

## 🔧 Configurazione Nginx per SSL

### Aggiornamento nginx.conf (se necessario)
Se vuoi gestire SSL direttamente tramite Nginx nel container, decommentare e configurare la sezione HTTPS nel file `nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name gmgestionale.cloud;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Stessa configurazione del server HTTP
    location / {
        proxy_pass http://app:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Copia tutte le altre location dal server HTTP
}
```

## 🚀 Configurazione Consigliata per VPS

### Opzione 1: SSL con Certbot + Nginx Reverse Proxy (Consigliato)
- **Vantaggi**: Automatico, rinnovato automaticamente, configurazione standard
- **Configurazione**: Nginx sul VPS fa da reverse proxy al container Docker
- **Rinnovo**: Automatico tramite cron job di Certbot

### Opzione 2: SSL Gestito da Nginx nel Container
- **Vantaggi**: Controllo completo, configurazione personalizzata
- **Svantaggi**: Gestione manuale dei certificati
- **Configurazione**: Richiede certificati SSL nel volume `/ssl`

### Configurazione Nginx VPS per Reverse Proxy
```nginx
# /etc/nginx/sites-available/gmgestionale.cloud
server {
    listen 80;
    server_name gmgestionale.cloud www.gmgestionale.cloud;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gmgestionale.cloud www.gmgestionale.cloud;

    ssl_certificate /etc/letsencrypt/live/gmgestionale.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gmgestionale.cloud/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;  # Porta del tuo container Docker
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 Checklist Post-Attivazione SSL

### ✅ Verifiche Obbligatorie
- [ ] `https://gmgestionale.cloud` carica correttamente
- [ ] Certificato SSL valido (icona lucchetto verde nel browser)
- [ ] Redirect automatico da HTTP a HTTPS
- [ ] API funzionanti su HTTPS (`https://gmgestionale.cloud/api/auth/status`)
- [ ] Login e autenticazione funzionanti
- [ ] Upload file funzionanti

### ✅ Test di Sicurezza
- [ ] Test SSL su [SSL Labs](https://www.ssllabs.com/ssltest/)
- [ ] Verifica headers di sicurezza
- [ ] Test HSTS (Strict Transport Security)

## 🔧 Risoluzione Problemi Comuni su VPS

### Problema: "Certificato non valido"
**Soluzione**: 
1. Verifica che Certbot abbia completato correttamente: `certbot certificates`
2. Controlla i log di Nginx: `tail -f /var/log/nginx/error.log`
3. Verifica che il dominio punti correttamente all'IP del VPS
4. Riavvia Nginx: `systemctl restart nginx`

### Problema: "Mixed Content" (contenuti misti)
**Soluzione**:
1. Verifica che tutte le risorse (CSS, JS, immagini) usino HTTPS
2. Controlla le variabili d'ambiente `FRONTEND_URL` e `BACKEND_URL`
3. Assicurati che siano impostate su `https://gmgestionale.cloud`

### Problema: "Redirect Loop"
**Soluzione**:
1. Verifica la configurazione `TRUST_PROXY=true` nel container
2. Controlla gli header `X-Forwarded-Proto` nella configurazione Nginx del VPS
3. Verifica che il container Docker sia raggiungibile: `curl http://localhost:8080`

### Problema: "Connection Refused"
**Soluzione**:
1. Verifica che il container Docker sia in esecuzione: `docker ps`
2. Controlla che la porta sia esposta correttamente nel docker-compose
3. Verifica il firewall del VPS: `ufw status`
4. Testa la connessione locale: `curl http://localhost:8080`

### Comandi Utili per Debug
```bash
# Verifica stato Nginx
systemctl status nginx

# Test configurazione Nginx
nginx -t

# Verifica certificati SSL
certbot certificates

# Rinnovo manuale certificato
certbot renew --dry-run

# Log Nginx in tempo reale
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 📞 Supporto
- **Documentazione Let's Encrypt**: [Certbot Guide](https://certbot.eff.org/)
- **Documentazione Hostinger VPS**: [VPS SSL Guide](https://support.hostinger.com/en/articles/1583467-how-to-activate-ssl-certificate)
- **Test SSL**: [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- **Verifica Configurazione**: `curl -I https://gmgestionale.cloud`
- **Debug Nginx**: `nginx -t && systemctl status nginx`

## 🎯 Risultato Finale
Dopo l'attivazione SSL, la tua applicazione sarà accessibile in modo sicuro su:
- **URL Principale**: `https://gmgestionale.cloud`
- **API Endpoint**: `https://gmgestionale.cloud/api/*`
- **Health Check**: `https://gmgestionale.cloud/health`

Il certificato SSL sarà rinnovato automaticamente da Hostinger ogni 90 giorni.