"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { emitGeminiConfigChange } from "@/hooks/use-gemini-status";
import { DEFAULT_GEMINI_MODEL, GEMINI_MODEL_OPTIONS } from "@/lib/config/constants";
import {
  getGeminiConfig,
  getServerGeminiStatus,
  saveGeminiConfig,
  testGeminiConnection,
} from "@/lib/services/gemini";
import type { Notice } from "@/types/lexilo";

interface GeminiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onNotice: (kind: Notice["kind"], text: string) => void;
}

export function GeminiDialog(props: GeminiDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="clay-card max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-[28px] p-5 sm:p-6">
        <DialogHeader className="pb-2 text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-[#6d28d9] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.85)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-slate-900">
                Cấu hình Gemini AI
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-600">
                Trợ lý thông minh cho chế độ Learn, Kiểm tra &amp; Tạo thẻ
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {props.open && <GeminiDialogBody {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function GeminiDialogBody({ onOpenChange, onSaved, onNotice }: GeminiDialogProps) {
  const initial = getGeminiConfig();
  const serverStatus = getServerGeminiStatus();
  const isPreset = GEMINI_MODEL_OPTIONS.some((m) => m.value === initial.model);

  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model || DEFAULT_GEMINI_MODEL);
  const [customModelMode, setCustomModelMode] = useState(!isPreset);
  const [enabled, setEnabled] = useState(
    initial.apiKey || serverStatus.configured ? initial.enabled : true,
  );
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const hasAvailableKey = Boolean(apiKey.trim()) || serverStatus.configured;

  function handleSave() {
    if (enabled && !hasAvailableKey) {
      onNotice("error", "Vui lòng nhập Gemini API Key hoặc tắt chế độ AI.");
      return;
    }

    const finalModel = model.trim() || DEFAULT_GEMINI_MODEL;
    saveGeminiConfig({
      apiKey: apiKey.trim(),
      model: finalModel,
      enabled: hasAvailableKey && enabled,
    });
    emitGeminiConfigChange();
    onSaved();
    onOpenChange(false);
    onNotice(
      "success",
      hasAvailableKey && enabled
        ? `Đã kích hoạt Gemini (${finalModel}) cho Learn & Kiểm tra!`
        : "Đã lưu cài đặt Gemini AI.",
    );
  }

  function handleClearKey() {
    setApiKey("");
    setEnabled(serverStatus.configured);
    setTestResult(null);
    saveGeminiConfig({ apiKey: "", model, enabled: serverStatus.configured });
    emitGeminiConfigChange();
    onSaved();
    onNotice("success", "Đã xóa API Key tùy chỉnh trên trình duyệt.");
  }

  async function handleTestConnection() {
    if (!hasAvailableKey) {
      onNotice("error", "Hãy nhập Gemini API Key trước khi kiểm tra.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    const result = await testGeminiConnection(
      apiKey.trim(),
      model.trim() || DEFAULT_GEMINI_MODEL,
    );
    setTestResult(result);
    setTesting(false);

    if (result.ok) {
      onNotice("success", result.message);
    } else {
      onNotice("error", result.message);
    }
  }

  return (
    <div className="space-y-4 py-1">
      {serverStatus.configured && !apiKey.trim() && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/85 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Hệ thống đã tích hợp sẵn <b>Gemini API Key</b> trên máy chủ (<code>.env</code>). Bạn
            có thể kiểm tra hoặc dùng ngay mà không cần nhập lại!
          </span>
        </div>
      )}

      <div className="clay-surface flex items-center justify-between gap-3 rounded-2xl p-3.5">
        <div>
          <p className="text-xs font-extrabold text-slate-900 sm:text-sm">
            Bật Gia sư Gemini AI
          </p>
          <p className="text-[11px] font-medium text-slate-600">
            Chấm nghĩa linh hoạt, tạo câu hỏi ngữ cảnh và giải thích lỗi sai
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Bật Gia sư Gemini AI"
          onClick={() => setEnabled((prev) => !prev)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            enabled ? "bg-[#7c3aed]" : "bg-slate-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700">
            {serverStatus.configured ? "API Key riêng (Tùy chọn ghi đè)" : "Gemini API Key"}
          </label>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-extrabold text-[#6d28d9] hover:underline"
          >
            Lấy key tại AI Studio →
          </a>
        </div>

        <div className="relative flex items-center gap-1.5">
          <div className="relative flex-1">
            <KeyRound className="absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder={
                serverStatus.configured
                  ? "Đang dùng key bảo mật của hệ thống"
                  : "AIza... hoặc AQ..."
              }
              className="h-10 w-full rounded-2xl border-[var(--border)] bg-white pr-10 pl-10 font-mono text-xs sm:text-sm"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              className="absolute top-2 right-2 rounded-lg p-1 text-slate-500 hover:text-slate-800"
              aria-label={showKey ? "Ẩn API Key" : "Hiện API Key"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {initial.apiKey && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleClearKey}
              title="Xóa API Key trình duyệt"
              aria-label="Xóa API Key trình duyệt"
              className="h-10 w-10 shrink-0 rounded-2xl border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700">Mô hình Gemini</label>
          <button
            type="button"
            onClick={() => setCustomModelMode((prev) => !prev)}
            className="text-[11px] font-extrabold text-[#6d28d9] hover:underline"
          >
            {customModelMode ? "Chọn từ danh sách" : "Tự nhập tên model"}
          </button>
        </div>

        {customModelMode ? (
          <Input
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setTestResult(null);
            }}
            placeholder="gemini-3.5-flash"
            className="h-10 w-full rounded-2xl border-[var(--border)] bg-white font-mono text-xs sm:text-sm"
            autoCapitalize="none"
            autoCorrect="off"
          />
        ) : (
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setTestResult(null);
            }}
            aria-label="Chọn mô hình Gemini"
            className="h-10 w-full rounded-2xl border-[1.5px] border-[var(--border)] bg-white px-3 text-xs font-bold text-slate-800 sm:text-sm"
          >
            {GEMINI_MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {testResult && (
        <div
          className={`flex items-start gap-2 rounded-2xl p-3 text-xs font-bold ${
            testResult.ok
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {testResult.ok && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
          <span>{testResult.message}</span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleTestConnection}
        disabled={testing || !hasAvailableKey}
        className="tap-press h-10 w-full gap-2 rounded-2xl border-[var(--border)] bg-white text-xs font-extrabold text-slate-800"
      >
        <PlugZap className="h-4 w-4 text-[#7c3aed]" />
        {testing ? "Đang kiểm tra kết nối..." : "Kiểm tra kết nối Gemini"}
      </Button>

      <div className="clay-surface flex items-start gap-2 rounded-2xl p-3 text-[11px] leading-relaxed font-medium text-slate-600">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <span>
          Key hệ thống được lưu bảo mật trong biến môi trường máy chủ (không đẩy lên GitHub).
          Key tự nhập sẽ chỉ lưu cục bộ trên trình duyệt này.
        </span>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="h-9 rounded-2xl border-[var(--border)] text-xs font-bold"
        >
          Đóng
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          className="clay-cta h-9 rounded-2xl bg-[#7c3aed] px-5 text-xs font-bold text-white hover:bg-[#6d28d9]"
        >
          Lưu cấu hình
        </Button>
      </div>
    </div>
  );
}
