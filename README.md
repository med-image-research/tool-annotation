# ViX-Ray Verifier

Ứng dụng web hỗ trợ bác sĩ X-quang rà soát, căn chỉnh bounding box và xác nhận mức độ phù hợp theo từng **Reference Finding** trên phim X-quang ngực.

## Tính năng chính

- **Phân biệt tổn thương theo màu**: Mỗi Reference Finding trên cùng một phim có màu riêng, đồng bộ giữa thẻ thông tin bên phải và các khung trên ảnh.
- **Ẩn, hiện và xem riêng từng tổn thương**: Bật hoặc tắt nhanh từng khung để quan sát tổn thương rõ ràng hơn, hoặc ẩn toàn bộ khung để xem phim gốc.
- **Phóng to và chỉnh khung trực tiếp**: Cuộn chuột để phóng to tại đúng vị trí con trỏ, kéo ảnh bằng chuột, kéo 8 điểm viền để chỉnh kích thước, vẽ thêm khung mới và hoàn tác khi cần.
- **Hỗ trợ đọc phim thuận tiện**: Chỉnh độ sáng, độ nét, đảo ngược âm bản, đối chiếu lại với khung gốc nét đứt và tự tải sẵn ảnh của ca kế tiếp.
- **Giao diện Sáng / Tối linh hoạt**: Hỗ trợ đổi giao diện sáng hoặc tối, ẩn hiện và kéo co giãn độ rộng cả hai thanh bên để mở rộng tối đa vùng xem phim.
- **Đường dẫn riêng cho từng ca**: Mỗi ảnh có URL dạng `/case/VX-000002`, hỗ trợ tải lại trang và chia sẻ link trực tiếp.
- **Xuất file CSV**: Tải xuống kết quả đã rà soát theo cấu trúc file gốc kèm cột `verification_status` và `boxes_modified`.

## Phím tắt nhanh

- `V`: Chọn và chỉnh sửa khung
- `B`: Vẽ khung mới cho finding đang chọn
- `H` hoặc giữ `Space` + kéo: Di chuyển ảnh
- `0` hoặc `R`: Đưa ảnh vừa khít khung nhìn
- `I`: Đảo ngược âm bản phim
- `G`: Hiện hoặc ẩn khung gốc nét đứt để đối chiếu
- `L`: Hiện hoặc ẩn nhãn trên ảnh
- `1`: Xác nhận phù hợp cho finding đang chọn
- `3`: Ẩn hoặc hiện khung của finding đang chọn
- `[` / `]`: Chuyển ca trước hoặc ca tiếp theo
- `Ctrl + Enter`: Xác nhận toàn bộ finding của ca hiện tại và sang ca tiếp theo
- `Ctrl + Z` / `Ctrl + Shift + Z`: Hoàn tác hoặc làm lại thao tác chỉnh khung
- `Delete`: Xóa khung đang chọn

## Chạy ở máy cá nhân

Dữ liệu khởi tạo đọc từ `data/ViX-Ray_PreAnnotated.csv`. Khi chạy ở máy cá nhân chưa cấu hình database, mọi thay đổi được lưu vào `data/annotations-store.json` và ảnh đọc từ biến `LOCAL_IMAGES_DIR` trong `.env.local`.

```bash
pnpm install
pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Đưa lên Vercel

### 1. Cơ sở dữ liệu với Neon PostgreSQL

- Tạo project trên Neon ở khu vực **Singapore** để giảm độ trễ từ Việt Nam.
- Lấy đường dẫn kết nối **Pooled connection string** và gán vào biến môi trường `DATABASE_URL` trên Vercel.
- Lần chạy đầu tiên, hệ thống tự tạo bảng trong `sql/schema.sql` và nạp dữ liệu từ `data/ViX-Ray_PreAnnotated.csv`.
- Trong phần cấu hình của Vercel, chọn Function Region là **Singapore** để khớp vị trí với Neon.

### 2. Lưu trữ ảnh X-quang

- **Khuyên dùng khi có nhiều ảnh**: Đưa ảnh lên **Azure Blob Storage**, **Cloudflare R2** hoặc **Cloudinary** rồi gán đường dẫn container hoặc thư mục ảnh vào biến `NEXT_PUBLIC_IMAGE_CDN_BASE_URL` trên Vercel. Nếu dùng Azure với link SAS có tham số truy vấn phía sau, hệ thống tự giữ nguyên phần SAS token khi ghép tên file. Với Cloudinary, cần giữ nguyên tên file gốc làm Public ID và dùng đường dẫn ảnh gốc để không bị nén làm giảm độ nét phim.
- **Chạy thử nhanh với 99 ảnh trong CSV**: Chạy `pnpm sync:images` để chép 99 ảnh vào `public/xrays`, sau đó đặt `NEXT_PUBLIC_IMAGE_CDN_BASE_URL=/xrays` trên Vercel.
