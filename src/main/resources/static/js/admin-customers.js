/* ═══════════════════════════════════════════════════════════
   ADMIN CUSTOMERS – JavaScript
   API Backend: /api/admin/users
═══════════════════════════════════════════════════════════ */
'use strict';

const API_BASE = (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : 'http://localhost:8081';
const PAGE_SIZE = 8;

let allCustomers   = [];   // dữ liệu gốc từ server
let filteredList   = [];   // sau lọc/search client-side
let currentPage    = 1;
let detailCustomer = null;
let selectedRole   = null;

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function getToken() {
    // Toàn bộ project HotelHub lưu JWT dưới key 'accessToken'
    return localStorage.getItem('accessToken') || '';
}

function authHeaders() {
    const t = getToken();
    if (!t) {
        console.warn('[HotelHub] Không tìm thấy accessToken – vui lòng đăng nhập lại.');
    }
    return {
        'Content-Type': 'application/json',
        ...(t ? { 'Authorization': 'Bearer ' + t } : {})
    };
}

function fmtDate(val) {
    if (!val) return '—';
    try {
        // LocalDateTime từ Java: "2024-03-20T14:30:00" hoặc array [2024,3,20,...]
        const d = Array.isArray(val)
            ? new Date(val[0], val[1] - 1, val[2])
            : new Date(val);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return String(val); }
}

function roleLabel(role) {
    const map = { GUEST: 'Khách hàng', HOTEL_OWNER: 'Chủ khách sạn', ADMIN: 'Quản trị viên' };
    return map[role] || role;
}

function roleBadge(role) {
    const icons = {
        GUEST:       '<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2 14C2 11.8 4.7 10 8 10s6 1.8 6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        HOTEL_OWNER: '<svg viewBox="0 0 16 16" fill="none"><rect x="1" y="5" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M1 9H15M5 9V7C5 6.4 5.4 6 6 6H10C10.6 6 11 6.4 11 7V9" stroke="currentColor" stroke-width="1.5"/></svg>',
        ADMIN:       '<svg viewBox="0 0 16 16" fill="none"><path d="M8 1L2 4.5V8C2 11 4.7 13.8 8 14.7C11.3 13.8 14 11 14 8V4.5L8 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 8l1.5 1.5L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    return `<span class="role-badge ${role}">${icons[role] || ''}${roleLabel(role)}</span>`;
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function extractMessage(data) {
    if (!data) return 'Đã xảy ra lỗi';
    if (typeof data === 'string') return data;
    // ErrorResponse shape từ GlobalExceptionHandler
    return data.message || data.error || JSON.stringify(data);
}

/* ═══════════════════════════════════════════════════════════
   API CALLS
═══════════════════════════════════════════════════════════ */

/** GET /api/admin/users – danh sách */
async function apiFetchCustomers() {
    const res = await fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders() });
    if (res.status === 401) { window.location.href = '/login'; return []; }
    if (res.status === 403) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        console.error('[HotelHub] 403 Forbidden – role:', user.role, '| Endpoint này yêu cầu ADMIN');
        throw new Error('Bạn không có quyền truy cập. Vui lòng đăng nhập bằng tài khoản Admin.');
    }
    if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(extractMessage(d));
    }
    return res.json();
}

/** GET /api/admin/users/stats – thống kê */
async function apiFetchStats() {
    const res = await fetch(`${API_BASE}/api/admin/users/stats`, { headers: authHeaders() });
    if (!res.ok) return null;
    return res.json();
}

/** POST /api/admin/users – tạo user mới (admin) */
async function apiCreateUser(payload) {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
    });
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(extractMessage(data));
    return data;
}

/** PATCH /api/admin/users/{id}/role – đổi role */
async function apiChangeRole(id, role) {
    const res = await fetch(`${API_BASE}/api/admin/users/${id}/role`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ role })
    });
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(extractMessage(data));
    return data;
}

/** DELETE /api/admin/users/{id} – xoá user */
async function apiDeleteUser(id) {
    const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    if (res.status === 401) { window.location.href = '/login'; return; }
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(extractMessage(data));
    }
    return true;
}

/* ═══════════════════════════════════════════════════════════
   LOAD & RENDER
═══════════════════════════════════════════════════════════ */
async function loadCustomers() {
    showSkeleton();
    try {
        // Tải song song: danh sách + stats
        const [list, stats] = await Promise.all([apiFetchCustomers(), apiFetchStats()]);
        allCustomers = list;
        renderStatsFromServer(stats);
        applyFilter();
    } catch (e) {
        console.error(e);
        showToast('Không thể tải danh sách: ' + e.message, true);
        document.getElementById('customerTableBody').innerHTML =
            `<tr><td colspan="6" style="text-align:center;padding:40px;color:#8c7b72;font-size:13px">
                Lỗi tải dữ liệu. Vui lòng thử lại.
             </td></tr>`;
        document.getElementById('tableCount').textContent = '';
    }
}

/** Render stats từ /api/admin/users/stats */
function renderStatsFromServer(stats) {
    if (!stats) { renderStatsFallback(); return; }
    document.getElementById('statTotal').textContent  = stats.totalUsers   ?? '—';
    document.getElementById('statGuest').textContent  = stats.totalGuests  ?? '—';
    document.getElementById('statOwner').textContent  = stats.totalOwners  ?? '—';
    document.getElementById('statAdmin').textContent  = stats.totalAdmins  ?? '—';
    document.getElementById('statNew').textContent    = stats.newThisMonth ?? '—';
}

/** Tính stats từ dữ liệu local (fallback) */
function renderStatsFallback() {
    const now = new Date();
    document.getElementById('statTotal').textContent = allCustomers.length;
    document.getElementById('statGuest').textContent = allCustomers.filter(u => u.role === 'GUEST').length;
    document.getElementById('statOwner').textContent = allCustomers.filter(u => u.role === 'HOTEL_OWNER').length;
    document.getElementById('statAdmin').textContent = allCustomers.filter(u => u.role === 'ADMIN').length;
    document.getElementById('statNew').textContent   = allCustomers.filter(u => {
        if (!u.createdAt) return false;
        const d = Array.isArray(u.createdAt) ? new Date(u.createdAt[0], u.createdAt[1] - 1, u.createdAt[2]) : new Date(u.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
}

function applyFilter() {
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const role   = document.getElementById('filterRole').value;

    filteredList = allCustomers.filter(u => {
        const matchSearch = !search ||
            (u.fullName || '').toLowerCase().includes(search) ||
            (u.email    || '').toLowerCase().includes(search);
        const matchRole = !role || u.role === role;
        return matchSearch && matchRole;
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}

function renderTable() {
    const tbody = document.getElementById('customerTableBody');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('tableCount');

    if (filteredList.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'flex';
        count.textContent = 'Không có khách hàng nào';
        document.getElementById('pagination').innerHTML = '';
        return;
    }

    empty.style.display = 'none';

    const start = (currentPage - 1) * PAGE_SIZE;
    const page  = filteredList.slice(start, start + PAGE_SIZE);

    count.textContent =
        `Hiển thị ${start + 1}–${Math.min(start + page.length, filteredList.length)} trên ${filteredList.length} khách hàng`;

    tbody.innerHTML = page.map(u => {
        const cid      = `#KH${String(u.id).padStart(3, '0')}`;
        const initials = getInitials(u.fullName);
        return `
        <tr>
            <td><span class="customer-id">${cid}</span></td>
            <td>
                <div class="customer-info-cell">
                    <div class="customer-avatar">${escHtml(initials)}</div>
                    <span class="customer-name">${escHtml(u.fullName || '—')}</span>
                </div>
            </td>
            <td><span style="font-size:13px;color:#17120f">${escHtml(u.email || '—')}</span></td>
            <td>${roleBadge(u.role)}</td>
            <td><span class="date-text">${fmtDate(u.createdAt)}</span></td>
            <td>
                <div class="action-group">
                    <button class="btn-icon" title="Xem chi tiết"
                            data-action="detail" data-id="${u.id}">
                        <svg viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/>
                            <path d="M10 9V14M10 7H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" title="Xoá"
                            data-action="delete" data-id="${u.id}"
                            data-name="${escHtml(u.fullName || '')}">
                        <svg viewBox="0 0 20 20" fill="none">
                            <path d="M3 6H17M8 6V4H12V6M6 6V16C6 16.55 6.45 17 7 17H13C13.55 17 14 16.55 14 16V6"
                                  stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function renderPagination() {
    const total = Math.ceil(filteredList.length / PAGE_SIZE);
    const pg    = document.getElementById('pagination');
    if (total <= 1) { pg.innerHTML = ''; return; }

    const pages = buildPageNumbers(currentPage, total);
    pg.innerHTML = `
        <button class="page-btn" id="pgPrev" ${currentPage === 1 ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
        </button>
        ${pages.map(p => p === '...'
            ? `<span class="page-dots">…</span>`
            : `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`
        ).join('')}
        <button class="page-btn" id="pgNext" ${currentPage === total ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
        </button>`;

    pg.querySelector('#pgPrev')?.addEventListener('click', () => { currentPage--; renderTable(); renderPagination(); });
    pg.querySelector('#pgNext')?.addEventListener('click', () => { currentPage++; renderTable(); renderPagination(); });
    pg.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPage = parseInt(btn.dataset.page);
            renderTable();
            renderPagination();
        });
    });
}

function buildPageNumbers(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (cur > 3) pages.push('...');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

function showSkeleton() {
    document.getElementById('customerTableBody').innerHTML = `
        <tr class="loading-row">
            <td colspan="6">
                <div class="skeleton-wrap">
                    <div class="skeleton"></div>
                    <div class="skeleton"></div>
                    <div class="skeleton"></div>
                    <div class="skeleton"></div>
                </div>
            </td>
        </tr>`;
    document.getElementById('tableCount').textContent = 'Đang tải...';
}

/* ═══════════════════════════════════════════════════════════
   TABLE CLICK DELEGATION
═══════════════════════════════════════════════════════════ */
document.getElementById('customerTableBody').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id     = parseInt(btn.dataset.id);
    const action = btn.dataset.action;

    if (action === 'detail') {
        const u = allCustomers.find(x => x.id === id);
        if (u) openDetailModal(u);
    } else if (action === 'delete') {
        openDeleteModal(id, btn.dataset.name);
    }
});

/* ═══════════════════════════════════════════════════════════
   MODAL THÊM KHÁCH HÀNG
═══════════════════════════════════════════════════════════ */
function openAddModal() {
    clearFormErrors();
    document.getElementById('fFullName').value  = '';
    document.getElementById('fEmail').value     = '';
    document.getElementById('fPassword').value  = '';
    document.getElementById('fRole').value      = 'GUEST';
    document.getElementById('modalTitle').textContent      = 'Thêm Khách Hàng';
    document.getElementById('btnSaveCustomer').textContent = 'Tạo khách hàng';
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('fFullName').focus(), 80);
}

function closeAddModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

function clearFormErrors() {
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
}

function setFormError(inputId, errId, msg) {
    document.getElementById(inputId)?.classList.add('error');
    const er = document.getElementById(errId);
    if (er) er.textContent = msg;
}

document.getElementById('btnSaveCustomer').addEventListener('click', async () => {
    clearFormErrors();
    const fullName = document.getElementById('fFullName').value.trim();
    const email    = document.getElementById('fEmail').value.trim();
    const password = document.getElementById('fPassword').value;
    const role     = document.getElementById('fRole').value;

    let valid = true;
    if (!fullName)                          { setFormError('fFullName','errFullName','Họ và tên không được trống'); valid = false; }
    if (!email)                             { setFormError('fEmail','errEmail','Email không được trống'); valid = false; }
    else if (!/\S+@\S+\.\S+/.test(email))  { setFormError('fEmail','errEmail','Email không hợp lệ'); valid = false; }
    if (!password)                          { setFormError('fPassword','errPassword','Mật khẩu không được trống'); valid = false; }
    else if (password.length < 6)          { setFormError('fPassword','errPassword','Mật khẩu tối thiểu 6 ký tự'); valid = false; }
    if (!valid) return;

    const btn = document.getElementById('btnSaveCustomer');
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';

    try {
        // Gọi POST /api/admin/users – endpoint mới dành riêng cho admin
        const created = await apiCreateUser({ fullName, email, password, role });
        allCustomers.unshift(created);
        applyFilter();
        renderStatsFallback();
        closeAddModal();
        showToast('Tạo khách hàng thành công!');
    } catch (e) {
        showToast(e.message, true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Tạo khách hàng';
    }
});

document.getElementById('modalClose').addEventListener('click', closeAddModal);
document.getElementById('btnCancelModal').addEventListener('click', closeAddModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeAddModal();
});

/* ═══════════════════════════════════════════════════════════
   MODAL CHI TIẾT & ĐỔI ROLE
═══════════════════════════════════════════════════════════ */
function openDetailModal(u) {
    detailCustomer = u;
    selectedRole   = u.role;

    const cid = `#KH${String(u.id).padStart(3, '0')}`;

    document.getElementById('detailAvatar').textContent = getInitials(u.fullName);
    document.getElementById('detailName').textContent   = u.fullName || '—';
    document.getElementById('detailCode').textContent   = cid;
    document.getElementById('dEmail').textContent       = u.email || '—';
    document.getElementById('dRole').innerHTML          = roleBadge(u.role);
    document.getElementById('dCreatedAt').textContent   = fmtDate(u.createdAt);
    document.getElementById('dId').textContent          = cid;

    document.querySelectorAll('.role-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.role === u.role);
    });

    document.getElementById('detailOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
    document.getElementById('detailOverlay').classList.remove('open');
    document.body.style.overflow = '';
    detailCustomer = null;
    selectedRole   = null;
}

document.querySelectorAll('.role-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.role-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedRole = pill.dataset.role;
    });
});

document.getElementById('btnUpdateRole').addEventListener('click', async () => {
    if (!detailCustomer) return;
    if (selectedRole === detailCustomer.role) {
        showToast('Vai trò không thay đổi', true);
        return;
    }

    const btn = document.getElementById('btnUpdateRole');
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';

    try {
        const updated = await apiChangeRole(detailCustomer.id, selectedRole);
        // Cập nhật local data
        allCustomers = allCustomers.map(u => u.id === detailCustomer.id ? { ...u, ...updated } : u);
        closeDetailModal();
        applyFilter();
        renderStatsFallback();
        showToast('Cập nhật vai trò thành công!');
    } catch (e) {
        showToast(e.message, true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Lưu thay đổi';
    }
});

document.getElementById('detailClose').addEventListener('click', closeDetailModal);
document.getElementById('btnCloseDetail').addEventListener('click', closeDetailModal);
document.getElementById('detailOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('detailOverlay')) closeDetailModal();
});

/** Nút Xoá trong modal chi tiết → mở confirm */
document.getElementById('btnDeleteCustomer').addEventListener('click', () => {
    if (!detailCustomer) return;
    openDeleteModal(detailCustomer.id, detailCustomer.fullName);
});

/* ═══════════════════════════════════════════════════════════
   MODAL XÁC NHẬN XOÁ
═══════════════════════════════════════════════════════════ */
let pendingDeleteId = null;

function openDeleteModal(id, name) {
    pendingDeleteId = id;
    document.getElementById('deleteCustomerName').textContent =
        name || `#KH${String(id).padStart(3,'0')}`;
    document.getElementById('deleteOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    document.getElementById('deleteOverlay').classList.remove('open');
    if (!document.getElementById('detailOverlay').classList.contains('open')) {
        document.body.style.overflow = '';
    }
    pendingDeleteId = null;
}

document.getElementById('btnCancelDelete').addEventListener('click', closeDeleteModal);
document.getElementById('deleteOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('deleteOverlay')) closeDeleteModal();
});

document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
    if (!pendingDeleteId) return;
    const btn = document.getElementById('btnConfirmDelete');
    btn.disabled = true;
    btn.textContent = 'Đang xoá...';

    try {
        await apiDeleteUser(pendingDeleteId);
        allCustomers = allCustomers.filter(u => u.id !== pendingDeleteId);
        closeDeleteModal();
        closeDetailModal();
        applyFilter();
        renderStatsFallback();
        showToast('Đã xoá khách hàng thành công!');
    } catch (e) {
        showToast(e.message, true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Xoá khách hàng';
    }
});

/* ═══════════════════════════════════════════════════════════
   SEARCH & FILTER
═══════════════════════════════════════════════════════════ */
document.getElementById('searchInput').addEventListener('input', debounce(applyFilter, 250));
document.getElementById('filterRole').addEventListener('change', applyFilter);
document.getElementById('btnAddCustomer').addEventListener('click', openAddModal);
document.getElementById('btnAddCustomerEmpty')?.addEventListener('click', openAddModal);

/* ═══════════════════════════════════════════════════════════
   SIDEBAR NAV HIGHLIGHT
═══════════════════════════════════════════════════════════ */
(function() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-item').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === path) link.classList.add('active');
    });
})();

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, isError = false) {
    const t = document.getElementById('adminToast');
    document.getElementById('adminToastMsg').textContent = msg;
    t.className = 'toast' + (isError ? ' toast-error' : '') + ' show';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = t.className.replace(' show', ''); }, 3500);
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
loadCustomers();
