// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadGroupBookingDetail();
    loadRooms();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('roomForm').addEventListener('submit', handleRoomFormSubmit);
    document.getElementById('statusForm').addEventListener('submit', handleStatusFormSubmit);
}

async function loadGroupBookingDetail() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/api/admin/group-bookings/${groupBookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        const group = await response.json();
        displayGroupInfo(group);
    } catch (error) {
        console.error('Error loading group booking:', error);
        alert('Lỗi khi tải thông tin đoàn khách');
    }
}

function displayGroupInfo(group) {
    document.getElementById('groupName').textContent = group.groupName;
    document.getElementById('infoGroupName').textContent = group.groupName;
    document.getElementById('infoContactPerson').textContent = group.contactPerson;
    document.getElementById('infoContactPhone').textContent = group.contactPhone;
    document.getElementById('infoContactEmail').textContent = group.contactEmail || '-';
    document.getElementById('infoTotalRooms').textContent = group.totalRooms;
    document.getElementById('infoCheckIn').textContent = formatDate(group.checkIn);
    document.getElementById('infoCheckOut').textContent = formatDate(group.checkOut);
    
    const statusBadge = document.getElementById('infoStatus');
    statusBadge.textContent = getStatusText(group.status);
    statusBadge.className = `status-badge status-${group.status.toLowerCase()}`;

    if (group.note) {
        document.getElementById('noteContainer').style.display = 'block';
        document.getElementById('infoNote').textContent = group.note;
    }
}

async function loadRooms() {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch(`${backendUrl}/api/admin/group-bookings/${groupBookingId}/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const rooms = await response.json();
        displayRooms(rooms);
    } catch (error) {
        console.error('Error loading rooms:', error);
        alert('Lỗi khi tải danh sách phòng');
    }
}

function displayRooms(rooms) {
    const tbody = document.getElementById('roomsBody');
    
    if (rooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Chưa có phòng nào</td></tr>';
        return;
    }

    tbody.innerHTML = rooms.map(room => `
        <tr>
            <td>${room.guestName}</td>
            <td>${room.roomType}</td>
            <td>${room.roomNumber || '-'}</td>
            <td>${formatCurrency(room.price)}</td>
            <td><span class="status-badge status-${room.status.toLowerCase()}">${getRoomStatusText(room.status)}</span></td>
            <td>${room.note || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-status" onclick="openStatusModal(${room.id}, '${room.status}')">Trạng thái</button>
                    <button class="btn-edit" onclick="editRoom(${room.id})">Sửa</button>
                    <button class="btn-delete" onclick="deleteRoom(${room.id})">Xóa</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openAddRoomModal() {
    document.getElementById('roomModalTitle').textContent = 'Thêm phòng mới';
    document.getElementById('roomForm').reset();
    document.getElementById('roomId').value = '';
    document.getElementById('roomModal').style.display = 'block';
}

function closeRoomModal() {
    document.getElementById('roomModal').style.display = 'none';
}

async function editRoom(roomId) {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch(`${backendUrl}/api/admin/group-bookings/${groupBookingId}/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const rooms = await response.json();
        const room = rooms.find(r => r.id === roomId);

        if (!room) {
            alert('Không tìm thấy phòng');
            return;
        }

        document.getElementById('roomModalTitle').textContent = 'Chỉnh sửa phòng';
        document.getElementById('roomId').value = room.id;
        document.getElementById('guestName').value = room.guestName;
        document.getElementById('roomType').value = room.roomType;
        document.getElementById('roomNumber').value = room.roomNumber || '';
        document.getElementById('price').value = room.price;
        document.getElementById('roomNote').value = room.note || '';
        
        document.getElementById('roomModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading room:', error);
        alert('Lỗi khi tải thông tin phòng');
    }
}

async function handleRoomFormSubmit(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('accessToken');
    const roomId = document.getElementById('roomId').value;
    
    const data = {
        guestName: document.getElementById('guestName').value,
        roomType: document.getElementById('roomType').value,
        roomNumber: document.getElementById('roomNumber').value || null,
        price: parseFloat(document.getElementById('price').value),
        note: document.getElementById('roomNote').value || null
    };

    const url = roomId 
        ? `${backendUrl}/api/admin/group-bookings/rooms/${roomId}`
        : `${backendUrl}/api/admin/group-bookings/${groupBookingId}/rooms`;
    
    const method = roomId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert(roomId ? 'Cập nhật phòng thành công!' : 'Thêm phòng thành công!');
            closeRoomModal();
            loadRooms();
        } else {
            const error = await response.json();
            alert('Lỗi: ' + (error.message || 'Không thể lưu dữ liệu'));
        }
    } catch (error) {
        console.error('Error saving room:', error);
        alert('Lỗi khi lưu dữ liệu');
    }
}

async function deleteRoom(roomId) {
    if (!confirm('Bạn có chắc chắn muốn xóa phòng này?')) {
        return;
    }

    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch(`${backendUrl}/api/admin/group-bookings/rooms/${roomId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert('Xóa phòng thành công!');
            loadRooms();
        } else {
            alert('Lỗi khi xóa phòng');
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        alert('Lỗi khi xóa phòng');
    }
}

function openStatusModal(roomId, currentStatus) {
    document.getElementById('statusRoomId').value = roomId;
    document.getElementById('roomStatus').value = currentStatus;
    document.getElementById('statusModal').style.display = 'block';
}

function closeStatusModal() {
    document.getElementById('statusModal').style.display = 'none';
}

async function handleStatusFormSubmit(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('accessToken');
    const roomId = document.getElementById('statusRoomId').value;
    const status = document.getElementById('roomStatus').value;

    try {
        const response = await fetch(`${backendUrl}/api/admin/group-bookings/rooms/${roomId}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        });

        if (response.ok) {
            alert('Cập nhật trạng thái thành công!');
            closeStatusModal();
            loadRooms();
        } else {
            const error = await response.json();
            alert('Lỗi: ' + (error.message || 'Không thể cập nhật trạng thái'));
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Lỗi khi cập nhật trạng thái');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function getStatusText(status) {
    const statusMap = {
        'PENDING': 'Chờ xác nhận',
        'CONFIRMED': 'Đã xác nhận',
        'CHECKED_IN': 'Đã check-in',
        'COMPLETED': 'Hoàn thành',
        'CANCELLED': 'Đã hủy'
    };
    return statusMap[status] || status;
}

function getRoomStatusText(status) {
    const statusMap = {
        'BOOKED': 'Đã cọc',
        'CHECKED_IN': 'Đã Check-in',
        'CHECKED_OUT': 'Đã Check-out'
    };
    return statusMap[status] || status;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const roomModal = document.getElementById('roomModal');
    const statusModal = document.getElementById('statusModal');
    
    if (event.target === roomModal) {
        closeRoomModal();
    }
    if (event.target === statusModal) {
        closeStatusModal();
    }
}
