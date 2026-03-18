/* ==========================================================
   admin-special-requests.js – HotelHub Admin
   - Fetch GET /api/admin/special-requests (với filter, search, pagination)
   - Stats cards từ GET /api/admin/special-requests/stats
   - Thêm mới (POST), Cập nhật trạng thái (PATCH), Xoá (DELETE)
========================================================== */

(function () {
    'use strict';

    /* ── Config ── */
    const API_BASE = 'http://localhost:8081';
    const API_URL  = API_BASE + '/api/admin/special-requests';

    /* ── State ── */
    let currentPage  = 0;
    let totalPages   = 1;
    const PAGE_SIZE  = 10;
    let editingId    = null;   // null = thêm mới, number = đang xem detail
    let detailId     = null;   // id của yêu cầu đang xem chi tiết

    /* ══════════════════════════════════════════════════════════
       ENTRY POINT
    ══════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', function () {
        highlightActiveNav();
        loadStats();
        loadRequests();

        /* Tìm kiếm khi nhấn Enter */
        document.getElementById('searchInput').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') doSearch();
        });
    });

    /* ══════════════════════════════════════════════════════════
       STATS CARDS
    ══════════════════════════════════════════════════════════ */
    function loadStats() {
        apiFetch(API_URL + '/stats', 'GET')
            .then(function (data) {
                setText('statTotal',    data.total    ?? '—');
                setText('statPending',  data.pending  ?? '—');
                setText('statApproved', data.approved ?? '—');
                setText('statDone',     data.done     ?? '—');
            })
            .catch(function () {
                /* Dùng dữ liệu tĩnh nếu API lỗi */
                setText('statTotal', '5');
                setText('statPending', '3');
                setText('statApproved', '1');
                setText('statDone', '1');
            });
    }

    /* ══════════════════════════════════════════════════════════
       LOAD & RENDER TABLE
    ══════════════════════════════════════════════════════════ */
    function loadRequests(page) {
        page = (page !== undefined) ? page : currentPage;

        const keyword = document.getElementById('searchInput').value.trim();
        const status  = document.getElementById('statusFilter').value;

        let url = API_URL + '?page=' + page + '&size=' + PAGE_SIZE;
        if (status)  url += '&status='  + encodeURIComponent(status);
        if (keyword) url += '&keyword=' + encodeURIComponent(keyword);

        showLoading();

        apiFetch(url, 'GET')
            .then(function (data) {
                currentPage = data.page;
                totalPages  = data.totalPages || 1;
                renderTable(data.content || []);
                renderPagination();
            })
            .catch(function () {
                renderFallback();
            });
    }

    function showLoading() {
        const tbody = document.getElementById('requestsTbody');
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">' +
            '<div class="loading-spinner"></div><span>Đang tải dữ liệu...</span></td></tr>';
    }

    function renderTable(items) {
        const tbody = document.getElementById('requestsTbody');
        tbody.innerHTML = '';

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Không có yêu cầu nào</td></tr>';
            return;
        }

        items.forEach(function (item, idx) {
            const tr = document.createElement('tr');
            tr.innerHTML = buildRow(item, currentPage * PAGE_SIZE + idx + 1);
            tbody.appendChild(tr);
        });
    }

    function buildRow(item, no) {
        const statusCls  = 'status-' + item.status.toLowerCase();
        const statusLbl  = escHtml(item.statusLabel);
        const isPending  = item.status === 'PENDING';
        const isDone     = item.status === 'DONE' || item.status === 'APPROVED' || item.status === 'REJECTED';

        let actionHtml = '';
        if (isPending) {
            actionHtml =
                '<button class="btn-approve" onclick="quickApprove(' + item.id + ')">Duyệt</button>' +
                '<span class="action-separator">|</span>' +
                '<button class="btn-reject" onclick="quickReject(' + item.id + ')">Từ chối</button>';
        } else {
            actionHtml =
                '<button class="btn-detail" onclick="openDetail(' + item.id + ')">Chi tiết</button>' +
                '<span class="action-separator">|</span>' +
                '<button class="btn-delete" onclick="deleteRequest(' + item.id + ')">Xóa</button>';
        }

        return '<td class="cell-no">' + no + '</td>' +
               '<td class="cell-name">' + escHtml(item.guestName) + '</td>' +
               '<td class="cell-type">' + escHtml(item.requestType) + '</td>' +
               '<td><div class="cell-content">' + escHtml(item.content) + '</div></td>' +
               '<td><span class="status-badge ' + statusCls + '">' + statusLbl + '</span></td>' +
               '<td><div class="cell-action">' + actionHtml + '</div></td>';
    }

    /* ── Fallback data khi API lỗi ── */
    function renderFallback() {
        const fallback = [
            { id:1, guestName:'Nguyễn Nhật Hào',      requestType:'Check-in sớm',          content:'Tôi đến lúc 9h sáng',                                       status:'PENDING',  statusLabel:'Chờ xử lý' },
            { id:2, guestName:'Trần Đức',              requestType:'Trang trí sinh nhật',    content:'Bóng bay + bánh kem nhỏ',                                    status:'PENDING',  statusLabel:'Chờ xử lý' },
            { id:3, guestName:'Bùi Trí Tài',           requestType:'Ăn kiêng',               content:'Không đường, không dầu mỡ',                                  status:'PENDING',  statusLabel:'Chờ xử lý' },
            { id:4, guestName:'Lê Nguyễn Thế Kiệt',   requestType:'Không làm phiền',        content:'Không dọn phòng trong suốt thời gian lưu trú.',               status:'DONE',     statusLabel:'Đã xử lý'  },
            { id:5, guestName:'Nguyễn Tuấn Anh',       requestType:'Mang hành lý lên phòng', content:'Có nhiều hành lý, cần hỗ trợ vận chuyển.',                    status:'DONE',     statusLabel:'Đã xử lý'  }
        ];
        currentPage = 0;
        totalPages  = 1;
        renderTable(fallback);
        renderPagination();

        /* Stats fallback */
        setText('statTotal', '5'); setText('statPending', '3');
        setText('statApproved', '0'); setText('statDone', '2');
    }

    /* ══════════════════════════════════════════════════════════
       PAGINATION
    ══════════════════════════════════════════════════════════ */
    function renderPagination() {
        const el = document.getElementById('pagination');
        if (totalPages <= 1) { el.innerHTML = ''; return; }

        let html = '';

        /* Prev button */
        html += '<button class="page-btn" onclick="goPage(' + (currentPage - 1) + ')"' +
                (currentPage === 0 ? ' disabled' : '') + '>' +
                '<svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</button>';

        /* Page numbers */
        const range = buildPageRange(currentPage, totalPages);
        range.forEach(function (p) {
            if (p === '…') {
                html += '<span class="page-btn" style="cursor:default;color:#8c7b72">…</span>';
            } else {
                html += '<button class="page-btn' + (p === currentPage ? ' active' : '') +
                        '" onclick="goPage(' + p + ')">' + (p + 1) + '</button>';
            }
        });

        /* Next button */
        html += '<button class="page-btn" onclick="goPage(' + (currentPage + 1) + ')"' +
                (currentPage >= totalPages - 1 ? ' disabled' : '') + '>' +
                '<svg viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                '</button>';

        el.innerHTML = html;
    }

    function buildPageRange(cur, total) {
        const pages = [];
        if (total <= 7) {
            for (let i = 0; i < total; i++) pages.push(i);
        } else {
            pages.push(0);
            if (cur > 2)          pages.push('…');
            for (let i = Math.max(1, cur-1); i <= Math.min(total-2, cur+1); i++) pages.push(i);
            if (cur < total - 3)  pages.push('…');
            pages.push(total - 1);
        }
        return pages;
    }

    /* ══════════════════════════════════════════════════════════
       SEARCH & FILTER
    ══════════════════════════════════════════════════════════ */
    function doSearch() {
        currentPage = 0;
        loadRequests(0);
    }

    function goPage(p) {
        if (p < 0 || p >= totalPages) return;
        currentPage = p;
        loadRequests(p);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ══════════════════════════════════════════════════════════
       ADD MODAL
    ══════════════════════════════════════════════════════════ */
    function openAddModal() {
        editingId = null;
        document.getElementById('modalTitle').textContent = 'Thêm yêu cầu đặc biệt';
        clearForm();
        openOverlay('modalOverlay');
    }

    function clearForm() {
        setVal('fGuestName', '');
        setVal('fGuestPhone', '');
        setVal('fRequestType', '');
        setVal('fContent', '');
        setVal('fBookingId', '');
    }

    function saveRequest() {
        const guestName   = getVal('fGuestName').trim();
        const guestPhone  = getVal('fGuestPhone').trim();
        const requestType = getVal('fRequestType');
        const content     = getVal('fContent').trim();
        const bookingIdRaw = getVal('fBookingId').trim();

        if (!guestName)   { showToast('Vui lòng nhập họ tên khách', 'error'); return; }
        if (!requestType) { showToast('Vui lòng chọn loại yêu cầu', 'error'); return; }
        if (!content)     { showToast('Vui lòng nhập nội dung yêu cầu', 'error'); return; }

        const body = { guestName, requestType, content };
        if (guestPhone)   body.guestPhone = guestPhone;
        if (bookingIdRaw) body.bookingId  = parseInt(bookingIdRaw, 10);

        const btnSave = document.getElementById('btnSave');
        btnSave.disabled    = true;
        btnSave.textContent = 'Đang lưu...';

        apiFetch(API_URL, 'POST', body)
            .then(function () {
                closeModal();
                showToast('Đã thêm yêu cầu thành công', 'success');
                loadStats();
                loadRequests(0);
            })
            .catch(function (err) {
                showToast('Lỗi: ' + err.message, 'error');
            })
            .finally(function () {
                btnSave.disabled    = false;
                btnSave.textContent = 'Lưu yêu cầu';
            });
    }

    function closeModal(e) {
        if (e && e.target !== document.getElementById('modalOverlay')) return;
        closeOverlay('modalOverlay');
    }

    /* ══════════════════════════════════════════════════════════
       DETAIL MODAL
    ══════════════════════════════════════════════════════════ */
    function openDetail(id) {
        detailId = id;
        apiFetch(API_URL + '/' + id, 'GET')
            .then(function (item) {
                setText('detailName',    item.guestName   || '—');
                setText('detailPhone',   item.guestPhone  || '—');
                setText('detailType',    item.requestType || '—');
                setText('detailContent', item.content     || '—');
                setVal ('detailAdminNote', item.adminNote || '');

                /* Status badge */
                const statusEl = document.getElementById('detailStatus');
                statusEl.innerHTML = '<span class="status-badge status-' +
                    item.status.toLowerCase() + '">' + escHtml(item.statusLabel) + '</span>';

                /* Action buttons tuỳ trạng thái */
                renderDetailActions(item.status);

                openOverlay('detailOverlay');
            })
            .catch(function () {
                showToast('Không thể tải chi tiết yêu cầu', 'error');
            });
    }

    function renderDetailActions(status) {
        const el = document.getElementById('detailActionBtns');
        let html = '';

        if (status === 'PENDING') {
            html = '<button class="btn-approve-lg" onclick="updateStatus(\'' + detailId + '\',\'APPROVED\')">Duyệt</button>' +
                   '<button class="btn-reject-lg"  onclick="updateStatus(\'' + detailId + '\',\'REJECTED\')">Từ chối</button>';
        } else if (status === 'APPROVED') {
            html = '<button class="btn-done-lg"   onclick="updateStatus(\'' + detailId + '\',\'DONE\')">Đánh dấu Đã xử lý</button>';
        }

        el.innerHTML = html;
    }

    function closeDetailModal(e) {
        if (e && e.target !== document.getElementById('detailOverlay')) return;
        closeOverlay('detailOverlay');
        detailId = null;
    }

    /* ══════════════════════════════════════════════════════════
       QUICK ACTIONS (inline trong bảng)
    ══════════════════════════════════════════════════════════ */
    function quickApprove(id) {
        if (!confirm('Duyệt yêu cầu này?')) return;
        patchStatus(id, 'APPROVED', '');
    }

    function quickReject(id) {
        const note = prompt('Lý do từ chối (tuỳ chọn):') || '';
        patchStatus(id, 'REJECTED', note);
    }

    function updateStatus(id, status) {
        const adminNote = getVal('detailAdminNote').trim();
        patchStatus(id, status, adminNote);
    }

    function patchStatus(id, status, adminNote) {
        apiFetch(API_URL + '/' + id + '/status', 'PATCH', { status, adminNote })
            .then(function () {
                const label = { APPROVED:'Đã duyệt', REJECTED:'Đã từ chối', DONE:'Đã xử lý' }[status] || status;
                showToast(label + ' thành công', 'success');
                closeOverlay('detailOverlay');
                loadStats();
                loadRequests();
            })
            .catch(function (err) {
                showToast('Lỗi: ' + err.message, 'error');
            });
    }

    /* ══════════════════════════════════════════════════════════
       DELETE
    ══════════════════════════════════════════════════════════ */
    function deleteRequest(id) {
        if (!confirm('Xoá yêu cầu này? Hành động không thể hoàn tác.')) return;

        apiFetch(API_URL + '/' + id, 'DELETE')
            .then(function () {
                showToast('Đã xoá yêu cầu', 'success');
                loadStats();
                loadRequests();
            })
            .catch(function (err) {
                showToast('Lỗi: ' + err.message, 'error');
            });
    }

    /* ══════════════════════════════════════════════════════════
       ACTIVE NAV
    ══════════════════════════════════════════════════════════ */
    function highlightActiveNav() {
        const currentPath = window.location.pathname;
        document.querySelectorAll('.nav-item').forEach(function (link) {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }

    /* ══════════════════════════════════════════════════════════
       TOAST
    ══════════════════════════════════════════════════════════ */
    let toastTimer = null;

    function showToast(message, type) {
        const el = document.getElementById('toast');
        el.textContent = message;
        el.className   = 'toast ' + (type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : '');

        requestAnimationFrame(function () {
            el.classList.add('show');
        });

        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.classList.remove('show');
        }, 3000);
    }

    /* ══════════════════════════════════════════════════════════
       API FETCH HELPER
    ══════════════════════════════════════════════════════════ */
    function apiFetch(url, method, body) {
        const token = localStorage.getItem('accessToken');

        /* ── Debug: kiểm tra token & role trong Console ── */
        if (!token) {
            console.warn('[HotelHub] Không tìm thấy accessToken trong localStorage. Vui lòng đăng nhập lại.');
        } else {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.debug('[HotelHub] Token user:', payload.sub, '| role:', payload.role || payload.authorities);
            } catch (_) { /* ignore parse errors */ }
        }

        const opts = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? 'Bearer ' + token : ''
            }
        };
        if (body !== undefined) opts.body = JSON.stringify(body);

        return fetch(url, opts).then(function (res) {
            if (!res.ok) {
                if (res.status === 403) {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    console.error('[HotelHub] 403 Forbidden – role hiện tại:', user.role,
                        '| Cần role ADMIN hoặc HOTEL_OWNER');
                }
                return res.json()
                    .then(function (e) { throw new Error(e.message || 'HTTP ' + res.status); })
                    .catch(function ()  { throw new Error('HTTP ' + res.status); });
            }
            if (res.status === 204) return {};
            return res.json();
        });
    }

    /* ══════════════════════════════════════════════════════════
       MODAL HELPERS
    ══════════════════════════════════════════════════════════ */
    function openOverlay(id)  { document.getElementById(id).classList.add('open'); }
    function closeOverlay(id) { document.getElementById(id).classList.remove('open'); }

    /* ══════════════════════════════════════════════════════════
       DOM HELPERS
    ══════════════════════════════════════════════════════════ */
    function setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    function escHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ══════════════════════════════════════════════════════════
       EXPOSE FUNCTIONS TO HTML (onclick handlers)
    ══════════════════════════════════════════════════════════ */
    window.openAddModal      = openAddModal;
    window.closeModal        = closeModal;
    window.saveRequest       = saveRequest;
    window.openDetail        = openDetail;
    window.closeDetailModal  = closeDetailModal;
    window.updateStatus      = updateStatus;
    window.quickApprove      = quickApprove;
    window.quickReject       = quickReject;
    window.deleteRequest     = deleteRequest;
    window.doSearch          = doSearch;
    window.goPage            = goPage;

})();
