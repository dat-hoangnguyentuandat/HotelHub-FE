/**
 * loyal-customers.js
 * Kết nối API backend /api/loyalty/* – HotelHub
 */

/* ─────────────────────────────────────────
   CẤU HÌNH
───────────────────────────────────────── */
const API_BASE = 'http://localhost:8081';   // Cổng backend Spring Boot

/** Lấy JWT token đã lưu sau khi đăng nhập */
function getToken() {
    return localStorage.getItem('accessToken') || '';
}

/** Wrapper fetch có Bearer token */
async function apiFetch(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
}

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
let currentAccount   = null;   // LoyaltyAccountResponse
let currentPage      = 0;
let isLastPage       = false;

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadMyAccount();
        initFilter();
        initRedeemModal();
    } catch (e) {
        console.error('Lỗi khởi tạo:', e);
        showGlobalError(e.message);
    }
});

/* ─────────────────────────────────────────
   LOAD TÀI KHOẢN LOYALTY CỦA BẢN THÂN
───────────────────────────────────────── */
async function loadMyAccount() {
    try {
        currentAccount = await apiFetch('/api/loyalty/me');
        renderHeroSection(currentAccount);
        highlightCurrentTier(currentAccount.tier);
        await loadTransactionHistory();
    } catch (e) {
        if (e.message.includes('401') || e.message.includes('403')) {
            window.location.href = '/login';
        } else {
            throw e;
        }
    }
}

/* ─────────────────────────────────────────
   RENDER HERO SECTION
───────────────────────────────────────── */
function renderHeroSection(acc) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('customerName', acc.userFullName);

    // Badge hạng
    const badgeEl = document.getElementById('membershipBadge');
    if (badgeEl) {
        badgeEl.textContent = acc.tierLabel;
        badgeEl.className   = `membership-badge ${acc.tier.toLowerCase()}`;
    }

    // Điểm
    set('currentPoints',  acc.currentPoints.toLocaleString('vi-VN'));
    set('pointsToUpgrade', acc.pointsToNextTier.toLocaleString('vi-VN'));

    // Progress bar
    const fillEl = document.getElementById('progressFill');
    if (fillEl) fillEl.style.width = `${acc.progressPercent}%`;

    const captionEl = document.getElementById('progressCaption');
    if (captionEl) {
        if (acc.nextTierName) {
            captionEl.innerHTML =
                `${acc.currentPoints.toLocaleString('vi-VN')} / ${acc.nextThreshold.toLocaleString('vi-VN')} điểm để lên <strong>${acc.nextTierName}</strong>`;
        } else {
            captionEl.innerHTML = `🎉 Bạn đang ở hạng <strong>Platinum</strong> – hạng cao nhất!`;
        }
    }

    // Quyền lợi
    const benefitsEl = document.getElementById('benefitsList');
    if (benefitsEl && acc.benefits) {
        benefitsEl.innerHTML = acc.benefits
            .map(b => `<span class="benefit-chip">${b}</span>`)
            .join('');
    }

    // Avatar nếu có từ backend
    if (acc.avatarUrl) {
        const img = document.getElementById('customerAvatarImg');
        if (img) img.src = acc.avatarUrl;
    }
}

/* ─────────────────────────────────────────
   HIGHLIGHT TIER CARD
───────────────────────────────────────── */
function highlightCurrentTier(tier) {
    const map = { SILVER: 'tierSilver', GOLD: 'tierGold', PLATINUM: 'tierPlatinum' };
    Object.entries(map).forEach(([t, id]) => {
        const card = document.getElementById(id);
        if (!card) return;
        card.classList.toggle('active', t === tier);
        const existingBadge = card.querySelector('.current-tier-badge');

        if (t === tier && !existingBadge) {
            const badge = document.createElement('span');
            badge.className   = 'current-tier-badge';
            badge.textContent = 'Hạng hiện tại';
            card.appendChild(badge);
        } else if (t !== tier && existingBadge) {
            existingBadge.remove();
        }
    });
}

/* ─────────────────────────────────────────
   LỊCH SỬ GIAO DỊCH
───────────────────────────────────────── */
async function loadTransactionHistory(reset = true) {
    if (reset) currentPage = 0;
    if (isLastPage && !reset) return;

    const type  = document.getElementById('filterType')?.value   || '';
    const month = document.getElementById('filterMonth')?.value  || '';

    const params = new URLSearchParams({ page: currentPage, size: 10 });
    if (type)  params.set('type',  type);
    if (month) params.set('month', month);

    try {
        const data = await apiFetch(`/api/loyalty/me/transactions?${params}`);
        renderTransactionTable(data.content, reset);
        isLastPage = data.last;
    } catch (e) {
        console.error('Lỗi tải lịch sử:', e);
    }
}

function renderTransactionTable(transactions, reset) {
    const tbody = document.getElementById('historyTbody');
    if (!tbody) return;

    if (reset) tbody.innerHTML = '';

    if (transactions.length === 0 && reset) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:#8c7b72">
            Không có giao dịch nào</td></tr>`;
        return;
    }

    transactions.forEach(tx => {
        const date       = new Date(tx.createdAt);
        const dateStr    = date.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
        const isEarn     = tx.type === 'EARN';
        const badgeClass = isEarn ? 'badge-earn'   : 'badge-redeem';
        const badgeLabel = isEarn ? 'Tích điểm'    : 'Đổi điểm';
        const ptClass    = isEarn ? 'points-earn'  : 'points-redeem';
        const ptSign     = isEarn ? `+${tx.points}`: `-${tx.points}`;

        tbody.insertAdjacentHTML('beforeend', `
          <tr>
            <td>${dateStr}</td>
            <td>${escapeHtml(tx.description)}</td>
            <td><span class="${badgeClass}">${badgeLabel}</span></td>
            <td class="${ptClass}">${ptSign}</td>
            <td>${tx.balanceAfter.toLocaleString('vi-VN')}</td>
          </tr>
        `);
    });
}

/* ─────────────────────────────────────────
   BỘ LỌC LỊCH SỬ
───────────────────────────────────────── */
function initFilter() {
    const filterType  = document.getElementById('filterType');
    const filterMonth = document.getElementById('filterMonth');
    if (!filterType || !filterMonth) return;

    // Đặt tháng mặc định = tháng hiện tại
    const now = new Date();
    filterMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    filterType.addEventListener('change',  () => loadTransactionHistory(true));
    filterMonth.addEventListener('change', () => loadTransactionHistory(true));

    // Nút "Xem thêm" (load more)
    const loadMoreBtn = document.getElementById('btnLoadMore');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentPage++;
            loadTransactionHistory(false);
        });
    }
}

/* ─────────────────────────────────────────
   MODAL ĐỔI ĐIỂM
───────────────────────────────────────── */
function initRedeemModal() {
    // Nút "Đổi điểm" trên Hero Section
    document.querySelectorAll('[data-action="open-redeem"]').forEach(btn => {
        btn.addEventListener('click', openRedeemModal);
    });

    // Nút submit trong modal
    const submitBtn = document.getElementById('btnConfirmRedeem');
    if (submitBtn) submitBtn.addEventListener('click', handleRedeem);

    // Đóng modal
    document.getElementById('btnCloseRedeemModal')
        ?.addEventListener('click', closeRedeemModal);
}

function openRedeemModal() {
    const modal = document.getElementById('redeemModal');
    if (modal) modal.style.display = 'flex';
}

function closeRedeemModal() {
    const modal = document.getElementById('redeemModal');
    if (modal) modal.style.display = 'none';
}

async function handleRedeem() {
    const pointsInput = document.getElementById('redeemPoints');
    const descInput   = document.getElementById('redeemDesc');
    if (!pointsInput || !descInput) return;

    const points = parseInt(pointsInput.value, 10);
    const desc   = descInput.value.trim();

    if (!points || points <= 0) { alert('Vui lòng nhập số điểm hợp lệ'); return; }
    if (!desc)                  { alert('Vui lòng nhập mô tả');          return; }
    if (currentAccount && points > currentAccount.currentPoints) {
        alert(`Bạn chỉ có ${currentAccount.currentPoints} điểm`); return;
    }

    try {
        currentAccount = await apiFetch('/api/loyalty/me/redeem', {
            method: 'POST',
            body: JSON.stringify({ points, description: desc }),
        });
        renderHeroSection(currentAccount);
        closeRedeemModal();
        await loadTransactionHistory(true);
        showToast('Đổi điểm thành công!');
    } catch (e) {
        alert('Lỗi đổi điểm: ' + e.message);
    }
}

/* ─────────────────────────────────────────
   TOAST NOTIFICATION
───────────────────────────────────────── */
function showToast(message) {
    const existing = document.getElementById('toastMsg');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toastMsg';
    toast.style.cssText = `
        position:fixed; bottom:32px; right:32px; z-index:9999;
        background:#17120f; color:#fff; padding:14px 24px;
        border-radius:12px; font-size:14px; font-weight:500;
        box-shadow:0 8px 32px rgba(0,0,0,.25);
        animation: fadeInUp .3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

function showGlobalError(message) {
    const main = document.querySelector('.main-content');
    if (!main) return;
    const el = document.createElement('div');
    el.style.cssText = `
        margin:40px auto; max-width:500px; padding:20px 28px;
        background:#fff; border:1.5px solid #f5c800; border-radius:14px;
        font-size:15px; color:#5a4f48; text-align:center;
    `;
    el.innerHTML = `⚠️ ${escapeHtml(message)}`;
    main.prepend(el);
}

/* ─────────────────────────────────────────
   UTILS
───────────────────────────────────────── */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
