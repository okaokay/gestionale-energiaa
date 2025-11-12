import { useEffect, useState } from 'react';
import { emailAPI, contrattiAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Mail, Send, FileText, BarChart3, Calendar, Plus, Eye, Settings, Download, Activity, Phone, MessageCircle, CheckCircle, Edit, Trash2, X, PlayCircle, Ban, Copy, TestTube2 } from 'lucide-react';
import BrevoSetupWizard from '../components/BrevoSetupWizard';
import WebhookSetupWizard from '../components/WebhookSetupWizard';
import ClientiSelector from '../components/ClientiSelector';
import EmailTemplateBuilder from '../components/EmailTemplateBuilder';

type TabType = 'campagne' | 'scadenze' | 'template' | 'statistiche';

export default function EmailMarketingPage() {
    const [activeTab, setActiveTab] = useState<TabType>('campagne');
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [scadenze, setScadenze] = useState<any[]>([]);
    const [scadenzeFiltered, setScadenzeFiltered] = useState<any[]>([]);
    const [filtroScadenza, setFiltroScadenza] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [showWebhookWizard, setShowWebhookWizard] = useState(false);
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
    const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
    const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [templateBuilderName, setTemplateBuilderName] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showCampaignDetailsModal, setShowCampaignDetailsModal] = useState(false);
    const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
    const [selectedContratto, setSelectedContratto] = useState<any>(null);
    const [emailTemplate, setEmailTemplate] = useState('default');
    const [customMessage, setCustomMessage] = useState('');
    const [emailLogs, setEmailLogs] = useState<any[]>([]);
    const [emailLogsStats, setEmailLogsStats] = useState<any[]>([]);
    const [periodoLogs, setPeriodoLogs] = useState('giorno');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [newCampaign, setNewCampaign] = useState({
        nome: '',
        tipo: 'promo',
        target_clienti: 'tutti',
        template_id: '',
        subject: '',
        scheduled_at: '',
        scheduled_end_at: '',
    });
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
    const [manualEmails, setManualEmails] = useState('');
    const [editingCampaign, setEditingCampaign] = useState<any>(null);
    const [newTemplate, setNewTemplate] = useState({
        nome: '',
        subject: '',
        body_html: '',
        categoria: 'promo',
    });
    
    useEffect(() => {
        loadData();
    }, [activeTab]);
    
    useEffect(() => {
        // Ricarica log quando cambia periodo o pagina (solo se in tab statistiche)
        if (activeTab === 'statistiche') {
            loadData();
        }
    }, [periodoLogs, currentPage]);
    
    useEffect(() => {
        // Applica filtro scadenze
        if (!filtroScadenza) {
            setScadenzeFiltered(scadenze);
        } else {
            const filtered = scadenze.filter(s => {
                if (filtroScadenza === '60+') return s.giorni_a_scadenza >= 60;
                if (filtroScadenza === '30-59') return s.giorni_a_scadenza >= 30 && s.giorni_a_scadenza <= 59;
                if (filtroScadenza === '15-29') return s.giorni_a_scadenza >= 15 && s.giorni_a_scadenza <= 29;
                if (filtroScadenza === '0-14') return s.giorni_a_scadenza >= 0 && s.giorni_a_scadenza <= 14;
                return true;
            });
            setScadenzeFiltered(filtered);
        }
    }, [scadenze, filtroScadenza]);
    
    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'campagne') {
                // Carica campagne e anche i template, così il select ha dati
                const campaignsResponse = await emailAPI.getCampaigns();
                setCampaigns(campaignsResponse.data.data || []);

                const templatesResponse = await emailAPI.getTemplates();
                setTemplates(templatesResponse.data.data || []);
            } else if (activeTab === 'scadenze') {
                const response = await contrattiAPI.getScadenze(90); // Carica 90 giorni
                setScadenze(response.data.data || []);
            } else if (activeTab === 'template') {
                const response = await emailAPI.getTemplates();
                setTemplates(response.data.data || []);
            } else if (activeTab === 'statistiche') {
                const [statsResponse, logsResponse] = await Promise.all([
                    emailAPI.getTodayStats(),
                    emailAPI.getLogs(periodoLogs, currentPage, 50)
                ]);
                setStats(statsResponse.data.data);
                setEmailLogs(logsResponse.data.data.logs || []);
                setEmailLogsStats(logsResponse.data.data.stats || []);
                setTotalPages(logsResponse.data.data.pagination.totalPages || 1);
            }
        } catch (error) {
            toast.error('Errore caricamento dati');
        } finally {
            setLoading(false);
        }
    };
    
    const handleExportAllClients = async () => {
        try {
            toast.loading('Generazione CSV in corso...');
            const response = await emailAPI.exportAllClients();
            
            // Crea link download
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `clienti_email_marketing_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            toast.dismiss();
            toast.success('CSV scaricato con successo!');
        } catch (error) {
            toast.dismiss();
            toast.error('Errore export CSV');
        }
    };
    
    const handleCreateCampaign = async () => {
        if (!newCampaign.nome || !newCampaign.subject) {
            toast.error('Inserisci almeno nome e oggetto');
            return;
        }
        
        // Validazione per selezione manuale
        if (newCampaign.target_clienti === 'selezione_manuale') {
            if (selectedClientIds.length === 0 && !manualEmails.trim()) {
                toast.error('Seleziona almeno un cliente o inserisci email manuali');
                return;
            }
        }
        
        try {
            // Parse email manuali (separate da virgola, spazio, a capo)
            const emailsArray = manualEmails
                .split(/[\n,;]/)
                .map(e => e.trim())
                .filter(e => e && e.includes('@'));
            
            const campaignData = {
                ...newCampaign,
                selected_client_ids: newCampaign.target_clienti === 'selezione_manuale' ? selectedClientIds : undefined,
                manual_emails: newCampaign.target_clienti === 'selezione_manuale' ? emailsArray : undefined,
            };
            
            await emailAPI.createCampaign(campaignData);
            toast.success('✅ Campagna creata con successo!');
            setShowNewCampaignModal(false);
            setNewCampaign({
                nome: '',
                tipo: 'promo',
                target_clienti: 'tutti',
                template_id: '',
                subject: '',
                scheduled_at: '',
                scheduled_end_at: '',
            });
            setSelectedClientIds([]);
            setManualEmails('');
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore creazione campagna');
        }
    };
    
    const handleCreateTemplate = async () => {
        if (!newTemplate.nome || !newTemplate.subject || !newTemplate.body_html) {
            toast.error('Compila tutti i campi');
            return;
        }
        
        try {
            await emailAPI.createTemplate(newTemplate);
            toast.success('✅ Template creato con successo!');
            setShowNewTemplateModal(false);
            setNewTemplate({
                nome: '',
                subject: '',
                body_html: '',
                categoria: 'promo',
            });
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore creazione template');
        }
    };
    
    const handleSaveTemplateFromBuilder = async (html: string, design: any) => {
        if (!templateBuilderName.trim()) {
            toast.error('Inserisci un nome per il template');
            return;
        }
        
        try {
            const templateData = {
                nome: templateBuilderName,
                subject: templateBuilderName, // Usa il nome come subject di default
                html_content: html,
                design_json: JSON.stringify(design), // Salva il design per modifiche future
                tipo: 'custom'
            };
            
            if (editingTemplate) {
                // Modifica template esistente
                await emailAPI.updateTemplate(editingTemplate.id, templateData);
                toast.success('✅ Template aggiornato con successo!');
            } else {
                // Nuovo template
                await emailAPI.createTemplate(templateData);
                toast.success('✅ Template creato con successo!');
            }
            
            setShowTemplateBuilder(false);
            setTemplateBuilderName('');
            setEditingTemplate(null);
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore salvataggio template');
        }
    };
    
    // ========== GESTIONE CAMPAGNE ==========
    
    const handleViewCampaignDetails = async (campaignId: string) => {
        try {
            const response = await emailAPI.getCampaignDetails(campaignId);
            setSelectedCampaign(response.data.data);
            setShowCampaignDetailsModal(true);
        } catch (error: any) {
            toast.error('Errore caricamento dettagli campagna');
        }
    };
    
    const handleOpenEditCampaign = (campaign: any) => {
        setEditingCampaign({
            nome: campaign.nome,
            tipo: campaign.tipo,
            target_clienti: campaign.target_clienti,
            template_id: campaign.template_id || '',
            subject: campaign.subject || campaign.nome,
            scheduled_at: campaign.scheduled_at || '',
            scheduled_end_at: campaign.scheduled_end_at || '',
        });
        
        // Parse filtri targeting se presenti
        if (campaign.filtri_targeting) {
            const filtri = typeof campaign.filtri_targeting === 'string' 
                ? JSON.parse(campaign.filtri_targeting) 
                : campaign.filtri_targeting;
            
            setSelectedClientIds(filtri.selected_client_ids || []);
            setManualEmails((filtri.manual_emails || []).join('\n'));
        }
        
        setSelectedCampaign(campaign);
        setShowEditCampaignModal(true);
    };
    
    const handleUpdateCampaign = async () => {
        if (!editingCampaign.nome || !editingCampaign.subject) {
            toast.error('Inserisci almeno nome e oggetto');
            return;
        }
        
        // Validazione per selezione manuale
        if (editingCampaign.target_clienti === 'selezione_manuale') {
            if (selectedClientIds.length === 0 && !manualEmails.trim()) {
                toast.error('Seleziona almeno un cliente o inserisci email manuali');
                return;
            }
        }
        
        try {
            const emailsArray = manualEmails
                .split(/[\n,;]/)
                .map(e => e.trim())
                .filter(e => e && e.includes('@'));
            
            const campaignData = {
                ...editingCampaign,
                selected_client_ids: editingCampaign.target_clienti === 'selezione_manuale' ? selectedClientIds : undefined,
                manual_emails: editingCampaign.target_clienti === 'selezione_manuale' ? emailsArray : undefined,
            };
            
            await emailAPI.updateCampaign(selectedCampaign.id, campaignData);
            toast.success('✅ Campagna aggiornata con successo!');
            setShowEditCampaignModal(false);
            setEditingCampaign(null);
            setSelectedCampaign(null);
            setSelectedClientIds([]);
            setManualEmails('');
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore aggiornamento campagna');
        }
    };
    
    const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
        if (!confirm(`Sei sicuro di voler eliminare la campagna "${campaignName}"?`)) {
            return;
        }
        
        try {
            await emailAPI.deleteCampaign(campaignId);
            toast.success('✅ Campagna eliminata con successo');
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore eliminazione campagna');
        }
    };
    
    const handleSendCampaignNow = async (campaignId: string, campaignName: string) => {
        if (!confirm(`Sei sicuro di voler inviare subito la campagna "${campaignName}"?`)) {
            return;
        }
        
        try {
            await emailAPI.sendCampaign(campaignId);
            toast.success('✅ Campagna avviata! Invio in corso...');
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore invio campagna');
        }
    };
    
    const handleCancelCampaign = async (campaignId: string, campaignName: string) => {
        if (!confirm(`Sei sicuro di voler annullare la programmazione di "${campaignName}"?`)) {
            return;
        }
        
        try {
            await emailAPI.cancelCampaign(campaignId);
            toast.success('✅ Programmazione annullata');
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore annullamento campagna');
        }
    };
    
    const handleDuplicateCampaign = async (campaignId: string, campaignName: string) => {
        try {
            await emailAPI.duplicateCampaign(campaignId);
            toast.success(`✅ Campagna "${campaignName}" duplicata con successo!`);
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore duplicazione campagna');
        }
    };
    
    const handlePreviewCampaign = async (campaignId: string) => {
        try {
            const response = await emailAPI.previewCampaign(campaignId);
            const preview = response.data.data;
            
            // Apri modale con preview HTML
            const previewWindow = window.open('', 'Preview Email', 'width=800,height=600');
            if (previewWindow) {
                previewWindow.document.write(`
                    <html>
                        <head>
                            <title>Preview: ${preview.campaign_name}</title>
                            <style>
                                body { font-family: Arial, sans-serif; padding: 20px; }
                                .header { background: #4F46E5; color: white; padding: 15px; margin-bottom: 20px; }
                                .content { border: 1px solid #ddd; padding: 20px; }
                            </style>
                        </head>
                        <body>
                            <div class="header">
                                <h2>Preview Email: ${preview.campaign_name}</h2>
                                <p><strong>Oggetto:</strong> ${preview.subject}</p>
                            </div>
                            <div class="content">
                                ${preview.html}
                            </div>
                        </body>
                    </html>
                `);
                previewWindow.document.close();
            }
        } catch (error: any) {
            toast.error('Errore generazione preview');
        }
    };
    
    const handleSendTestCampaign = async (campaignId: string, campaignName: string) => {
        const email = prompt('Inserisci l\'email per il test:', '');
        if (!email) return;
        
        if (!email.includes('@')) {
            toast.error('Inserisci un\'email valida');
            return;
        }
        
        try {
            await emailAPI.sendTestCampaign(campaignId, email);
            toast.success(`✅ Email di test inviata a ${email}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore invio test');
        }
    };
    
    const handleSendScadenzaEmail = (contratto: any) => {
        setSelectedContratto(contratto);
        setEmailTemplate('default');
        setCustomMessage('');
        setShowEmailModal(true);
    };
    
    const handleConfirmSendEmail = async () => {
        if (!selectedContratto) return;
        
        if (emailTemplate === 'custom' && !customMessage.trim()) {
            toast.error('Inserisci un messaggio personalizzato');
            return;
        }
        
        try {
            toast.loading('Invio email in corso...');
            
            // Passa template e messaggio personalizzato al backend
            await contrattiAPI.sendScadenzaEmail(
                selectedContratto.tipo_contratto, 
                selectedContratto.id,
                emailTemplate,
                emailTemplate === 'custom' ? customMessage : undefined
            );
            
            toast.dismiss();
            toast.success('✅ Email inviata con successo!');
            setShowEmailModal(false);
            setSelectedContratto(null);
            loadData();
        } catch (error: any) {
            toast.dismiss();
            toast.error(error.response?.data?.message || 'Errore invio email');
        }
    };
    
    const handleMarkContacted = async (contratto: any) => {
        try {
            const note = prompt('Note sul contatto (opzionale):');
            await contrattiAPI.markContacted(contratto.tipo_contratto, contratto.id, note || '');
            toast.success('✅ Contatto registrato!');
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore registrazione contatto');
        }
    };
    
    // Contatori per le cards
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.stato === 'in_invio' || c.stato === 'programmata').length;
    const draftCampaigns = campaigns.filter(c => c.stato === 'bozza').length;
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Mail size={32} className="text-primary-600" />
                        Email Marketing
                    </h1>
                    <p className="text-gray-600 mt-1">Sistema completo gestione campagne email e automazioni</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowWizard(true)}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <Settings size={18} />
                        Setup Brevo
                    </button>
                    <button 
                        onClick={() => setShowWebhookWizard(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Activity size={18} />
                        Configura Webhook
                    </button>
                </div>
            </div>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">Campagne Totali</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{totalCampaigns}</p>
                </div>
                <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <p className="text-sm text-green-600 font-medium">Campagne Attive</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">{activeCampaigns}</p>
                </div>
                <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <p className="text-sm text-orange-600 font-medium">In Bozza</p>
                    <p className="text-3xl font-bold text-orange-900 mt-2">{draftCampaigns}</p>
                </div>
            </div>
            
            {/* Tabs Navigation */}
            <div className="card p-0 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('campagne')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'campagne'
                                ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Mail size={18} />
                        Campagne Email
                    </button>
                    <button
                        onClick={() => setActiveTab('scadenze')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'scadenze'
                                ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Calendar size={18} />
                        Scadenze Automatiche
                    </button>
                    <button
                        onClick={() => setActiveTab('template')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'template'
                                ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <FileText size={18} />
                        Template
                    </button>
                    <button
                        onClick={() => setActiveTab('statistiche')}
                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                            activeTab === 'statistiche'
                                ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <BarChart3 size={18} />
                        Statistiche
                    </button>
                </div>
                
                <div className="p-6">
                    {/* TAB 1: CAMPAGNE EMAIL */}
                    {activeTab === 'campagne' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Campagne Email</h2>
                                <button 
                                    onClick={() => setShowNewCampaignModal(true)}
                                    className="btn btn-primary flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    Nuova Campagna
                                </button>
                            </div>
                            
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                </div>
                            ) : campaigns.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                    <Mail size={48} className="mx-auto text-gray-400 mb-4" />
                                    <p className="text-gray-600 mb-4">Nessuna campagna email creata</p>
                                    <button 
                                        onClick={() => setShowNewCampaignModal(true)}
                                        className="btn btn-primary"
                                    >
                                        <Plus size={18} className="mr-2" />
                                        Crea Prima Campagna
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {campaigns.map((campaign) => (
                                        <div key={campaign.id} className="p-5 bg-white rounded-lg border-2 border-gray-200 hover:border-primary-300 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="font-bold text-gray-900 text-lg">{campaign.nome}</h3>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                            campaign.stato === 'completata'
                                                                ? 'bg-green-100 text-green-800'
                                                                : campaign.stato === 'in_invio'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : campaign.stato === 'programmata'
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {campaign.stato}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                                        <span className="capitalize">📧 Tipo: {campaign.tipo}</span>
                                                        <span className="capitalize">👥 Target: {campaign.target_clienti}</span>
                                                        {campaign.total_recipients > 0 && (
                                                            <span>📮 Destinatari: {campaign.total_recipients}</span>
                                                        )}
                                                    </div>
                                                    {campaign.sent_count > 0 && (
                                                        <div className="mt-3 flex gap-6">
                                                            <div className="text-sm">
                                                                <span className="text-gray-600">Inviate:</span>
                                                                <span className="ml-2 font-semibold text-green-600">{campaign.sent_count}</span>
                                                            </div>
                                                            <div className="text-sm">
                                                                <span className="text-gray-600">Aperture:</span>
                                                                <span className="ml-2 font-semibold text-blue-600">{campaign.opened_count || 0}</span>
                                                            </div>
                                                            <div className="text-sm">
                                                                <span className="text-gray-600">Click:</span>
                                                                <span className="ml-2 font-semibold text-purple-600">{campaign.clicked_count || 0}</span>
                                                            </div>
                                                            {campaign.failed_count > 0 && (
                                                                <div className="text-sm">
                                                                    <span className="text-gray-600">Fallite:</span>
                                                                    <span className="ml-2 font-semibold text-red-600">{campaign.failed_count}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* Visualizza Dettagli */}
                                                    <button 
                                                        onClick={() => handleViewCampaignDetails(campaign.id)}
                                                        className="btn btn-secondary btn-sm" 
                                                        title="Vedi Dettagli"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    
                                                    {/* Duplica */}
                                                    <button 
                                                        onClick={() => handleDuplicateCampaign(campaign.id, campaign.nome)}
                                                        className="btn btn-secondary btn-sm" 
                                                        title="Duplica Campagna"
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    
                                                    {/* Preview Email */}
                                                    <button 
                                                        onClick={() => handlePreviewCampaign(campaign.id)}
                                                        className="btn btn-secondary btn-sm" 
                                                        title="Anteprima Email"
                                                    >
                                                        <Mail size={16} />
                                                    </button>
                                                    
                                                    {/* Test Email */}
                                                    <button 
                                                        onClick={() => handleSendTestCampaign(campaign.id, campaign.nome)}
                                                        className="btn btn-secondary btn-sm" 
                                                        title="Invia Test"
                                                    >
                                                        <TestTube2 size={16} />
                                                    </button>
                                                    
                                                    {/* Modifica (solo bozza o programmata) */}
                                                    {['bozza', 'programmata'].includes(campaign.stato) && (
                                                        <button 
                                                            onClick={() => handleOpenEditCampaign(campaign)}
                                                            className="btn btn-secondary btn-sm" 
                                                            title="Modifica"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                    )}
                                                    
                                                    {/* Invia (solo bozza) */}
                                                    {campaign.stato === 'bozza' && (
                                                        <button 
                                                            onClick={() => handleSendCampaignNow(campaign.id, campaign.nome)}
                                                            className="btn btn-success btn-sm" 
                                                            title="Invia Subito"
                                                        >
                                                            <PlayCircle size={16} />
                                                        </button>
                                                    )}
                                                    
                                                    {/* Annulla (solo programmata) */}
                                                    {campaign.stato === 'programmata' && (
                                                        <button 
                                                            onClick={() => handleCancelCampaign(campaign.id, campaign.nome)}
                                                            className="btn btn-warning btn-sm" 
                                                            title="Annulla Programmazione"
                                                        >
                                                            <Ban size={16} />
                                                        </button>
                                                    )}
                                                    
                                                    {/* Elimina (solo bozza) */}
                                                    {campaign.stato === 'bozza' && (
                                                        <button 
                                                            onClick={() => handleDeleteCampaign(campaign.id, campaign.nome)}
                                                            className="btn btn-danger btn-sm" 
                                                            title="Elimina"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* TAB 2: SCADENZE AUTOMATICHE */}
                    {activeTab === 'scadenze' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-2">Gestione Contratti in Scadenza</h2>
                                <p className="text-gray-600">
                                    Visualizza e gestisci i contratti in scadenza. Puoi inviare email manuali o segnare come contattato.
                                </p>
                            </div>
                            
                            {/* Contatori per categoria scadenza - CLICCABILI COME FILTRI */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { key: '60+', label: '60+ giorni', colore: 'blue', min: 60, max: 999 },
                                    { key: '30-59', label: '30-59 giorni', colore: 'yellow', min: 30, max: 59 },
                                    { key: '15-29', label: '15-29 giorni', colore: 'orange', min: 15, max: 29 },
                                    { key: '0-14', label: '0-14 giorni', colore: 'red', min: 0, max: 14 }
                                ].map(({ key, label, colore, min, max }) => {
                                    const count = scadenze.filter(s => s.giorni_a_scadenza >= min && s.giorni_a_scadenza <= max).length;
                                    const isActive = filtroScadenza === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setFiltroScadenza(isActive ? null : key)}
                                            className={`card border-2 transition-all hover:shadow-lg cursor-pointer ${
                                                isActive ? 'ring-4 ring-offset-2' : ''
                                            } ${
                                                colore === 'red' ? `border-red-300 bg-red-50 ${isActive ? 'ring-red-400' : ''}` :
                                                colore === 'orange' ? `border-orange-300 bg-orange-50 ${isActive ? 'ring-orange-400' : ''}` :
                                                colore === 'yellow' ? `border-yellow-300 bg-yellow-50 ${isActive ? 'ring-yellow-400' : ''}` :
                                                `border-blue-300 bg-blue-50 ${isActive ? 'ring-blue-400' : ''}`
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="text-left">
                                                    <p className="text-3xl font-bold text-gray-900">{count}</p>
                                                    <p className="text-sm text-gray-600">{label}</p>
                                                    {isActive && <p className="text-xs font-medium mt-1 text-gray-700">✓ Attivo</p>}
                                                </div>
                                                <Calendar size={32} className={
                                                    colore === 'red' ? 'text-red-500' :
                                                    colore === 'orange' ? 'text-orange-500' :
                                                    colore === 'yellow' ? 'text-yellow-600' :
                                                    'text-blue-500'
                                                } />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            
                            {/* Indicatore filtro attivo */}
                            {filtroScadenza && (
                                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm text-blue-900">
                                        📊 Filtro attivo: <strong>{filtroScadenza} giorni</strong> ({scadenzeFiltered.length} contratti)
                                    </p>
                                    <button
                                        onClick={() => setFiltroScadenza(null)}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        ✕ Rimuovi filtro
                                    </button>
                                </div>
                            )}
                            
                            {/* Lista contratti in scadenza */}
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                </div>
                            ) : scadenzeFiltered.length === 0 ? (
                                <div className="card bg-gray-50 border-gray-200 text-center py-12">
                                    <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                                    <p className="text-gray-700 font-medium text-lg">
                                        {filtroScadenza 
                                            ? `Nessun contratto con scadenza ${filtroScadenza} giorni` 
                                            : 'Nessun contratto in scadenza nei prossimi 90 giorni! 🎉'}
                                    </p>
                                    {filtroScadenza && (
                                        <button
                                            onClick={() => setFiltroScadenza(null)}
                                            className="mt-4 btn btn-secondary btn-sm"
                                        >
                                            Rimuovi filtro
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {scadenzeFiltered.map((contratto) => {
                                        const isUrgente = contratto.giorni_a_scadenza <= 14;
                                        const isAttenzione = contratto.giorni_a_scadenza > 14 && contratto.giorni_a_scadenza <= 29;
                                        
                                        return (
                                            <div 
                                                key={`${contratto.tipo_contratto}-${contratto.id}`} 
                                                className={`card border-2 ${
                                                    isUrgente ? 'border-red-300 bg-red-50' :
                                                    isAttenzione ? 'border-orange-300 bg-orange-50' :
                                                    'border-gray-200 bg-white'
                                                } hover:shadow-lg transition-shadow`}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                                                contratto.tipo_contratto === 'luce' 
                                                                    ? 'bg-yellow-500 text-white' 
                                                                    : 'bg-blue-500 text-white'
                                                            }`}>
                                                                {contratto.tipo_contratto === 'luce' ? '⚡ Luce' : '🔥 Gas'}
                                                            </span>
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                                isUrgente ? 'bg-red-600 text-white' :
                                                                isAttenzione ? 'bg-orange-500 text-white' :
                                                                'bg-blue-500 text-white'
                                                            }`}>
                                                                {contratto.giorni_a_scadenza <= 0 
                                                                    ? 'SCADUTO!' 
                                                                    : `Scade tra ${contratto.giorni_a_scadenza} giorni`}
                                                            </span>
                                                        </div>
                                                        
                                                        <h3 className="font-bold text-gray-900 text-lg mb-1">
                                                            {contratto.cliente_nome || contratto.azienda_nome || 'Cliente Sconosciuto'}
                                                        </h3>
                                                        
                                                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
                                                            <p><strong>Email:</strong> {contratto.cliente_email || contratto.azienda_email || 'N/D'}</p>
                                                            <p><strong>POD/PDR:</strong> {contratto.pod_pdr || 'N/D'}</p>
                                                            <p><strong>Fornitore:</strong> {contratto.fornitore || 'N/D'}</p>
                                                            <p><strong>Scadenza:</strong> {new Date(contratto.data_scadenza).toLocaleDateString('it-IT')}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Azioni */}
                                                    <div className="flex flex-col gap-2">
                                                        <button 
                                                            onClick={() => handleSendScadenzaEmail(contratto)}
                                                            className="btn btn-primary btn-sm flex items-center gap-2 whitespace-nowrap"
                                                        >
                                                            <Mail size={16} />
                                                            Invia Email
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMarkContacted(contratto)}
                                                            className="btn btn-secondary btn-sm flex items-center gap-2 whitespace-nowrap"
                                                        >
                                                            <CheckCircle size={16} />
                                                            Contattato
                                                        </button>
                                                        <a 
                                                            href={`tel:${contratto.cliente_telefono || ''}`}
                                                            className="btn btn-secondary btn-sm flex items-center gap-2 whitespace-nowrap"
                                                        >
                                                            <Phone size={16} />
                                                            Chiama
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            
                            <div className="card bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                                <h3 className="font-bold text-purple-900 mb-3">⚙️ Configurazione Cron Job</h3>
                                <div className="space-y-2 text-sm text-purple-800">
                                    <p><strong>Frequenza:</strong> Ogni giorno alle ore 09:00</p>
                                    <p><strong>Controlli:</strong> Contratti luce e gas in scadenza (60, 30, 15, 7 giorni)</p>
                                    <p><strong>Azione:</strong> Invio automatico email personalizzate ai clienti</p>
                                    <p><strong>Template:</strong> Email scadenza con dettagli contratto e link offerte</p>
                                </div>
                            </div>
                            
                            <div className="card bg-green-50 border-green-200">
                                <h3 className="font-bold text-green-900 mb-3">✅ Funzionalità Attive</h3>
                                <ul className="space-y-2 text-sm text-green-800">
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                        Controllo automatico contratti in scadenza
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                        Email personalizzate per cliente (privato/azienda)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                        Tracking alert già inviati (no duplicati)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                        Log completo invii per audit
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                    
                    {/* TAB 3: TEMPLATE */}
                    {activeTab === 'template' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Template Email</h2>
                                <button 
                                    onClick={() => {
                                        setTemplateBuilderName('');
                                        setEditingTemplate(null);
                                        setShowTemplateBuilder(true);
                                    }}
                                    className="btn btn-primary flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    Nuovo Template
                                </button>
                            </div>
                            
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                                    <p className="text-gray-600 mb-4">Nessun template email creato</p>
                                    <button 
                                        onClick={() => {
                                            setTemplateBuilderName('');
                                            setEditingTemplate(null);
                                            setShowTemplateBuilder(true);
                                        }}
                                        className="btn btn-primary"
                                    >
                                        <Plus size={18} className="mr-2" />
                                        Crea Primo Template
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {templates.map((template) => (
                                        <div key={template.id} className="card hover:shadow-lg transition-shadow">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    template.tipo === 'scadenza' ? 'bg-red-100 text-red-800' :
                                                    template.tipo === 'promozionale' ? 'bg-green-100 text-green-800' :
                                                    template.tipo === 'benvenuto' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {template.tipo}
                                                </div>
                                                <FileText size={24} className="text-gray-400" />
                                            </div>
                                            <h3 className="font-bold text-gray-900 mb-2">{template.nome}</h3>
                                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.subject}</p>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        // Apri preview in nuova finestra
                                                        const previewWindow = window.open('', '_blank');
                                                        if (previewWindow) {
                                                            previewWindow.document.write(template.html_content || template.body_html || '');
                                                            previewWindow.document.close();
                                                        }
                                                    }}
                                                    className="btn btn-secondary btn-sm flex-1"
                                                >
                                                    <Eye size={16} className="mr-1" />
                                                    Preview
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setTemplateBuilderName(template.nome);
                                                        setEditingTemplate(template);
                                                        setShowTemplateBuilder(true);
                                                    }}
                                                    className="btn btn-primary btn-sm flex-1"
                                                >
                                                    <Edit size={16} className="mr-1" />
                                                    Modifica
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* TAB 4: STATISTICHE */}
                    {activeTab === 'statistiche' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">Statistiche Email</h2>
                                    <p className="text-gray-600">Panoramica delle email inviate oggi</p>
                                </div>
                                <button 
                                    onClick={handleExportAllClients}
                                    className="btn btn-secondary flex items-center gap-2"
                                >
                                    <Download size={18} />
                                    Export CSV Clienti
                                </button>
                            </div>
                            
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                </div>
                            ) : stats ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="card bg-blue-50 border-blue-200">
                                        <p className="text-sm text-blue-600 font-medium">Email Inviate Oggi</p>
                                        <p className="text-4xl font-bold text-blue-900 mt-3">{stats.sent}</p>
                                        <div className="mt-3 pt-3 border-t border-blue-200">
                                            <p className="text-xs text-blue-700">
                                                Limite giornaliero: {stats.limit}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="card bg-green-50 border-green-200">
                                        <p className="text-sm text-green-600 font-medium">Email Rimanenti</p>
                                        <p className="text-4xl font-bold text-green-900 mt-3">{stats.remaining}</p>
                                        <div className="mt-3 pt-3 border-t border-green-200">
                                            <div className="w-full bg-green-200 rounded-full h-2">
                                                <div 
                                                    className="bg-green-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${100 - stats.percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="card bg-purple-50 border-purple-200">
                                        <p className="text-sm text-purple-600 font-medium">Utilizzo</p>
                                        <p className="text-4xl font-bold text-purple-900 mt-3">{stats.percentage.toFixed(1)}%</p>
                                        <div className="mt-3 pt-3 border-t border-purple-200">
                                            <p className="text-xs text-purple-700">
                                                {stats.sent} / {stats.limit} email
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className={`card ${stats.percentage > 80 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                        <p className={`text-sm font-medium ${stats.percentage > 80 ? 'text-red-600' : 'text-gray-600'}`}>
                                            Stato Sistema
                                        </p>
                                        <p className={`text-2xl font-bold mt-3 ${stats.percentage > 80 ? 'text-red-900' : 'text-green-900'}`}>
                                            {stats.percentage > 90 ? '⚠️ Critico' : stats.percentage > 80 ? '⚠️ Alto' : '✅ OK'}
                                        </p>
                                        <div className={`mt-3 pt-3 border-t ${stats.percentage > 80 ? 'border-red-200' : 'border-gray-200'}`}>
                                            <p className={`text-xs ${stats.percentage > 80 ? 'text-red-700' : 'text-gray-700'}`}>
                                                {stats.percentage > 80 ? 'Limite quasi raggiunto' : 'Operativo'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">Dati statistiche non disponibili</p>
                                </div>
                            )}
                            
                            <div className="card bg-yellow-50 border-yellow-200">
                                <h3 className="font-bold text-yellow-900 mb-3">📊 Informazioni Rate Limit</h3>
                                <div className="space-y-2 text-sm text-yellow-800">
                                    <p><strong>Provider:</strong> Brevo (ex Sendinblue) - Piano Gratuito</p>
                                    <p><strong>Limite giornaliero:</strong> 300 email/giorno</p>
                                    <p><strong>Limite orario:</strong> 50 email/ora</p>
                                    <p><strong>Limite al minuto:</strong> 10 email/minuto</p>
                                    <p className="pt-2 border-t border-yellow-300">
                                        💡 <strong>Tip:</strong> Per inviare più email, considera l'upgrade al piano Business di Brevo
                                    </p>
                                </div>
                            </div>
                            
                            <div className="card bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                                <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                                    <Activity size={20} />
                                    🚀 Tracking Real-Time con Webhook
                                </h3>
                                <p className="text-purple-800 text-sm mb-3">
                                    Attiva il webhook Brevo per tracciare automaticamente <strong>aperture</strong>, <strong>click</strong> e <strong>bounce</strong> delle email inviate!
                                </p>
                                <div className="bg-white rounded-lg p-3 border border-purple-200 mb-3 text-xs">
                                    <p className="text-purple-900 font-medium mb-2">✅ Cosa ottieni:</p>
                                    <ul className="text-purple-800 space-y-1">
                                        <li>• Statistiche aggiornate in tempo reale</li>
                                        <li>• Tracking aperture email (pixel tracking)</li>
                                        <li>• Tracking click sui link</li>
                                        <li>• Gestione automatica bounce e unsubscribe</li>
                                    </ul>
                                </div>
                                <button 
                                    onClick={() => setShowWebhookWizard(true)}
                                    className="btn btn-primary btn-sm w-full flex items-center justify-center gap-2"
                                >
                                    <Activity size={16} />
                                    Configura Webhook Ora
                                </button>
                            </div>
                            
                            {/* SEZIONE: Lista Email Inviate per Periodo */}
                            <div className="card">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        📧 Email Inviate
                                    </h3>
                                    <div className="flex gap-2">
                                        {['giorno', 'settimana', 'mese', 'anno', 'tutto'].map((periodo) => (
                                            <button
                                                key={periodo}
                                                onClick={() => {
                                                    setPeriodoLogs(periodo);
                                                    setCurrentPage(1);
                                                }}
                                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                    periodoLogs === periodo
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                {periodo.charAt(0).toUpperCase() + periodo.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Statistiche Raggruppate */}
                                {emailLogsStats.length > 0 && (
                                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {emailLogsStats.map((stat: any, idx: number) => (
                                            <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                                <p className="text-sm font-medium text-blue-900 mb-2">
                                                    📅 {stat.periodo}
                                                </p>
                                                <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                                                    <div>
                                                        <p className="font-semibold">Totali: {stat.totale}</p>
                                                        <p>Inviate: {stat.inviate}</p>
                                                    </div>
                                                    <div>
                                                        <p>Aperte: {stat.aperte}</p>
                                                        <p>Cliccate: {stat.cliccate}</p>
                                                        <p className="text-red-600">Fallite: {stat.fallite}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Tabella Email */}
                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                    </div>
                                ) : emailLogs.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                                        <Mail size={48} className="mx-auto text-gray-400 mb-3" />
                                        <p className="text-gray-600">Nessuna email trovata per questo periodo</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b-2 border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Data</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Destinatario</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Oggetto</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tipo</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Stato</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tracking</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {emailLogs.map((log: any) => (
                                                        <tr key={log.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                {new Date(log.sent_at).toLocaleString('it-IT', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="text-sm">
                                                                    <p className="font-medium text-gray-900">{log.email_destinatario}</p>
                                                                    <p className="text-gray-500 text-xs">
                                                                        {log.cliente_nome_privato || log.cliente_nome_azienda || 'N/D'}
                                                                    </p>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="text-sm">
                                                                    <p className="font-medium text-gray-900">{log.subject}</p>
                                                                    {log.campagna_nome && (
                                                                        <p className="text-xs text-blue-600">📧 {log.campagna_nome}</p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                                    log.tipo_email.includes('scadenza') ? 'bg-yellow-100 text-yellow-800' :
                                                                    log.tipo_email === 'promozionale' ? 'bg-purple-100 text-purple-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                    {log.tipo_email}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                                    log.stato === 'inviato' ? 'bg-green-100 text-green-800' :
                                                                    log.stato === 'fallito' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                    {log.stato === 'inviato' ? '✅ Inviata' :
                                                                     log.stato === 'fallito' ? '❌ Fallita' :
                                                                     '⏳ In coda'}
                                                                </span>
                                                                {log.errore && (
                                                                    <p className="text-xs text-red-600 mt-1">{log.errore}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex flex-col gap-1 text-xs">
                                                                    {log.opened_at ? (
                                                                        <span className="text-green-600">👁️ Aperta</span>
                                                                    ) : (
                                                                        <span className="text-gray-400">👁️ Non aperta</span>
                                                                    )}
                                                                    {log.clicked_at && (
                                                                        <span className="text-blue-600">🖱️ Click</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        {/* Paginazione */}
                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-gray-200">
                                                <button
                                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                    disabled={currentPage === 1}
                                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    ← Precedente
                                                </button>
                                                <span className="text-sm text-gray-700">
                                                    Pagina <strong>{currentPage}</strong> di <strong>{totalPages}</strong>
                                                </span>
                                                <button
                                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Successiva →
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Wizard Setup Brevo */}
            {showWizard && (
                <BrevoSetupWizard 
                    onComplete={() => {
                        setShowWizard(false);
                        toast.success('🎉 Setup Brevo completato con successo!');
                        loadData(); // Ricarica dati
                    }}
                    onClose={() => setShowWizard(false)}
                />
            )}
            
            {/* Wizard Setup Webhook */}
            {showWebhookWizard && (
                <WebhookSetupWizard 
                    onComplete={() => {
                        setShowWebhookWizard(false);
                        toast.success('🎉 Webhook configurato con successo! Il tracking real-time è ora attivo.');
                    }}
                    onClose={() => setShowWebhookWizard(false)}
                />
            )}
            
            {/* Modale Nuova Campagna */}
            {showNewCampaignModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Mail size={28} />
                                Nuova Campagna Email
                            </h2>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Campagna *</label>
                                <input
                                    type="text"
                                    value={newCampaign.nome}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, nome: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Es: Promo Natale 2025"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Oggetto Email *</label>
                                <input
                                    type="text"
                                    value={newCampaign.subject}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Es: 🔥 Offerta Speciale Natale - Risparmia fino a 30%"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Campagna</label>
                                    <select
                                        value={newCampaign.tipo}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, tipo: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="promo">📣 Promozionale</option>
                                        <option value="newsletter">📰 Newsletter</option>
                                        <option value="scadenza">⏰ Alert Scadenza</option>
                                        <option value="altro">📧 Altro</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Clienti</label>
                                    <select
                                        value={newCampaign.target_clienti}
                                        onChange={(e) => {
                                            setNewCampaign({ ...newCampaign, target_clienti: e.target.value });
                                            if (e.target.value !== 'selezione_manuale') {
                                                setSelectedClientIds([]);
                                                setManualEmails('');
                                            }
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="tutti">👥 Tutti i clienti</option>
                                        <option value="privati">🏠 Solo Privati</option>
                                        <option value="aziende">🏢 Solo Aziende</option>
                                        <option value="con_contratto">📄 Con contratti attivi</option>
                                        <option value="selezione_manuale">✏️ Selezione Manuale</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* Selezione manuale clienti + email */}
                            {newCampaign.target_clienti === 'selezione_manuale' && (
                                <div className="space-y-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                                    <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                                        ✏️ Selezione Manuale Destinatari
                                    </h3>
                                    
                                    {/* Seleziona clienti da DB */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            📋 Seleziona Clienti dal Database
                                        </label>
                                        <ClientiSelector 
                                            selectedClientIds={selectedClientIds}
                                            onSelectionChange={setSelectedClientIds}
                                            maxHeight="300px"
                                        />
                                        {selectedClientIds.length > 0 && (
                                            <p className="text-sm text-green-700 font-medium mt-2">
                                                ✅ {selectedClientIds.length} cliente{selectedClientIds.length !== 1 ? 'i' : ''} selezionat{selectedClientIds.length !== 1 ? 'i' : 'o'}
                                            </p>
                                        )}
                                    </div>
                                    
                                    {/* Email manuali */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            ✉️ Email Aggiuntive (Opzionale)
                                        </label>
                                        <textarea
                                            value={manualEmails}
                                            onChange={(e) => setManualEmails(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                            rows={4}
                                            placeholder="Inserisci email aggiuntive separate da virgola, punto e virgola o a capo:&#10;&#10;mario.rossi@email.com&#10;info@azienda.it, contatto@gmail.com"
                                        />
                                        {manualEmails.trim() && (
                                            <p className="text-xs text-gray-600 mt-1">
                                                📧 {manualEmails.split(/[\n,;]/).filter(e => e.trim() && e.includes('@')).length} email aggiuntive rilevate
                                            </p>
                                        )}
                                    </div>
                                    
                                    {/* Riepilogo */}
                                    <div className="bg-white rounded-lg p-3 border border-blue-300">
                                        <p className="text-sm font-semibold text-gray-900 mb-1">📊 Riepilogo Destinatari:</p>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p>• Clienti selezionati: <strong>{selectedClientIds.length}</strong></p>
                                            <p>• Email manuali: <strong>{manualEmails.split(/[\n,;]/).filter(e => e.trim() && e.includes('@')).length}</strong></p>
                                            <p className="font-bold text-blue-700 pt-1 border-t border-blue-200">
                                                Totale destinatari: <strong>
                                                    {selectedClientIds.length + manualEmails.split(/[\n,;]/).filter(e => e.trim() && e.includes('@')).length}
                                                </strong>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Template da usare (opzionale)</label>
                                <select
                                    value={newCampaign.template_id}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, template_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Nessun template (testo semplice)</option>
                                    {templates.map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.nome}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">📅 Data/Ora Inizio (opzionale)</label>
                                    <input
                                        type="datetime-local"
                                        value={newCampaign.scheduled_at}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, scheduled_at: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Quando iniziare l'invio</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">🏁 Data/Ora Fine (opzionale)</label>
                                    <input
                                        type="datetime-local"
                                        value={newCampaign.scheduled_end_at}
                                        onChange={(e) => setNewCampaign({ ...newCampaign, scheduled_end_at: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Quando terminare l'invio</p>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-900">
                                    💡 <strong>Nota:</strong> La campagna verrà salvata come <strong>bozza</strong>. 
                                    Potrai modificarla e inviarla successivamente dalla lista campagne.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => setShowNewCampaignModal(false)}
                                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleCreateCampaign}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                            >
                                ✅ Crea Campagna
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modale Nuovo Template */}
            {showNewTemplateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <FileText size={28} />
                                Nuovo Template Email
                            </h2>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Template *</label>
                                <input
                                    type="text"
                                    value={newTemplate.nome}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, nome: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="Es: Template Promo Natale"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Oggetto Predefinito *</label>
                                <input
                                    type="text"
                                    value={newTemplate.subject}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="Es: Offerta Speciale per te!"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                                <select
                                    value={newTemplate.categoria}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, categoria: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="promo">📣 Promozionale</option>
                                    <option value="scadenza">⏰ Scadenza</option>
                                    <option value="newsletter">📰 Newsletter</option>
                                    <option value="altro">📧 Altro</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Corpo Email HTML *</label>
                                <textarea
                                    value={newTemplate.body_html}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, body_html: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                                    rows={12}
                                    placeholder="<html>&#10;<body>&#10;  <h1>Ciao {{nome_cliente}}!</h1>&#10;  <p>...</p>&#10;</body>&#10;</html>"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    💡 Variabili disponibili: <code className="bg-gray-100 px-1">{'{{nome_cliente}}'}</code>, 
                                    <code className="bg-gray-100 px-1 ml-1">{'{{email_cliente}}'}</code>, 
                                    <code className="bg-gray-100 px-1 ml-1">{'{{unsubscribe_link}}'}</code>
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => setShowNewTemplateModal(false)}
                                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleCreateTemplate}
                                className="flex-1 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700"
                            >
                                ✅ Crea Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modale Selezione Template e Invio Email */}
            {showEmailModal && selectedContratto && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Mail size={28} />
                                Invia Email di Scadenza
                            </h2>
                            <p className="text-blue-100 text-sm mt-1">
                                {selectedContratto.cliente_nome || selectedContratto.azienda_nome}
                            </p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-2">Dettagli Contratto</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                                    <p><strong>Tipo:</strong> {selectedContratto.tipo_contratto.toUpperCase()}</p>
                                    <p><strong>Scadenza:</strong> {new Date(selectedContratto.data_scadenza).toLocaleDateString('it-IT')}</p>
                                    <p><strong>Fornitore:</strong> {selectedContratto.fornitore}</p>
                                    <p><strong>Email:</strong> {selectedContratto.cliente_email || selectedContratto.azienda_email}</p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Seleziona Template Email *</label>
                                <select
                                    value={emailTemplate}
                                    onChange={(e) => setEmailTemplate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="default">📧 Template Standard (Automatico)</option>
                                    <option value="formal">👔 Template Formale</option>
                                    <option value="friendly">😊 Template Amichevole</option>
                                    <option value="urgent">⚠️ Template Urgente</option>
                                    <option value="custom">✍️ Messaggio Personalizzato</option>
                                </select>
                            </div>
                            
                            {emailTemplate !== 'default' && emailTemplate !== 'custom' && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-900">
                                        <strong>Anteprima:</strong>
                                    </p>
                                    <div className="mt-2 text-sm text-blue-800">
                                        {emailTemplate === 'formal' && (
                                            <p>Gentile Cliente, desideriamo informarLa che il contratto in oggetto è in scadenza...</p>
                                        )}
                                        {emailTemplate === 'friendly' && (
                                            <p>Ciao! Ti contattiamo per ricordarti che il tuo contratto sta per scadere...</p>
                                        )}
                                        {emailTemplate === 'urgent' && (
                                            <p>⚠️ ATTENZIONE: Il tuo contratto scade a breve! È importante rinnovarlo per evitare interruzioni...</p>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {emailTemplate === 'custom' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Scrivi il tuo messaggio *</label>
                                    <textarea
                                        value={customMessage}
                                        onChange={(e) => setCustomMessage(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        rows={8}
                                        placeholder="Scrivi qui il messaggio personalizzato da inviare al cliente...&#10;&#10;Puoi includere:&#10;- Saluti personalizzati&#10;- Offerte specifiche&#10;- Dettagli personalizzati"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        💡 Il messaggio verrà formattato automaticamente e includerà i dettagli del contratto
                                    </p>
                                </div>
                            )}
                            
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-900">
                                    ⚡ <strong>Note:</strong> L'email includerà automaticamente i dettagli del contratto, 
                                    la data di scadenza e le informazioni di contatto.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => {
                                    setShowEmailModal(false);
                                    setSelectedContratto(null);
                                }}
                                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleConfirmSendEmail}
                                disabled={emailTemplate === 'custom' && !customMessage.trim()}
                                className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                📧 Invia Email
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modale Dettagli Campagna */}
            {showCampaignDetailsModal && selectedCampaign && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Mail size={28} />
                                    Dettagli Campagna
                                </h2>
                                <p className="text-blue-100 text-sm mt-1">{selectedCampaign.nome}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowCampaignDetailsModal(false);
                                    setSelectedCampaign(null);
                                }}
                                className="text-white hover:bg-white/20 p-2 rounded-lg"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Info Generali */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Nome Campagna</label>
                                    <p className="text-gray-900 font-semibold text-lg">{selectedCampaign.nome}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Stato</label>
                                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                                        selectedCampaign.stato === 'completata' ? 'bg-green-100 text-green-800' :
                                        selectedCampaign.stato === 'in_invio' ? 'bg-blue-100 text-blue-800' :
                                        selectedCampaign.stato === 'programmata' ? 'bg-purple-100 text-purple-800' :
                                        selectedCampaign.stato === 'annullata' ? 'bg-gray-100 text-gray-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {selectedCampaign.stato}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Tipo</label>
                                    <p className="text-gray-900 capitalize">{selectedCampaign.tipo}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Target Clienti</label>
                                    <p className="text-gray-900 capitalize">{selectedCampaign.target_clienti}</p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Oggetto Email</label>
                                <p className="text-gray-900">{selectedCampaign.subject}</p>
                            </div>
                            
                            {/* Date */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">📅 Creata</label>
                                    <p className="text-gray-900 text-sm">{new Date(selectedCampaign.created_at).toLocaleString('it-IT')}</p>
                                </div>
                                {selectedCampaign.scheduled_at && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 mb-1">⏰ Programmata</label>
                                        <p className="text-gray-900 text-sm">{new Date(selectedCampaign.scheduled_at).toLocaleString('it-IT')}</p>
                                    </div>
                                )}
                                {selectedCampaign.sent_at && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 mb-1">✅ Inviata</label>
                                        <p className="text-gray-900 text-sm">{new Date(selectedCampaign.sent_at).toLocaleString('it-IT')}</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Statistiche */}
                            {selectedCampaign.statistiche && (
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-3 text-lg">📊 Statistiche Invio</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                                            <p className="text-sm text-blue-600 font-medium mb-1">Totale Invii</p>
                                            <p className="text-2xl font-bold text-blue-700">{selectedCampaign.statistiche.totale_invii}</p>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                                            <p className="text-sm text-green-600 font-medium mb-1">Consegnate</p>
                                            <p className="text-2xl font-bold text-green-700">{selectedCampaign.statistiche.invii_riusciti}</p>
                                        </div>
                                        <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                                            <p className="text-sm text-purple-600 font-medium mb-1">Aperte</p>
                                            <p className="text-2xl font-bold text-purple-700">{selectedCampaign.statistiche.totale_aperture}</p>
                                            <p className="text-xs text-purple-600 mt-1">{selectedCampaign.statistiche.tasso_apertura}%</p>
                                        </div>
                                        <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                                            <p className="text-sm text-indigo-600 font-medium mb-1">Click</p>
                                            <p className="text-2xl font-bold text-indigo-700">{selectedCampaign.statistiche.totale_click}</p>
                                            <p className="text-xs text-indigo-600 mt-1">{selectedCampaign.statistiche.tasso_click}%</p>
                                        </div>
                                        {selectedCampaign.statistiche.invii_falliti > 0 && (
                                            <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
                                                <p className="text-sm text-red-600 font-medium mb-1">Fallite</p>
                                                <p className="text-2xl font-bold text-red-700">{selectedCampaign.statistiche.invii_falliti}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Destinatari (per selezione manuale) */}
                            {selectedCampaign.target_clienti === 'selezione_manuale' && selectedCampaign.filtri_targeting && (
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-3 text-lg">👥 Destinatari Selezionati</h3>
                                    <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                                        {selectedCampaign.filtri_targeting.selected_client_ids?.length > 0 && (
                                            <p className="text-sm text-gray-700">
                                                📋 <strong>{selectedCampaign.filtri_targeting.selected_client_ids.length}</strong> clienti dal database
                                            </p>
                                        )}
                                        {selectedCampaign.filtri_targeting.manual_emails?.length > 0 && (
                                            <p className="text-sm text-gray-700">
                                                ✉️ <strong>{selectedCampaign.filtri_targeting.manual_emails.length}</strong> email manuali
                                            </p>
                                        )}
                                        <p className="text-sm font-bold text-blue-700 pt-2 border-t border-gray-200">
                                            Totale: <strong>{selectedCampaign.total_recipients}</strong> destinatari
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {/* Creato da */}
                            {selectedCampaign.creato_da_nome && (
                                <div className="text-sm text-gray-600 pt-4 border-t border-gray-200">
                                    👤 Creata da: <strong>{selectedCampaign.creato_da_nome}</strong>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => {
                                    setShowCampaignDetailsModal(false);
                                    setSelectedCampaign(null);
                                }}
                                className="w-full px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modale Modifica Campagna */}
            {showEditCampaignModal && editingCampaign && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
                        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-xl flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Edit size={28} />
                                    Modifica Campagna
                                </h2>
                                <p className="text-purple-100 text-sm mt-1">Aggiorna i dettagli della campagna</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowEditCampaignModal(false);
                                    setEditingCampaign(null);
                                    setSelectedCampaign(null);
                                    setSelectedClientIds([]);
                                    setManualEmails('');
                                }}
                                className="text-white hover:bg-white/20 p-2 rounded-lg"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Campagna *</label>
                                <input
                                    type="text"
                                    value={editingCampaign.nome}
                                    onChange={(e) => setEditingCampaign({ ...editingCampaign, nome: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="es. Promo Estate 2025"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Campagna</label>
                                    <select
                                        value={editingCampaign.tipo}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, tipo: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="promo">📣 Promozionale</option>
                                        <option value="scadenza">⏰ Scadenza</option>
                                        <option value="newsletter">📰 Newsletter</option>
                                        <option value="altro">📧 Altro</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Clienti *</label>
                                    <select
                                        value={editingCampaign.target_clienti}
                                        onChange={(e) => {
                                            setEditingCampaign({ ...editingCampaign, target_clienti: e.target.value });
                                            if (e.target.value !== 'selezione_manuale') {
                                                setSelectedClientIds([]);
                                                setManualEmails('');
                                            }
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="tutti">👥 Tutti i Clienti</option>
                                        <option value="privati">🏠 Solo Privati</option>
                                        <option value="aziende">🏢 Solo Aziende</option>
                                        <option value="selezione_manuale">✏️ Selezione Manuale</option>
                                    </select>
                                </div>
                            </div>
                            
                            {editingCampaign.target_clienti === 'selezione_manuale' && (
                                <div className="space-y-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                                    <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                                        ✏️ Selezione Manuale Destinatari
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            📋 Seleziona Clienti dal Database
                                        </label>
                                        <ClientiSelector 
                                            selectedClientIds={selectedClientIds}
                                            onSelectionChange={setSelectedClientIds}
                                            maxHeight="250px"
                                        />
                                        {selectedClientIds.length > 0 && (
                                            <p className="text-sm text-green-700 font-medium mt-2">
                                                ✅ {selectedClientIds.length} cliente{selectedClientIds.length !== 1 ? 'i' : ''} selezionat{selectedClientIds.length !== 1 ? 'i' : 'o'}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            ✉️ Email Aggiuntive (Opzionale)
                                        </label>
                                        <textarea
                                            value={manualEmails}
                                            onChange={(e) => setManualEmails(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                                            rows={4}
                                            placeholder="email1@esempio.it&#10;email2@esempio.it"
                                        />
                                    </div>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Oggetto Email *</label>
                                <input
                                    type="text"
                                    value={editingCampaign.subject}
                                    onChange={(e) => setEditingCampaign({ ...editingCampaign, subject: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="es. Scopri le nostre offerte estate!"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">📅 Data/Ora Inizio (opzionale)</label>
                                    <input
                                        type="datetime-local"
                                        value={editingCampaign.scheduled_at}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, scheduled_at: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Quando iniziare l'invio</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">🏁 Data/Ora Fine (opzionale)</label>
                                    <input
                                        type="datetime-local"
                                        value={editingCampaign.scheduled_end_at}
                                        onChange={(e) => setEditingCampaign({ ...editingCampaign, scheduled_end_at: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Quando terminare l'invio</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => {
                                    setShowEditCampaignModal(false);
                                    setEditingCampaign(null);
                                    setSelectedCampaign(null);
                                    setSelectedClientIds([]);
                                    setManualEmails('');
                                }}
                                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleUpdateCampaign}
                                className="flex-1 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700"
                            >
                                ✅ Salva Modifiche
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Template Builder */}
            {showTemplateBuilder && (
                <EmailTemplateBuilder
                    onSave={handleSaveTemplateFromBuilder}
                    onClose={() => {
                        setShowTemplateBuilder(false);
                        setTemplateBuilderName('');
                        setEditingTemplate(null);
                    }}
                    initialDesign={editingTemplate?.design_json ? JSON.parse(editingTemplate.design_json) : null}
                    templateName={templateBuilderName}
                    onNameChange={setTemplateBuilderName}
                />
            )}
        </div>
    );
}

