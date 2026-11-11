"use client";

import { FormEvent, useState } from "react";
import { Check, Palette, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DECK_PRESET_COLORS } from "@/lib/config/constants";
import type { Deck } from "@/types/lexilo";

interface DeckFormDialogProps {
  initialDeck?: Deck | null;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (deckData: { name: string; color: string }) => Promise<void>;
}

export function DeckFormDialog({
  initialDeck,
  busy,
  error,
  onClose,
  onSave,
}: DeckFormDialogProps) {
  const isEditing = Boolean(initialDeck);
  const [name, setName] = useState(initialDeck?.name || "");
  const [color, setColor] = useState(initialDeck?.color || DECK_PRESET_COLORS[0].value);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await onSave({ name: name.trim(), color });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#0f172a]/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-dialog-title"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
        className="clay-card w-full max-w-md rounded-[28px] p-6 sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold tracking-[.14em] uppercase" style={{ color }}>
              {isEditing ? "Chỉnh sửa" : "Tạo mới"}
            </p>
            <h2 id="deck-dialog-title" className="font-display mt-1 text-2xl font-bold text-slate-900">
              {isEditing ? "Cập nhật bộ thẻ" : "Tạo bộ thẻ mới"}
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

        <div className="mt-6 space-y-4">
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            <span>
              Tên bộ thẻ <span className="text-red-600">*</span>
            </span>
            <Input
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Từ vựng IELTS band 7.0..."
              className="h-11 rounded-2xl border-[var(--border)] bg-white"
            />
          </label>

          <div>
            <span className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-slate-700">
              <Palette size={16} /> Màu sắc đại diện
            </span>
            <div className="grid grid-cols-4 gap-2.5">
              {DECK_PRESET_COLORS.map((item) => {
                const active = color === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setColor(item.value)}
                    className={`relative flex h-11 items-center justify-center rounded-2xl border-2 transition ${
                      active
                        ? "scale-105 border-slate-900 shadow-md"
                        : "border-transparent hover:scale-102"
                    }`}
                    style={{ backgroundColor: item.value }}
                    title={item.label}
                    aria-label={item.label}
                  >
                    {active && <Check className="text-white drop-shadow-md" size={18} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="clay-surface rounded-2xl p-3.5">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">
              Xem trước thẻ hiển thị
            </span>
            <div className="flex items-center gap-3">
              <span
                className="grid size-10 place-items-center rounded-xl text-sm font-black text-white shadow-xs"
                style={{ backgroundColor: color }}
              >
                Aa
              </span>
              <div className="min-w-0 flex-1">
                <b className="font-display block truncate text-base font-bold text-slate-800">
                  {name.trim() || "Tên bộ thẻ"}
                </b>
                <span className="text-xs font-semibold text-slate-500">0 thẻ · 0 đến hạn</span>
              </div>
            </div>
          </div>
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
            type="submit"
            disabled={busy || !name.trim()}
            className="clay-cta h-10 rounded-2xl px-5 font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {busy ? "Đang lưu..." : isEditing ? "Cập nhật" : "Tạo bộ thẻ"}
          </Button>
        </div>
      </form>
    </div>
  );
}
