'use client';

import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    AlertCircle,
    MoreHorizontal,
    Trash2,
    Loader2,
    ChevronRight,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Task, User } from '@/types';
import { TaskDetailModal } from '@/components/dashboard/TaskDetailModal';
import { useUser } from '@/contexts/UserContext';


export default function TasksPage() {
    const { showToast, ToastComponent } = useToast();
    const { currentUser } = useUser();
    const isAdmin = currentUser?.role === 'Admin';
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [users, setUsers] = useState<User[]>([]);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/tasks');
            if (res.ok) {
                setTasks(await res.json());
            }
        } catch (error) {
            showToast('Failed to fetch tasks.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) setUsers(await res.json());
        } catch (error) {
            console.error("Failed to fetch users");
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchUsers();
    }, []);

    const handleUpdateStatus = async (taskId: string, currentStatus: string) => {
        const nextStatusMap: Record<string, string> = {
            'Pending': 'In Progress',
            'In Progress': 'Completed',
            'Completed': 'Pending',
            'Overdue': 'In Progress'
        };
        const newStatus = nextStatusMap[currentStatus] || 'Pending';
        const newProgress = newStatus === 'Completed' ? 100 : (newStatus === 'In Progress' ? 50 : 0);

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, progress: newProgress }),
            });
            if (res.ok) {
                showToast(`Task marked as ${newStatus}`, 'success');
                fetchTasks();
            }
        } catch (error) {
            showToast('Failed to update task.', 'error');
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Task deleted successfully', 'info');
                fetchTasks();
            }
        } catch (error) {
            showToast('Failed to delete task.', 'error');
        }
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setIsDetailOpen(true);
    };

    const handleTaskUpdate = (updatedTask: Task) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        setSelectedTask(updatedTask);
    };

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex flex-col h-full p-8 gap-6 max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">All Tasks</h1>
                    <p className="text-sm text-muted-foreground">Manage and track your team's progress</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm min-w-[120px]"
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Overdue">Overdue</option>
                    </select>
                </div>
            </div>

            {/* Task Table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground font-medium">No tasks found</p>
                        <p className="text-sm text-muted-foreground/60">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Task Details</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Assignee</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status & Progress</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Due Date</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right italic">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredTasks.map((task) => (
                                    <tr
                                        key={task.id}
                                        onClick={() => handleTaskClick(task)}
                                        className="hover:bg-muted/30 transition-colors group cursor-pointer active:scale-[0.99]"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5 py-1">
                                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{task.title}</span>
                                                {task.description && (
                                                    <span className="text-xs text-muted-foreground line-clamp-1">{task.description}</span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground/50 font-mono">ID: {task.id.slice(0, 8)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold overflow-hidden border border-border">
                                                    {task.assignee?.avatar || task.assignee?.name?.[0] || '?'}
                                                </div>
                                                <span className="text-sm text-foreground">{task.assignee?.name || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                task.priority === 'High' ? "bg-red-100 text-red-600" :
                                                    task.priority === 'Medium' ? "bg-orange-100 text-orange-600" :
                                                        "bg-blue-100 text-blue-600"
                                            )}>
                                                {task.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2 min-w-[140px]">
                                                {(() => {
                                                    const isTaskEditable = isAdmin;
                                                    return (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!isTaskEditable) return;
                                                                handleUpdateStatus(task.id, task.status);
                                                            }}
                                                            disabled={!isTaskEditable}
                                                            className={cn(
                                                                "flex items-center gap-1.5 text-xs font-medium transition-colors w-fit",
                                                                isTaskEditable ? "hover:text-primary cursor-pointer" : "text-muted-foreground cursor-not-allowed opacity-60"
                                                            )}
                                                        >
                                                            {task.status === 'Completed' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                                                                task.status === 'Overdue' ? <AlertCircle className="w-4 h-4 text-red-500" /> :
                                                                    <Clock className="w-4 h-4 text-orange-400" />}
                                                            {task.status}
                                                            {isTaskEditable && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
                                                        </button>
                                                    );
                                                })()}
                                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-500",
                                                            task.status === 'Completed' ? "bg-green-500" : "bg-primary"
                                                        )}
                                                        style={{ width: `${task.status === 'Completed' ? 100 : task.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="w-4 h-4" />
                                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {(() => {
                                                const isTaskEditable = isAdmin;
                                                return isTaskEditable ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteTask(task.id);
                                                        }}
                                                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <div className="p-2 text-muted-foreground/20">
                                                        <Trash2 className="w-4 h-4" />
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {ToastComponent}

            <TaskDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                task={selectedTask}
                users={users}
                onUpdate={handleTaskUpdate}
                onDelete={(taskId) => {
                    setIsDetailOpen(false);
                    handleDeleteTask(taskId);
                }}
            />
        </div>
    );
}
