import React, { useState, useEffect } from 'react';
import { Calendar, User as UserIcon, Flag, Save, Trash2, Clock, MessageSquare, X } from 'lucide-react';
import { Task, User, PromptTemplate } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { useUser } from '@/contexts/UserContext';

interface TaskDetailPanelProps {
    task: Task;
    users: User[];
    promptTemplates?: PromptTemplate[]; // Made optional to be safe
    onUpdate: (updatedTask: Task) => void;
    onDelete?: (taskId: string) => void;
    onClose?: () => void; // Optional close button for mobile/modal contexts
    className?: string;
}

export function TaskDetailPanel({ task, users, promptTemplates = [], onUpdate, onDelete, onClose, className }: TaskDetailPanelProps) {
    const { showToast } = useToast();
    const { currentUser } = useUser();
    const [formData, setFormData] = useState<Partial<Task>>({});
    const [isSaving, setIsSaving] = useState(false);

    const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
    const isEditable = isAdmin || (task.assigneeId === currentUser?.id);

    useEffect(() => {
        if (task) {
            setFormData({ ...task });
        }
    }, [task]);

    if (!task) return null;

    const handleChange = (field: keyof Task, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const data = await res.json();
                onUpdate(data.task);
                showToast('Task updated successfully', 'success');
            } else {
                showToast('Failed to update task', 'error');
            }
        } catch (error) {
            showToast('Connection error', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={cn("flex flex-col h-full bg-background", className)}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors md:hidden"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-1">Task Details</span>
                        <h2 className="text-lg font-bold text-foreground">#{task.id.slice(0, 8)}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isEditable && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors hidden md:block"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* Main Info */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Title</label>
                        <input
                            type="text"
                            value={formData.title || ''}
                            onChange={(e) => handleChange('title', e.target.value)}
                            disabled={!isEditable}
                            className="w-full text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 placeholder:text-muted-foreground/30 disabled:opacity-90"
                            placeholder="Enter task title..."
                        />
                    </div>

                    <div className="space-y-4 bg-muted/30 rounded-2xl p-6 border border-border/50">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Progress</label>
                            <span className="text-xl font-black text-primary">{formData.progress}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={formData.progress || 0}
                            onChange={(e) => handleChange('progress', parseInt(e.target.value))}
                            disabled={!isEditable}
                            className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                        />
                        <select
                            value={formData.status || 'Pending'}
                            onChange={(e) => handleChange('status', e.target.value)}
                            disabled={!isEditable}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Pending Approval">Pending Approval</option>
                            <option value="Overdue">Overdue</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <UserIcon className="w-3 h-3" /> Assignee
                            </label>
                            <select
                                value={formData.assigneeId || ''}
                                onChange={(e) => handleChange('assigneeId', e.target.value)}
                                disabled={!isAdmin}
                                className="w-full bg-muted/30 border-transparent rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 disabled:opacity-60 transition-all appearance-none"
                            >
                                <option value="">Unassigned</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Deadline
                            </label>
                            <input
                                type="date"
                                value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => handleChange('dueDate', e.target.value)}
                                disabled={!isEditable}
                                className="w-full bg-muted/30 border-transparent rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 disabled:opacity-60 transition-all font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Flag className="w-3 h-3" /> Priority Level
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['High', 'Medium', 'Low'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => isEditable && handleChange('priority', p)}
                                    className={cn(
                                        "py-2 rounded-lg text-[9px] font-black tracking-tight transition-all",
                                        formData.priority === p
                                            ? p === 'High' ? "bg-red-500 text-white shadow-md shadow-red-200" : p === 'Medium' ? "bg-orange-500 text-white shadow-md shadow-orange-200" : "bg-blue-500 text-white shadow-md shadow-blue-200"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    )}
                                >
                                    {p.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Instructions</label>
                    <textarea
                        value={formData.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        disabled={!isEditable}
                        className="w-full min-h-[150px] text-sm leading-relaxed text-foreground bg-muted/20 rounded-2xl p-4 border border-border/50 resize-none focus:ring-2 focus:ring-primary/10 focus:border-primary/50 disabled:opacity-90 transition-all"
                        placeholder="Describe the task in detail..."
                    />
                </div>

                <div className="space-y-4 pt-6 border-t border-border">
                    <label className="text-[10px] font-bold text-green-700 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" /> Cumulative Accomplishments
                    </label>
                    <textarea
                        value={formData.accomplishments || ''}
                        onChange={(e) => handleChange('accomplishments', e.target.value)}
                        disabled={!isEditable}
                        className="w-full min-h-[250px] text-sm font-medium text-green-900 bg-green-50/20 rounded-2xl p-6 border border-green-200/30 resize-none focus:ring-2 focus:ring-green-500/10 focus:border-green-500/50 transition-all whitespace-pre-wrap leading-relaxed"
                        placeholder="Accomplishments will be accumulated here..."
                    />
                </div>

                {/* Chat History Section */}
                <div className="space-y-4 pt-6 border-t border-border">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5" /> Chat History Logs
                        </label>
                        <span className="text-[9px] text-muted-foreground/60 italic font-medium">Auto-recorded from worker updates</span>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {(() => {
                            try {
                                const logs = JSON.parse(task.chatLog || '[]');
                                if (logs.length === 0) {
                                    return <div className="text-[10px] text-muted-foreground italic text-center py-6 bg-muted/10 rounded-xl border border-dashed border-border/50">No conversation history yet.</div>;
                                }
                                return logs.map((log: any, idx: number) => (
                                    <div key={idx} className={cn(
                                        "p-4 rounded-2xl text-[11px] leading-relaxed border shadow-sm transition-all hover:shadow-md",
                                        log.role === 'assistant'
                                            ? "bg-primary/5 border-primary/10 ml-6"
                                            : "bg-muted/10 border-border mr-6"
                                    )}>
                                        <div className="flex items-center justify-between mb-1.5 opacity-60">
                                            <span className="font-black uppercase text-[8px] tracking-tight">
                                                {log.role === 'assistant' ? 'EasyMan AI Secretary' : 'Task Worker'}
                                            </span>
                                        </div>
                                        <p className="whitespace-pre-wrap font-medium">{log.content}</p>
                                    </div>
                                ));
                            } catch (e) {
                                return <div className="text-[10px] text-destructive p-4 bg-red-50 rounded-xl border border-red-100">Error parsing chat logs.</div>;
                            }
                        })()}
                    </div>
                </div>

                {onDelete && isEditable && (
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to permanently delete this task?')) {
                                onDelete(task.id);
                                if (onClose) onClose();
                            }
                        }}
                        className="w-full py-3 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center justify-center gap-2 border border-red-100"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                    </button>
                )}
            </div>
        </div>
    );
}
