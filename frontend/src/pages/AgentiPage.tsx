/**
 * ════════════════════════════════════════════════════════════════════════════════
 * PAGINA GESTIONE AGENTI - Solo Super Admin
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, 
    UserPlus, 
    Edit, 
    Trash2, 
    Search, 
    TrendingUp, 
    DollarSign, 
    UserCheck,
    Phone,
    Mail,
    Building2,
    Eye,
    X,
    Save,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Agente {
    id: number;
    nome: string;
    cognome: string;
    email: string;
    telefono?: string;
    agency_name?: string;
    role: string;
    is_active: boolean;
    created_at: string;
    clienti_assegnati: number;
    commissioni_totali: number;
    commissioni_luce_default?: number;
    commissioni_gas_default?: number;
}

export default function AgentiPage() {
    const navigate = useNavigate();
    const [agenti, setAgenti] = useState<Agente[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAgente, setSelectedAgente] = useState<Agente | null>(null);
    const [formData, setFormData] = useState({
        nome: '',
        cognome: '',
        email: '',
        password: '',
        telefono: '',
        agency_name: '',
        role: 'agent',
        commissioni_luce_default: 0,
        commissioni_gas_default: 0
    });

    useEffect(() => {
        loadAgenti();
    }, []);

    const loadAgenti = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/agenti', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setAgenti(data.data);
            }
        } catch (error) {
            console.error('Errore caricamento agenti:', error);
            toast.error('Errore caricamento agenti');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAgente = async () => {
        if (!formData.nome || !formData.cognome || !formData.email || !formData.password) {
            toast.error('Compila tutti i campi obbligatori');
            return;
        }

        try {
            const response = await fetch('/api/agenti/quick-create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Agente creato con successo!');
                setShowCreateModal(false);
                resetForm();
                loadAgenti();
            } else {
                toast.error(data.message || 'Errore creazione agente');
            }
        } catch (error) {
            console.error('Errore:', error);
            toast.error('Errore durante la creazione');
        }
    };

    const handleEditAgente = async () => {
        if (!selectedAgente) return;

        try {
            const response = await fetch(`/api/agenti/${selectedAgente.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Agente aggiornato!');
                setShowEditModal(false);
                setSelectedAgente(null);
                resetForm();
                loadAgenti();
            } else {
                toast.error(data.message || 'Errore aggiornamento');
            }
        } catch (error) {
            console.error('Errore:', error);
            toast.error('Errore durante l\'aggiornamento');
        }
    };

    const handleDeleteAgent = async (id: number) => {
        if (!confirm('Sei sicuro di voler eliminare questo agente?')) return;
        
        try {
            const response = await fetch(`/api/agenti/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Agente eliminato');
                loadAgenti();
            }
        } catch (error) {
            console.error('Errore:', error);
            toast.error('Errore durante l\'eliminazione');
        }
    };

    const handleToggleActive = async (id: number, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/agenti/${id}/toggle-active`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Agente ${!currentStatus ? 'attivato' : 'disattivato'}`);
                loadAgenti();
            }
        } catch (error) {
            console.error('Errore:', error);
            toast.error('Errore durante l\'operazione');
        }
    };

    const openEditModal = (agente: Agente) => {
        setSelectedAgente(agente);
        setFormData({
            nome: agente.nome,
            cognome: agente.cognome,
            email: agente.email,
            password: '',
            telefono: agente.telefono || '',
            agency_name: agente.agency_name || '',
            role: agente.role,
            commissioni_luce_default: agente.commissioni_luce_default || 0,
            commissioni_gas_default: agente.commissioni_gas_default || 0
        });
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            nome: '',
            cognome: '',
            email: '',
            password: '',
            telefono: '',
            agency_name: '',
            role: 'agent',
            commissioni_luce_default: 0,
            commissioni_gas_default: 0
        });
    };

    const filteredAgenti = agenti.filter(a => 
        a.nome.toLowerCase().includes(search.toLowerCase()) ||
        a.cognome.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase())
    );

    // Statistiche
    const stats = {
        totale: agenti.length,
        attivi: agenti.filter(a => a.is_active).length,
        clientiTotali: agenti.reduce((sum, a) => sum + (a.clienti_assegnati || 0), 0),
        commissioniTotali: agenti.reduce((sum, a) => sum + (a.commissioni_totali || 0), 0)
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestione Agenti</h1>
                    <p className="text-gray-600 mt-1">Crea, modifica e gestisci gli agenti del sistema</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center gap-2 shadow-lg"
                >
                    <UserPlus size={20} />
                    Nuovo Agente
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Totale Agenti</p>
                            <h3 className="text-3xl font-bold mt-1">{stats.totale}</h3>
                        </div>
                        <Users size={40} className="opacity-80" />
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm">Agenti Attivi</p>
                            <h3 className="text-3xl font-bold mt-1">{stats.attivi}</h3>
                        </div>
                        <UserCheck size={40} className="opacity-80" />
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm">Clienti Assegnati</p>
                            <h3 className="text-3xl font-bold mt-1">{stats.clientiTotali}</h3>
                        </div>
                        <TrendingUp size={40} className="opacity-80" />
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-yellow-100 text-sm">Commissioni Totali</p>
                            <h3 className="text-3xl font-bold mt-1">€{stats.commissioniTotali.toFixed(2)}</h3>
                        </div>
                        <DollarSign size={40} className="opacity-80" />
                    </div>
                </div>
            </div>

            {/* Barra ricerca */}
            <div className="card">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Cerca agente per nome, cognome o email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input pl-10 w-full"
                    />
                </div>
            </div>

            {/* Tabella Agenti */}
            {loading ? (
                <div className="card text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-600">Caricamento agenti...</p>
                </div>
            ) : (
                <div className="card overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Agente</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contatti</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Agenzia</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Ruolo</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Clienti</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Commissioni</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Stato</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredAgenti.map((agente) => (
                                <tr key={agente.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                                {agente.nome[0]}{agente.cognome[0]}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">
                                                    {agente.nome} {agente.cognome}
                                                </div>
                                                <div className="text-xs text-gray-500">ID: {agente.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <Mail size={14} />
                                                {agente.email}
                                            </div>
                                            {agente.telefono && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Phone size={14} />
                                                    {agente.telefono}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {agente.agency_name ? (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Building2 size={14} className="text-purple-600" />
                                                {agente.agency_name}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                            agente.role === 'super_admin' ? 'bg-red-100 text-red-700' :
                                            agente.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {agente.role === 'super_admin' ? 'Super Admin' :
                                             agente.role === 'admin' ? 'Admin' : 'Agente'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold">
                                            <UserCheck size={14} />
                                            {agente.clienti_assegnati || 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full font-semibold">
                                            <DollarSign size={14} />
                                            €{(agente.commissioni_totali || 0).toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => navigate(`/agenti/${agente.id}/panoramica`)}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                            title="Visualizza panoramica"
                                        >
                                            Panoramica
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => openEditModal(agente)}
                                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                                                title="Modifica"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAgent(agente.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                                                title="Elimina"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredAgenti.length === 0 && (
                        <div className="text-center py-12">
                            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600">Nessun agente trovato</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Crea Agente */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold flex items-center gap-2">
                                    <UserPlus className="text-blue-600" />
                                    Crea Nuovo Agente
                                </h3>
                                <button
                                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nome *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.nome}
                                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                            className="input w-full"
                                            placeholder="Mario"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Cognome *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.cognome}
                                            onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                                            className="input w-full"
                                            placeholder="Rossi"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input w-full"
                                        placeholder="mario.rossi@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password *
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="input w-full"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Telefono
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.telefono}
                                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                        className="input w-full"
                                        placeholder="+39 123 456 7890"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Agenzia
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.agency_name}
                                        onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                                        className="input w-full"
                                        placeholder="Nome Agenzia"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Ruolo *
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="agent">Agente</option>
                                        <option value="admin">Admin</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>

                                {/* Commissioni Default */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Commissione Luce (€) Default
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.commissioni_luce_default}
                                            onChange={(e) => setFormData({ ...formData, commissioni_luce_default: parseFloat(e.target.value) || 0 })}
                                            className="input w-full"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Commissione Gas (€) Default
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.commissioni_gas_default}
                                            onChange={(e) => setFormData({ ...formData, commissioni_gas_default: parseFloat(e.target.value) || 0 })}
                                            className="input w-full"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleCreateAgente}
                                    className="flex-1 btn bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    Crea Agente
                                </button>
                                <button
                                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                                    className="btn btn-secondary"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Modifica Agente */}
            {showEditModal && selectedAgente && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold flex items-center gap-2">
                                    <Edit className="text-blue-600" />
                                    Modifica Agente
                                </h3>
                                <button
                                    onClick={() => { setShowEditModal(false); setSelectedAgente(null); resetForm(); }}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                                        <input
                                            type="text"
                                            value={formData.nome}
                                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                            className="input w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                                        <input
                                            type="text"
                                            value={formData.cognome}
                                            onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                                            className="input w-full"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nuova Password (lascia vuoto per non modificare)
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="input w-full"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                                    <input
                                        type="tel"
                                        value={formData.telefono}
                                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Agenzia</label>
                                    <input
                                        type="text"
                                        value={formData.agency_name}
                                        onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo *</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="agent">Agente</option>
                                        <option value="admin">Admin</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>

                                {/* Commissioni Default */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Commissione Luce (€) Default
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.commissioni_luce_default}
                                            onChange={(e) => setFormData({ ...formData, commissioni_luce_default: parseFloat(e.target.value) || 0 })}
                                            className="input w-full"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Commissione Gas (€) Default
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.commissioni_gas_default}
                                            onChange={(e) => setFormData({ ...formData, commissioni_gas_default: parseFloat(e.target.value) || 0 })}
                                            className="input w-full"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleEditAgente}
                                    className="flex-1 btn bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    Salva Modifiche
                                </button>
                                <button
                                    onClick={() => { setShowEditModal(false); setSelectedAgente(null); resetForm(); }}
                                    className="btn btn-secondary"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}




