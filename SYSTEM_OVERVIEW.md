# HDHA - System Overview

Tài liệu này mô tả ngắn gọn chương trình đang làm gì, cấu trúc hệ thống, dữ liệu lưu ở đâu, API nào phục vụ tính năng nào, và nên sửa chỗ nào khi muốn mở rộng.

## 1) Ứng dụng này làm gì?

Đây là một web app cá nhân/couple app gồm:

- Trang chủ cảm xúc/kỷ niệm.
- Nhật ký khoảnh khắc (ảnh/video/caption).
- Tạo khoảnh khắc mới.
- Đếm ngày yêu.
- Theo dõi chu kỳ kinh + gợi ý AI theo ngữ cảnh.
- Thư viện blog riêng tư (có login gate).
- Hành trình tình yêu (timeline).
- Mood Map cho 2 người (lưu DB, không dùng localStorage).
- AI chat widget dùng dữ liệu app để trả lời.

## 2) Công nghệ chính

- Backend: `Node.js + Express`
- Database: `MongoDB + Mongoose`
- Frontend: `HTML/CSS/JS` thuần (không framework)
- Upload media: `multer`, hỗ trợ Cloudinary nếu có cấu hình

## 3) Cấu trúc thư mục

- `src/server.js`: entry backend, mount toàn bộ API + static files
- `src/routes/*`: các route API theo tính năng
- `src/models/*`: schema MongoDB
- `src/middleware/userContext.js`: gán `req.userId` (dùng shared user)
- `src/lib/*`: tiện ích Cloudinary/migration
- `public/*`: toàn bộ UI trang tĩnh + JS client
- `uploads/*`: file upload local

## 4) Cách chạy

- Dev: `npm run dev`
- Prod local: `npm start`
- Mặc định backend chạy cổng `4000` (trừ khi có `PORT`)
- Mongo mặc định: `mongodb://localhost:27017/hdha` (trừ khi có `MONGO_URI`)

## 5) Biến môi trường quan trọng

- `MONGO_URI`: chuỗi kết nối MongoDB
- `PORT`: cổng server
- `HF_API_TOKEN`: bật AI qua HuggingFace router
- `OPENAI_API_KEY`: fallback/hoặc provider AI khác
- `OPENAI_MODEL`, `HF_MODEL`: model name
- `SHARED_USER_ID`: userId dùng chung (nếu muốn override)
- Cloudinary (nếu bật upload cloud): theo config trong `src/lib/cloudinary.js`

## 6) API chính theo module

### Moments
- `GET /api/moments`: lấy danh sách moment
- `POST /api/moments`: tạo moment mới (multipart, field `media`)
- `DELETE /api/moments/:id`: xóa moment

### Status
- `GET /api/status`: lấy status mới nhất
- `POST /api/status`: tạo status mới

### Counter
- `GET/PUT /api/counter-config`: cấu hình ngày bắt đầu yêu
- `GET/POST/DELETE /api/counter-bg`: nền ảnh counter

### Period tracker
- `GET/PUT /api/period`: anchor date, cycle length, logs triệu chứng, reminders
- `POST /api/period-ai`: tư vấn AI chuyên context chu kỳ

### AI chat tổng quát
- `GET/PUT /api/ai-chat/history`: lịch sử hội thoại + widget position
- `GET /api/ai-chat/app-data`: snapshot dữ liệu app để AI dùng
- `POST /api/ai-chat`: trả lời AI theo context trang

### Journey
- `GET/PUT /api/journey`: dữ liệu hành trình chính
- `GET/PUT /api/journey/draft`: bản nháp builder
- `POST /api/journey/avatar`: upload avatar

### Mood Map (2 người)
- `GET /api/mood-map`: lấy mood map + entry hôm nay/mới nhất
- `PUT /api/mood-map`: lưu mood theo ngày
- `DELETE /api/mood-map/:date`: xóa mood của ngày

## 7) Model dữ liệu quan trọng

- `Moment`: owner, caption, mediaType, mediaUrl, allowCombined
- `PeriodTracker`: chu kỳ, logged dates, symptomLogs, reminders
- `Journey`: avatars, timeline items, draft
- `AiChatHistory`: conversations, activeConversationId, widget position
- `MoodMap`: entries theo ngày cho `mineMood`, `partnerMood`, reason/note

## 8) Luồng dữ liệu (high-level)

1. Browser mở trang từ `public/*`.
2. JS trên trang gọi API `/api/...`.
3. Route xử lý + đọc/ghi Mongo qua Mongoose model.
4. Trả JSON về client để render UI.
5. Upload media: lưu local `uploads/` hoặc Cloudinary (nếu bật).

## 9) Điều hướng trang (nav)

Các trang chính đã có nav chéo tới:

- Trang chủ `/`
- Nhật ký `/journal.html`
- Tạo khoảnh khắc `/create.html`
- Đếm ngày yêu `/counter.html`
- Dự đoán kỳ kinh `/period.html`
- Bản đồ cảm xúc `/mood-map.html`
- Hành trình `/hanh-trinh-toi-2-dua.html`

Lưu ý: menu mobile dùng cơ chế mở/đóng bằng class `open` + `max-height` có scroll.

## 10) Blog riêng tư hiện tại

- Nút vào thư viện blog đi qua trang login: `/period-blog-login.html`
- Kiểm tra phiên bằng `sessionStorage` key `periodBlogAuthAt`
- TTL hiện tại: 15 phút
- Gate file: `public/premium-blog-gate.js`

## 11) Mood Map hiện tại

- Không lưu local, lưu trực tiếp DB qua API.
- UI dùng slider ngang cho mood của 2 người.
- Có nhiều mood + icon minh họa.
- Có lịch sử gần đây + lý do mood (optional).
- Trang chủ có card tóm tắt mood mới nhất.

## 12) Những điểm cần lưu ý khi phát triển tiếp

- Dự án từng có issue encoding tiếng Việt (mojibake). Nên luôn lưu UTF-8 (không BOM).
- Hiện chưa có test tự động (`npm test` là placeholder).
- Một số auth vẫn ở mức đơn giản frontend session; nếu muốn an toàn cao hơn cần auth backend thật.

## 13) Chỗ nên sửa khi thêm tính năng

- Thêm API mới: `src/routes/<feature>.js`
- Thêm DB schema: `src/models/<Feature>.js`
- Mount route + sync index: `src/server.js`
- Thêm UI: `public/<feature>.html` + `public/<feature>.js`
- Gắn vào nav: sửa các trang có menu chính

---

Nếu cần, có thể tách tài liệu này thành:

- `docs/api.md` (chi tiết request/response từng endpoint)
- `docs/frontend-map.md` (trang nào dùng script nào)
- `docs/deploy-checklist.md` (quy trình deploy và rollback)
