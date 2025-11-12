/**
 * Modale Assegnazione Agente e Compenso
 * Si apre quando si cambia stato contratto da KO a Chiusa/Da attivare
 */

import { useState, useEffect } from 'react';
import { X, Users, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { agentiAPI } from '../services/api';

interface Props {
    onClose: () => void;
    onConfirm: (agenteId: string, commissione: number) => void;
    clienteId: string;
    clienteTipo: 'privato' | 'azienda';
    agenteAttualeId?: string | null;
    commissioneAttuale?: number | null;
}

export default function AssegnaAgenteCompensoModal({ 
    onClose, 
    onConfirm, 
    clienteId,
    clienteTipo,
    agenteAttualeId,
    commissioneAttuale 
}: Props) {
    const [agenti, setAgenti] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [agenteSelezionato, setAgenteSelezionato] = useState<string>(agenteAttualeId || '');
    const [commissione, setCommissione] = useState<string>(commissioneAttuale?.toString() || '');

    useEffect(() => {
        loadAgenti();
    }, []);

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
        
        if (!commissione || parseFloat(commissione) <= 0) {
            toast.error('Inserisci una commissione valida');
            return;
        }
        
        onConfirm(agenteSelezionato, parseFloat(commissione));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-blue-600" size={24} />
                        Assegnazione Agente e Compenso
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-800">
                            <strong>Cambio stato da KO a Chiusa/Da attivare</strong>
                            <br />
                            Per completare l'operazione, assegna un agente e definisci la commissione.
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
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

                    {/* Commissione Pattuita */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Commissione Pattuita (€) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign size={18} className="text-gray-400" />
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={commissione}
                                onChange={(e) => setCommissione(e.target.value)}
                                className="w-full pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="es. 150.00"
                                required
                            />
                        </div>
                        {commissioneAttuale && (
                            <p className="text-xs text-gray-500 mt-1">
                                Commissione attuale: €{commissioneAttuale.toFixed(2)}
                            </p>
                        )}
                    </div>

                    {/* Bottoni */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            disabled={loading}
                        >
                            Conferma e Salva
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

