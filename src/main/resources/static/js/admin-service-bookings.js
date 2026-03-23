/* ═══════════════════════════════════════════════════════════
   ADMIN SERVICE BOOKINGS - JAVASCRIPT
═══════════════════════════════════════════════════════════ */

/* ─── STATE ─── */
let allBookings   = [];
let filtered      = [];
let currentPage   = 1;
const PAGE_SIZE   = 10;
let detailBooking = null;

/* ─── AUTH ─── */
function authHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    };
}

/* ─── API ─── */
async function fetchBookings() {
    try {
        const statusFilter = document.getElementById('filterStatus').value;
        const url = statusFilter
            ? `${BACKEND_URL}/api/admin/service-bookings?status=${statusFilter}&size=200`
            : `${BACKEND_URL}/api/admin/service-bookings?size=200`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) throw new Error('Lỗi tải danh sách');
        const data = await res.json();
        allBookings = Array.isArray(data) ? data : (data.content || []);
    } catch (err) {
        console.error('Error:', err);
        allBookings = [];
    }
    applyFilter();
    renderStats();
}

async function updateBookingStatus(id, status) {
    const res = await fetch(`${BACKEND_URL}/api/admin/service-bookings/${id}/status?status=${status}`, {
        method: 'PATCH',
        headers: authHeaders()
    });
    if (!res.ok) {
        if (res.status === 403) throw new Error('⛔ Bạn không có quyền thực hiện thao tác này.');
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Không thể cập nhật trạng thái');
    }
    return res.json();
}

/* ─── FILTER & RENDER ─── */
function applyFilter() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    filtered = allBookings.filter(b => {
        const matchQ = !q || 
            (b.bookingCode || '').toLowerCase().includes(q) ||
            (b.guestName || '').toLowerCase().includes(q) ||
            (b.guestPhone || '').toLowerCase().includes(q) ||
            (b.serviceName || '').toLowerCase().includes(q);
        return matchQ;
    });
    currentPage = 1;
    renderTable();
    renderPagination();
}

function renderStats() {
    const stats = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
    allBookings.forEach(b => {
        if (stats.hasOwnProperty(b.status)) stats[b.status]++;
    });
    document.getElementById('statPending').textContent   = stats.PENDING;
    document.getElementById('statConfirmed').textContent = stats.CONFIRMED;
    document.getElementById('statCompleted').textContent = stats.COMPLETED;
    document.getElementById('statCancelled').textContent = stats.CANCELLED;
}

function renderTable() {
    const tbody = document.getElementById('bookingTableBody');
    const empty = document.getElementById('emptyState');
    const start = (currentPage - 1) * PAGE_SIZE;
    const page  = filtered.slice(start, start + PAGE_SIZE);

    document.getElementById('tableCount').textContent = `Tổng ${filtered.length} yêu cầu`;

    if (page.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }
    empty.style.display = 'none';

    tbody.innerHTML = page.map(b => `
        <tr class="booking-row">
            <td class="col-code">
                <button class="link-code" onclick="viewDetail(${b.id})">${escHtml(b.bookingCode || '—')}</button>
            </td>
            <td class="col-service">
                <div class="service-name">${escHtml(b.serviceName || '—')}</div>
            </td>
            <td class="col-guest">
                <div class="guest-name">${escHtml(b.guestName || '—')}</div>
            </td>
            <td class="col-contact">
                <div class="contact-phone">${escHtml(b.guestPhone || '—')}</div>
                ${b.guestEmail ? `<div class="contact-email">${escHtml(b.guestEmail)}</div>` : ''}
            </td>
            <td class="col-qty">
                <div class="qty-badge">${b.quantity || 0}</div>
            </td>
            <td class="col-amount">
                <div class="amount-val">${formatMoney(b.totalAmount)}</div>
            </td>
            <td class="col-status">
                <span class="badge badge-${(b.status || '').toLowerCase()}">${getStatusLabel(b.status)}</span>
            </td>
            <td class="col-date">
                <div class="date-val">${formatDate(b.createdAt)}</div>
            </td>
            <td class="col-action">
                <div class="action-btns">
                    <button class="btn-view" onclick="viewDetail(${b.id})">
                        <svg viewBox="0 0 20 20" fill="none"><path d="M10 4C5 4 1.73 7.11 1 10c.73 2.89 4 6 9 6s8.27-3.11 9-6c-.73-2.89-4-6-9-6z" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.6"/></svg>
                        Xem
                    </button>
                    ${b.status === 'PENDING' ? `<button class="btn-confirm" onclick="confirmBooking(${b.id})">Xác nhận</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderPagination() {
    const total = Math.ceil(filtered.length / PAGE_SIZE);
    const pg    = document.getElementById('pagination');
    if (total <= 1) { pg.innerHTML = ''; return; }

    let html = `<button class="pg-btn pg-prev" ${currentPage===1?'disabled':''} onclick="goToPage(${currentPage-1})">
        <svg viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9L11 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>`;
    for (let i = 1; i <= total; i++) {
        html += `<button class="pg-btn pg-num ${i===currentPage?'active':''}" onclick="goToPage(${i})">${i}</button>`;
    }
    html += `<button class="pg-btn pg-next" ${currentPage===total?'disabled':''} onclick="goToPage(${currentPage+1})">
        <svg viewBox="0 0 18 18" fill="none"><path d="M7 4L12 9L7 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    </button>`;
    pg.innerHTML = html;
}

function goToPage(page) {
    const total = Math.ceil(filtered.length / PAGE_SIZE);
    if (page < 1 || page > total) return;
    currentPage = page;
    renderTable();
    renderPagination();
}

/* ─── DETAIL MODAL ─── */
async function viewDetail(id) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/service-bookings/${id}`, {
            headers: authHeaders()
        });
        if (!res.ok) throw new Error('Không thể tải chi tiết');
        detailBooking = await res.json();

        document.getElementById('detailBody').innerHTML = `
            <div class="detail-grid">
                <div class="detail-section">
                    <div class="detail-section-label">Thông tin khách hàng</div>
                    <div class="detail-row">
                        <span class="detail-key">Họ và tên</span>
                        <span class="detail-val">${escHtml(detailBooking.guestName || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-key">Điện thoại</span>
                        <span class="detail-val">${escHtml(detailBooking.guestPhone || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-key">Email</span>
                        <span class="detail-val">${escHtml(detailBooking.guestEmail || '—')}</span>
                    </div>
                </div>
                <div class="detail-section">
                    <div class="detail-section-label">Thông tin dịch vụ</div>
                    <div class="detail-row">
                        <span class="detail-key">Mã đặt</span>
                        <span class="detail-val">${escHtml(detailBooking.bookingCode || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-key">Dịch vụ</span>
                        <span class="detail-val">${escHtml(detailBooking.serviceName || '—')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-key">Số lượng</span>
                        <span class="detail-val">${detailBooking.quantity || 0}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-key">Trạng thái</span>
                        <span class="detail-val"><span class="badge badge-${(detailBooking.status || '').toLowerCase()}">${getStatusLabel(detailBooking.status)}</span></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-key">Ngày tạo</span>
                        <span class="detail-val">${formatDate(detailBooking.createdAt)}</span>
                    </div>
                    <div class="detail-row detail-row-total">
                        <span class="detail-key">Tổng tiền</span>
                        <span class="detail-val detail-total">${formatMoney(detailBooking.totalAmount)}</span>
                    </div>
                </div>
            </div>
            ${detailBooking.note ? `
            <div class="detail-note-wrap">
                <div class="detail-section-label">Ghi chú</div>
                <p class="detail-note">${escHtml(detailBooking.note)}</p>
            </div>
            ` : ''}
        `;

        const btnUpdate = document.getElementById('btnUpdateStatus');
        if (detailBooking.status === 'PENDING') {
            btnUpdate.style.display = 'block';
            btnUpdate.onclick = () => confirmBookingFromDetail();
        } else {
            btnUpdate.style.display = 'none';
        }

        openDetailModal();
    } catch (err) {
        console.error('Error:', err);
        showToast('Không thể tải chi tiết', true);
    }
}

function openDetailModal() {
    document.getElementById('detailOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
    document.getElementById('detailOverlay').classList.remove('open');
    document.body.style.overflow = '';
    detailBooking = null;
}

async function confirmBooking(id) {
    if (!confirm('Xác nhận yêu cầu dịch vụ này?')) return;
    try {
        await updateBookingStatus(id, 'CONFIRMED');
        showToast('Đã xác nhận yêu cầu');
        fetchBookings();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function confirmBookingFromDetail() {
    if (!detailBooking) return;
    try {
        await updateBookingStatus(detailBooking.id, 'CONFIRMED');
        showToast('Đã xác nhận yêu cầu');
        closeDetailModal();
        fetchBookings();
    } catch (err) {
        showToast(err.message, true);
    }
}

/* ─── UTILITIES ─── */
function formatMoney(amount) {
    if (!amount && amount !== 0) return '—';
    return Number(amount).toLocaleString('vi-VN') + 'đ';
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('vi-VN');
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
}

function getStatusLabel(status) {
    const map = {
        'PENDING': 'Chờ xử lý',
        'CONFIRMED': 'Đã xác nhận',
        'COMPLETED': 'Đã hoàn thành',
        'CANCELLED': 'Đã hủy'
    };
    return map[status] || status || '—';
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, isError = false) {
    const toast = document.getElementById('adminToast');
    const toastMsg = document.getElementById('adminToastMsg');
    toast.classList.remove('show', 'toast-error');
    if (isError) toast.classList.add('toast-error');
    toastMsg.textContent = msg;
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ─── EVENT LISTENERS ─── */
document.getElementById('searchInput').addEventListener('input', debounce(applyFilter, 400));
document.getElementById('filterStatus').addEventListener('change', () => { fetchBookings(); });
document.getElementById('detailClose').addEventListener('click', closeDetailModal);
document.getElementById('btnCloseDetail').addEventListener('click', closeDetailModal);

function debounce(fn, delay) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* ─── INIT ─── */
fetchBookings();
