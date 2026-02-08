'use client';

import React, { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    CheckCircle2,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { Task, User, PromptTemplate } from '@/types';
import { TaskDetailPanel } from '@/components/dashboard/TaskDetailPanel';
import { TaskList } from '@/components/dashboard/TaskList';
import { useUser } from '@/contexts/UserContext';


export default function TasksPage() {
    const { showToast, ToastComponent } = useToast();
    const { currentUser } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const taskIdParam = searchParams.get('task');

    const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [prompts, setPrompts] = useState<PromptTemplate[]>([]);

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

    const fetchPrompts = async () => {
        try {
            const res = await fetch('/api/prompts');
            if (res.ok) setPrompts(await res.json());
        } catch (error) {
            console.error("Failed to fetch prompts");
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchUsers();
        fetchPrompts();
    }, []);

    // Sync with URL param
    useEffect(() => {
        if (taskIdParam) {
            const task = tasks.find(t => t.id === taskIdParam);
            if (task) setSelectedTask(task);
        } else {
            setSelectedTask(null);
        }
    }, [taskIdParam, tasks]);

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
        router.push(`/tasks?task=${task.id}`);
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

            {/* Task Area */}
            {selectedTask ? (
                /* Split View Layout */
                <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-320px)] min-h-[500px] animate-in fade-in duration-300">
                    {/* Left: Compact Taks List */}
                    <div className="lg:w-[350px] flex flex-col gap-4 h-full overflow-hidden">
                        <div className="flex items-center justify-between px-1">
                            <button
                                onClick={() => router.push('/tasks')}
                                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                Back to Grid
                            </button>
                            <div className="text-xs text-muted-foreground">{filteredTasks.length} tasks</div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-card/50 rounded-xl border border-border/50 shadow-sm p-1">
                            <TaskList
                                tasks={filteredTasks}
                                isDataLoading={isLoading}
                                layoutMode="list"
                                selectedTaskId={selectedTask.id}
                                onTaskClick={handleTaskClick}
                            />
                        </div>
                    </div>

                    {/* Right: Task Detail Panel */}
                    <div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden h-full relative">
                        <TaskDetailPanel
                            task={selectedTask}
                            users={users}
                            promptTemplates={prompts}
                            onUpdate={handleTaskUpdate}
                            onDelete={(id) => {
                                handleTaskUpdate({ ...selectedTask, id: 'deleted' }); // dummy update to trigger list refresh
                                fetchTasks();
                                router.push('/tasks');
                            }}
                            onClose={() => router.push('/tasks')}
                        />
                    </div>
                </div>
            ) : (
                /* Grid View Layout */
                <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
                    <TaskList
                        tasks={filteredTasks}
                        isDataLoading={isLoading}
                        onTaskClick={handleTaskClick}
                        layoutMode="grid"
                    />
                </div>
            )}

            {ToastComponent}
        </div>
    );
}
