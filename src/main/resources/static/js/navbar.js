/* ================================================================
   navbar.js  –  Logic header dùng chung
   Chèn trước </body> ở mọi trang user-facing:
       <script th:src="@{/js/navbar.js}"></script>
================================================================ */

(function () {
    'use strict';

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
       AUTH STATE
    ════════════════════════════════════════ */
    function syncAuthState() {
        const token = localStorage.getItem('accessToken');

        const loggedInInfo  = document.getElementById('dropdownLoggedIn');
        const guestInfo     = document.getElementById('dropdownGuest');
        const authItems     = document.querySelectorAll('.dropdown-auth-item');
        const divider1      = document.getElementById('dropdownDivider1');

        if (!token) {
            /* ── CHƯA đăng nhập: hiện guest panel, ẩn auth items ── */
            if (guestInfo)    guestInfo.style.display    = 'flex';
            if (loggedInInfo) loggedInInfo.style.display = 'none';
            authItems.forEach(el => el.style.display = 'none');
            if (divider1) divider1.style.display = 'none';
            return;
        }

        /* ── ĐÃ đăng nhập: ẩn guest panel, hiện auth items ── */
        if (guestInfo)    guestInfo.style.display    = 'none';
        if (loggedInInfo) loggedInInfo.style.display = 'flex';
        authItems.forEach(el => el.style.display = 'flex');
        if (divider1) divider1.style.display = 'block';

        /* Điền thông tin user */
        try {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            if (!user) return;

            const nameEl  = document.getElementById('dropdownUsername');
            const roleEl  = document.getElementById('dropdownRole');
            const adminEl = document.getElementById('adminLink');
            const imgEl   = document.getElementById('avatarImg');

            if (nameEl) nameEl.textContent = user.fullName || user.email || 'Người dùng';

            const ROLE_LABELS = {
                ADMIN:       'Quản trị viên',
                HOTEL_OWNER: 'Chủ khách sạn',
                GUEST:       'Khách hàng',
            };
            if (roleEl) roleEl.textContent = ROLE_LABELS[user.role] || user.role || '';

            /* Chỉ ADMIN / HOTEL_OWNER thấy link Quản trị */
            const isAdmin = user.role === 'ADMIN' || user.role === 'HOTEL_OWNER';
            if (adminEl) adminEl.style.display = isAdmin ? 'flex' : 'none';

            /* Avatar mặc định – không phụ thuộc dịch vụ ngoài */
            if (imgEl) {
                imgEl.src = "data:image/svg+xml,%3Csvg viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23f0ebe7'/%3E%3Ccircle cx='20' cy='15' r='6' fill='%23c9b5a8'/%3E%3Cpath d='M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14' fill='%23c9b5a8'/%3E%3C/svg%3E";
            }
        } catch (_) {}
    }

    /* ════════════════════════════════════════
       DROPDOWN
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

        document.addEventListener('click', function () {
            if (menu.classList.contains('open')) {
                menu.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
            }
        });

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
