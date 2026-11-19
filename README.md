# ViX-Ray Verifier

Trạm làm việc PACS giúp bác sĩ chẩn đoán hình ảnh rà soát, căn chỉnh bounding box và xác thực mức độ phù hợp theo từng **Reference Finding** trên phim X-quang ngực.

## Tính năng chính

- **Liên kết màu theo Reference Finding**: Mỗi tổn thương (`RF1`, `RF2`, ...) được gán một màu riêng biệt trùng khớp hoàn toàn giữa thẻ thông tin bên phải và các bounding box trên phim.
- **Ẩn / Hiện & Cô lập (Solo) từng Finding**: Tắt/bật hiển thị bounding box theo từng finding, cô lập 1 finding, hoặc ẩn toàn bộ để xem phim gốc.
- **Phóng to / Thu nhỏ & Căn chỉnh chính xác**: Cuộn chuột zoom tại đúng vị trí con trỏ (tối đa 800%), kéo ảnh (`Space + kéo` hoặc phím `H`), kéo giãn 8 điểm neo, vẽ box mới (`B`), hoàn tác/làm lại (`Ctrl+Z`), so sánh với box gốc nét đứt (`G`).
- **Tối ưu cho bác sĩ X-quang**: Chỉnh độ sáng/tương phản (Window/Level), đảo ngược âm bản (`I`), prefetch ảnh ca tiếp theo, lưu tự động lạc quan (optimistic save), và phím tắt duyệt nhanh (`1`, `2`, `Ctrl+Enter`).
- **Xuất CSV kết quả**: Tải xuống file `ViX-Ray_Verified_YYYY-MM-DD.csv` giữ nguyên cấu trúc gốc kèm `verification_status`, `boxes_modified`, `doctor_note`.

## Chạy Local

Dữ liệu mẫu đọc từ `data/ViX-Ray_PreAnnotated.csv` và ảnh X-quang từ `LOCAL_IMAGES_DIR` (mặc định `D:\uit\kltn\requirement_ViX-Ray\images` trong `.env.local`). Khi chưa cấu hình `DATABASE_URL`, các chỉnh sửa được lưu trực tiếp vào `data/annotations-store.json`.

```bash
pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Kiến trúc tối ưu khi Deploy lên Vercel (Giảm Lag & Latency)

### 1. Database: Neon Serverless PostgreSQL (`ap-southeast-1` Singapore)
- Dùng driver `@neondatabase/serverless` (chạy qua HTTP, không tốn chi phí TCP cold-start trên Vercel Serverless).
- Đặt **cùng region Singapore** cho cả Vercel Functions (`sin1`) và Neon (`ap-southeast-1`) để latency từ Việt Nam xuống mức ~20–40ms.
- Chỉ cần gán biến môi trường `DATABASE_URL` (pooled connection string từ Neon) trên Vercel — ứng dụng sẽ **tự động tạo bảng, index và seed dữ liệu từ `data/ViX-Ray_PreAnnotated.csv`** ngay lần chạy đầu tiên (hoặc có thể chạy thủ công `sql/schema.sql`).

### 2. Ảnh X-quang (5,400 ảnh / ~3.5 GB)
- **Khuyến nghị cho production**: Upload thư mục ảnh lên **Cloudflare R2** (miễn phí 10 GB storage, 0 đồng egress bandwidth, có Edge CDN toàn cầu) hoặc **Vercel Blob**, rồi đặt:
  ```env
  NEXT_PUBLIC_IMAGE_CDN_BASE_URL=https://pub-xxxx.r2.dev/xrays
  ```
  Khi biến này được đặt, trình duyệt tải ảnh trực tiếp từ Edge CDN mà không đi qua Serverless Function của Vercel.
- **Nếu chỉ deploy nhanh tập 99 ảnh của CSV (~66 MB)**: Có thể chạy `pnpm sync:images` để copy đúng 99 ảnh trong CSV vào `public/xrays/`.
