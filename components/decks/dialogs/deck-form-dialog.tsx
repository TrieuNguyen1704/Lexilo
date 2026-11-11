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
            <p className="text-xs font-black tracking-[.16em] uppercase" style={{ color }}>
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
            <span className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-600">
              <Palette size={16} /> Màu sắc đại diện
            </span>
            <div className="grid grid-cols-4 gap-2">
              {DECK_PRESET_COLORS.map((item) => {
                const active = color === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setColor(item.value)}
                    className={`relative flex h-10 items-center justify-center rounded-xl border-2 transition ${
                      active ? "scale-105 border-slate-800 shadow-sm" : "border-transparent hover:scale-102"
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

          <div className="rounded-2xl border bg-slate-50 p-3.5">
            <span className="mb-1 block text-xs font-bold text-slate-400">
              Xem trước thẻ hiển thị
            </span>
            <div className="flex items-center gap-3">
              <span
                className="grid size-10 place-items-center rounded-xl text-sm font-black text-white"
                style={{ backgroundColor: color }}
              >
                Aa
              </span>
              <div className="min-w-0 flex-1">
                <b className="block truncate font-bold text-slate-800">
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
            className="rounded-xl font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {busy ? "Đang lưu..." : isEditing ? "Cập nhật" : "Tạo bộ thẻ"}
          </Button>
        </div>
      </form>
    </div>
  );
}
