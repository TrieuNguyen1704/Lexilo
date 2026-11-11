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
import { DEFAULT_GEMINI_MODEL, GEMINI_MODEL_OPTIONS } from "@/lib/config/constants";
import { emitGeminiConfigChange } from "@/hooks/use-gemini-status";
import {
  getGeminiConfig,
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
      <DialogContent className="max-h-[88vh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-2xl p-4 sm:p-6">
        <DialogHeader className="pb-2 text-left">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 font-bold text-[#6366f1]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold sm:text-lg">
                Cấu hình Gemini AI
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
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
  const isPreset = GEMINI_MODEL_OPTIONS.some((m) => m.value === initial.model);

  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model || DEFAULT_GEMINI_MODEL);
  const [customModelMode, setCustomModelMode] = useState(!isPreset);
  const [enabled, setEnabled] = useState(initial.apiKey ? initial.enabled : true);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleSave() {
    if (enabled && !apiKey.trim()) {
      onNotice("error", "Vui lòng nhập Gemini API Key hoặc tắt chế độ AI.");
      return;
    }

    const finalModel = model.trim() || DEFAULT_GEMINI_MODEL;
    saveGeminiConfig({
      apiKey: apiKey.trim(),
      model: finalModel,
      enabled: Boolean(apiKey.trim()) && enabled,
    });
    emitGeminiConfigChange();
    onSaved();
    onOpenChange(false);
    onNotice(
      "success",
      apiKey.trim() && enabled
        ? `Đã kích hoạt Gemini (${finalModel}) cho Learn & Kiểm tra!`
        : "Đã lưu cài đặt Gemini AI.",
    );
  }

  function handleClearKey() {
    setApiKey("");
    setEnabled(false);
    setTestResult(null);
    saveGeminiConfig({ apiKey: "", model, enabled: false });
    emitGeminiConfigChange();
    onSaved();
    onNotice("success", "Đã xóa Gemini API Key khỏi trình duyệt.");
  }

  async function handleTestConnection() {
    if (!apiKey.trim()) {
      onNotice("error", "Hãy nhập Gemini API Key trước khi kiểm tra.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    const result = await testGeminiConnection(apiKey.trim(), model.trim() || DEFAULT_GEMINI_MODEL);
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
      {/* Enable Switch */}
      <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5">
        <div>
          <p className="text-xs font-bold text-slate-900 sm:text-sm">
            Bật Gia sư Gemini AI
          </p>
          <p className="text-[11px] text-slate-600">
            Chấm nghĩa linh hoạt, tạo câu hỏi ngữ cảnh và giải thích lỗi sai
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((prev) => !prev)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            enabled ? "bg-[#6366f1]" : "bg-slate-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* API Key Input */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Gemini API Key</label>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-[#6366f1] hover:underline"
          >
            Lấy key miễn phí tại AI Studio →
          </a>
        </div>

        <div className="relative flex items-center gap-1.5">
          <div className="relative flex-1">
            <KeyRound className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="AIzaSy..."
              className="h-10 w-full rounded-xl pr-9 pl-9 font-mono text-xs sm:text-sm"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              className="absolute top-2.5 right-2.5 p-0.5 text-slate-400 hover:text-slate-700"
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
              title="Xóa API Key"
              className="h-10 w-10 shrink-0 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Model Selector */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Mô hình Gemini</label>
          <button
            type="button"
            onClick={() => setCustomModelMode((prev) => !prev)}
            className="text-[11px] font-bold text-[#6366f1] hover:underline"
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
            className="h-10 w-full rounded-xl font-mono text-xs sm:text-sm"
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
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs font-bold sm:text-sm"
          >
            {GEMINI_MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div
          className={`flex items-start gap-2 rounded-xl p-3 text-xs font-semibold ${
            testResult.ok
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {testResult.ok && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Test Connection Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleTestConnection}
        disabled={testing || !apiKey.trim()}
        className="h-10 w-full gap-2 rounded-xl text-xs font-bold"
      >
        <PlugZap className="h-4 w-4 text-[#6366f1]" />
        {testing ? "Đang kiểm tra kết nối..." : "Kiểm tra kết nối API Key"}
      </Button>

      {/* Security Note */}
      <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <span>
          API Key chỉ được lưu trực tiếp trong trình duyệt/thiết bị này và gọi thẳng tới máy chủ
          Google Gemini — không gửi qua máy chủ trung gian.
        </span>
      </div>

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="h-9 rounded-xl text-xs"
        >
          Đóng
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          className="h-9 rounded-xl bg-[#6366f1] px-5 text-xs font-bold text-white hover:bg-[#4f46e5]"
        >
          Lưu cấu hình
        </Button>
      </div>
    </div>
  );
}
