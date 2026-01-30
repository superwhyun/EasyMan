import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Task } from '@/types';
import { TaskCard } from './TaskCard';

interface TaskListProps {
    tasks: Task[];
    isDataLoading: boolean;
    onTaskClick?: (task: Task) => void;
}

export function TaskList({ tasks, isDataLoading, onTaskClick }: TaskListProps) {
    return (
        <div className="flex flex-col flex-1 bg-card rounded-xl border border-border shadow-sm p-6 gap-4 z-0 overflow-hidden">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Recent Team Tasks</h2>
                <Link href="/tasks" className="text-sm font-medium text-primary hover:underline">View All</Link>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isDataLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="flex items-center justify-center h-48 border-2 border-dashed border-border rounded-lg bg-muted/10">
                        <div className="text-center space-y-2">
                            <p className="text-muted-foreground font-medium">No recent tasks</p>
                            <p className="text-xs text-muted-foreground/70">Use the AI input above to create new tasks.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tasks.map(task => (
                            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
