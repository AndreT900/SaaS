import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, CalendarDays, FileText, Users2, Sparkles, LayoutDashboard } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const AVAILABLE_SERVICES = [
    { id: 'chat', label: 'Chat', icon: MessageSquare, description: 'Communicate with your team.', path: '/chat' },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays, description: 'Manage your time and events.', path: '/calendar' },
    { id: 'documents', label: 'Documents', icon: FileText, description: 'Store and share files.', path: '/documents' },
    { id: 'meetings', label: 'Meetings', icon: Users2, description: 'Host and join meetings.', path: '/meetings' },
];

const Overview = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const allowedTools = user?.role === 'company_admin' || user?.role === 'superadmin'
        ? AVAILABLE_SERVICES.map(s => s.id)
        : (user?.allowed_tools || []);

    const toolsToDisplay = AVAILABLE_SERVICES.filter(service => allowedTools.includes(service.id));

    return (
        <DashboardLayout role={user?.role}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold border-b border-slate-800 pb-4 mb-4 text-white">
                    Welcome back, <span className="text-blue-400">{user?.name || 'User'}</span>!
                </h1>
                <p className="text-slate-400 text-lg">Here is the overview of your active tools and services.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {toolsToDisplay.map(tool => {
                    const Icon = tool.icon;
                    return (
                        <div
                            key={tool.id}
                            onClick={() => navigate(`/user${tool.path}`)}
                            className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all rounded-2xl p-6 cursor-pointer group hover:shadow-xl hover:shadow-blue-900/20 relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/10 transition-all">
                                    <Icon className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">{tool.label}</h3>
                                    <p className="text-sm text-slate-400">{tool.description}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center text-sm font-medium text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                                Launch application &rarr;
                            </div>
                        </div>
                    )
                })}
                {toolsToDisplay.length === 0 && (
                    <div className="col-span-full bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
                        <p className="text-slate-400">You don't have access to any tools yet. Contact your administrator.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Overview;
