import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Building2,
    LogOut,
    Menu,
    X,
    MessageSquare,
    Calendar,
    FileText,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SidebarItem = ({ icon: Icon, label, path, active }) => (
    <Link to={path}>
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}>
            <Icon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
        </div>
    </Link>
);

const DashboardLayout = ({ children, role }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getMenuItems = () => {
        if (role === 'superadmin') {
            return [
                { icon: LayoutDashboard, label: 'Overview', path: '/superadmin' },
                { icon: Building2, label: 'Companies', path: '/superadmin/companies' },
            ];
        }
        if (role === 'company_admin') {
            return [
                { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
                { icon: Users, label: 'Users', path: '/admin/users' },
                { icon: Building2, label: 'Settings', path: '/admin/settings' },
            ];
        }

        // Employee: build menu dynamically from JWT allowed_tools
        const tools = user?.allowed_tools || [];
        const serviceMenuMap = {
            chat: { icon: MessageSquare, label: 'Chat', path: '/user/chat' },
            calendar: { icon: Calendar, label: 'Calendar', path: '/user/calendar' },
            documents: { icon: FileText, label: 'Documents', path: '/user/documents' },
        };

        const items = [
            { icon: LayoutDashboard, label: 'Overview', path: '/user' }
        ];
        tools.forEach(tool => {
            if (serviceMenuMap[tool]) items.push(serviceMenuMap[tool]);
        });

        return items;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex">
            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-violet-500 flex items-center justify-center font-bold text-white">
                        M
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Multitool
                    </span>
                </div>

                <nav className="flex-1 space-y-2">
                    {getMenuItems().map((item) => (
                        <SidebarItem
                            key={item.path}
                            icon={item.icon}
                            label={item.label}
                            path={item.path}
                            active={location.pathname === item.path}
                        />
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-medium text-slate-300">
                            {user?.name?.[0]?.toUpperCase() || user?.sub?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{user?.name || user?.role}</p>
                            <p className="text-xs text-slate-500 truncate capitalize">{role.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden h-16 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-400 hover:text-white">
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-lg">Multitool</span>
                    <div className="w-10" /> {/* Spacer */}
                </header>

                <main className="flex-1 p-6 lg:p-8 overflow-y-auto w-full">
                    {children}
                </main>

                {/* Floating AI Assistant Button */}
                <button
                    className="absolute bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center text-white hover:scale-105 hover:shadow-violet-500/50 transition-all z-50 group"
                    onClick={() => console.log('AI Assistant toggled')}
                    title="AI Assistant"
                >
                    <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
                </button>
            </div>
        </div>
    );
};

export default DashboardLayout;
