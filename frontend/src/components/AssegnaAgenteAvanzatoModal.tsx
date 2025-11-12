/**
 * Modale Avanzata Assegnazione Agente con Parcelle Separate
 * Supporta commissioni separate per contratti Luce e Gas
 * Include opzione per utilizzare commissioni default dell'agente
 */

import { useState, useEffect } from 'react';
import { X, Users, Zap, Flame, DollarSign, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { agentiAPI } from '../services/api';

interface Props {
    onClose: () => void;
    onConfirm: (agenteId: string, commissioneLuce?: number, commissioneGas?: number) => void;
    clienteId: string;
    clienteTipo: 'privato' | 'azienda';
    agenteAttualeId?: string | null;
    commissioneAttuale?: number | null;
    // Nuovi props per identificare i tipi di contratto disponibili
    hasContrattiLuce?: boolean;
    hasContrattiGas?: boolean;
}

interface Agente {
    id: string;
    nome: string;
    cognome: string;
    commissioni_luce_default?: number;
    commissioni_gas_default?: number;
}

export default function AssegnaAgenteAvanzatoModal({ 
    onClose, 
    onConfirm, 
    clienteId,
    clienteTipo,
    agenteAttualeId,
    commissioneAttuale,
    hasContrattiLuce = true,
    hasContrattiGas = true
}: Props) {
    const [agenti, setAgenti] = useState<Agente[]>([]);
    const [loading, setLoading] = useState(true);
    const [agenteSelezionato, setAgenteSelezionato] = useState<string>(agenteAttualeId || '');
    
    // Commissioni separate
    const [commissioneLuce, setCommissioneLuce] = useState<string>('');
    const [commissioneGas, setCommissioneGas] = useState<string>('');
    
    // Modalità inserimento: 'manuale' o 'default'
    const [modalitaLuce, setModalitaLuce] = useState<'manuale' | 'default'>('manuale');
    const [modalitaGas, setModalitaGas] = useState<'manuale' | 'default'>('manuale');

    useEffect(() => {
        loadAgenti();
    }, []);

    // Quando cambia l'agente selezionato, aggiorna le commissioni se in modalità default
    useEffect(() => {
        if (agenteSelezionato) {
            const agente = agenti.find(a => a.id === agenteSelezionato);
            if (agente) {
                if (modalitaLuce === 'default' && agente.commissioni_luce_default) {
                    setCommissioneLuce(agente.commissioni_luce_default.toString());
                }
                if (modalitaGas === 'default' && agente.commissioni_gas_default) {
                    setCommissioneGas(agente.commissioni_gas_default.toString());
                }
            }
        }
    }, [agenteSelezionato, modalitaLuce, modalitaGas, agenti]);

    // Quando cambia la modalità, aggiorna le commissioni
    useEffect(() => {
        if (agenteSelezionato) {
            const agente = agenti.find(a => a.id === agenteSelezionato);
            if (agente) {
                if (modalitaLuce === 'default' && agente.commissioni_luce_default) {
                    setCommissioneLuce(agente.commissioni_luce_default.toString());
                } else if (modalitaLuce === 'manuale') {
                    setCommissioneLuce('');
                }
            }
        }
    }, [modalitaLuce, agenteSelezionato, agenti]);

    useEffect(() => {
        if (agenteSelezionato) {
            const agente = agenti.find(a => a.id === agenteSelezionato);
            if (agente) {
                if (modalitaGas === 'default' && agente.commissioni_gas_default) {
                    setCommissioneGas(agente.commissioni_gas_default.toString());
                } else if (modalitaGas === 'manuale') {
                    setCommissioneGas('');
                }
            }
        }
    }, [modalitaGas, agenteSelezionato, agenti]);

    const loadAgenti = async () => {
        try {
            const response = await agentiAPI.getAll();
            setAgenti(response.data.data || []);
        } catch (error) {
            console.error('Errore caricamento agenti:', error);
            toast.error('Errore caricamento agenti');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!agenteSelezionato) {
            toast.error('Seleziona un agente');
            return;
        }

        // Validazione commissioni
        let commissioneLuceNum: number | undefined;
        let commissioneGasNum: number | undefined;

        if (hasContrattiLuce) {
            if (!commissioneLuce || parseFloat(commissioneLuce) <= 0) {
                toast.error('Inserisci una commissione valida per la Luce');
                return;
            }
            commissioneLuceNum = parseFloat(commissioneLuce);
        }

        if (hasContrattiGas) {
            if (!commissioneGas || parseFloat(commissioneGas) <= 0) {
                toast.error('Inserisci una commissione valida per il Gas');
                return;
            }
            commissioneGasNum = parseFloat(commissioneGas);
        }

        onConfirm(agenteSelezionato, commissioneLuceNum, commissioneGasNum);
    };

    const agenteCorrente = agenti.find(a => a.id === agenteSelezionato);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-blue-600" size={24} />
                        Assegnazione Agente Avanzata
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Sistema di Parcelle Separate</strong>
                            <br />
                            Assegna commissioni specifiche per contratti Luce e Gas con possibilità di utilizzare le somme pattuite di default.
                        </p>
                    </div>

                    {/* Selezione Agente */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Agente <span className="text-red-500">*</span>
                        </label>
                        {loading ? (
                            <div className="text-sm text-gray-500">Caricamento agenti...</div>
                        ) : (
                            <select
                                value={agenteSelezionato}
                                onChange={(e) => setAgenteSelezionato(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">-- Seleziona Agente --</option>
                                {agenti.map((agente) => (
                                    <option key={agente.id} value={agente.id}>
                                        {agente.nome} {agente.cognome}
                                    </option>
                                ))}
                            </select>
                        )}
                        {agenteAttualeId && (
                            <p className="text-xs text-gray-500 mt-1">
                                Agente attualmente assegnato: {agenti.find(a => a.id === agenteAttualeId)?.nome} {agenti.find(a => a.id === agenteAttualeId)?.cognome}
                            </p>
                        )}
                    </div>

                    {/* Commissioni Separate */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Commissione Luce */}
                        {hasContrattiLuce && (
                            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap className="text-yellow-600" size={20} />
                                    <h3 className="font-semibold text-gray-900">Commissione Luce</h3>
                                </div>

                                {/* Modalità Selezione */}
                                <div className="mb-3">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setModalitaLuce('manuale')}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                                                modalitaLuce === 'manuale'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            Manuale
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setModalitaLuce('default')}
                                            disabled={!agenteCorrente?.commissioni_luce_default}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1 ${
                                                modalitaLuce === 'default'
                                                    ? 'bg-green-600 text-white'
                                                    : agenteCorrente?.commissioni_luce_default
                                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            <Settings size={14} />
                                            Default
                                        </button>
                                    </div>
                                </div>

                                {/* Input Commissione */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <DollarSign size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={commissioneLuce}
                                        onChange={(e) => setCommissioneLuce(e.target.value)}
                                        disabled={modalitaLuce === 'default'}
                                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                            modalitaLuce === 'default' 
                                                ? 'bg-gray-100 text-gray-600' 
                                                : 'border-gray-300'
                                        }`}
                                        placeholder="0.00"
                                        required={hasContrattiLuce}
                                    />
                                </div>

                                {modalitaLuce === 'default' && agenteCorrente?.commissioni_luce_default && (
                                    <p className="text-xs text-green-600 mt-1">
                                        Utilizzando commissione default: €{agenteCorrente.commissioni_luce_default}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Commissione Gas */}
                        {hasContrattiGas && (
                            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Flame className="text-blue-600" size={20} />
                                    <h3 className="font-semibold text-gray-900">Commissione Gas</h3>
                                </div>

                                {/* Modalità Selezione */}
                                <div className="mb-3">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setModalitaGas('manuale')}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                                                modalitaGas === 'manuale'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            Manuale
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setModalitaGas('default')}
                                            disabled={!agenteCorrente?.commissioni_gas_default}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1 ${
                                                modalitaGas === 'default'
                                                    ? 'bg-green-600 text-white'
                                                    : agenteCorrente?.commissioni_gas_default
                                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            <Settings size={14} />
                                            Default
                                        </button>
                                    </div>
                                </div>

                                {/* Input Commissione */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <DollarSign size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={commissioneGas}
                                        onChange={(e) => setCommissioneGas(e.target.value)}
                                        disabled={modalitaGas === 'default'}
                                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                            modalitaGas === 'default' 
                                                ? 'bg-gray-100 text-gray-600' 
                                                : 'border-gray-300'
                                        }`}
                                        placeholder="0.00"
                                        required={hasContrattiGas}
                                    />
                                </div>

                                {modalitaGas === 'default' && agenteCorrente?.commissioni_gas_default && (
                                    <p className="text-xs text-green-600 mt-1">
                                        Utilizzando commissione default: €{agenteCorrente.commissioni_gas_default}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Riepilogo */}
                    {agenteCorrente && (hasContrattiLuce || hasContrattiGas) && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Riepilogo Assegnazione</h4>
                            <div className="text-sm text-gray-700 space-y-1">
                                <p><strong>Agente:</strong> {agenteCorrente.nome} {agenteCorrente.cognome}</p>
                                {hasContrattiLuce && commissioneLuce && (
                                    <p><strong>Commissione Luce:</strong> €{commissioneLuce}</p>
                                )}
                                {hasContrattiGas && commissioneGas && (
                                    <p><strong>Commissione Gas:</strong> €{commissioneGas}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Pulsanti */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                        >
                            Conferma Assegnazione
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}