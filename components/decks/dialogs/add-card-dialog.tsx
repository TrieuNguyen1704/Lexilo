"use client";

import { FormEvent, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PART_OF_SPEECH_OPTIONS } from "@/lib/config/constants";
import { emptyDraft } from "@/lib/domain/cards";
import type { CardDraft, Deck } from "@/types/lexilo";

interface AddCardDialogProps {
  deck: Deck;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (draft: CardDraft, keepOpen?: boolean) => Promise<boolean>;
}

export function AddCardDialog({
  deck,
  busy,
  error,
  onClose,
  onSave,
}: AddCardDialogProps) {
  const [draft, setDraft] = useState<CardDraft>(emptyDraft);
  const [keepOpen, setKeepOpen] = useState(false);

  function update(field: keyof CardDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.front.trim() || !draft.back.trim()) return;
    const success = await onSave(draft, keepOpen);
    if (success && keepOpen) {
      setDraft(emptyDraft());
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#17233b]/45 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-card-title"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[.16em] uppercase" style={{ color: deck.color }}>
              {deck.name}
            </p>
            <h2 id="add-card-title" className="mt-1 text-2xl font-black">
              Thêm thẻ ghi nhớ mới
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Đóng" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-bold text-slate-600 sm:col-span-2">
            <span>
              Mặt trước (Từ vựng / Câu hỏi) <span className="text-red-500">*</span>
            </span>
            <Input
              autoFocus
              required
              value={draft.front}
              onChange={(event) => update("front", event.target.value)}
              placeholder="Ví dụ: resilient"
              className="h-11 rounded-xl"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-slate-600">
            Phiên âm IPA
            <Input
              value={draft.ipa}
              onChange={(event) => update("ipa", event.target.value)}
              placeholder="/rɪˈzɪliənt/"
              className="h-11 rounded-xl"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-slate-600">
            Từ loại
            <Input
              value={draft.partOfSpeech}
              onChange={(event) => update("partOfSpeech", event.target.value)}
              list="add-card-part-of-speech-options"
              placeholder="adjective, verb..."
              className="h-11 rounded-xl"
            />
            <datalist id="add-card-part-of-speech-options">
              {PART_OF_SPEECH_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-slate-600 sm:col-span-2">
            <span>
              Mặt sau (Nghĩa tiếng Việt) <span className="text-red-500">*</span>
            </span>
            <Textarea
              required
              value={draft.back}
              onChange={(event) => update("back", event.target.value)}
              placeholder="Ví dụ: kiên cường; có khả năng phục hồi nhanh"
              className="min-h-20 rounded-xl"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-slate-600 sm:col-span-2">
            Câu ví dụ tiếng Anh
            <Textarea
              value={draft.example}
              onChange={(event) => update("example", event.target.value)}
              placeholder="Ví dụ: She remained resilient after facing numerous challenges."
              className="min-h-20 rounded-xl"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={keepOpen}
              onChange={(event) => setKeepOpen(event.target.checked)}
              className="size-4 rounded accent-[#6c63ff]"
            />
            Tiếp tục thêm thẻ khác sau khi lưu
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={busy || !draft.front.trim() || !draft.back.trim()}
              className="rounded-xl bg-[#6c63ff] font-bold hover:bg-[#5b52f5]"
            >
              <Plus size={16} />
              {busy ? "Đang lưu..." : "Thêm thẻ"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
