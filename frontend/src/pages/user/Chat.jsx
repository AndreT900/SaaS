import { useState, useEffect, useRef } from 'react';
import api, { apiChat } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Send, Plus, Hash, Archive, Users, X, CheckSquare } from 'lucide-react';

const Chat = () => {
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newChatTitle, setNewChatTitle] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [companyUsers, setCompanyUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const { user } = useAuth();

    const fetchChats = async () => {
        try {
            setLoading(true);
            const res = await apiChat.get('/chats');
            setChats(res.data);
        } catch (err) {
            console.error("Failed to fetch chats", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (chatId) => {
        try {
            const res = await apiChat.get(`/chats/${chatId}/messages`);
            setMessages(res.data);
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    const fetchCompanyUsers = async () => {
        try {
            const res = await api.get('/users/directory');
            setCompanyUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch company users", err);
        }
    };

    useEffect(() => {
        fetchChats();
        fetchCompanyUsers();
    }, []);

    useEffect(() => {
        if (activeChat) {
            fetchMessages(activeChat.id);
            // Poll for new messages every 3 seconds
            const interval = setInterval(() => fetchMessages(activeChat.id), 3000);
            return () => clearInterval(interval);
        }
    }, [activeChat?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        try {
            await apiChat.post(`/chats/${activeChat.id}/messages`, { text: newMessage });
            setNewMessage('');
            fetchMessages(activeChat.id);
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    const handleCreateChat = async (e) => {
        e.preventDefault();
        try {
            if (selectedParticipants.length === 0) {
                alert("Please select at least one participant.");
                return;
            }
            await apiChat.post('/chats', {
                title: newChatTitle,
                participant_emails: selectedParticipants
            });
            setShowCreateModal(false);
            setNewChatTitle('');
            setSelectedParticipants([]);
            fetchChats();
        } catch (err) {
            alert(err.response?.data?.detail || "Error creating chat");
        }
    };

    const handleCloseChat = async (chatId) => {
        try {
            const res = await apiChat.post(`/chats/${chatId}/close`);
            alert(`Close status: ${res.data.status} (${res.data.approvals}/${res.data.required} approvals)`);
            fetchChats();
        } catch (err) {
            console.error("Failed to close chat", err);
        }
    };

    return (
        <DashboardLayout role="employee">
            <div className="flex h-[calc(100vh-120px)] gap-4">
                {/* Sidebar - Chat List */}
                <div className="w-72 bg-slate-900 border border-slate-800 rounded-xl flex flex-col">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white">Chats</h2>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {loading ? (
                            <p className="text-slate-500 text-sm p-4">Loading...</p>
                        ) : chats.length === 0 ? (
                            <p className="text-slate-500 text-sm p-4">No chats yet. Create one!</p>
                        ) : (
                            chats.map(chat => (
                                <button
                                    key={chat.id}
                                    onClick={() => setActiveChat(chat)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${activeChat?.id === chat.id
                                        ? 'bg-blue-600/20 text-blue-400'
                                        : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                >
                                    {chat.status === 'archived' ?
                                        <Archive className="w-4 h-4 text-slate-600 shrink-0" /> :
                                        <Hash className="w-4 h-4 text-slate-500 shrink-0" />
                                    }
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{chat.title}</div>
                                        {chat.last_message && (
                                            <div className="text-xs text-slate-500 truncate">{chat.last_message}</div>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col">
                    {activeChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-white font-semibold">{activeChat.title}</h3>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Users className="w-3 h-3" />
                                        {activeChat.participants?.length || 0} participants
                                    </div>
                                </div>
                                {activeChat.status !== 'archived' && (
                                    <button
                                        onClick={() => handleCloseChat(activeChat.id)}
                                        className="text-xs text-slate-400 hover:text-red-400 border border-slate-700 rounded px-2 py-1 transition-colors"
                                    >
                                        Request Close
                                    </button>
                                )}
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {messages.length === 0 ? (
                                    <p className="text-slate-500 text-sm text-center mt-10">No messages yet. Start the conversation!</p>
                                ) : (
                                    messages.map(msg => (
                                        <div key={msg.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                {msg.sender?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-white">{msg.sender}</span>
                                                    <span className="text-xs text-slate-600">
                                                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}
                                                    </span>
                                                </div>
                                                <p className="text-slate-300 text-sm mt-0.5">{msg.text}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            {activeChat.status !== 'archived' && (
                                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800">
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white p-2 rounded-lg transition-colors"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500">
                            <p>Select a chat or create a new one</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Chat Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">New Chat</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateChat} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Chat Title</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600"
                                    value={newChatTitle}
                                    onChange={e => setNewChatTitle(e.target.value)}
                                    placeholder="e.g. Project Alpha"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Participants</label>
                                <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-950 border border-slate-700 rounded-lg p-2">
                                    {companyUsers.filter(u => u.email !== user?.email).map(u => (
                                        <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-slate-900 rounded cursor-pointer transition-colors group">
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedParticipants.includes(u.email)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedParticipants(prev => [...prev, u.email]);
                                                    } else {
                                                        setSelectedParticipants(prev => prev.filter(email => email !== u.email));
                                                    }
                                                }}
                                            />
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedParticipants.includes(u.email) ? 'bg-blue-600 border-blue-600' : 'border-slate-600 bg-slate-800 group-hover:border-slate-500'}`}>
                                                {selectedParticipants.includes(u.email) ? <CheckSquare className="w-3 h-3 text-white" /> : <div />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white">{u.name}</div>
                                                {u.job_title && <div className="text-xs text-slate-500">{u.job_title}</div>}
                                            </div>
                                        </label>
                                    ))}
                                    {companyUsers.filter(u => u.email !== user?.email).length === 0 && (
                                        <p className="text-sm text-slate-500 text-center py-4">No other users in your company.</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Chat;
