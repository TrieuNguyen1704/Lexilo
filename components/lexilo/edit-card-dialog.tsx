"use client";

import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardDraft, PART_OF_SPEECH_OPTIONS } from "@/lib/lexilo";

type Props = {
  card: Card;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (draft: CardDraft) => Promise<void>;
};

export function EditCardDialog({ card, busy, error, onClose, onSave }: Props) {
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#17233b]/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-card-title"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#6c63ff]">Chỉnh sửa thẻ</p>
            <h2 id="edit-card-title" className="mt-1 text-2xl font-black">Nội dung flashcard</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Đóng" onClick={onClose}><X /></Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Front" className="sm:col-span-2">
            <Input required value={draft.front} onChange={(event) => update("front", event.target.value)} />
          </Field>
          <Field label="IPA">
            <Input value={draft.ipa} onChange={(event) => update("ipa", event.target.value)} placeholder="/rɪˈzɪliənt/" />
          </Field>
          <Field label="Part of speech">
            <Input
              value={draft.partOfSpeech}
              onChange={(event) => update("partOfSpeech", event.target.value)}
              list="part-of-speech-options"
              placeholder="adjective"
            />
            <datalist id="part-of-speech-options">
              {PART_OF_SPEECH_OPTIONS.map((option) => <option key={option} value={option} />)}
            </datalist>
          </Field>
          <Field label="Back" className="sm:col-span-2">
            <Textarea required value={draft.back} onChange={(event) => update("back", event.target.value)} className="min-h-24" />
          </Field>
          <Field label="Example" className="sm:col-span-2">
            <Textarea value={draft.example} onChange={(event) => update("example", event.target.value)} className="min-h-24" />
          </Field>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button disabled={busy || !draft.front.trim() || !draft.back.trim()}>{busy ? "Đang lưu..." : "Lưu thay đổi"}</Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-slate-600 ${className}`}>
      {label}
      {children}
    </label>
  );
}
