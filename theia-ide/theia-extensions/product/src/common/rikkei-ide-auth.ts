/********************************************************************************
 * Rikkei Ide — hợp đồng đăng nhập giữa electron-main và frontend.
 *
 * IDE mở TRANG LOGIN do SC phục vụ ({sc}/login) — trang tự gọi wrap
 * /api/student/login (SC đăng nhập LMS qua kênh INTERNAL local, không reCAPTCHA,
 * rồi trả danh tính). IDE KHÔNG gọi LMS trực tiếp. Đăng nhập xong trang chuyển
 * sang {sc}/login/done?studentRkId=... để electron-main bắt danh tính.
 ********************************************************************************/

export const RIKKEI_IDE_AUTH_PATH = '/services/rikkei-ide-auth';

export interface RikkeiIdeSession {
    studentRkId: number;
    fullName: string;
    studentCode: string;
    email?: string;
    loggedInAt: number;
}

export const RikkeiIdeAuthMain = Symbol('RikkeiIdeAuthMain');
export interface RikkeiIdeAuthMain {
    /**
     * Mở cửa sổ trang đăng nhập của SC, chờ tới {sc}/login/done và lấy danh tính.
     * Trả về phiên khi thành công; undefined nếu người dùng đóng cửa sổ / huỷ.
     * Khi thành công TỰ LƯU phiên ở tiến trình chính (bền qua reload/đổi folder).
     */
    loginViaPortal(opts: { scBaseUrl: string }): Promise<RikkeiIdeSession | undefined>;

    /**
     * Đọc phiên đã lưu ở tiến trình chính. Nguồn chân lý của phiên là ĐÂY, không
     * phải localStorage của renderer: renderer bị nạp lại mỗi lần mở/đổi folder,
     * còn tiến trình chính sống suốt vòng đời app -> giữ đăng nhập ổn định.
     */
    loadSession(): Promise<RikkeiIdeSession | undefined>;

    /** Xoá phiên đã lưu (đăng xuất). */
    clearSession(): Promise<void>;
}
