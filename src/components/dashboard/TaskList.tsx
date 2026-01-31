import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Task } from '@/types';
import { TaskCard } from './TaskCard';

import { cn } from '@/lib/utils';

interface TaskListProps {
    tasks: Task[];
    isDataLoading: boolean;
    onTaskClick?: (task: Task) => void;
    layoutMode?: 'grid' | 'list';
    selectedTaskId?: string;
}

export function TaskList({ tasks, isDataLoading, onTaskClick, layoutMode = 'grid', selectedTaskId }: TaskListProps) {
    const selectedTaskRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (layoutMode === 'list' && selectedTaskId && selectedTaskRef.current) {
            selectedTaskRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [layoutMode, selectedTaskId]);

    return (
        <div className={cn(
            "flex flex-col flex-1 bg-card rounded-xl border border-border shadow-sm gap-4 z-0 overflow-hidden",
            layoutMode === 'grid' ? "p-6" : "p-0 border-0 shadow-none bg-transparent"
        )}>
            {layoutMode === 'grid' && (
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Recent Team Tasks</h2>
                    <Link href="/tasks" className="text-sm font-medium text-primary hover:underline">View All</Link>
                </div>
            )}

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
                    <div className={cn(
                        layoutMode === 'grid'
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            : "flex flex-col gap-2 p-1"
                    )}>
                        {tasks.map(task => (
                            <div
                                key={task.id}
                                ref={selectedTaskId === task.id ? selectedTaskRef : null}
                                className={cn(
                                    layoutMode === 'list' && selectedTaskId === task.id && "ring-2 ring-primary rounded-xl"
                                )}
                            >
                                <TaskCard task={task} onClick={onTaskClick} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
