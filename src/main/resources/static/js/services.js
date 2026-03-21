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
            /* Chuyển sang trang đặt phòng với intent */
            window.location.href = `/?service=${encodeURIComponent(s.name)}`;
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

    /* ── Khởi động ── */
    loadServices();

})();
