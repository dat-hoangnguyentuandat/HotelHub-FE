/* ===================================================
   admin-cancellation.js
   Quản lý Hủy phòng & Hoàn tiền – HotelHub Admin
=================================================== */

'use strict';

const API_BASE    = (typeof window.BACKEND_URL !== 'undefined' ? window.BACKEND_URL : 'http://localhost:8081');
const CANCEL_API  = API_BASE + '/api/admin/cancellations';
const BOOKING_API = API_BASE + '/api/admin/bookings';

/* ── State ── */
let currentPage = 0;
let totalPages  = 1;
const PAGE_SIZE = 10;
let allRecords  = [];
let currentDetailId = null;
let policies = [];

/* ── DOM refs ── */
const searchInput    = document.getElementById('searchInput');
const filterStatus   = document.getElementById('filterStatus');
const filterFrom     = document.getElementById('filterFrom');
const filterTo       = document.getElementById('filterTo');
const tableBody      = document.getElementById('cancellationTableBody');
const tableCount     = document.getElementById('tableCount');
const emptyState     = document.getElementById('emptyState');
const paginationEl   = document.getElementById('pagination');

/* ═══════════════════════════════════════════════════
   API HELPERS
═══════════════════════════════════════════════════ */
async function apiFetch(url, method = 'GET', body = null) {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        console.warn('[HotelHub] Không tìm thấy accessToken. Vui lòng đăng nhập lại.');
    }

    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? 'Bearer ' + token : ''
        }
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    if (!res.ok) {
        if (res.status === 401) { window.location.href = '/login'; return; }
        if (res.status === 403) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            console.error('[HotelHub] 403 Forbidden – role:', user.role, '| Cần ADMIN hoặc HOTEL_OWNER');
        }
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(errText || res.statusText);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

/* ═══════════════════════════════════════════════════
   LOAD DATA
═══════════════════════════════════════════════════ */
async function loadCancellations(page = 0) {
    showSkeleton();

    try {
        /* --- Try dedicated cancellation API first --- */
        let url = CANCEL_API
            + '?page='  + page
            + '&size='  + PAGE_SIZE;

        const status  = filterStatus.value;
        const keyword = searchInput.value.trim();
        const from    = filterFrom.value;
        const to      = filterTo.value;

        if (status)  url += '&status='  + encodeURIComponent(status);
        if (keyword) url += '&keyword=' + encodeURIComponent(keyword);
        if (from)    url += '&from='    + encodeURIComponent(from);
        if (to)      url += '&to='      + encodeURIComponent(to);

        const data = await apiFetch(url);
        handlePagedResponse(data);

    } catch {
        /* --- Fallback: fetch CANCELLED bookings from booking API --- */
        try {
            let url = BOOKING_API
                + '?page='  + page
                + '&size='  + PAGE_SIZE
                + '&status=CANCELLED';

            const keyword = searchInput.value.trim();
            const from    = filterFrom.value;
            const to      = filterTo.value;
            if (keyword) url += '&keyword='      + encodeURIComponent(keyword);
            if (from)    url += '&checkInFrom='  + encodeURIComponent(from);
            if (to)      url += '&checkInTo='    + encodeURIComponent(to);

            const data = await apiFetch(url);
            /* Map booking response → cancellation shape */
            const mapped = {
                content:       (data.content || []).map(mapBookingToCancellation),
                page:          data.page        || 0,
                totalPages:    data.totalPages  || 1,
                totalElements: data.totalElements || 0
            };
            handlePagedResponse(mapped);
        } catch (err2) {
            console.warn('API not reachable, showing demo data.', err2);
            handlePagedResponse(demoData());
        }
    }
}

function handlePagedResponse(data) {
    const items  = data.content       || data || [];
    currentPage  = data.page          || 0;
    totalPages   = data.totalPages    || 1;
    const total  = data.totalElements || items.length;
    allRecords   = items;

    renderTable(items);
    renderPagination();
    loadStats();

    tableCount.textContent = `${total} yêu cầu hủy phòng`;
}

/* ── Map cancelled booking → local shape ── */
function mapBookingToCancellation(b) {
    const total      = b.totalAmount || 0;
    const policyText = 'Hủy trước 24h hoàn 50%';
    const refundPct  = 50;
    const refund     = (total * refundPct) / 100;

    return {
        id:            b.id,
        bookingCode:   b.bookingCode || ('DP' + String(b.id).padStart(5, '0')),
        guestName:     b.guestName   || b.customerName || '—',
        guestPhone:    b.guestPhone  || b.phone || '—',
        roomType:      b.roomType    || b.roomName || '—',
        bookingDate:   b.bookingDate || b.createdAt || null,
        cancelDate:    b.cancelledAt || b.updatedAt  || null,
        checkIn:       b.checkInDate || b.checkIn    || null,
        checkOut:      b.checkOutDate|| b.checkOut   || null,
        totalAmount:   total,
        refundAmount:  refund,
        refundRate:    refundPct,
        policy:        policyText,
        refundStatus:  b.refundStatus || 'PENDING_REFUND',
        reason:        b.cancelReason || b.notes || 'Khách hàng yêu cầu hủy'
    };
}

/* ── Demo data (fallback when API offline) ── */
function demoData() {
    return {
        content: [
            {
                id: 1, bookingCode: 'DP12345',
                guestName: 'Nguyễn Văn A', guestPhone: '0901 234 567',
                roomType: 'Deluxe Double', bookingDate: '2025-05-01', cancelDate: '2025-09-05',
                checkIn: '2025-09-10', checkOut: '2025-09-12',
                totalAmount: 400000, refundAmount: 200000, refundRate: 50,
                policy: 'Hủy trước 24h hoàn 50%', refundStatus: 'REFUNDED',
                reason: 'Thay đổi kế hoạch du lịch'
            },
            {
                id: 2, bookingCode: 'DP23456',
                guestName: 'Trần Sinh', guestPhone: '0912 345 678',
                roomType: 'Superior Twin', bookingDate: '2025-10-17', cancelDate: '2025-10-02',
                checkIn: '2025-10-20', checkOut: '2025-10-23',
                totalAmount: 500000, refundAmount: 250000, refundRate: 50,
                policy: 'Hủy trước 24h hoàn 50%', refundStatus: 'REFUNDED',
                reason: 'Lý do cá nhân'
            },
            {
                id: 3, bookingCode: 'DP34567',
                guestName: 'Trần Bình An', guestPhone: '0987 654 321',
                roomType: 'Suite Ocean View', bookingDate: '2025-09-02', cancelDate: '2025-09-22',
                checkIn: '2025-10-01', checkOut: '2025-10-05',
                totalAmount: 1000000, refundAmount: 500000, refundRate: 50,
                policy: 'Hủy trước 24h hoàn 50%', refundStatus: 'PENDING_REFUND',
                reason: 'Không thể đi du lịch do công việc'
            }
        ],
        page: 0, totalPages: 1, totalElements: 3
    };
}

/* ═══════════════════════════════════════════════════
   LOAD STATS
═══════════════════════════════════════════════════ */
async function loadStats() {
    /* Calculate from current data first */
    const pending  = allRecords.filter(r => r.refundStatus === 'PENDING_REFUND').length;
    const refunded = allRecords.filter(r => r.refundStatus === 'REFUNDED').length;
    const rejected = allRecords.filter(r => r.refundStatus === 'REJECTED').length;
    const total    = allRecords.length;
    const totalAmt = allRecords
        .filter(r => r.refundStatus === 'REFUNDED')
        .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

    document.getElementById('statTotal').textContent     = total;
    document.getElementById('statPending').textContent   = pending;
    document.getElementById('statRefunded').textContent  = refunded;
    document.getElementById('statRejected').textContent  = rejected;
    document.getElementById('statTotalAmount').textContent = formatCurrency(totalAmt);

    /* Try to get real stats from API */
    try {
        const stats = await apiFetch(CANCEL_API + '/stats');
        if (stats) {
            if (stats.total     != null) document.getElementById('statTotal').textContent     = stats.total;
            if (stats.pending   != null) document.getElementById('statPending').textContent   = stats.pending;
            if (stats.refunded  != null) document.getElementById('statRefunded').textContent  = stats.refunded;
            if (stats.rejected  != null) document.getElementById('statRejected').textContent  = stats.rejected;
            if (stats.totalRefundAmount != null)
                document.getElementById('statTotalAmount').textContent = formatCurrency(stats.totalRefundAmount);
        }
    } catch { /* use calculated values */ }
}

/* ═══════════════════════════════════════════════════
   RENDER TABLE
═══════════════════════════════════════════════════ */
function renderTable(records) {
    /* Apply client-side status filter (for demo/fallback mode) */
    const statusFilter  = filterStatus.value;
    const keywordFilter = searchInput.value.trim().toLowerCase();

    let filtered = records;
    if (statusFilter) {
        filtered = filtered.filter(r => r.refundStatus === statusFilter);
    }
    if (keywordFilter) {
        filtered = filtered.filter(r =>
            (r.bookingCode || '').toLowerCase().includes(keywordFilter) ||
            (r.guestName   || '').toLowerCase().includes(keywordFilter)
        );
    }

    if (filtered.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    tableBody.innerHTML = filtered.map(r => `
        <tr data-id="${r.id}">
            <td>
                <a class="booking-code-link" onclick="openDetail(${r.id})" title="Xem chi tiết">
                    ${esc(r.bookingCode)}
                </a>
            </td>
            <td>
                <span class="guest-name">${esc(r.guestName)}</span>
                <span class="guest-phone">${esc(r.guestPhone || '—')}</span>
            </td>
            <td>
                <div class="date-pair">
                    <span class="date-booking">${fmtDate(r.bookingDate)}</span>
                    <span class="date-cancel">${fmtDate(r.cancelDate)}</span>
                </div>
            </td>
            <td>
                <span class="policy-badge">${esc(r.policy || '—')}</span>
            </td>
            <td>
                <span class="amount-val${(r.refundAmount || 0) === 0 ? ' zero' : ''}">
                    ${formatCurrency(r.refundAmount || 0)}
                </span>
            </td>
            <td>${statusBadge(r.refundStatus)}</td>
            <td>
                <div class="action-group">
                    <button class="btn-action btn-view" onclick="openDetail(${r.id})" title="Xem chi tiết">
                        <svg viewBox="0 0 20 20" fill="none"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.6"/></svg>
                    </button>
                    ${r.refundStatus === 'PENDING_REFUND' ? `
                    <button class="btn-action btn-approve" onclick="quickApprove(${r.id})" title="Xác nhận hoàn tiền">
                        <svg viewBox="0 0 20 20" fill="none"><path d="M4 10l5 5 7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button class="btn-action btn-reject" onclick="quickReject(${r.id})" title="Từ chối hoàn tiền">
                        <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                    </button>` : ''}
                    <button class="btn-action btn-delete" onclick="deleteRecord(${r.id})" title="Xóa">
                        <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showSkeleton() {
    tableBody.innerHTML = `
        <tr class="loading-row">
            <td colspan="7">
                <div class="skeleton-wrap">
                    <div class="skeleton"></div>
                    <div class="skeleton"></div>
                    <div class="skeleton"></div>
                </div>
            </td>
        </tr>`;
    emptyState.style.display = 'none';
}

/* ═══════════════════════════════════════════════════
   PAGINATION
═══════════════════════════════════════════════════ */
function renderPagination() {
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    let html = `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 0 ? 'disabled' : ''}>‹</button>`;
    const start = Math.max(0, currentPage - 2);
    const end   = Math.min(totalPages - 1, currentPage + 2);

    if (start > 0)           html += `<button class="page-btn" onclick="goPage(0)">1</button>${start > 1 ? '<span>…</span>' : ''}`;
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i + 1}</button>`;
    }
    if (end < totalPages - 1) html += `${end < totalPages - 2 ? '<span>…</span>' : ''}<button class="page-btn" onclick="goPage(${totalPages - 1})">${totalPages}</button>`;
    html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>›</button>`;

    paginationEl.innerHTML = html;
}

window.goPage = function(p) {
    if (p < 0 || p >= totalPages) return;
    loadCancellations(p);
};

/* ═══════════════════════════════════════════════════
   DETAIL MODAL
═══════════════════════════════════════════════════ */
window.openDetail = function(id) {
    const rec = allRecords.find(r => r.id === id);
    if (!rec) return;
    currentDetailId = id;

    /* Populate fields */
    document.getElementById('dBookingCode').textContent  = rec.bookingCode || '—';
    document.getElementById('dGuestName').textContent    = rec.guestName   || '—';
    document.getElementById('dRoomType').textContent     = rec.roomType    || '—';
    document.getElementById('dPhone').textContent        = rec.guestPhone  || '—';
    document.getElementById('dCheckIn').textContent      = fmtDate(rec.checkIn);
    document.getElementById('dCheckOut').textContent     = fmtDate(rec.checkOut);
    document.getElementById('dTotalAmount').textContent  = formatCurrency(rec.totalAmount || 0);
    document.getElementById('dCancelDate').textContent   = fmtDate(rec.cancelDate);
    document.getElementById('dPolicy').textContent       = rec.policy || '—';
    document.getElementById('dRefundRate').textContent   = (rec.refundRate || 0) + '%';
    document.getElementById('dRefundAmount').textContent = formatCurrency(rec.refundAmount || 0);
    document.getElementById('dReason').textContent       = rec.reason || '—';
    document.getElementById('processNote').value         = '';

    /* Show/hide action buttons based on status */
    const isPending = rec.refundStatus === 'PENDING_REFUND';
    document.getElementById('btnRejectRefund').style.display  = isPending ? '' : 'none';
    document.getElementById('btnApproveRefund').style.display = isPending ? '' : 'none';
    document.getElementById('processSection').style.display   = isPending ? '' : 'none';

    /* Update title */
    document.getElementById('detailModalTitle').textContent =
        isPending ? 'Xử lý yêu cầu hủy phòng' : 'Chi tiết yêu cầu hủy phòng';

    openModal('detailModalOverlay');
};

/* ── Quick approve/reject from table ── */
window.quickApprove = function(id) {
    currentDetailId = id;
    processRefund('REFUNDED', '');
};

window.quickReject = function(id) {
    currentDetailId = id;
    processRefund('REJECTED', 'Từ chối hoàn tiền từ admin');
};

/* ── Approve from modal ── */
document.getElementById('btnApproveRefund').addEventListener('click', () => {
    const note = document.getElementById('processNote').value.trim();
    processRefund('REFUNDED', note);
});

/* ── Reject from modal ── */
document.getElementById('btnRejectRefund').addEventListener('click', () => {
    const note = document.getElementById('processNote').value.trim();
    if (!note) {
        showToast('Vui lòng nhập lý do từ chối!', 'error');
        document.getElementById('processNote').focus();
        return;
    }
    processRefund('REJECTED', note);
});

async function processRefund(newStatus, note) {
    if (!currentDetailId) return;

    try {
        /* Try dedicated API */
        await apiFetch(
            CANCEL_API + '/' + currentDetailId + '/status',
            'PATCH',
            { status: newStatus, note: note }
        );
    } catch {
        /* Fallback: update local state only */
        const rec = allRecords.find(r => r.id === currentDetailId);
        if (rec) rec.refundStatus = newStatus;
    }

    const msg = newStatus === 'REFUNDED'
        ? 'Đã xác nhận hoàn tiền thành công!'
        : 'Đã từ chối yêu cầu hoàn tiền.';

    const type = newStatus === 'REFUNDED' ? 'success' : 'error';
    showToast(msg, type);
    closeModal('detailModalOverlay');
    loadCancellations(currentPage);
}

/* ── Delete ── */
window.deleteRecord = async function(id) {
    if (!confirm('Bạn có chắc muốn xóa yêu cầu hủy phòng này?')) return;
    try {
        await apiFetch(CANCEL_API + '/' + id, 'DELETE');
        showToast('Đã xóa yêu cầu hủy phòng.', 'success');
        // Reload lại danh sách
        await loadCancellations(currentPage);
        await loadStats();
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Không thể xóa: ' + (err.message || 'Lỗi không xác định'), 'error');
    }
};

/* ═══════════════════════════════════════════════════
   POLICY MODAL
═══════════════════════════════════════════════════ */
const DEFAULT_POLICIES = [
    { minHours: 48, label: 'Hủy trước 48h hoàn 100%',  refundRate: 100 },
    { minHours: 24, label: 'Hủy trước 24h hoàn 50%',   refundRate: 50  },
    { minHours: 0,  label: 'Hủy trong ngày không hoàn', refundRate: 0   }
];

async function loadPolicies() {
    try {
        const data = await apiFetch(CANCEL_API + '/policies');
        policies = data || DEFAULT_POLICIES;
    } catch {
        policies = [...DEFAULT_POLICIES];
    }
    renderPolicies();
}

function renderPolicies() {
    const list = document.getElementById('policyList');
    list.innerHTML = policies.map((p, i) => `
        <div class="policy-row" data-index="${i}">
            <div>
                <label style="font-size:11px;font-weight:600;color:#8c7b72;margin-bottom:4px;display:block">Tên chính sách</label>
                <input class="form-input" type="text" placeholder="Vd: Hủy trước 24h hoàn 50%"
                    value="${esc(p.label || '')}"
                    onchange="updatePolicy(${i},'label',this.value)" />
            </div>
            <div>
                <label style="font-size:11px;font-weight:600;color:#8c7b72;margin-bottom:4px;display:block">Số giờ tối thiểu</label>
                <input class="form-input" type="number" min="0" placeholder="Số giờ"
                    value="${p.minHours || 0}"
                    onchange="updatePolicy(${i},'minHours',+this.value)" />
            </div>
            <div>
                <label style="font-size:11px;font-weight:600;color:#8c7b72;margin-bottom:4px;display:block">Tỷ lệ hoàn (%)</label>
                <input class="form-input" type="number" min="0" max="100" placeholder="0-100"
                    value="${p.refundRate || 0}"
                    onchange="updatePolicy(${i},'refundRate',+this.value)" />
            </div>
            <button class="btn-remove-policy" onclick="removePolicy(${i})" title="Xóa">×</button>
        </div>
    `).join('');
}

window.updatePolicy = function(idx, field, val) {
    if (policies[idx]) policies[idx][field] = val;
};

window.removePolicy = function(idx) {
    policies.splice(idx, 1);
    renderPolicies();
};

document.getElementById('btnAddPolicy').addEventListener('click', () => {
    policies.push({ minHours: 0, label: '', refundRate: 0 });
    renderPolicies();
});

document.getElementById('btnSavePolicy').addEventListener('click', async () => {
    try {
        await apiFetch(CANCEL_API + '/policies', 'PUT', policies);
        showToast('Đã lưu chính sách hoàn tiền!', 'success');
    } catch {
        showToast('Đã lưu chính sách (chế độ offline).', 'info');
    }
    closeModal('policyModalOverlay');
});

document.getElementById('btnOpenPolicy').addEventListener('click', () => {
    loadPolicies();
    openModal('policyModalOverlay');
});

/* ═══════════════════════════════════════════════════
   MODAL HELPERS
═══════════════════════════════════════════════════ */
function openModal(id) {
    document.getElementById(id).classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
    document.body.style.overflow = '';
}

/* Close buttons */
['btnCloseDetailModal', 'btnCloseDetail'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => closeModal('detailModalOverlay'));
});

['btnClosePolicyModal', 'btnClosePolicyFooter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => closeModal('policyModalOverlay'));
});

/* Close on overlay click */
document.getElementById('detailModalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('detailModalOverlay');
});
document.getElementById('policyModalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal('policyModalOverlay');
});

/* ═══════════════════════════════════════════════════
   FILTERS & SEARCH
═══════════════════════════════════════════════════ */
let searchTimer;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        /* Client-side filter first, then server re-fetch */
        renderTable(allRecords);
    }, 280);
});

filterStatus.addEventListener('change', () => loadCancellations(0));

document.getElementById('btnFilterDate').addEventListener('click', () => loadCancellations(0));

document.getElementById('btnClearDate').addEventListener('click', () => {
    filterFrom.value = '';
    filterTo.value   = '';
    loadCancellations(0);
});

/* ═══════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════ */
let toastTimer;
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const icon  = type === 'success'
        ? `<svg class="toast-icon" viewBox="0 0 20 20" fill="none"><path d="M10 18A8 8 0 1010 2a8 8 0 000 16z" stroke="currentColor" stroke-width="1.5"/><path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : type === 'error'
        ? `<svg class="toast-icon" viewBox="0 0 20 20" fill="none"><path d="M10 18A8 8 0 1010 2a8 8 0 000 16z" stroke="currentColor" stroke-width="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
        : `<svg class="toast-icon" viewBox="0 0 20 20" fill="none"><path d="M10 18A8 8 0 1010 2a8 8 0 000 16z" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v5M10 7h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

    toast.innerHTML = icon + `<span class="toast-msg">${esc(msg)}</span>`;
    toast.className = 'toast toast-' + type;

    clearTimeout(toastTimer);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ═══════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════ */
function statusBadge(status) {
    const map = {
        PENDING_REFUND: ['badge-pending-refund', 'Chờ xử lý'],
        REFUNDED:       ['badge-refunded',       'Đã hoàn tiền'],
        REJECTED:       ['badge-rejected',       'Từ chối hoàn']
    };
    const [cls, label] = map[status] || ['badge-pending-refund', status || '—'];
    return `<span class="status-badge ${cls}">${label}</span>`;
}

function formatCurrency(amount) {
    if (amount == null || amount === 0) return '0đ';
    return new Intl.NumberFormat('vi-VN', {
        style:    'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    }).format(amount).replace('₫', 'đ');
}

function fmtDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ── Active nav highlight ── */
(function highlightNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-item').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === path);
    });
})();

/* ═══════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    loadCancellations(0);
});
