// Admin Report JavaScript

let currentPage = 0;
const pageSize = 10;
let totalPages = 0;

// Load report data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadReportData(0);

    // Add event listeners for filters — reset về trang 0 mỗi khi filter thay đổi
    document.getElementById('startDate').addEventListener('change', function() { loadReportData(0); });
    document.getElementById('endDate').addEventListener('change', function() { loadReportData(0); });
    document.getElementById('source').addEventListener('change', function() { loadReportData(0); });
    document.getElementById('paymentStatus').addEventListener('change', function() { loadReportData(0); });
});

async function loadReportData(page = 0) {
    currentPage = page;
    
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const source = document.getElementById('source').value;
    const paymentStatus = document.getElementById('paymentStatus').value;
    
    // Build query params
    const params = new URLSearchParams({
        page: currentPage,
        size: pageSize
    });
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (source) params.append('source', source);
    if (paymentStatus) params.append('paymentStatus', paymentStatus);
    
    try {
        const token = localStorage.getItem('accessToken');
        const backendUrl = window.BACKEND_URL || 'http://localhost:8081';
        const response = await fetch(`${backendUrl}/api/admin/reports/revenue?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load report data');
        }
        
        const data = await response.json();
        
        // Update summary cards
        updateSummaryCards(data.summary);
        
        // Update table
        updateTable(data.items);
        
        // Update pagination
        totalPages = data.totalPages;
        updatePagination(data.currentPage, data.totalPages, data.totalItems);
        
    } catch (error) {
        console.error('Error loading report:', error);
        showError('Không thể tải dữ liệu báo cáo');
    }
}

function updateSummaryCards(summary) {
    document.getElementById('totalRevenue').textContent = formatCurrency(summary.totalRevenue);
    document.getElementById('actualRevenue').textContent = formatCurrency(summary.actualRevenue);
    document.getElementById('totalExpenses').textContent = formatCurrency(summary.totalExpenses);
}

function updateTable(items) {
    const tbody = document.getElementById('reportTableBody');
    
    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="10">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <p>Không có dữ liệu báo cáo</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = items.map(item => `
        <tr>
            <td style="font-weight: 600;">${escapeHtml(item.bookingCode)}</td>
            <td>${formatDate(item.bookingDate)}</td>
            <td>${escapeHtml(item.guestName)}</td>
            <td>${escapeHtml(item.roomNumber)}</td>
            <td>${escapeHtml(item.source)}</td>
            <td style="font-weight: 600;">${formatCurrency(item.totalAmount)}</td>
            <td style="color: #ea580c;">${formatCurrency(item.discountAmount)}</td>
            <td style="font-weight: 700; color: #15803d;">${formatCurrency(item.finalAmount)}</td>
            <td><span class="status-badge ${getStatusClass(item.paymentStatus)}">${item.paymentStatus}</span></td>
            <td><button class="btn-view" onclick="viewDetail('${item.bookingCode}')">Xem chi tiết</button></td>
        </tr>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updatePagination(currentPage, totalPages, totalItems) {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="pg-btn" onclick="loadReportData(${currentPage - 1})" ${currentPage === 0 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
            </svg>
        </button>
    `;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pg-btn ${i === currentPage ? 'active' : ''}" onclick="loadReportData(${i})">
                ${i + 1}
            </button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button class="pg-btn" onclick="loadReportData(${currentPage + 1})" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
            </svg>
        </button>
    `;
    
    pagination.innerHTML = paginationHTML;
}

function getStatusClass(status) {
    switch (status) {
        case 'Đã thanh toán':
            return 'status-paid';
        case 'Chờ thanh toán':
            return 'status-pending';
        case 'Thất bại':
            return 'status-failed';
        default:
            return '';
    }
}

function formatCurrency(amount) {
    if (!amount && amount !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function viewDetail(bookingCode) {
    // Extract booking ID from code (e.g., "HD-2023-001" -> 1)
    const parts = bookingCode.split('-');
    const bookingId = parts[parts.length - 1];
    // Navigate to booking detail page
    window.location.href = `/admin/bookings/${bookingId}`;
}

function exportExcel() {
    alert('Chức năng xuất Excel đang được phát triển');
}

function exportPDF() {
    alert('Chức năng xuất PDF đang được phát triển');
}

function printReport() {
    window.print();
}

function showError(message) {
    alert(message);
}
