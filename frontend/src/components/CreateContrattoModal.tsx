/**
 * Modale per creare nuovi contratti Luce/Gas con tutti i campi del CSV
 */

import { useState, useEffect } from 'react';
import { X, Zap, Flame, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { contrattiAPI, agentiAPI } from '../services/api';

interface CreateContrattoModalProps {
    onClose: () => void;
    onSuccess: () => void;
    clienteId: string;
    clienteTipo: 'privato' | 'azienda';
}

const STATI_CONTRATTO = [
    'In compilazione',
    'Documenti da validare',
    'Documenti da correggere',
    'Da attivare',
    'Precheck KO',
    'Credit check KO',
    'Attivo',
    'Chiusa',
    'Sospeso'
];

const PROCEDURE = [
    'Switch',
    'Voltura',
    'Subentro',
    'Allaccio',
    'Attivazione su presa morosa',
    'Disattivazione',
    'Voltura mortis causa'
];

export default function CreateContrattoModal({ onClose, onSuccess, clienteId, clienteTipo }: CreateContrattoModalProps) {
    const [tipoContratto, setTipoContratto] = useState<'luce' | 'gas'>('luce');
    const [loading, setLoading] = useState(false);
    const [agenti, setAgenti] = useState<any[]>([]);
    const [loadingAgenti, setLoadingAgenti] = useState(true);
    const [contrattiEsistenti, setContrattiEsistenti] = useState<any[]>([]);
    const [duplicateError, setDuplicateError] = useState<string>('');
    
    const [formData, setFormData] = useState({
        // Campi comuni
        numero_contratto: '',
        fornitore: '',
        commodity: '',
        procedure: '',
        data_stipula: '',
        data_attivazione: '',
        data_scadenza: '',
        stato: 'In compilazione',
        note: '',
        indirizzo_fornitura: '', // Nuovo campo per distinguere gli appartamenti
        
        // Campi specifici luce
        pod: '',
        prezzo_energia: '',
        
        // Campi specifici gas
        pdr: '',
        prezzo_gas: '',
        
        // Campi aggiuntivi dal CSV
        pdp: '',
        agente: '',
        nome_offerta: '',
        tipo_offerta: '',
        validita_offerta: ''
    });

    // Carica lista agenti e contratti esistenti all'apertura della modale
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoadingAgenti(true);
                
                // Carica agenti
                const agentiResponse = await agentiAPI.getAll();
                setAgenti(agentiResponse.data.data || []);
                
                // Carica contratti esistenti per validazione duplicati
                const contrattiResponse = await contrattiAPI.getByCliente(clienteTipo, clienteId);
                setContrattiEsistenti(contrattiResponse.data.data || []);
                
            } catch (error) {
                console.error('Errore caricamento dati:', error);
                toast.error('Errore nel caricamento dei dati');
            } finally {
                setLoadingAgenti(false);
            }
        };

        loadData();
    }, [clienteId, clienteTipo]);

    // Funzione per validare duplicati POD/PDR
    const validateDuplicate = (value: string, type: 'pod' | 'pdr') => {
        if (!value.trim()) {
            setDuplicateError('');
            return;
        }

        const isDuplicate = contrattiEsistenti.some(contratto => {
            if (type === 'pod') {
                return contratto.tipo_contratto === 'luce' && contratto.pod === value.trim();
            } else {
                return contratto.tipo_contratto === 'gas' && contratto.pdr === value.trim();
            }
        });

        if (isDuplicate) {
            setDuplicateError(`${type.toUpperCase()} già esistente per questo cliente`);
        } else {
            setDuplicateError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Verifica duplicati prima dell'invio
        if (duplicateError) {
            toast.error('Impossibile salvare: ' + duplicateError);
            return;
        }
        
        // Validazione minima lato client
        if (!formData.numero_contratto?.trim()) {
            toast.error('Inserisci il numero contratto');
            return;
        }
        if (tipoContratto === 'luce' && !formData.pod?.trim()) {
            toast.error('Inserisci il POD');
            return;
        }
        if (tipoContratto === 'gas' && !formData.pdr?.trim()) {
            toast.error('Inserisci il PDR');
            return;
        }
        
        setLoading(true);

        try {
            // Prepara i dati in base al tipo di contratto e cliente
            const dataToSend: any = {
                ...formData,
                tipo_cliente: clienteTipo
            };

            // Assegna l'ID cliente al campo corretto
            if (clienteTipo === 'privato') {
                dataToSend.cliente_privato_id = clienteId;
                dataToSend.cliente_azienda_id = null;
            } else {
                dataToSend.cliente_azienda_id = clienteId;
                dataToSend.cliente_privato_id = null;
            }

            // Normalizza campi numerici e date
            if (dataToSend.prezzo_energia !== undefined) {
                const v = String(dataToSend.prezzo_energia).trim();
                dataToSend.prezzo_energia = v ? parseFloat(v.replace(',', '.')) : null;
            }
            if (dataToSend.prezzo_gas !== undefined) {
                const v = String(dataToSend.prezzo_gas).trim();
                dataToSend.prezzo_gas = v ? parseFloat(v.replace(',', '.')) : null;
            }
            // Se le date sono vuote, invia null (evita stringhe vuote)
            dataToSend.data_attivazione = dataToSend.data_attivazione?.trim() || null;
            dataToSend.data_scadenza = dataToSend.data_scadenza?.trim() || null;
            dataToSend.data_stipula = dataToSend.data_stipula?.trim() || null;

            // Rimuovi campi non necessari in base al tipo di contratto
            if (tipoContratto === 'luce') {
                delete dataToSend.pdr;
                delete dataToSend.prezzo_gas;
            } else {
                delete dataToSend.pod;
                delete dataToSend.prezzo_energia;
            }
            
            // Log di debug del payload
            console.debug('📤 Invio contratto', tipoContratto, dataToSend);

            await contrattiAPI.create(tipoContratto, dataToSend);
            toast.success(`✅ Contratto ${tipoContratto.toUpperCase()} creato con successo!`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('❌ Errore creazione contratto:', {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message
            });
            const serverMsg = error?.response?.data?.message || error?.response?.data?.error;
            const status = error?.response?.status ? ` (HTTP ${error.response.status})` : '';
            toast.error(serverMsg ? `Errore: ${serverMsg}${status}` : 'Errore durante la creazione del contratto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            {tipoContratto === 'luce' ? <Zap size={28} /> : <Flame size={28} />}
                            Nuovo Contratto {tipoContratto.toUpperCase()}
                        </h2>
                        <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Selettore tipo contratto */}
                <div className="p-6 bg-gray-50 border-b flex gap-4">
                    <button
                        type="button"
                        onClick={() => setTipoContratto('luce')}
                        className={`flex-1 py-4 px-6 rounded-lg font-bold transition-all flex items-center justify-center gap-3 ${
                            tipoContratto === 'luce'
                                ? 'bg-yellow-500 text-white shadow-lg scale-105'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <Zap size={24} />
                        LUCE
                    </button>
                    <button
                        type="button"
                        onClick={() => setTipoContratto('gas')}
                        className={`flex-1 py-4 px-6 rounded-lg font-bold transition-all flex items-center justify-center gap-3 ${
                            tipoContratto === 'gas'
                                ? 'bg-blue-500 text-white shadow-lg scale-105'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <Flame size={24} />
                        GAS
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
                    <div className="grid grid-cols-2 gap-6">
                        {/* DATI PRINCIPALI */}
                        <div className="col-span-2">
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Dati Principali</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Numero Contratto *</label>
                            <input
                                type="text"
                                value={formData.numero_contratto}
                                onChange={(e) => setFormData({ ...formData, numero_contratto: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="es. CONTR-2025-001234"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {tipoContratto === 'luce' ? 'POD *' : 'PDR *'}
                            </label>
                            <input
                                type="text"
                                value={tipoContratto === 'luce' ? formData.pod : formData.pdr}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData({
                                        ...formData,
                                        [tipoContratto === 'luce' ? 'pod' : 'pdr']: value
                                    });
                                    // Validazione duplicati in tempo reale
                                    validateDuplicate(value, tipoContratto === 'luce' ? 'pod' : 'pdr');
                                }}
                                className={`w-full p-2 border rounded-lg focus:ring-2 font-mono ${
                                    duplicateError 
                                        ? 'border-red-500 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-blue-500'
                                }`}
                                placeholder={tipoContratto === 'luce' ? 'es. IT001E12345678' : 'es. 12345678901234'}
                                required
                            />
                            {duplicateError && (
                                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                    ⚠️ {duplicateError}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Fornitore</label>
                            <input
                                type="text"
                                value={formData.fornitore}
                                onChange={(e) => setFormData({ ...formData, fornitore: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="es. Enel, Eni, A2A, Edison"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Prezzo {tipoContratto === 'luce' ? '(€/kWh)' : '(€/Smc)'}
                            </label>
                            <input
                                type="number"
                                step="0.0001"
                                value={tipoContratto === 'luce' ? formData.prezzo_energia : formData.prezzo_gas}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    [tipoContratto === 'luce' ? 'prezzo_energia' : 'prezzo_gas']: e.target.value
                                })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder={tipoContratto === 'luce' ? 'es. 0.1250' : 'es. 0.3500'}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Commodity</label>
                            <input
                                type="text"
                                value={formData.commodity}
                                onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder={tipoContratto === 'luce' ? 'es. Power, Elettricità' : 'es. Gas, Metano'}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Indirizzo Fornitura</label>
                            <input
                                type="text"
                                value={formData.indirizzo_fornitura}
                                onChange={(e) => setFormData({ ...formData, indirizzo_fornitura: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="es. Via Roma 123, Appartamento 2A"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Utile per distinguere forniture multiple dello stesso cliente
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Procedure</label>
                            <select
                                value={formData.procedure}
                                onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleziona...</option>
                                {PROCEDURE.map(proc => (
                                    <option key={proc} value={proc}>{proc}</option>
                                ))}
                            </select>
                        </div>

                        {/* DATE */}
                        <div className="col-span-2 mt-4">
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Date</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Data Stipula</label>
                            <input
                                type="date"
                                value={formData.data_stipula}
                                onChange={(e) => setFormData({ ...formData, data_stipula: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Data Attivazione</label>
                            <input
                                type="date"
                                value={formData.data_attivazione}
                                onChange={(e) => setFormData({ ...formData, data_attivazione: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Data Scadenza</label>
                            <input
                                type="date"
                                value={formData.data_scadenza}
                                onChange={(e) => setFormData({ ...formData, data_scadenza: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Stato</label>
                            <select
                                value={formData.stato}
                                onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {STATI_CONTRATTO.map(stato => (
                                    <option key={stato} value={stato}>{stato}</option>
                                ))}
                            </select>
                        </div>

                        {/* DATI OFFERTA */}
                        <div className="col-span-2 mt-4">
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Dati Offerta</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Offerta</label>
                            <input
                                type="text"
                                value={formData.nome_offerta}
                                onChange={(e) => setFormData({ ...formData, nome_offerta: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="es. Alperia Gas Smile Pure, Enel Energia Libera"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Offerta</label>
                            <input
                                type="text"
                                value={formData.tipo_offerta}
                                onChange={(e) => setFormData({ ...formData, tipo_offerta: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="es. Prezzo Fisso, Prezzo Variabile"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Validità Offerta</label>
                            <input
                                type="text"
                                value={formData.validita_offerta}
                                onChange={(e) => setFormData({ ...formData, validita_offerta: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="es. 12 mesi, 24 mesi, 36 mesi"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Agente</label>
                            <select
                                value={formData.agente}
                                onChange={(e) => setFormData({ ...formData, agente: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                disabled={loadingAgenti}
                            >
                                <option value="">Seleziona un agente...</option>
                                {agenti.map((agente) => (
                                    <option key={agente.id} value={`${agente.nome} ${agente.cognome}`}>
                                        {agente.nome} {agente.cognome} - {agente.email}
                                    </option>
                                ))}
                            </select>
                            {loadingAgenti && (
                                <p className="text-xs text-gray-500 mt-1">Caricamento agenti...</p>
                            )}
                        </div>

                        {/* ALTRI DATI */}
                        <div className="col-span-2 mt-4">
                            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Altri Dati</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">PDP</label>
                            <input
                                type="text"
                                value={formData.pdp}
                                onChange={(e) => setFormData({ ...formData, pdp: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                                placeholder="es. 10400000116577"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                            <textarea
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="es. Cliente preferisce fattura cartacea, Pagamento con RID bancario"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="bg-gray-50 p-6 border-t flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        disabled={loading}
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                Creazione...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Crea Contratto
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

