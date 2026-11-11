"use client";

import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Deck } from "@/types/lexilo";

interface DeleteDeckDialogProps {
  deck: Deck;
  cardCount: number;
  canDelete?: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteDeckDialog({
  deck,
  cardCount,
  canDelete = true,
  busy,
  onClose,
  onConfirm,
}: DeleteDeckDialogProps) {
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

        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/70 p-4">
          <p className="text-sm font-bold text-slate-800">
            Bạn có chắc chắn muốn xóa bộ thẻ{" "}
            <span className="text-red-600 underline">&ldquo;{deck.name}&rdquo;</span>?
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Toàn bộ <b>{cardCount} thẻ</b> cùng tiến độ học và lịch ôn tập FSRS của bộ thẻ này sẽ
            bị xóa hoàn toàn khỏi cơ sở dữ liệu.
          </p>
        </div>

        {!canDelete && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              Đây là bộ thẻ duy nhất còn lại. Bạn cần tạo một bộ thẻ mới trước khi xóa bộ này.
            </span>
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
            className="rounded-xl bg-red-600 font-bold hover:bg-red-700"
          >
            {busy ? "Đang xóa..." : "Xác nhận xóa"}
          </Button>
        </div>
      </div>
    </div>
  );
}
