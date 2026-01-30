import React, { useRef } from 'react';
import Link from 'next/link';
import { Send, Paperclip, Loader2, CheckCircle2, Settings, Upload, FileText, X, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User, Task, PromptTemplate } from '@/types';

interface TaskInputProps {
    inputValue: string;
    setInputValue: (val: string) => void;
    setCursorPos: (pos: number) => void;
    handleMention: (val: string, pos: number) => void;
    handleSelectUser: (user: User) => void;
    handleSend: (overridePrompt?: string) => void;
    handleFileUpload: (files: FileList | File[]) => void;
    removeAttachment: (index: number) => void;
    isDragging: boolean;
    setIsDragging: (val: boolean) => void;
    onDrop: (e: React.DragEvent) => void;
    chatHistory: { role: 'user' | 'assistant', content: string }[];
    suggestions: string[];
    attachments: { name: string, path: string, size: number, type: string }[];
    isUploading: boolean;
    isLoading: boolean;
    isLlmReady: boolean;
    showMentionList: boolean;
    filteredUsers: User[];
    pendingTask: any;
    inputRef: React.RefObject<HTMLInputElement | null>;
    title?: string;
    description?: string;
    focusedTask?: Task | null;
    promptTemplates: PromptTemplate[];
    selectedTemplateId: string | null;
    setSelectedTemplateId: (id: string | null) => void;
    isAdmin?: boolean;
    children?: React.ReactNode;
}

export function TaskInput({
    inputValue,
    setInputValue,
    setCursorPos,
    handleMention,
    handleSelectUser,
    handleSend,
    handleFileUpload,
    removeAttachment,
    isDragging,
    setIsDragging,
    onDrop,
    chatHistory,
    suggestions,
    attachments,
    isUploading,
    isLoading,
    isLlmReady,
    showMentionList,
    filteredUsers,
    pendingTask,
    inputRef,
    title = "AI Task Assignment",
    description = 'Type your task like "Assign monthly report to Kim Chul-soo by next Friday" or drag files here.',
    focusedTask,
    promptTemplates,
    selectedTemplateId,
    setSelectedTemplateId,
    isAdmin,
    children
}: TaskInputProps) {

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !showMentionList && !isLoading) {
            handleSend();
        }
    };

    return (
        <div className={cn(
            "flex flex-col w-full bg-card rounded-xl border border-border shadow-sm transition-all z-10",
            isDragging && "ring-2 ring-primary ring-inset"
        )}>
            {focusedTask && (
                <div className="p-4 bg-primary/5 border-b border-border flex flex-col gap-3 rounded-t-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Focusing on Task</span>
                            <h3 className="text-sm font-bold text-foreground">#{focusedTask.id.slice(0, 8)} - {focusedTask.title}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Priority</span>
                                <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                    focusedTask.priority === 'High' ? "bg-red-100 text-red-600" :
                                        focusedTask.priority === 'Medium' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                                )}>
                                    {focusedTask.priority}
                                </span>
                            </div>
                            <div className="flex flex-col items-end min-w-[80px]">
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Progress</span>
                                <div className="flex items-center gap-2 w-full justify-end">
                                    <span className="text-[10px] font-bold text-primary">{pendingTask?.progressUpdate ?? focusedTask.progress}%</span>
                                    <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: `${pendingTask?.progressUpdate ?? focusedTask.progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Status</span>
                                <span className="text-[10px] font-bold text-foreground">{pendingTask?.statusUpdate ?? focusedTask.status}</span>
                            </div>
                        </div>
                    </div>
                    {focusedTask.description && (
                        <div className="bg-background/50 p-3 rounded-lg border border-border/50 shadow-sm">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase mb-1 block">Instructions</label>
                            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{focusedTask.description}</p>
                        </div>
                    )}
                    {(pendingTask?.accomplishments || focusedTask.accomplishments) && (
                        <div className="mt-1">
                            <div className="bg-green-50/50 p-3 rounded-lg border border-green-100/50">
                                <label className="text-[9px] font-bold text-green-700 uppercase mb-1 block">Accomplishments</label>
                                <p className="text-[11px] text-green-800 leading-relaxed whitespace-pre-wrap">{pendingTask?.accomplishments || focusedTask.accomplishments}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <div className={cn(
                "p-6 border-b border-border bg-muted/20",
                !focusedTask && "rounded-t-xl"
            )}>
                <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                    <span className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                    </span>
                    {title}
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 ml-10">
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                    {isAdmin && !focusedTask && promptTemplates.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">Template:</span>
                            <select
                                value={selectedTemplateId || ''}
                                onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                                className="text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20"
                            >
                                <option value="">General (No Template)</option>
                                {promptTemplates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div
                className="p-4 bg-muted/50 relative min-h-[120px] rounded-b-xl"
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                {isDragging && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/10 backdrop-blur-[2px] z-20 pointer-events-none animate-in fade-in zoom-in-95">
                        <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-2 shadow-lg">
                            <Upload className="w-8 h-8 animate-bounce" />
                        </div>
                        <p className="font-bold text-primary">Drop files here to attach</p>
                    </div>
                )}

                {chatHistory.length > 0 && (
                    <div className="mb-4 flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={cn(
                                "flex gap-3 p-3 rounded-xl animate-in fade-in slide-in-from-top-1",
                                msg.role === 'assistant' ? "bg-primary/5 border border-primary/10 shadow-sm" : "bg-card border border-border"
                            )}>
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-110",
                                    msg.role === 'assistant' ? "bg-primary text-white" : "bg-muted-foreground text-white"
                                )}>
                                    <span className="text-[10px] font-bold">
                                        {msg.role === 'assistant' ? 'AI' : 'U'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-0.5 flex-1">
                                    <span className="text-[10px] font-semibold opacity-40 uppercase tracking-tighter">
                                        {msg.role === 'assistant' ? 'EasyMan AI' : 'User'}
                                    </span>
                                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && !pendingTask && (
                    <div className="mb-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2">
                        {suggestions.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(opt)}
                                className="px-3 py-1.5 bg-background border border-primary/30 text-primary text-xs font-medium rounded-full hover:bg-primary/10 hover:border-primary transition-all shadow-sm active:scale-95"
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}


                {/* Confirmation Slot */}
                {children}

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2 animate-in fade-in zoom-in-95">
                        {attachments.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-lg group shadow-sm transition-all hover:border-primary/50">
                                <FileText className="w-4 h-4 text-primary opacity-60" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-[10px] font-medium max-w-[120px] truncate">{file.name}</span>
                                    <span className="text-[8px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                                <button
                                    onClick={() => removeAttachment(i)}
                                    className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors ml-1"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-2 relative">
                    <div className="relative flex-1 group">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => {
                                setInputValue(e.target.value);
                                setCursorPos(e.target.selectionStart || 0);
                                handleMention(e.target.value, e.target.selectionStart || 0);
                            }}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading || !isLlmReady || isUploading}
                            placeholder={isLlmReady ? "What's the task? (e.g., @Name ...)" : "LLM configuration is required in Settings"}
                            className="w-full h-12 pl-12 pr-12 rounded-full border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm disabled:opacity-70 disabled:bg-muted shadow-sm hover:border-primary/30"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <Paperclip
                                    className="w-4 h-4 cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => {
                                        const el = document.createElement('input');
                                        el.type = 'file';
                                        el.multiple = true;
                                        el.onchange = (e: any) => handleFileUpload(e.target.files);
                                        el.click();
                                    }}
                                />
                            )}
                        </div>

                        {/* Mention Dropdown */}
                        {showMentionList && filteredUsers.length > 0 && (
                            <div className="absolute top-full mt-2 left-6 w-64 bg-popover border border-border rounded-xl shadow-xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-100 z-50">
                                {filteredUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectUser(user)}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted text-left transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                                            {user.avatar || user.name[0]}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">{user.role}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => handleSend()}
                        disabled={isLoading || !isLlmReady || (!inputValue.trim() && attachments.length === 0)}
                        className={cn(
                            "h-12 w-12 rounded-full flex items-center justify-center transition-all disabled:opacity-50 shadow-md active:scale-95 shrink-0",
                            isLlmReady ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            isLlmReady ? <Send className="w-5 h-5" /> : <Link href="/settings"><Settings className="w-5 h-5" /></Link>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
