"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CardDraft } from "@/types/lexilo";
import type { PreviewCard } from "@/types/navigation";

interface AiPreviewListProps {
  cards: PreviewCard[];
  onToggleSelected: (id: string, selected: boolean) => void;
  onRemove: (id: string) => void;
  onUpdateField: (id: string, field: keyof CardDraft, value: string) => void;
  onSaveSelected: () => void;
}

export function AiPreviewList({
  cards,
  onToggleSelected,
  onRemove,
  onUpdateField,
  onSaveSelected,
}: AiPreviewListProps) {
  const selectedCount = cards.filter((card) => card.selected).length;

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Duyệt kết quả AI</h2>
          <p className="text-sm font-medium text-slate-600">
            Sửa, bỏ chọn hoặc xóa từng thẻ trước khi lưu.
          </p>
        </div>
        <Button
          disabled={!selectedCount}
          onClick={onSaveSelected}
          className="clay-cta h-10 rounded-2xl bg-[#047857] px-5 font-bold text-white hover:bg-[#065f46]"
        >
          Lưu {selectedCount} thẻ đã chọn
        </Button>
      </div>

      <div className="mt-4 space-y-3.5">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={`clay-card rounded-3xl p-4 sm:p-5 transition-opacity ${
              card.selected ? "" : "opacity-55"
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-extrabold text-slate-800">
                <input
                  type="checkbox"
                  checked={card.selected}
                  onChange={(event) => onToggleSelected(card.id, event.target.checked)}
                  className="size-4 accent-[#7c3aed]"
                />
                Thẻ {index + 1}
              </label>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Xóa khỏi bản xem trước"
                onClick={() => onRemove(card.id)}
                className="size-9 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <X size={16} />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewField
                label="Mặt trước (Front)"
                value={card.front}
                onChange={(value) => onUpdateField(card.id, "front", value)}
              />
              <PreviewField
                label="Phiên âm IPA"
                value={card.ipa}
                onChange={(value) => onUpdateField(card.id, "ipa", value)}
              />
              <PreviewField
                label="Từ loại"
                value={card.partOfSpeech}
                onChange={(value) => onUpdateField(card.id, "partOfSpeech", value)}
              />
              <PreviewField
                label="Mặt sau (Back)"
                value={card.back}
                onChange={(value) => onUpdateField(card.id, "back", value)}
              />
              <label className="grid gap-1 text-xs font-extrabold text-slate-600 uppercase sm:col-span-2">
                Câu ví dụ (Example)
                <Textarea
                  value={card.example}
                  onChange={(event) => onUpdateField(card.id, "example", event.target.value)}
                  className="rounded-2xl border-[var(--border)] bg-white"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-extrabold text-slate-600 uppercase">
      {label}
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-2xl border-[var(--border)] bg-white"
      />
    </label>
  );
}
