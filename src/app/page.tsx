'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, CheckSquare } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { User, Task, PromptTemplate } from '@/types';
import { TaskInput } from '@/components/dashboard/TaskInput';
import { TaskConfirmation } from '@/components/dashboard/TaskConfirmation';
import { TaskList } from '@/components/dashboard/TaskList';
import { TaskDetailPanel } from '@/components/dashboard/TaskDetailPanel';
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
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  const router = useRouter();
  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get('task');

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state with URL parameter
  useEffect(() => {
    if (isDataLoading) return;

    if (taskIdParam) {
      const task = tasks.find(t => t.id === taskIdParam);
      if (task) {
        setPendingTask(null);
        setAiFeedback(null);
        setInputValue('');
        setSelectedTask(task);
        setIsDetailOpen(true);
        setFocusedTask(task); // All roles get focused task for reporting

        const log = task.chatLog ? JSON.parse(task.chatLog) : [];
        setChatHistory(log);
      }
    } else {
      if (selectedTask || focusedTask) {
        setSelectedTask(null);
        setFocusedTask(null);
        setIsDetailOpen(false);
        setAiFeedback(null);
        setChatHistory([]);
        setPendingTask(null);
      }
    }
  }, [taskIdParam, tasks, isDataLoading, currentUser?.id]);

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
      setIsDataLoading(true);
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
  }, [currentUser?.id]);

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

    const currentCursorPos = inputRef.current.selectionStart || cursorPos;
    const textBeforeCursor = inputValue.slice(0, currentCursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos === -1) {
      // Fallback if @ not found (shouldn't happen)
      setInputValue(inputValue + ` @{${user.name}} `);
    } else {
      const textAfterCursor = inputValue.slice(currentCursorPos);
      const newText = inputValue.slice(0, lastAtPos) + `@{${user.name}} ` + textAfterCursor;
      setInputValue(newText);
    }

    setShowMentionList(false);
    // Focus back and set cursor at the end of inserted name
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Since we added a space at the end, the new cursor should be at lastAtPos + name length + 2 (@ and space)
      }
    }, 0);
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
    setPendingTask(null); // Clear any existing confirmation/clarification state
    setAiFeedback(null);
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
        } else if (data.needsConfirmation && !focusedTask) {
          // Only show confirmation for NEW assignments
          setPendingTask({ ...data.taskData, templateId: selectedTemplateId });
          setIsEditingTable(false);
          setAiFeedback("Please review the task details below before final registration.");
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
            if (data.task) {
              setFocusedTask(data.task);
              setPendingTask(null);
            }
          } else {
            setInputValue('');
            setAiFeedback(null);
            setChatHistory([]);
            setAttachments([]);
            showToast(focusedTask ? 'Progress reported!' : 'Task created and assigned successfully!', 'success');
            if (focusedTask) setFocusedTask(null);
          }

          const tasksRes = await fetch('/api/tasks', { cache: 'no-store' });
          if (tasksRes.ok) setTasks(await tasksRes.json());
        }
      } else {
        showToast(data.error || 'Failed to process request', 'error');
      }
    } catch (error) {
      showToast("Failed to connect to server.", 'error');
    } finally {
      setIsLoading(true); // Wait for tasks refresh
      const tasksRes = await fetch('/api/tasks', { cache: 'no-store' });
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
    router.push(`/?task=${task.id}`);
    if (!isAdmin) {
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
    <div className="flex flex-col h-full p-8 gap-6 relative max-w-7xl mx-auto w-full">
      {/* Header */}
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

      {/* Non-Admin Stats */}
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

      <TaskInput
        inputValue={inputValue}
        setInputValue={setInputValue}
        setCursorPos={() => { }} // Not strictly required for simple input
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
        title={focusedTask ? `Reporting Progress on "${focusedTask.title}"` : "AI Task Assignment"}
        description={focusedTask ? "Tell the AI what you've done or mention someone to transfer this task." : undefined}
        focusedTask={focusedTask}
        promptTemplates={promptTemplates}
        selectedTemplateId={selectedTemplateId}
        setSelectedTemplateId={setSelectedTemplateId}
        isAdmin={isAdmin}
        onClearFocus={() => router.push('/')}
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

      {/* Main Content Area: Always Grid View on Dashboard */}
      <div className="flex flex-col gap-4 animate-in slide-in-from-left-4 duration-300">
        <TaskList
          tasks={displayTasks}
          isDataLoading={isDataLoading}
          onTaskClick={handleTaskClick}
          layoutMode="grid"
          selectedTaskId={selectedTask?.id}
        />
      </div>

      {/* Keep Modal for Non-Admin or Mobile fallback if needed (though we used split for admin) */}
      {/* Modal removed to use integrated work view */}

      {ToastComponent}
    </div>
  );
}