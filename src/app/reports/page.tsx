'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Task, User, PromptTemplate } from '@/types';
import { TaskList } from '@/components/dashboard/TaskList';
import { TaskDetailPanel } from '@/components/dashboard/TaskDetailPanel';

// Types moved to @/types

export default function ReportsPage() {
  const { showToast, ToastComponent } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get('task');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'Completed' | 'In Progress' | 'Pending' | 'Overdue'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, usersRes, promptsRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/users'),
          fetch('/api/prompts')
        ]);
        if (tasksRes.ok) {
          const fetchedTasks = await tasksRes.json();
          setTasks(fetchedTasks);
        }
        if (usersRes.ok) setUsers(await usersRes.json());
        if (promptsRes.ok) setPrompts(await promptsRes.json());
      } catch (error) {
        showToast("Failed to fetch reports data.", 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Sync selectedTask with URL param
  useEffect(() => {
    if (taskIdParam) {
      const task = tasks.find(t => t.id === taskIdParam);
      if (task) setSelectedTask(task);
    } else {
      setSelectedTask(null);
    }
  }, [taskIdParam, tasks]);

  const handleTaskClick = (task: Task) => {
    router.push(`/reports?task=${task.id}`);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
  };

  // Calculate Stats
  const totalTasks = tasks.length;
  const now = new Date();

  const isOverdue = (t: Task) =>
    t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < now;

  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress' && !isOverdue(t)).length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending' && !isOverdue(t)).length;
  const overdueTasks = tasks.filter(isOverdue).length;

  const stats = [
    { label: 'Total Tasks', value: totalTasks, filter: 'all' as const, color: 'text-foreground', border: 'border-primary ring-1 ring-primary' },
    { label: 'Completed', value: completedTasks, filter: 'Completed' as const, color: 'text-green-600', border: 'border-border' },
    { label: 'In Progress', value: inProgressTasks, filter: 'In Progress' as const, color: 'text-yellow-600', border: 'border-border' },
    { label: 'Pending', value: pendingTasks, filter: 'Pending' as const, color: 'text-muted-foreground', border: 'border-border' },
    { label: 'Overdue', value: overdueTasks, filter: 'Overdue' as const, color: 'text-red-600', border: 'border-border' },
  ];

  const filteredTasks = tasks.filter(task => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'Overdue') return isOverdue(task);
    // For specific statuses, exclude overdue items from them (except Completed) so they don't double dip visual logic if needed,
    // though usually "Pending" that is overdue is effectively "Overdue". 
    // Let's mirror the stats logic:
    if (activeFilter === 'Completed') return task.status === 'Completed';
    // For In Progress and Pending, we want them only if NOT overdue (since Overdue is a separate filter)
    return task.status === activeFilter && !isOverdue(task);
  });

  // Group by Member
  const memberStats = users.map(user => {
    const userTasks = tasks.filter(t => t.assigneeId === user.id);
    return {
      ...user,
      stats: {
        total: userTasks.length,
        completed: userTasks.filter(t => t.status === 'Completed').length,
        inProgress: userTasks.filter(t => t.status === 'In Progress' && !isOverdue(t)).length,
        pending: userTasks.filter(t => t.status === 'Pending' && !isOverdue(t)).length,
        overdue: userTasks.filter(t => isOverdue(t)).length,
      }
    };
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Generating reports...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-8 gap-6 max-w-6xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            onClick={() => setActiveFilter(stat.filter)}
            className={cn(
              "bg-card p-6 rounded-xl border flex flex-col gap-3 shadow-sm cursor-pointer transition-all hover:shadow-md",
              activeFilter === stat.filter ? "ring-2 ring-primary border-primary bg-primary/5" : stat.border
            )}
          >
            <span className="text-xs font-semibold text-muted-foreground">{stat.label}</span>
            <span className={cn("text-3xl font-bold font-mono", stat.color)}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Task List Section */}
      {selectedTask ? (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-400px)] min-h-[500px] animate-in fade-in duration-300">
          {/* Left: Compact List */}
          <div className="lg:w-[350px] flex flex-col gap-4 h-full overflow-hidden">
            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => router.push('/reports')}
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

          {/* Right: Detailed Panel */}
          <div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden h-full relative">
            <TaskDetailPanel
              task={selectedTask}
              users={users}
              promptTemplates={prompts}
              onUpdate={handleTaskUpdate}
              onClose={() => router.push('/reports')}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Recent Task Breakdown {activeFilter !== 'all' && <span className="font-normal text-muted-foreground ml-1">- {activeFilter}</span>}
            </h2>
            <span className="text-xs text-muted-foreground">Showing {filteredTasks.length} tasks</span>
          </div>
          <TaskList
            tasks={filteredTasks}
            isDataLoading={isLoading}
            onTaskClick={handleTaskClick}
            layoutMode="grid"
          />
        </div>
      )}

      {/* Team Members Overview */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-foreground">Team Performance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberStats.map((member) => (
            <div key={member.id} className="bg-card p-5 rounded-xl border border-border shadow-sm flex flex-col gap-5 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-base font-bold uppercase">
                  {member.avatar || member.name[0]}
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-foreground">{member.name}</span>
                  <span className="text-xs text-muted-foreground">{member.role}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total Tasks</span>
                  <span className="font-bold font-mono">{member.stats.total}</span>
                </div>
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${member.stats.total > 0 ? (member.stats.completed / member.stats.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-y-2 mt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[10px] text-muted-foreground">Done: <span className="font-bold text-foreground">{member.stats.completed}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-[10px] text-muted-foreground">Doing: <span className="font-bold text-foreground">{member.stats.inProgress}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] text-muted-foreground">Due!: <span className="font-bold text-foreground">{member.stats.overdue}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <span className="text-[10px] text-muted-foreground">Wait: <span className="font-bold text-foreground">{member.stats.pending}</span></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {ToastComponent}
    </div>
  );
}

