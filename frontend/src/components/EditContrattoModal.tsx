import { useState, useEffect } from 'react';
import { X, Save, Upload, Clock, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { storicoAPI, contrattiAPI } from '../services/api';
import { useRefreshStore } from '../store/refreshStore';
import AssegnaAgenteCompensoModal from './AssegnaAgenteCompensoModal';
import InlineEditable from './InlineEditable';

interface EditContrattoModalProps {
    contratto: any;
    onClose: () => void;
    onUpdate: () => void;
    clienteId: string;
    clienteTipo: 'privato' | 'azienda';
    agenteAssegnato?: string | null;
    commissionePattuita?: number | null;
}

const PROCEDURE_OPTIONS = [
    'Switch',
    'Voltura',
    'Subentro',
    'Allaccio',
    'Attivazione su presa morosa',
    'Disattivazione',
    'Voltura mortis causa'
];

const STATI_CONTRATTO = [
    'Documenti da validare',
    'In compilazione',
    'Attivo',
    'Documenti da correggere',
    'Precheck KO',
    'Credit check KO',
    'Da attivare',
    'Chiusa',
    'Sospeso'
];

export default function EditContrattoModal({ 
    contratto, 
    onClose, 
    onUpdate,
    clienteId,
    clienteTipo,
    agenteAssegnato,
    commissionePattuita
}: EditContrattoModalProps) {
    const { triggerClientiRefresh } = useRefreshStore();
    const [formData, setFormData] = useState({
        procedure: contratto.procedure || '',
        stato: contratto.stato || 'Documenti da validare',
        fornitore: contratto.fornitore || '',
        note: '',
        allegato: null as File | null
    });
    const [saving, setSaving] = useState(false);
    const [storico, setStorico] = useState<any[]>([]);
    const [loadingStorico, setLoadingStorico] = useState(false);
    const [showAssegnaModal, setShowAssegnaModal] = useState(false);
    const [pendingData, setPendingData] = useState<{agenteId?: string; commissione?: number} | null>(null);

    // Carica lo storico al montaggio
    useEffect(() => {
        loadStorico();
    }, []);

    const loadStorico = async () => {
        try {
            setLoadingStorico(true);
            const response = await storicoAPI.getProcedure(contratto.tipo_contratto, contratto.id);
            setStorico(response.data.data || []);
        } catch (error) {
            console.error('Errore caricamento storico:', error);
        } finally {
            setLoadingStorico(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validazione
        if (!formData.procedure) {
            toast.error('Seleziona una procedura');
            return;
        }
        
        // Verifica se è un cambio stato verso Chiusa/Da attivare
        const statoPrec = (contratto.stato || '').toUpperCase();
        const statoNuovo = formData.stato.toUpperCase();
        const isAChiusaODaAttivare = statoNuovo === 'CHIUSA' || statoNuovo === 'DA ATTIVARE';
        const statoChanged = statoPrec !== statoNuovo;
        
        console.log('🔍 Verifica apertura modale assegnazione:');
        console.log('   - Stato precedente:', statoPrec);
        console.log('   - Stato nuovo:', statoNuovo);
        console.log('   - Stato è cambiato?', statoChanged);
        console.log('   - Va a Chiusa/Da attivare?', isAChiusaODaAttivare);
        console.log('   - Agente già assegnato?', agenteAssegnato);
        console.log('   - Commissione già impostata?', commissionePattuita);
        
        // Se cambia stato verso Chiusa/Da attivare E non c'è agente/commissione, mostra modale
        if (statoChanged && isAChiusaODaAttivare && (!agenteAssegnato || !commissionePattuita)) {
            console.log('✅ Apertura modale assegnazione');
            setShowAssegnaModal(true);
            return;
        }
        
        console.log('⏭️ Salvataggio diretto senza modale');
        // Altrimenti procedi normalmente
        await salvaCambio(null, null);
    };
    
    const salvaCambio = async (agenteId: string | null, commissione: number | null) => {
        try {
            setSaving(true);

            // Normalizza tipo contratto (solo "luce" o "gas") e ID come stringa
            const tipoContratto = (String(contratto.tipo_contratto || '').toLowerCase() === 'gas') ? 'gas' : 'luce';
            const contrattoId = String(contratto.id);

            // 1) Aggiorna contratto (procedure, stato, fornitore)
            try {
                await contrattiAPI.update(tipoContratto, contrattoId, {
                    procedure: formData.procedure,
                    stato: formData.stato,
                    fornitore: formData.fornitore
                });
                // Aggiorna il riepilogo nella modale subito
                contratto.fornitore = formData.fornitore;
                contratto.procedure = formData.procedure;
                contratto.stato = formData.stato;
                toast.success('✅ Contratto aggiornato');
            } catch (err: any) {
                console.error('❌ Errore update contratto:', {
                    status: err?.response?.status,
                    data: err?.response?.data,
                    message: err?.message
                });
                toast.error(err?.response?.data?.message || `Errore aggiornamento contratto (${err?.response?.status ?? 'n/a'})`);
                throw err; // interrompe il flusso se update fallisce
            }

            // 2) Salva nello storico (non blocca il successo dell'update)
            try {
                const prevProc = (contratto.procedure || '').trim();
                const newProc = (formData.procedure || '').trim();
                const procedureChanged = prevProc !== newProc;
                const statoChanged = ((contratto.stato || '').trim().toLowerCase() !== (formData.stato || '').trim().toLowerCase());

                if (procedureChanged || statoChanged) {
                    const formDataToSend = new FormData();
                    formDataToSend.append('procedura_precedente', prevProc || 'Switch');
                    formDataToSend.append('procedura_nuova', newProc);
                    formDataToSend.append('stato_precedente', contratto.stato || 'Documenti da validare');
                    formDataToSend.append('stato_nuovo', formData.stato);
                    if (formData.note) formDataToSend.append('note', formData.note);
                    if (formData.allegato) formDataToSend.append('allegato', formData.allegato);

                    if (agenteId && commissione) {
                        formDataToSend.append('agente_id', agenteId);
                        formDataToSend.append('commissione_pattuita', String(commissione));
                        formDataToSend.append('cliente_id', clienteId);
                        formDataToSend.append('cliente_tipo', clienteTipo);
                    }

                    await storicoAPI.addProcedura(tipoContratto, contrattoId, formDataToSend);
                } else {
                    console.debug('Nessun cambio in procedura/stato: storico non aggiornato');
                }
            } catch (err: any) {
                console.error('⚠️ Errore salvataggio storico procedura:', {
                    status: err?.response?.status,
                    data: err?.response?.data,
                    message: err?.message
                });
                toast.error(err?.response?.data?.message || 'Errore salvataggio storico procedura');
            }

            // 3) Reset form (mantieni valori appena salvati)
            setFormData({
                procedure: formData.procedure,
                stato: formData.stato,
                fornitore: formData.fornitore,
                note: '',
                allegato: null
            });

            setShowAssegnaModal(false);
            await loadStorico();
            onUpdate();
            triggerClientiRefresh();
            console.log('✅ Refresh clienti triggerato dopo salvataggio contratto');
        } catch (error: any) {
            // Errore generale del flusso (principalmente update)
            console.error('Errore aggiornamento contratto:', error);
            // Il toast specifico è già mostrato sopra; manteniamo un fallback
            if (!error?.response?.data?.message) {
                toast.error('❌ Errore aggiornamento contratto');
            }
        } finally {
            setSaving(false);
        }
    };

    const downloadAllegato = async (storicoId: string, filename: string) => {
        try {
            const response = await storicoAPI.getAllegato(storicoId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('📥 File scaricato!');
        } catch (error) {
            console.error('Errore download allegato:', error);
            toast.error('❌ Errore download file');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">
                            Modifica Contratto {contratto.tipo_contratto === 'luce' ? 'LUCE' : 'GAS'}
                        </h2>
                        <p className="text-blue-100 text-sm mt-1">
                            {contratto.numero_contratto}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                {/* Storico Modifiche */}
                {storico.length > 0 && (
                    <div className="px-6 pt-6">
                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Clock size={20} className="text-blue-600" />
                            Storico Modifiche Procedura
                        </h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {storico.map((record) => (
                                <div key={record.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                                    {record.procedura_precedente || 'N/A'}
                                                </span>
                                                <span className="text-gray-400">→</span>
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                                                    {record.procedura_nuova}
                                                </span>
                                            </div>
                                            {record.note && (
                                                <p className="text-sm text-gray-600 mt-2 italic">
                                                    "{record.note}"
                                                </p>
                                            )}
                                        </div>
                                        {record.allegato_filename && (
                                            <button
                                                type="button"
                                                onClick={() => downloadAllegato(record.id, record.allegato_filename)}
                                                className="ml-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                <Download size={14} />
                                                PDF
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                                        <span>
                                            {new Date(record.created_at).toLocaleString('it-IT')}
                                        </span>
                                        {record.modificato_da_nome && (
                                            <span>
                                                da <strong>{record.modificato_da_nome} {record.modificato_da_cognome}</strong>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Info Contratto */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-3">Informazioni Contratto</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">
                                    {contratto.tipo_contratto === 'luce' ? 'POD' : 'PDR'}:
                                </span>
                                <span className="font-mono font-semibold ml-2">
                                    {contratto.tipo_contratto === 'luce' ? contratto.pod : contratto.pdr}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Fornitore:</span>
                                <InlineEditable
                                  value={contratto.fornitore || ''}
                                  placeholder="Inserisci fornitore"
                                  className="font-semibold ml-2"
                                  onSave={async (val) => {
                                    try {
                                      await contrattiAPI.update(contratto.tipo_contratto, String(contratto.id), { fornitore: val });
                                      contratto.fornitore = val;
                                      setFormData((prev) => ({ ...prev, fornitore: val }));
                                      toast.success('Fornitore aggiornato');
                                    } catch (error: any) {
                                      console.error('Errore aggiornamento fornitore:', error);
                                      toast.error(error.response?.data?.message || '❌ Errore aggiornamento fornitore');
                                    }
                                  }}
                                />
                            </div>
                            <div>
                                <span className="text-gray-600">Procedura Attuale:</span>
                                <span className="font-semibold ml-2 text-blue-600">
                                    {contratto.procedure || 'Non specificata'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Stato:</span>
                                <span className="font-semibold ml-2 text-green-600">
                                    {contratto.stato?.toUpperCase() || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Nuova Procedura */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nuova Procedura *
                        </label>
                        <select
                            value={formData.procedure}
                            onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            <option value="">Seleziona procedura...</option>
                            {PROCEDURE_OPTIONS.map(proc => (
                                <option key={proc} value={proc}>{proc}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Stato Contratto */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Stato Contratto *
                        </label>
                        <select
                            value={formData.stato}
                            onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold ${
                                formData.stato === 'chiusa' || formData.stato === 'da_attivare' || formData.stato === 'attivo' ? 'text-green-600' :
                                formData.stato === 'documenti_da_correggere' || formData.stato === 'precheck_ko' || formData.stato === 'credit_check_ko' ? 'text-red-600' :
                                formData.stato === 'documenti_da_validare' ? 'text-orange-600' :
                                'text-gray-700'
                            }`}
                            required
                        >
                            {STATI_CONTRATTO.map(stato => (
                                <option key={stato} value={stato}>{stato}</option>
                            ))}
                        </select>
                    </div>

                    {/* Fornitore */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Fornitore
                        </label>
                        <input
                            type="text"
                            value={formData.fornitore}
                            onChange={(e) => setFormData({ ...formData, fornitore: e.target.value })}
                            placeholder="es. ALPERIA, ENEL, A2A, Edison..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Inserisci il nome del fornitore esattamente come appare nel contratto
                        </p>
                    </div>
                    
                    {/* Note */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Note (opzionale)
                        </label>
                        <textarea
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Inserisci eventuali note sulla modifica..."
                        />
                    </div>
                    
                    {/* Allegato PDF */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Allegato PDF (opzionale)
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setFormData({ ...formData, allegato: e.target.files?.[0] || null })}
                                className="hidden"
                                id="file-upload"
                            />
                            <label 
                                htmlFor="file-upload"
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
                            >
                                <Upload size={20} className="text-gray-600" />
                                <span className="text-gray-600">
                                    {formData.allegato ? formData.allegato.name : 'Clicca per caricare un PDF'}
                                </span>
                            </label>
                        </div>
                        {formData.allegato && (
                            <p className="text-sm text-green-600 mt-2">
                                ✅ File selezionato: {formData.allegato.name}
                            </p>
                        )}
                    </div>
                    
                    {/* Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
                            disabled={saving}
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Salva Modifiche
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Modale Assegnazione Agente e Compenso */}
            {showAssegnaModal && (
                <AssegnaAgenteCompensoModal
                    clienteId={clienteId}
                    clienteTipo={clienteTipo}
                    agenteAttualeId={agenteAssegnato}
                    commissioneAttuale={commissionePattuita}
                    onClose={() => setShowAssegnaModal(false)}
                    onConfirm={(agenteId, commissione) => {
                        salvaCambio(agenteId, commissione);
                    }}
                />
            )}
        </div>
    );
}

