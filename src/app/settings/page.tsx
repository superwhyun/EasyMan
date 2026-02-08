'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, Save } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const providers = [
  { id: 'openai', name: 'OpenAI', desc: 'GPT-5.2 (Latest)', defaultModel: 'gpt-5.2' },
  { id: 'claude', name: 'Claude AI', desc: 'Claude 3.5 Sonnet', defaultModel: 'claude-3-5-sonnet' },
  { id: 'grok', name: 'Grok', desc: 'Grok-4', defaultModel: 'grok-4' },
  { id: 'ollama', name: 'Ollama', desc: 'Local Models', defaultModel: 'llama3' },
];

export default function SettingsPage() {
  const { showToast, ToastComponent } = useToast();

  // LLM State
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gpt-5.2');
  const [llmConfigs, setLlmConfigs] = useState<{ provider: string, apiKey: string, model: string }[]>([]);

  // Prompts State
  const [systemPrompt, setSystemPrompt] = useState('');
  const [reportPrompt, setReportPrompt] = useState('');
  const [activePromptTab, setActivePromptTab] = useState<'task' | 'progress' | 'templates'>('task');
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // Notification State
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [frequency, setFrequency] = useState('daily');
  const [deliveryTime, setDeliveryTime] = useState('09:00 AM');
  const [activeMainTab, setActiveMainTab] = useState<'llm' | 'notification' | 'prompt'>('llm');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Default Prompt Constants (Backup)
  const DEFAULT_SYSTEM_PROMPT = `You are an **Intelligent Task Manager Assistant** acting as a **Strategic Secretary**.
Today is {TODAY}, current time is {NOW}.
Here is the team member list:
{USERS_LIST}

Your goal is to parse the user's natural language request into a structured task object while being **Contextually Aware**.

### Crucial Guidelines:
1. **Severity Detection**:
   - If the user reports a crisis or major loss, set "priority" to **"High"** and include **Immediate Response Measures** in the "description".

2. **Task Extraction**:
   - **title**: A punchy, priority-reflecting title.
   - **description**: Detailed steps and action items.
   - **assigneeName**: The name of the person assigned. Match EXACTLY one of the names from the provided user list. Do NOT change spelling.
   - **dueDate**: The due date in 'YYYY-MM-DD' format.
   - **priority**: 'High', 'Medium', or 'Low' (Default to High for critical issues).

3. **Incomplete Requests**:
   - If vague, set "status" to "need_clarification" and ask proactive questions.

Return ONLY JSON.`;

  const DEFAULT_REPORT_PROMPT = `You are an **Intelligent Task Assistant** acting as a **Strategic Secretary**.

Today is {TODAY}, current time is {NOW}.

Current Task Context:
- Title: {TITLE}
- Description: {DESCRIPTION}
- Status: {STATUS}
- Progress: {PROGRESS}%
- Priority: {PRIORITY}
- Assignee: {ASSIGNEE}
- Due Date: {DUE_DATE}

Existing Accomplishments:
{EXISTING_ACCOMPLISHMENTS}

Your Guidelines:
1. **Scenario-Based Processing (CRITICAL)**:
   You must identify which scenario the user is reporting and respond accordingly.

   **Scenario A: Task Transfer (@Mention)**
   - Trigger: User mentions @{Name} or requests to change the person in charge.
   - Priority: HIGHEST. Handle even if mixed with progress reports.
   - Action: 
     - Set 'assigneeName' to the EXACT name within brackets or the mentioned user.
     - Add log to 'accomplishments': "[{TODAY}] (담당자 변경: {OLD_ASSIGNEE} -> @{NEW_ASSIGNEE}) - (이유/상황)"
     - Guidance: Briefly explain the transfer in 'summarizedReport'.

   **Scenario B: Completion Reporting**
   - Trigger: User implies the task is "Done" or "Completed".
   - Action: **Instruction Verification (Non-Intrusive)**.
     - Compare achievements against original {DESCRIPTION}.
     - Do NOT judge work quality. Only check if required items are reported as done.
     - If all items are accounted for: Set status to "Completed" and progress 100%.
     - If items are missing: Gently list them in 'summarizedReport' and suggest keeping status as "In Progress".

   **Scenario C: Progress Reporting**
   - Trigger: Normal updates.
   - Action: 
     - Transform update into ONE concise sentence: "[{TODAY}] (상황 및 조치 내용)".
     - Append to cumulative 'accomplishments'.
     - Maintain persona: Detect crises and provide proactive advice in 'summarizedReport'.

2. **General Policy**:
   - **Language**: ALWAYS Korean for 'summarizedReport' and logs.
   - **Tone**: Professional, alert, and supportive.
   - **Readability (CRITICAL)**: Use newlines (\\n) between bullet points or numbered items in summarizedReport and accomplishments to ensure clean display.
   - **History**: Do NOT rewrite history. Always append.

Structured Response Format:
{
  "status": "success",
  "clarificationMessage": null,
  "options": ["Suggested next action (Korean)", "Formal report suggestion (Korean)"],
  "title": "{TITLE}",
  "description": "{DESCRIPTION}",
  "statusUpdate": "Pending" | "In Progress" | "Completed" | "Pending Approval",
  "progressUpdate": number (0-100),
  "priority": "{PRIORITY}",
  "assigneeName": "{ASSIGNEE}",
  "dueDate": "{DUE_DATE}",
  "accomplishments": "{EXISTING_ACCOMPLISHMENTS}\\n[{TODAY}] (요약문장)",
  "remainingWork": "worker에게 주는 간단한 리마인더 (Korean)",
  "summarizedReport": "1. 요약/분석, 2. (선택적) 이관 안내/지시사항 체크 결과, 3. 전략적 조언 (Korean)"
}`;

  // Initialize
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [settingsRes, promptsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/prompts')
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSelectedProvider(data.llmProvider || 'openai');
          setApiKey(data.llmApiKey || '');
          setModelName(data.llmModel || 'gpt-5.2');
          setSystemPrompt(data.systemPrompt || DEFAULT_SYSTEM_PROMPT);
          setReportPrompt(data.reportPrompt || DEFAULT_REPORT_PROMPT);
          setEmailEnabled(data.emailEnabled ?? true);
          setFrequency(data.emailFrequency || 'daily');
          setDeliveryTime(data.deliveryTime || '09:00 AM');
          setLlmConfigs(data.llmConfigs || []);
        }

        if (promptsRes.ok) {
          setTemplates(await promptsRes.json());
        }
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAll();
  }, []);

  const handleProviderSelect = (id: string, defaultModelName: string) => {
    // Save current key/model to configs before switching (local state only)
    setLlmConfigs(prev => {
      const filtered = prev.filter(c => c.provider !== selectedProvider);
      return [...filtered, { provider: selectedProvider, apiKey: apiKey, model: modelName }];
    });

    setSelectedProvider(id);
    const existing = llmConfigs.find(c => c.provider === id);
    if (existing) {
      setApiKey(existing.apiKey || '');
      setModelName(existing.model || defaultModelName);
    } else {
      setApiKey('');
      setModelName(defaultModelName);
    }
  };

  const handleSave = async () => {
    if (selectedProvider !== 'ollama' && !apiKey.trim()) {
      showToast('API Key is required for cloud providers.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmProvider: selectedProvider,
          llmApiKey: apiKey,
          llmModel: modelName,
          systemPrompt,
          reportPrompt,
          emailEnabled,
          emailFrequency: frequency,
          deliveryTime,
        }),
      });

      const text = await res.text();
      if (res.ok) {
        showToast('Settings saved successfully!', 'success');
        // Update local configs state
        setLlmConfigs(prev => {
          const filtered = prev.filter(c => c.provider !== selectedProvider);
          return [...filtered, { provider: selectedProvider, apiKey: apiKey, model: modelName }];
        });
      } else {
        let errorMsg = 'Failed to save settings.';
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch (e) {
          errorMsg = `Server error (${res.status}): ${text.slice(0, 50)}`;
        }
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      showToast('Network error occurred.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate.name || !editingTemplate.content) {
      showToast('Name and content are required.', 'error');
      return;
    }
    try {
      const url = editingTemplate.id ? `/api/prompts/${editingTemplate.id}` : '/api/prompts';
      const method = editingTemplate.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate),
      });
      if (res.ok) {
        showToast('Template saved!', 'success');
        setEditingTemplate(null);
        const refresh = await fetch('/api/prompts');
        if (refresh.ok) setTemplates(await refresh.json());
      } else {
        showToast('Failed to save template.', 'error');
      }
    } catch (err) {
      showToast('Error saving template.', 'error');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Template deleted!', 'success');
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (err) {
      showToast('Delete failed.', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground animate-pulse">Initializing settings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background p-8 gap-10 max-w-5xl mx-auto w-full pb-32">
      <header className="flex flex-col gap-6">
        <h1 className="text-3xl font-black text-foreground tracking-tighter">Settings</h1>
        <div className="flex gap-4 border-b border-border/50 pb-px">
          {(['llm', 'notification', 'prompt'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveMainTab(tab)}
              className={cn(
                "relative pb-4 text-sm font-bold transition-all px-2",
                activeMainTab === tab
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.toUpperCase()}
              {activeMainTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in slide-in-from-bottom-1" />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-[600px]">
        {/* LLM Section */}
        {activeMainTab === 'llm' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              LLM Configuration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {providers.map((p) => {
                const active = selectedProvider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleProviderSelect(p.id, p.defaultModel)}
                    className={cn(
                      "p-5 rounded-2xl border text-left transition-all hover:shadow-lg",
                      active ? "bg-card border-primary ring-2 ring-primary/20" : "bg-card border-border"
                    )}
                  >
                    <div className={cn("w-4 h-4 rounded-full border mb-3", active ? "border-primary border-[5px]" : "border-border")} />
                    <div className="font-bold text-foreground">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">{p.desc}</div>
                  </button>
                );
              })}
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">API Key / URL</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-input bg-muted/20 font-mono text-sm"
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Model</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-input bg-muted/20 text-sm font-bold"
                />
              </div>
            </div>
          </section>
        )}

        {/* Notifications Section */}
        {activeMainTab === 'notification' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              Notifications
            </h2>
            <div className="max-w-xl bg-card border border-border rounded-2xl p-8 space-y-8 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-foreground">Email Notifications</div>
                  <div className="text-xs text-muted-foreground italic">Summaries for daily/weekly tasks</div>
                </div>
                <button
                  onClick={() => setEmailEnabled(!emailEnabled)}
                  className={cn("w-12 h-6 rounded-full transition-colors flex items-center px-1", emailEnabled ? "bg-primary" : "bg-muted-foreground/30")}
                >
                  <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", emailEnabled ? "translate-x-6" : "translate-x-0")} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Frequency</label>
                  <div className="flex gap-4">
                    {['daily', 'weekly'].map(v => (
                      <button key={v} onClick={() => setFrequency(v)} className="flex items-center gap-2 text-sm">
                        <div className={cn("w-3 h-3 rounded-full border", frequency === v ? "border-primary border-[4px]" : "border-border")} />
                        <span className="capitalize">{v}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Delivery Time</label>
                  <input
                    type="text"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-input text-xs"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Prompts Section */}
        {activeMainTab === 'prompt' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                Prompt Templates
              </h2>
              <div className="flex gap-2">
                {(['task', 'progress', 'templates'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setActivePromptTab(t)}
                    className={cn(
                      "px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all",
                      activePromptTab === t
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "bg-muted text-muted-foreground hover:bg-muted-foreground/10"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-8 shadow-sm min-h-[500px]">
              {activePromptTab === 'task' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-end">
                    <p className="text-xs text-muted-foreground">Prompt for converting chat into structured tasks.</p>
                    <button onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)} className="text-[10px] font-bold text-primary hover:underline">Reset</button>
                  </div>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full h-[400px] p-6 rounded-2xl border border-input bg-muted/10 font-mono text-[11px] leading-relaxed resize-none focus:ring-4 focus:ring-primary/5 transition-all"
                  />
                </div>
              )}

              {activePromptTab === 'progress' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex justify-between items-end">
                    <p className="text-xs text-muted-foreground">Prompt for AI secretary reporting logic.</p>
                    <button onClick={() => setReportPrompt(DEFAULT_REPORT_PROMPT)} className="text-[10px] font-bold text-primary hover:underline">Reset</button>
                  </div>
                  <textarea
                    value={reportPrompt}
                    onChange={(e) => setReportPrompt(e.target.value)}
                    className="w-full h-[400px] p-6 rounded-2xl border border-input bg-muted/10 font-mono text-[11px] leading-relaxed resize-none focus:ring-4 focus:ring-primary/5 transition-all"
                  />
                </div>
              )}

              {activePromptTab === 'templates' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground italic">Custom verification rules for specific task types.</p>
                    {!editingTemplate && (
                      <button onClick={() => setEditingTemplate({ name: '', description: '', content: '' })} className="px-4 py-2 bg-primary text-white text-[10px] font-bold rounded-lg shadow-md">+ NEW</button>
                    )}
                  </div>

                  {editingTemplate ? (
                    <div className="space-y-4 bg-muted/30 p-6 rounded-2xl border border-primary/20">
                      <input value={editingTemplate.name} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} className="w-full h-11 px-4 rounded-xl border border-input text-sm font-bold" placeholder="Name" />
                      <textarea value={editingTemplate.content} onChange={e => setEditingTemplate({ ...editingTemplate, content: e.target.value })} className="w-full h-32 p-4 rounded-xl border border-input text-xs" placeholder="Content" />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 text-[10px] font-bold text-muted-foreground">Cancel</button>
                        <button onClick={handleSaveTemplate} className="px-6 py-2 bg-primary text-white text-[10px] font-bold rounded-lg uppercase tracking-widest">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {templates.map(t => (
                        <div key={t.id} className="p-5 bg-muted/10 rounded-2xl border border-border flex justify-between items-center group">
                          <div>
                            <div className="font-bold text-foreground text-sm">{t.name}</div>
                            <div className="text-[10px] text-muted-foreground">{t.description}</div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingTemplate(t)} className="text-xs font-bold text-primary">Edit</button>
                            <button onClick={() => handleDeleteTemplate(t.id)} className="text-xs font-bold text-destructive">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Fixed Save Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-[300px] h-14 bg-primary text-white font-black tracking-widest uppercase rounded-full shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95 group"
        >
          {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : (
            <>
              <Save className="w-5 h-5 group-hover:animate-bounce" />
              Apply Global Settings
            </>
          )}
        </button>
      </div>

      {ToastComponent}
    </div>
  );
}
