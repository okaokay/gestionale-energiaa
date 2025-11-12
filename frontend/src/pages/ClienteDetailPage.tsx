/**
 * Pagina COMPLETA dettaglio cliente con tutte le funzionalità CRM
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    ArrowLeft, Edit, Trash2, Mail, Phone, MessageSquare, FileText, 
    User, Building2, MapPin, Calendar, CreditCard, FileCheck, 
    Clock, TrendingUp, AlertCircle, CheckCircle, XCircle,
    Download, Upload, Plus, Save, X, Lightbulb, History, Zap, Flame
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clientiAPI, contrattiAPI, storicoAPI } from '../services/api';
import EmailComposeModal from '../components/EmailComposeModal';
import ClienteNoteTimeline from '../components/ClienteNoteTimeline';
import AIImportModal from '../components/AIImportModal';
import ClienteDocumenti from '../components/ClienteDocumenti';
import EditContrattoModal from '../components/EditContrattoModal';
import CreateContrattoModal from '../components/CreateContrattoModal';
import InlineEditable from '../components/InlineEditable';

type TabType = 'dati' | 'contratti' | 'documenti' | 'email' | 'note' | 'storico';

export default function ClienteDetailPage() {
    const { id, tipo } = useParams<{ id: string; tipo?: string }>();
    const navigate = useNavigate();
    
    // Inizializza immediatamente per nuovi clienti
    // Se tipo è definito ma id non lo è, siamo in modalità creazione
    const isNewClient = (!id && tipo) || id === 'new';
    
    const [cliente, setCliente] = useState<any>(isNewClient && tipo ? { tipo } : null);
    const [loading, setLoading] = useState(!isNewClient);
    const [activeTab, setActiveTab] = useState<TabType>('dati');
    const [editing, setEditing] = useState(isNewClient);
    const [formData, setFormData] = useState<any>(isNewClient && tipo ? { tipo } : {});
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showAIImportModal, setShowAIImportModal] = useState(false);
    const [showEditContrattoModal, setShowEditContrattoModal] = useState(false);
    const [showCreateContrattoModal, setShowCreateContrattoModal] = useState(false);
    const [selectedContratto, setSelectedContratto] = useState<any>(null);
    const [contratti, setContratti] = useState<any[]>([]);
    const [loadingContratti, setLoadingContratti] = useState(false);
    const [emailStorico, setEmailStorico] = useState<any[]>([]);
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [attivita, setAttivita] = useState<any[]>([]);
    const [loadingAttivita, setLoadingAttivita] = useState(false);
    const [filtroAttivita, setFiltroAttivita] = useState<string>('tutte');
    
    useEffect(() => {
        console.log('🔧 useEffect triggered - id:', id, 'tipo:', tipo, 'isNewClient:', isNewClient);
        
        // Per nuovi clienti lo stato è già inizializzato
        if (!isNewClient && id) {
            // Cliente esistente
            console.log('📖 Caricamento cliente esistente:', id);
            loadCliente();
        }
    }, [id, tipo]);
    
    const loadCliente = async () => {
        try {
            setLoading(true);
            let tipoCliente: 'privato' | 'azienda' = 'privato';
            
            // Prova prima come privato, poi come azienda
            try {
                const response = await clientiAPI.getPrivato(id!);
                setCliente({ ...response.data.data, tipo: 'privato' });
                setFormData(response.data.data);
                tipoCliente = 'privato';
            } catch {
                const response = await clientiAPI.getAzienda(id!);
                setCliente({ ...response.data.data, tipo: 'azienda' });
                setFormData(response.data.data);
                tipoCliente = 'azienda';
            }
            
            // Carica anche i contratti per il contatore in alto
            await loadContratti(tipoCliente, id);
        } catch (error) {
            console.error('Errore caricamento cliente:', error);
            toast.error('❌ Cliente non trovato');
            navigate('/clienti');
        } finally {
            setLoading(false);
        }
    };
    
    const loadContratti = async (tipoCliente?: 'privato' | 'azienda', clienteId?: string) => {
        const tipo = tipoCliente || cliente?.tipo;
        const cId = clienteId || id;
        
        if (!tipo || !cId || isNewClient) return;
        
        try {
            setLoadingContratti(true);
            const response = await contrattiAPI.getByCliente(tipo, cId);
            setContratti(response.data.data || []);
        } catch (error) {
            console.error('Errore caricamento contratti:', error);
            toast.error('Errore caricamento contratti');
        } finally {
            setLoadingContratti(false);
        }
    };
    
    const loadEmailStorico = async () => {
        if (!cliente || !id || isNewClient) return;
        
        try {
            setLoadingEmail(true);
            const response = await storicoAPI.getEmailCliente(cliente.tipo, id);
            setEmailStorico(response.data.data || []);
        } catch (error) {
            console.error('Errore caricamento email:', error);
            toast.error('Errore caricamento storico email');
        } finally {
            setLoadingEmail(false);
        }
    };
    
    const loadAttivita = async () => {
        if (!cliente || !id || isNewClient) return;
        
        try {
            setLoadingAttivita(true);
            const filtro = filtroAttivita !== 'tutte' ? { tipo_azione: filtroAttivita } : {};
            const response = await storicoAPI.getAttivitaCliente(cliente.tipo, id, filtro);
            setAttivita(response.data.data || []);
        } catch (error) {
            console.error('Errore caricamento attività:', error);
            toast.error('Errore caricamento storico attività');
        } finally {
            setLoadingAttivita(false);
        }
    };
    
    // Carica dati in base al tab attivo
    useEffect(() => {
        if (!isNewClient && cliente) {
            if (activeTab === 'contratti') {
                loadContratti();
            } else if (activeTab === 'email') {
                loadEmailStorico();
            } else if (activeTab === 'storico') {
                loadAttivita();
            }
        }
    }, [activeTab, cliente, filtroAttivita]);
    
    const handleSave = async () => {
        try {
            console.log('💾 Salvataggio cliente...', { tipo: cliente?.tipo, id, formData, isNew: isNewClient });
            
            if (isNewClient) {
                // Creazione nuovo cliente
                let response;
                if (cliente.tipo === 'privato') {
                    response = await clientiAPI.createPrivato(formData);
                } else {
                    response = await clientiAPI.createAzienda(formData);
                }
                toast.success('✅ Cliente creato con successo!');
                // Naviga alla pagina del nuovo cliente
                const newClientId = response.data.data.id;
                navigate(`/clienti/${newClientId}`);
            } else {
                // Aggiornamento cliente esistente
                if (cliente.tipo === 'privato') {
                    await clientiAPI.updatePrivato(id!, formData);
                } else {
                    await clientiAPI.updateAzienda(id!, formData);
                }
                toast.success('✅ Cliente aggiornato!');
                setEditing(false);
                await loadCliente();
            }
        } catch (error: any) {
            console.error('❌ Errore salvataggio:', error);
            toast.error(`❌ Errore salvataggio: ${error.response?.data?.message || error.message}`);
        }
    };
    
    const handleDelete = async () => {
        if (!confirm('⚠️ Sei sicuro di voler eliminare questo cliente?')) return;
        
        try {
            await clientiAPI.delete(cliente.tipo === 'privato' ? 'privati' : 'aziende', id!);
            toast.success('✅ Cliente eliminato');
            navigate('/clienti');
        } catch (error) {
            toast.error('❌ Errore eliminazione');
        }
    };
    
    const handleCall = () => {
        const phone = cliente.tipo === 'privato' 
            ? cliente.telefono_mobile || cliente.telefono_fisso
            : cliente.telefono_referente;
        if (phone) {
            window.location.href = `tel:${phone}`;
        }
    };
    
    const handleWhatsApp = () => {
        const phone = cliente.tipo === 'privato' 
            ? cliente.telefono_mobile
            : cliente.telefono_referente;
        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanPhone}`, '_blank');
        }
    };
    
    const handleAIDataExtracted = (data: any) => {
        console.log('✨ Dati AI ricevuti:', data);
        setFormData({ ...formData, ...data });
        toast.success('✨ Dati importati! Rivedi e salva');
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    
    // Non mostrare "Cliente non trovato" se è un nuovo cliente (ancora in fase di inizializzazione)
    if (!cliente && !isNewClient) {
        return (
            <div className="p-8 text-center">
                <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Cliente non trovato</h2>
                <button onClick={() => navigate('/clienti')} className="btn-primary">
                    Torna ai clienti
                </button>
            </div>
        );
    }
    
    // Se è un nuovo cliente e cliente è ancora null, non renderizzare nulla (aspetta)
    if (!cliente && isNewClient) {
        return null;
    }
    
    const nome = isNewClient
        ? `Nuovo Cliente ${tipo === 'privato' ? 'Privato' : 'Azienda'}`
        : cliente.tipo === 'privato' 
            ? `${cliente.nome || ''} ${cliente.cognome || ''}`.trim() || 'Cliente Senza Nome'
            : cliente.ragione_sociale || 'Azienda Senza Nome';
    
    const email = cliente.tipo === 'privato'
        ? cliente.email_principale
        : cliente.email_referente;
    
    const telefono = cliente.tipo === 'privato'
        ? cliente.telefono_mobile || cliente.telefono_fisso
        : cliente.telefono_referente;
    
    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* HEADER */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                        <button 
                            onClick={() => navigate('/clienti')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-full ${cliente.tipo === 'privato' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                                {cliente.tipo === 'privato' ? <User size={32} className="text-blue-600" /> : <Building2 size={32} className="text-purple-600" />}
                            </div>
                            
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{nome}</h1>
                                <div className="flex items-center gap-4 mt-2 text-gray-600">
                                    {email && (
                                        <div className="flex items-center gap-2">
                                            <Mail size={16} />
                                            <span>{email}</span>
                                        </div>
                                    )}
                                    {telefono && (
                                        <div className="flex items-center gap-2">
                                            <Phone size={16} />
                                            <span>{telefono}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* AZIONI RAPIDE */}
                    <div className="flex items-center gap-2">
                        {editing ? (
                            <>
                                {isNewClient && (
                                    <button 
                                        onClick={() => setShowAIImportModal(true)} 
                                        className="btn bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                                        title="Import Intelligente con AI"
                                    >
                                        <Lightbulb size={18} /> Import AI
                                    </button>
                                )}
                                <button onClick={handleSave} className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                                    <Save size={18} /> {isNewClient ? 'Crea Cliente' : 'Salva'}
                                </button>
                                {!isNewClient && (
                                    <button onClick={() => { setEditing(false); setFormData(cliente); }} className="btn bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-2">
                                        <X size={18} /> Annulla
                                    </button>
                                )}
                                {isNewClient && (
                                    <button onClick={() => navigate('/clienti')} className="btn bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-2">
                                        <X size={18} /> Annulla
                                    </button>
                                )}
                            </>
                        ) : !isNewClient && (
                            <>
                                <button onClick={() => setEditing(true)} className="btn bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                                    <Edit size={18} /> Modifica
                                </button>
                                <button onClick={() => setShowEmailModal(true)} className="btn bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                                    <Mail size={18} /> Email
                                </button>
                                <button onClick={handleCall} className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                                    <Phone size={18} /> Chiama
                                </button>
                                <button onClick={handleWhatsApp} className="btn bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                                    <MessageSquare size={18} /> WhatsApp
                                </button>
                                <button onClick={handleDelete} className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
                                    <Trash2 size={18} /> Elimina
                                </button>
                            </>
                        )}
                    </div>
                </div>
                
                {/* KPI CLIENTE (solo per clienti esistenti) */}
                {!isNewClient && (
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText size={20} className="text-blue-600" />
                                <span className="text-sm text-gray-600">Contratti Attivi</span>
                            </div>
                            <div className="text-2xl font-bold text-blue-600">{contratti.length}</div>
                        </div>
                        
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Mail size={20} className="text-green-600" />
                                <span className="text-sm text-gray-600">Email Inviate</span>
                            </div>
                            <div className="text-2xl font-bold text-green-600">{emailStorico.length}</div>
                        </div>
                        
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={20} className="text-purple-600" />
                                <span className="text-sm text-gray-600">Ultimo Contatto</span>
                            </div>
                            <div className="text-sm font-semibold text-purple-600">
                                {cliente.data_ultimo_contatto ? new Date(cliente.data_ultimo_contatto).toLocaleDateString('it-IT') : 'Mai'}
                            </div>
                        </div>
                        
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={20} className="text-orange-600" />
                                <span className="text-sm text-gray-600">Valore Cliente</span>
                            </div>
                            <div className="text-2xl font-bold text-orange-600">€0</div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* TABS - UI MODERNA */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-1">
                    <div className="flex space-x-2">
                        {                        [
                            { key: 'dati', label: 'Dati Cliente', icon: User },
                            { key: 'contratti', label: 'Contratti', icon: FileText },
                            { key: 'documenti', label: 'Documenti', icon: FileCheck },
                            { key: 'email', label: 'Email', icon: Mail },
                            { key: 'note', label: 'Note', icon: FileText },
                            { key: 'storico', label: 'Storico', icon: History }
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as TabType)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-t-lg font-semibold transition-all transform ${
                                        isActive
                                            ? 'bg-white text-blue-600 shadow-lg -mb-px scale-105'
                                            : 'bg-transparent text-white hover:bg-white/10'
                                    }`}
                                >
                                    <Icon size={20} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                <div className="p-6">
                    {/* TAB DATI CLIENTE */}
                    {activeTab === 'dati' && (
                        <div className="space-y-6">
                            {editing ? (
                                <div className="grid grid-cols-2 gap-6">
                                    {cliente.tipo === 'privato' ? (
                                        <>
                                            {/* DATI ANAGRAFICI */}
                                            <div className="col-span-2"><h3 className="text-lg font-bold text-gray-800 border-b pb-2">Dati Anagrafici</h3></div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                                                <input
                                                    type="text"
                                                    value={formData.nome || ''}
                                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. Mario"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Cognome *</label>
                                                <input
                                                    type="text"
                                                    value={formData.cognome || ''}
                                                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. Rossi"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Codice Fiscale</label>
                                                <input
                                                    type="text"
                                                    value={formData.codice_fiscale || ''}
                                                    onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value.toUpperCase() })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    maxLength={16}
                                                    placeholder="es. RSSMRA80A01H501Z"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Data di Nascita</label>
                                                <input
                                                    type="date"
                                                    value={formData.data_nascita || ''}
                                                    onChange={(e) => setFormData({ ...formData, data_nascita: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Luogo di Nascita</label>
                                                <input
                                                    type="text"
                                                    value={formData.luogo_nascita || ''}
                                                    onChange={(e) => setFormData({ ...formData, luogo_nascita: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. Roma, Milano, Napoli"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Provincia di Nascita</label>
                                                <input
                                                    type="text"
                                                    value={formData.provincia_nascita || ''}
                                                    onChange={(e) => setFormData({ ...formData, provincia_nascita: e.target.value.toUpperCase() })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    maxLength={2}
                                                    placeholder="es. RM, MI, NA"
                                                />
                                            </div>
                                            
                                            {/* CONTATTI */}
                                            <div className="col-span-2 mt-4"><h3 className="text-lg font-bold text-gray-800 border-b pb-2">Contatti</h3></div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Principale *</label>
                                                <input
                                                    type="email"
                                                    value={formData.email_principale || ''}
                                                    onChange={(e) => setFormData({ ...formData, email_principale: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. mario.rossi@email.it"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Secondaria</label>
                                                <input
                                                    type="email"
                                                    value={formData.email_secondaria || ''}
                                                    onChange={(e) => setFormData({ ...formData, email_secondaria: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. mario.rossi.2@gmail.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Telefono Mobile</label>
                                                <input
                                                    type="tel"
                                                    value={formData.telefono_mobile || ''}
                                                    onChange={(e) => setFormData({ ...formData, telefono_mobile: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. 333 1234567"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Telefono Fisso</label>
                                                <input
                                                    type="tel"
                                                    value={formData.telefono_fisso || ''}
                                                    onChange={(e) => setFormData({ ...formData, telefono_fisso: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. 06 12345678"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Codice Cliente</label>
                                                <input
                                                    type="text"
                                                    value={formData.codice_cliente || ''}
                                                    onChange={(e) => setFormData({ ...formData, codice_cliente: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Auto-generato se vuoto"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">PEC</label>
                                                <input
                                                    type="email"
                                                    value={formData.pec || ''}
                                                    onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
                                                <input
                                                    type="text"
                                                    value={formData.iban || ''}
                                                    onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    maxLength={27}
                                                    placeholder="IT..."
                                                />
                                            </div>
                                            
                                            {/* DOCUMENTO IDENTITÀ */}
                                            <div className="col-span-2 mt-4"><h3 className="text-lg font-bold text-gray-800 border-b pb-2">Documento Identità</h3></div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Documento</label>
                                                <select
                                                    value={formData.tipo_documento || ''}
                                                    onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Seleziona...</option>
                                                    <option value="Carta Identità">Carta Identità</option>
                                                    <option value="Patente">Patente</option>
                                                    <option value="Passaporto">Passaporto</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Numero Documento</label>
                                                <input
                                                    type="text"
                                                    value={formData.numero_documento || ''}
                                                    onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value.toUpperCase() })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Ente Rilascio</label>
                                                <input
                                                    type="text"
                                                    value={formData.ente_rilascio || ''}
                                                    onChange={(e) => setFormData({ ...formData, ente_rilascio: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Comune di..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Data Scadenza</label>
                                                <input
                                                    type="date"
                                                    value={formData.data_scadenza_documento || ''}
                                                    onChange={(e) => setFormData({ ...formData, data_scadenza_documento: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            
                                            {/* RESIDENZA */}
                                            <div className="col-span-2 mt-4"><h3 className="text-lg font-bold text-gray-800 border-b pb-2">Residenza</h3></div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Via</label>
                                                <input
                                                    type="text"
                                                    value={formData.via_residenza || ''}
                                                    onChange={(e) => setFormData({ ...formData, via_residenza: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. Via Roma"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Numero Civico</label>
                                                <input
                                                    type="text"
                                                    value={formData.civico_residenza || ''}
                                                    onChange={(e) => setFormData({ ...formData, civico_residenza: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. 123"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Città</label>
                                                <input
                                                    type="text"
                                                    value={formData.citta_residenza || ''}
                                                    onChange={(e) => setFormData({ ...formData, citta_residenza: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. Roma"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">CAP</label>
                                                <input
                                                    type="text"
                                                    value={formData.cap_residenza || ''}
                                                    onChange={(e) => setFormData({ ...formData, cap_residenza: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    maxLength={5}
                                                    placeholder="es. 00100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Provincia</label>
                                                <input
                                                    type="text"
                                                    value={formData.provincia_residenza || ''}
                                                    onChange={(e) => setFormData({ ...formData, provincia_residenza: e.target.value.toUpperCase() })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    maxLength={2}
                                                    placeholder="es. RM"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Nazione</label>
                                                <input
                                                    type="text"
                                                    value={formData.nazione || 'Italia'}
                                                    onChange={(e) => setFormData({ ...formData, nazione: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            
                                            {/* CONSENSI E NOTE */}
                                            <div className="col-span-2 mt-4"><h3 className="text-lg font-bold text-gray-800 border-b pb-2">Consensi e Note</h3></div>
                                            <div className="col-span-2">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.consenso_marketing === 1}
                                                        onChange={(e) => setFormData({ ...formData, consenso_marketing: e.target.checked ? 1 : 0 })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">Consenso Marketing</span>
                                                </label>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.news_letter === 1}
                                                        onChange={(e) => setFormData({ ...formData, news_letter: e.target.checked ? 1 : 0 })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">Newsletter</span>
                                                </label>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Utente Acquisizione</label>
                                                <input
                                                    type="text"
                                                    value={formData.utente_acquisizione || ''}
                                                    onChange={(e) => setFormData({ ...formData, utente_acquisizione: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. ATESSA PEP, PESCARA PEP, Mario Rossi"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                                                <textarea
                                                    value={formData.note || ''}
                                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    rows={4}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* DATI AZIENDA */}
                                            <div className="col-span-2"><h3 className="text-lg font-bold text-gray-800 border-b pb-2">Dati Azienda</h3></div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Ragione Sociale *</label>
                                                <input
                                                    type="text"
                                                    value={formData.ragione_sociale || ''}
                                                    onChange={(e) => setFormData({ ...formData, ragione_sociale: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Partita IVA *</label>
                                                <input
                                                    type="text"
                                                    value={formData.partita_iva || ''}
                                                    onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    maxLength={11}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Codice Fiscale</label>
                                                <input
                                                    type="text"
                                                    value={formData.codice_fiscale || ''}
                                                    onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value.toUpperCase() })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    maxLength={16}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">PEC</label>
                                                <input
                                                    type="email"
                                                    value={formData.pec || ''}
                                                    onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Codice SDI</label>
                                                <input
                                                    type="text"
                                                    value={formData.codice_sdi || ''}
                                                    onChange={(e) => setFormData({ ...formData, codice_sdi: e.target.value.toUpperCase() })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    maxLength={7}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Codice ATECO</label>
                                                <input
                                                    type="text"
                                                    value={formData.codice_ateco || ''}
                                                    onChange={(e) => setFormData({ ...formData, codice_ateco: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. 47.91.10"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Codice Cliente</label>
                                                <input
                                                    type="text"
                                                    value={formData.codice_cliente || ''}
                                                    onChange={(e) => setFormData({ ...formData, codice_cliente: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Auto-generato se vuoto"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
                                                <input
                                                    type="text"
                                                    value={formData.iban || ''}
                                                    onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    maxLength={27}
                                                    placeholder="IT..."
                                                />
                                            </div>
                                            
                                            {/* SEDE LEGALE */}
                                            <div className="col-span-2 mt-4"><h3 className="text-lg font-bold text-gray-800 border-b pb-2">Sede Legale</h3></div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Via</label>
                                                <input
                                                    type="text"
                                                    value={formData.via_sede_legale || ''}
                                                    onChange={(e) => setFormData({ ...formData, via_sede_legale: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. Via Garibaldi"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Numero Civico</label>
                                                <input
                                                    type="text"
                                                    value={formData.civico_sede_legale || ''}
                                                    onChange={(e) => setFormData({ ...formData, civico_sede_legale: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. 45"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Città</label>
                                                <input
                                                    type="text"
                                                    value={formData.citta_sede_legale || ''}
                                                    onChange={(e) => setFormData({ ...formData, citta_sede_legale: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. Milano"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">CAP</label>
                                                <input
                                                    type="text"
                                                    value={formData.cap_sede_legale || ''}
                                                    onChange={(e) => setFormData({ ...formData, cap_sede_legale: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    maxLength={5}
                                                    placeholder="es. 20100"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Provincia</label>
                                                <input
                                                    type="text"
                                                    value={formData.provincia_sede_legale || ''}
                                                    onChange={(e) => setFormData({ ...formData, provincia_sede_legale: e.target.value.toUpperCase() })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    maxLength={2}
                                                    placeholder="es. MI"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Nazione</label>
                                                <input
                                                    type="text"
                                                    value={formData.nazione || 'Italia'}
                                                    onChange={(e) => setFormData({ ...formData, nazione: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            
                                            {/* REFERENTE */}
                                            <div className="col-span-2 mt-4"><h3 className="text-lg font-bold text-gray-800 border-b pb-2">Dati Referente</h3></div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Referente</label>
                                                <input
                                                    type="text"
                                                    value={formData.nome_referente || ''}
                                                    onChange={(e) => setFormData({ ...formData, nome_referente: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Cognome Referente</label>
                                                <input
                                                    type="text"
                                                    value={formData.cognome_referente || ''}
                                                    onChange={(e) => setFormData({ ...formData, cognome_referente: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Referente *</label>
                                                <input
                                                    type="email"
                                                    value={formData.email_referente || ''}
                                                    onChange={(e) => setFormData({ ...formData, email_referente: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Telefono Referente</label>
                                                <input
                                                    type="tel"
                                                    value={formData.telefono_referente || ''}
                                                    onChange={(e) => setFormData({ ...formData, telefono_referente: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            
                                            {/* CONSENSI E NOTE */}
                                            <div className="col-span-2 mt-4"><h3 className="text-lg font-bold text-gray-800 border-b pb-2">Consensi e Note</h3></div>
                                            <div className="col-span-2">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.consenso_marketing === 1}
                                                        onChange={(e) => setFormData({ ...formData, consenso_marketing: e.target.checked ? 1 : 0 })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">Consenso Marketing</span>
                                                </label>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.news_letter === 1}
                                                        onChange={(e) => setFormData({ ...formData, news_letter: e.target.checked ? 1 : 0 })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">Newsletter</span>
                                                </label>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Utente Acquisizione</label>
                                                <input
                                                    type="text"
                                                    value={formData.utente_acquisizione || ''}
                                                    onChange={(e) => setFormData({ ...formData, utente_acquisizione: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder="es. ATESSA PEP, PESCARA PEP, Mario Rossi"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                                                <textarea
                                                    value={formData.note || ''}
                                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    rows={4}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">Informazioni Generali</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        {cliente.tipo === 'privato' ? (
                                            <>
                                                <InfoField label="Nome Completo" value={`${cliente.nome} ${cliente.cognome}`} />
                                                <InfoField label="Codice Fiscale" value={cliente.codice_fiscale} />
                                                <InfoField label="Data di Nascita" value={cliente.data_nascita} />
                                                <InfoField label="Email Principale" value={cliente.email_principale} />
                                                <InfoField label="Email Secondaria" value={cliente.email_secondaria} />
                                                <InfoField label="Telefono Mobile" value={cliente.telefono_mobile} />
                                                <InfoField label="Telefono Fisso" value={cliente.telefono_fisso} />
                                                <InfoField label="PEC" value={cliente.pec} />
                                            </>
                                        ) : (
                                            <>
                                                <InfoField label="Ragione Sociale" value={cliente.ragione_sociale} />
                                                <InfoField label="Partita IVA" value={cliente.partita_iva} />
                                                <InfoField label="Codice Fiscale" value={cliente.codice_fiscale} />
                                                <InfoField label="Codice ATECO" value={cliente.codice_ateco} />
                                                <InfoField label="PEC Aziendale" value={cliente.pec_aziendale} />
                                                <InfoField label="Codice SDI" value={cliente.codice_sdi} />
                                                <InfoField label="Nome Referente" value={`${cliente.nome_referente} ${cliente.cognome_referente}`} />
                                                <InfoField label="Email Referente" value={cliente.email_referente} />
                                                <InfoField label="Telefono Referente" value={cliente.telefono_referente} />
                                                <InfoField label="Ruolo Referente" value={cliente.ruolo_referente} />
                                            </>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">
                                        {cliente.tipo === 'privato' ? 'Residenza' : 'Sede Legale'}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        {cliente.tipo === 'privato' ? (
                                            <>
                                                <InfoField label="Via Residenza" value={cliente.via_residenza} />
                                                <InfoField label="Numero Civico" value={cliente.civico_residenza} />
                                                <InfoField label="Città" value={cliente.citta_residenza} />
                                                <InfoField label="CAP" value={cliente.cap_residenza} />
                                                <InfoField label="Provincia" value={cliente.provincia_residenza} />
                                                <InfoField label="Nazione" value={cliente.nazione} />
                                            </>
                                        ) : (
                                            <>
                                                <InfoField label="Via Sede Legale" value={cliente.via_sede_legale} />
                                                <InfoField label="Numero Civico" value={cliente.civico_sede_legale} />
                                                <InfoField label="Città" value={cliente.citta_sede_legale} />
                                                <InfoField label="CAP" value={cliente.cap_sede_legale} />
                                                <InfoField label="Provincia" value={cliente.provincia_sede_legale} />
                                                <InfoField label="Nazione" value={cliente.nazione} />
                                            </>
                                        )}
                                    </div>
                                    
                                    {cliente.tipo === 'privato' && (
                                        <>
                                            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">Indirizzo Fornitura</h3>
                                            <div className="grid grid-cols-2 gap-6">
                                                <InfoField label="Via Fornitura" value={cliente.via_fornitura} />
                                                <InfoField label="Numero Civico" value={cliente.civico_fornitura} />
                                                <InfoField label="Città" value={cliente.citta_fornitura} />
                                                <InfoField label="CAP" value={cliente.cap_fornitura} />
                                                <InfoField label="Provincia" value={cliente.provincia_fornitura} />
                                            </div>
                                        </>
                                    )}
                                    
                                    {cliente.tipo === 'privato' && (
                                        <>
                                            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">Documento Identità</h3>
                                            <div className="grid grid-cols-2 gap-6">
                                                <InfoField label="Tipo Documento" value={cliente.tipo_documento} />
                                                <InfoField label="Numero Documento" value={cliente.numero_documento} />
                                                <InfoField label="Ente Rilascio" value={cliente.ente_rilascio} />
                                                <InfoField label="Data Scadenza" value={cliente.data_scadenza_documento} />
                                            </div>
                                        </>
                                    )}
                                    
                                    <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">Dati Bancari e Contatto</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <InfoField label="IBAN" value={cliente.iban} />
                                        <InfoField label="Codice Cliente" value={cliente.codice_cliente} />
                                        <InfoField label="Consenso Marketing" value={cliente.consenso_marketing ? 'Sì' : 'No'} />
                                        <InfoField label="Newsletter" value={cliente.news_letter ? 'Sì' : 'No'} />
                                        <InfoField label="Utente Acquisizione" value={cliente.utente_acquisizione} />
                                    </div>
                                    
                                    {cliente.note && (
                                        <>
                                            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">Note</h3>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <p className="text-gray-700 whitespace-pre-wrap">{cliente.note}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* TAB CONTRATTI */}
                    {activeTab === 'contratti' && (
                        <div className="space-y-6">
                            {isNewClient ? (
                                <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                                    <Zap size={64} className="mx-auto mb-4 text-blue-500 animate-pulse" />
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Prima salva il cliente!</h3>
                                    <p className="text-gray-600 mb-4 max-w-md mx-auto">
                                        Per aggiungere contratti Luce e Gas, devi prima completare e salvare i dati del cliente.
                                    </p>
                                    <div className="bg-white rounded-lg p-4 max-w-md mx-auto text-left mt-6">
                                        <p className="text-sm font-semibold text-gray-700 mb-2">📋 Campi contratto disponibili:</p>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            <li>• <strong>POD/PDR</strong> - Identificativo fornitura</li>
                                            <li>• <strong>Fornitore</strong> - Nome fornitore</li>
                                            <li>• <strong>Commodity</strong> - Tipo (Power/Gas)</li>
                                            <li>• <strong>Procedure</strong> - Switch, Voltura, Subentro, ecc.</li>
                                            <li>• <strong>Date</strong> - Stipula, Attivazione, Scadenza</li>
                                            <li>• <strong>Stato</strong> - Stato del contratto</li>
                                            <li>• <strong>Offerta</strong> - Nome, tipo, validità</li>
                                            <li>• <strong>Agente</strong> - Agente responsabile</li>
                                        </ul>
                                    </div>
                                    <button 
                                        onClick={() => setActiveTab('dati')}
                                        className="mt-6 btn bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2"
                                    >
                                        <ArrowLeft size={18} /> Torna ai Dati Cliente
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold text-gray-800">Contratti del Cliente</h2>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setShowCreateContrattoModal(true)}
                                                className={`btn text-white flex items-center gap-2 ${
                                                    contratti.length > 0
                                                        ? 'bg-green-600 hover:bg-green-700'
                                                        : 'bg-blue-600 hover:bg-blue-700'
                                                }`}
                                            >
                                                <Plus size={18} /> {contratti.length > 0 ? 'Aggiungi altra fornitura' : 'Nuovo Contratto'}
                                            </button>
                                            <span className="text-xs text-gray-500">
                                                Stessa azione: l’etichetta cambia in base ai contratti presenti
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                            
                            {!isNewClient && (
                                <>
                            
                            {loadingContratti ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                                </div>
                            ) : contratti.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <FileText size={64} className="mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-xl font-bold text-gray-700 mb-2">Nessun Contratto</h3>
                                    <p className="text-gray-500 mb-4">Questo cliente non ha ancora contratti</p>
                                    <button 
                                        onClick={() => setShowCreateContrattoModal(true)}
                                        className="btn bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2"
                                    >
                                        <Plus size={18} /> Aggiungi Primo Contratto
                                    </button>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {contratti.map((contratto) => {
                                        const giorniScadenza = Math.floor((new Date(contratto.data_scadenza).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                        const isScaduto = giorniScadenza < 0;
                                        const isInScadenza = giorniScadenza <= 30 && giorniScadenza >= 0;
                                        
                                        return (
                                            <div 
                                                key={contratto.id}
                                                className={`bg-white border-2 rounded-xl p-6 shadow-md hover:shadow-xl transition-all ${
                                                    isScaduto ? 'border-red-300 bg-red-50' : 
                                                    isInScadenza ? 'border-orange-300 bg-orange-50' : 
                                                    'border-green-300 hover:border-blue-400'
                                                }`}
                                            >
                                                {/* Header contratto */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        {contratto.tipo_contratto === 'luce' ? (
                                                            <div className="p-3 bg-yellow-500 rounded-lg">
                                                                <Zap size={24} className="text-white" />
                                                            </div>
                                                        ) : (
                                                            <div className="p-3 bg-blue-500 rounded-lg">
                                                                <Flame size={24} className="text-white" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h3 className="text-lg font-bold text-gray-900">
                                                                {contratto.tipo_contratto === 'luce' ? 'LUCE' : 'GAS'}
                                                            </h3>
                                                            <p className="text-sm text-gray-600">{contratto.numero_contratto || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Badge stato */}
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        contratto.stato === 'attivo' || contratto.stato === 'da_attivare' || contratto.stato === 'chiusa' ? 'bg-green-500 text-white' :
                                                        contratto.stato === 'documenti_da_validare' ? 'bg-orange-500 text-white' :
                                                        contratto.stato === 'in_compilazione' ? 'bg-blue-500 text-white' :
                                                        contratto.stato === 'documenti_da_correggere' || contratto.stato === 'precheck_ko' || contratto.stato === 'credit_check_ko' ? 'bg-red-500 text-white' :
                                                        contratto.stato === 'sospeso' ? 'bg-yellow-500 text-white' :
                                                        'bg-gray-500 text-white'
                                                    }`}>
                                                        {contratto.stato?.toUpperCase().replace(/_/g, ' ') || 'N/A'}
                                                    </span>
                                                </div>
                                                
                                                    {/* Dettagli contratto - INFORMAZIONI ESSENZIALI */}
                                                    <div className="space-y-3 mb-4">
                                                        {/* POD/PDR */}
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                            <span className="text-sm font-semibold text-gray-600">
                                                                {contratto.tipo_contratto === 'luce' ? 'POD' : 'PDR'}:
                                                            </span>
                                                            <InlineEditable
                                                              value={contratto.tipo_contratto === 'luce' ? contratto.pod : contratto.pdr}
                                                              placeholder={contratto.tipo_contratto === 'luce' ? 'Inserisci POD' : 'Inserisci PDR'}
                                                              className="text-sm font-mono font-bold text-gray-900"
                                                              onSave={async (val) => {
                                                                try {
                                                                  const payload = contratto.tipo_contratto === 'luce' ? { pod: val } : { pdr: val };
                                                                  await contrattiAPI.update(contratto.tipo_contratto, String(contratto.id), payload);
                                                                  toast.success('Punto di fornitura aggiornato');
                                                                  if (contratto.tipo_contratto === 'luce') contratto.pod = val; else contratto.pdr = val;
                                                                } catch (err: any) {
                                                                  toast.error(err?.response?.data?.message || 'Errore aggiornamento POD/PDR');
                                                                  throw err;
                                                                }
                                                              }}
                                                            />
                                                        </div>
                                                        
                                                        {/* Fornitore */}
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                            <span className="text-sm font-semibold text-gray-600">Fornitore:</span>
                                                            <InlineEditable
                                                              value={contratto.fornitore || ''}
                                                              placeholder="Inserisci fornitore"
                                                              className="text-sm font-bold text-gray-900"
                                                              onSave={async (val) => {
                                                                try {
                                                                  await contrattiAPI.update(contratto.tipo_contratto, String(contratto.id), { fornitore: val });
                                                                  toast.success('Fornitore aggiornato');
                                                                  contratto.fornitore = val;
                                                                } catch (err: any) {
                                                                  toast.error(err?.response?.data?.message || 'Errore aggiornamento fornitore');
                                                                  throw err;
                                                                }
                                                              }}
                                                            />
                                                        </div>
                                                    
                                                    {/* Prezzo */}
                                                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                        <span className="text-sm font-semibold text-gray-600">Prezzo:</span>
                                                        <span className="text-sm font-bold text-green-600">
                                                            {contratto.tipo_contratto === 'luce' 
                                                                ? `€${contratto.prezzo_energia || 'N/A'}/kWh`
                                                                : `€${contratto.prezzo_gas || 'N/A'}/Smc`
                                                            }
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Commodity */}
                                                    {contratto.commodity && (
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                            <span className="text-sm font-semibold text-gray-600">Commodity:</span>
                                                            <span className="text-sm text-gray-900">{contratto.commodity}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Procedura Attuale (inline editable) */}
                                                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                        <span className="text-sm font-semibold text-gray-600">Procedura Attuale:</span>
                                                        <InlineEditable
                                                          value={contratto.procedure || ''}
                                                          placeholder="Specifica procedura"
                                                          className="text-sm font-bold text-gray-900"
                                                          onSave={async (val) => {
                                                            try {
                                                              await contrattiAPI.update(contratto.tipo_contratto, String(contratto.id), { procedure: val });
                                                              toast.success('Procedura aggiornata');
                                                              contratto.procedure = val;
                                                            } catch (err: any) {
                                                              toast.error(err?.response?.data?.message || 'Errore aggiornamento procedura');
                                                              throw err;
                                                            }
                                                          }}
                                                        />
                                                    </div>

                                                    {/* Stato (inline editable) */}
                                                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                        <span className="text-sm font-semibold text-gray-600">Stato:</span>
                                                        <InlineEditable
                                                          value={contratto.stato || ''}
                                                          placeholder="Imposta stato"
                                                          className="text-sm font-bold text-gray-900"
                                                          onSave={async (val) => {
                                                            try {
                                                              const normalized = val.trim().toLowerCase().replace(/\s+/g, '_');
                                                              await contrattiAPI.update(contratto.tipo_contratto, String(contratto.id), { stato: normalized });
                                                              toast.success('Stato contratto aggiornato');
                                                              contratto.stato = normalized;
                                                            } catch (err: any) {
                                                              toast.error(err?.response?.data?.message || 'Errore aggiornamento stato');
                                                              throw err;
                                                            }
                                                          }}
                                                        />
                                                    </div>
                                                    
                                                    {/* PDP */}
                                                    {contratto.pdp && (
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                            <span className="text-sm font-semibold text-gray-600">PDP:</span>
                                                            <span className="text-sm font-mono text-gray-900">{contratto.pdp}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Date */}
                                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                                        {contratto.data_stipula && (
                                                            <div>
                                                                <p className="text-xs text-gray-500">Stipula</p>
                                                                <p className="text-sm font-semibold text-gray-900">
                                                                    {new Date(contratto.data_stipula).toLocaleDateString('it-IT')}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {contratto.data_attivazione && (
                                                            <div>
                                                                <p className="text-xs text-gray-500">Attivazione</p>
                                                                <p className="text-sm font-semibold text-gray-900">
                                                                    {new Date(contratto.data_attivazione).toLocaleDateString('it-IT')}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Scadenza */}
                                                    <div className={`p-3 rounded-lg ${
                                                        isScaduto ? 'bg-red-100' : 
                                                        isInScadenza ? 'bg-orange-100' : 
                                                        'bg-green-100'
                                                    }`}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-semibold text-gray-700">Scadenza:</span>
                                                            <div className="text-right">
                                                                <p className="text-sm font-bold text-gray-900">
                                                                    {new Date(contratto.data_scadenza).toLocaleDateString('it-IT')}
                                                                </p>
                                                                <p className={`text-xs font-semibold ${
                                                                    isScaduto ? 'text-red-600' : 
                                                                    isInScadenza ? 'text-orange-600' : 
                                                                    'text-green-600'
                                                                }`}>
                                                                    {isScaduto ? `Scaduto da ${Math.abs(giorniScadenza)} giorni` : 
                                                                     `${giorniScadenza} giorni rimanenti`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Agente/Utente acquisizione */}
                                                    {(contratto.agente || contratto.utente_acquisizione) && (
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                            <span className="text-sm font-semibold text-gray-600">Agente:</span>
                                                            <span className="text-sm text-gray-900">
                                                                {contratto.agente || contratto.utente_acquisizione || 'N/A'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Offerta */}
                                                    {(contratto.nome_offerta || contratto.offerta) && (
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                            <span className="text-sm font-semibold text-gray-600">Offerta:</span>
                                                            <span className="text-sm text-gray-900">{contratto.nome_offerta || contratto.offerta}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Tipo Offerta */}
                                                    {contratto.tipo_offerta && (
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                            <span className="text-sm font-semibold text-gray-600">Tipo Offerta:</span>
                                                            <span className="text-sm text-gray-900">{contratto.tipo_offerta}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Validità Offerta */}
                                                    {contratto.validita_offerta && (
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                            <span className="text-sm font-semibold text-gray-600">Validità Offerta:</span>
                                                            <span className="text-sm text-gray-900">{contratto.validita_offerta}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Stato Contratto */}
                                                    {contratto.stato && (
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                            <span className="text-sm font-semibold text-gray-600">Stato:</span>
                                                            <span className={`text-sm font-bold ${
                                                                contratto.stato === 'attivo' || contratto.stato === 'da_attivare' || contratto.stato === 'chiusa' ? 'text-green-600' :
                                                                contratto.stato === 'documenti_da_validare' ? 'text-orange-600' :
                                                                contratto.stato === 'in_compilazione' ? 'text-blue-600' :
                                                                contratto.stato === 'documenti_da_correggere' || contratto.stato === 'precheck_ko' || contratto.stato === 'credit_check_ko' ? 'text-red-600' :
                                                                contratto.stato === 'sospeso' ? 'text-yellow-600' :
                                                                'text-gray-600'
                                                            }`}>
                                                                {contratto.stato.toUpperCase().replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Data Creazione */}
                                                    {contratto.data_creazione && (
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                            <span className="text-sm font-semibold text-gray-600">Data Creazione:</span>
                                                            <span className="text-sm text-gray-900">
                                                                {new Date(contratto.data_creazione).toLocaleDateString('it-IT')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Codice Cliente */}
                                                    {contratto.codice_cliente && (
                                                        <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                                            <span className="text-sm font-semibold text-gray-600">Codice Cliente:</span>
                                                            <span className="text-sm font-mono font-bold text-indigo-600">{contratto.codice_cliente}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Note */}
                                                    {contratto.note && (
                                                        <div className="pt-2">
                                                            <p className="text-xs text-gray-500 mb-1">Note:</p>
                                                            <p className="text-sm text-gray-700 italic">{contratto.note}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Azioni rapide */}
                                                <div className="flex gap-2 pt-4 border-t border-gray-200">
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedContratto(contratto);
                                                            setShowEditContrattoModal(true);
                                                        }}
                                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                                                    >
                                                        <Edit size={16} /> Modifica
                                                    </button>
                                                    <button 
                                                        onClick={() => toast('Invio email in arrivo!')}
                                                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                                                    >
                                                        <Mail size={16} /> Email
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            </>
                            )}
                        </div>
                    )}
                    
                    {/* TAB DOCUMENTI */}
                    {activeTab === 'documenti' && (
                        <>
                            {isNewClient ? (
                                <div className="text-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                                    <FileCheck size={64} className="mx-auto mb-4 text-green-500" />
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Prima salva il cliente!</h3>
                                    <p className="text-gray-600 mb-4">
                                        I documenti possono essere caricati dopo aver salvato il cliente.
                                    </p>
                                    <button 
                                        onClick={() => setActiveTab('dati')}
                                        className="mt-4 btn bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-2"
                                    >
                                        <ArrowLeft size={18} /> Torna ai Dati Cliente
                                    </button>
                                </div>
                            ) : (
                                <ClienteDocumenti 
                                    clienteId={id!} 
                                    clienteTipo={cliente.tipo as 'privato' | 'azienda'} 
                                />
                            )}
                        </>
                    )}
                    
                    {/* TAB EMAIL */}
                    {activeTab === 'email' && (
                        <div className="space-y-6">
                            {isNewClient ? (
                                <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                                    <Mail size={64} className="mx-auto mb-4 text-purple-500" />
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Prima salva il cliente!</h3>
                                    <p className="text-gray-600 mb-4">
                                        Le email possono essere inviate dopo aver salvato il cliente.
                                    </p>
                                    <button 
                                        onClick={() => setActiveTab('dati')}
                                        className="mt-4 btn bg-purple-600 hover:bg-purple-700 text-white inline-flex items-center gap-2"
                                    >
                                        <ArrowLeft size={18} /> Torna ai Dati Cliente
                                    </button>
                                </div>
                            ) : (
                                <>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Storico Email</h2>
                                <button onClick={() => setShowEmailModal(true)} className="btn bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                                    <Mail size={18} /> Invia Email
                                </button>
                            </div>
                            
                            {/* TIMELINE EMAIL */}
                            {loadingEmail ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">Caricamento email...</p>
                                </div>
                            ) : emailStorico.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <Mail size={64} className="mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-xl font-bold text-gray-700 mb-2">Nessuna Email Inviata</h3>
                                    <p className="text-gray-500 mb-4">Lo storico delle email inviate apparirà qui</p>
                                    <p className="text-sm text-gray-400">Email inviate tramite campagne o singolarmente</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {emailStorico.map((email: any) => {
                                        const tipoIcon: Record<string, string> = {
                                            'benvenuto': '🎉',
                                            'reminder': '💡',
                                            'riepilogo': '📊',
                                            'manuale': '✉️',
                                            'campagna': '📧'
                                        };
                                        const iconToShow = tipoIcon[email.tipo as string] || '📬';
                                        
                                        return (
                                            <div key={email.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-start gap-3 flex-1">
                                                        <span className="text-3xl">{iconToShow}</span>
                                                        <div className="flex-1">
                                                            <h3 className="text-lg font-bold text-gray-900 mb-1">{email.oggetto}</h3>
                                                            <p className="text-sm text-gray-600">
                                                                A: <span className="font-semibold">{email.destinatario}</span>
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Da: {email.mittente_nome || 'Sistema'} • {new Date(email.data_invio).toLocaleDateString('it-IT', { 
                                                                    day: 'numeric', 
                                                                    month: 'long', 
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        email.stato === 'inviata' ? 'bg-green-100 text-green-700' :
                                                        email.stato === 'errore' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {email.stato?.toUpperCase()}
                                                    </span>
                                                </div>
                                                
                                                <div className="bg-gray-50 rounded-lg p-4 mt-3">
                                                    <p className="text-sm text-gray-700 whitespace-pre-line">{email.corpo}</p>
                                                </div>
                                                
                                                {email.errore && (
                                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                        <p className="text-sm text-red-700">
                                                            <span className="font-semibold">Errore:</span> {email.errore}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                                </>
                            )}
                        </div>
                    )}
                    
                    {/* TAB NOTE */}
                    {activeTab === 'note' && (
                        <>
                            {isNewClient ? (
                                <div className="text-center py-12 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
                                    <MessageSquare size={64} className="mx-auto mb-4 text-yellow-500" />
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Prima salva il cliente!</h3>
                                    <p className="text-gray-600 mb-4">
                                        Le note possono essere aggiunte dopo aver salvato il cliente.
                                    </p>
                                    <button 
                                        onClick={() => setActiveTab('dati')}
                                        className="mt-4 btn bg-yellow-600 hover:bg-yellow-700 text-white inline-flex items-center gap-2"
                                    >
                                        <ArrowLeft size={18} /> Torna ai Dati Cliente
                                    </button>
                                </div>
                            ) : (
                                <ClienteNoteTimeline 
                                    clienteId={id!} 
                                    clienteTipo={cliente.tipo as 'privato' | 'azienda'} 
                                />
                            )}
                        </>
                    )}
                    
                    {/* TAB STORICO */}
                    {activeTab === 'storico' && (
                        <div className="space-y-6">
                            {isNewClient ? (
                                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border-2 border-gray-200">
                                    <History size={64} className="mx-auto mb-4 text-gray-500" />
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Prima salva il cliente!</h3>
                                    <p className="text-gray-600 mb-4">
                                        Lo storico attività sarà disponibile dopo aver salvato il cliente.
                                    </p>
                                    <button 
                                        onClick={() => setActiveTab('dati')}
                                        className="mt-4 btn bg-gray-600 hover:bg-gray-700 text-white inline-flex items-center gap-2"
                                    >
                                        <ArrowLeft size={18} /> Torna ai Dati Cliente
                                    </button>
                                </div>
                            ) : (
                                <>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">Storico Attività</h2>
                                <div className="flex gap-2">
                                    <select 
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={filtroAttivita}
                                        onChange={(e) => setFiltroAttivita(e.target.value)}
                                    >
                                        <option value="tutte">Tutte le attività</option>
                                        <option value="cliente_creato">Creazione</option>
                                        <option value="cliente_modificato">Modifiche</option>
                                        <option value="agente_assegnato">Assegnazioni</option>
                                        <option value="contratto_creato">Contratti</option>
                                        <option value="email_inviata">Email</option>
                                        <option value="documento_caricato">Documenti</option>
                                        <option value="nota_aggiunta">Note</option>
                                        <option value="stato_cambiato">Stato</option>
                                        <option value="commissione_generata">Commissioni</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* TIMELINE ATTIVITÀ */}
                            {loadingAttivita ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">Caricamento storico...</p>
                                </div>
                            ) : attivita.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <History size={64} className="mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-xl font-bold text-gray-700 mb-2">Nessuna Attività</h3>
                                    <p className="text-gray-500 mb-4">Lo storico delle interazioni con questo cliente apparirà qui</p>
                                    <p className="text-sm text-gray-400">Email, modifiche, note e altre attività</p>
                                </div>
                            ) : (
                                <div className="relative border-l-4 border-blue-200 pl-8 space-y-6">
                                    {attivita.map((att: any) => {
                                        const iconMap: { [key: string]: { icon: any; color: string; bg: string } } = {
                                            'cliente_creato': { icon: Plus, color: 'text-green-600', bg: 'bg-green-100' },
                                            'cliente_modificato': { icon: Edit, color: 'text-blue-600', bg: 'bg-blue-100' },
                                            'agente_assegnato': { icon: User, color: 'text-purple-600', bg: 'bg-purple-100' },
                                            'contratto_creato': { icon: FileCheck, color: 'text-indigo-600', bg: 'bg-indigo-100' },
                                            'contratto_modificato': { icon: Edit, color: 'text-purple-600', bg: 'bg-purple-100' },
                                            'email_inviata': { icon: Mail, color: 'text-cyan-600', bg: 'bg-cyan-100' },
                                            'documento_caricato': { icon: Upload, color: 'text-orange-600', bg: 'bg-orange-100' },
                                            'nota_aggiunta': { icon: MessageSquare, color: 'text-yellow-600', bg: 'bg-yellow-100' },
                                            'stato_cambiato': { icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-100' },
                                            'commissione_generata': { icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-100' }
                                        };
                                        
                                        const { icon: Icon, color, bg } = iconMap[att.tipo_azione] || { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-100' };
                                        
                                        return (
                                            <div key={att.id} className="relative">
                                                {/* Pallino timeline */}
                                                <div className={`absolute -left-[2.4rem] top-2 w-10 h-10 ${bg} rounded-full flex items-center justify-center border-4 border-white shadow-md`}>
                                                    <Icon size={20} className={color} />
                                                </div>
                                                
                                                {/* Card attività */}
                                                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <h3 className="text-base font-bold text-gray-900 mb-1">
                                                                {att.tipo_azione.replace(/_/g, ' ').toUpperCase()}
                                                            </h3>
                                                            <p className="text-sm text-gray-700">{att.descrizione}</p>
                                                        </div>
                                                        <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                                            {new Date(att.data_azione).toLocaleDateString('it-IT', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                    
                                                    {att.utente_nome_completo && (
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            <User size={12} className="inline mr-1" />
                                                            {att.utente_nome_completo}
                                                        </p>
                                                    )}
                                                    
                                                    {/* Mostra dati prima/dopo se disponibili */}
                                                    {(att.dati_prima || att.dati_dopo) && (
                                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                            {att.dati_prima && (
                                                                <div className="bg-red-50 p-2 rounded">
                                                                    <p className="font-semibold text-red-700 mb-1">Prima:</p>
                                                                    <pre className="text-red-600 whitespace-pre-wrap">{JSON.stringify(JSON.parse(att.dati_prima), null, 2)}</pre>
                                                                </div>
                                                            )}
                                                            {att.dati_dopo && (
                                                                <div className="bg-green-50 p-2 rounded">
                                                                    <p className="font-semibold text-green-700 mb-1">Dopo:</p>
                                                                    <pre className="text-green-600 whitespace-pre-wrap">{JSON.stringify(JSON.parse(att.dati_dopo), null, 2)}</pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* EMAIL MODAL */}
            {showEmailModal && cliente && (
                <EmailComposeModal
                    isOpen={showEmailModal}
                    onClose={() => setShowEmailModal(false)}
                    cliente={cliente}
                    onEmailSent={() => loadCliente()}
                />
            )}
            
            {/* Modal AI Import */}
            {showAIImportModal && (
                <AIImportModal
                    onClose={() => setShowAIImportModal(false)}
                    onDataExtracted={handleAIDataExtracted}
                    clientType={cliente?.tipo as 'privato' | 'azienda'}
                />
            )}
            
            {/* Modal Modifica Contratto */}
            {showEditContrattoModal && selectedContratto && cliente && (
                <EditContrattoModal
                    contratto={selectedContratto}
                    clienteId={id!}
                    clienteTipo={cliente.tipo as 'privato' | 'azienda'}
                    agenteAssegnato={cliente.assigned_agent_id}
                    commissionePattuita={cliente.commissione_pattuita}
                    onClose={() => {
                        setShowEditContrattoModal(false);
                        setSelectedContratto(null);
                    }}
                    onUpdate={() => {
                        loadCliente(); // Ricarica i dati del cliente (contatori in alto)
                        loadContratti(); // Ricarica la lista contratti
                        loadAttivita(); // Ricarica lo storico attività
                        setShowEditContrattoModal(false);
                        setSelectedContratto(null);
                    }}
                />
            )}

            {showCreateContrattoModal && cliente && (
                <CreateContrattoModal
                    clienteId={id!}
                    clienteTipo={cliente.tipo}
                    onClose={() => setShowCreateContrattoModal(false)}
                    onSuccess={() => {
                        loadCliente(); // Ricarica i dati del cliente (contatori in alto)
                        loadContratti(); // Ricarica la lista contratti
                        loadAttivita(); // Ricarica lo storico attività
                    }}
                />
            )}
        </div>
    );
}

// Componente per visualizzare i campi info
function InfoField({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
            <div className="text-base text-gray-900">{value || '-'}</div>
        </div>
    );
}
