'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface User {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  assigneeId?: string | null;
  assignee?: {
    name: string;
    avatar?: string | null;
  };
}

export default function ReportsPage() {
  const { showToast, ToastComponent } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, usersRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/users')
        ]);
        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (usersRes.ok) setUsers(await usersRes.json());
      } catch (error) {
        showToast("Failed to fetch reports data.", 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;

  const stats = [
    { label: 'Total Tasks', value: totalTasks, color: 'text-foreground', border: 'border-primary ring-1 ring-primary' },
    { label: 'Completed', value: completedTasks, color: 'text-green-600', border: 'border-border' },
    { label: 'In Progress', value: inProgressTasks, color: 'text-yellow-600', border: 'border-border' },
    { label: 'Pending', value: pendingTasks, color: 'text-muted-foreground', border: 'border-border' },
    { label: 'Overdue', value: overdueTasks, color: 'text-red-600', border: 'border-border' },
  ];

  // Group by Member
  const memberStats = users.map(user => {
    const userTasks = tasks.filter(t => t.assigneeId === user.id);
    return {
      ...user,
      stats: {
        total: userTasks.length,
        completed: userTasks.filter(t => t.status === 'Completed').length,
        inProgress: userTasks.filter(t => t.status === 'In Progress').length,
        pending: userTasks.filter(t => t.status === 'Pending').length,
        overdue: userTasks.filter(t => t.status === 'Overdue').length,
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
          <div key={idx} className={cn("bg-card p-6 rounded-xl border flex flex-col gap-3 shadow-sm", stat.border)}>
            <span className="text-xs font-semibold text-muted-foreground">{stat.label}</span>
            <span className={cn("text-3xl font-bold font-mono", stat.color)}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Task List Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Recent Task Breakdown</h2>
        </div>
        {/* Table Header */}
        <div className="hidden md:flex items-center px-5 py-3 bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <div className="w-[30%]">TASK</div>
          <div className="w-[20%]">ASSIGNEE</div>
          <div className="w-[15%]">STATUS</div>
          <div className="w-[15%]">DUE DATE</div>
          <div className="flex-1">PROGRESS</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border overflow-y-auto max-h-[400px]">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No task data available.</div>
          ) : tasks.map((task) => (
            <div key={task.id} className="flex flex-col md:flex-row md:items-center px-5 py-4 hover:bg-muted/30 transition-colors gap-3 md:gap-0">
              <div className="md:w-[30%] font-semibold text-sm text-foreground truncate">{task.title}</div>
              <div className="md:w-[20%] flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold uppercase overflow-hidden">
                  {task.assignee?.avatar || task.assignee?.name?.[0] || '?'}
                </div>
                <span className="text-sm text-foreground truncate">{task.assignee?.name || 'Unassigned'}</span>
              </div>
              <div className="md:w-[15%]">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                  task.status === 'Completed' ? "bg-green-100 text-green-700" :
                    task.status === 'In Progress' ? "bg-yellow-100 text-yellow-700" :
                      task.status === 'Overdue' ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                )}>
                  {task.status}
                </span>
              </div>
              <div className="md:w-[15%] text-xs text-muted-foreground">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '-'}
              </div>
              <div className="flex-1 flex items-center gap-3">
                <div className="h-1.5 w-full max-w-[120px] bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      task.status === 'Completed' ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: `${task.status === 'Completed' ? 100 : task.progress}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold font-mono">
                  {task.status === 'Completed' ? 100 : task.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

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

