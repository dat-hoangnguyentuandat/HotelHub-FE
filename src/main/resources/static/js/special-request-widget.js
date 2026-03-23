/* ==========================================================
   special-request-widget.js – HotelHub
   Widget nút chat nổi – Gửi yêu cầu đặc biệt từ giao diện User
   API: POST /api/public/special-requests  (không cần auth)
        hoặc POST /api/admin/special-requests (nếu đã login)
========================================================== */

(function () {
    'use strict';

    const API_BASE = (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : 'http://localhost:8081';
    const API_URL  = API_BASE + '/api/special-requests/public';

    /* ══════════════════════════════════════════════════════════
       KHỞI TẠO – inject HTML vào body
    ══════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', function () {

        /* Không hiển thị trên trang admin */
        if (window.location.pathname.startsWith('/admin')) return;

        injectWidget();
        bindEvents();
    });

    function injectWidget() {
        const html = /* html */`
<!-- ── Floating Action Button ── -->
<button class="sr-fab" id="srFab" aria-label="Gửi yêu cầu đặc biệt" title="Gửi yêu cầu đặc biệt">
    <!-- Icon mặc định -->
    <svg class="sr-fab-icon-open" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
                 M9 5a2 2 0 002 2h2a2 2 0 002-2
                 M9 5a2 2 0 012-2h2a2 2 0 012 2
                 M12 12h.01M8 12h.01M16 12h.01"
              stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <!-- Icon close -->
    <svg class="sr-fab-icon-close" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <span class="sr-fab-tooltip">Yêu cầu đặc biệt</span>
</button>

<!-- ── Popup Panel ── -->
<div class="sr-panel" id="srPanel" role="dialog" aria-modal="true" aria-label="Gửi yêu cầu đặc biệt">

    <!-- Header -->
    <div class="sr-panel-header">
        <div class="sr-panel-header-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
                         M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <div class="sr-panel-header-text">
            <h3>Yêu cầu đặc biệt</h3>
            <p>Chúng tôi sẽ xử lý trong thời gian sớm nhất</p>
        </div>
    </div>

    <!-- Form -->
    <div class="sr-panel-body" id="srFormBody">
        <div class="sr-row">
            <div class="sr-field">
                <label class="sr-label">Họ và tên <span class="req">*</span></label>
                <input type="text" id="srName" class="sr-input" placeholder="Nguyễn Văn A" autocomplete="name" />
            </div>
            <div class="sr-field">
                <label class="sr-label">Số điện thoại</label>
                <input type="tel" id="srPhone" class="sr-input" placeholder="0901 234 567" autocomplete="tel" />
            </div>
        </div>

        <div class="sr-field">
            <label class="sr-label">Loại yêu cầu <span class="req">*</span></label>
            <select id="srType" class="sr-select">
                <option value="">-- Chọn loại yêu cầu --</option>
                <option value="Check-in sớm">Check-in sớm</option>
                <option value="Check-out muộn">Check-out muộn</option>
                <option value="Trang trí sinh nhật">Trang trí sinh nhật</option>
                <option value="Ăn kiêng">Ăn kiêng</option>
                <option value="Không làm phiền">Không làm phiền</option>
                <option value="Mang hành lý lên phòng">Mang hành lý lên phòng</option>
                <option value="Phòng tầng cao">Phòng tầng cao</option>
                <option value="Thêm giường phụ">Thêm giường phụ</option>
                <option value="Khác">Khác</option>
            </select>
        </div>

        <div class="sr-field">
            <label class="sr-label">Nội dung yêu cầu <span class="req">*</span></label>
            <textarea id="srContent" class="sr-textarea" rows="3"
                      placeholder="Mô tả chi tiết yêu cầu của bạn..."></textarea>
        </div>

        <div class="sr-field">
            <label class="sr-label">Mã đặt phòng <span style="font-weight:400;color:#9a7b6d">(nếu có)</span></label>
            <input type="number" id="srBookingId" class="sr-input" placeholder="VD: 123" min="1" />
        </div>
    </div>

    <!-- Success state (ẩn mặc định) -->
    <div class="sr-success" id="srSuccess">
        <div class="sr-success-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.2"
                      stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <h4>Yêu cầu đã được gửi!</h4>
        <p>Cảm ơn bạn. Đội ngũ của chúng tôi sẽ xem xét và phản hồi sớm nhất có thể.</p>
    </div>

    <!-- Footer buttons -->
    <div class="sr-panel-footer" id="srFooter">
        <button class="sr-btn-cancel" id="srBtnCancel">Huỷ</button>
        <button class="sr-btn-submit" id="srBtnSubmit">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z"
                      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Gửi yêu cầu
        </button>
    </div>
</div>

<!-- ── Toast ── -->
<div class="sr-toast" id="srToast"></div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);
    }

    /* ══════════════════════════════════════════════════════════
       BIND EVENTS
    ══════════════════════════════════════════════════════════ */
    function bindEvents() {
        /* Đảm bảo elements đã tồn tại trước khi bind */
        const fab       = document.getElementById('srFab');
        const panel     = document.getElementById('srPanel');
        const btnCancel = document.getElementById('srBtnCancel');
        const btnSubmit = document.getElementById('srBtnSubmit');

        if (!fab || !panel) return;

        /* Toggle panel khi nhấn FAB */
        fab.addEventListener('click', function () {
            const isOpen = panel.classList.contains('open');
            if (isOpen) {
                closePanel();
            } else {
                openPanel();
            }
        });

        /* Nút huỷ */
        btnCancel.addEventListener('click', function () {
            closePanel();
        });

        /* Nút gửi */
        btnSubmit.addEventListener('click', function () {
            submitRequest();
        });

        /* Đóng khi nhấn phím Esc */
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && panel.classList.contains('open')) {
                closePanel();
            }
        });

        /* Tự điền thông tin user nếu đã đăng nhập */
        prefillUserInfo();
    }

    /* ══════════════════════════════════════════════════════════
       OPEN / CLOSE PANEL
    ══════════════════════════════════════════════════════════ */
    function openPanel() {
        const fab   = document.getElementById('srFab');
        const panel = document.getElementById('srPanel');

        /* Reset về trạng thái form */
        showForm();

        fab.classList.add('open');
        panel.classList.add('open');

        /* Focus vào field đầu tiên */
        setTimeout(function () {
            const nameInput = document.getElementById('srName');
            if (nameInput) nameInput.focus();
        }, 100);
    }

    function closePanel() {
        const fab   = document.getElementById('srFab');
        const panel = document.getElementById('srPanel');

        fab.classList.remove('open');
        panel.classList.remove('open');
    }

    function showForm() {
        document.getElementById('srFormBody').style.display = '';
        document.getElementById('srFooter').style.display   = '';
        document.getElementById('srSuccess').classList.remove('show');
    }

    function showSuccess() {
        document.getElementById('srFormBody').style.display = 'none';
        document.getElementById('srFooter').style.display   = 'none';
        document.getElementById('srSuccess').classList.add('show');

        /* Tự đóng panel sau 4s */
        setTimeout(function () {
            closePanel();
        }, 4000);
    }

    /* ══════════════════════════════════════════════════════════
       PREFILL USER INFO
    ══════════════════════════════════════════════════════════ */
    function prefillUserInfo() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            if (!user) return;

            const nameInput  = document.getElementById('srName');
            const phoneInput = document.getElementById('srPhone');

            if (nameInput  && !nameInput.value  && user.fullName)    nameInput.value  = user.fullName;
            if (phoneInput && !phoneInput.value && user.phone)        phoneInput.value = user.phone;
        } catch (_) { /* ignore */ }
    }

    /* ══════════════════════════════════════════════════════════
       SUBMIT REQUEST
    ══════════════════════════════════════════════════════════ */
    function submitRequest() {
        const guestName   = (document.getElementById('srName').value        || '').trim();
        const guestPhone  = (document.getElementById('srPhone').value       || '').trim();
        const requestType = (document.getElementById('srType').value        || '').trim();
        const content     = (document.getElementById('srContent').value     || '').trim();
        const bookingRaw  = (document.getElementById('srBookingId').value   || '').trim();

        /* Validate */
        if (!guestName) {
            showToast('Vui lòng nhập họ và tên', 'error');
            document.getElementById('srName').focus();
            return;
        }
        if (!requestType) {
            showToast('Vui lòng chọn loại yêu cầu', 'error');
            document.getElementById('srType').focus();
            return;
        }
        if (!content) {
            showToast('Vui lòng nhập nội dung yêu cầu', 'error');
            document.getElementById('srContent').focus();
            return;
        }

        const body = { guestName: guestName, requestType: requestType, content: content };
        if (guestPhone) body.guestPhone = guestPhone;
        if (bookingRaw) body.bookingId  = parseInt(bookingRaw, 10);

        /* Disable nút submit */
        const btnSubmit = document.getElementById('srBtnSubmit');
        btnSubmit.disabled    = true;
        btnSubmit.textContent = 'Đang gửi...';

        /* Gọi API */
        apiPost(API_URL, body)
            .then(function () {
                clearForm();
                showSuccess();
            })
            .catch(function (err) {
                showToast('Lỗi: ' + (err.message || 'Không thể gửi yêu cầu'), 'error');
            })
            .finally(function () {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML =
                    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z" stroke="currentColor" ' +
                    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                    'Gửi yêu cầu';
            });
    }

    function clearForm() {
        document.getElementById('srName').value      = '';
        document.getElementById('srPhone').value     = '';
        document.getElementById('srType').value      = '';
        document.getElementById('srContent').value   = '';
        document.getElementById('srBookingId').value = '';
    }

    /* ══════════════════════════════════════════════════════════
       API HELPER
    ══════════════════════════════════════════════════════════ */
    function apiPost(url, body) {
        /* Thêm token nếu user đã đăng nhập */
        const token = localStorage.getItem('accessToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        return fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        }).then(function (res) {
            if (!res.ok) {
                return res.json()
                    .then(function (e) { throw new Error(e.message || 'HTTP ' + res.status); })
                    .catch(function ()  { throw new Error('HTTP ' + res.status); });
            }
            if (res.status === 204) return {};
            return res.json();
        });
    }

    /* ══════════════════════════════════════════════════════════
       TOAST
    ══════════════════════════════════════════════════════════ */
    var toastTimer = null;

    function showToast(message, type) {
        const el = document.getElementById('srToast');
        if (!el) return;

        el.textContent = message;
        el.className   = 'sr-toast ' + (type || '');

        requestAnimationFrame(function () {
            el.classList.add('show');
        });

        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.classList.remove('show');
        }, 3500);
    }

})();
