'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Send, Paperclip, Loader2, Calendar, CheckCircle2, Circle, Clock, Settings, Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  dueDate: string | null;
  assignee?: {
    name: string;
    avatar?: string;
  };
}

export default function Dashboard() {
  const { showToast, ToastComponent } = useToast();
  const [inputValue, setInputValue] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isLlmReady, setIsLlmReady] = useState(true); // Default to true while loading to avoid flickering
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string, path: string, size: number, type: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingTask, setPendingTask] = useState<any | null>(null);
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, usersRes, tasksRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/users'),
          fetch('/api/tasks')
        ]);

        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          const isReady = settings.llmProvider === 'ollama' || (!!settings.llmApiKey);
          setIsLlmReady(isReady);
        }
        if (usersRes.ok) setUsers(await usersRes.json());
        if (tasksRes.ok) setTasks(await tasksRes.json());
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle Input Change
  const handleMention = (value: string, pos: number) => {
    // Detect @mention
    const textBeforeCursor = value.slice(0, pos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const charBeforeAt = lastAtPos === 0 ? ' ' : textBeforeCursor[lastAtPos - 1];
      if (charBeforeAt === ' ' || charBeforeAt === '\n') {
        const query = textBeforeCursor.slice(lastAtPos + 1);
        if (!query.includes(' ')) {
          setShowMentionList(true);
          setMentionQuery(query);
          return;
        }
      }
    }
    setShowMentionList(false);
  };

  // Filter Users
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Select User
  const handleSelectUser = (user: User) => {
    if (!inputRef.current) return;
    const textBeforeCursor = inputValue.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = inputValue.slice(cursorPos);
    const newText = inputValue.slice(0, lastAtPos) + `@${user.name} ` + textAfterCursor;
    setInputValue(newText);
    setShowMentionList(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Handle File Upload
  const handleFileUpload = async (files: FileList | File[]) => {
    setIsUploading(true);
    const newAttachments = [...attachments];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          newAttachments.push(data.file);
          showToast(`File ${file.name} uploaded`, 'success');
        } else {
          showToast(`Failed to upload ${file.name}`, 'error');
        }
      } catch (e) {
        showToast('Upload error', 'error');
      }
    }

    setAttachments(newAttachments);
    setIsUploading(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Send
  const handleSend = async (overridePrompt?: string) => {
    const finalPrompt = overridePrompt || inputValue;
    if (!finalPrompt.trim() && attachments.length === 0) return;

    setIsLoading(true);
    setSuggestions([]); // Clear suggestions
    setLastPrompt(finalPrompt); // Store the prompt for potential editing
    const currentPrompt = finalPrompt;
    try {
      const res = await fetch('/api/ai/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          history: chatHistory,
          attachments: attachments,
          action: 'parse'
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.needsClarification) {
          setAiFeedback(data.message);
          setChatHistory(prev => [
            ...prev,
            { role: 'user', content: currentPrompt },
            { role: 'assistant', content: data.message }
          ]);
          setSuggestions(data.options || []);
          setInputValue('');
          showToast('AI needs more information', 'info');
        } else if (data.needsConfirmation) {
          setPendingTask(data.taskData);
          setIsEditingTable(false); // Reset to view mode initially
          setAiFeedback("Please review the task details below before final registration.");
          setChatHistory(prev => [
            ...prev,
            { role: 'user', content: currentPrompt },
            { role: 'assistant', content: "Please review the task details below." }
          ]);
          setInputValue('');
          showToast('Please confirm task details', 'info');
        } else {
          setInputValue('');
          setAiFeedback(null);
          setChatHistory([]);
          setAttachments([]);
          showToast('Task created and assigned successfully!', 'success');
          const tasksRes = await fetch('/api/tasks');
          if (tasksRes.ok) setTasks(await tasksRes.json());
        }
      } else {
        showToast(data.error || 'Failed to assign task', 'error');
      }
    } catch (error) {
      showToast("Failed to connect to server.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTask = async () => {
    if (!pendingTask) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          taskData: pendingTask,
          attachments: attachments
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Task registered successfully!', 'success');
        setPendingTask(null);
        setAiFeedback(null);
        setChatHistory([]);
        setAttachments([]);
        // Refresh tasks
        const tasksRes = await fetch('/api/tasks');
        if (tasksRes.ok) setTasks(await tasksRes.json());
      } else {
        showToast(data.error || 'Failed to register task', 'error');
      }
    } catch (e) {
      showToast('Connection error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTask = () => {
    setInputValue(lastPrompt);
    setPendingTask(null);
    setIsEditingTable(false);
    setAiFeedback("You can adjust your request.");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const toggleTableEdit = () => {
    setIsEditingTable(!isEditingTable);
  };

  const updatePendingTask = (field: string, value: any) => {
    setPendingTask((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !showMentionList && !isLoading) {
      handleSend();
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col h-full p-8 gap-6 relative max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      </div>

      {/* AI Input Section */}
      <div className={cn(
        "flex flex-col w-full bg-card rounded-xl border border-border shadow-sm transition-all z-10",
        isDragging && "ring-2 ring-primary ring-inset"
      )}>
        <div className="p-6 border-b border-border bg-muted/20 rounded-t-xl">
          <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
            <span className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            AI Task Assignment
          </h2>
          <p className="text-sm text-muted-foreground ml-10">
            Type your task like "Assign monthly report to Kim Chul-soo by next Friday" or drag files here.
          </p>
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
                    <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
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

          {/* Confirmation Table */}
          {pendingTask && (
            <div className="mb-4 p-4 bg-background border border-primary/20 rounded-xl shadow-lg animate-in zoom-in-95 duration-200">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Confirm Task Details
              </h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 bg-muted/30 font-semibold text-muted-foreground w-24">Title</th>
                      <td className="px-3 py-2 text-foreground font-medium">
                        {isEditingTable ? (
                          <input
                            type="text"
                            value={pendingTask.title || ''}
                            onChange={(e) => updatePendingTask('title', e.target.value)}
                            className="w-full bg-background border border-input rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                          />
                        ) : pendingTask.title}
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 bg-muted/30 font-semibold text-muted-foreground">Detail</th>
                      <td className="px-3 py-2 text-foreground whitespace-pre-wrap">
                        {isEditingTable ? (
                          <textarea
                            value={pendingTask.description || ''}
                            onChange={(e) => updatePendingTask('description', e.target.value)}
                            className="w-full bg-background border border-input rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none min-h-[60px] resize-y"
                          />
                        ) : (pendingTask.description || '-')}
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 bg-muted/30 font-semibold text-muted-foreground">Assignee</th>
                      <td className="px-3 py-2 text-foreground">
                        {isEditingTable ? (
                          <select
                            value={pendingTask.assigneeName || ''}
                            onChange={(e) => updatePendingTask('assigneeName', e.target.value)}
                            className="w-full bg-background border border-input rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                          >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                              <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                            ))}
                          </select>
                        ) : (pendingTask.assigneeName || 'Unassigned')}
                      </td>
                    </tr>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 bg-muted/30 font-semibold text-muted-foreground">Priority</th>
                      <td className="px-3 py-2 font-bold uppercase tracking-wider">
                        {isEditingTable ? (
                          <select
                            value={pendingTask.priority || 'Medium'}
                            onChange={(e) => updatePendingTask('priority', e.target.value)}
                            className="w-full bg-background border border-input rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none font-bold"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        ) : (
                          <span className={cn(
                            pendingTask.priority === 'High' ? "text-red-500" :
                              pendingTask.priority === 'Medium' ? "text-orange-500" : "text-blue-500"
                          )}>
                            {pendingTask.priority}
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <th className="px-3 py-2 bg-muted/30 font-semibold text-muted-foreground">Due Date</th>
                      <td className="px-3 py-2 text-foreground">
                        {isEditingTable ? (
                          <input
                            type="date"
                            value={pendingTask.dueDate || ''}
                            onChange={(e) => updatePendingTask('dueDate', e.target.value)}
                            className="w-full bg-background border border-input rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                          />
                        ) : (pendingTask.dueDate || 'No date')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={handleEditTask}
                  className="px-4 py-2 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-muted transition-colors active:scale-95"
                  title="Modify the original prompt"
                >
                  Edit Prompt
                </button>
                <button
                  onClick={toggleTableEdit}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-xs font-semibold transition-colors active:scale-95",
                    isEditingTable
                      ? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                      : "bg-background border-border hover:bg-muted"
                  )}
                >
                  {isEditingTable ? "Done Editing" : "Edit Details"}
                </button>
                <button
                  onClick={handleConfirmTask}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? "Registering..." : "Confirm & Register"}
                </button>
              </div>
            </div>
          )}

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

      {/* Team Tasks Section */}
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
                <div key={task.id} className="p-4 rounded-xl border border-border bg-background hover:shadow-md transition-shadow group">
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
              ))}
            </div>
          )}
        </div>
      </div>
      {ToastComponent}
    </div>
  );
}