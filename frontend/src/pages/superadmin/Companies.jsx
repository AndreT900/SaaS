import { useState, useEffect } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Plus, Check, Search, Copy, ExternalLink, Loader2, X } from 'lucide-react';
import { motion } from 'framer-motion';

const Companies = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCompany, setNewCompany] = useState({ name: '', admin_email: '', plan: 'pro' });
    const [generatedLink, setGeneratedLink] = useState('');

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const res = await api.get('/superadmin/dashboard');
            // The dashboard endpoint returns the list of companies with stats
            setCompanies(res.data);
        } catch (err) {
            console.error("Failed to fetch companies", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Using BASIC plan default as per endpoint
            const res = await api.post('/superadmin/companies', {
                name: newCompany.name,
                email: newCompany.admin_email,
                mode: "managed"
            });
            console.log("Create Company Response:", res.data);
            setGeneratedLink(res.data.activation_link || "Link not found");
            fetchCompanies(); // Refresh list
        } catch (err) {
            console.error("Create Company Error:", err);
            alert(err.response?.data?.detail || err.message || "Error creating company");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        alert("Copiato!");
    };

    return (
        <DashboardLayout role="superadmin">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Companies</h1>
                    <p className="text-slate-400 mt-1">Manage tenant companies and activation links.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Company
                </button>
            </div>

            <div className="grid gap-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="bg-slate-950/50 text-slate-200 uppercase font-medium border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Company Name</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Created At</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {companies.map((company) => (
                                <tr key={company.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{company.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${company.status === 'active'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                            }`}>
                                            {company.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 capitalize">{company.plan || 'basic'}</td>
                                    <td className="px-6 py-4">{company.created_at ? new Date(company.created_at).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <button className="text-blue-400 hover:text-blue-300 font-medium">Manage</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Create New Company</h2>
                            <button
                                onClick={() => { setShowCreateModal(false); setGeneratedLink(''); }}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {!generatedLink ? (
                            <form onSubmit={handleCreateCompany} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-600 outline-none"
                                        value={newCompany.name}
                                        onChange={e => setNewCompany({ ...newCompany, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Admin Email</label>
                                    <input
                                        type="email"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-600 outline-none"
                                        value={newCompany.admin_email}
                                        onChange={e => setNewCompany({ ...newCompany, admin_email: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Link"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center gap-3">
                                    <Check className="w-5 h-5 shrink-0" />
                                    <div>
                                        <h3 className="font-bold">Company Created!</h3>
                                        <p className="text-sm opacity-90">Send this link to the admin to complete setup.</p>
                                    </div>
                                </div>

                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 break-all font-mono text-sm text-slate-300">
                                    {String(generatedLink)}
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        onClick={copyToClipboard}
                                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copy Link
                                    </button>
                                    <button
                                        onClick={() => { setShowCreateModal(false); setGeneratedLink(''); }}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Companies;
