import { useEffect, useMemo, useState } from 'react';
import { contrattiAPI } from '../services/api';
import toast from 'react-hot-toast';
import { AlertCircle, Mail, Eye, Filter, SortAsc, SortDesc, CheckSquare, Square } from 'lucide-react';

export default function ScadenzePage() {
    const [scadenze, setScadenze] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [giorni, setGiorni] = useState<string>('60');
    const [tipo, setTipo] = useState<'tutti' | 'luce' | 'gas'>('tutti');
    const [fornitore, setFornitore] = useState('');
    const [sortAsc, setSortAsc] = useState(true);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    
    useEffect(() => {
        loadScadenze();
    }, [giorni]);
    
    const loadScadenze = async () => {
        try {
            const soloScaduti = giorni === 'scaduti';
            const giorniNum = soloScaduti ? undefined : Number(giorni);
            const response = await contrattiAPI.getScadenze(giorniNum, soloScaduti);
            setScadenze(response.data.data);
            setSelected({});
        } catch (error) {
            toast.error('Errore caricamento scadenze');
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        let list = scadenze;
        if (tipo !== 'tutti') list = list.filter(s => s.tipo_contratto === tipo);
        if (fornitore.trim()) list = list.filter(s => (s.fornitore || '').toLowerCase().includes(fornitore.toLowerCase()));
        list = [...list].sort((a, b) => (sortAsc ? a.giorni_a_scadenza - b.giorni_a_scadenza : b.giorni_a_scadenza - a.giorni_a_scadenza));
        return list;
    }, [scadenze, tipo, fornitore, sortAsc]);

    const toggleSelectAll = () => {
        if (Object.keys(selected).length === filtered.length) {
            setSelected({});
        } else {
            const all: Record<string, boolean> = {};
            filtered.forEach(s => { all[`${s.tipo_contratto}-${s.id}`] = true; });
            setSelected(all);
        }
    };

    const toggleSelected = (key: string) => {
        setSelected(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleBulkEmail = async () => {
        const items = filtered.filter(s => selected[`${s.tipo_contratto}-${s.id}`]);
        if (items.length === 0) {
            toast.error('Seleziona almeno un contratto');
            return;
        }
        try {
            for (const s of items) {
                await contrattiAPI.sendScadenzaEmail(s.tipo_contratto, s.id, 'default');
            }
            toast.success(`Email inviate: ${items.length}`);
        } catch {
            toast.error('Errore invio email');
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Scadenze Contratti</h1>
                    <p className="text-gray-600 mt-1">Monitoraggio contratti in scadenza</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-gray-500" />
                        <select className="input w-40" value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
                            <option value="tutti">Tutti</option>
                            <option value="luce">Luce</option>
                            <option value="gas">Gas</option>
                        </select>
                    </div>
                    <input 
                        className="input w-52" 
                        placeholder="Fornitore..." 
                        value={fornitore} 
                        onChange={(e) => setFornitore(e.target.value)}
                    />
                    <select className="input w-44" value={giorni} onChange={(e) => setGiorni(e.target.value)}>
                        <option value="scaduti">Solo scaduti</option>
                        <option value={7}>Prossimi 7 giorni</option>
                        <option value={15}>Prossimi 15 giorni</option>
                        <option value={30}>Prossimi 30 giorni</option>
                        <option value={60}>Prossimi 60 giorni</option>
                        <option value={90}>Prossimi 90 giorni</option>
                    </select>
                    <button 
                        className="btn btn-secondary flex items-center gap-2"
                        onClick={() => setSortAsc(s => !s)}
                        title="Ordina per giorni"
                    >
                        {sortAsc ? <SortAsc size={18} /> : <SortDesc size={18} />}
                        Ordina
                    </button>
                    <button 
                        className="btn btn-primary flex items-center gap-2"
                        onClick={handleBulkEmail}
                    >
                        <Mail size={18} />
                        Email selezionati
                    </button>
                </div>
            </div>
            
            <div className="card">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : scadenze.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle size={48} className="mx-auto text-green-500 mb-4" />
                        <p className="text-gray-500">
                            {giorni === 'scaduti' ? 'Nessun contratto scaduto 🎉' : `Nessuna scadenza nei prossimi ${giorni} giorni 🎉`}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">
                                        <button onClick={toggleSelectAll} className="text-gray-600">
                                            {Object.keys(selected).length === filtered.length && filtered.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefono</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contratto</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornitore</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scadenza</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giorni</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filtered.map((scadenza) => {
                                    const key = `${scadenza.tipo_contratto}-${scadenza.id}`;
                                    const nome = scadenza.cliente_nome || scadenza.azienda_nome || '';
                                    const email = scadenza.cliente_email || scadenza.azienda_email || '';
                                    const telefono = scadenza.telefono || '';
                                    const isUrgente = scadenza.giorni_a_scadenza <= 7;
                                    const isAttenzione = scadenza.giorni_a_scadenza > 7 && scadenza.giorni_a_scadenza <= 30;
                                    const giorniClass = scadenza.giorni_a_scadenza <= 0
                                        ? 'bg-red-500 text-white'
                                        : isUrgente
                                            ? 'bg-red-500 text-white'
                                            : isAttenzione
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-green-500 text-white';
                                    return (
                                    <tr key={key} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <button onClick={() => toggleSelected(key)} className={`text-gray-700`}>
                                                {selected[key] ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {nome || 'N/D'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{email || 'N/D'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{telefono || 'N/D'}</td>
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
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${giorniClass}`}>
                                                {scadenza.giorni_a_scadenza <= 0 ? `SCADUTO` : `${scadenza.giorni_a_scadenza} giorni`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm flex items-center gap-2">
                                            <button
                                                className="btn btn-secondary btn-sm flex items-center gap-1"
                                                onClick={() => contrattiAPI.sendScadenzaEmail(scadenza.tipo_contratto, scadenza.id, 'default').then(() => toast.success('Email inviata')).catch(() => toast.error('Errore invio email'))}
                                            >
                                                <Mail size={16} /> Email
                                            </button>
                                            <a
                                                className="btn btn-outline btn-sm flex items-center gap-1"
                                                href={`/clienti/${scadenza.cliente_privato_id || scadenza.cliente_azienda_id}`}
                                            >
                                                <Eye size={16} /> Cliente
                                            </a>
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

