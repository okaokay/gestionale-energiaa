/**
 * Server principale backend
 * Gestionale Energia - Sistema completo per agenzia luce e gas
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import * as dotenv from 'dotenv';
import { testConnection } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { auditLog } from './middleware/auth';
import { startEmailScheduler } from './cron/emailScheduler';
import { startCampaignScheduler } from './cron/campaignScheduler';

// Import routes
import authRoutes from './routes/auth';
import clientiRoutes from './routes/clienti';
import contrattiRoutes from './routes/contratti';
import offerteRoutes from './routes/offerte';
import dashboardRoutes from './routes/dashboard';
import emailsRoutes from './routes/emails';
import documentiRoutes from './routes/documenti';
import configurazioniRoutes from './routes/configurazioni';
import clientActionsRoutes from './routes/clientActions';
import contabilitaRoutes from './routes/contabilita';
import agentiRoutes from './routes/agenti';
import noteRoutes from './routes/note';
import aiRoutes from './routes/ai';
import storicoRoutes from './routes/storico';
import contrattiGestioneRoutes from './routes/contratti-gestione-new'; // 🆕 NUOVO SISTEMA
import contrattiCompilazioneRoutes from './routes/contratti-compilazione';
import contrattiPdfRoutes from './routes/contratti-pdf';
import storicoProcedureRoutes from './routes/storico-procedure';
import unifiedImportRoutes from './routes/unified-import'; // 🆕 SISTEMA IMPORT UNIFICATO

dotenv.config();

const app = express();
// Usa variabile d'ambiente PORT se disponibile, altrimenti 3001
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(compression()); // Compressione risposte
app.use(morgan('combined')); // Logging richieste
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check (PRIMA dell'audit log)
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server attivo',
        timestamp: new Date().toISOString()
    });
});

// Audit log per richieste autenticate
app.use(auditLog);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clienti', clientiRoutes);
app.use('/api/contratti', contrattiRoutes);
app.use('/api/storico-procedure', storicoProcedureRoutes);
app.use('/api/offerte', offerteRoutes);
app.use('/api/client-actions', clientActionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/emails', emailsRoutes);
app.use('/api/documenti', documentiRoutes);
app.use('/api/configurazioni', configurazioniRoutes);
app.use('/api/contabilita', contabilitaRoutes);
app.use('/api/agenti', agentiRoutes);
app.use('/api/note', noteRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/storico', storicoRoutes);
app.use('/api/contratti-gestione', contrattiGestioneRoutes);
app.use('/api/contratti-compilazione', contrattiCompilazioneRoutes);
app.use('/api/contratti-pdf', contrattiPdfRoutes);
app.use('/api/unified-import', unifiedImportRoutes); // 🆕 SISTEMA IMPORT UNIFICATO

// Serve static assets del frontend buildato dentro l'immagine Docker
const frontendDistPath = path.join(process.cwd(), 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// Fallback SPA: tutte le route non-API servono index.html
app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Avvio server
async function startServer() {
    try {
        // Test connessione database
        console.log('🔌 Test connessione database...');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ Impossibile connettersi al database');
            process.exit(1);
        }
        
        // Avvia cron job email scheduler
        startEmailScheduler();
        
        // Avvia cron job campaign scheduler (invio campagne programmate)
        startCampaignScheduler();
        
        // Avvia server
        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(60));
            console.log('🚀 GESTIONALE ENERGIA - Server avviato con successo!');
            console.log('='.repeat(60));
            console.log(`📡 Server in ascolto su: http://localhost:${PORT}`);
            console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 Database: ${process.env.DB_NAME}`);
            console.log(`🔐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
            console.log('='.repeat(60));
            console.log('\n📋 API Endpoints disponibili:');
            console.log('   POST   /api/auth/login');
            console.log('   GET    /api/clienti');
            console.log('   POST   /api/clienti/privati');
            console.log('   POST   /api/clienti/aziende');
            console.log('   GET    /api/contratti/luce');
            console.log('   GET    /api/contratti/gas');
            console.log('   GET    /api/contratti/scadenze');
            console.log('   GET    /api/offerte');
            console.log('   POST   /api/offerte/upload (Super Admin)');
            console.log('   GET    /api/offerte/:id/matches');
            console.log('   GET    /api/dashboard/stats');
            console.log('   GET    /api/emails/campaigns');
            console.log('   POST   /api/emails/campaigns');
            console.log('   POST   /api/unified-import/upload (Import CSV/Excel)');
            console.log('   POST   /api/unified-import/validate (Validazione file)');
            console.log('   GET    /api/unified-import/supported-types');
            console.log('='.repeat(60));
            console.log('\n✅ Pronto per ricevere richieste!\n');
        });
        
    } catch (error) {
        console.error('❌ Errore avvio server:', error);
        process.exit(1);
    }
}

// Gestione shutdown graceful
process.on('SIGTERM', () => {
    console.log('⚠️  SIGTERM ricevuto, chiusura graceful...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n⚠️  SIGINT ricevuto, chiusura graceful...');
    process.exit(0);
});

// Avvia server
startServer();

export default app;


