/**
 * Pagina gestione contratti luce e gas
 */

import { useEffect, useState } from 'react';
import { contrattiAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Zap, Flame } from 'lucide-react';

export default function ContrattiPage() {
    const [contrattiLuce, setContrattiLuce] = useState<any[]>([]);
    const [contrattiGas, setContrattiGas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tabAttiva, setTabAttiva] = useState<'luce' | 'gas'>('luce');
    
    useEffect(() => {
        loadContratti();
    }, []);
    
    const loadContratti = async () => {
        try {
            const [luceRes, gasRes] = await Promise.all([
                contrattiAPI.getLuce({ stato: 'attivo' }),
                contrattiAPI.getGas({ stato: 'attivo' }),
            ]);
            setContrattiLuce(luceRes.data.data);
            setContrattiGas(gasRes.data.data);
        } catch (error) {
            toast.error('Errore caricamento contratti');
        } finally {
            setLoading(false);
        }
    };
    
    const contratti = tabAttiva === 'luce' ? contrattiLuce : contrattiGas;
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Contratti</h1>
                <p className="text-gray-600 mt-1">Gestione contratti luce e gas</p>
            </div>
            
            {/* Tabs */}
            <div className="card">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setTabAttiva('luce')}
                        className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                            tabAttiva === 'luce'
                                ? 'text-primary-600 border-b-2 border-primary-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Zap size={18} />
                        Contratti Luce ({contrattiLuce.length})
                    </button>
                    <button
                        onClick={() => setTabAttiva('gas')}
                        className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                            tabAttiva === 'gas'
                                ? 'text-primary-600 border-b-2 border-primary-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Flame size={18} />
                        Contratti Gas ({contrattiGas.length})
                    </button>
                </div>
                
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : contratti.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Nessun contratto {tabAttiva} trovato</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornitore</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Contratto</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tabAttiva === 'luce' ? 'POD' : 'PDR'}</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prezzo</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadenza</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giorni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {contratti.map((contratto) => {
                                    const clienteNome = contratto.cliente_nome 
                                        ? `${contratto.cliente_nome} ${contratto.cliente_cognome || ''}`
                                        : contratto.azienda_nome;
                                    
                                    return (
                                        <tr key={contratto.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{clienteNome}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{contratto.fornitore}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{contratto.numero_contratto}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                                                {tabAttiva === 'luce' ? contratto.pod : contratto.pdr}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                €{(tabAttiva === 'luce' ? contratto.prezzo_energia : contratto.prezzo_gas).toFixed(4)}/{tabAttiva === 'luce' ? 'kWh' : 'Smc'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {new Date(contratto.data_scadenza).toLocaleDateString('it-IT')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    contratto.giorni_a_scadenza <= 7
                                                        ? 'bg-red-100 text-red-800'
                                                        : contratto.giorni_a_scadenza <= 30
                                                        ? 'bg-orange-100 text-orange-800'
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {contratto.giorni_a_scadenza} gg
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

