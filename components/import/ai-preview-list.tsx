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
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Duyệt kết quả AI</h2>
          <p className="text-sm text-slate-500">Sửa, bỏ chọn hoặc xóa từng thẻ trước khi lưu.</p>
        </div>
        <Button
          disabled={!selectedCount}
          onClick={onSaveSelected}
          className="rounded-xl font-bold"
        >
          Lưu {selectedCount} thẻ đã chọn
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={`rounded-2xl border bg-white p-4 shadow-sm ${card.selected ? "" : "opacity-55"}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-black">
                <input
                  type="checkbox"
                  checked={card.selected}
                  onChange={(event) => onToggleSelected(card.id, event.target.checked)}
                  className="size-4 accent-[#6c63ff]"
                />
                Thẻ {index + 1}
              </label>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Xóa khỏi bản xem trước"
                onClick={() => onRemove(card.id)}
              >
                <X />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewField
                label="Front"
                value={card.front}
                onChange={(value) => onUpdateField(card.id, "front", value)}
              />
              <PreviewField
                label="IPA"
                value={card.ipa}
                onChange={(value) => onUpdateField(card.id, "ipa", value)}
              />
              <PreviewField
                label="Part of speech"
                value={card.partOfSpeech}
                onChange={(value) => onUpdateField(card.id, "partOfSpeech", value)}
              />
              <PreviewField
                label="Back"
                value={card.back}
                onChange={(value) => onUpdateField(card.id, "back", value)}
              />
              <label className="grid gap-1 text-xs font-black text-slate-500 uppercase sm:col-span-2">
                Example
                <Textarea
                  value={card.example}
                  onChange={(event) => onUpdateField(card.id, "example", event.target.value)}
                  className="rounded-xl"
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
    <label className="grid gap-1 text-xs font-black text-slate-500 uppercase">
      {label}
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl"
      />
    </label>
  );
}
