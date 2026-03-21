/* ================================================================
   navbar.js  –  Logic header dùng chung
   Chèn trước </body> ở mọi trang user-facing:
       <script th:src="@{/js/navbar.js}"></script>
================================================================ */

(function () {
    'use strict';

    /* ── Khởi tạo sau khi DOM sẵn sàng ── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        syncAuthState();
        initDropdown();
        initLogout();
    }

    /* ════════════════════════════════════════
       AUTH STATE  –  đồng bộ UI theo token
    ════════════════════════════════════════ */
    function syncAuthState() {
        const token = localStorage.getItem('accessToken');
        const loginBtn   = document.getElementById('navBtnLogin');
        const avatarWrap = document.getElementById('avatarBtn');

        if (!token) {
            /* Chưa đăng nhập: hiện nút "Đăng nhập", ẩn avatar */
            if (loginBtn)   loginBtn.style.display   = 'inline-flex';
            if (avatarWrap) avatarWrap.style.display = 'none';
            return;
        }

        /* Đã đăng nhập */
        if (loginBtn)   loginBtn.style.display   = 'none';
        if (avatarWrap) avatarWrap.style.display = 'flex';

        /* Điền thông tin user */
        try {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            if (!user) return;

            const nameEl = document.getElementById('dropdownUsername');
            const roleEl = document.getElementById('dropdownRole');
            const adminEl = document.getElementById('adminLink');
            const imgEl   = document.getElementById('avatarImg');

            if (nameEl) nameEl.textContent = user.fullName || user.email || 'Người dùng';

            /* Nhãn role hiển thị tiếng Việt */
            const ROLE_LABELS = {
                ADMIN:        'Quản trị viên',
                HOTEL_OWNER:  'Chủ khách sạn',
                GUEST:        'Khách hàng',
            };
            if (roleEl) roleEl.textContent = ROLE_LABELS[user.role] || user.role || '';

            /* Hiện link Quản trị nếu ADMIN / HOTEL_OWNER */
            const isAdmin = user.role === 'ADMIN' || user.role === 'HOTEL_OWNER';
            if (adminEl) adminEl.style.display = isAdmin ? 'flex' : 'none';

            /* Avatar từ Pravatar dựa theo ID (hợp lệ 1-70) */
            if (imgEl && user.id) {
                const avatarIdx = (Number(user.id) % 70) + 1;
                imgEl.src = `https://i.pravatar.cc/40?img=${avatarIdx}`;
            }
        } catch (_) { /* JSON parse lỗi – bỏ qua */ }
    }

    /* ════════════════════════════════════════
       DROPDOWN  –  mở / đóng
    ════════════════════════════════════════ */
    function initDropdown() {
        const btn  = document.getElementById('avatarBtn');
        const menu = document.getElementById('avatarDropdown');
        if (!btn || !menu) return;

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const isOpen = menu.classList.contains('open');
            menu.classList.toggle('open', !isOpen);
            btn.setAttribute('aria-expanded', String(!isOpen));
        });

        /* Đóng khi click bên ngoài */
        document.addEventListener('click', function () {
            if (menu.classList.contains('open')) {
                menu.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            }
        });

        /* Đóng khi nhấn Escape */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menu.classList.contains('open')) {
                menu.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
                btn.focus();
            }
        });
    }

    /* ════════════════════════════════════════
       LOGOUT
    ════════════════════════════════════════ */
    function initLogout() {
        const btn = document.getElementById('btnLogout');
        if (!btn) return;

        btn.addEventListener('click', function () {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            sessionStorage.clear();
            window.location.href = '/login';
        });
    }

})();
