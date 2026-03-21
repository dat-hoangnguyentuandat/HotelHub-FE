/**
 * payment.js  –  HotelHub Thanh Toán Trực Tuyến
 * Handles: tabs, card input formatting, countdown timer,
 *          promo codes, loyalty points, form validation,
 *          processing overlay, success modal, toast.
 *
 * Backend API  (port 8081):
 *   POST /api/payments/initiate          → tạo phiên thanh toán
 *   POST /api/payments/:id/process       → xác nhận thanh toán
 *   POST /api/payments/promo/validate    → kiểm tra mã promo
 *   GET  /api/payments/:id               → lấy chi tiết giao dịch
 *   PATCH /api/payments/:id/cancel       → hủy phiên
 */

'use strict';

/* ═══════════════════════════════════════
   API CONFIG
═══════════════════════════════════════ */
const API_BASE = 'http://localhost:8081/api';

async function apiPost(path, body) {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(API_BASE + path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, data };
    return data;
}

async function apiGet(path) {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(API_BASE + path, {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, data };
    return data;
}

async function apiPatch(path, body = {}) {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(API_BASE + path, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, data };
    return data;
}

/* ═══════════════════════════════════════
   STATE
═══════════════════════════════════════ */
const state = {
    method: 'card',
    promo: null,          // { code, discountRate, label }
    usePoints: false,
    baseAmount: 0,
    vatRate: 0.10,
    timerSec: 14 * 60 + 59,
    timerInterval: null,
    currentPaymentId: null,  // ID từ backend sau bước initiate
    booking: {
        roomName: 'Phòng Deluxe',
        roomBadge: 'Phổ biến',
        roomImg: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80',
        checkin: '20-03-2026',
        checkout: '22-03-2026',
        nights: 2,
        adults: 2,
        children: 1,
        rooms: 1,
        pricePerNight: 500000,
        bookingId: null,     // Lấy từ URL param hoặc sessionStorage
        guestName: '',
        guestPhone: '',
        guestEmail: '',
    },
    loyaltyPoints: 0,    // Fetch từ /api/loyalty/me khi user đăng nhập
    loyaltyValue: 0,     // 1 điểm = 100 VND
};

/* ═══════════════════════════════════════
   DOM REFS
═══════════════════════════════════════ */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    loadBookingFromSession();
    initSummary();
    initTabs();
    initCardForm();
    initWallet();
    initPromo();
    initLoyalty();
    initPayButton();
    startTimer();
    initCvvHelp();
});

/* ═══════════════════════════════════════
   LOAD BOOKING DATA
═══════════════════════════════════════ */
function loadBookingFromSession() {
    // Lấy bookingId từ URL: /payment?bookingId=123
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('bookingId');
    if (bookingId) state.booking.bookingId = parseInt(bookingId);

    // Lấy dữ liệu đặt phòng từ sessionStorage (booking.js đã lưu)
    const saved = sessionStorage.getItem('pendingBooking');
    if (saved) {
        try {
            const b = JSON.parse(saved);
            Object.assign(state.booking, b);
            state.booking.baseAmount = b.pricePerNight * b.nights * b.rooms;
        } catch (e) { /* ignore */ }
    }
}

/* ═══════════════════════════════════════
   SUMMARY
═══════════════════════════════════════ */
function initSummary() {
    const b = state.booking;
    if ($('summaryRoomName')) $('summaryRoomName').textContent = b.roomName || '–';
    if ($('summaryRoomBadge')) $('summaryRoomBadge').textContent = b.roomBadge || '';
    if ($('summaryRoomImg') && b.roomImg) $('summaryRoomImg').src = b.roomImg;

    if ($('summaryCheckin'))  $('summaryCheckin').textContent  = b.checkin  || '–';
    if ($('summaryCheckout')) $('summaryCheckout').textContent = b.checkout || '–';
    if ($('summaryNights'))   $('summaryNights').textContent   = `${b.nights} đêm`;
    if ($('summaryGuests'))   $('summaryGuests').textContent   =
        `${b.adults} người lớn${b.children ? `, ${b.children} trẻ em` : ''}`;
    if ($('summaryRooms')) $('summaryRooms').textContent = `${b.rooms} phòng`;

    if ($('recapName'))  $('recapName').textContent  = b.guestName  || '–';
    if ($('recapPhone')) $('recapPhone').textContent = b.guestPhone || '–';
    if ($('recapEmail')) $('recapEmail').textContent = b.guestEmail || '–';

    state.baseAmount = (b.pricePerNight || 0) * (b.nights || 1) * (b.rooms || 1);
    renderPrices();

    const txnRef = `HTH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random()*9999)+1).padStart(4,'0')}`;
    if ($('qrRef'))       $('qrRef').textContent       = txnRef;
    if ($('bookingCode')) $('bookingCode').textContent  = txnRef;

    if ($('loyaltyPoints')) {
        $('loyaltyPoints').textContent =
            `${state.loyaltyPoints.toLocaleString('vi-VN')} điểm = ${fmt(state.loyaltyValue)}`;
    }
}

function renderPrices() {
    const b = state.booking;
    let subtotal = state.baseAmount;

    let discount = 0;
    if (state.promo) {
        discount = Math.round(subtotal * state.promo.discountRate);
        if ($('rowDiscount')) $('rowDiscount').style.display = 'flex';
        if ($('priceDiscount')) $('priceDiscount').textContent = `−${fmt(discount)}`;
        subtotal -= discount;
    } else {
        if ($('rowDiscount')) $('rowDiscount').style.display = 'none';
    }

    let pointsDeduct = 0;
    if (state.usePoints) {
        pointsDeduct = Math.min(state.loyaltyValue, subtotal);
        subtotal -= pointsDeduct;
    }

    const vat   = Math.round(subtotal * state.vatRate);
    const total = subtotal + vat;

    if ($('pricePer'))    $('pricePer').textContent    = `${fmt(b.pricePerNight || 0)} × ${b.nights || 1} đêm`;
    if ($('priceVat'))    $('priceVat').textContent    = fmt(vat);
    if ($('totalAmount')) $('totalAmount').textContent = fmt(total);
    if ($('qrAmount'))    $('qrAmount').textContent    = fmt(total);
    if ($('btnPayAmount')) $('btnPayAmount').textContent = fmt(total);
    if ($('sucTotal'))    $('sucTotal').textContent    = fmt(total);
    if ($('sucRoom'))     $('sucRoom').textContent     = b.roomName  || '–';
    if ($('sucCheckin'))  $('sucCheckin').textContent  = b.checkin   || '–';
    if ($('sucCheckout')) $('sucCheckout').textContent = b.checkout  || '–';
}

function fmt(n) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

/* ═══════════════════════════════════════
   TABS
═══════════════════════════════════════ */
function initTabs() {
    $$('.method-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const method = btn.dataset.method;
            state.method = method;
            $$('.method-tab').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            $$('.method-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById(`panel${capitalize(method)}`);
            if (panel) panel.classList.add('active');
            updatePayBtnLabel();
        });
    });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function updatePayBtnLabel() {
    const labels = {
        card: 'Xác nhận thanh toán',
        qr: 'Đã thanh toán QR',
        wallet: 'Tiếp tục với ví',
        cash: 'Xác nhận đặt phòng',
    };
    if ($('btnPayText')) $('btnPayText').textContent = labels[state.method] || 'Xác nhận thanh toán';
}

/* ═══════════════════════════════════════
   CARD FORM
═══════════════════════════════════════ */
function initCardForm() {
    const numInput    = $('cardNumber');
    const holderInput = $('cardHolder');
    const expiryInput = $('cardExpiry');
    const cvvInput    = $('cardCvv');
    if (!numInput) return;

    numInput.addEventListener('input', () => {
        let v = numInput.value.replace(/\D/g,'').slice(0,16);
        numInput.value = v.replace(/(.{4})/g,'$1 ').trim();
        if ($('cardNumberDisplay')) $('cardNumberDisplay').textContent = formatDisplay(v, '•••• •••• •••• ••••', 4);
        detectCardType(v);
        clearError('errCardNumber');
    });

    holderInput.addEventListener('input', () => {
        const v = holderInput.value.toUpperCase();
        holderInput.value = v;
        if ($('cardHolderDisplay')) $('cardHolderDisplay').textContent = v || 'HỌ VÀ TÊN';
        clearError('errCardHolder');
    });

    expiryInput.addEventListener('input', () => {
        let v = expiryInput.value.replace(/\D/g,'').slice(0,4);
        if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
        expiryInput.value = v;
        if ($('cardExpiryDisplay')) $('cardExpiryDisplay').textContent = v || 'MM/YY';
        clearError('errCardExpiry');
    });

    cvvInput.addEventListener('input', () => clearError('errCardCvv'));
}

function formatDisplay(raw, template) {
    if (!raw) return template;
    let display = '';
    let idx = 0;
    for (let ch of template) {
        display += ch === '•' ? (idx < raw.length ? raw[idx++] : '•') : ch;
    }
    return display;
}

function detectCardType(digits) {
    const badge = $('cardTypeBadge');
    if (!badge) return;
    if (digits.startsWith('4')) {
        badge.textContent = 'VISA';
        $$('.card-logo').forEach(l => l.classList.remove('selected'));
        document.querySelector('[data-type="visa"]')?.classList.add('selected');
    } else if (digits.startsWith('5') || digits.startsWith('2')) {
        badge.textContent = 'MC';
        $$('.card-logo').forEach(l => l.classList.remove('selected'));
        document.querySelector('[data-type="mastercard"]')?.classList.add('selected');
    } else if (digits.startsWith('35')) {
        badge.textContent = 'JCB';
        $$('.card-logo').forEach(l => l.classList.remove('selected'));
        document.querySelector('[data-type="jcb"]')?.classList.add('selected');
    } else if (digits.startsWith('9')) {
        badge.textContent = 'NAPAS';
        $$('.card-logo').forEach(l => l.classList.remove('selected'));
        document.querySelector('[data-type="napas"]')?.classList.add('selected');
    } else {
        badge.textContent = '';
        $$('.card-logo').forEach(l => l.classList.remove('selected'));
    }
}

function initCvvHelp() {
    const btn = $('cvvHelpBtn');
    const tip = $('cvvTooltip');
    if (!btn || !tip) return;
    btn.addEventListener('click', () => { tip.hidden = !tip.hidden; });
    document.addEventListener('click', e => { if (!btn.contains(e.target)) tip.hidden = true; });
}

/* ═══════════════════════════════════════
   WALLET
═══════════════════════════════════════ */
function initWallet() {
    $$('.wallet-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            const labels = { momo: 'MoMo', zalopay: 'ZaloPay', vnpay: 'VNPay', shopee: 'ShopeePay' };
            if ($('selectedWalletName')) $('selectedWalletName').textContent = labels[radio.value] || radio.value;
            if ($('walletRedirectInfo')) $('walletRedirectInfo').hidden = false;
        });
    });

    $('btnRefreshQr')?.addEventListener('click', () => {
        const newRef = `HTH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random()*9999)+1).padStart(4,'0')}`;
        if ($('qrRef')) $('qrRef').textContent = newRef;
        state.timerSec = 14 * 60 + 59;
        showToast('Mã QR mới đã được tạo.', 'success');
    });
}

/* ═══════════════════════════════════════
   PROMO CODE  –  gọi backend
═══════════════════════════════════════ */
function initPromo() {
    $('btnPromo')?.addEventListener('click', applyPromo);
    $('promoInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') applyPromo(); });
}

async function applyPromo() {
    const code = $('promoInput')?.value.trim().toUpperCase();
    const msg  = $('promoMsg');
    if (!code) {
        if (msg) { msg.textContent = 'Vui lòng nhập mã khuyến mãi.'; msg.className = 'promo-msg error'; }
        return;
    }

    try {
        const result = await apiPost('/payments/promo/validate', {
            code,
            bookingId: state.booking.bookingId || null,
        });

        if (result.valid) {
            state.promo = { code, discountRate: result.discountRate, label: result.label };
            if (msg) { msg.textContent = `✓ ${result.message}`; msg.className = 'promo-msg success'; }
            if ($('promoInput')) $('promoInput').disabled = true;
            if ($('btnPromo'))   { $('btnPromo').textContent = 'Xóa'; $('btnPromo').onclick = removePromo; }
            renderPrices();
            showToast(`Mã "${code}" đã được áp dụng!`, 'success');
        } else {
            if (msg) { msg.textContent = result.message; msg.className = 'promo-msg error'; }
        }
    } catch (err) {
        if (msg) { msg.textContent = 'Không thể kiểm tra mã. Vui lòng thử lại.'; msg.className = 'promo-msg error'; }
        console.error('[Promo]', err);
    }
}

function removePromo() {
    state.promo = null;
    if ($('promoInput'))  { $('promoInput').value = ''; $('promoInput').disabled = false; }
    if ($('promoMsg'))    { $('promoMsg').textContent = ''; $('promoMsg').className = 'promo-msg'; }
    if ($('btnPromo'))    { $('btnPromo').textContent = 'Áp dụng'; $('btnPromo').onclick = applyPromo; }
    renderPrices();
}

/* ═══════════════════════════════════════
   LOYALTY
═══════════════════════════════════════ */
function initLoyalty() {
    // Fetch điểm loyalty thật từ API nếu user đã đăng nhập
    const token = localStorage.getItem('accessToken');
    if (token) {
        apiGet('/loyalty/me')
            .then(data => {
                state.loyaltyPoints = data.currentPoints || 0;
                state.loyaltyValue  = state.loyaltyPoints * 100; // 1 điểm = 100 VND
                const el = $('loyaltyPoints');
                if (el) {
                    el.textContent = `${state.loyaltyPoints.toLocaleString('vi-VN')} điểm = ${fmt(state.loyaltyValue)}`;
                }
            })
            .catch(() => {
                // Không fetch được → ẩn section điểm thưởng
                state.loyaltyPoints = 0;
                state.loyaltyValue  = 0;
                const section = document.querySelector('.loyalty-section');
                if (section) section.style.display = 'none';
            });
    } else {
        // Chưa đăng nhập → ẩn phần điểm thưởng
        state.loyaltyPoints = 0;
        state.loyaltyValue  = 0;
        const section = document.querySelector('.loyalty-section');
        if (section) section.style.display = 'none';
    }

    $('usePoints')?.addEventListener('change', e => {
        state.usePoints = e.target.checked;
        renderPrices();
        if (state.usePoints) showToast(`Đã dùng ${state.loyaltyPoints.toLocaleString('vi-VN')} điểm thưởng.`, 'success');
    });
}

/* ═══════════════════════════════════════
   COUNTDOWN TIMER
═══════════════════════════════════════ */
function startTimer() {
    renderTimer();
    state.timerInterval = setInterval(() => {
        state.timerSec--;
        if (state.timerSec <= 0) {
            clearInterval(state.timerInterval);
            if ($('countdownTimer')) $('countdownTimer').textContent = '00:00';
            if ($('qrExpire'))       $('qrExpire').textContent       = '00:00';
            const banner = $('timerBanner');
            if (banner) { banner.style.background = '#fef2f2'; banner.style.borderColor = '#fca5a5'; }
            showToast('Phiên thanh toán đã hết hạn. Vui lòng tải lại trang.', 'error');
            if ($('btnPay')) $('btnPay').disabled = true;
            // Hủy phiên thanh toán trên backend nếu đã initiate
            if (state.currentPaymentId) {
                apiPatch(`/payments/${state.currentPaymentId}/cancel`).catch(() => {});
            }
        } else {
            renderTimer();
        }
    }, 1000);
}

function renderTimer() {
    const m   = String(Math.floor(state.timerSec / 60)).padStart(2, '0');
    const s   = String(state.timerSec % 60).padStart(2, '0');
    const txt = `${m}:${s}`;
    if ($('countdownTimer')) $('countdownTimer').textContent = txt;
    if ($('qrExpire'))       $('qrExpire').textContent       = txt;
}

/* ═══════════════════════════════════════
   PAY BUTTON  –  gọi backend 2 bước
═══════════════════════════════════════ */
function initPayButton() {
    $('btnPay')?.addEventListener('click', handlePay);

    $('btnCopyCode')?.addEventListener('click', () => {
        const code = $('bookingCode')?.textContent;
        if (code) navigator.clipboard.writeText(code).then(() => showToast('Đã sao chép mã đặt phòng!', 'success'));
    });

    $('btnDownloadInvoice')?.addEventListener('click', () => showToast('Đang tải hóa đơn PDF…', 'success'));
}

async function handlePay() {
    if (!validate()) return;

    const btn = $('btnPay');
    if (btn) btn.disabled = true;

    try {
        showProcessingStep(0); // bắt đầu overlay

        // ── Bước 1: Initiate ──
        const payload = buildPaymentPayload();
        let initiateRes;
        try {
            initiateRes = await apiPost('/payments/initiate', payload);
        } catch (err) {
            hideProcessing();
            const msg = err.data?.message || 'Không thể khởi tạo phiên thanh toán.';
            showToast(msg, 'error');
            if (btn) btn.disabled = false;
            return;
        }

        state.currentPaymentId = initiateRes.id;
        if ($('bookingCode')) $('bookingCode').textContent = initiateRes.transactionRef || '–';
        if ($('qrRef'))       $('qrRef').textContent       = initiateRes.transactionRef || '–';

        // ── Bước 2: Process ──
        advanceProcessingStep(1);
        let processRes;
        try {
            processRes = await apiPost(`/payments/${state.currentPaymentId}/process`, {});
        } catch (err) {
            hideProcessing();
            const msg = err.data?.message || 'Thanh toán thất bại. Vui lòng thử lại.';
            showToast(msg, 'error');
            if (btn) btn.disabled = false;
            return;
        }

        advanceProcessingStep(2);

        // Cập nhật mã giao dịch thật từ backend
        if (processRes.transactionRef && $('bookingCode')) {
            $('bookingCode').textContent = processRes.transactionRef;
        }
        if (processRes.totalAmount && $('sucTotal')) {
            $('sucTotal').textContent = fmt(processRes.totalAmount);
        }

        setTimeout(() => {
            hideProcessing();
            showSuccess();
        }, 600);

    } catch (err) {
        hideProcessing();
        showToast('Đã xảy ra lỗi không mong đợi.', 'error');
        console.error('[Pay]', err);
        if (btn) btn.disabled = false;
    }
}

function buildPaymentPayload() {
    const b = state.booking;
    const payload = {
        bookingId: b.bookingId,
        method: state.method.toUpperCase(),
        promoCode: state.promo?.code || null,
        promoDiscountRate: state.promo?.discountRate || 0,
        loyaltyPointsUsed: state.usePoints ? state.loyaltyPoints : 0,
    };

    if (state.method === 'card') {
        const num = $('cardNumber')?.value.replace(/\s/g,'') || '';
        payload.cardLastFour = num.slice(-4);
        payload.cardType     = $('cardTypeBadge')?.textContent || null;
        payload.cardHolder   = $('cardHolder')?.value.trim() || null;
    }

    if (state.method === 'wallet') {
        const selected = document.querySelector('.wallet-radio:checked');
        payload.walletProvider = selected?.value || null;
    }

    return payload;
}

/* ── Validation ── */
function validate() {
    if (state.method !== 'card') return true;

    let ok = true;
    const num    = $('cardNumber')?.value.replace(/\s/g,'') || '';
    const holder = $('cardHolder')?.value.trim()  || '';
    const expiry = $('cardExpiry')?.value.trim()  || '';
    const cvv    = $('cardCvv')?.value.trim()     || '';

    if (num.length < 15 || num.length > 16) {
        showError('errCardNumber', $('cardNumber'), 'Số thẻ phải có 15–16 chữ số.');
        ok = false;
    }
    if (holder.length < 3) {
        showError('errCardHolder', $('cardHolder'), 'Vui lòng nhập tên chủ thẻ.');
        ok = false;
    }
    const ep = expiry.split('/');
    if (ep.length !== 2 || ep[0].length !== 2 || ep[1].length !== 2) {
        showError('errCardExpiry', $('cardExpiry'), 'Định dạng MM/YY không đúng.');
        ok = false;
    } else {
        const month = parseInt(ep[0]), year = parseInt('20' + ep[1]);
        const now = new Date();
        if (month < 1 || month > 12 || year < now.getFullYear() ||
            (year === now.getFullYear() && month < now.getMonth() + 1)) {
            showError('errCardExpiry', $('cardExpiry'), 'Thẻ đã hết hạn.');
            ok = false;
        }
    }
    if (cvv.length < 3) {
        showError('errCardCvv', $('cardCvv'), 'CVV phải có 3–4 chữ số.');
        ok = false;
    }
    return ok;
}

function showError(errId, input, msg) {
    if ($(errId)) $(errId).textContent = msg;
    if (input) { input.classList.add('is-invalid'); input.classList.remove('is-valid'); }
}

function clearError(errId) {
    if ($(errId)) $(errId).textContent = '';
}

/* ═══════════════════════════════════════
   PROCESSING OVERLAY
═══════════════════════════════════════ */
const PROC_STEPS = ['procStep1', 'procStep2', 'procStep3'];
let _procStepIdx = 0;
let _procInterval = null;

function showProcessingStep(idx) {
    const overlay = $('processingOverlay');
    if (!overlay) return;
    overlay.hidden = false;
    _procStepIdx = idx;
    PROC_STEPS.forEach(id => { $(id)?.classList.remove('done', 'active'); });
    $(PROC_STEPS[idx])?.classList.add('active');
}

function advanceProcessingStep(idx) {
    PROC_STEPS.slice(0, idx).forEach(id => {
        $(id)?.classList.remove('active');
        $(id)?.classList.add('done');
    });
    if (idx < PROC_STEPS.length) $(PROC_STEPS[idx])?.classList.add('active');
}

function hideProcessing() {
    const overlay = $('processingOverlay');
    if (overlay) {
        PROC_STEPS.forEach(id => {
            $(id)?.classList.remove('active');
            $(id)?.classList.add('done');
        });
        setTimeout(() => { overlay.hidden = true; }, 200);
    }
}

/* ═══════════════════════════════════════
   SUCCESS MODAL
═══════════════════════════════════════ */
function showSuccess() {
    clearInterval(state.timerInterval);
    renderPrices();
    const modal = $('successModal');
    if (modal) modal.hidden = false;
    // Xoá dữ liệu đặt phòng tạm sau khi thanh toán thành công
    sessionStorage.removeItem('pendingBooking');
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
function showToast(message, type = 'default') {
    const container = $('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.5"/><path d="M6.5 10l2.5 2.5 4.5-5" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        error:   `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/><path d="M10 6v5M10 13v1" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round"/></svg>`,
        default: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#fff7f3" stroke="#e55200" stroke-width="1.5"/><path d="M10 9v5M10 6.5v1" stroke="#e55200" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    };
    toast.innerHTML = `${icons[type] || icons.default}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

