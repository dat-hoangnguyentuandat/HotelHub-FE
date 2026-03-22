/* =====================================================================
   admin-vouchers.js – Quản lý Voucher (Admin)
   ===================================================================== */
'use strict';

const API = window.BACKEND_URL || 'http://localhost:8081';
const token = () => localStorage.getItem('accessToken');

/* ── State ── */
let state = {
    vouchers: [],
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
    keyword: '',
    active: '',
    editId: null,
    deleteId: null,
};

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function fmtVND(n) {
    return Number(n).toLocaleString('vi-VN') + 'đ';
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast ' + type;
    t.style.display = 'block';
    clearTimeout(t._tid);
    t._tid = setTimeout(() => { t.style.display = 'none'; }, 3500);
}

function authHeader() {
    const tk = token();
    if (!tk) { window.location.href = '/login'; return {}; }
    return { 'Authorization': 'Bearer ' + tk, 'Content-Type': 'application/json' };
}

/* ══════════════════════════════════════════════════════════
   FETCH VOUCHERS
══════════════════════════════════════════════════════════ */
async function loadVouchers() {
    const tbody = document.getElementById('voucherTableBody');
    tbody.innerHTML = `<tr class="loading-row"><td colspan="8"><div class="skeleton-wrap">
        <div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>
    </div></td></tr>`;
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('paginationWrap').style.display = 'none';

    const params = new URLSearchParams({
        page: state.page,
        size: state.size,
    });
    if (state.keyword) params.set('keyword', state.keyword);
    if (state.active !== '') params.set('active', state.active);

    try {
        const res = await fetch(`${API}/api/admin/vouchers?${params}`, {
            headers: authHeader()
        });

        if (res.status === 401 || res.status === 403) {
            showToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'error');
            setTimeout(() => window.location.href = '/login', 1500);
            return;
        }

        if (!res.ok) throw new Error('Lỗi tải dữ liệu');

        const data = await res.json();
        state.vouchers = data.content || [];
        state.totalPages = data.totalPages || 0;
        state.totalElements = data.totalElements || 0;

        renderTable(state.vouchers);
        updateStats();
        updatePagination();
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#b94040;">
            Không thể tải dữ liệu. Vui lòng thử lại.</td></tr>`;
    }
}

/* ══════════════════════════════════════════════════════════
   RENDER TABLE
══════════════════════════════════════════════════════════ */
function renderTable(list) {
    const tbody = document.getElementById('voucherTableBody');
    const empty = document.getElementById('emptyState');

    if (!list || list.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }
    empty.style.display = 'none';

    tbody.innerHTML = list.map(v => `
        <tr>
            <td>
                <div class="voucher-name">${escHtml(v.name)}</div>
                ${v.description ? `<div class="voucher-desc">${escHtml(v.description)}</div>` : ''}
            </td>
            <td><span class="category-chip">${escHtml(v.category || 'Giảm giá')}</span></td>
            <td style="text-align:center;">
                <span class="points-badge">🎯 ${v.pointsRequired} điểm</span>
            </td>
            <td style="text-align:right;">
                <span class="value-text">${fmtVND(v.value)}</span>
            </td>
            <td style="text-align:center;">${v.maxRedemptions != null ? v.maxRedemptions : '∞'}</td>
            <td style="text-align:center;">${v.redeemedCount}</td>
            <td>
                <span class="badge ${v.active ? 'badge-active' : 'badge-inactive'}">
                    ${v.active ? '✓ Hoạt động' : '✗ Đã tắt'}
                </span>
            </td>
            <td>
                <div class="action-group">
                    <button class="btn-icon btn-edit" title="Chỉnh sửa" onclick="openEdit(${v.id})">
                        <svg viewBox="0 0 20 20" fill="none">
                            <path d="M14.7 2.3a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4L6.5 16.5l-4 1 1-4L14.7 2.3z"
                                stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-del" title="Xóa" onclick="openDelete(${v.id}, '${escHtml(v.name)}')">
                        <svg viewBox="0 0 20 20" fill="none">
                            <path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12"
                                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

/* ══════════════════════════════════════════════════════════
   STATS
══════════════════════════════════════════════════════════ */
function updateStats() {
    document.getElementById('statTotal').textContent = state.totalElements;
    const activeCount = state.vouchers.filter(v => v.active).length;
    document.getElementById('statActive').textContent = activeCount;
    const redeemed = state.vouchers.reduce((s, v) => s + (v.redeemedCount || 0), 0);
    document.getElementById('statRedeemed').textContent = redeemed;
}

/* ══════════════════════════════════════════════════════════
   PAGINATION
══════════════════════════════════════════════════════════ */
function updatePagination() {
    const wrap = document.getElementById('paginationWrap');
    wrap.style.display = state.totalPages <= 1 ? 'none' : 'flex';
    document.getElementById('pageInfo').textContent =
        `Trang ${state.page + 1} / ${state.totalPages}`;
    document.getElementById('btnPrev').disabled = state.page === 0;
    document.getElementById('btnNext').disabled = state.page >= state.totalPages - 1;
}

/* ══════════════════════════════════════════════════════════
   MODAL THÊM / SỬA
══════════════════════════════════════════════════════════ */
function openAdd() {
    state.editId = null;
    document.getElementById('modalTitle').textContent = 'Thêm Voucher mới';
    clearForm();
    document.getElementById('modalOverlay').style.display = 'flex';
}

function openEdit(id) {
    const v = state.vouchers.find(x => x.id === id);
    if (!v) return;
    state.editId = id;
    document.getElementById('modalTitle').textContent = 'Chỉnh sửa Voucher';
    document.getElementById('editVoucherId').value = id;
    document.getElementById('fldName').value = v.name || '';
    document.getElementById('fldDesc').value = v.description || '';
    document.getElementById('fldPoints').value = v.pointsRequired || '';
    document.getElementById('fldValue').value = v.value || '';
    document.getElementById('fldCategory').value = v.category || 'Giảm giá';
    document.getElementById('fldMax').value = v.maxRedemptions != null ? v.maxRedemptions : '';
    document.getElementById('fldActive').checked = v.active !== false;
    clearErrors();
    document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

function clearForm() {
    ['fldName', 'fldDesc', 'fldPoints', 'fldValue', 'fldMax'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('fldCategory').value = 'Giảm giá';
    document.getElementById('fldActive').checked = true;
    document.getElementById('editVoucherId').value = '';
    clearErrors();
}

function clearErrors() {
    ['errName', 'errPoints', 'errValue'].forEach(id => {
        document.getElementById(id).textContent = '';
    });
}

function validateForm() {
    let ok = true;
    clearErrors();
    const name = document.getElementById('fldName').value.trim();
    if (!name) {
        document.getElementById('errName').textContent = 'Vui lòng nhập tên voucher';
        ok = false;
    }
    const pts = parseInt(document.getElementById('fldPoints').value);
    if (!pts || pts < 1) {
        document.getElementById('errPoints').textContent = 'Số điểm phải lớn hơn 0';
        ok = false;
    }
    const val = parseInt(document.getElementById('fldValue').value);
    if (!val || val < 1000) {
        document.getElementById('errValue').textContent = 'Giá trị tối thiểu 1.000đ';
        ok = false;
    }
    return ok;
}

async function saveVoucher() {
    if (!validateForm()) return;

    const btn = document.getElementById('btnSaveVoucher');
    btn.disabled = true; btn.textContent = 'Đang lưu...';

    const maxRaw = document.getElementById('fldMax').value.trim();
    const payload = {
        name: document.getElementById('fldName').value.trim(),
        description: document.getElementById('fldDesc').value.trim() || null,
        pointsRequired: parseInt(document.getElementById('fldPoints').value),
        value: parseInt(document.getElementById('fldValue').value),
        category: document.getElementById('fldCategory').value,
        active: document.getElementById('fldActive').checked,
        maxRedemptions: maxRaw ? parseInt(maxRaw) : null,
    };

    const isEdit = !!state.editId;
    const url = isEdit
        ? `${API}/api/admin/vouchers/${state.editId}`
        : `${API}/api/admin/vouchers`;
    const method = isEdit ? 'PATCH' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: authHeader(),
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Lỗi lưu dữ liệu');
        }

        showToast(isEdit ? 'Cập nhật voucher thành công!' : 'Thêm voucher thành công!');
        closeModal();
        await loadVouchers();
    } catch (e) {
        showToast(e.message || 'Có lỗi xảy ra', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Lưu voucher';
    }
}

/* ══════════════════════════════════════════════════════════
   MODAL XÓA
══════════════════════════════════════════════════════════ */
function openDelete(id, name) {
    state.deleteId = id;
    document.getElementById('deleteVoucherName').textContent = name;
    document.getElementById('deleteOverlay').style.display = 'flex';
}

function closeDelete() {
    document.getElementById('deleteOverlay').style.display = 'none';
    state.deleteId = null;
}

async function confirmDelete() {
    if (!state.deleteId) return;
    const btn = document.getElementById('btnConfirmDelete');
    btn.disabled = true; btn.textContent = 'Đang xóa...';

    try {
        const res = await fetch(`${API}/api/admin/vouchers/${state.deleteId}`, {
            method: 'DELETE',
            headers: authHeader(),
        });

        if (!res.ok) throw new Error('Lỗi xóa voucher');

        showToast('Xóa voucher thành công!');
        closeDelete();
        if (state.vouchers.length === 1 && state.page > 0) state.page--;
        await loadVouchers();
    } catch (e) {
        showToast(e.message || 'Có lỗi xảy ra', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Xóa';
    }
}

/* ══════════════════════════════════════════════════════════
   ESCAPE HTML
══════════════════════════════════════════════════════════ */
function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════════════════════════
   DEBOUNCE SEARCH
══════════════════════════════════════════════════════════ */
let searchTimer;
function debounceSearch(fn, delay = 400) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(fn, delay);
}

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    loadVouchers();

    // Search
    document.getElementById('searchInput').addEventListener('input', e => {
        state.keyword = e.target.value.trim();
        state.page = 0;
        debounceSearch(loadVouchers);
    });

    // Filter status
    document.getElementById('filterStatus').addEventListener('change', e => {
        state.active = e.target.value;
        state.page = 0;
        loadVouchers();
    });

    // Add button
    document.getElementById('btnAddVoucher').addEventListener('click', openAdd);

    // Modal close
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => {
        if (e.target === document.getElementById('modalOverlay')) closeModal();
    });

    // Save voucher
    document.getElementById('btnSaveVoucher').addEventListener('click', saveVoucher);

    // Delete modal
    document.getElementById('btnCloseDelete').addEventListener('click', closeDelete);
    document.getElementById('btnCancelDelete').addEventListener('click', closeDelete);
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);
    document.getElementById('deleteOverlay').addEventListener('click', e => {
        if (e.target === document.getElementById('deleteOverlay')) closeDelete();
    });

    // Pagination
    document.getElementById('btnPrev').addEventListener('click', () => {
        if (state.page > 0) { state.page--; loadVouchers(); }
    });
    document.getElementById('btnNext').addEventListener('click', () => {
        if (state.page < state.totalPages - 1) { state.page++; loadVouchers(); }
    });
});
