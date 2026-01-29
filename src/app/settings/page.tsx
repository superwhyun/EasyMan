'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

const providers = [
  { id: 'openai', name: 'OpenAI', desc: 'GPT-5.2 (Latest)', defaultModel: 'gpt-5.2' },
  { id: 'claude', name: 'Claude AI', desc: 'Claude 3.5 Sonnet', defaultModel: 'claude-3-5-sonnet' },
  { id: 'grok', name: 'Grok', desc: 'Grok-4', defaultModel: 'grok-4' },
  { id: 'ollama', name: 'Ollama', desc: 'Local Models', defaultModel: 'llama3' },
];

export default function SettingsPage() {
  const { showToast, ToastComponent } = useToast();
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gpt-5.2');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Notification Settings
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [frequency, setFrequency] = useState('daily');
  const [deliveryTime, setDeliveryTime] = useState('09:00 AM');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSelectedProvider(data.llmProvider || 'openai');
          setApiKey(data.llmApiKey || '');
          setModelName(data.llmModel || 'gpt-5.2');
          setSystemPrompt(data.systemPrompt || '');
          setEmailEnabled(data.emailEnabled ?? true);
          setFrequency(data.emailFrequency || 'daily');
          setDeliveryTime(data.deliveryTime || '09:00 AM');
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleProviderSelect = (id: string, defaultModel: string) => {
    setSelectedProvider(id);
    setModelName(defaultModel);
  };

  const handleSave = async () => {
    // Validation
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
          emailEnabled,
          emailFrequency: frequency,
          deliveryTime,
        }),
      });

      if (res.ok) {
        showToast('Settings saved successfully!', 'success');
      } else {
        showToast('Failed to save settings.', 'error');
      }
    } catch (error) {
      showToast('Connection error occurred.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-8 gap-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* LLM Configuration */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-foreground">LLM Configuration</h2>

        {/* Provider Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {providers.map((provider) => {
            const isSelected = selectedProvider === provider.id;
            return (
              <div
                key={provider.id}
                onClick={() => handleProviderSelect(provider.id, provider.defaultModel)}
                className={cn(
                  "relative p-5 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all hover:shadow-md",
                  isSelected
                    ? "bg-card border-primary ring-1 ring-primary"
                    : "bg-card border-border hover:border-primary/50"
                )}
              >
                {/* Radio Button */}
                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center mb-1",
                  isSelected ? "border-primary border-[6px]" : "border-border border"
                )} />

                <span className="text-base font-semibold text-foreground">{provider.name}</span>
                <span className="text-xs text-muted-foreground">{provider.desc}</span>
              </div>
            );
          })}
        </div>

        {/* Configuration Form */}
        <div className="flex flex-col gap-6 max-w-xl mt-2 bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">API Key / Endpoint URL</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-... or http://localhost:11434"
              className="w-full h-11 px-4 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Model Name</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">System Prompt</label>
              <span className="text-[10px] text-muted-foreground">Supports {'{TODAY}'}, {'{NOW}'}, {'{USERS_LIST}'}</span>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="If empty, the default assistant prompt will be used."
              className="w-full h-32 px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Notification Configuration */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-foreground">Notification Configuration</h2>

        <div className="max-w-xl bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col gap-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-foreground">Enable Email Notifications</span>
              <span className="text-xs text-muted-foreground">Send daily/weekly task summaries to assignees</span>
            </div>
            <button
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={cn(
                "w-11 h-6 rounded-full p-0.5 transition-colors duration-300 ease-in-out focus:outline-none",
                emailEnabled ? "bg-primary" : "bg-input"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ease-in-out",
                emailEnabled ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>

          <div className="h-px w-full bg-border" />

          {/* Settings */}
          <div className="flex flex-col gap-5">
            {/* Frequency */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Frequency</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center",
                    frequency === 'daily' ? "border-primary border-[5px]" : "border-muted-foreground border"
                  )} />
                  <input
                    type="radio"
                    name="freq"
                    value="daily"
                    checked={frequency === 'daily'}
                    onChange={() => setFrequency('daily')}
                    className="hidden"
                  />
                  <span className="text-sm text-foreground">Daily</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center",
                    frequency === 'weekly' ? "border-primary border-[5px]" : "border-muted-foreground border"
                  )} />
                  <input
                    type="radio"
                    name="freq"
                    value="weekly"
                    checked={frequency === 'weekly'}
                    onChange={() => setFrequency('weekly')}
                    className="hidden"
                  />
                  <span className="text-sm text-foreground">Weekly</span>
                </label>
              </div>
            </div>

            {/* Delivery Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Delivery Time</label>
              <input
                type="text"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-[150px] h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-[200px] h-11 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Apply Settings"}
        </button>
      </div>
      {ToastComponent}
    </div>
  );
}

