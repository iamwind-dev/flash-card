# Flashcards PWA - Học từ vựng Tiếng Anh

Ứng dụng Progressive Web App (PWA) để học từ vựng Tiếng Anh thông qua phương pháp thẻ ghi nhớ (flashcards) với chế độ quiz tương tác.

## Tính năng chính

#### Học tập thông minh

- **Flashcards tương tác**: Lật thẻ để xem nghĩa và ví dụ
- **Đánh dấu độ khó**: Phân loại từ vựng theo mức độ dễ/trung bình/khó
- **Chế độ tự động**: Tự động lật thẻ sau khoảng thời gian nhất định
- **Trộn thẻ ngẫu nhiên**: Học không theo thứ tự cố định

#### Quiz đa dạng

- **Nhiều chế độ quiz**: Từ → nghĩa, nghĩa → từ, hoặc trộn lẫn
- **Giới hạn thời gian**: Tùy chọn bật/tắt đếm ngược thời gian
- **Hệ thống gợi ý**: Hiển thị ví dụ hoặc loại từ
- **Xem lại đáp án**: In hoặc xuất kết quả chi tiết

#### Quản lý từ vựng

- **Thêm/sửa/xóa thẻ**: CRUD hoàn chỉnh cho flashcards
- **Tìm kiếm và lọc**: Theo từ khóa, loại từ, độ khó
- **Thống kê chi tiết**: Theo dõi tiến độ học tập
- **Phân loại thông minh**: Danh từ, động từ, tính từ, trạng từ

#### PWA Features

- **Offline hoàn toàn**: Hoạt động không cần internet
- **Cài đặt được**: Thêm vào màn hình chính
- **Responsive**: Tối ưu cho mọi thiết bị
- **Cache thông minh**: Service Worker tự động cache

## Cách sử dụng

#### Yêu cầu hệ thống

- Trình duyệt hiện đại (Chrome, Firefox, Safari, Edge)
- JavaScript được kích hoạt
- Khoảng 2MB dung lượng lưu trữ local

#### Chạy ứng dụng

1. **Clone hoặc tải về dự án**

   ```bash
   # Nếu có git
   git clone [repository-url]

   # Hoặc tải file ZIP và giải nén
   ```
2. **Khởi chạy local server**

   ```bash
   dùng Live Server trong VSCode
   ```
3. **Mở trình duyệt**

   ```
   http://localhost:5500
   ```
4. **Cài đặt PWA**

   - Dùng menu "Thêm vào màn hình chính" của trình duyệt

### Hướng dẫn sử dụng

#### Trang chủ

- Xem thống kê tổng quan về số thẻ đã học
- Truy cập nhanh các chức năng chính
- Theo dõi hoạt động gần đây

#### Chế độ học tập

1. **Bắt đầu học**: Nhấn vào thẻ để lật và xem nghĩa
2. **Điều hướng**: Dùng nút "Trước/Tiếp" hoặc phím mũi tên
3. **Đánh giá độ khó**: Chọn Dễ/Trung bình/Khó sau khi xem nghĩa
4. **Tùy chọn**: Bật/tắt trộn thẻ, tự động lật

#### Chế độ Quiz

1. **Cài đặt quiz**: Chọn số câu hỏi, loại câu hỏi, thời gian
2. **Làm bài**: Chọn đáp án đúng trong 4 lựa chọn
3. **Sử dụng gợi ý**: Nhấn nút gợi ý khi cần
4. **Xem kết quả**: Kiểm tra điểm số và xem lại đáp án

#### Quản lý thẻ

1. **Thêm thẻ mới**: Điền từ vựng, nghĩa, ví dụ, loại từ
2. **Tìm kiếm**: Gõ từ khóa vào ô tìm kiếm
3. **Lọc**: Chọn theo loại từ hoặc độ khó
4. **Chỉnh sửa**: Nhấn nút "Sửa" trên thẻ
5. **Xóa**: Nhấn nút "Xóa" (có xác nhận)
