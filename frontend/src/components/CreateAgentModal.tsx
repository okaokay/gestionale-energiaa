/**
 * Modal per creazione rapida di un nuovo agente
 */

import React, { useState } from 'react';
import { X, UserPlus, Mail, Lock, Phone, Building } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newAgent: any) => void;
}

export default function CreateAgentModal({ isOpen, onClose, onSuccess }: CreateAgentModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nome: '',
        cognome: '',
        email: '',
        password: '',
        phone: '',
        agency_name: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.nome || !formData.cognome || !formData.email || !formData.password) {
            toast.error('Compila tutti i campi obbligatori');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('La password deve essere di almeno 6 caratteri');
            return;
        }

        try {
            setLoading(true);
            
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
                onSuccess(data.data);
                setFormData({
                    nome: '',
                    cognome: '',
                    email: '',
                    password: '',
                    phone: '',
                    agency_name: ''
                });
                onClose();
            } else {
                toast.error(data.message || 'Errore durante la creazione');
            }
        } catch (error) {
            console.error('Errore:', error);
            toast.error('Errore durante la creazione dell\'agente');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <UserPlus size={28} />
                            <h2 className="text-2xl font-bold">Crea Nuovo Agente</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Nome */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nome <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            className="input"
                            placeholder="Mario"
                            required
                        />
                    </div>

                    {/* Cognome */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Cognome <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.cognome}
                            onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                            className="input"
                            placeholder="Rossi"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="input pl-10"
                                placeholder="mario.rossi@agenzia.it"
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="input pl-10"
                                placeholder="Min. 6 caratteri"
                                minLength={6}
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Minimo 6 caratteri</p>
                    </div>

                    {/* Telefono */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Telefono
                        </label>
                        <div className="relative">
                            <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="input pl-10"
                                placeholder="+39 123 456 7890"
                            />
                        </div>
                    </div>

                    {/* Agenzia */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nome Agenzia
                        </label>
                        <div className="relative">
                            <Building size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={formData.agency_name}
                                onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                                className="input pl-10"
                                placeholder="Nome Agenzia"
                            />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            ℹ️ L'agente riceverà le credenziali via email e potrà accedere immediatamente al sistema.
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn btn-secondary"
                            disabled={loading}
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Creazione...
                                </>
                            ) : (
                                <>
                                    <UserPlus size={18} />
                                    Crea Agente
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


