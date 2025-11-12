/**
 * Modale per comporre e inviare email a un cliente
 */

import { useState, useEffect } from 'react';
import { X, Send, Loader2, FileText, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { emailAPI } from '../services/api';

interface EmailComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    cliente: any;
    onEmailSent?: () => void;
}

export default function EmailComposeModal({ isOpen, onClose, cliente, onEmailSent }: EmailComposeModalProps) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [emailMode, setEmailMode] = useState<'template' | 'custom'>('template');
    
    const [emailData, setEmailData] = useState({
        subject: '',
        body: ''
    });
    
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadTemplates();
        }
    }, [isOpen]);

    const loadTemplates = async () => {
        try {
            setLoadingTemplates(true);
            const response = await emailAPI.getTemplates();
            // Il backend risponde con { success, data: [...] }
            setTemplates(response.data.data || []);
        } catch (error) {
            console.error('Errore caricamento templates:', error);
            toast.error('Errore caricamento templates');
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplate(templateId);
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setEmailData({
                subject: template.subject || '',
                body: template.html_content || ''
            });
        }
    };

    const handleSendEmail = async () => {
        if (!emailData.subject.trim()) {
            toast.error('Inserisci un oggetto per l\'email');
            return;
        }

        if (!emailData.body.trim()) {
            toast.error('Inserisci il contenuto dell\'email');
            return;
        }

        const clienteEmail = cliente.email_principale || cliente.email_referente;
        if (!clienteEmail) {
            toast.error('Cliente senza email');
            return;
        }

        try {
            setSending(true);

            // Prepara i dati per l'invio
            const payload = {
                destinatari: [clienteEmail],
                oggetto: emailData.subject,
                corpo: emailData.body,
                tipoEmail: 'custom' as const,
                clienteId: cliente.id,
                tipoCliente: cliente.tipo
            };

            // Invia email tramite API
    const response = await fetch('/api/client-actions/send-custom-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Errore invio email');
            }

            toast.success('✅ Email inviata con successo!');
            
            if (onEmailSent) {
                onEmailSent();
            }

            // Reset e chiudi
            setEmailData({ subject: '', body: '' });
            setSelectedTemplate('');
            onClose();
        } catch (error: any) {
            console.error('Errore invio email:', error);
            toast.error(error.message || 'Errore invio email');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen || !cliente) return null;

    const clienteNome = cliente.tipo === 'privato' 
        ? `${cliente.nome} ${cliente.cognome}` 
        : cliente.ragione_sociale;
    
    const clienteEmail = cliente.email_principale || cliente.email_referente;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Send size={28} />
                            Invia Email
                        </h2>
                        <p className="text-blue-100 mt-1">
                            A: <strong>{clienteNome}</strong> ({clienteEmail})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        disabled={sending}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Modalità Email */}
                    <div className="flex gap-2 border-b pb-4">
                        <button
                            onClick={() => setEmailMode('template')}
                            className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                                emailMode === 'template'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <FileText size={20} />
                            Usa Template
                        </button>
                        <button
                            onClick={() => {
                                setEmailMode('custom');
                                setSelectedTemplate('');
                                setEmailData({ subject: '', body: '' });
                            }}
                            className={`flex-1 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                                emailMode === 'custom'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <MessageSquare size={20} />
                            Email Personalizzata
                        </button>
                    </div>

                    {/* Selezione Template */}
                    {emailMode === 'template' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Seleziona Template
                            </label>
                            {loadingTemplates ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="animate-spin text-blue-600" size={32} />
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Nessun template disponibile
                                </div>
                            ) : (
                                <select
                                    value={selectedTemplate}
                                    onChange={(e) => handleTemplateSelect(e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="">-- Seleziona un template --</option>
                                    {templates.map((template) => (
                                        <option key={template.id} value={template.id}>
                                            {template.nome}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Oggetto Email */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Oggetto *
                        </label>
                        <input
                            type="text"
                            value={emailData.subject}
                            onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                            placeholder="Inserisci l'oggetto dell'email"
                            className="input w-full"
                            disabled={sending}
                        />
                    </div>

                    {/* Corpo Email */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Messaggio *
                        </label>
                        <textarea
                            value={emailData.body}
                            onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                            placeholder="Scrivi qui il contenuto dell'email..."
                            rows={12}
                            className="input w-full resize-none"
                            disabled={sending}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            💡 Puoi usare HTML per formattare il testo
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t bg-gray-50 p-6 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="btn bg-gray-200 hover:bg-gray-300 text-gray-700"
                        disabled={sending}
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleSendEmail}
                        disabled={sending || !emailData.subject.trim() || !emailData.body.trim()}
                        className="btn bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Invio in corso...
                            </>
                        ) : (
                            <>
                                <Send size={20} />
                                Invia Email
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

