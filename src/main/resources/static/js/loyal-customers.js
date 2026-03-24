/**
 * loyal-customers.js
 * Kết nối API backend /api/loyalty/* – HotelHub
 */

/* ─────────────────────────────────────────
   CẤU HÌNH
───────────────────────────────────────── */
const API_BASE = window.BACKEND_URL || 'http://localhost:8081';   // Cổng backend Spring Boot

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
   MODAL ĐỔI ĐIỂM LẤY VOUCHER
───────────────────────────────────────── */
function initRedeemModal() {
    // Nút "Đổi điểm" trên Hero Section
    document.querySelectorAll('[data-action="open-redeem"]').forEach(btn => {
        btn.addEventListener('click', openRedeemModal);
    });

    // Đóng modal chính
    document.getElementById('btnCloseRedeemModal')
        ?.addEventListener('click', closeRedeemModal);

    // Đóng modal xác nhận
    document.getElementById('btnCancelConfirmRedeem')
        ?.addEventListener('click', closeConfirmModal);

    // Xác nhận đổi
    document.getElementById('btnDoRedeem')
        ?.addEventListener('click', handleRedeemVoucher);

    // Xem voucher đã đổi
    document.getElementById('btnViewMyVouchers')
        ?.addEventListener('click', openMyVouchersModal);

    // Đóng modal voucher đã đổi
    document.getElementById('btnCloseMyVouchers')
        ?.addEventListener('click', closeMyVouchersModal);
}

let selectedVoucherId = null;
let selectedVoucherPoints = 0;
let selectedVoucherName = '';

async function openRedeemModal() {
    const modal = document.getElementById('redeemModal');
    if (!modal) return;
    modal.style.display = 'flex';

    // Cập nhật điểm hiện tại
    const pts = currentAccount ? currentAccount.currentPoints : 0;
    const ptEl = document.getElementById('redeemModalPoints');
    if (ptEl) ptEl.textContent = pts.toLocaleString('vi-VN');

    await loadVoucherList(pts);
}

function closeRedeemModal() {
    const modal = document.getElementById('redeemModal');
    if (modal) modal.style.display = 'none';
}

async function loadVoucherList(myPoints) {
    const area = document.getElementById('voucherListArea');
    const loading = document.getElementById('voucherLoadingState');
    if (!area) return;

    loading.style.display = 'block';

    try {
        const vouchers = await fetch(`${API_BASE}/api/vouchers`)
            .then(r => r.json());

        loading.style.display = 'none';

        // Xóa các voucher card cũ (giữ loading div)
        Array.from(area.children).forEach(el => {
            if (el.id !== 'voucherLoadingState') el.remove();
        });

        if (!vouchers || vouchers.length === 0) {
            area.insertAdjacentHTML('beforeend', `
                <div style="text-align:center; padding:32px; color:#8c7b72;">
                    <div style="font-size:32px; margin-bottom:8px;">🎫</div>
                    <p>Hiện chưa có voucher nào để đổi.<br>Vui lòng quay lại sau!</p>
                </div>
            `);
            return;
        }

        vouchers.forEach(v => {
            const canRedeem = v.available && myPoints >= v.pointsRequired;
            const limitText = v.maxRedemptions != null
                ? `${v.redeemedCount}/${v.maxRedemptions} lượt`
                : 'Không giới hạn';
            const notEnough = !canRedeem && myPoints < v.pointsRequired;

            area.insertAdjacentHTML('beforeend', `
                <div style="border:1.5px solid ${canRedeem ? '#e0dad4' : '#f0ebe7'};
                     border-radius:14px; padding:16px; background:${canRedeem ? '#fff' : '#fdfaf8'};
                     display:flex; flex-direction:column; gap:8px; opacity:${canRedeem ? '1' : '0.65'};">

                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                        <div style="flex:1;">
                            <p style="font-family:'Manrope',sans-serif; font-size:15px; font-weight:700;
                                       color:#17120f; margin:0 0 4px;">${escapeHtml(v.name)}</p>
                            ${v.description
                                ? `<p style="font-size:13px; color:#8c7b72; margin:0;">${escapeHtml(v.description)}</p>`
                                : ''}
                        </div>
                        <span style="background:#fef3e2; color:#c17c5a; font-size:12px; font-weight:700;
                               padding:4px 10px; border-radius:20px; white-space:nowrap; flex-shrink:0;">
                            🎫 ${escapeHtml(v.category)}
                        </span>
                    </div>

                    <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
                        <span style="font-size:14px; color:#16a34a; font-weight:600;">
                            Trị giá: ${Number(v.value).toLocaleString('vi-VN')}đ
                        </span>
                        <span style="font-size:13px; color:#5a4540;">
                            Lượt đổi: ${limitText}
                        </span>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                        <span style="font-size:13px; font-weight:700; color:#c17c5a;">
                            🎯 ${v.pointsRequired} điểm
                        </span>
                        ${canRedeem
                            ? `<button
                                onclick="selectVoucher(${v.id}, ${v.pointsRequired}, '${escapeHtml(v.name)}')"
                                style="height:36px; padding:0 18px; background:#c17c5a; color:#fff;
                                       border:none; border-radius:10px; font-size:13px; font-weight:700;
                                       cursor:pointer; font-family:'Manrope',sans-serif; transition:background .15s;"
                                onmouseover="this.style.background='#a5643f'"
                                onmouseout="this.style.background='#c17c5a'">
                                Đổi ngay
                               </button>`
                            : `<span style="font-size:12px; color:#b94040; font-weight:500;">
                                ${notEnough
                                    ? '⚠ Không đủ điểm'
                                    : (v.available ? '' : '⚠ Hết lượt')
                                }
                               </span>`
                        }
                    </div>
                </div>
            `);
        });

    } catch (e) {
        loading.style.display = 'none';
        console.error('Lỗi tải voucher:', e);
        area.insertAdjacentHTML('beforeend', `
            <p style="text-align:center; color:#b94040; padding:20px;">Không thể tải danh sách voucher.</p>
        `);
    }
}

function selectVoucher(id, points, name) {
    selectedVoucherId = id;
    selectedVoucherPoints = points;
    selectedVoucherName = name;

    const textEl = document.getElementById('confirmRedeemText');
    if (textEl) {
        textEl.innerHTML = `Bạn muốn dùng <strong style="color:#c17c5a;">${points} điểm</strong>
            để đổi lấy voucher <strong>"${escapeHtml(name)}"</strong>?`;
    }

    const confirmModal = document.getElementById('confirmRedeemModal');
    if (confirmModal) confirmModal.style.display = 'flex';
}

function closeConfirmModal() {
    const m = document.getElementById('confirmRedeemModal');
    if (m) m.style.display = 'none';
    selectedVoucherId = null;
}

async function handleRedeemVoucher() {
    if (!selectedVoucherId) return;

    const btn = document.getElementById('btnDoRedeem');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý...'; }

    try {
        const result = await apiFetch('/api/vouchers/redeem', {
            method: 'POST',
            body: JSON.stringify({ voucherId: selectedVoucherId }),
        });

        closeConfirmModal();
        closeRedeemModal();

        // Reload tài khoản để cập nhật điểm
        await loadMyAccount();

        // Hiển thị thông báo thành công + mã voucher
        showLcToast(`🎉 Đổi thành công! Mã voucher của bạn: ${result.redeemedCode}`, 'success', 6000);

    } catch (e) {
        showLcToast('Lỗi: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Xác nhận đổi'; }
    }
}

/* ─────────────────────────────────────────
   MODAL VOUCHER ĐÃ ĐỔI
───────────────────────────────────────── */
async function openMyVouchersModal() {
    const modal = document.getElementById('myVouchersModal');
    if (modal) modal.style.display = 'flex';

    const content = document.getElementById('myVouchersContent');
    content.innerHTML = '<p style="text-align:center; color:#8c7b72; padding:24px;">Đang tải...</p>';

    try {
        const data = await apiFetch('/api/vouchers/my?page=0&size=20');
        const list = data.content || [];

        if (list.length === 0) {
            content.innerHTML = `
                <div style="text-align:center; padding:32px; color:#8c7b72;">
                    <div style="font-size:32px; margin-bottom:8px;">🎫</div>
                    <p>Bạn chưa đổi voucher nào.</p>
                </div>`;
            return;
        }

        content.innerHTML = list.map(uv => `
            <div style="border:1.5px solid #f0ebe7; border-radius:12px; padding:14px 16px;
                         display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:14px; color:#17120f;">${escapeHtml(uv.voucherName)}</strong>
                    <span style="font-size:12px; padding:3px 8px; border-radius:20px; font-weight:600;
                           background:${uv.status === 'ACTIVE' ? '#dcfce7' : '#f3f4f6'};
                           color:${uv.status === 'ACTIVE' ? '#16a34a' : '#6b7280'};">
                        ${uv.status === 'ACTIVE' ? '✓ Còn dùng được' : uv.status === 'USED' ? 'Đã dùng' : 'Hết hạn'}
                    </span>
                </div>
                <p style="font-size:13px; color:#8c7b72; margin:0;">
                    Trị giá: <strong style="color:#16a34a;">${Number(uv.voucherValue).toLocaleString('vi-VN')}đ</strong>
                    · Đã đổi: ${uv.pointsSpent} điểm
                </p>
                <div style="background:#f5f2f0; border-radius:8px; padding:8px 12px;
                             display:flex; align-items:center; justify-content:space-between;">
                    <span style="font-family:monospace; font-size:14px; font-weight:700;
                           color:#5a4540; letter-spacing:.05em;">${escapeHtml(uv.redeemedCode)}</span>
                    <button onclick="copyCode('${escapeHtml(uv.redeemedCode)}')"
                        style="border:none; background:none; cursor:pointer; font-size:12px;
                               color:#c17c5a; font-weight:600;">📋 Sao chép</button>
                </div>
                <p style="font-size:12px; color:#b5a9a2; margin:0;">
                    Đổi ngày ${new Date(uv.redeemedAt).toLocaleDateString('vi-VN')}
                </p>
            </div>
        `).join('');

    } catch (e) {
        content.innerHTML = `<p style="text-align:center; color:#b94040; padding:20px;">Lỗi tải dữ liệu: ${escapeHtml(e.message)}</p>`;
    }
}

function closeMyVouchersModal() {
    const m = document.getElementById('myVouchersModal');
    if (m) m.style.display = 'none';
}

function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showLcToast('Đã sao chép mã: ' + code, 'success');
    }).catch(() => {
        showLcToast('Không thể sao chép. Mã: ' + code, 'error');
    });
}

/* ─────────────────────────────────────────
   TOAST NOTIFICATION
───────────────────────────────────────── */
function showLcToast(message, type = 'success', duration = 4000) {
    const t = document.getElementById('lcToast');
    if (!t) return showToast(message);
    t.textContent = message;
    t.style.background = type === 'success' ? '#16a34a' : '#b94040';
    t.style.display = 'block';
    clearTimeout(t._tid);
    t._tid = setTimeout(() => { t.style.display = 'none'; }, duration);
}

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
