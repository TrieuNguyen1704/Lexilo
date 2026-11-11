"use client";

import { useState } from "react";
import { Settings2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { normalizePartOfSpeech } from "@/lib/domain/cards";
import { createClozes, parseQuickImport } from "@/lib/domain/importer";
import { generateFlashcardsWithGemini } from "@/lib/services/gemini";
import { generateAiCards } from "@/lib/services/lexilo-repository";
import type { CardDraft, Deck, Notice } from "@/types/lexilo";
import type { ImportMode, PreviewCard } from "@/types/navigation";
import { AiPreviewList } from "./ai-preview-list";

interface ImportPanelProps {
  decks: Deck[];
  selectedDeckId: string;
  onSelectDeckId: (id: string) => void;
  ollamaAvailable: boolean;
  geminiActive: boolean;
  geminiModel: string;
  onOpenGeminiSettings: () => void;
  onSaveCards: (
    deckId: string,
    drafts: CardDraft[],
    successMessage?: string,
  ) => Promise<boolean>;
  onNotice: (kind: Notice["kind"], text: string) => void;
}

export function ImportPanel({
  decks,
  selectedDeckId,
  onSelectDeckId,
  ollamaAvailable,
  geminiActive,
  geminiModel,
  onOpenGeminiSettings,
  onSaveCards,
  onNotice,
}: ImportPanelProps) {
  const [mode, setMode] = useState<ImportMode>("pairs");
  const [bulk, setBulk] = useState("");
  const [aiPreview, setAiPreview] = useState<PreviewCard[]>([]);
  const [aiBusy, setAiBusy] = useState(false);

  const parsedCount =
    mode === "pairs" ? parseQuickImport(bulk).length : createClozes(bulk).length;

  async function handleImport() {
    const cards = mode === "pairs" ? parseQuickImport(bulk) : createClozes(bulk);
    const saved = await onSaveCards(selectedDeckId, cards, "Đã lưu thẻ vào thư viện.");
    if (saved) {
      setBulk("");
      setAiPreview([]);
    }
  }

  async function handleGenerateAi() {
    setAiBusy(true);
    setAiPreview([]);
    try {
      const generated = geminiActive
        ? await generateFlashcardsWithGemini(bulk)
        : await generateAiCards(bulk);

      setAiPreview(
        generated.map((card) => ({
          ...card,
          id: crypto.randomUUID(),
          selected: true,
        })),
      );
      onNotice("success", "AI đã tạo bản xem trước. Hãy kiểm tra trước khi lưu.");
    } catch (error) {
      onNotice("error", (error as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  async function handleSaveAiPreview() {
    const selectedCards: CardDraft[] = aiPreview
      .filter((card) => card.selected)
      .map((card) => ({
        front: card.front,
        ipa: card.ipa,
        partOfSpeech: card.partOfSpeech,
        back: card.back,
        example: card.example,
      }));
    const saved = await onSaveCards(
      selectedDeckId,
      selectedCards,
      "Đã lưu các thẻ AI được chọn.",
    );
    if (saved) {
      setBulk("");
      setAiPreview([]);
    }
  }

  function handleUpdatePreviewField(id: string, field: keyof CardDraft, value: string) {
    setAiPreview((cards) =>
      cards.map((card) =>
        card.id === id
          ? {
              ...card,
              [field]: field === "partOfSpeech" ? normalizePartOfSpeech(value) : value,
            }
          : card,
      ),
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-black">Nhập bộ thẻ nhanh</h1>
      <p className="mt-2 text-slate-500">
        Dán nhiều dòng hoặc nhờ Gemini AI / AI local tạo bản xem trước.
      </p>

      <div className="mt-6 rounded-[26px] border bg-white p-5 shadow-sm sm:p-6">
        <Tabs
          value={mode}
          onValueChange={(value) => {
            setMode(value as ImportMode);
            setAiPreview([]);
          }}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pairs">Từ &amp; nghĩa</TabsTrigger>
            <TabsTrigger value="cloze">Điền khuyết</TabsTrigger>
            <TabsTrigger value="ai">AI tạo thẻ</TabsTrigger>
          </TabsList>

          <TabsContent value="pairs">
            <p className="my-4 text-sm text-slate-500">
              Mỗi dòng: <b>English | IPA | Part of speech | Vietnamese meaning | English example</b>
              . Có thể dùng Tab thay cho dấu |.
            </p>
            <Textarea
              value={bulk}
              onChange={(event) => setBulk(event.target.value)}
              className="min-h-64 rounded-2xl text-base"
              placeholder="resilient | /rɪˈzɪliənt/ | adjective | kiên cường | She remained resilient after the setback."
            />
          </TabsContent>

          <TabsContent value="cloze">
            <p className="my-4 text-sm text-slate-500">
              Dán đoạn văn tiếng Anh. Thẻ điền khuyết sẽ để trống IPA và từ loại.
            </p>
            <Textarea
              value={bulk}
              onChange={(event) => setBulk(event.target.value)}
              className="min-h-64 rounded-2xl text-base"
              placeholder="Paste an English paragraph here..."
            />
          </TabsContent>

          <TabsContent value="ai">
            <div
              className={`my-4 flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-sm font-bold ${
                geminiActive
                  ? "bg-indigo-50 text-indigo-700"
                  : ollamaAvailable
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <span>
                {geminiActive
                  ? `● Đang dùng Gemini (${geminiModel}) trực tuyến`
                  : ollamaAvailable
                  ? "● Ollama local đang kết nối"
                  : "○ Chưa bật Gemini API Key (hoặc Ollama) — hãy cài API Key để dùng AI"}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onOpenGeminiSettings}
                className="h-8 gap-1 rounded-lg bg-white text-xs font-bold text-slate-700"
              >
                <Settings2 size={13} />
                {geminiActive ? "Đổi Gemini Key" : "Cài Gemini API Key"}
              </Button>
            </div>
            <Textarea
              value={bulk}
              onChange={(event) => {
                setBulk(event.target.value);
                setAiPreview([]);
              }}
              className="min-h-52 rounded-2xl text-base"
              placeholder="Dán bài đọc hoặc chủ đề. AI sẽ tạo từ, IPA, từ loại, nghĩa và ví dụ để bạn duyệt..."
            />
          </TabsContent>
        </Tabs>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            value={selectedDeckId}
            onChange={(event) => onSelectDeckId(event.target.value)}
            className="h-11 min-w-0 rounded-xl border bg-white px-3 font-semibold"
          >
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>

          {mode === "ai" ? (
            <Button
              disabled={aiBusy || !bulk.trim()}
              onClick={handleGenerateAi}
              className="h-11 rounded-xl bg-[#ff6b4a] px-6 font-bold text-white hover:bg-[#eb5737]"
            >
              <Sparkles />
              {aiBusy ? "AI đang tạo..." : "Tạo bản xem trước"}
            </Button>
          ) : (
            <Button
              disabled={!parsedCount}
              onClick={handleImport}
              className="h-11 rounded-xl bg-[#ff6b4a] px-6 font-bold text-white hover:bg-[#eb5737]"
            >
              <Sparkles />
              Tạo {parsedCount} thẻ
            </Button>
          )}
        </div>
      </div>

      {mode === "ai" && aiPreview.length > 0 && (
        <AiPreviewList
          cards={aiPreview}
          onToggleSelected={(id, selected) =>
            setAiPreview((cards) =>
              cards.map((item) => (item.id === id ? { ...item, selected } : item)),
            )
          }
          onRemove={(id) =>
            setAiPreview((cards) => cards.filter((item) => item.id !== id))
          }
          onUpdateField={handleUpdatePreviewField}
          onSaveSelected={handleSaveAiPreview}
        />
      )}
    </div>
  );
}
