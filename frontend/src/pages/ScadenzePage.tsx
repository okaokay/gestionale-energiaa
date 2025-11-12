import { useEffect, useState } from 'react';
import { contrattiAPI } from '../services/api';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

export default function ScadenzePage() {
    const [scadenze, setScadenze] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [giorni, setGiorni] = useState(60);
    
    useEffect(() => {
        loadScadenze();
    }, [giorni]);
    
    const loadScadenze = async () => {
        try {
            const response = await contrattiAPI.getScadenze(giorni);
            setScadenze(response.data.data);
        } catch (error) {
            toast.error('Errore caricamento scadenze');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Scadenze Contratti</h1>
                    <p className="text-gray-600 mt-1">Monitoraggio contratti in scadenza</p>
                </div>
                <select className="input w-48" value={giorni} onChange={(e) => setGiorni(Number(e.target.value))}>
                    <option value={7}>Prossimi 7 giorni</option>
                    <option value={15}>Prossimi 15 giorni</option>
                    <option value={30}>Prossimi 30 giorni</option>
                    <option value={60}>Prossimi 60 giorni</option>
                    <option value={90}>Prossimi 90 giorni</option>
                </select>
            </div>
            
            <div className="card">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : scadenze.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle size={48} className="mx-auto text-green-500 mb-4" />
                        <p className="text-gray-500">Nessuna scadenza nei prossimi {giorni} giorni 🎉</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefono</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contratto</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornitore</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadenza</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giorni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {scadenze.map((scadenza, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {scadenza.nome} {scadenza.cognome}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{scadenza.email}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{scadenza.telefono}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                scadenza.tipo_contratto === 'luce' 
                                                    ? 'bg-yellow-100 text-yellow-800' 
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {scadenza.tipo_contratto.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{scadenza.fornitore}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {new Date(scadenza.data_scadenza).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                scadenza.giorni_a_scadenza <= 7
                                                    ? 'bg-red-500 text-white'
                                                    : scadenza.giorni_a_scadenza <= 15
                                                    ? 'bg-orange-500 text-white'
                                                    : scadenza.giorni_a_scadenza <= 30
                                                    ? 'bg-yellow-500 text-white'
                                                    : 'bg-green-500 text-white'
                                            }`}>
                                                {scadenza.giorni_a_scadenza} giorni
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

