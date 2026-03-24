// Admin Booking Detail JavaScript

document.addEventListener('DOMContentLoaded', function() {
    loadBookingDetail();
});

async function loadBookingDetail() {
    try {
        const token = localStorage.getItem('accessToken');
        const backendUrl = window.BACKEND_URL || 'http://localhost:8081';
        const response = await fetch(`${backendUrl}/api/admin/bookings/${bookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load booking detail');
        }
        
        const booking = await response.json();
        
        // Hide loading, show content
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('detailContent').style.display = 'block';
        
        // Populate data
        populateBookingData(booking);
        
    } catch (error) {
        console.error('Error loading booking detail:', error);
        document.getElementById('loadingState').innerHTML = `
            <p style="color: #dc2626;">Không thể tải thông tin đặt phòng</p>
            <button onclick="history.back()" class="btn-back" style="margin-top: 1rem;">Quay lại</button>
        `;
    }
}

function populateBookingData(booking) {
    // Booking info
    document.getElementById('bookingCode').textContent = `#${booking.id}`;
    document.getElementById('bookingStatus').textContent = getStatusText(booking.status);
    document.getElementById('bookingStatus').className = `status-badge ${getStatusClass(booking.status)}`;
    document.getElementById('createdAt').textContent = formatDateTime(booking.createdAt);
    document.getElementById('roomType').textContent = booking.roomType;
    document.getElementById('checkIn').textContent = formatDate(booking.checkIn);
    document.getElementById('checkOut').textContent = formatDate(booking.checkOut);
    document.getElementById('nights').textContent = `${booking.nights} đêm`;
    document.getElementById('rooms').textContent = booking.rooms;
    document.getElementById('adults').textContent = booking.adults;
    document.getElementById('children').textContent = booking.children;
    
    // Guest info
    document.getElementById('guestName').textContent = booking.guestName;
    document.getElementById('guestPhone').textContent = booking.guestPhone;
    document.getElementById('guestEmail').textContent = booking.guestEmail || '-';
    
    // Note
    if (booking.note) {
        document.getElementById('noteSection').style.display = 'flex';
        document.getElementById('note').textContent = booking.note;
    }
    
    // Payment info
    document.getElementById('pricePerNight').textContent = formatCurrency(booking.pricePerNight);
    document.getElementById('totalAmount').textContent = formatCurrency(booking.totalAmount);
}

function getStatusText(status) {
    const statusMap = {
        'PENDING': 'Chờ xử lý',
        'CONFIRMED': 'Đã xác nhận',
        'CHECKED_IN': 'Đang ở',
        'CHECKED_OUT': 'Đã trả phòng',
        'CANCELLED': 'Đã hủy'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    const classMap = {
        'PENDING': 'status-pending',
        'CONFIRMED': 'status-confirmed',
        'CHECKED_IN': 'status-checked-in',
        'CHECKED_OUT': 'status-checked-out',
        'CANCELLED': 'status-cancelled'
    };
    return classMap[status] || '';
}

function formatCurrency(amount) {
    if (!amount) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleString('vi-VN');
}
