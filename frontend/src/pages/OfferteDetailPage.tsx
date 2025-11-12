import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { offerteAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, Phone, TrendingUp, MessageCircle, X } from 'lucide-react';

export default function OfferteDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [offerta, setOfferta] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [emailTemplate, setEmailTemplate] = useState('standard');
    const [customMessage, setCustomMessage] = useState('');
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    const navigate = useNavigate();
    
    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id, categoriaFiltro]);
    
    const loadData = async () => {
        try {
            const [offertaRes, matchesRes] = await Promise.all([
                offerteAPI.getById(id!),
                offerteAPI.getMatches(id!, { categoria: categoriaFiltro }),
            ]);
            setOfferta(offertaRes.data.data);
            setMatches(matchesRes.data.data);
        } catch (error) {
            toast.error('Errore caricamento dettagli');
        } finally {
            setLoading(false);
        }
    };
    
    const updateMatchStatus = async (matchId: string, nuovoStato: string) => {
        try {
            await offerteAPI.updateMatchStatus(matchId, { stato_contatto: nuovoStato });
            toast.success('Stato aggiornato');
            loadData();
        } catch (error) {
            toast.error('Errore aggiornamento stato');
        }
    };
    
    const handleSendEmail = async () => {
        if (!selectedMatch) return;
        
        setSending(true);
        try {
            await offerteAPI.sendMatchEmail(
                selectedMatch.id,
                emailTemplate,
                emailTemplate === 'custom' ? customMessage : undefined
            );
            toast.success('✅ Email inviata con successo!');
            setShowEmailModal(false);
            setEmailTemplate('standard');
            setCustomMessage('');
            loadData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Errore invio email');
        } finally {
            setSending(false);
        }
    };
    
    const handleSaveNote = async () => {
        if (!selectedMatch || !note.trim()) return;
        
        try {
            await offerteAPI.updateMatchStatus(selectedMatch.id, { note_venditore: note });
            toast.success('✅ Nota salvata!');
            setShowNoteModal(false);
            setNote('');
            loadData();
        } catch (error: any) {
            toast.error('Errore salvataggio nota');
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }
    
    if (!offerta) return <div>Offerta non trovata</div>;
    
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/offerte')} className="btn btn-secondary">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900">{offerta.nome_offerta}</h1>
                    <p className="text-gray-600 mt-1">{offerta.fornitore}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card">
                    <p className="text-sm text-gray-600">Tipo Energia</p>
                    <p className="text-2xl font-bold text-gray-900 capitalize">{offerta.tipo_energia}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-gray-600">Target</p>
                    <p className="text-2xl font-bold text-gray-900 capitalize">{offerta.target_clienti}</p>
                </div>
                <div className="card">
                    <p className="text-sm text-gray-600">Validità</p>
                    <p className="text-lg font-bold text-gray-900">
                        {new Date(offerta.data_fine_validita).toLocaleDateString('it-IT')}
                    </p>
                </div>
            </div>
            
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Clienti Eligibili ({matches.length})</h2>
                    <select
                        className="input w-48"
                        value={categoriaFiltro}
                        onChange={(e) => setCategoriaFiltro(e.target.value)}
                    >
                        <option value="">Tutti i leads</option>
                        <option value="hot">Solo Hot Leads</option>
                        <option value="warm">Solo Warm Leads</option>
                        <option value="cold">Solo Cold Leads</option>
                    </select>
                </div>
                
                {matches.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Nessun cliente eligibile</p>
                ) : (
                    <div className="space-y-3">
                        {matches.map((match) => (
                            <div
                                key={match.id}
                                className={`p-4 rounded-lg border-2 ${
                                    match.categoria_lead === 'hot'
                                        ? 'bg-red-50 border-red-300'
                                        : match.categoria_lead === 'warm'
                                        ? 'bg-orange-50 border-orange-300'
                                        : 'bg-blue-50 border-blue-300'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-bold text-gray-900">
                                                {match.cliente_nome} {match.cliente_cognome || match.azienda_nome}
                                            </h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                                match.categoria_lead === 'hot'
                                                    ? 'bg-red-500 text-white'
                                                    : match.categoria_lead === 'warm'
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-blue-500 text-white'
                                            }`}>
                                                {match.categoria_lead}
                                            </span>
                                            <span className="text-sm text-gray-600">
                                                Score: {match.score_matching}/100
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <p className="flex items-center gap-2 text-gray-600">
                                                <Mail size={14} />
                                                {match.cliente_email || match.azienda_email}
                                            </p>
                                            {match.codice_ateco && (
                                                <p className="text-gray-600">ATECO: {match.codice_ateco}</p>
                                            )}
                                            <p className="text-gray-600">
                                                Fornitore attuale: {match.fornitore_attuale_luce || match.fornitore_attuale_gas}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-600">Risparmio stimato</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                €{match.risparmio_stimato_annuo?.toFixed(2) || '0'}/anno
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                ({match.percentuale_risparmio?.toFixed(1) || '0'}%)
                                            </p>
                                        </div>
                                        
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedMatch(match);
                                                    setShowEmailModal(true);
                                                }}
                                                className="btn btn-sm btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
                                            >
                                                <Mail size={14} />
                                                Invia Email
                                            </button>
                                            
                                            <a
                                                href={`tel:${match.cliente_email || match.azienda_email}`}
                                                className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 whitespace-nowrap"
                                            >
                                                <Phone size={14} />
                                                Chiama
                                            </a>
                                            
                                            <button
                                                onClick={() => {
                                                    setSelectedMatch(match);
                                                    setNote(match.note_venditore || '');
                                                    setShowNoteModal(true);
                                                }}
                                                className="btn btn-sm bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center gap-2 whitespace-nowrap"
                                            >
                                                <MessageCircle size={14} />
                                                Note
                                            </button>
                                        </div>
                                        
                                        <select
                                            className="input text-xs w-full"
                                            value={match.stato_contatto}
                                            onChange={(e) => updateMatchStatus(match.id, e.target.value)}
                                        >
                                            <option value="non_contattato">Non contattato</option>
                                            <option value="contattato">Contattato</option>
                                            <option value="interessato">Interessato</option>
                                            <option value="non_interessato">Non interessato</option>
                                            <option value="convertito">Convertito</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Modale Invio Email */}
            {showEmailModal && selectedMatch && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Invia Email a Cliente</h3>
                            <button onClick={() => setShowEmailModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-sm font-semibold text-blue-900">
                                    {selectedMatch.cliente_nome} {selectedMatch.cliente_cognome || selectedMatch.azienda_nome}
                                </p>
                                <p className="text-sm text-blue-700">{selectedMatch.cliente_email || selectedMatch.azienda_email}</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Template Email</label>
                                <select
                                    value={emailTemplate}
                                    onChange={(e) => setEmailTemplate(e.target.value)}
                                    className="input"
                                >
                                    <option value="standard">Standard - Proposta offerta</option>
                                    <option value="custom">Personalizzato</option>
                                </select>
                            </div>
                            
                            {emailTemplate === 'custom' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Messaggio Personalizzato</label>
                                    <textarea
                                        value={customMessage}
                                        onChange={(e) => setCustomMessage(e.target.value)}
                                        rows={6}
                                        placeholder="Scrivi qui il tuo messaggio personalizzato..."
                                        className="input"
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
                            <button onClick={() => setShowEmailModal(false)} className="flex-1 btn btn-secondary">
                                Annulla
                            </button>
                            <button
                                onClick={handleSendEmail}
                                disabled={sending || (emailTemplate === 'custom' && !customMessage.trim())}
                                className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                            >
                                <Mail size={16} />
                                {sending ? 'Invio...' : 'Invia Email'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modale Note */}
            {showNoteModal && selectedMatch && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">Note Venditore</h3>
                            <button onClick={() => setShowNoteModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-sm font-semibold text-gray-900">
                                    {selectedMatch.cliente_nome} {selectedMatch.cliente_cognome || selectedMatch.azienda_nome}
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    rows={8}
                                    placeholder="Aggiungi note sul contatto, esigenze del cliente, follow-up pianificati..."
                                    className="input"
                                />
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
                            <button onClick={() => setShowNoteModal(false)} className="flex-1 btn btn-secondary">
                                Annulla
                            </button>
                            <button
                                onClick={handleSaveNote}
                                disabled={!note.trim()}
                                className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                            >
                                <MessageCircle size={16} />
                                Salva Nota
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

