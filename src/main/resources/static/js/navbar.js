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

            /* Avatar theo ID */
            if (imgEl && user.id) {
                const idx = (Number(user.id) % 70) + 1;
                imgEl.src = `https://i.pravatar.cc/40?img=${idx}`;
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
