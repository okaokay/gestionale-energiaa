/**
 * ════════════════════════════════════════════════════════════════════════════════
 * PAGINA PANORAMICA AGENTI - Dettagli Performance
 * ════════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, Building2, Users, TrendingUp, Euro, FileText, DollarSign, Zap, Flame, UserCheck } from 'lucide-react';
import AgentePagamenti from '@/components/AgentePagamenti';
import toast from 'react-hot-toast';

interface AgenteDettaglio {
    id: number;
    nome: string;
    cognome: string;
    email: string;
    telefono?: string;
    agency_name?: string;
    role: string;
    is_active: boolean;
    created_at: string;
    
    // Metriche performance
    clienti_assegnati: number;
    guadagno_mese_corrente: number;
    contratti_luce_attivi: number;
    contratti_gas_attivi: number;
    performance_mensile: number;
    nuovi_clienti_settimana: number;
    
    // Riepilogo contratti
    contratti_totali: number;
    contratti_luce: number;
    contratti_gas: number;
    
    // Commissioni
    commissioni_totali: number;
    commissioni_mese: number;
    commissioni_luce_default?: number;
    commissioni_gas_default?: number;
    
    // Clienti
    clienti_privati?: any[];
    clienti_aziende?: any[];
}

export default function AgentiPanoramicaPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [agente, setAgente] = useState<AgenteDettaglio | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (id) {
            loadAgenteDettaglio(id);
        }
    }, [id]);

    const loadAgenteDettaglio = async (agenteId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/agenti/${agenteId}/panoramica`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setAgente(data.data);
            } else {
                toast.error('Errore caricamento dettagli agente');
                navigate('/agenti');
            }
        } catch (error) {
            console.error('Errore caricamento agente:', error);
            toast.error('Errore caricamento agente');
            navigate('/agenti');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!agente) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">Agente non trovato</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con breadcrumb */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/agenti')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <span>Torna agli Agenti</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {agente.nome} {agente.cognome}
                    </h1>
                    <p className="text-gray-600 mt-1">Performance Mensile</p>
                </div>
            </div>

            {/* Informazioni Agente */}
            <div className="card">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {agente.nome[0]}{agente.cognome[0]}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {agente.nome} {agente.cognome}
                        </h2>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                                <Mail size={14} />
                                {agente.email}
                            </div>
                            {agente.telefono && (
                                <div className="flex items-center gap-1">
                                    <Phone size={14} />
                                    {agente.telefono}
                                </div>
                            )}
                            {agente.agency_name && (
                                <div className="flex items-center gap-1">
                                    <Building2 size={14} />
                                    {agente.agency_name}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            agente.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {agente.is_active ? '✓ Attivo' : '✗ Disattivo'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                            Sede Centrale
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs per organizzare il contenuto */}
            <div className="w-full">
                <div className="grid w-full grid-cols-2 bg-gray-100 rounded-lg p-1 mb-6">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'overview' 
                                ? 'bg-white text-gray-900 shadow-sm' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Panoramica
                    </button>
                    <button 
                        onClick={() => setActiveTab('payments')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            activeTab === 'payments' 
                                ? 'bg-white text-gray-900 shadow-sm' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Pagamenti
                    </button>
                </div>
                
                {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Commissioni Assegnate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-700">Commissioni Assegnate</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap size={16} className="text-yellow-500" />
                                <span className="text-sm">
                                    Luce: {agente.commissioni_luce_default ? `€${agente.commissioni_luce_default.toFixed(2)}` : 'Non assegnata'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Flame size={16} className="text-blue-500" />
                                <span className="text-sm">
                                    Gas: {agente.commissioni_gas_default ? `€${agente.commissioni_gas_default.toFixed(2)}` : 'Non assegnata'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metriche Principali */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Clienti Assegnati</p>
                            <h3 className="text-3xl font-bold mt-1">{agente.clienti_assegnati}</h3>
                        </div>
                        <Users size={40} className="opacity-80" />
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm">Guadagno Mese Corrente</p>
                            <h3 className="text-3xl font-bold mt-1">€{agente.guadagno_mese_corrente.toFixed(2)}</h3>
                        </div>
                        <DollarSign size={40} className="opacity-80" />
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-yellow-100 text-sm">Contratti Luce Attivi</p>
                            <h3 className="text-3xl font-bold mt-1">{agente.contratti_luce_attivi}</h3>
                        </div>
                        <Zap size={40} className="opacity-80" />
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-100 text-sm">Contratti Gas Attivi</p>
                            <h3 className="text-3xl font-bold mt-1">{agente.contratti_gas_attivi}</h3>
                        </div>
                        <Flame size={40} className="opacity-80" />
                    </div>
                </div>
            </div>

            {/* Performance Mensile e Acquisizione Clienti */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Performance Mensile */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="text-blue-600" size={20} />
                        <h3 className="text-lg font-semibold">Performance Mensile</h3>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                            +{agente.performance_mensile.toFixed(1)}%
                        </div>
                        <p className="text-gray-600 text-sm">Crescita rispetto al mese precedente</p>
                        <div className="mt-4 bg-gray-100 rounded-full h-2">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(agente.performance_mensile, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Guadagni e Commissioni */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <Euro className="text-green-600" size={20} />
                        <h3 className="text-lg font-semibold">Guadagni e Commissioni</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Commissioni Totali */}
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-700 mb-1">
                                €{agente.commissioni_totali?.toFixed(2) || '0.00'}
                            </div>
                            <p className="text-sm text-green-600">Commissioni Totali</p>
                        </div>
                        
                        {/* Guadagno Mese Corrente */}
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-blue-700 mb-1">
                                €{agente.guadagno_mese_corrente?.toFixed(2) || '0.00'}
                            </div>
                            <p className="text-sm text-blue-600">Guadagno Mese Corrente</p>
                        </div>
                    </div>
                    
                    {/* Dettagli Performance */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-semibold text-gray-700">
                                {agente.contratti_totali || 0}
                            </div>
                            <p className="text-xs text-gray-600">Contratti Totali</p>
                        </div>
                        
                        <div className="bg-yellow-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-semibold text-yellow-700">
                                {agente.contratti_luce || 0}
                            </div>
                            <p className="text-xs text-yellow-600">Contratti Luce</p>
                        </div>
                        
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-semibold text-blue-700">
                                {agente.contratti_gas || 0}
                            </div>
                            <p className="text-xs text-blue-600">Contratti Gas</p>
                        </div>
                    </div>
                    
                    {/* Indicatori Performance */}
                    <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Media Commissioni per Contratto</p>
                                <p className="text-lg font-bold text-green-600">
                                    €{agente.contratti_totali > 0 ? (agente.commissioni_totali / agente.contratti_totali).toFixed(2) : '0.00'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-700">Nuovi Clienti Settimana</p>
                                <p className="text-lg font-bold text-blue-600">{agente.nuovi_clienti_settimana || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Acquisizione Clienti */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <UserCheck className="text-green-600" size={20} />
                        <h3 className="text-lg font-semibold">Acquisizione Clienti</h3>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-green-600 mb-2">
                            {agente.nuovi_clienti_settimana}
                        </div>
                        <p className="text-gray-600 text-sm">Nuovi clienti questa settimana</p>
                        <div className="mt-4 flex justify-center">
                            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                                Nessun contatto trovato
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Riepilogo Contratti */}
            <div className="card">
                <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-purple-600" size={20} />
                    <h3 className="text-lg font-semibold">Riepilogo Contratti</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                            {agente.contratti_totali}
                        </div>
                        <p className="text-sm text-gray-600">Contratti Totali</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-700 mb-1">
                            {agente.contratti_luce}
                        </div>
                        <p className="text-sm text-yellow-600">Contratti Luce</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-700 mb-1">
                            {agente.contratti_gas}
                        </div>
                        <p className="text-sm text-blue-600">Contratti Gas</p>
                    </div>
                </div>
            </div>

            {/* Contatti Assegnati */}
            <div className="card">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="text-indigo-600" size={20} />
                    <h3 className="text-lg font-semibold">Contatti Assegnati</h3>
                </div>
                
                {((agente.clienti_privati?.length || 0) > 0 || (agente.clienti_aziende?.length || 0) > 0) ? (
                    <div className="space-y-4">
                        {/* Clienti Privati */}
                        {(agente.clienti_privati?.length || 0) > 0 && (
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">Clienti Privati ({agente.clienti_privati?.length || 0})</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {agente.clienti_privati?.map((cliente: any) => (
                                        <div key={cliente.id} className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-blue-600 font-semibold text-sm">
                                                        {cliente.nome?.[0]}{cliente.cognome?.[0]}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {cliente.nome} {cliente.cognome}
                                                    </p>
                                                    {cliente.email && (
                                                        <p className="text-sm text-gray-600 truncate">{cliente.email}</p>
                                                    )}
                                                    {cliente.telefono && (
                                                        <p className="text-sm text-gray-500">{cliente.telefono}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Clienti Aziende */}
                        {(agente.clienti_aziende?.length || 0) > 0 && (
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">Clienti Aziende ({agente.clienti_aziende?.length || 0})</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {agente.clienti_aziende?.map((cliente: any) => (
                                        <div key={cliente.id} className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                    <Building2 size={16} className="text-green-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {cliente.nome}
                                                    </p>
                                                    {cliente.email && (
                                                        <p className="text-sm text-gray-600 truncate">{cliente.email}</p>
                                                    )}
                                                    {cliente.telefono && (
                                                        <p className="text-sm text-gray-500">{cliente.telefono}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-6xl mb-4">👤</div>
                        <p className="text-gray-600 mb-2">Nessun contatto trovato</p>
                        <p className="text-sm text-gray-500">
                            Questo agente non ha ancora contatti assegnati.
                        </p>
                    </div>
                )}
            </div>
                </div>
                )}
                
                {activeTab === 'payments' && (
                    <AgentePagamenti agenteId={agente.id.toString()} />
                )}
            </div>
        </div>
    );
}