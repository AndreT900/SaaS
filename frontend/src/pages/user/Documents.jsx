import { useState, useEffect } from 'react';
import { apiDocuments, apiAI } from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { FileText, Plus, Search, Trash2, Tag, Bot, X, Upload } from 'lucide-react';

const Documents = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newDoc, setNewDoc] = useState({ title: '', content: '', tags: '' });
    const [selectedDoc, setSelectedDoc] = useState(null);

    // AI Ask
    const [question, setQuestion] = useState('');
    const [aiAnswer, setAiAnswer] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await apiDocuments.get('/documents');
            setDocuments(res.data);
        } catch (err) {
            console.error("Failed to fetch documents", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleCreateDoc = async (e) => {
        e.preventDefault();
        try {
            const tags = newDoc.tags.split(',').map(t => t.trim()).filter(Boolean);
            await apiDocuments.post('/documents', {
                title: newDoc.title,
                content: newDoc.content,
                tags
            });
            setShowCreateModal(false);
            setNewDoc({ title: '', content: '', tags: '' });
            fetchDocuments();
        } catch (err) {
            alert(err.response?.data?.detail || "Error creating document");
        }
    };

    const handleViewDoc = async (docId) => {
        try {
            const res = await apiDocuments.get(`/documents/${docId}`);
            setSelectedDoc(res.data);
        } catch (err) {
            console.error("Failed to fetch document", err);
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!confirm("Delete this document?")) return;
        try {
            await apiDocuments.delete(`/documents/${docId}`);
            setSelectedDoc(null);
            fetchDocuments();
        } catch (err) {
            alert(err.response?.data?.detail || "Error deleting document");
        }
    };

    const handleAskAI = async (e) => {
        e.preventDefault();
        if (!question.trim()) return;

        setAiLoading(true);
        setAiAnswer('');
        try {
            // Build context from selected doc or all docs
            let context = '';
            if (selectedDoc) {
                context = `Document: ${selectedDoc.title}\n\n${selectedDoc.content}`;
            } else {
                context = documents.map(d => `[${d.title}]`).join(', ');
            }

            const res = await apiAI.post('/ask', {
                query: question,
                context: context
            });
            setAiAnswer(res.data.answer);
        } catch (err) {
            setAiAnswer("AI service unavailable. Make sure the AI Engine is running.");
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <DashboardLayout role="employee">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Documents</h1>
                    <p className="text-slate-400 mt-1">Company knowledge base and AI assistant.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Document
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Document List */}
                <div className="lg:col-span-2 space-y-3">
                    {loading ? (
                        <p className="text-slate-500">Loading...</p>
                    ) : documents.length === 0 ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                            <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-400">No documents yet. Add one to get started!</p>
                        </div>
                    ) : (
                        documents.map(doc => (
                            <div
                                key={doc.id}
                                onClick={() => handleViewDoc(doc.id)}
                                className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-colors ${selectedDoc?.id === doc.id
                                        ? 'border-blue-500'
                                        : 'border-slate-800 hover:border-slate-700'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                                        <div>
                                            <h3 className="text-white font-semibold">{doc.title}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                by {doc.uploaded_by} · {doc.size} chars
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                                        className="text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {doc.tags?.length > 0 && (
                                    <div className="flex gap-1.5 mt-2 flex-wrap">
                                        {doc.tags.map((tag, i) => (
                                            <span key={i} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded flex items-center gap-1">
                                                <Tag className="w-2.5 h-2.5" />{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Right Panel: Doc Preview + AI */}
                <div className="space-y-4">
                    {/* Doc Preview */}
                    {selectedDoc && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <h3 className="text-white font-semibold mb-2">{selectedDoc.title}</h3>
                            <div className="text-sm text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap bg-slate-950 rounded-lg p-3">
                                {selectedDoc.content}
                            </div>
                        </div>
                    )}

                    {/* AI Assistant */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Bot className="w-5 h-5 text-purple-400" />
                            <h3 className="text-white font-semibold">AI Assistant</h3>
                        </div>
                        <form onSubmit={handleAskAI} className="space-y-3">
                            <input
                                type="text"
                                value={question}
                                onChange={e => setQuestion(e.target.value)}
                                placeholder={selectedDoc ? `Ask about "${selectedDoc.title}"...` : "Ask about your documents..."}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-purple-600"
                            />
                            <button
                                type="submit"
                                disabled={aiLoading || !question.trim()}
                                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                {aiLoading ? 'Thinking...' : 'Ask AI'}
                            </button>
                        </form>
                        {aiAnswer && (
                            <div className="mt-3 text-sm text-slate-300 bg-slate-950 rounded-lg p-3 whitespace-pre-wrap">
                                {aiAnswer}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Document Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Add Document</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateDoc} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600"
                                    value={newDoc.title}
                                    onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Content</label>
                                <textarea
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600 h-40 resize-none"
                                    value={newDoc.content}
                                    onChange={e => setNewDoc({ ...newDoc, content: e.target.value })}
                                    placeholder="Paste or type document content..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-600"
                                    value={newDoc.tags}
                                    onChange={e => setNewDoc({ ...newDoc, tags: e.target.value })}
                                    placeholder="e.g. policy, hr, onboarding"
                                />
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

export default Documents;
