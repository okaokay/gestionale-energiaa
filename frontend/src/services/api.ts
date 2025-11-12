/**
 * Client API per comunicazione con backend
 */

import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api');

// Crea istanza axios con configurazione base
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor per aggiungere token JWT alle richieste
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor per gestire errori 401 (non autenticato)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ============ AUTENTICAZIONE ============
export const authAPI = {
    login: (email: string, password: string) => 
        api.post('/auth/login', { email, password }),
    
    getMe: () => api.get('/auth/me'),
    
    changePassword: (oldPassword: string, newPassword: string) => 
        api.post('/auth/change-password', { oldPassword, newPassword }),
};

// ============ CLIENTI ============
export const clientiAPI = {
    getAll: (params?: any) => api.get('/clienti', { params }),
    
    getPrivato: (id: string) => api.get(`/clienti/privati/${id}`),
    
    getAzienda: (id: string) => api.get(`/clienti/aziende/${id}`),
    
    createPrivato: (data: any) => api.post('/clienti/privati', data),
    
    createAzienda: (data: any) => api.post('/clienti/aziende', data),
    
    updatePrivato: (id: string, data: any) => api.put(`/clienti/privati/${id}`, data),
    
    updateAzienda: (id: string, data: any) => api.put(`/clienti/aziende/${id}`, data),
    
    delete: (tipo: 'privati' | 'aziende', id: string) => 
        api.delete(`/clienti/${tipo}/${id}`),
    
    // Newsletter
    getNewsletter: () => api.get('/clienti/newsletter'),
    
    iscriviNewsletter: (tipo: 'privati' | 'aziende', clienteId: string, newsletterId: string) =>
        api.post(`/clienti/${tipo}/${clienteId}/newsletter/${newsletterId}`),
    
    cancellaNewsletter: (tipo: 'privati' | 'aziende', clienteId: string, newsletterId: string) =>
        api.delete(`/clienti/${tipo}/${clienteId}/newsletter/${newsletterId}`),
    
    // Export completo cliente
    exportCompleto: (tipo: 'privato' | 'azienda', id: string) => 
        api.get(`/clienti/${tipo}/${id}/export-complete`),
};

// ============ CONTRATTI ============
export const contrattiAPI = {
    getLuce: (params?: any) => api.get('/contratti/luce', { params }),
    
    getGas: (params?: any) => api.get('/contratti/gas', { params }),
    
    getByCliente: (tipo: 'privato' | 'azienda', clienteId: string) =>
        api.get(`/contratti/cliente/${tipo}/${clienteId}`),
    
    getScadenze: (giorni?: number) => 
        api.get('/contratti/scadenze', { params: { giorni } }),
    
    createLuce: (data: any) => api.post('/contratti/luce', data),
    
    createGas: (data: any) => api.post('/contratti/gas', data),
    
    // Metodo generico per creare qualsiasi tipo di contratto
    create: (tipoContratto: 'luce' | 'gas', data: any) =>
        api.post(`/contratti/${tipoContratto}`, data),
    
    updateLuce: (id: string, data: any) => api.put(`/contratti/luce/${id}`, data),
    
    updateGas: (id: string, data: any) => api.put(`/contratti/gas/${id}`, data),
    
    // Metodo generico per aggiornare qualsiasi tipo di contratto
    update: (tipoContratto: string, id: string, data: any) => 
        api.put(`/contratti/${tipoContratto}/${id}`, data),
    
    sendScadenzaEmail: (tipo: string, id: string, template?: string, customMessage?: string) =>
        api.post(`/contratti/${tipo}/${id}/send-scadenza-email`, { template, customMessage }),
    
    markContacted: (tipo: string, id: string, note?: string) =>
        api.post(`/contratti/${tipo}/${id}/mark-contacted`, { note }),
};

// ============ OFFERTE E AI ============
export const offerteAPI = {
    getAll: (params?: any) => api.get('/offerte', { params }),
    
    getById: (id: string) => api.get(`/offerte/${id}`),
    
    getPDFDetails: (id: string) => api.get(`/offerte/${id}/pdf-details`),
    
    getPDFUrl: (id: string) => `${API_BASE_URL}/offerte/${id}/pdf`,
    
    getPDFBlob: (id: string) => api.get(`/offerte/${id}/pdf`, { responseType: 'blob' }),
    
    uploadPDF: (file: File, dataInizio?: string, dataFine?: string) => {
        const formData = new FormData();
        formData.append('pdf', file);
        if (dataInizio) formData.append('data_inizio_validita', dataInizio);
        if (dataFine) formData.append('data_fine_validita', dataFine);
        
        return api.post('/offerte/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    
    create: (data: any) => api.post('/offerte', data),
    
    executeMatching: (id: string) => api.post(`/offerte/${id}/match`),
    
    getMatches: (id: string, params?: any) => 
        api.get(`/offerte/${id}/matches`, { params }),
    
    updateMatchStatus: (matchId: string, data: any) => 
        api.put(`/offerte/matches/${matchId}/stato`, data),
    
    sendMatchEmail: (matchId: string, template?: string, customMessage?: string) => 
        api.post(`/offerte/matches/${matchId}/send-email`, { template, customMessage }),
    
    matchCliente: (cliente_id: string, tipo_cliente: string) => 
        api.post('/offerte/match-cliente', { cliente_id, tipo_cliente }),
    
    rieseguiMatchingGlobale: () => api.post('/offerte/riesegui-matching-globale'),
    
    delete: (id: string) => api.delete(`/offerte/${id}`),
};

// ============ IMPORT UNIFICATO ==========
export const unifiedImportAPI = {
    upload: (file: File, options?: { dryRun?: boolean; autoDetectType?: boolean; batchSize?: number; skipValidation?: boolean; skipAssociation?: boolean }) => {
        const formData = new FormData();
        formData.append('file', file);
        if (options) {
            formData.append('options', JSON.stringify(options));
        }
        return api.post('/unified-import/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    preview: (file: File, options?: { autoDetectType?: boolean }) => {
        const formData = new FormData();
        formData.append('file', file);
        if (options) {
            formData.append('options', JSON.stringify(options));
        }
        return api.post('/unified-import/preview', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    progress: (importId: string) => api.get(`/unified-import/progress/${importId}`),
    result: (importId: string) => api.get(`/unified-import/result/${importId}`),
    supportedTypes: () => api.get('/unified-import/supported-types'),
};

// ============ DASHBOARD ============
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    
    getScadenze: () => api.get('/dashboard/scadenze'),
    
    getHotLeads: () => api.get('/dashboard/hot-leads'),
    
    getChartAcquisizioni: (mesi?: number) => 
        api.get('/dashboard/chart/acquisizioni', { params: { mesi } }),
};

// ============ EMAIL ============
export const emailAPI = {
    getTemplates: () => api.get('/emails/templates'),
    
    createTemplate: (data: any) => api.post('/emails/templates', data),
    
    updateTemplate: (id: string, data: any) => api.put(`/emails/templates/${id}`, data),

    getCampaigns: (stato?: string) =>
        api.get('/emails/campaigns', { params: { stato } }),
    
    getCampaignDetails: (id: string) => api.get(`/emails/campaigns/${id}`),

    createCampaign: (data: any) => api.post('/emails/campaigns', data),
    
    updateCampaign: (id: string, data: any) => api.put(`/emails/campaigns/${id}`, data),
    
    deleteCampaign: (id: string) => api.delete(`/emails/campaigns/${id}`),
    
    duplicateCampaign: (id: string) => api.post(`/emails/campaigns/${id}/duplicate`),

    sendCampaign: (id: string) => api.post(`/emails/campaigns/${id}/send`),
    
    cancelCampaign: (id: string) => api.post(`/emails/campaigns/${id}/cancel`),
    
    previewCampaign: (id: string, email?: string) => api.post(`/emails/campaigns/${id}/preview`, { email }),
    
    sendTestCampaign: (id: string, email: string) => api.post(`/emails/campaigns/${id}/send-test`, { email }),

    getCampaignAnalytics: (id: string) =>
        api.get(`/emails/campaigns/${id}/stats`),

    getTodayStats: () => api.get('/emails/stats/today'),

    sendTestEmail: (email: string) => api.post('/emails/test', { email }),

    exportCampaignRecipients: (id: string) =>
        api.get(`/emails/campaigns/${id}/export-recipients`, { responseType: 'blob' }),

    exportAllClients: () =>
        api.get('/emails/export-all-clients', { responseType: 'blob' }),
    
    getStoricoCliente: (tipo: string, id: string) => 
        api.get(`/emails/storico-cliente/${tipo}/${id}`),
    
    getLogs: (periodo: string = 'giorno', page: number = 1, limit: number = 50) => 
        api.get(`/emails/logs?periodo=${periodo}&page=${page}&limit=${limit}`),
};

// ============ DOCUMENTI ============
export const documentiAPI = {
    uploadFile: (formData: FormData) => api.post('/documenti/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),

    getDocumentiCliente: (tipo: string, id: string) => 
        api.get(`/documenti/cliente/${tipo}/${id}`),

    downloadFile: (id: string) => 
        api.get(`/documenti/download/${id}`, { responseType: 'blob' }),

    deleteFile: (id: string) => 
        api.delete(`/documenti/${id}`),
};

// ============ CONFIGURAZIONI ============
export const configurazioniAPI = {
    // Ottieni tutte le configurazioni
    getAll: () => api.get('/configurazioni'),
    
    // Ottieni configurazioni per categoria
    getByCategoria: (categoria: string) => api.get(`/configurazioni/${categoria}`),
    
    // Aggiorna singola configurazione
    updateOne: (chiave: string, valore: string) => 
        api.put(`/configurazioni/${chiave}`, { valore }),
    
    // Aggiorna multiple configurazioni
    updateMany: (configurazioni: Array<{ chiave: string; valore: string }>) => 
        api.put('/configurazioni', { configurazioni }),
    
    // Testa connessione Brevo
    testBrevo: (smtp_host: string, smtp_port: string, smtp_user: string, smtp_pass: string, test_email: string) => 
        api.post('/configurazioni/test-brevo', { smtp_host, smtp_port, smtp_user, smtp_pass, test_email }),
};

// ============ STORICO & AUDIT LOG ============
export const storicoAPI = {
    // Email inviate
    getEmailCliente: (tipo: string, id: string) => 
        api.get(`/storico/email/${tipo}/${id}`),
    
    registraEmail: (data: {
        cliente_id: string;
        cliente_tipo: string;
        destinatario: string;
        oggetto: string;
        corpo: string;
        tipo?: string;
        campagna_id?: number;
    }) => api.post('/storico/email', data),
    
    // Audit log / Attività
    getAttivitaCliente: (tipo: string, id: string, filtro?: { tipo_azione?: string; limit?: number }) => 
        api.get(`/storico/attivita/${tipo}/${id}`, { params: filtro }),
    
    registraAttivita: (data: {
        tipo_azione: string;
        risorsa_tipo: string;
        risorsa_id: string;
        cliente_id?: string;
        cliente_tipo?: string;
        descrizione: string;
        dati_prima?: any;
        dati_dopo?: any;
    }) => api.post('/storico/attivita', data),
    
    // Storico Procedure Contratti
    getProcedure: (tipoContratto: string, contrattoId: string) =>
        api.get(`/storico-procedure/${tipoContratto}/${contrattoId}`),
    
    addProcedura: (tipoContratto: string, contrattoId: string, formData: FormData) =>
        api.post(`/storico-procedure/${tipoContratto}/${contrattoId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    
    getAllegato: (storicoId: string) =>
        api.get(`/storico-procedure/allegato/${storicoId}`, { responseType: 'blob' }),
    
    getTipiAttivita: () => 
        api.get('/storico/attivita/tipi'),
    
    // Timeline unificata (email + attività)
    getTimelineCliente: (tipo: string, id: string, limit?: number) => 
        api.get(`/storico/timeline/${tipo}/${id}`, { params: { limit } }),
};

// ============ AGENTI ============
export const agentiAPI = {
    getAll: () => api.get('/agenti'),
    
    getById: (id: string) => api.get(`/agenti/${id}`),
    
    create: (data: any) => api.post('/agenti', data),
    
    update: (id: string, data: any) => api.put(`/agenti/${id}`, data),
    
    delete: (id: string) => api.delete(`/agenti/${id}`),
};

export default api;

