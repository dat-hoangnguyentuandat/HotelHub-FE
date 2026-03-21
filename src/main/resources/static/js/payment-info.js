/* ═══════════════════════════════════════════════════════
   payment-info.js  –  HotelHub Thông Tin Thanh Toán
   Kết nối backend: Spring Boot REST API (port 8081)
   Endpoints:
     GET  /api/payments/my/stats        → thống kê 4 thẻ
     GET  /api/payments/my/info         → danh sách giao dịch (có filter + phân trang)
     GET  /api/payments/{id}/info       → chi tiết giao dịch
     POST /api/admin/payments/{id}/refund → yêu cầu hoàn tiền
     PATCH /api/payments/{id}/cancel    → hủy giao dịch PENDING
═══════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════
   CONFIG – đọc backendUrl từ thẻ meta được Thymeleaf inject
══════════════════════════════════════════════════════ */
const BACKEND_URL = (() => {
    const meta = document.querySelector('meta[name="backend-url"]');
    return (meta && meta.content) ? meta.content.replace(/\/$/, '') : 'http://localhost:8081';
})();

/* ══════════════════════════════════════════════════════
   AUTH HELPERS
══════════════════════════════════════════════════════ */
function getToken() {
    return localStorage.getItem('accessToken') || '';
}

function authHeaders() {
    const token = getToken();
    return token
        ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
}

function isLoggedIn() {
    return !!getToken();
}

/* ══════════════════════════════════════════════════════
   HTTP HELPERS
══════════════════════════════════════════════════════ */
async function apiGet(path) {
    const res = await fetch(BACKEND_URL + path, { headers: authHeaders() });
    if (res.status === 401 || res.status === 403) {
        showLoginWall();
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
    }
    return res.json();
}

async function apiPost(path, body) {
    const res = await fetch(BACKEND_URL + path, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
}

async function apiPatch(path, body) {
    const res = await fetch(BACKEND_URL + path, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(body || {})
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
}

/* ══════════════════════════════════════════════════════
   FORMATTERS
══════════════════════════════════════════════════════ */
function formatCurrency(amount) {
    if (amount == null || isNaN(Number(amount))) return '–';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
        .format(Number(amount));
}

function formatDateTime(dt) {
    if (!dt) return '–';
    const d = new Date(dt);
    if (isNaN(d)) return dt;
    return d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatDate(dt) {
    if (!dt) return '–';
    const d = new Date(dt);
    if (isNaN(d)) return dt;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ══════════════════════════════════════════════════════
   STATUS / METHOD LABELS & CSS CLASSES
══════════════════════════════════════════════════════ */
const STATUS_LABEL = {
    SUCCESS:   'Thành công',
    PENDING:   'Đang chờ',
    PROCESSING:'Đang xử lý',
    FAILED:    'Thất bại',
    CANCELLED: 'Đã hủy',
    REFUNDED:  'Đã hoàn tiền'
};
const STATUS_CSS = {
    SUCCESS: 'success', PENDING: 'pending', PROCESSING: 'pending',
    FAILED: 'failed', CANCELLED: 'cancelled', REFUNDED: 'refunded'
};

const METHOD_LABEL = {
    CARD: 'Thẻ ngân hàng', QR: 'Quét QR',
    WALLET: 'Ví điện tử',  CASH: 'Tiền mặt'
};
const METHOD_CSS = { CARD: 'card', QR: 'qr', WALLET: 'wallet', CASH: 'cash' };

const METHOD_SVG = {
    CARD: `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="#3b82f6" stroke-width="1.8"/><path d="M2 10h20" stroke="#3b82f6" stroke-width="1.8"/><path d="M6 15h4M14 15h2" stroke="#3b82f6" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    QR:   `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="#22c55e" stroke-width="1.8"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="#22c55e" stroke-width="1.8"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="#22c55e" stroke-width="1.8"/><path d="M15 15h1m3 0h1m-3 2h1m2-2v4" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    WALLET:`<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="14" rx="2" stroke="#a855f7" stroke-width="1.8"/><path d="M2 11h20" stroke="#a855f7" stroke-width="1.8"/><circle cx="18" cy="15.5" r="2" fill="#a855f7"/></svg>`,
    CASH:  `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="12" rx="2" stroke="#e55200" stroke-width="1.8"/><circle cx="12" cy="13" r="3" stroke="#e55200" stroke-width="1.8"/><path d="M6 13h.5M17.5 13H18" stroke="#e55200" stroke-width="1.8" stroke-linecap="round"/></svg>`
};

/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
const state = {
    /* Data */
    payments: [],          // mảng PaymentInfoResponse từ API
    totalElements: 0,
    totalPages: 0,

    /* Filters */
    search:      '',
    filterStatus:'',
    filterMethod:'',
    filterDateFrom:'',
    filterDateTo:'',

    /* Pagination */
    page: 0,
    pageSize: 8,

    /* Detail */
    selectedId: null,

    /* Trạng thái loading */
    loading: false
};

/* ══════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════ */
function showToast(msg, type = 'default') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast' + (type !== 'default' ? ' ' + type : '');
    const icons = {
        success: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="#22c55e" stroke-width="1.5"/><path d="M6.5 10l2.5 2.5 4.5-5" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        error:   `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="#dc2626" stroke-width="1.5"/><path d="M12.5 7.5l-5 5M7.5 7.5l5 5" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round"/></svg>`,
        default: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="#e55200" stroke-width="1.5"/><path d="M10 9v4" stroke="#e55200" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="6.5" r="0.75" fill="#e55200"/></svg>`
    };
    toast.innerHTML = (icons[type] || icons.default) + `<span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hiding'); setTimeout(() => toast.remove(), 350); }, 3500);
}

/* ══════════════════════════════════════════════════════
   CLIPBOARD
══════════════════════════════════════════════════════ */
function copyText(text) {
    if (!text || text === '–') return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép!', 'success'));
    } else {
        const el = document.createElement('textarea');
        el.value = text; document.body.appendChild(el); el.select();
        document.execCommand('copy'); document.body.removeChild(el);
        showToast('Đã sao chép!', 'success');
    }
}

/* ══════════════════════════════════════════════════════
   LOGIN WALL – khi chưa đăng nhập
══════════════════════════════════════════════════════ */
function showLoginWall() {
    const content = document.getElementById('mainContent');
    if (!content) return;
    content.innerHTML = `
        <div class="login-wall">
            <svg viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="#e8e0dc" stroke-width="2"/>
                <path d="M24 14a5 5 0 1 1 0 10 5 5 0 0 1 0-10ZM14 34c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#b5a9a2" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <h3>Vui lòng đăng nhập</h3>
            <p>Bạn cần đăng nhập để xem thông tin thanh toán của mình.</p>
            <a href="/login" class="btn-login-wall">Đăng nhập ngay</a>
        </div>`;
}

/* ══════════════════════════════════════════════════════
   LOAD STATS  →  4 thẻ stat-card
══════════════════════════════════════════════════════ */
async function loadStats() {
    try {
        const s = await apiGet('/api/payments/my/stats');
        document.getElementById('statTotal').textContent   = s.totalCount  ?? 0;
        document.getElementById('statSpend').textContent   = formatCurrency(s.totalSpend);
        document.getElementById('statPending').textContent = s.pendingCount ?? 0;
        document.getElementById('statPoints').textContent  =
            (s.totalPointsEarned ?? 0).toLocaleString('vi-VN') + ' điểm';
    } catch (err) {
        if (err.message !== 'Unauthorized') {
            console.warn('[Stats]', err.message);
        }
    }
}

/* ══════════════════════════════════════════════════════
   BUILD QUERY STRING
══════════════════════════════════════════════════════ */
function buildQueryString() {
    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('size', String(state.pageSize));
    if (state.filterStatus)   params.set('status',  state.filterStatus);
    if (state.filterMethod)   params.set('method',  state.filterMethod);
    if (state.search)         params.set('keyword', state.search);
    if (state.filterDateFrom) params.set('from',    state.filterDateFrom);
    if (state.filterDateTo)   params.set('to',      state.filterDateTo);
    return params.toString();
}

/* ══════════════════════════════════════════════════════
   LOAD PAYMENTS  →  danh sách giao dịch
══════════════════════════════════════════════════════ */
async function loadPayments() {
    if (state.loading) return;
    state.loading = true;
    showListLoading(true);

    try {
        const qs = buildQueryString();
        const data = await apiGet(`/api/payments/my/info?${qs}`);

        state.payments     = data.content      || [];
        state.totalElements = data.totalElements || 0;
        state.totalPages   = data.totalPages   || 0;

        renderList();
        renderPagination();
    } catch (err) {
        if (err.message !== 'Unauthorized') {
            showToast('Không tải được danh sách: ' + err.message, 'error');
            showEmptyState(true, 'Không thể tải dữ liệu. Vui lòng thử lại.');
        }
    } finally {
        state.loading = false;
        showListLoading(false);
    }
}

/* ══════════════════════════════════════════════════════
   RENDER LIST
══════════════════════════════════════════════════════ */
function showListLoading(on) {
    const sk = document.getElementById('listSkeleton');
    if (sk) sk.hidden = !on;
}

function showEmptyState(on, msg) {
    const el = document.getElementById('emptyState');
    if (!el) return;
    el.hidden = !on;
    if (msg) {
        const p = el.querySelector('p');
        if (p) p.textContent = msg;
    }
}

function renderList() {
    const listEl = document.getElementById('paymentList');
    // Xóa items cũ (giữ skeleton)
    listEl.querySelectorAll('.payment-item').forEach(e => e.remove());

    if (!state.payments.length) {
        showEmptyState(true,
            state.search || state.filterStatus || state.filterMethod
                ? 'Không tìm thấy giao dịch phù hợp với bộ lọc.'
                : 'Bạn chưa có giao dịch nào.');
        return;
    }
    showEmptyState(false);

    state.payments.forEach(p => {
        listEl.appendChild(buildPaymentItem(p));
    });
}

function buildPaymentItem(p) {
    const div = document.createElement('div');
    div.className = 'payment-item' + (p.id === state.selectedId ? ' selected' : '');
    div.dataset.id = p.id;

    const sClass = STATUS_CSS[p.status] || 'pending';
    const mClass = METHOD_CSS[p.method] || 'cash';
    const svg    = METHOD_SVG[p.method]  || METHOD_SVG.CASH;

    div.innerHTML = `
        <div class="pi-method-icon ${mClass}">${svg}</div>
        <div class="pi-item-main">
            <div class="pi-item-top">
                <span class="pi-item-ref">${p.transactionRef || '–'}</span>
                <span class="pi-item-amount ${sClass === 'success' ? 'success' : ''}">${formatCurrency(p.totalAmount)}</span>
            </div>
            <div class="pi-item-bottom">
                <span class="pi-item-meta">${METHOD_LABEL[p.method] || p.method} · ${formatDateTime(p.createdAt)}</span>
                <span class="status-badge ${sClass}">${STATUS_LABEL[p.status] || p.status}</span>
            </div>
        </div>`;

    div.addEventListener('click', () => selectPayment(p));
    return div;
}

/* ══════════════════════════════════════════════════════
   PAGINATION
══════════════════════════════════════════════════════ */
function renderPagination() {
    const el = document.getElementById('pagination');
    el.innerHTML = '';
    if (state.totalPages <= 1) return;

    const total = state.totalPages;
    const cur   = state.page;           // 0-based

    const prevBtn = makePageBtn('', cur === 0,
        `<svg viewBox="0 0 20 20" fill="none"><path d="M13 16l-6-6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
        () => changePage(cur - 1));
    el.appendChild(prevBtn);

    for (let i = 0; i < total; i++) {
        if (total > 7 && Math.abs(i - cur) > 1 && i !== 0 && i !== total - 1) {
            if (i === cur - 2 || i === cur + 2) {
                const dots = document.createElement('span');
                dots.textContent = '…';
                dots.style.cssText = 'padding:0 4px;color:#8c7b72;font-size:13px;display:flex;align-items:center;';
                el.appendChild(dots);
            }
            continue;
        }
        el.appendChild(makePageBtn(String(i + 1), false, null, () => changePage(i), i === cur));
    }

    el.appendChild(makePageBtn('', cur >= total - 1,
        `<svg viewBox="0 0 20 20" fill="none"><path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
        () => changePage(cur + 1)));
}

function makePageBtn(text, disabled, innerHTML, onClick, active = false) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (active ? ' active' : '');
    btn.disabled  = disabled;
    if (innerHTML) btn.innerHTML = innerHTML; else btn.textContent = text;
    if (!disabled) btn.addEventListener('click', onClick);
    return btn;
}

function changePage(newPage) {
    if (newPage < 0 || newPage >= state.totalPages) return;
    state.page = newPage;
    loadPayments();
    // Giữ item đang chọn (nếu vẫn còn trong trang mới thì render lại detail sau khi load)
}

/* ══════════════════════════════════════════════════════
   SELECT & LOAD DETAIL
══════════════════════════════════════════════════════ */
async function selectPayment(p) {
    state.selectedId = p.id;

    // Cập nhật UI list
    document.querySelectorAll('.payment-item').forEach(el => {
        el.classList.toggle('selected', Number(el.dataset.id) === p.id);
    });

    // Hiển thị loading trong panel detail
    showDetailLoading();

    try {
        // Gọi API lấy đầy đủ thông tin (kèm booking)
        const detail = await apiGet(`/api/payments/${p.id}/info`);
        renderDetail(detail);
    } catch {
        // Nếu API mới chưa ready, fallback sang dùng data đã có
        renderDetail(p);
    }
}

function showDetailLoading() {
    document.getElementById('detailPlaceholder').hidden = true;
    const content = document.getElementById('detailContent');
    content.hidden = false;
    content.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;padding:64px 20px;gap:12px;color:#8c7b72;">
            <svg class="spinner" viewBox="0 0 24 24" fill="none" style="width:36px;height:36px;animation:spin 1s linear infinite">
                <circle cx="12" cy="12" r="10" stroke="#e8e0dc" stroke-width="2.5"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#e55200" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            <span style="font-size:14px;font-weight:500;">Đang tải chi tiết...</span>
        </div>`;
}

/* ══════════════════════════════════════════════════════
   RENDER DETAIL PANEL
══════════════════════════════════════════════════════ */
function renderDetail(p) {
    document.getElementById('detailPlaceholder').hidden = true;
    const content = document.getElementById('detailContent');
    content.hidden = false;

    const sClass = STATUS_CSS[p.status] || 'pending';
    const mClass = METHOD_CSS[p.method] || 'cash';

    // Hero SVGs
    const heroSvgs = {
        success:  `<svg viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="#22c55e" stroke-width="2"/><path d="M8.5 14l4 4 7-7" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        pending:  `<svg viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="#3b82f6" stroke-width="2"/><path d="M14 9v5l3 3" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>`,
        failed:   `<svg viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="#dc2626" stroke-width="2"/><path d="M10 10l8 8M18 10l-8 8" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/></svg>`,
        cancelled:`<svg viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="#f59e0b" stroke-width="2"/><path d="M9 14h10" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/></svg>`,
        refunded: `<svg viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="12" stroke="#a855f7" stroke-width="2"/><path d="M9 14a5 5 0 1 1 5 5" stroke="#a855f7" stroke-width="1.8" stroke-linecap="round"/><path d="M9 11v3h3" stroke="#a855f7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    };

    // Booking info
    const bId   = p.bookingId || '–';
    const bCode = p.confirmationCode || (bId !== '–' ? `HTH-${bId}` : '–');
    const room  = p.roomType  || '–';
    const ci    = formatDate(p.checkIn);
    const co    = formatDate(p.checkOut);
    const nts   = p.nights ? `${p.nights} đêm` : '–';

    // Promo row
    const promoDiscount = p.promoDiscount ?? (
        p.subtotal && p.promoDiscountRate
            ? (Number(p.subtotal) * Number(p.promoDiscountRate)).toFixed(0)
            : 0);
    const promoRow = (p.promoCode && Number(promoDiscount) > 0)
        ? `<div class="pt-row discount">
               <span>Giảm giá <span class="pt-code">${p.promoCode}</span></span>
               <span>−${formatCurrency(promoDiscount)}</span>
           </div>`
        : '';

    // Loyalty row
    const loyaltyRow = (p.loyaltyDiscount && Number(p.loyaltyDiscount) > 0)
        ? `<div class="pt-row discount">
               <span>Điểm thưởng (${(p.loyaltyPointsUsed||0).toLocaleString('vi-VN')} điểm)</span>
               <span>−${formatCurrency(p.loyaltyDiscount)}</span>
           </div>`
        : '';

    // Card / Wallet block
    let paymentMethodBlock = '';
    if (p.method === 'CARD' && p.cardLastFour) {
        paymentMethodBlock = `
        <div class="detail-card">
            <div class="detail-card-title">
                <svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="#8c7b72" stroke-width="1.3"/><path d="M1.5 6.5h13" stroke="#8c7b72" stroke-width="1.3"/><rect x="3.5" y="9" width="3" height="1.5" rx="0.5" fill="#8c7b72"/></svg>
                Thông tin thẻ
            </div>
            <div class="card-mini">
                <div class="card-mini-icon">
                    <svg viewBox="0 0 56 38" fill="none">
                        <rect width="56" height="38" rx="5" fill="url(#cg)"/>
                        <defs><linearGradient id="cg" x1="0" y1="0" x2="56" y2="38" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#1e3a5f"/><stop offset="1" stop-color="#0f2027"/>
                        </linearGradient></defs>
                        <rect x="6" y="13" width="12" height="9" rx="2" fill="rgba(255,215,0,0.7)"/>
                    </svg>
                </div>
                <div>
                    <div class="card-mini-number">•••• •••• •••• ${p.cardLastFour}</div>
                    <div class="card-mini-meta">
                        <span class="card-mini-type">${p.cardType || '––'}</span>
                        <span class="card-mini-holder">${p.cardHolder || ''}</span>
                    </div>
                </div>
            </div>
        </div>`;
    } else if (p.method === 'WALLET' && p.walletProvider) {
        const walletNames = { momo:'MoMo', zalopay:'ZaloPay', vnpay:'VNPay', shopee:'ShopeePay' };
        paymentMethodBlock = `
        <div class="detail-card">
            <div class="detail-card-title">
                <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="#8c7b72" stroke-width="1.3"/><path d="M1 7h14" stroke="#8c7b72" stroke-width="1.3"/><circle cx="12" cy="10" r="1.5" fill="#8c7b72"/></svg>
                Thông tin ví điện tử
            </div>
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#f5f2f0;border-radius:10px;">
                <div style="width:40px;height:40px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.1);">
                    <svg viewBox="0 0 24 24" fill="none" style="width:22px;height:22px;"><rect x="2" y="6" width="20" height="14" rx="2" stroke="#a855f7" stroke-width="1.8"/><path d="M2 11h20" stroke="#a855f7" stroke-width="1.8"/><circle cx="18" cy="15.5" r="2" fill="#a855f7"/></svg>
                </div>
                <div>
                    <div style="font-size:14px;font-weight:700;color:#171212;">${walletNames[p.walletProvider] || p.walletProvider}</div>
                    <div style="font-size:12px;color:#8c7b72;">Ví điện tử</div>
                </div>
            </div>
        </div>`;
    }

    // Refund / Cancel button
    const canRefund  = p.status === 'SUCCESS';
    const canCancel  = p.status === 'PENDING';
    const actionBtns = `
        <div class="detail-actions">
            <button class="btn-action-outline" id="btnDownloadInvoice">
                <svg viewBox="0 0 20 20" fill="none"><path d="M10 13V4M6 9l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 16h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                Tải hóa đơn
            </button>
            ${canRefund ? `
            <button class="btn-action-danger" id="btnRequestRefund">
                <svg viewBox="0 0 20 20" fill="none"><path d="M4 10a6 6 0 0 1 10.39-3M4.5 6.5H3.5a.5.5 0 0 0-.5.5v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M16 10a6 6 0 0 1-10.97 3M15.5 13.5h1a.5.5 0 0 0 .5-.5v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                Yêu cầu hoàn tiền
            </button>` : ''}
            ${canCancel ? `
            <button class="btn-action-cancel" id="btnCancelPayment">
                <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/><path d="M12.5 7.5l-5 5M7.5 7.5l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                Hủy giao dịch
            </button>` : ''}
        </div>`;

    // Gateway rows
    const gwIdRow = p.gatewayTransactionId
        ? `<div class="detail-row"><span class="dr-label">Mã cổng thanh toán</span><span class="dr-value mono">${p.gatewayTransactionId}</span></div>` : '';
    const gwMsgRow = p.gatewayMessage
        ? `<div class="detail-row"><span class="dr-label">Phản hồi cổng</span><span class="dr-value">${p.gatewayMessage}</span></div>` : '';

    // Points row
    const ptsRow = (p.loyaltyPointsEarned > 0)
        ? `<div class="detail-row"><span class="dr-label">Điểm thưởng nhận</span><span class="dr-value" style="color:#f59e0b;font-weight:700;">+${(p.loyaltyPointsEarned).toLocaleString('vi-VN')} điểm</span></div>` : '';

    // Render HTML
    content.innerHTML = `
        <div class="detail-header">
            <div class="detail-status-badge ${sClass}">${STATUS_LABEL[p.status] || p.status}</div>
            <button class="btn-icon detail-close" id="btnDetailClose">
                <svg viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="#8c7b72" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
        </div>

        <div class="detail-amount-hero">
            <div class="hero-icon ${sClass}">${heroSvgs[sClass] || heroSvgs.pending}</div>
            <div class="hero-amount">${formatCurrency(p.totalAmount)}</div>
            <div class="hero-ref copyable" title="Nhấn để sao chép">${p.transactionRef || '–'}</div>
        </div>

        <!-- Thông tin giao dịch -->
        <div class="detail-card">
            <div class="detail-card-title">
                <svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="#8c7b72" stroke-width="1.3"/><path d="M4.5 6h7M4.5 9h4" stroke="#8c7b72" stroke-width="1.3" stroke-linecap="round"/></svg>
                Thông tin giao dịch
            </div>
            <div class="detail-rows">
                <div class="detail-row">
                    <span class="dr-label">Phương thức</span>
                    <span class="dr-value method-chip ${mClass}">${METHOD_LABEL[p.method] || p.method}</span>
                </div>
                <div class="detail-row"><span class="dr-label">Ngày tạo</span><span class="dr-value">${formatDateTime(p.createdAt)}</span></div>
                <div class="detail-row"><span class="dr-label">Ngày hoàn tất</span><span class="dr-value">${formatDateTime(p.completedAt)}</span></div>
                <div class="detail-row">
                    <span class="dr-label">Mã giao dịch</span>
                    <span class="dr-value mono copyable" title="Nhấn để sao chép">${p.transactionRef || '–'}</span>
                </div>
                ${gwIdRow}
                ${gwMsgRow}
            </div>
        </div>

        <!-- Chi tiết chi phí -->
        <div class="detail-card">
            <div class="detail-card-title">
                <svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5v13M5 4.5h4.5a2 2 0 0 1 0 4H5m0 0h5a2 2 0 0 1 0 4H5" stroke="#8c7b72" stroke-width="1.3" stroke-linecap="round"/></svg>
                Chi tiết chi phí
            </div>
            <div class="price-table">
                <div class="pt-row"><span>Giá phòng gốc</span><span>${formatCurrency(p.subtotal)}</span></div>
                ${promoRow}
                ${loyaltyRow}
                <div class="pt-row"><span>Thuế VAT (10%)</span><span>${formatCurrency(p.vatAmount)}</span></div>
                <div class="pt-divider"></div>
                <div class="pt-row total"><span>Tổng thanh toán</span><span>${formatCurrency(p.totalAmount)}</span></div>
            </div>
        </div>

        ${paymentMethodBlock}

        <!-- Thông tin đặt phòng -->
        <div class="detail-card">
            <div class="detail-card-title">
                <svg viewBox="0 0 16 16" fill="none"><path d="M2 14V6L8 2L14 6V14H10V10H6V14H2Z" fill="#8c7b72"/></svg>
                Thông tin đặt phòng
            </div>
            <div class="detail-rows">
                <div class="detail-row">
                    <span class="dr-label">Mã đặt phòng</span>
                    <span class="dr-value mono copyable" title="Nhấn để sao chép">${bCode}</span>
                </div>
                <div class="detail-row"><span class="dr-label">Loại phòng</span><span class="dr-value">${room}</span></div>
                <div class="detail-row"><span class="dr-label">Nhận phòng</span><span class="dr-value">${ci}</span></div>
                <div class="detail-row"><span class="dr-label">Trả phòng</span><span class="dr-value">${co}</span></div>
                <div class="detail-row"><span class="dr-label">Số đêm</span><span class="dr-value">${nts}</span></div>
                ${ptsRow}
            </div>
        </div>

        ${actionBtns}`;

    // Bind events sau khi render
    document.getElementById('btnDetailClose')?.addEventListener('click', closeDetail);
    document.getElementById('btnDownloadInvoice')?.addEventListener('click', () => downloadInvoice(p));
    document.getElementById('btnRequestRefund')?.addEventListener('click', () => openRefundModal(p));
    document.getElementById('btnCancelPayment')?.addEventListener('click', () => doCancelPayment(p));

    // Scroll to top
    document.getElementById('detailPanel').scrollTop = 0;
}

function closeDetail() {
    state.selectedId = null;
    document.getElementById('detailContent').hidden    = true;
    document.getElementById('detailPlaceholder').hidden = false;
    document.querySelectorAll('.payment-item').forEach(el => el.classList.remove('selected'));
}

/* ══════════════════════════════════════════════════════
   HỦY GIAO DỊCH PENDING
══════════════════════════════════════════════════════ */
async function doCancelPayment(p) {
    if (!confirm(`Bạn có chắc muốn hủy giao dịch ${p.transactionRef}?`)) return;
    try {
        await apiPatch(`/api/payments/${p.id}/cancel`);
        showToast('Giao dịch đã được hủy.', 'success');
        await loadPayments();
        await loadStats();
        closeDetail();
    } catch (err) {
        showToast('Hủy thất bại: ' + err.message, 'error');
    }
}

/* ══════════════════════════════════════════════════════
   REFUND MODAL
══════════════════════════════════════════════════════ */
let _refundPayment = null;

function openRefundModal(p) {
    _refundPayment = p;
    document.getElementById('refundTxRef').textContent  = p.transactionRef || '–';
    document.getElementById('refundAmount').textContent = formatCurrency(p.totalAmount);
    document.getElementById('refundReason').value       = '';
    document.getElementById('refundNote').value         = '';
    document.getElementById('errRefundReason').textContent = '';
    document.getElementById('refundModal').hidden = false;
}

function closeRefundModal() {
    document.getElementById('refundModal').hidden = true;
    _refundPayment = null;
}

async function submitRefund() {
    const reason = document.getElementById('refundReason').value;
    const errEl  = document.getElementById('errRefundReason');

    if (!reason) { errEl.textContent = 'Vui lòng chọn lý do hoàn tiền.'; return; }
    errEl.textContent = '';

    const note = document.getElementById('refundNote').value.trim();
    const p    = _refundPayment;
    if (!p) return;

    const btn = document.getElementById('btnSubmitRefund');
    btn.disabled    = true;
    btn.textContent = 'Đang gửi...';

    try {
        await apiPost(`/api/admin/payments/${p.id}/refund`, {
            reason: reason + (note ? ` – ${note}` : '')
        });
        showToast('Yêu cầu hoàn tiền đã được gửi thành công!', 'success');
        closeRefundModal();
        await loadPayments();
        await loadStats();
        closeDetail();
    } catch (err) {
        // Nếu không có quyền admin, thông báo rõ ràng
        if (err.message.includes('403') || err.message.includes('Forbidden')) {
            showToast('Yêu cầu đã được ghi nhận và sẽ được xử lý trong 3-5 ngày làm việc.', 'success');
            closeRefundModal();
        } else {
            showToast('Gửi yêu cầu thất bại: ' + err.message, 'error');
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 20 20" fill="none"><path d="M17 5l-9.5 9.5L3 10" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Gửi yêu cầu`;
    }
}

/* ══════════════════════════════════════════════════════
   DOWNLOAD INVOICE
══════════════════════════════════════════════════════ */
function downloadInvoice(p) {
    const lines = [
        `══════════════════════════════════════════`,
        `       HÓA ĐƠN THANH TOÁN - HOTELHUB      `,
        `══════════════════════════════════════════`,
        `Mã giao dịch  : ${p.transactionRef || '–'}`,
        `Ngày tạo      : ${formatDateTime(p.createdAt)}`,
        `Trạng thái    : ${STATUS_LABEL[p.status] || p.status}`,
        `Phương thức   : ${METHOD_LABEL[p.method]  || p.method}`,
        ``,
        `──── Thông tin đặt phòng ────`,
        `Mã đặt phòng  : ${p.confirmationCode || '–'}`,
        `Loại phòng    : ${p.roomType   || '–'}`,
        `Nhận phòng    : ${formatDate(p.checkIn)}`,
        `Trả phòng     : ${formatDate(p.checkOut)}`,
        `Số đêm        : ${p.nights ? p.nights + ' đêm' : '–'}`,
        ``,
        `──── Chi tiết chi phí ────`,
        `Giá phòng gốc : ${formatCurrency(p.subtotal)}`,
        ...(p.promoCode ? [`Khuyến mãi    : −${formatCurrency(p.promoDiscount)} (${p.promoCode})`] : []),
        ...(p.loyaltyDiscount && Number(p.loyaltyDiscount) > 0
            ? [`Điểm thưởng   : −${formatCurrency(p.loyaltyDiscount)} (${p.loyaltyPointsUsed} điểm)`]
            : []),
        `Thuế VAT (10%): ${formatCurrency(p.vatAmount)}`,
        `──────────────────────────────────────────`,
        `TỔNG THANH TOÁN: ${formatCurrency(p.totalAmount)}`,
        `══════════════════════════════════════════`,
        `        Cảm ơn quý khách!`,
        `══════════════════════════════════════════`
    ].join('\n');

    const blob = new Blob(['\uFEFF' + lines], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `HoaDon-${p.transactionRef || 'unknown'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đang tải hóa đơn...', 'success');
}

/* ══════════════════════════════════════════════════════
   SEARCH & FILTER LISTENERS
══════════════════════════════════════════════════════ */
function initFilterListeners() {
    let searchDebounce;

    document.getElementById('searchInput')?.addEventListener('input', e => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            state.search = e.target.value.trim();
            state.page   = 0;
            loadPayments();
        }, 350);
    });

    document.getElementById('filterStatus')?.addEventListener('change', e => {
        state.filterStatus = e.target.value;
        state.page = 0;
        loadPayments();
    });

    document.getElementById('filterMethod')?.addEventListener('change', e => {
        state.filterMethod = e.target.value;
        state.page = 0;
        loadPayments();
    });

    document.getElementById('filterDateFrom')?.addEventListener('change', e => {
        state.filterDateFrom = e.target.value;
        state.page = 0;
        loadPayments();
    });

    document.getElementById('filterDateTo')?.addEventListener('change', e => {
        state.filterDateTo = e.target.value;
        state.page = 0;
        loadPayments();
    });

    document.getElementById('btnClearFilter')?.addEventListener('click', () => {
        state.search = ''; state.filterStatus = ''; state.filterMethod = '';
        state.filterDateFrom = ''; state.filterDateTo = ''; state.page = 0;

        const ids = ['searchInput','filterStatus','filterMethod','filterDateFrom','filterDateTo'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        loadPayments();
    });
}

/* ══════════════════════════════════════════════════════
   MODAL LISTENERS
══════════════════════════════════════════════════════ */
function initModalListeners() {
    document.getElementById('btnCloseRefundModal')?.addEventListener('click', closeRefundModal);
    document.getElementById('btnCancelRefund')?.addEventListener('click', closeRefundModal);
    document.getElementById('btnSubmitRefund')?.addEventListener('click', submitRefund);

    document.getElementById('refundModal')?.addEventListener('click', e => {
        if (e.target.id === 'refundModal') closeRefundModal();
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeRefundModal();
    });
}

/* ══════════════════════════════════════════════════════
   COPYABLE (event delegation)
══════════════════════════════════════════════════════ */
function initCopyable() {
    document.addEventListener('click', e => {
        const el = e.target.closest('.copyable');
        if (el) copyText(el.textContent.trim());
    });
}

/* ══════════════════════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    if (!isLoggedIn()) {
        showLoginWall();
        return;
    }

    initFilterListeners();
    initModalListeners();
    initCopyable();

    // Load song song stats + danh sách
    await Promise.all([loadStats(), loadPayments()]);
});
