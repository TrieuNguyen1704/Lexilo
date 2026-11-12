"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PART_OF_SPEECH_OPTIONS } from "@/lib/config/constants";
import type { Card, CardDraft } from "@/types/lexilo";

interface EditCardDialogProps {
  card: Card;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (draft: CardDraft) => Promise<void>;
}

export function EditCardDialog({
  card,
  busy,
  error,
  onClose,
  onSave,
}: EditCardDialogProps) {
  const [draft, setDraft] = useState<CardDraft>({
    front: card.front,
    ipa: card.ipa,
    partOfSpeech: card.partOfSpeech,
    back: card.back,
    example: card.example,
  });

  function update(field: keyof CardDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave(draft);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-card-title"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        className="clay-card max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-[28px] p-5 sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold tracking-[.14em] text-[#6d28d9] uppercase">
              Chỉnh sửa thẻ
            </p>
            <h2 id="edit-card-title" className="font-display mt-1 text-2xl font-bold text-slate-900">
              Nội dung flashcard
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Đóng"
            onClick={onClose}
            className="size-10 rounded-2xl text-slate-500 hover:bg-slate-100"
          >
            <X />
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Mặt trước (Front)" className="sm:col-span-2">
            <Input
              required
              value={draft.front}
              onChange={(event) => update("front", event.target.value)}
              className="h-11 rounded-2xl border-[var(--border)] bg-white"
            />
          </Field>
          <Field label="Phiên âm IPA">
            <Input
              value={draft.ipa}
              onChange={(event) => update("ipa", event.target.value)}
              placeholder="/rɪˈzɪliənt/"
              className="h-11 rounded-2xl border-[var(--border)] bg-white"
            />
          </Field>
          <Field label="Từ loại (Part of speech)">
            <Input
              value={draft.partOfSpeech}
              onChange={(event) => update("partOfSpeech", event.target.value)}
              list="part-of-speech-options"
              placeholder="adjective"
              className="h-11 rounded-2xl border-[var(--border)] bg-white"
            />
            <datalist id="part-of-speech-options">
              {PART_OF_SPEECH_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
          <Field label="Mặt sau (Back)" className="sm:col-span-2">
            <Textarea
              required
              value={draft.back}
              onChange={(event) => update("back", event.target.value)}
              className="min-h-24 rounded-2xl border-[var(--border)] bg-white"
            />
          </Field>
          <Field label="Câu ví dụ (Example)" className="sm:col-span-2">
            <Textarea
              value={draft.example}
              onChange={(event) => update("example", event.target.value)}
              className="min-h-24 rounded-2xl border-[var(--border)] bg-white"
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 rounded-2xl border-[var(--border)] font-bold"
          >
            Hủy
          </Button>
          <Button
            disabled={busy || !draft.front.trim() || !draft.back.trim()}
            className="clay-cta h-10 rounded-2xl bg-[#7c3aed] px-5 font-bold text-white hover:bg-[#6d28d9]"
          >
            {busy ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-slate-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}
