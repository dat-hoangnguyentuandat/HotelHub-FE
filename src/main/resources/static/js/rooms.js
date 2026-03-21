/* ================================================================
   rooms.js – Trang danh sách phòng chi tiết
   Gọi GET /api/rooms, render card, filter, sort, drawer, booking
================================================================ */

'use strict';

/* ── Room images (fallback theo loại phòng) ── */
const ROOM_IMAGES = {
    'Phòng Tiêu Chuẩn':     'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80',
    'Phòng Vip':             'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600&q=80',
    'Phòng Deluxe':          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80',
    'Phòng Cao Cấp':         'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80',
    'Phòng Connecting room': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=80',
    'Phòng Tổng Thống':      'https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=600&q=80',
    'Phòng Double':          'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80',
};
const ROOM_IMG_DEFAULT = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80';

const AMENITY_ICONS = {
    'WiFi':       '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><path d="M2 8a11 11 0 0 1 16 0M5.5 11.5a7 7 0 0 1 9 0M8.5 15a3 3 0 0 1 3 0M10 17.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'TV':         '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><rect x="2" y="4" width="16" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 17h6M10 15v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'Điều hòa':  '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><rect x="2" y="4" width="16" height="7" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 14l1 3M10 14v3M15 14l-1 3M5 11h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'Bồn tắm':   '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><path d="M2 11h16v2a5 5 0 0 1-10 0 5 5 0 0 1-6-5V5a2 2 0 1 1 4 0v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'View biển': '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><path d="M2 14c2-2 4-2 6 0s4 2 6 0M2 17c2-2 4-2 6 0s4 2 6 0M5 8a5 5 0 0 1 10 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'Mini bar':  '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><rect x="5" y="2" width="10" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 7h4M8 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'Spa':        '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><path d="M10 3c0 4-5 6-5 10M10 3c0 4 5 6 5 10M7 17h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'Butler':     '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><circle cx="10" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'Jacuzzi':    '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><ellipse cx="10" cy="12" rx="7" ry="4" stroke="currentColor" stroke-width="1.5"/><path d="M7 8V4M10 8V3M13 8V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'Phòng họp': '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><rect x="2" y="5" width="16" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 9h8M6 12h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    'Gia đình':  '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><circle cx="7" cy="5" r="2" stroke="currentColor" stroke-width="1.5"/><circle cx="13" cy="5" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 16c0-2.761 1.791-5 4-5h6c2.209 0 4 2.239 4 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    '2 giường':  '<svg viewBox="0 0 20 20" fill="none" width="13" height="13"><rect x="2" y="9" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="9" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M2 13h16" stroke="currentColor" stroke-width="1.5"/></svg>',
};

const STATUS_MAP = {
    'Trống':       { label: 'Còn phòng',  cls: 'status-available' },
    'Đã đặt':      { label: 'Đã đặt',     cls: 'status-occupied' },
    'Đang dọn':    { label: 'Đang dọn',   cls: 'status-cleaning' },
    'available':   { label: 'Còn phòng',  cls: 'status-available' },
    'occupied':    { label: 'Đã đặt',     cls: 'status-occupied' },
};

const BADGE_MAP = {
    'Phòng Tổng Thống': { text: 'Đặc biệt', gold: true },
    'Phòng Cao Cấp':    { text: 'Hot',       gold: false },
    'Phòng Deluxe':     { text: 'Phổ biến',  gold: false },
};

/* ─── FORMAT helpers ─── */
const DAYS_VI = ['CN','T2','T3','T4','T5','T6','T7'];

function formatVND(n) {
    if (!n && n !== 0) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
    return (n / 1000).toLocaleString('vi-VN') + 'k';
}
function formatVNDFull(n) { return n ? n.toLocaleString('vi-VN') + ' ₫' : '—'; }
function toISO(d) { return d.toISOString().split('T')[0]; }
function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function nightsBetween(ci, co) {
    if (!ci || !co) return 0;
    return Math.max(0, Math.round((new Date(co) - new Date(ci)) / 86400000));
}

/* ─── Toast ─── */
function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => {
        el.classList.add('hiding');
        setTimeout(() => el.remove(), 300);
    }, 3500);
}

/* ──────────────────────────────────────────────────
   STATE
────────────────────────────────────────────────── */
let allRooms = [];
let filtered = [];
let currentPage = 0;
const PAGE_SIZE = 9;
let viewMode = 'grid'; // 'grid' | 'list'
let activeRoom = null; // room được chọn để xem drawer / đặt

let checkinVal  = toISO(new Date());
let checkoutVal = toISO(new Date(Date.now() + 86400000));

const filterState = {
    types:      new Set(),
    amenities:  new Set(),
    priceMin:   0,
    priceMax:   Infinity,
    capacity:   0,
    keyword:    '',
};

/* ──────────────────────────────────────────────────
   INIT
────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initDates();
    fetchRooms();
    initFilters();
    initSearch();
    initSort();
    initViewToggle();
    initDrawer();
    initModal();
    initPagination();
});

/* ─── Dates ─── */
function initDates() {
    const ci = document.getElementById('heroCheckin');
    const co = document.getElementById('heroCheckout');
    const dci = document.getElementById('drawerCheckin');
    const dco = document.getElementById('drawerCheckout');

    if (ci) { ci.value = checkinVal;  ci.min = toISO(new Date()); }
    if (co) { co.value = checkoutVal; co.min = checkinVal; }

    ci?.addEventListener('change', e => {
        checkinVal = e.target.value;
        if (co) { co.min = checkinVal; if (checkoutVal <= checkinVal) { checkoutVal = toISO(new Date(new Date(checkinVal).getTime() + 86400000)); co.value = checkoutVal; } }
        if (dci) dci.value = checkinVal;
        updateDrawerSummary();
    });
    co?.addEventListener('change', e => { checkoutVal = e.target.value; if (dco) dco.value = checkoutVal; updateDrawerSummary(); });

    if (dci) { dci.value = checkinVal; dci.min = toISO(new Date()); }
    if (dco) { dco.value = checkoutVal; dco.min = checkinVal; }
    dci?.addEventListener('change', e => { checkinVal = e.target.value; if (ci) ci.value = checkinVal; if (dco) dco.min = checkinVal; updateDrawerSummary(); });
    dco?.addEventListener('change', e => { checkoutVal = e.target.value; if (co) co.value = checkoutVal; updateDrawerSummary(); });

    document.getElementById('btnHeroSearch')?.addEventListener('click', () => {
        document.querySelector('.rooms-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

/* ──────────────────────────────────────────────────
   FETCH
────────────────────────────────────────────────── */
async function fetchRooms() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/rooms`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        allRooms = await res.json();
        applyFiltersAndRender();
    } catch (e) {
        console.error('[rooms] fetch failed:', e);
        document.getElementById('roomsGrid').innerHTML = '';
        document.getElementById('emptyState').style.display = 'flex';
        document.getElementById('resultsCount').textContent = 'Không thể tải dữ liệu';
    }
}

/* ──────────────────────────────────────────────────
   FILTER & SORT
────────────────────────────────────────────────── */
function applyFiltersAndRender() {
    let rooms = [...allRooms];

    // Keyword
    if (filterState.keyword) {
        const kw = filterState.keyword.toLowerCase();
        rooms = rooms.filter(r =>
            r.roomName?.toLowerCase().includes(kw) ||
            r.roomType?.toLowerCase().includes(kw) ||
            r.description?.toLowerCase().includes(kw)
        );
    }

    // Types
    if (filterState.types.size > 0) {
        rooms = rooms.filter(r => filterState.types.has(r.roomType) || filterState.types.has(r.roomName));
    }

    // Price
    rooms = rooms.filter(r => {
        const p = Number(r.price) || 0;
        return p >= filterState.priceMin && p <= filterState.priceMax;
    });

    // Capacity
    if (filterState.capacity > 0) {
        rooms = rooms.filter(r => (r.capacity || 0) >= filterState.capacity);
    }

    // Amenities
    if (filterState.amenities.size > 0) {
        rooms = rooms.filter(r => {
            const ams = r.amenities || [];
            return [...filterState.amenities].every(a => ams.includes(a));
        });
    }

    // Sort
    const sort = document.getElementById('sortSelect')?.value || 'default';
    if (sort === 'price-asc')      rooms.sort((a,b) => (a.price||0) - (b.price||0));
    else if (sort === 'price-desc') rooms.sort((a,b) => (b.price||0) - (a.price||0));
    else if (sort === 'name-asc')   rooms.sort((a,b) => (a.roomName||'').localeCompare(b.roomName||''));
    else if (sort === 'capacity-desc') rooms.sort((a,b) => (b.capacity||0) - (a.capacity||0));

    filtered = rooms;
    currentPage = 0;
    renderRooms();
}

/* ──────────────────────────────────────────────────
   RENDER
────────────────────────────────────────────────── */
function renderRooms() {
    const grid    = document.getElementById('roomsGrid');
    const empty   = document.getElementById('emptyState');
    const countEl = document.getElementById('resultsCount');
    const pagi    = document.getElementById('pagination');

    const total = filtered.length;
    const start = currentPage * PAGE_SIZE;
    const page  = filtered.slice(start, start + PAGE_SIZE);

    countEl.textContent = total === 0 ? 'Không tìm thấy phòng' : `${total} phòng`;

    if (total === 0) {
        grid.innerHTML = '';
        empty.style.display = 'flex';
        pagi.style.display = 'none';
        return;
    }

    empty.style.display = 'none';
    grid.className = `rooms-grid view-${viewMode}`;
    grid.innerHTML = page.map(r => renderCard(r)).join('');

    // Bind events
    grid.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); openDrawer(Number(btn.dataset.id)); });
    });
    grid.querySelectorAll('.btn-book').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); quickBook(Number(btn.dataset.id)); });
    });
    grid.querySelectorAll('.room-card').forEach(card => {
        card.addEventListener('click', () => openDrawer(Number(card.dataset.id)));
    });

    // Pagination
    renderPagination(total);
}

function renderCard(r) {
    const img      = ROOM_IMAGES[r.roomType] || ROOM_IMAGES[r.roomName] || ROOM_IMG_DEFAULT;
    const badge    = BADGE_MAP[r.roomType] || BADGE_MAP[r.roomName];
    const badgeHtml = badge
        ? `<span class="room-badge ${badge.gold ? 'badge-gold' : ''}">${badge.text}</span>`
        : '';
    const st = STATUS_MAP[r.status] || { label: r.status || 'N/A', cls: 'status-available' };
    const ams   = (r.amenities || []).slice(0, 4);
    const tagsHtml = ams.map(a => `<span class="tag">${a}</span>`).join('');

    if (viewMode === 'list') {
        return `
        <div class="room-card list-card" data-id="${r.id}">
            <div class="room-img-wrap">
                <img class="room-img" src="${img}" alt="${r.roomName}" loading="lazy" />
                ${badgeHtml}
                <span class="room-status-dot ${st.cls}" title="${st.label}"></span>
            </div>
            <div class="room-info">
                <div class="room-info-main">
                    <div class="room-info-top">
                        <div>
                            <h3 class="room-name">${r.roomName || '—'}</h3>
                            <span class="room-type">${r.roomType || ''}</span>
                        </div>
                    </div>
                    <p class="room-desc">${r.description || ''}</p>
                    <div class="room-meta">
                        <div class="room-meta-item">
                            <svg viewBox="0 0 20 20" fill="none" width="13" height="13"><circle cx="10" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                            ${r.capacity || '—'} khách
                        </div>
                        <div class="room-meta-item">
                            <svg viewBox="0 0 20 20" fill="none" width="13" height="13"><rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 8h16" stroke="currentColor" stroke-width="1.5"/></svg>
                            Tầng ${r.floor || '—'}
                        </div>
                    </div>
                    <div class="room-tags">${tagsHtml}</div>
                </div>
                <div class="room-info-side">
                    <div>
                        <span class="room-price">${formatVND(r.price)}<span class="per-night">/đêm</span></span>
                    </div>
                    <div class="room-card-footer">
                        <button class="btn-detail" data-id="${r.id}">Chi tiết</button>
                        <button class="btn-book"   data-id="${r.id}">Đặt ngay</button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // Grid card
    return `
    <div class="room-card" data-id="${r.id}">
        <div class="room-img-wrap">
            <img class="room-img" src="${img}" alt="${r.roomName}" loading="lazy" />
            ${badgeHtml}
            <span class="room-status-dot ${st.cls}" title="${st.label}"></span>
        </div>
        <div class="room-info">
            <div class="room-info-top">
                <div>
                    <h3 class="room-name">${r.roomName || '—'}</h3>
                    <span class="room-type">${r.roomType || ''}</span>
                </div>
                <span class="room-price">${formatVND(r.price)}<span class="per-night">/đêm</span></span>
            </div>
            <div class="room-meta">
                <div class="room-meta-item">
                    <svg viewBox="0 0 20 20" fill="none" width="13" height="13"><circle cx="10" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    ${r.capacity || '—'} khách
                </div>
                <div class="room-meta-item">
                    <svg viewBox="0 0 20 20" fill="none" width="13" height="13"><rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 8h16" stroke="currentColor" stroke-width="1.5"/></svg>
                    Tầng ${r.floor || '—'}
                </div>
            </div>
            <p class="room-desc">${r.description || ''}</p>
            <div class="room-tags">${tagsHtml}</div>
            <div class="room-card-footer">
                <button class="btn-detail" data-id="${r.id}" onclick="event.stopPropagation()">Chi tiết</button>
                <button class="btn-book"   data-id="${r.id}" onclick="event.stopPropagation()">Đặt ngay</button>
            </div>
        </div>
    </div>`;
}

/* ──────────────────────────────────────────────────
   DRAWER
────────────────────────────────────────────────── */
function openDrawer(id) {
    activeRoom = allRooms.find(r => r.id === id);
    if (!activeRoom) return;
    const r = activeRoom;

    document.getElementById('drawerImg').src     = ROOM_IMAGES[r.roomType] || ROOM_IMAGES[r.roomName] || ROOM_IMG_DEFAULT;
    document.getElementById('drawerImg').alt     = r.roomName;
    document.getElementById('drawerName').textContent  = r.roomName || '—';
    document.getElementById('drawerType').textContent  = r.roomType || '';
    document.getElementById('drawerPrice').textContent = formatVND(r.price);
    document.getElementById('drawerDesc').textContent  = r.description || 'Không có mô tả.';
    document.getElementById('drawerCapacity').textContent = r.capacity || '—';
    document.getElementById('drawerFloor').textContent    = r.floor ? `${r.floor}` : '—';

    const st = STATUS_MAP[r.status] || { label: r.status || '—' };
    document.getElementById('drawerStatus').textContent = st.label;

    const badge = BADGE_MAP[r.roomType] || BADGE_MAP[r.roomName];
    const badgeEl = document.getElementById('drawerBadge');
    if (badge) { badgeEl.textContent = badge.text; badgeEl.className = `drawer-badge${badge.gold ? ' badge-gold' : ''}`; badgeEl.style.display = ''; }
    else { badgeEl.style.display = 'none'; }

    const amsEl = document.getElementById('drawerAmenities');
    const ams = r.amenities || [];
    amsEl.innerHTML = ams.length
        ? ams.map(a => `<span class="amenity-tag">${AMENITY_ICONS[a] || ''}${a}</span>`).join('')
        : '<span style="color:#9c877d;font-size:13px;">Không có thông tin tiện nghi.</span>';

    updateDrawerSummary();
    document.getElementById('drawerOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    document.getElementById('drawerOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

function updateDrawerSummary() {
    const nights = nightsBetween(checkinVal, checkoutVal);
    const el = document.getElementById('dbbSummary');
    if (!el) return;
    if (!activeRoom || nights <= 0) {
        el.textContent = 'Chọn ngày để xem tổng tiền';
        return;
    }
    const total = (Number(activeRoom.price) || 0) * nights;
    el.innerHTML = `<strong>${nights} đêm</strong> × ${formatVND(activeRoom.price)} = <strong style="color:#e55200">${formatVNDFull(total)}</strong>`;
}

function initDrawer() {
    document.getElementById('drawerClose')?.addEventListener('click', closeDrawer);
    document.getElementById('drawerOverlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeDrawer(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

    document.getElementById('btnDrawerBook')?.addEventListener('click', () => {
        if (!activeRoom) return;
        closeDrawer();
        openModal(activeRoom);
    });
}

/* ──────────────────────────────────────────────────
   MODAL & BOOKING
────────────────────────────────────────────────── */
function quickBook(id) {
    const room = allRooms.find(r => r.id === id);
    if (room) openModal(room);
}

function openModal(room) {
    activeRoom = room;
    const nights = nightsBetween(checkinVal, checkoutVal) || 1;
    const total  = (Number(room.price) || 0) * nights;

    document.getElementById('mRoomName').textContent = room.roomName || '—';
    document.getElementById('mCheckin').textContent  = fmtDate(checkinVal);
    document.getElementById('mCheckout').textContent = fmtDate(checkoutVal);
    document.getElementById('mNights').textContent   = `${nights} đêm`;
    document.getElementById('mTotal').textContent    = formatVNDFull(total);

    // Pre-fill user info
    try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        if (u) {
            if (document.getElementById('mName') && !document.getElementById('mName').value)
                document.getElementById('mName').value = u.fullName || '';
            if (document.getElementById('mEmail') && !document.getElementById('mEmail').value)
                document.getElementById('mEmail').value = u.email || '';
        }
    } catch (_) {}

    ['errName','errPhone','errEmail'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

function initModal() {
    document.getElementById('modalClose')?.addEventListener('click', closeModal);
    document.getElementById('btnCancelModal')?.addEventListener('click', closeModal);
    document.getElementById('modalOverlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

    document.getElementById('btnConfirmBooking')?.addEventListener('click', submitBooking);
}

async function submitBooking() {
    const name  = document.getElementById('mName')?.value.trim();
    const phone = document.getElementById('mPhone')?.value.trim();
    const email = document.getElementById('mEmail')?.value.trim();
    const note  = document.getElementById('mNote')?.value.trim();

    let valid = true;
    const setErr = (id, msg) => { const el = document.getElementById(id); if (el) el.textContent = msg; if (msg) valid = false; };
    setErr('errName',  !name  ? 'Vui lòng nhập họ và tên.' : '');
    setErr('errPhone', !phone ? 'Vui lòng nhập số điện thoại.' : !/^0\d{8,10}$/.test(phone) ? 'Số điện thoại không hợp lệ.' : '');
    setErr('errEmail', !email ? 'Vui lòng nhập email.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Email không hợp lệ.' : '');
    if (!valid) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
        showToast('Bạn cần đăng nhập để đặt phòng.', 'error');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
        return;
    }

    const nights = nightsBetween(checkinVal, checkoutVal) || 1;
    const btn = document.getElementById('btnConfirmBooking');
    btn.disabled = true;
    btn.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16"><circle cx="10" cy="10" r="7" stroke="white" stroke-width="2" stroke-dasharray="40" stroke-dashoffset="20"/></svg> Đang xử lý…';

    try {
        const payload = {
            roomType:    activeRoom.roomType || activeRoom.roomName,
            roomId:      activeRoom.id,
            guestName:   name,
            guestPhone:  phone,
            guestEmail:  email,
            checkIn:     checkinVal,
            checkOut:    checkoutVal,
            nights,
            adults:      2,
            children:    0,
            rooms:       1,
            pricePerNight: Number(activeRoom.price),
            totalAmount:   Number(activeRoom.price) * nights,
            note,
        };

        const res = await fetch(`${BACKEND_URL}/api/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok) {
            closeModal();
            showToast('Đặt phòng thành công! Chuyển đến trang thanh toán…', 'success');
            const bookingId = data.id || data.bookingId;
            const sessionData = {
                bookingId,
                roomName:     activeRoom.roomName,
                roomBadge:    BADGE_MAP[activeRoom.roomType]?.text || '',
                roomImg:      ROOM_IMAGES[activeRoom.roomType] || ROOM_IMG_DEFAULT,
                checkin:      fmtDate(checkinVal),
                checkout:     fmtDate(checkoutVal),
                nights,
                adults:       2,
                children:     0,
                rooms:        1,
                pricePerNight: Number(activeRoom.price),
                guestName:    name,
                guestPhone:   phone,
                guestEmail:   email,
            };
            sessionStorage.setItem('pendingBooking', JSON.stringify(sessionData));
            setTimeout(() => { window.location.href = `/payment?bookingId=${bookingId}`; }, 1500);
        } else {
            const msg = data.message || (data.fieldErrors ? Object.values(data.fieldErrors).join(', ') : 'Đặt phòng thất bại.');
            showToast(msg, 'error');
        }
    } catch (e) {
        showToast('Không thể kết nối đến máy chủ.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M4 10l5 5 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Xác nhận đặt phòng';
    }
}

/* ──────────────────────────────────────────────────
   PAGINATION
────────────────────────────────────────────────── */
function renderPagination(total) {
    const pagi = document.getElementById('pagination');
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) { pagi.style.display = 'none'; return; }
    pagi.style.display = 'flex';

    const nums = document.getElementById('pageNumbers');
    nums.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-num${i === currentPage ? ' active' : ''}`;
        btn.textContent = i + 1;
        btn.addEventListener('click', () => { currentPage = i; renderRooms(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        nums.appendChild(btn);
    }
    document.getElementById('btnPrevPage').disabled = currentPage === 0;
    document.getElementById('btnNextPage').disabled = currentPage >= totalPages - 1;
}

function initPagination() {
    document.getElementById('btnPrevPage')?.addEventListener('click', () => {
        if (currentPage > 0) { currentPage--; renderRooms(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
    document.getElementById('btnNextPage')?.addEventListener('click', () => {
        if (currentPage < Math.ceil(filtered.length / PAGE_SIZE) - 1) { currentPage++; renderRooms(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
}

/* ──────────────────────────────────────────────────
   FILTERS
────────────────────────────────────────────────── */
function initFilters() {
    // Type checkboxes
    document.querySelectorAll('#filterTypes input').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) filterState.types.add(cb.value);
            else filterState.types.delete(cb.value);
            applyFiltersAndRender();
        });
    });

    // Amenity checkboxes
    document.querySelectorAll('#filterAmenities input').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) filterState.amenities.add(cb.value);
            else filterState.amenities.delete(cb.value);
            applyFiltersAndRender();
        });
    });

    // Price
    let priceTimer;
    document.getElementById('priceMin')?.addEventListener('input', e => {
        clearTimeout(priceTimer);
        priceTimer = setTimeout(() => { filterState.priceMin = Number(e.target.value) || 0; applyFiltersAndRender(); }, 400);
    });
    document.getElementById('priceMax')?.addEventListener('input', e => {
        clearTimeout(priceTimer);
        priceTimer = setTimeout(() => { filterState.priceMax = Number(e.target.value) || Infinity; applyFiltersAndRender(); }, 400);
    });

    // Capacity
    document.querySelectorAll('#filterCapacity .cap-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#filterCapacity .cap-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterState.capacity = Number(btn.dataset.val) || 0;
            applyFiltersAndRender();
        });
    });

    // Reset
    document.getElementById('btnResetFilter')?.addEventListener('click', resetFilters);
    document.getElementById('btnClearFilter')?.addEventListener('click', resetFilters);
}

function resetFilters() {
    filterState.types.clear();
    filterState.amenities.clear();
    filterState.priceMin = 0;
    filterState.priceMax = Infinity;
    filterState.capacity = 0;
    filterState.keyword  = '';

    document.querySelectorAll('#filterTypes input, #filterAmenities input').forEach(cb => cb.checked = false);
    document.querySelectorAll('#filterCapacity .cap-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('#filterCapacity .cap-btn[data-val="0"]')?.classList.add('active');
    const pi = document.getElementById('priceMin'); if (pi) pi.value = '';
    const pa = document.getElementById('priceMax'); if (pa) pa.value = '';
    const si = document.getElementById('roomSearch'); if (si) si.value = '';
    applyFiltersAndRender();
}

/* ─── Search ─── */
function initSearch() {
    let timer;
    document.getElementById('roomSearch')?.addEventListener('input', e => {
        clearTimeout(timer);
        timer = setTimeout(() => { filterState.keyword = e.target.value.trim(); applyFiltersAndRender(); }, 300);
    });
}

/* ─── Sort ─── */
function initSort() {
    document.getElementById('sortSelect')?.addEventListener('change', applyFiltersAndRender);
}

/* ─── View toggle ─── */
function initViewToggle() {
    document.getElementById('btnGrid')?.addEventListener('click', () => {
        viewMode = 'grid';
        document.getElementById('btnGrid').classList.add('active');
        document.getElementById('btnList').classList.remove('active');
        renderRooms();
    });
    document.getElementById('btnList')?.addEventListener('click', () => {
        viewMode = 'list';
        document.getElementById('btnList').classList.add('active');
        document.getElementById('btnGrid').classList.remove('active');
        renderRooms();
    });
}
