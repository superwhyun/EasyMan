import React from 'react';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/types';

interface TaskCardProps {
    task: Task;
    onClick?: (task: Task) => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
    const isOverdue = task.status !== 'Completed' && task.dueDate && new Date(task.dueDate) < new Date();

    return (
        <div
            onClick={() => onClick?.(task)}
            className={cn(
                "p-4 rounded-xl border transition-all group cursor-pointer active:scale-[0.98]",
                isOverdue
                    ? "bg-rose-50 border-red-200 hover:shadow-red-100 hover:shadow-md"
                    : "bg-background border-border hover:shadow-md"
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    task.priority === 'High' ? "bg-red-100 text-red-600" :
                        task.priority === 'Medium' ? "bg-orange-100 text-orange-600" :
                            "bg-blue-100 text-blue-600"
                )}>
                    {task.priority}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {task.status === 'Completed' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4" />}
                    {task.status}
                </div>
            </div>

            <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {task.title}
            </h3>

            {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">
                    {task.description}
                </p>
            )}
            {!task.description && <div className="h-8 mb-4" />}

            <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                        {task.assignee?.avatar || task.assignee?.name?.[0] || '?'}
                    </div>
                    <span className="text-xs text-muted-foreground">{task.assignee?.name || 'Unassigned'}</span>
                </div>
                {task.dueDate && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mt-4 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500",
                        task.status === 'Completed' ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: `${task.status === 'Completed' ? 100 : task.progress}%` }}
                />
            </div>
        </div>
    );
}
