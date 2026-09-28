"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, Check, Palette, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CardDraft, Deck, PART_OF_SPEECH_OPTIONS } from "@/lib/lexilo";

export const PRESET_COLORS = [
  { value: "#ff6b4a", label: "Cam san hô" },
  { value: "#6c63ff", label: "Tím chàm" },
  { value: "#17a673", label: "Xanh lục bảo" },
  { value: "#e9a11b", label: "Vàng hổ phách" },
  { value: "#2563eb", label: "Xanh hoàng gia" },
  { value: "#ec4899", label: "Hồng cánh sen" },
  { value: "#0d9488", label: "Xanh mòng két" },
  { value: "#8b5cf6", label: "Tím oải hương" },
];

export function DeckDialog({
  initialDeck,
  busy,
  error,
  onClose,
  onSave,
}: {
  initialDeck?: Deck | null;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (deckData: { name: string; color: string }) => Promise<void>;
}) {
  const isEditing = Boolean(initialDeck);
  const [name, setName] = useState(initialDeck?.name || "");
  const [color, setColor] = useState(initialDeck?.color || PRESET_COLORS[0].value);

  useEffect(() => {
    setName(initialDeck?.name || "");
    setColor(initialDeck?.color || PRESET_COLORS[0].value);
  }, [initialDeck]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await onSave({ name: name.trim(), color });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#17233b]/45 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-dialog-title"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-[26px] bg-white p-6 shadow-2xl sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em]" style={{ color }}>
              {isEditing ? "Chỉnh sửa" : "Tạo mới"}
            </p>
            <h2 id="deck-dialog-title" className="mt-1 text-2xl font-black">
              {isEditing ? "Cập nhật bộ thẻ" : "Tạo bộ thẻ mới"}
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Đóng" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="grid gap-1.5 text-sm font-bold text-slate-600">
            Tên bộ thẻ <span className="text-red-500">*</span>
            <Input
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Từ vựng IELTS band 7.0, Tiếng Anh du lịch..."
              className="h-11 rounded-xl"
            />
          </label>

          <div>
            <span className="flex items-center gap-1.5 text-sm font-bold text-slate-600 mb-2">
              <Palette size={16} /> Màu sắc đại diện
            </span>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((item) => {
                const active = color === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setColor(item.value)}
                    className={`relative flex items-center justify-center h-10 rounded-xl transition border-2 ${
                      active ? "border-slate-800 scale-105 shadow-sm" : "border-transparent hover:scale-102"
                    }`}
                    style={{ backgroundColor: item.value }}
                    title={item.label}
                  >
                    {active && <Check className="text-white drop-shadow-md" size={18} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border p-3.5 bg-slate-50">
            <span className="text-xs font-bold text-slate-400 block mb-1">Xem trước thẻ hiển thị</span>
            <div className="flex items-center gap-3">
              <span
                className="grid size-10 place-items-center rounded-xl text-white font-black text-sm"
                style={{ backgroundColor: color }}
              >
                Aa
              </span>
              <div className="min-w-0 flex-1">
                <b className="truncate block font-bold text-slate-800">
                  {name.trim() || "Tên bộ thẻ"}
                </b>
                <span className="text-xs text-slate-400">0 thẻ · 0 đến hạn</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-xl text-white font-bold"
            style={{ backgroundColor: color }}
          >
            {busy ? "Đang lưu..." : isEditing ? "Cập nhật" : "Tạo bộ thẻ"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function DeleteDeckDialog({
  deck,
  cardCount,
  canDelete = true,
  busy,
  onClose,
  onConfirm,
}: {
  deck: Deck;
  cardCount: number;
  canDelete?: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#17233b]/45 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-deck-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-[26px] bg-white p-6 shadow-2xl sm:p-7"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-red-100 text-red-600">
            <Trash2 size={22} />
          </div>
          <div>
            <h2 id="delete-deck-title" className="text-xl font-black text-slate-900">
              Xóa bộ thẻ?
            </h2>
            <p className="text-xs font-semibold text-slate-500">Hành động này không thể hoàn tác</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-red-50/70 border border-red-100 p-4">
          <p className="text-sm font-bold text-slate-800">
            Bạn có chắc chắn muốn xóa bộ thẻ <span className="text-red-600 underline">"{deck.name}"</span>?
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Toàn bộ <b>{cardCount} thẻ</b> cùng tiến độ học và lịch ôn tập FSRS của bộ thẻ này sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.
          </p>
        </div>

        {!canDelete && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>Đây là bộ thẻ duy nhất còn lại. Bạn cần tạo một bộ thẻ mới trước khi xóa bộ này.</span>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || !canDelete}
            onClick={onConfirm}
            className="rounded-xl font-bold bg-red-600 hover:bg-red-700"
          >
            {busy ? "Đang xóa..." : "Xác nhận xóa"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AddCardDialog({
  deck,
  busy,
  error,
  onClose,
  onSave,
}: {
  deck: Deck;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (draft: CardDraft, keepOpen?: boolean) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<CardDraft>({
    front: "",
    ipa: "",
    partOfSpeech: "",
    back: "",
    example: "",
  });
  const [keepOpen, setKeepOpen] = useState(false);

  function update(field: keyof CardDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.front.trim() || !draft.back.trim()) return;
    const success = await onSave(draft, keepOpen);
    if (success && keepOpen) {
      setDraft({ front: "", ipa: "", partOfSpeech: "", back: "", example: "" });
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
            <p className="text-xs font-black uppercase tracking-[.16em]" style={{ color: deck.color }}>
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
            Mặt trước (Từ vựng / Câu hỏi) <span className="text-red-500">*</span>
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
            Mặt sau (Nghĩa tiếng Việt) <span className="text-red-500">*</span>
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
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={keepOpen}
              onChange={(event) => setKeepOpen(event.target.checked)}
              className="size-4 rounded accent-[#6c63ff]"
            />
            Tiếp tục thêm thẻ khác sau khi lưu
          </label>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={busy || !draft.front.trim() || !draft.back.trim()}
              className="rounded-xl bg-[#6c63ff] hover:bg-[#5b52f5] font-bold"
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
