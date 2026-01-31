import React from 'react';
import { Task, User, PromptTemplate } from '@/types';
import { TaskDetailPanel } from './TaskDetailPanel';

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    users: User[];
    promptTemplates: PromptTemplate[];
    onUpdate: (updatedTask: Task) => void;
    onDelete?: (taskId: string) => void;
}

export function TaskDetailModal({ isOpen, onClose, task, users, promptTemplates, onUpdate, onDelete }: TaskDetailModalProps) {
    if (!task || !isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Side Pane */}
            <div className="relative w-full max-w-2xl bg-background shadow-2xl animate-in slide-in-from-right duration-300 h-full border-l border-border">
                <TaskDetailPanel
                    task={task}
                    users={users}
                    promptTemplates={promptTemplates}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onClose={onClose}
                />
            </div>
        </div>
    );
}
