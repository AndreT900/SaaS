import { useState, useEffect } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Plus, Search, Shield, Trash2, Settings, MessageSquare, CalendarDays, FileText, Users2 } from 'lucide-react';

const AVAILABLE_SERVICES = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'meetings', label: 'Meetings', icon: Users2 },
];

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [newUser, setNewUser] = useState({
        name: '', email: '', password: '', role: 'employee',
        job_title: '', allowed_tools: []
    });

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleServiceToggle = (serviceId) => {
        setNewUser(prev => {
            const current = prev.allowed_tools || [];
            const updated = current.includes(serviceId)
                ? current.filter(s => s !== serviceId)
                : [...current, serviceId];
            return { ...prev, allowed_tools: updated };
        });
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Error deleting user");
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const payload = {};
            if (editingUser.password) payload.password = editingUser.password;
            if (editingUser.role === 'employee') {
                payload.allowed_tools = editingUser.allowed_tools;
            } else {
                payload.allowed_tools = AVAILABLE_SERVICES.map(s => s.id);
            }

            await api.put(`/admin/users/${editingUser.id}`, payload);
            setShowEditModal(false);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Error updating user");
        }
    };

    const openEditModal = (user) => {
        setEditingUser({ ...user, password: '' });
        setShowEditModal(true);
    };

    const handleEditServiceToggle = (serviceId) => {
        setEditingUser(prev => {
            const current = prev.allowed_tools || [];
            const updated = current.includes(serviceId)
                ? current.filter(s => s !== serviceId)
                : [...current, serviceId];
            return { ...prev, allowed_tools: updated };
        });
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...newUser };
            if (!payload.email) delete payload.email;

            // Admins get all services, no need to send the list
            if (payload.role === 'company_admin') {
                delete payload.allowed_tools;
                delete payload.job_title;
            }

            await api.post('/admin/users', payload);
            setShowCreateModal(false);
            setNewUser({
                name: '', email: '', password: '', role: 'employee',
                job_title: '', allowed_tools: []
            });
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Error creating user");
        }
    };

    // Map service IDs to icons for the table
    const serviceIconMap = {
        chat: MessageSquare,
        calendar: CalendarDays,
        documents: FileText,
        meetings: Users2
    };

    return (
        <DashboardLayout role="company_admin">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Users</h1>
                    <p className="text-slate-400 mt-1">Manage employee access and roles.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add User
                </button>
            </div>

            {/* Filters/Search */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                </div>
            </div>

            <div className="grid gap-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-950/50 text-slate-200 uppercase font-medium border-b border-slate-800">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Services</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                                            {user.name ? user.name.charAt(0) : '?'}
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{user.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-3 h-3" />
                                        <span className="capitalize">{user.role.replace('_', ' ')}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-1.5">
                                        {(user.allowed_tools || []).map(tool => {
                                            const Icon = serviceIconMap[tool];
                                            return Icon ? (
                                                <span key={tool} title={tool} className="p-1 bg-slate-800 rounded text-slate-300">
                                                    <Icon className="w-3.5 h-3.5" />
                                                </span>
                                            ) : null;
                                        })}
                                        {(!user.allowed_tools || user.allowed_tools.length === 0) && (
                                            <span className="text-xs text-slate-600">No services</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'
                                        }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => openEditModal(user)} className="text-slate-400 hover:text-white" title="Settings">
                                        <Settings className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="text-slate-400 hover:text-red-400" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">Add User</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600"
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value, allowed_tools: [] })}
                                >
                                    <option value="employee">Employee</option>
                                    <option value="company_admin">Admin</option>
                                </select>
                            </div>

                            {newUser.role === 'employee' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Job Title</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600"
                                            placeholder="e.g. Developer, HR, Sales..."
                                            value={newUser.job_title || ''}
                                            onChange={e => setNewUser({ ...newUser, job_title: e.target.value })}
                                            required
                                        />
                                    </div>

                                    {/* Services Access */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Service Access</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {AVAILABLE_SERVICES.map(service => {
                                                const Icon = service.icon;
                                                const isSelected = (newUser.allowed_tools || []).includes(service.id);
                                                return (
                                                    <button
                                                        key={service.id}
                                                        type="button"
                                                        onClick={() => handleServiceToggle(service.id)}
                                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${isSelected
                                                            ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                                                            }`}
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                        {service.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {(newUser.allowed_tools || []).length === 0 && (
                                            <p className="text-xs text-amber-400 mt-1.5">⚠ Select at least one service</p>
                                        )}
                                    </div>
                                </>
                            )}

                            {newUser.role === 'company_admin' && (
                                <p className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-3">
                                    <Shield className="w-3.5 h-3.5 inline mr-1.5 text-blue-400" />
                                    Admins automatically get access to <strong className="text-slate-300">all services</strong>.
                                </p>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={newUser.role === 'employee' && (newUser.allowed_tools || []).length === 0}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">Edit access for {editingUser.name || 'User'}</h2>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">New Password (leave blank to keep current)</label>
                                <input
                                    type="password"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600"
                                    value={editingUser.password}
                                    onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                />
                            </div>

                            {editingUser.role === 'employee' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Service Access</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {AVAILABLE_SERVICES.map(service => {
                                            const Icon = service.icon;
                                            const isSelected = (editingUser.allowed_tools || []).includes(service.id);
                                            return (
                                                <button
                                                    key={service.id}
                                                    type="button"
                                                    onClick={() => handleEditServiceToggle(service.id)}
                                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${isSelected
                                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600'
                                                        }`}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    {service.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {(editingUser.allowed_tools || []).length === 0 && (
                                        <p className="text-xs text-amber-400 mt-1.5">⚠ Select at least one service</p>
                                    )}
                                </div>
                            )}

                            {editingUser.role === 'company_admin' && (
                                <p className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-3">
                                    <Shield className="w-3.5 h-3.5 inline mr-1.5 text-blue-400" />
                                    This user is an Admin and automatically has access to <strong className="text-slate-300">all services</strong>.
                                </p>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingUser(null);
                                    }}
                                    className="px-4 py-2 text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editingUser.role === 'employee' && (editingUser.allowed_tools || []).length === 0}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Users;
