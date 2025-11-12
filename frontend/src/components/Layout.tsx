/**
 * Layout principale con sidebar e navbar
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
    Home, Users, FileText, Calendar, Zap, Mail, LogOut, Menu, X,
    TrendingUp, Bell, Euro, UserCheck
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    
    // 🔐 Menu items filtrati per ruolo
    const allMenuItems = [
        { path: '/', icon: Home, label: 'Dashboard', roles: ['super_admin', 'admin', 'operatore'] },
        { path: '/clienti', icon: Users, label: 'Clienti', roles: ['super_admin', 'admin', 'operatore'] },
        { path: '/agenti', icon: UserCheck, label: 'Agenti', roles: ['super_admin', 'admin'] }, // ❌ Nascosto per operatori
        { path: '/contratti', icon: FileText, label: 'Contratti', roles: ['super_admin', 'admin', 'operatore'] },
        { path: '/scadenze', icon: Calendar, label: 'Scadenze', roles: ['super_admin', 'admin', 'operatore'] },
        { path: '/offerte', icon: Zap, label: 'Offerte & AI', roles: ['super_admin', 'admin'] }, // ❌ Nascosto per operatori
        { path: '/email-marketing', icon: Mail, label: 'Email Marketing', roles: ['super_admin', 'admin', 'operatore'] },
        { path: '/contabilita', icon: Euro, label: 'Contabilità', roles: ['super_admin', 'admin'] }, // ❌ Nascosto per operatori
    ];
    
    // Filtra menu items in base al ruolo
    const menuItems = allMenuItems.filter(item => 
        item.roles.includes(user?.ruolo || '')
    );
    
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200">
                <div className="px-3 py-3 lg:px-5 lg:pl-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center justify-start">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 text-gray-600 rounded-lg hover:bg-gray-100"
                            >
                                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                            <span className="ml-3 text-xl font-semibold text-gray-900">
                                ⚡ Gestionale Energia
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button className="p-2 text-gray-600 rounded-lg hover:bg-gray-100 relative">
                                <Bell size={20} />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                            
                            <div className="flex items-center gap-2">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                        {user?.nome} {user?.cognome}
                                    </p>
                                    <p className="text-xs text-gray-500 capitalize">
                                        {user?.ruolo.replace('_', ' ')}
                                    </p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-600 rounded-lg hover:bg-gray-100"
                                    title="Logout"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            
            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform bg-white border-r border-gray-200 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="h-full px-3 pb-4 overflow-y-auto">
                    <ul className="space-y-2 font-medium">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            
                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        className={`flex items-center p-2 rounded-lg transition-colors ${
                                            isActive
                                                ? 'bg-primary-50 text-primary-600'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Icon size={20} />
                                        <span className="ml-3">{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </aside>
            
            {/* Main content */}
            <div className={`p-6 pt-20 transition-all ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
                <div className="w-full h-full">
                    {children}
                </div>
            </div>
        </div>
    );
}

