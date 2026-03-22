/* ==========================================================
   reviews.js  –  Trang đánh giá công khai – HotelHub
   API: GET /api/reviews/public (list)
        GET /api/reviews/public/stats
        POST /api/reviews (tạo mới)
========================================================== */

(function () {
    'use strict';

    const API_BASE = (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : 'http://localhost:8081';
    const API_PUB  = API_BASE + '/api/reviews/public';
    const API_STATS = API_PUB + '/stats';
    const API_POST  = API_BASE + '/api/reviews';

    /* ── State ── */
    let currentPage    = 0;
    let totalPages     = 1;
    const PAGE_SIZE    = 12;
    let filterRating   = null;   // null | 1|2|3|4|5
    let filterKeyword  = '';
    let sortMode       = 'newest';

    /* ── Write-form state ── */
    let mainRating    = 0;
    const subRatings  = {
        roomRating: 0,
        serviceRating: 0,
        locationRating: 0,
        cleanlinessRating: 0,
        amenitiesRating: 0,
        valueRating: 0
    };

    let searchTimer = null;

    /* ══════════════════════════════════════════════════════════
       ENTRY POINT
    ══════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', function () {
        loadStats();
        loadReviews(0);
        bindToolbar();
        bindWriteModal();
    });

    /* ══════════════════════════════════════════════════════════
       STATS
    ══════════════════════════════════════════════════════════ */
    function loadStats() {
        apiFetch(API_STATS).then(function (data) {
            renderHeroScore(data);
            renderStatsCard(data);
        }).catch(function () {
            /* silently skip – table will still load */
        });
    }

    function renderHeroScore(d) {
        var avg = +(d.overallAvg || 0).toFixed(1);
        setText('heroScoreNum', avg || '—');
        document.getElementById('heroStars').innerHTML = starsHtml(avg, 18);
        setText('heroTotal', (d.approvedCount || 0) + ' đánh giá');
    }

    function renderStatsCard(d) {
        var avg = +(d.overallAvg || 0).toFixed(1);

        /* big score */
        setText('scoreBig', avg || '—');
        document.getElementById('scoreStars').innerHTML = starsHtml(avg, 20);
        setText('scoreLabel', ratingLabel(avg) + ' (' + (d.approvedCount || 0) + ' đánh giá)');

        /* bar rows */
        var bars = [
            { star: 5, pct: d.pct5Star || 0 },
            { star: 4, pct: d.pct4Star || 0 },
            { star: 3, pct: d.pct3Star || 0 },
            { star: 2, pct: d.pct2Star || 0 },
            { star: 1, pct: d.pct1Star || 0 }
        ];
        var barsHtml = bars.map(function (b) {
            return '<div class="rv-bar-row">' +
                '<span class="rv-bar-label">' + b.star +
                '<svg viewBox="0 0 14 14" width="10" height="10" fill="#f5a623"><path d="M7 1l1.545 3.09L12 4.635l-2.5 2.437.59 3.428L7 8.77 3.91 10.5l.59-3.428L2 4.635l3.455-.545L7 1z"/></svg>' +
                '</span>' +
                '<div class="rv-bar-track"><div class="rv-bar-fill" style="width:' + b.pct.toFixed(1) + '%"></div></div>' +
                '<span class="rv-bar-pct">' + b.pct.toFixed(0) + '%</span>' +
                '</div>';
        }).join('');
        document.getElementById('starBars').innerHTML = barsHtml;

        /* criteria */
        var criteria = [
            { key: 'avgRoom',         label: 'Phòng ở',   val: d.avgRoom },
            { key: 'avgService',      label: 'Dịch vụ',   val: d.avgService },
            { key: 'avgLocation',     label: 'Vị trí',    val: d.avgLocation },
            { key: 'avgCleanliness',  label: 'Sạch sẽ',   val: d.avgCleanliness },
            { key: 'avgAmenities',    label: 'Tiện nghi',  val: d.avgAmenities },
            { key: 'avgValue',        label: 'Giá trị',   val: d.avgValue }
        ];
        var critHtml = criteria.map(function (c) {
            var v = +(c.val || 0).toFixed(1);
            var pct = (v / 5 * 100).toFixed(0);
            return '<div class="rv-criterion">' +
                '<span class="rv-criterion-label">' + esc(c.label) + '</span>' +
                '<span class="rv-criterion-val">' + (v || '—') + '</span>' +
                '<div class="rv-criterion-bar"><div class="rv-criterion-bar-fill" style="width:' + pct + '%"></div></div>' +
                '</div>';
        }).join('');
        document.getElementById('criteriaRow').innerHTML = critHtml;
    }

    /* ══════════════════════════════════════════════════════════
       LOAD & RENDER REVIEWS
    ══════════════════════════════════════════════════════════ */
    function loadReviews(page) {
        currentPage = page;

        var params = 'page=' + page + '&size=' + PAGE_SIZE;
        if (filterRating && filterRating !== '1-2') params += '&rating=' + filterRating;
        if (filterKeyword) params += '&keyword=' + encodeURIComponent(filterKeyword);

        showLoading();

        apiFetch(API_PUB + '?' + params).then(function (data) {
            var items = data.content || [];

            /* client-side filter 1-2 sao */
            if (filterRating === '1-2') {
                items = items.filter(function (r) { return r.rating <= 2; });
            }

            /* client-side sort */
            items = sortItems(items);

            totalPages = data.totalPages || 1;
            renderGrid(items, data.totalElements || 0);
            renderPagination();
        }).catch(function () {
            showError();
        });
    }

    function sortItems(items) {
        if (sortMode === 'highest') {
            return items.slice().sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
        }
        if (sortMode === 'lowest') {
            return items.slice().sort(function (a, b) { return (a.rating || 0) - (b.rating || 0); });
        }
        /* newest – giữ nguyên thứ tự API */
        return items;
    }

    function showLoading() {
        document.getElementById('rvGrid').innerHTML =
            '<div class="rv-loading"><div class="rv-spinner"></div><span>Đang tải đánh giá...</span></div>';
    }

    function showError() {
        document.getElementById('rvGrid').innerHTML =
            '<div class="rv-empty">' +
            '<svg viewBox="0 0 48 48" fill="none" width="56" height="56"><rect x="4" y="8" width="40" height="32" rx="4" stroke="#d4c5be" stroke-width="2"/><path d="M4 16h40M16 8v8M32 8v8" stroke="#d4c5be" stroke-width="2" stroke-linecap="round"/><circle cx="24" cy="30" r="4" stroke="#d4c5be" stroke-width="2"/></svg>' +
            '<p class="rv-empty-title">Không thể tải đánh giá</p>' +
            '<p>Vui lòng thử lại sau.</p>' +
            '</div>';
    }

    function renderGrid(items, total) {
        var grid = document.getElementById('rvGrid');
        setText('rvResultCount', total ? total + ' đánh giá' : '');

        if (!items.length) {
            grid.innerHTML =
                '<div class="rv-empty">' +
                '<svg viewBox="0 0 48 48" fill="none" width="56" height="56"><path d="M24 4l5.09 10.26L40 15.83l-8 7.79L33.81 35 24 29.77 14.19 35 16 23.62l-8-7.79 10.91-1.57L24 4z" stroke="#d4c5be" stroke-width="2" stroke-linejoin="round"/></svg>' +
                '<p class="rv-empty-title">Chưa có đánh giá nào</p>' +
                '<p>Hãy là người đầu tiên chia sẻ trải nghiệm!</p>' +
                '</div>';
            return;
        }

        grid.innerHTML = items.map(buildCard).join('');

        /* Bind click vào từng card */
        grid.querySelectorAll('.rv-card').forEach(function (card) {
            card.addEventListener('click', function () {
                openDetail(card.dataset.id);
            });
        });
    }

    function buildCard(r) {
        var initial = (r.guestName || r.userFullName || '?')[0].toUpperCase();
        var name    = esc(r.guestName || r.userFullName || 'Ẩn danh');
        var room    = esc(r.roomType  || '');
        var date    = fmtDate(r.createdAt);
        var rating  = r.rating || 0;
        var title   = r.title   ? '<p class="rv-card-title">' + esc(r.title) + '</p>' : '';
        var comment = r.comment ? '<p class="rv-card-comment">' + esc(r.comment) + '</p>' : '';
        var replyBadge = r.hasReply
            ? '<div class="rv-card-has-reply"><svg viewBox="0 0 24 24" fill="none"><path d="M3 10h11l-4-4m4 4l-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Có phản hồi</div>'
            : '';

        return '<div class="rv-card" data-id="' + r.id + '">' +
            '<div class="rv-card-top">' +
                '<div class="rv-card-author">' +
                    '<div class="rv-card-avatar">' + initial + '</div>' +
                    '<div>' +
                        '<div class="rv-card-name">' + name + '</div>' +
                        '<div class="rv-card-room">' + (room || '&nbsp;') + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="rv-card-badge">' +
                    '<span class="rv-card-badge-num">' + rating + '</span>' +
                    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
                '</div>' +
            '</div>' +
            '<div class="rv-card-stars">' + starsHtml(rating, 14) + '</div>' +
            '<div class="rv-card-date">' + date + '</div>' +
            title +
            comment +
            '<div class="rv-card-footer">' +
                '<span class="rv-card-read-more">Xem thêm →</span>' +
                replyBadge +
            '</div>' +
            '</div>';
    }

    /* ══════════════════════════════════════════════════════════
       PAGINATION
    ══════════════════════════════════════════════════════════ */
    function renderPagination() {
        var el = document.getElementById('rvPagination');
        if (totalPages <= 1) { el.innerHTML = ''; return; }

        var html = '<button class="rv-page-btn" onclick="rvGoPage(' + (currentPage - 1) + ')"' +
            (currentPage === 0 ? ' disabled' : '') + '>' +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>';

        buildPageRange(currentPage, totalPages).forEach(function (p) {
            if (p === '…') {
                html += '<button class="rv-page-btn" style="cursor:default;color:#9a7b6d" disabled>…</button>';
            } else {
                html += '<button class="rv-page-btn' + (p === currentPage ? ' active' : '') +
                    '" onclick="rvGoPage(' + p + ')">' + (p + 1) + '</button>';
            }
        });

        html += '<button class="rv-page-btn" onclick="rvGoPage(' + (currentPage + 1) + ')"' +
            (currentPage >= totalPages - 1 ? ' disabled' : '') + '>' +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>';

        el.innerHTML = html;
    }

    function buildPageRange(cur, total) {
        if (total <= 7) {
            var a = [];
            for (var i = 0; i < total; i++) a.push(i);
            return a;
        }
        var pages = [0];
        if (cur > 2) pages.push('…');
        for (var j = Math.max(1, cur - 1); j <= Math.min(total - 2, cur + 1); j++) pages.push(j);
        if (cur < total - 3) pages.push('…');
        pages.push(total - 1);
        return pages;
    }

    function rvGoPage(p) {
        if (p < 0 || p >= totalPages) return;
        loadReviews(p);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ══════════════════════════════════════════════════════════
       TOOLBAR BINDINGS
    ══════════════════════════════════════════════════════════ */
    function bindToolbar() {
        /* Search */
        document.getElementById('rvSearch').addEventListener('input', function () {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function () {
                filterKeyword = document.getElementById('rvSearch').value.trim();
                loadReviews(0);
            }, 380);
        });

        /* Star filter tabs */
        document.querySelectorAll('.rv-star-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.rv-star-tab').forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                filterRating = tab.dataset.star || null;
                loadReviews(0);
            });
        });

        /* Sort */
        document.getElementById('rvSort').addEventListener('change', function () {
            sortMode = this.value;
            loadReviews(currentPage);
        });
    }

    /* ══════════════════════════════════════════════════════════
       DETAIL MODAL
    ══════════════════════════════════════════════════════════ */
    function openDetail(id) {
        apiFetch(API_PUB + '/' + id).then(function (r) {
            document.getElementById('detailBody').innerHTML = buildDetailHtml(r);
            openOverlay('detailOverlay');
        }).catch(function () {
            showToast('Không thể tải chi tiết đánh giá', 'error');
        });
    }

    function buildDetailHtml(r) {
        var initial  = (r.guestName || r.userFullName || '?')[0].toUpperCase();
        var name     = esc(r.guestName || r.userFullName || 'Ẩn danh');
        var room     = esc(r.roomType || '');
        var date     = fmtDate(r.createdAt);
        var rating   = r.rating || 0;
        var titleH   = r.title   ? '<h3 class="rv-detail-title">'   + esc(r.title)   + '</h3>' : '';
        var commentH = r.comment ? '<p  class="rv-detail-comment">'  + esc(r.comment) + '</p>'  : '';

        /* Sub-criteria */
        var subItems = [
            { label: 'Phòng ở',  val: r.roomRating },
            { label: 'Dịch vụ',  val: r.serviceRating },
            { label: 'Vị trí',   val: r.locationRating },
            { label: 'Sạch sẽ',  val: r.cleanlinessRating },
            { label: 'Tiện nghi', val: r.amenitiesRating },
            { label: 'Giá trị',  val: r.valueRating }
        ].filter(function (s) { return s.val; });

        var subHtml = '';
        if (subItems.length) {
            subHtml = '<div class="rv-detail-sub">' +
                '<p class="rv-detail-sub-title">Đánh giá chi tiết</p>' +
                '<div class="rv-detail-sub-grid">' +
                subItems.map(function (s) {
                    return '<div class="rv-detail-sub-item">' +
                        '<span class="rv-detail-sub-label">' + esc(s.label) + '</span>' +
                        '<span class="rv-detail-sub-val">' + s.val +
                        '<svg viewBox="0 0 24 24" fill="#f5a623"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
                        '</span></div>';
                }).join('') +
                '</div></div>';
        }

        /* Reply */
        var replyHtml = '';
        if (r.hasReply && r.replyText) {
            replyHtml = '<div class="rv-detail-reply">' +
                '<div class="rv-detail-reply-header">' +
                '<span class="rv-detail-reply-badge">Phản hồi từ HotelHub</span>' +
                '<span class="rv-detail-reply-date">' + fmtDate(r.repliedAt) + '</span>' +
                '</div>' +
                '<p class="rv-detail-reply-text">' + esc(r.replyText) + '</p>' +
                '</div>';
        }

        return '<div class="rv-detail-author">' +
            '<div class="rv-detail-avatar">' + initial + '</div>' +
            '<div>' +
                '<div class="rv-detail-name">' + name + '</div>' +
                '<div class="rv-detail-meta">' + (room ? room + ' · ' : '') + date + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="rv-detail-score">' +
                '<span class="rv-detail-score-big">' + rating + '</span>' +
                '<div>' +
                    '<div class="rv-detail-stars">' + starsHtml(rating, 18) + '</div>' +
                    '<div style="font-size:12px;color:#9a7b6d;margin-top:3px">' + ratingLabel(rating) + '</div>' +
                '</div>' +
            '</div>' +
            titleH +
            commentH +
            subHtml +
            replyHtml;
    }

    /* ══════════════════════════════════════════════════════════
       WRITE REVIEW MODAL
    ══════════════════════════════════════════════════════════ */
    function bindWriteModal() {
        document.getElementById('btnOpenWrite').addEventListener('click', function () {
            resetWriteForm();
            openOverlay('writeOverlay');
        });

        document.getElementById('btnCloseDetail').addEventListener('click', function () {
            closeOverlay('detailOverlay');
        });

        document.getElementById('btnCloseWrite').addEventListener('click', function () {
            closeOverlay('writeOverlay');
        });

        document.getElementById('btnCancelWrite').addEventListener('click', function () {
            closeOverlay('writeOverlay');
        });

        document.getElementById('wBtnSubmit').addEventListener('click', function () {
            submitReview();
        });

        /* Click overlay đóng modal */
        document.getElementById('detailOverlay').addEventListener('click', function (e) {
            if (e.target === this) closeOverlay('detailOverlay');
        });

        document.getElementById('writeOverlay').addEventListener('click', function (e) {
            if (e.target === this) closeOverlay('writeOverlay');
        });

        /* ESC */
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            closeOverlay('detailOverlay');
            closeOverlay('writeOverlay');
        });

        /* Star pickers */
        bindStarPicker('mainStarPicker', function (val) { mainRating = val; });

        ['subRoom','subService','subLocation','subClean','subAmenities','subValue'].forEach(function (id) {
            var key = {
                subRoom      : 'roomRating',
                subService   : 'serviceRating',
                subLocation  : 'locationRating',
                subClean     : 'cleanlinessRating',
                subAmenities : 'amenitiesRating',
                subValue     : 'valueRating'
            }[id];
            bindStarPicker(id, function (val) { subRatings[key] = val; });
        });
    }

    function bindStarPicker(containerId, onSet) {
        var container = document.getElementById(containerId);
        if (!container) return;
        var btns = container.querySelectorAll('.rv-star-pick-btn, .rv-sub-star');

        btns.forEach(function (btn) {
            btn.addEventListener('mouseenter', function () {
                var val = +btn.dataset.val;
                btns.forEach(function (b) {
                    b.classList.toggle('hovered', +b.dataset.val <= val);
                    b.classList.remove('active');
                });
            });

            btn.addEventListener('mouseleave', function () {
                btns.forEach(function (b) { b.classList.remove('hovered'); });
            });

            btn.addEventListener('click', function () {
                var val = +btn.dataset.val;
                onSet(val);
                btns.forEach(function (b) {
                    b.classList.toggle('active', +b.dataset.val <= val);
                    b.classList.remove('hovered');
                });
            });
        });
    }

    function resetWriteForm() {
        mainRating = 0;
        Object.keys(subRatings).forEach(function (k) { subRatings[k] = 0; });

        document.getElementById('wBookingId').value = '';
        document.getElementById('wTitle').value     = '';
        document.getElementById('wComment').value   = '';

        /* Reset all star pickers */
        document.querySelectorAll('.rv-star-pick-btn, .rv-sub-star').forEach(function (b) {
            b.classList.remove('active', 'hovered');
        });
    }

    function submitReview() {
        var bookingIdRaw = (document.getElementById('wBookingId').value || '').trim();
        var title        = (document.getElementById('wTitle').value     || '').trim();
        var comment      = (document.getElementById('wComment').value   || '').trim();

        if (!bookingIdRaw) {
            showToast('Vui lòng nhập mã đặt phòng', 'error');
            document.getElementById('wBookingId').focus();
            return;
        }
        if (!mainRating) {
            showToast('Vui lòng chọn điểm tổng thể', 'error');
            return;
        }

        var body = {
            bookingId: parseInt(bookingIdRaw, 10),
            rating:    mainRating
        };

        if (title)   body.title   = title;
        if (comment) body.comment = comment;

        Object.keys(subRatings).forEach(function (k) {
            if (subRatings[k]) body[k] = subRatings[k];
        });

        var btn = document.getElementById('wBtnSubmit');
        btn.disabled    = true;
        btn.textContent = 'Đang gửi...';

        apiPost(API_POST, body)
            .then(function () {
                closeOverlay('writeOverlay');
                showToast('Đánh giá của bạn đã được gửi và đang chờ duyệt!', 'success');
                /* Không reload ngay vì review cần APPROVED mới hiện */
            })
            .catch(function (err) {
                showToast('Lỗi: ' + (err.message || 'Không thể gửi đánh giá'), 'error');
            })
            .finally(function () {
                btn.disabled    = false;
                btn.innerHTML =
                    '<svg viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                    'Gửi đánh giá';
            });
    }

    /* ══════════════════════════════════════════════════════════
       OVERLAY HELPERS
    ══════════════════════════════════════════════════════════ */
    function openOverlay(id)  { document.getElementById(id).classList.add('open'); }
    function closeOverlay(id) { document.getElementById(id).classList.remove('open'); }

    /* ══════════════════════════════════════════════════════════
       API HELPERS
    ══════════════════════════════════════════════════════════ */
    function apiFetch(url) {
        return fetch(url, {
            headers: { 'Content-Type': 'application/json' }
        }).then(function (res) {
            if (!res.ok) {
                return res.json()
                    .then(function (e) { throw new Error(e.message || 'HTTP ' + res.status); })
                    .catch(function ()  { throw new Error('HTTP ' + res.status); });
            }
            return res.json();
        });
    }

    function apiPost(url, body) {
        var token   = localStorage.getItem('accessToken');
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        return fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        }).then(function (res) {
            if (!res.ok) {
                return res.text().then(function (text) {
                    var msg;
                    try {
                        var json = JSON.parse(text);
                        msg = json.message || json.error || ('HTTP ' + res.status);
                    } catch (_) {
                        msg = text || ('HTTP ' + res.status);
                    }
                    throw new Error(msg);
                });
            }
            if (res.status === 204) return {};
            return res.json();
        });
    }

    /* ══════════════════════════════════════════════════════════
       TOAST
    ══════════════════════════════════════════════════════════ */
    var toastTimer = null;

    function showToast(msg, type) {
        var el = document.getElementById('rvToast');
        if (!el) return;
        el.textContent = msg;
        el.className   = 'rv-toast ' + (type || 'info');
        requestAnimationFrame(function () { el.classList.add('show'); });
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3500);
    }

    /* ══════════════════════════════════════════════════════════
       UTILITIES
    ══════════════════════════════════════════════════════════ */
    function starsHtml(rating, size) {
        var html = '';
        for (var i = 1; i <= 5; i++) {
            var filled = i <= Math.round(rating);
            html += '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" ' +
                (filled ? 'fill="#f5a623"' : 'fill="#e0d5cf"') + '>' +
                '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>' +
                '</svg>';
        }
        return html;
    }

    function ratingLabel(v) {
        if (v >= 4.5) return 'Xuất sắc';
        if (v >= 4.0) return 'Rất tốt';
        if (v >= 3.5) return 'Tốt';
        if (v >= 3.0) return 'Trung bình';
        if (v >= 2.0) return 'Dưới trung bình';
        return 'Kém';
    }

    function fmtDate(dt) {
        if (!dt) return '';
        try {
            var d = new Date(dt);
            return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (_) { return dt; }
    }

    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function esc(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ── Expose public ── */
    window.rvGoPage = rvGoPage;

})();
