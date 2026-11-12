# Lexilo — Học tiếng Anh thông minh

Ứng dụng học từ vựng tiếng Anh theo phương pháp lặp lại ngắt quãng (**FSRS**), tích hợp **Gia sư Gemini AI**, **linh vật Usagi** theo dõi chuỗi học tập, **đồng bộ đám mây Supabase** và **PWA ngoại tuyến** mượt mà trên cả Desktop, Android và iOS.

- **Bản chạy trực tuyến**: https://lexilo-c9p8.vercel.app/
- **Mã nguồn**: https://github.com/TrieuNguyen1704/Lexilo

---

## Tính năng nổi bật

### 1. Năm chế độ học chuyên sâu
- **Ôn theo lịch (`Scheduled Study`)**: Tự động lọc các thẻ đến hạn theo thuật toán **FSRS** (`ts-fsrs`). Chấm 4 mức **Quên · Khó · Tốt · Dễ** để lên lịch ôn tối ưu và ghi nhận lịch sử.
- **Flashcards 3D**: Thẻ lật 3D mượt mà (hỗ trợ WebKit iOS & Android), hỗ trợ phát âm tiếng Anh (Web Speech API), đổi chiều `EN ↔ VI`, xáo trộn thẻ, đánh dấu **Khó** và phím tắt bàn phím (`Space`, `F`, phím mũi tên).
- **Learn**: Xen kẽ trắc nghiệm và gõ đáp án (yêu cầu đúng 2 lần/thẻ, thẻ sai được hỏi lại). Tích hợp **Gemini AI** chấm nghĩa thông minh (chấp nhận từ đồng nghĩa/diễn đạt tự nhiên thay vì khớp từng ký tự) và chế độ **Tạo câu hỏi AI**.
- **Test**: Tùy chỉnh số câu, dạng câu (`Kết hợp`, `Trắc nghiệm`, `Gõ đáp án`), chiều hỏi; hỗ trợ **Gemini AI** soạn đề, chấm bài và viết nhận xét chi tiết từng câu trước khi bạn chủ động ghi kết quả vào FSRS.
- **Match**: Trò chơi ghép cặp từ – nghĩa (tối đa 6 cặp mỗi lượt) kèm đồng hồ đếm thời gian.

### 2. Linh vật Usagi & Nhịp học 7 ngày
- **Chuỗi ngày học (`Streak`)**: Tính chuỗi liên tiếp theo ngày thực tế cùng biểu đồ nhịp học 7 ngày (`WeeklyRhythmChart`).
- **Linh vật chú thỏ Usagi**: Cổ vũ trực tiếp trên trang chủ với các trạng thái biểu cảm khác nhau tùy theo tiến độ ôn tập trong ngày (`public/usagi-original.png`, `usagi-cheer.png`, `usagi-jump.png`).

### 3. Tích hợp Gemini AI & Ollama Local
- **Gemini API Proxy (`/api/gemini`)**:
  - Hỗ trợ mặc định **`gemini-3.5-flash`** cùng các lựa chọn `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`.
  - Cho phép cấu hình `GEMINI_API_KEY` phía server qua biến môi trường (`.env.local` / Vercel Env) **hoặc** nhập API key cá nhân ngay trong hộp thoại cài đặt trên trình duyệt.
  - Phục vụ: chấm đáp án theo ngữ nghĩa trong *Learn* & *Test*, soạn đề thi ngữ cảnh và sinh nhanh bộ thẻ từ vựng mới.
- **Ollama Local (tùy chọn)**: Khi chạy cùng máy chủ local (`server.mjs`), hỗ trợ mô hình `qwen3.5:2b` qua Ollama.

### 4. Lưu trữ ngoại tuyến, Đồng bộ Đám mây & PWA
- **Offline-first**: Lưu trữ an toàn trên trình duyệt (`localStorage`) khi dùng bản web/Vercel, hoặc lưu vào **SQLite (`data/lexilo.db`)** khi chạy với server Node.js cục bộ.
- **Supabase Cloud Sync**: Đăng nhập và đồng bộ toàn bộ bộ thẻ, lịch FSRS và lịch sử ôn tập giữa nhiều thiết bị.
- **PWA (`manifest.json` + `sw.js`)**: Cài đặt lên màn hình chính điện thoại Android/iOS, kèm tùy chọn thông báo nhắc giờ ôn tập hằng ngày.
- **Nhập nhanh, CSV & Backup JSON**:
  - Nhập nhanh 5 trường theo định dạng:
    ```text
    English | IPA | Part of speech | Vietnamese meaning | English example
    ```
    Ví dụ:
    ```text
    resilient | /rɪˈzɪliənt/ | adjective | kiên cường | She remained resilient after the setback.
    ```
  - Xuất **CSV 5 cột**, sao lưu và khôi phục **JSON** bảo toàn đầy đủ trạng thái FSRS, IPA, từ loại, thẻ Khó và lịch sử ôn tập.

---

## Công nghệ sử dụng

- **Framework**: Next.js 16 (App Router, Turbopack), React 19, TypeScript 5
- **Styling & UI**: Tailwind CSS v4, shadcn/ui, Radix UI, Lucide Icons, Recharts, phong cách Claymorphism (`Be Vietnam Pro` & `Nunito` tự host với đầy đủ bộ dấu tiếng Việt)
- **Thuật toán lặp lại**: `ts-fsrs`
- **AI**: Google Gemini API (`/api/gemini` proxy) & Ollama (`qwen3.5:2b` tùy chọn)
- **Lưu trữ & Đồng bộ**: `localStorage`, SQLite (`server.mjs` + Drizzle ORM), Supabase (`@supabase/supabase-js`)

---

## Cấu trúc thư mục

```text
Lexilo/
├── app/                     # Next.js App Router (page.tsx, layout.tsx, globals.css) & /api/gemini
├── components/
│   ├── dashboard/           # Trang chủ: thẻ tổng quan, nhịp học 7 ngày, linh vật Usagi
│   ├── decks/               # Thư viện bộ thẻ, chi tiết bộ thẻ & các dialog thêm/sửa/xóa
│   ├── import/              # Nhập nhanh 5 trường & tạo thẻ bằng AI
│   ├── layout/              # Header, sidebar desktop, bottom nav mobile, toast thông báo
│   ├── settings/            # Hộp thoại cài đặt Gemini AI, Supabase Cloud Sync & Thông báo
│   ├── study/               # 5 chế độ học (Scheduled, Flashcards 3D, Learn, Test, Match)
│   └── ui/                  # Thành phần giao diện cơ bản (shadcn/ui)
├── hooks/                   # Custom hooks (use-lexilo-store, use-cloud-sync, use-gemini-status...)
├── lib/
│   ├── config/              # Hằng số, bảng màu, cấu hình mặc định
│   ├── domain/              # Logic thuần: FSRS, chuẩn hóa thẻ, tạo câu hỏi, tính streak, importer
│   └── services/            # Repository, localStorage, Gemini proxy, Supabase, Web Speech, Notification
├── types/                   # Kiểu TypeScript (lexilo.ts, ai.ts, navigation.ts)
├── public/                  # PWA manifest, Service Worker, icon & ảnh linh vật Usagi
└── tests/                   # Unit test domain, UI SSR và kiểm thử tích hợp
```

---

## Hướng dẫn chạy trên máy cá nhân

### Yêu cầu
- Node.js **>= 22.13.0**

### 1. Cài đặt & Cấu hình môi trường

```powershell
npm.cmd install
```

Tạo tệp `.env.local` ở thư mục gốc nếu muốn gắn sẵn Gemini API key cho server (tệp này đã được `.gitignore` bỏ qua, **không** đưa lên GitHub):

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
```

*(Tùy chọn)* Có thể khai báo thêm `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` nếu muốn dùng dự án Supabase riêng.

### 2. Chạy ứng dụng

- **Chạy chế độ Next.js (khuyến nghị cho giao diện & `/api/gemini`)**:

```powershell
npx next dev
```

Mở http://localhost:3000.

- **Hoặc chạy bản máy chủ local kèm SQLite (`data/lexilo.db`)**:

```powershell
npm.cmd run dev
```

### 3. Build, Lint & Kiểm thử

```powershell
npm.cmd run build
npx eslint app components/dashboard components/decks components/import components/layout components/settings components/study hooks lib types --max-warnings=0
node --test --test-concurrency=1 tests/learning-domain.test.mjs tests/domain-modules.test.mjs tests/ui-components.test.mjs tests/rendered-html.test.mjs
```
