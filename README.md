# Lexilo Local

Ứng dụng flashcard tiếng Anh chạy hoàn toàn trên máy cá nhân.

## Công nghệ

- React 19 + TypeScript + Tailwind CSS
- Node.js API
- SQLite tích hợp trong Node.js
- FSRS bằng `ts-fsrs`
- AI local tùy chọn: Ollama + Qwen 3.5 2B

## Chạy trên Windows

Mở PowerShell trong thư mục Lexilo:

```powershell
npm.cmd install
npm.cmd run dev
```

Mở http://localhost:5173. Database nằm tại `data\lexilo.db`; không xóa thư mục `data`.

Build và kiểm thử:

```powershell
npm.cmd run build
npm.cmd test
```

## Nhập nhanh

Mỗi dòng gồm năm trường:

```text
English | IPA | Part of speech | Vietnamese meaning | English example
```

Ví dụ:

```text
resilient | /rɪˈzɪliənt/ | adjective | kiên cường | She remained resilient after the setback.
```

Các từ loại phổ biến được chuẩn hóa sang chữ thường. Người dùng vẫn có thể nhập giá trị tùy chỉnh.

## Các chế độ học

- **Ôn theo lịch**: chỉ lấy thẻ đến hạn; lựa chọn Quên, Khó, Tốt hoặc Dễ cập nhật FSRS và review history.
- **Flashcards / Học tự do**: học toàn bộ bộ thẻ bất cứ lúc nào, đổi chiều, xáo trộn, đánh dấu thẻ Khó và không tự đổi lịch FSRS.
- **Learn**: xen kẽ trắc nghiệm và gõ đáp án; mỗi thẻ phải đúng hai lần, thẻ sai được hỏi lại.
- **Test**: chọn số câu, dạng câu và chiều hỏi; chỉ hiển thị đáp án sau khi nộp.
- **Match**: ghép tối đa sáu cặp từ-nghĩa theo thời gian.

Learn, Test và Flashcards chỉ ghi vào FSRS khi người dùng chủ động chọn hành động tương ứng.

## AI local

1. Cài Ollama từ https://ollama.com/download
2. Chạy `ollama pull qwen3.5:2b`
3. Mở Ollama rồi khởi động Lexilo.

AI tạo bản xem trước gồm Front, IPA, Part of speech, Back và Example. Người dùng có thể sửa, bỏ chọn hoặc xóa từng thẻ trước khi lưu. Nếu Ollama không chạy, các tính năng học khác vẫn hoạt động bình thường.

## Dữ liệu

- Backup JSON mới lưu đầy đủ FSRS, review history, IPA, từ loại và trạng thái thẻ Khó.
- Restore tương thích với cả backup cũ thiếu các trường mới.
- Migration chỉ thêm cột còn thiếu; không tạo lại database hay đổi ID thẻ.
