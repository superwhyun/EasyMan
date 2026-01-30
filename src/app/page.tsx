'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { User, Task, PromptTemplate } from '@/types';
import { TaskInput } from '@/components/dashboard/TaskInput';
import { TaskConfirmation } from '@/components/dashboard/TaskConfirmation';
import { TaskList } from '@/components/dashboard/TaskList';
import { TaskDetailModal } from '@/components/dashboard/TaskDetailModal';
import { useUser } from '@/contexts/UserContext';

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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [focusedTask, setFocusedTask] = useState<Task | null>(null);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { currentUser } = useUser();
  const isAdmin = currentUser?.role === 'Admin';

  const inputRef = useRef<HTMLInputElement>(null);

  // Filter tasks for personal view if not admin
  const displayTasks = isAdmin
    ? tasks
    : tasks.filter(t => t.assignee?.name === currentUser?.name); // Fallback to name match for now as seed/types might be inconsistent

  const personalStats = {
    pending: displayTasks.filter(t => t.status === 'Pending').length,
    inProgress: displayTasks.filter(t => t.status === 'In Progress').length,
    completed: displayTasks.filter(t => t.status === 'Completed').length,
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, usersRes, tasksRes, promptsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/users'),
          fetch('/api/tasks'),
          fetch('/api/prompts')
        ]);

        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          const isReady = settings.llmProvider === 'ollama' || (!!settings.llmApiKey);
          setIsLlmReady(isReady);
        }
        if (usersRes.ok) setUsers(await usersRes.json());
        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (promptsRes.ok) setPromptTemplates(await promptsRes.json());
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
      // Use different endpoint if reporting progress on a focused task
      const endpoint = focusedTask ? `/api/tasks/${focusedTask.id}/report` : '/api/ai/assign';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          history: chatHistory,
          attachments: attachments,
          action: 'parse',
          // Pass current task data if in report mode
          taskContext: focusedTask,
          templateId: selectedTemplateId
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
          setPendingTask({ ...data.taskData, templateId: selectedTemplateId });
          setIsEditingTable(false); // Reset to view mode initially
          setAiFeedback(focusedTask ? "Review the progress update below." : "Please review the task details below before final registration.");
          setChatHistory(prev => [
            ...prev,
            { role: 'user', content: currentPrompt },
            {
              role: 'assistant',
              content: `${data.taskData.summarizedReport}${data.taskData.remainingWork ? `\n\n**Next Steps:**\n${data.taskData.remainingWork}` : ''}`
            }
          ]);
          setInputValue('');
          showToast(focusedTask ? 'Review update' : 'Confirm task details', 'info');
        } else {
          // Success (Directly committed or confirmed)
          const isReportSuccess = !!focusedTask;

          if (isReportSuccess && data.taskData) {
            // Keep history for reports so user sees advice
            setChatHistory(prev => [
              ...prev,
              { role: 'user', content: currentPrompt },
              { role: 'assistant', content: data.taskData.summarizedReport }
            ]);
            setAiFeedback(null);
            setInputValue('');
            setAttachments([]);
            showToast('Progress recorded and task updated!', 'success');
            // Don't nullify focusedTask immediately if we want to show the chat response?
            // Actually, usually we should refresh the task data
            if (data.task) setFocusedTask(data.task);
          } else {
            setInputValue('');
            setAiFeedback(null);
            setChatHistory([]);
            setAttachments([]);
            showToast(focusedTask ? 'Progress reported!' : 'Task created and assigned successfully!', 'success');
            if (focusedTask) setFocusedTask(null);
          }

          const tasksRes = await fetch('/api/tasks');
          if (tasksRes.ok) setTasks(await tasksRes.json());
        }
      } else {
        showToast(data.error || 'Failed to process request', 'error');
      }
    } catch (error) {
      showToast("Failed to connect to server.", 'error');
    } finally {
      setIsLoading(true); // Wait for tasks refresh
      const tasksRes = await fetch('/api/tasks');
      if (tasksRes.ok) setTasks(await tasksRes.json());
      setIsLoading(false);
    }
  };

  const handleConfirmTask = async () => {
    if (!pendingTask) return;
    setIsLoading(true);
    try {
      const endpoint = focusedTask ? `/api/tasks/${focusedTask.id}/report` : '/api/ai/assign';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          taskData: { ...pendingTask, templateId: selectedTemplateId },
          attachments: attachments,
          history: chatHistory // Send history to store it
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(focusedTask ? 'Task updated!' : 'Task registered successfully!', 'success');
        setPendingTask(null);
        if (focusedTask && data.task) {
          setFocusedTask(data.task);
        } else {
          setFocusedTask(null);
        }
        setSelectedTemplateId(null);
        setAiFeedback(null);
        setChatHistory([]);
        setAttachments([]);
        // Refresh tasks
        const tasksRes = await fetch('/api/tasks');
        if (tasksRes.ok) setTasks(await tasksRes.json());
      } else {
        showToast(data.error || 'Failed to complete action', 'error');
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

  const handleTaskClick = (task: Task) => {
    if (isAdmin) {
      setSelectedTask(task);
      setIsDetailOpen(true);
    } else {
      setFocusedTask(task);
      setPendingTask(null);
      setAiFeedback(null);
      // Initialize chat from task chatLog
      const log = task.chatLog ? JSON.parse(task.chatLog) : [];
      setChatHistory(log);
      setInputValue('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    // Also update selected task if needed, though modal usually handles its own local state or closes
    setSelectedTask(updatedTask);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex flex-col h-full p-8 gap-6 relative max-w-6xl mx-auto w-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">
          {isAdmin ? 'Team Dashboard' : 'My Dashboard'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? 'Overview of team tasks and AI assignment'
            : `Welcome back, ${currentUser?.name}. Here are your tasks.`}
        </p>
      </div>

      {!isAdmin && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Pending</div>
            <div className="text-2xl font-bold text-foreground">{personalStats.pending}</div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">In Progress</div>
            <div className="text-2xl font-bold text-blue-600">{personalStats.inProgress}</div>
          </div>
          <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-600">{personalStats.completed}</div>
          </div>
        </div>
      )}

      {/* AI Input Section */}
      {(isAdmin || focusedTask) && (
        <TaskInput
          inputValue={inputValue}
          setInputValue={setInputValue}
          setCursorPos={setCursorPos}
          handleMention={handleMention}
          handleSelectUser={handleSelectUser}
          handleSend={handleSend}
          handleFileUpload={handleFileUpload}
          removeAttachment={removeAttachment}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          onDrop={onDrop}
          chatHistory={chatHistory}
          suggestions={suggestions}
          attachments={attachments}
          isUploading={isUploading}
          isLoading={isLoading}
          isLlmReady={isLlmReady}
          showMentionList={showMentionList}
          filteredUsers={filteredUsers}
          pendingTask={pendingTask}
          inputRef={inputRef}
          title={focusedTask ? "AI Progress Report" : "AI Task Assignment"}
          description={focusedTask
            ? "Report your progress naturally, e.g., 'I finished the design part, about 60% done.'"
            : "Type your task like \"Assign monthly report to Kim Chul-soo by next Friday\" or drag files here."}
          focusedTask={focusedTask}
          promptTemplates={promptTemplates}
          selectedTemplateId={selectedTemplateId}
          setSelectedTemplateId={setSelectedTemplateId}
          isAdmin={isAdmin}
        >
          <TaskConfirmation
            pendingTask={pendingTask}
            isEditingTable={isEditingTable}
            updatePendingTask={updatePendingTask}
            handleEditTask={handleEditTask}
            toggleTableEdit={toggleTableEdit}
            handleConfirmTask={handleConfirmTask}
            isLoading={isLoading}
            users={users}
            promptTemplates={promptTemplates}
          />
        </TaskInput>
      )}

      {/* Team/Personal Tasks Section */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          {isAdmin ? 'Recent Team Tasks' : 'My Tasks'}
        </h2>
        <TaskList
          tasks={displayTasks}
          isDataLoading={isDataLoading}
          onTaskClick={handleTaskClick}
        />
      </div>

      <TaskDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        task={selectedTask}
        users={users}
        promptTemplates={promptTemplates}
        onUpdate={handleTaskUpdate}
      />

      {ToastComponent}
    </div>
  );
}