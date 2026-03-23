/* ================================================================
   services.js  –  Trang dịch vụ công khai
   API: GET /api/services  → List<AdditionalServiceResponse>
   Fields: id, name, category, price, unit, description, imageUrl, status
================================================================ */

(function () {
    'use strict';

    /* ── Cấu hình ── */
    const BACKEND = (document.querySelector('meta[name="backend-url"]') || {}).content
        || 'http://localhost:8081';

    /* ── State ── */
    let allServices  = [];
    let filtered     = [];
    let activeCategory = '';
    let searchQuery  = '';
    let sortMode     = 'default';

    /* ── DOM refs ── */
    const grid       = document.getElementById('svcGrid');
    const resultCount = document.getElementById('svcResultCount');
    const emptyState = document.getElementById('svcEmpty');
    const searchInput = document.getElementById('svcSearch');
    const sortSelect  = document.getElementById('svcSort');
    const tabsWrap    = document.getElementById('categoryTabs');
    const emptyReset  = document.getElementById('svcEmptyReset');

    /* ── Modal ── */
    const overlay     = document.getElementById('svcModalOverlay');
    const modalClose  = document.getElementById('svcModalClose');
    const modalImg    = document.getElementById('svcModalImg');
    const modalBadge  = document.getElementById('svcModalBadge');
    const modalCat    = document.getElementById('svcModalCat');
    const modalTitle  = document.getElementById('svcModalTitle');
    const modalDesc   = document.getElementById('svcModalDesc');
    const modalPrice  = document.getElementById('svcModalPrice');
    const modalUnit   = document.getElementById('svcModalUnit');
    const modalBtnBook = document.getElementById('svcModalBtnBook');

    /* ── Booking Modal ── */
    const bookingOverlay = document.getElementById('bookingModalOverlay');
    const bookingModalClose = document.getElementById('bookingModalClose');
    const bookingForm = document.getElementById('bookingForm');
    const bookingBtnCancel = document.getElementById('bookingBtnCancel');
    const bookingServiceName = document.getElementById('bookingServiceName');
    const bookingServicePrice = document.getElementById('bookingServicePrice');
    const bookingTotalAmount = document.getElementById('bookingTotalAmount');
    const bookingQuantity = document.getElementById('bookingQuantity');
    
    let currentService = null;

    /* ════════════════════════════════════════
       FETCH DATA
    ════════════════════════════════════════ */
    async function loadServices() {
        try {
            const res = await fetch(`${BACKEND}/api/services`, {
                headers: { 'Accept': 'application/json' }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            allServices = await res.json();
            applyFilters();
        } catch (err) {
            console.error('[Services] Không thể tải dịch vụ:', err);
            showError();
        }
    }

    /* ════════════════════════════════════════
       FILTER + SORT
    ════════════════════════════════════════ */
    function applyFilters() {
        const q = searchQuery.toLowerCase().trim();

        filtered = allServices.filter(s => {
            const matchCat    = !activeCategory || s.category === activeCategory;
            const matchSearch = !q
                || s.name.toLowerCase().includes(q)
                || (s.description || '').toLowerCase().includes(q)
                || (s.category || '').toLowerCase().includes(q);
            return matchCat && matchSearch;
        });

        /* Sort */
        if (sortMode === 'price-asc') {
            filtered.sort((a, b) => Number(a.price) - Number(b.price));
        } else if (sortMode === 'price-desc') {
            filtered.sort((a, b) => Number(b.price) - Number(a.price));
        } else if (sortMode === 'name-asc') {
            filtered.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        }

        renderGrid();
    }

    /* ════════════════════════════════════════
       RENDER GRID
    ════════════════════════════════════════ */
    function renderGrid() {
        /* Đếm kết quả */
        const total = allServices.length;
        const shown = filtered.length;
        resultCount.textContent = shown < total
            ? `Hiển thị ${shown} / ${total} dịch vụ`
            : `${total} dịch vụ`;

        if (filtered.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        grid.innerHTML = filtered.map(s => cardHTML(s)).join('');

        /* Gắn click mở modal */
        grid.querySelectorAll('.svc-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = Number(card.dataset.id);
                const svc = allServices.find(s => s.id === id);
                if (svc) openModal(svc);
            });
            /* nút "Xem chi tiết" bên trong */
            card.querySelector('.svc-card-btn')?.addEventListener('click', e => {
                e.stopPropagation();
                const id = Number(card.dataset.id);
                const svc = allServices.find(s => s.id === id);
                if (svc) openModal(svc);
            });
        });
    }

    /* ── HTML một card ── */
    function cardHTML(s) {
        const badgeClass = categoryBadgeClass(s.category);
        const imgTag = s.imageUrl
            ? `<img class="svc-card-img" src="${esc(resolveImg(s.imageUrl))}"
                    alt="${esc(s.name)}"
                    loading="lazy"
                    onerror="this.parentElement.innerHTML=placeholderSVG()">`
            : `<div class="svc-card-img-placeholder">${iconForCategory(s.category)}</div>`;

        return `
        <article class="svc-card" data-id="${s.id}" tabindex="0"
                 role="button" aria-label="${esc(s.name)}">
            <div class="svc-card-img-wrap">
                ${imgTag}
                <span class="svc-card-badge ${badgeClass}">${esc(s.category)}</span>
            </div>
            <div class="svc-card-body">
                <h3 class="svc-card-name">${esc(s.name)}</h3>
                <p class="svc-card-desc">${esc(s.description || 'Xem chi tiết để biết thêm thông tin.')}</p>
                <div class="svc-card-footer">
                    <div class="svc-card-price-wrap">
                        <span class="svc-card-price">${fmtVND(s.price)}</span>
                        ${s.unit ? `<span class="svc-card-unit">/ ${esc(s.unit)}</span>` : ''}
                    </div>
                    <button class="svc-card-btn">Xem chi tiết</button>
                </div>
            </div>
        </article>`;
    }

    /* ════════════════════════════════════════
       MODAL
    ════════════════════════════════════════ */
    function openModal(s) {
        const badgeClass = categoryBadgeClass(s.category);

        /* Ảnh */
        if (s.imageUrl) {
            modalImg.src = resolveImg(s.imageUrl);
            modalImg.alt = s.name;
            modalImg.style.display = 'block';
        } else {
            modalImg.style.display = 'none';
        }

        /* Badge */
        modalBadge.textContent  = s.category;
        modalBadge.className    = `svc-modal-badge ${badgeClass}`;

        /* Text */
        modalCat.textContent    = s.category;
        modalTitle.textContent  = s.name;
        modalDesc.textContent   = s.description || 'Không có mô tả chi tiết.';
        modalPrice.textContent  = fmtVND(s.price);
        modalUnit.textContent   = s.unit ? `/ ${s.unit}` : '';

        /* Nút Đặt dịch vụ */
        modalBtnBook.onclick = () => {
            closeModal();
            currentService = s;
            openBookingModal(s);
        };

        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        modalClose.focus();
    }

    function closeModal() {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    /* ════════════════════════════════════════
       BOOKING MODAL
    ════════════════════════════════════════ */
    function openBookingModal(service) {
        // Kiểm tra đăng nhập
        const token = localStorage.getItem('accessToken');
        if (!token) {
            showToast('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để đặt dịch vụ', 'info');
            setTimeout(() => {
                window.location.href = '/login?redirect=/services';
            }, 1500);
            return;
        }

        // Hiển thị thông tin dịch vụ
        bookingServiceName.textContent = service.name;
        bookingServicePrice.textContent = fmtVND(service.price) + (service.unit ? ` / ${service.unit}` : '');
        
        // Tính tổng tiền
        updateTotalAmount(service.price, 1);
        
        // Reset form
        bookingForm.reset();
        bookingQuantity.value = 1;
        
        // Hiển thị modal
        bookingOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeBookingModal() {
        bookingOverlay.style.display = 'none';
        document.body.style.overflow = '';
        currentService = null;
    }

    function updateTotalAmount(price, quantity) {
        const total = Number(price) * Number(quantity);
        bookingTotalAmount.textContent = fmtVND(total);
    }

    /* ════════════════════════════════════════
       BOOKING FORM SUBMIT
    ════════════════════════════════════════ */
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentService) return;
        
        const formData = {
            serviceId: currentService.id,
            serviceName: currentService.name,
            quantity: Number(bookingQuantity.value),
            guestName: document.getElementById('bookingGuestName').value.trim(),
            guestPhone: document.getElementById('bookingGuestPhone').value.trim(),
            guestEmail: document.getElementById('bookingGuestEmail').value.trim(),
            note: document.getElementById('bookingNote').value.trim(),
            totalAmount: Number(currentService.price) * Number(bookingQuantity.value)
        };

        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${BACKEND}/api/services/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.message || 'Không thể đặt dịch vụ');
            }

            const result = await res.json();
            
            // Đóng modal
            closeBookingModal();
            
            // Hiển thị toast thành công
            showToast(
                'Đặt dịch vụ thành công!',
                `Mã đặt: ${result.bookingCode || 'N/A'}. Chúng tôi sẽ liên hệ với bạn sớm nhất.`,
                'success'
            );
            
        } catch (err) {
            console.error('[Booking] Error:', err);
            showToast('Đặt dịch vụ thất bại', err.message, 'error');
        }
    });

    /* ════════════════════════════════════════
       BOOKING MODAL EVENT LISTENERS
    ════════════════════════════════════════ */
    bookingModalClose.addEventListener('click', closeBookingModal);
    bookingBtnCancel.addEventListener('click', closeBookingModal);
    bookingOverlay.addEventListener('click', (e) => {
        if (e.target === bookingOverlay) closeBookingModal();
    });

    // Cập nhật tổng tiền khi thay đổi số lượng
    bookingQuantity.addEventListener('input', () => {
        if (currentService) {
            updateTotalAmount(currentService.price, bookingQuantity.value);
        }
    });

    /* ════════════════════════════════════════
       EVENT LISTENERS
    ════════════════════════════════════════ */
    /* Tabs */
    tabsWrap.addEventListener('click', e => {
        const tab = e.target.closest('.svc-tab');
        if (!tab) return;
        tabsWrap.querySelectorAll('.svc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeCategory = tab.dataset.cat;
        applyFilters();
    });

    /* Keyboard trên tab */
    tabsWrap.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') e.target.click();
    });

    /* Search (debounce 300ms) */
    let searchTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchQuery = searchInput.value;
            applyFilters();
        }, 300);
    });

    /* Sort */
    sortSelect.addEventListener('change', () => {
        sortMode = sortSelect.value;
        applyFilters();
    });

    /* Reset empty */
    emptyReset.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        activeCategory = '';
        sortMode = 'default';
        sortSelect.value = 'default';
        tabsWrap.querySelectorAll('.svc-tab').forEach(t => t.classList.remove('active'));
        tabsWrap.querySelector('.svc-tab[data-cat=""]').classList.add('active');
        applyFilters();
    });

    /* Modal đóng */
    modalClose.addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });

    /* Keyboard trên card */
    document.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.classList.contains('svc-card')) {
            e.target.click();
        }
    });

    /* ════════════════════════════════════════
       HELPERS
    ════════════════════════════════════════ */
    function fmtVND(v) {
        return Number(v).toLocaleString('vi-VN') + ' đ';
    }

    function esc(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function resolveImg(url) {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${BACKEND}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    function categoryBadgeClass(cat) {
        const map = {
            'Gói ưu đãi':    'svc-badge-goi-uu-dai',
            'Ẩm thực':       'svc-badge-am-thuc',
            'Spa & Làm đẹp': 'svc-badge-spa',
            'Vé tham quan':  'svc-badge-ve-tham-quan',
            'Vận chuyển':    'svc-badge-van-chuyen',
        };
        return map[cat] || 'svc-badge-khac';
    }

    function iconForCategory(cat) {
        const icons = {
            'Gói ưu đãi':    '🎁',
            'Ẩm thực':       '🍽️',
            'Spa & Làm đẹp': '💆',
            'Vé tham quan':  '🎫',
            'Vận chuyển':    '🚗',
            'Dịch vụ khác':  '⭐',
        };
        const icon = icons[cat] || '⭐';
        return `<svg viewBox="0 0 60 60" width="48" height="48" fill="none">
            <text x="30" y="42" font-size="32" text-anchor="middle">${icon}</text>
        </svg>`;
    }

    /* Placeholder khi ảnh lỗi */
    window.placeholderSVG = function () {
        return `<div class="svc-card-img-placeholder">${iconForCategory('')}</div>`;
    };

    function showError() {
        grid.innerHTML = `
            <div style="grid-column:1/-1; padding:60px 20px; text-align:center; color:#9c877d; font-size:14px;">
                <svg viewBox="0 0 64 64" fill="none" width="48" height="48" style="margin:0 auto 16px;display:block;">
                    <circle cx="32" cy="32" r="30" stroke="#e8ddd8" stroke-width="2"/>
                    <path d="M32 20v14M32 40v2" stroke="#c9b5a8" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
                Không thể tải danh sách dịch vụ. Vui lòng thử lại sau.
            </div>`;
        resultCount.textContent = '';
    }

    /* ════════════════════════════════════════
       TOAST NOTIFICATION
    ════════════════════════════════════════ */
    function showToast(title, message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" fill="#f0fdf4" stroke="#22c55e"/>
                <path d="M9 12l2 2 4-4" stroke="#22c55e" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
            error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" fill="#fef2f2" stroke="#ef4444"/>
                <path d="M12 8v4M12 16v.5" stroke="#ef4444" stroke-linecap="round"/>
            </svg>`,
            info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" fill="#eff6ff" stroke="#3b82f6"/>
                <path d="M12 12v4M12 8v.5" stroke="#3b82f6" stroke-linecap="round"/>
            </svg>`
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || icons.info}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" aria-label="Đóng">
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        `;

        container.appendChild(toast);

        // Nút đóng
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        });

        // Tự động đóng sau 5 giây
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('hiding');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    /* ── Khởi động ── */
    loadServices();

})();
