/* ==========================================================
   dashboard.js – HotelHub Admin Dashboard
   - Fetch dữ liệu từ GET /api/admin/dashboard
   - Render 4 thẻ KPI, 2 biểu đồ Chart.js, bảng giao dịch
   Requires: Chart.js 4.x (loaded via CDN in template)
========================================================== */

(function () {
    'use strict';

    /* ── Config ── */
    const API_BASE      = 'http://localhost:8081';
    const DASHBOARD_URL = API_BASE + '/api/admin/dashboard';

    /* ── Palette ── */
    const COLOR_BLUE_STEEL = '#7b96b2';
    const COLOR_GREEN_MINT = '#5cb87a';
    const COLOR_BG_GRID    = '#f0ebe7';
    const COLOR_LABEL      = '#8c7b72';
    const FONT_FAMILY      = "'Inter', 'Manrope', sans-serif";

    /* ── Chart instances (để destroy khi re-render) ── */
    let monthlyChart  = null;
    let roomTypeChart = null;

    /* ── Shared Chart Defaults ── */
    Chart.defaults.font.family = FONT_FAMILY;
    Chart.defaults.color       = COLOR_LABEL;

    /* ══════════════════════════════════════════════════════════
       ENTRY POINT
    ══════════════════════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', function () {
        highlightActiveNav();
        loadDashboard();
    });

    /* ══════════════════════════════════════════════════════════
       FETCH & RENDER
    ══════════════════════════════════════════════════════════ */
    function loadDashboard() {
        const token = localStorage.getItem('token');

        fetch(DASHBOARD_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? 'Bearer ' + token : ''
            }
        })
        .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(function (data) {
            renderStats(data.stats);
            renderMonthlyChart(data.monthlyRevenue);
            renderRoomTypeChart(data.roomTypeRevenue);
            renderTransactions(data.recentTransactions);
        })
        .catch(function (err) {
            console.warn('Dashboard API error, dùng dữ liệu tĩnh:', err.message);
            renderFallback();
        });
    }

    /* ══════════════════════════════════════════════════════════
       1. STATS – 4 thẻ KPI
    ══════════════════════════════════════════════════════════ */
    function renderStats(stats) {
        if (!stats) return;

        setStatCard(
            'statOccupancy', 'statOccupancyChange',
            stats.occupancyRate.toFixed(1) + '%',
            stats.occupancyRateChange,
            '%'
        );
        setStatCard(
            'statRevPar', 'statRevParChange',
            formatVND(stats.revPar),
            stats.revParChange,
            '%'
        );
        setStatCard(
            'statCheckIns', 'statCheckInsChange',
            stats.totalCheckIns,
            stats.totalCheckInsChange,
            ''
        );
        setStatCard(
            'statPending', 'statPendingChange',
            stats.pendingBookings,
            stats.pendingBookingsChange,
            ''
        );
    }

    function setStatCard(valueId, changeId, value, change, unit) {
        const valEl    = document.getElementById(valueId);
        const changeEl = document.getElementById(changeId);
        if (valEl)    valEl.textContent = value;
        if (changeEl) {
            const sign = change >= 0 ? '+' : '';
            changeEl.textContent = sign + change + unit;
            changeEl.className   = 'stat-change ' + (change >= 0 ? 'positive' : 'negative');
        }
    }

    /* ══════════════════════════════════════════════════════════
       2. BIỂU ĐỒ DOANH THU HÀNG THÁNG
    ══════════════════════════════════════════════════════════ */
    function renderMonthlyChart(monthly) {
        const ctx = document.getElementById('monthlyRevenueChart');
        if (!ctx || !monthly) return;

        // Chuyển VND → triệu để dễ đọc trên biểu đồ
        const dataInMillions = (monthly.data || []).map(v => toMillions(v));
        const maxVal = Math.max(...dataInMillions, 10);
        const yMax   = Math.ceil(maxVal / 20) * 20 + 20;

        // Hiển thị tổng tháng hiện tại lên header card
        const headerEl = document.getElementById('monthlyRevenueTotal');
        if (headerEl && monthly.currentMonthTotal != null) {
            headerEl.textContent = formatMillions(monthly.currentMonthTotal) + ' triệu VND';
        }

        if (monthlyChart) monthlyChart.destroy();

        monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthly.labels || [],
                datasets: [{
                    label: 'Doanh thu (triệu VND)',
                    data: dataInMillions,
                    backgroundColor: COLOR_BLUE_STEEL,
                    borderRadius: 4,
                    borderSkipped: false,
                    barPercentage: 0.55,
                    categoryPercentage: 0.75,
                }]
            },
            options: buildBarOptions(yMax, 'triệu VND')
        });
    }

    /* ══════════════════════════════════════════════════════════
       3. BIỂU ĐỒ DOANH THU THEO LOẠI PHÒNG
    ══════════════════════════════════════════════════════════ */
    function renderRoomTypeChart(roomType) {
        const ctx = document.getElementById('roomTypeChart');
        if (!ctx || !roomType) return;

        const dataInMillions = (roomType.data || []).map(v => toMillions(v));
        const maxVal = Math.max(...dataInMillions, 10);
        const yMax   = Math.ceil(maxVal / 10) * 10 + 10;

        // Header card
        const totalEl = document.getElementById('roomTypeRevenueTotal');
        if (totalEl && roomType.total != null) {
            totalEl.textContent = formatMillions(roomType.total) + ' triệu VND';
        }
        const monthEl = document.getElementById('roomTypeMonth');
        if (monthEl && roomType.monthLabel) {
            monthEl.textContent = roomType.monthLabel;
        }

        if (roomTypeChart) roomTypeChart.destroy();

        roomTypeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: roomType.labels || [],
                datasets: [{
                    label: 'Doanh thu (triệu VND)',
                    data: dataInMillions,
                    backgroundColor: COLOR_GREEN_MINT,
                    borderRadius: 4,
                    borderSkipped: false,
                    barPercentage: 0.5,
                    categoryPercentage: 0.7,
                }]
            },
            options: buildBarOptions(yMax, 'triệu VND')
        });
    }

    /* ══════════════════════════════════════════════════════════
       4. BẢNG GIAO DỊCH GẦN NHẤT
    ══════════════════════════════════════════════════════════ */
    function renderTransactions(transactions) {
        const tbody = document.getElementById('transactionsTbody');
        if (!tbody || !transactions) return;

        tbody.innerHTML = '';

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#8c7b72">Chưa có giao dịch nào</td></tr>';
            return;
        }

        transactions.forEach(function (t) {
            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td class="txn-id">'       + escHtml(t.transactionCode) + '</td>' +
                '<td class="customer-name">' + escHtml(t.guestName)        + '</td>' +
                '<td class="room-type">'     + escHtml(t.roomType)          + '</td>' +
                '<td class="date-cell">'     + escHtml(t.checkIn)           + '</td>' +
                '<td class="date-cell">'     + escHtml(t.checkOut)          + '</td>' +
                '<td class="amount-cell">'   + formatVND(t.totalAmount)     + '</td>' +
                '<td><span class="status-badge status-' + escHtml(t.status.toLowerCase()) + '">' + escHtml(t.statusLabel) + '</span></td>';
            tbody.appendChild(tr);
        });
    }

    /* ══════════════════════════════════════════════════════════
       FALLBACK – dữ liệu tĩnh khi API lỗi / chưa đăng nhập
    ══════════════════════════════════════════════════════════ */
    function renderFallback() {
        renderStats({
            occupancyRate: 75, occupancyRateChange: 5,
            revPar: 150000,    revParChange: 10,
            totalCheckIns: 350, totalCheckInsChange: 20,
            pendingBookings: 15, pendingBookingsChange: -5
        });

        renderMonthlyChart({
            labels: ['Tháng 10', 'Tháng 11', 'Tháng 12', 'Tháng 1', 'Tháng 2', 'Tháng 3'],
            data: [98000000, 112000000, 126000000, 105000000, 134000000, 126250000],
            currentMonthTotal: 126250000
        });

        renderRoomTypeChart({
            labels: ['Phòng Đơn', 'Phòng Đôi', 'Phòng Gia Đình'],
            data: [30000000, 60000000, 45000000],
            total: 135000000,
            monthLabel: 'Tháng 3'
        });

        renderTransactions([
            { transactionCode: 'TXN00001', guestName: 'Nguyễn Văn A', roomType: 'Phòng Đôi',      checkIn: '2024-07-15', checkOut: '2024-07-17', totalAmount: 2000000, status: 'CHECKED_OUT', statusLabel: 'Đã trả phòng' },
            { transactionCode: 'TXN00002', guestName: 'Trần Thị B',   roomType: 'Phòng Đơn',      checkIn: '2024-07-16', checkOut: '2024-07-18', totalAmount: 1500000, status: 'CHECKED_IN',  statusLabel: 'Đã nhận phòng' },
            { transactionCode: 'TXN00003', guestName: 'Lê Văn C',     roomType: 'Phòng Gia Đình', checkIn: '2024-07-17', checkOut: '2024-07-20', totalAmount: 3500000, status: 'CONFIRMED',   statusLabel: 'Đã xác nhận' },
            { transactionCode: 'TXN00004', guestName: 'Phạm Thị D',   roomType: 'Phòng Đôi',      checkIn: '2024-07-18', checkOut: '2024-07-21', totalAmount: 2500000, status: 'PENDING',     statusLabel: 'Chờ xác nhận' },
            { transactionCode: 'TXN00005', guestName: 'Hoàng Văn E',  roomType: 'Phòng Đơn',      checkIn: '2024-07-19', checkOut: '2024-07-20', totalAmount: 1000000, status: 'CONFIRMED',   statusLabel: 'Đã xác nhận' }
        ]);
    }

    /* ══════════════════════════════════════════════════════════
       ACTIVE NAV
    ══════════════════════════════════════════════════════════ */
    function highlightActiveNav() {
        const currentPath = window.location.pathname;
        document.querySelectorAll('.nav-item').forEach(function (link) {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }

    /* ══════════════════════════════════════════════════════════
       HELPERS
    ══════════════════════════════════════════════════════════ */

    /** Tạo options chung cho biểu đồ cột */
    function buildBarOptions(yMax, unit) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            return ' ' + ctx.parsed.y.toLocaleString('vi-VN') + ' ' + unit;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid:   { display: false },
                    border: { display: false },
                    ticks:  { font: { size: 12 }, color: COLOR_LABEL }
                },
                y: {
                    min: 0, max: yMax,
                    ticks: {
                        stepSize: Math.ceil(yMax / 8 / 10) * 10,
                        font:     { size: 11 },
                        color:    COLOR_LABEL,
                    },
                    grid:   { color: COLOR_BG_GRID, drawTicks: false },
                    border: { display: false, dash: [4, 4] },
                }
            }
        };
    }

    /** VND raw number → "X,XXX,XXX VND" */
    function formatVND(value) {
        if (value == null) return '—';
        return Number(value).toLocaleString('vi-VN') + ' VND';
    }

    /** VND → triệu (1 chữ số thập phân) */
    function toMillions(value) {
        return Math.round(Number(value) / 100000) / 10;
    }

    /** VND → "X,X triệu" */
    function formatMillions(value) {
        const m = toMillions(value);
        return m.toLocaleString('vi-VN');
    }

    /** Escape HTML để tránh XSS */
    function escHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

})();
