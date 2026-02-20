import { useState, useEffect } from 'react';
import { apiCalendar } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { CalendarDays, Plus, Trash2, X } from 'lucide-react';

const Calendar = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newLeave, setNewLeave] = useState({ date: '', type: 'ferie' });

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            const res = await apiCalendar.get('/leaves');
            setLeaves(res.data);
        } catch (err) {
            console.error("Failed to fetch leaves", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, []);

    const handleRequestLeave = async (e) => {
        e.preventDefault();
        try {
            await apiCalendar.post('/leaves', newLeave);
            setShowModal(false);
            setNewLeave({ date: '', type: 'ferie' });
            fetchLeaves();
        } catch (err) {
            alert(err.response?.data?.detail || "Error requesting leave");
        }
    };

    const handleCancelLeave = async (leaveId) => {
        if (!confirm("Cancel this leave?")) return;
        try {
            await apiCalendar.delete(`/leaves/${leaveId}`);
            fetchLeaves();
        } catch (err) {
            console.error("Failed to cancel leave", err);
        }
    };

    // Build a simple calendar grid for the current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Map leaves by date for quick lookup
    const leavesByDate = {};
    leaves.forEach(l => { leavesByDate[l.date] = l; });

    const calendarDays = [];
    // Pad the start
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
        calendarDays.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        calendarDays.push({ day: d, date: dateStr, leave: leavesByDate[dateStr] || null });
    }

    return (
        <DashboardLayout role="employee">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Calendar</h1>
                    <p className="text-slate-400 mt-1">Manage your leaves and time off.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Request Leave
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4 capitalize">{monthName}</h2>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                        <div key={d} className="py-2 text-slate-500 font-semibold">{d}</div>
                    ))}
                    {calendarDays.map((cell, idx) => (
                        <div
                            key={idx}
                            className={`py-3 rounded-lg text-sm ${!cell
                                    ? ''
                                    : cell.leave
                                        ? cell.leave.type === 'ferie'
                                            ? 'bg-blue-600/20 text-blue-400 font-semibold'
                                            : 'bg-amber-600/20 text-amber-400 font-semibold'
                                        : cell.day === now.getDate()
                                            ? 'bg-slate-800 text-white ring-1 ring-blue-500'
                                            : 'text-slate-400 hover:bg-slate-800/50'
                                }`}
                        >
                            {cell?.day || ''}
                            {cell?.leave && (
                                <div className="text-[10px] mt-0.5 opacity-75">
                                    {cell.leave.type === 'ferie' ? '🏖' : '📋'}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Upcoming Leaves List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Your Leaves</h2>
                {loading ? (
                    <p className="text-slate-500 text-sm">Loading...</p>
                ) : leaves.length === 0 ? (
                    <p className="text-slate-500 text-sm">No leaves requested yet.</p>
                ) : (
                    <div className="space-y-2">
                        {leaves.map(leave => (
                            <div key={leave.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <CalendarDays className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <span className="text-white text-sm font-medium">{leave.date}</span>
                                        <span className={`ml-3 text-xs px-2 py-0.5 rounded ${leave.type === 'ferie'
                                                ? 'bg-blue-600/20 text-blue-400'
                                                : 'bg-amber-600/20 text-amber-400'
                                            }`}>
                                            {leave.type}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCancelLeave(leave.id)}
                                    className="text-slate-400 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Request Leave Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Request Leave</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleRequestLeave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600"
                                    value={newLeave.date}
                                    onChange={e => setNewLeave({ ...newLeave, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600"
                                    value={newLeave.type}
                                    onChange={e => setNewLeave({ ...newLeave, type: e.target.value })}
                                >
                                    <option value="ferie">Ferie (Holiday)</option>
                                    <option value="permesso">Permesso (Personal)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium">Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Calendar;
