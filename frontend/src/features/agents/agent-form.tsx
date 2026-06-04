"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { AgentDraft } from "@/types/agent";

const emptyDraft: AgentDraft = {
  name: "",
  welcomeMessage: "",
  systemPrompt: "",
  provider: "openai",
  model: "gpt-4o-mini",
  voiceProvider: "elevenlabs",
  transcriberProvider: "deepgram",
};

export function AgentForm({
  initialDraft,
  mode,
  onSubmit,
}: Readonly<{
  initialDraft?: AgentDraft;
  mode: "create" | "edit";
  onSubmit: (draft: AgentDraft) => Promise<void>;
}>) {
  const [draft, setDraft] = useState<AgentDraft>(initialDraft ?? emptyDraft);
  const [validationError, setValidationError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof AgentDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.welcomeMessage.trim() || !draft.systemPrompt.trim() || !draft.provider.trim() || !draft.model.trim()) {
      setValidationError("Agent name, welcome message, system prompt, provider, and model are required.");
      return;
    }
    setValidationError("");
    setSubmitting(true);
    try {
      await onSubmit(draft);
      if (mode === "create") {
        setDraft(emptyDraft);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {validationError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {validationError}
        </div>
      ) : null}
      <label className="block text-sm font-medium text-slate-700">
        Agent name
        <input
          className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
          value={draft.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Welcome message
        <input
          className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
          value={draft.welcomeMessage}
          onChange={(event) => updateField("welcomeMessage", event.target.value)}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        System prompt
        <textarea
          className="mt-1 min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          value={draft.systemPrompt}
          onChange={(event) => updateField("systemPrompt", event.target.value)}
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Provider
          <input
            className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            value={draft.provider}
            onChange={(event) => updateField("provider", event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Model
          <input
            className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            value={draft.model}
            onChange={(event) => updateField("model", event.target.value)}
          />
        </label>
      </div>
      <Button type="submit" disabled={submitting}>
        {mode === "create" ? "Create agent" : "Save changes"}
      </Button>
    </form>
  );
}

