/* ═══════════════════════════════════════════════════════════════
   admin-reviews.js  –  HotelHub Review & Comment Management
   Kết nối với backend: /api/admin/reviews/**
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─── Cấu hình API ─── */
const API_BASE = 'http://localhost:8081/api';

/** Lấy JWT từ localStorage (được lưu khi đăng nhập) */
function getToken() {
    return localStorage.getItem('accessToken') || '';
}

/** Headers dùng chung cho mọi request */
function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

/** Helper: gọi API và parse JSON */
async function apiFetch(url, options = {}) {
    try {
        const res = await fetch(url, {
            headers: authHeaders(),
            ...options
        });

        if (res.status === 204) return null;    // No Content
        const data = await res.json();

        if (!res.ok) {
            const msg = data?.message || data?.error || `HTTP ${res.status}`;
            throw new Error(msg);
        }
        return data;
    } catch (err) {
        console.error('[API Error]', url, err);
        throw err;
    }
}

/* ─── State ─── */
const state = {
    /* Dữ liệu */
    reviews: [],
    stats: null,
    activeReview: null,

    /* Phân trang & bộ lọc */
    currentPage: 0,         // server-side 0-indexed
    pageSize: 6,
    totalPages: 0,
    totalElements: 0,

    /* Bộ lọc */
    starFilter: null,       // null = tất cả
    statusFilter: null,     // null = tất cả
    sortBy: 'newest',
    searchQuery: '',

    /* UI state */
    editingReply: false,
    loading: false
};

/* ─── DOM Refs ─── */
const $ = id => document.getElementById(id);

/* ═══════════════════════════════════════
   LOAD DỮ LIỆU TỪ BACKEND
═══════════════════════════════════════ */

async function loadStats() {
    try {
        const data = await apiFetch(`${API_BASE}/admin/reviews/stats`);
        state.stats = data;
        renderStats(data);
    } catch (err) {
        console.warn('Không thể tải thống kê:', err.message);
    }
}

async function loadReviews() {
    if (state.loading) return;
    state.loading = true;

    /* Hiển thị loading */
    $('reviewsList').innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Đang tải nhận xét...</p>
        </div>`;

    try {
        /* Xây dựng query params */
        const params = new URLSearchParams({
            page: state.currentPage,
            size: state.pageSize
        });
        if (state.statusFilter) params.append('status', state.statusFilter);
        if (state.starFilter)   params.append('rating', state.starFilter);
        if (state.searchQuery)  params.append('keyword', state.searchQuery);

        const data = await apiFetch(
            `${API_BASE}/admin/reviews?${params.toString()}`
        );

        state.reviews      = data.content || [];
        state.totalPages   = data.totalPages || 0;
        state.totalElements = data.totalElements || 0;

        renderReviewList();
        renderPagination();
    } catch (err) {
        $('reviewsList').innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="1.8"/></svg>
                <p>Không thể tải dữ liệu</p>
                <span>${err.message}</span>
            </div>`;
        showToast('Lỗi kết nối đến server', 'error');
    } finally {
        state.loading = false;
    }
}

/* ═══════════════════════════════════════
   RENDER THỐNG KÊ
═══════════════════════════════════════ */

function renderStats(s) {
    if (!s) return;

    /* Điểm tổng thể */
    $('overallScore').textContent = s.overallAvg.toFixed(1);
    buildStars(s.overallAvg, $('overallStars'));
    $('overallCount').textContent =
        `Tổng hợp từ ${s.totalReviews.toLocaleString('vi-VN')} nhận xét`;

    /* Thanh phân phối sao */
    const pctMap = { 5: s.pct5Star, 4: s.pct4Star, 3: s.pct3Star, 2: s.pct2Star, 1: s.pct1Star };
    document.querySelectorAll('.breakdown-row').forEach(row => {
        const label = row.querySelector('.breakdown-label').textContent.trim(); // "5 sao"
        const star  = parseInt(label);
        const pct   = pctMap[star] ?? 0;
        const bar   = row.querySelector('.breakdown-bar');
        const pctEl = row.querySelector('.breakdown-pct');
        if (bar)   { bar.style.width = pct + '%'; bar.setAttribute('data-pct', pct); }
        if (pctEl) pctEl.textContent = pct.toFixed(0) + '%';
    });

    /* Quick stats */
    $('pendingCount').textContent  = s.pendingCount.toLocaleString('vi-VN');
    $('approvedCount').textContent = s.approvedCount.toLocaleString('vi-VN');
    $('rejectedCount').textContent = s.rejectedCount.toLocaleString('vi-VN');
    $('responseRate').textContent  = s.responseRate.toFixed(0) + '%';

    /* Tiêu chí */
    const criteriaMap = {
        scoreRoom:         s.avgRoom,
        scoreService:      s.avgService,
        scoreLocation:     s.avgLocation,
        scoreCleanliness:  s.avgCleanliness,
        scoreAmenities:    s.avgAmenities,
        scoreValue:        s.avgValue
    };
    Object.entries(criteriaMap).forEach(([elId, val]) => {
        const el = $(elId);
        if (el) el.textContent = (val || 0).toFixed(1);
    });

    /* Mini stars cho criteria cards */
    document.querySelectorAll('.criteria-mini-stars').forEach(el => {
        const scoreEl = el.previousElementSibling;
        const sc = scoreEl ? parseFloat(scoreEl.textContent) || 0 : 0;
        el.innerHTML = miniStars(sc);
    });
}

/* ═══════════════════════════════════════
   STAR RENDERING HELPERS
═══════════════════════════════════════ */

function starSVG(type) {
    const cls = `star-${type}`;
    if (type === 'filled') {
        return `<svg class="${cls}" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" stroke="currentColor" stroke-width="1.2"/></svg>`;
    }
    if (type === 'half') {
        return `<svg class="${cls}" viewBox="0 0 24 24"><defs><clipPath id="h"><rect x="0" y="0" width="12" height="24"/></clipPath></defs><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#d4c9c2" stroke="#d4c9c2" stroke-width="1.2"/><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f5a623" stroke="#f5a623" stroke-width="1.2" clip-path="url(#h)"/></svg>`;
    }
    return `<svg class="${cls}" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#d4c9c2" stroke="#d4c9c2" stroke-width="1.2"/></svg>`;
}

function buildStars(score, container) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (score >= i) html += starSVG('filled');
        else if (score >= i - 0.5) html += starSVG('half');
        else html += starSVG('empty');
    }
    if (container) container.innerHTML = html;
    return html;
}

function miniStars(score) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += starSVG(score >= i ? 'filled' : (score >= i - 0.5 ? 'half' : 'empty'));
    }
    return html;
}

/* ═══════════════════════════════════════
   HELPERS UI
═══════════════════════════════════════ */

function statusBadgeHTML(status) {
    const map = {
        PENDING:  ['badge-pending',  'Chờ duyệt'],
        APPROVED: ['badge-approved', 'Đã duyệt'],
        REJECTED: ['badge-rejected', 'Đã từ chối']
    };
    const [cls, label] = map[status] || ['badge-pending', status];
    return `<span class="status-badge ${cls}">${label}</span>`;
}

function cardBorderClass(status) {
    return status === 'PENDING' ? 'pending-card' : status === 'APPROVED' ? 'approved-card' : 'rejected-card';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function avatarLetter(name) {
    return name ? name.charAt(0).toUpperCase() : '?';
}

/* ═══════════════════════════════════════
   RENDER DANH SÁCH REVIEW
═══════════════════════════════════════ */

function renderReviewList() {
    const list = state.reviews;
    $('resultCount').textContent =
        `Hiển thị ${state.totalElements.toLocaleString('vi-VN')} nhận xét`;

    const container = $('reviewsList');

    if (!list.length) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="1.5"/></svg>
                <p>Không tìm thấy nhận xét nào</p>
                <span>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</span>
            </div>`;
        return;
    }

    container.innerHTML = list.map(r => `
        <div class="review-card ${cardBorderClass(r.status)}" data-id="${r.id}">
            <div class="review-avatar">${avatarLetter(r.guestName)}</div>
            <div class="review-card-body">
                <div class="review-card-top">
                    <div class="review-card-author">
                        <span class="review-author-name">${r.guestName || '—'}</span>
                        <div class="review-meta">
                            <span>${formatDate(r.createdAt)}</span>
                            <span class="meta-dot"></span>
                            <span>${r.roomType || '—'}</span>
                            <span class="meta-dot"></span>
                            <span>#BK-${String(r.bookingId).padStart(5,'0')}</span>
                        </div>
                    </div>
                    <div class="review-card-right">
                        ${statusBadgeHTML(r.status)}
                        <div class="review-stars">${buildStars(r.rating)}</div>
                    </div>
                </div>
                <div class="review-card-title">${r.title || '(Không có tiêu đề)'}</div>
                <div class="review-card-text">${r.comment || ''}</div>
                <div class="review-card-actions">
                    ${r.status === 'PENDING' ? `
                        <button class="card-action-btn btn-quick-approve" onclick="quickApprove(event,${r.id})">✓ Duyệt</button>
                        <button class="card-action-btn btn-quick-reject"  onclick="quickReject(event,${r.id})">✗ Từ chối</button>
                    ` : ''}
                    <button class="card-action-btn btn-view-detail" onclick="openModal(event,${r.id})">Xem chi tiết</button>
                </div>
            </div>
        </div>
    `).join('');

    /* Click vào card (không phải button) → mở modal */
    container.querySelectorAll('.review-card').forEach(card => {
        card.addEventListener('click', e => {
            if (e.target.closest('.card-action-btn')) return;
            openModal(e, parseInt(card.dataset.id));
        });
    });
}

/* ═══════════════════════════════════════
   PHÂN TRANG
═══════════════════════════════════════ */

function renderPagination() {
    const pages = state.totalPages;
    const cur   = state.currentPage; // 0-indexed

    $('prevPage').disabled = cur <= 0;
    $('nextPage').disabled = cur >= pages - 1;

    let nums = '';
    for (let i = 0; i < pages; i++) {
        const display = i + 1; // hiển thị 1-indexed
        if (i === 0 || i === pages - 1 || (i >= cur - 1 && i <= cur + 1)) {
            nums += `<button class="page-number ${i === cur ? 'active' : ''}" data-page="${i}">${display}</button>`;
        } else if (i === cur - 2 || i === cur + 2) {
            nums += `<span style="display:flex;align-items:center;color:#8c7b72;padding:0 4px">…</span>`;
        }
    }
    $('pageNumbers').innerHTML = nums;

    $('pageNumbers').querySelectorAll('.page-number').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentPage = parseInt(btn.dataset.page);
            loadReviews();
        });
    });
}

/* ═══════════════════════════════════════
   MODAL
═══════════════════════════════════════ */

async function openModal(e, id) {
    if (e) e.stopPropagation();

    /* Ưu tiên dùng data đã có trong state */
    let r = state.reviews.find(x => x.id === id);

    /* Nếu không có (vd mở từ URL), fetch riêng */
    if (!r) {
        try {
            r = await apiFetch(`${API_BASE}/admin/reviews/${id}`);
        } catch {
            showToast('Không thể tải chi tiết nhận xét', 'error');
            return;
        }
    }

    state.activeReview = r;
    state.editingReply = false;

    /* Điền thông tin vào modal */
    $('modalAvatar').textContent        = avatarLetter(r.guestName);
    $('modalCustomerName').textContent  = r.guestName || '—';
    $('modalDate').textContent          = formatDate(r.createdAt);
    $('modalRoom').textContent          = r.roomType || '—';
    $('modalBookingId').textContent     = `#BK-${String(r.bookingId).padStart(5,'0')}`;
    $('modalStatusBadge').innerHTML     = statusBadgeHTML(r.status);

    buildStars(r.rating, $('modalStars'));
    $('modalScore').textContent = `${r.rating}.0 / 5`;
    $('modalTitle').textContent   = r.title || '(Không có tiêu đề)';
    $('modalComment').textContent = r.comment || '';

    /* Điểm chi tiết */
    const criteriaMap = [
        { key: 'roomRating',         label: 'Phòng ở' },
        { key: 'serviceRating',      label: 'Dịch vụ' },
        { key: 'locationRating',     label: 'Vị trí' },
        { key: 'cleanlinessRating',  label: 'Sạch sẽ' },
        { key: 'amenitiesRating',    label: 'Tiện nghi' },
        { key: 'valueRating',        label: 'Giá trị' }
    ];
    $('modalCriteriaGrid').innerHTML = criteriaMap.map(c => {
        const sc  = r[c.key] || 0;
        const pct = (sc / 5) * 100;
        return `
            <div class="modal-criteria-item">
                <span class="modal-criteria-name">${c.label}</span>
                <span class="modal-criteria-score">${sc > 0 ? sc + '.0' : '—'}</span>
                <div class="modal-criteria-bar-wrap">
                    <div class="modal-criteria-bar" style="width:${pct}%"></div>
                </div>
            </div>`;
    }).join('');

    /* Phản hồi */
    updateReplyUI(r);

    /* Footer (nút duyệt / từ chối) */
    const footer = $('modalFooter');
    if (r.status !== 'PENDING') {
        footer.style.display = 'none';
    } else {
        footer.style.display = 'flex';
        $('btnApprove').onclick = () => changeStatus(r.id, 'APPROVED');
        $('btnReject').onclick  = () => changeStatus(r.id, 'REJECTED');
    }

    $('reviewModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function updateReplyUI(r) {
    const existing = $('replyExisting');
    const form     = $('replyForm');
    if (r.hasReply && !state.editingReply) {
        existing.style.display = 'block';
        $('replyText').textContent = r.replyText || '';
        $('replyDate').textContent = r.repliedAt ? formatDate(r.repliedAt) : '—';
        form.style.display = 'none';
    } else {
        existing.style.display = 'none';
        form.style.display = 'block';
        $('replyTextarea').value = r.hasReply ? (r.replyText || '') : '';
    }
}

function closeModal() {
    $('reviewModal').classList.remove('open');
    document.body.style.overflow = '';
    state.activeReview = null;
}

/* ═══════════════════════════════════════
   ACTIONS – THAY ĐỔI TRẠNG THÁI
═══════════════════════════════════════ */

async function changeStatus(id, newStatus) {
    try {
        const updated = await apiFetch(`${API_BASE}/admin/reviews/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });

        /* Cập nhật local state */
        const idx = state.reviews.findIndex(r => r.id === id);
        if (idx !== -1) state.reviews[idx] = updated;
        if (state.activeReview?.id === id) state.activeReview = updated;

        closeModal();
        await Promise.all([loadStats(), loadReviews()]);

        const msg = newStatus === 'APPROVED'
            ? 'Đã duyệt nhận xét thành công!'
            : 'Đã từ chối nhận xét.';
        showToast(msg, newStatus === 'APPROVED' ? 'success' : 'error');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function quickApprove(e, id) {
    e.stopPropagation();
    await changeStatus(id, 'APPROVED');
}

async function quickReject(e, id) {
    e.stopPropagation();
    await changeStatus(id, 'REJECTED');
}

/* ═══════════════════════════════════════
   ACTIONS – PHẢN HỒI
═══════════════════════════════════════ */

async function sendReply() {
    const r = state.activeReview;
    if (!r) return;

    const text = $('replyTextarea').value.trim();
    if (!text) { $('replyTextarea').focus(); return; }

    const btn = $('btnSendReply');
    btn.disabled = true;
    btn.textContent = 'Đang gửi...';

    try {
        const updated = await apiFetch(`${API_BASE}/admin/reviews/${r.id}/reply`, {
            method: 'POST',
            body: JSON.stringify({ replyText: text })
        });

        /* Cập nhật local */
        const idx = state.reviews.findIndex(x => x.id === r.id);
        if (idx !== -1) state.reviews[idx] = updated;
        state.activeReview = updated;
        state.editingReply = false;
        updateReplyUI(updated);

        showToast('Đã gửi phản hồi thành công!', 'success');
        await loadStats();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M17.5 10L2.5 3.5 6 10.5l-3.5 7L17.5 10z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg> Gửi phản hồi`;
    }
}

/* ═══════════════════════════════════════
   DEBOUNCE SEARCH
═══════════════════════════════════════ */

function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* ═══════════════════════════════════════
   EXPORT CSV
═══════════════════════════════════════ */

async function exportReport() {
    showToast('Đang chuẩn bị xuất báo cáo...', 'success');
    try {
        const params = new URLSearchParams({ page: 0, size: 9999 });
        if (state.statusFilter) params.append('status', state.statusFilter);
        if (state.starFilter)   params.append('rating', state.starFilter);
        if (state.searchQuery)  params.append('keyword', state.searchQuery);

        const data = await apiFetch(`${API_BASE}/admin/reviews?${params}`);
        const rows = data.content || [];

        /* Tạo CSV */
        const headers = ['ID', 'Khách hàng', 'Email', 'Loại phòng', 'Booking ID',
                         'Điểm', 'Tiêu đề', 'Nội dung', 'Trạng thái', 'Ngày tạo'];
        const csvRows = [headers.join(',')];

        rows.forEach(r => {
            csvRows.push([
                r.id,
                `"${(r.guestName || '').replace(/"/g,'""')}"`,
                r.guestEmail || '',
                `"${r.roomType || ''}"`,
                r.bookingId,
                r.rating,
                `"${(r.title || '').replace(/"/g,'""')}"`,
                `"${(r.comment || '').replace(/"/g,'""').replace(/\n/g,' ')}"`,
                r.statusLabel || r.status,
                formatDate(r.createdAt)
            ].join(','));
        });

        const blob = new Blob(['\uFEFF' + csvRows.join('\n')],
                              { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `reviews_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Xuất báo cáo thành công!', 'success');
    } catch (err) {
        showToast('Xuất báo cáo thất bại: ' + err.message, 'error');
    }
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */

function showToast(msg, type = 'success') {
    const t = $('toast');
    $('toastMessage').textContent = msg;
    t.className = `toast toast-${type} show`;
    setTimeout(() => t.classList.remove('show'), 3200);
}

/* ═══════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════ */

function initEventListeners() {

    /* ── Search (debounce 350ms) ── */
    $('searchInput').addEventListener('input', debounce(e => {
        state.searchQuery = e.target.value.trim();
        state.currentPage = 0;
        loadReviews();
    }, 350));

    /* ── Lọc sao ── */
    $('starFilter').addEventListener('click', e => {
        const btn = e.target.closest('.filter-tab');
        if (!btn) return;
        $('starFilter').querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.starFilter   = btn.dataset.star === 'all' ? null : parseInt(btn.dataset.star);
        state.currentPage  = 0;
        loadReviews();
    });

    /* ── Lọc trạng thái ── */
    $('statusFilter').addEventListener('change', e => {
        state.statusFilter = e.target.value === 'all' ? null : e.target.value;
        state.currentPage  = 0;
        loadReviews();
    });

    /* ── Sắp xếp (client-side sort vì backend sort theo createdAt) ── */
    $('sortSelect').addEventListener('change', e => {
        state.sortBy = e.target.value;
        sortReviewsLocally();
        renderReviewList();
    });

    /* ── Phân trang ── */
    $('prevPage').addEventListener('click', () => {
        if (state.currentPage > 0) { state.currentPage--; loadReviews(); }
    });
    $('nextPage').addEventListener('click', () => {
        if (state.currentPage < state.totalPages - 1) { state.currentPage++; loadReviews(); }
    });

    /* ── Modal ── */
    $('modalClose').addEventListener('click', closeModal);
    $('reviewModal').addEventListener('click', e => {
        if (e.target === $('reviewModal')) closeModal();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && $('reviewModal').classList.contains('open')) closeModal();
    });

    /* ── Phản hồi ── */
    $('btnEditReply').addEventListener('click', () => {
        state.editingReply = true;
        updateReplyUI(state.activeReview);
    });
    $('btnCancelReply').addEventListener('click', () => {
        state.editingReply = false;
        updateReplyUI(state.activeReview);
    });
    $('btnSendReply').addEventListener('click', sendReply);

    /* ── Export ── */
    $('btnExport').addEventListener('click', exportReport);
}

/* Sắp xếp local khi không reload từ server */
function sortReviewsLocally() {
    switch (state.sortBy) {
        case 'newest':  state.reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
        case 'oldest':  state.reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
        case 'highest': state.reviews.sort((a, b) => b.rating - a.rating); break;
        case 'lowest':  state.reviews.sort((a, b) => a.rating - b.rating); break;
    }
}

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
    initEventListeners();
    await Promise.all([loadStats(), loadReviews()]);
});
