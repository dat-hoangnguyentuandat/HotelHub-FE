let currentPage = 0;
const pageSize = 10;
let selectedGroupId = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadGroupBookings();
    setupEventListeners();
});

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });

    // Form submit
    document.getElementById('groupBookingForm').addEventListener('submit', handleFormSubmit);
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

async function loadGroupBookings(page = 0) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    let url = `${backendUrl}/api/admin/group-bookings?page=${page}&size=${pageSize}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend error:', errorText);
            alert('Lỗi từ server: ' + response.status);
            displayGroupBookings([]);
            return;
        }

        const data = await response.json();
        displayGroupBookings(data.content || []);
        displayPagination(data);
        currentPage = page;
    } catch (error) {
        console.error('Error loading group bookings:', error);
        alert('Lỗi khi tải danh sách đoàn khách');
        displayGroupBookings([]);
    }
}

function displayGroupBookings(groupBookings) {
    const tbody = document.getElementById('groupBookingsBody');
    
    if (groupBookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #8c7b72;">Không có dữ liệu</td></tr>';
        return;
    }

    tbody.innerHTML = groupBookings.map(group => `
        <tr>
            <td style="font-weight: 600;">${escapeHtml(group.groupName)}</td>
            <td style="text-align: center;">${group.totalRooms}</td>
            <td>${formatDate(group.checkIn)}</td>
            <td>${formatDate(group.checkOut)}</td>
            <td>
                <div class="action-links">
                    <a href="javascript:void(0)" onclick="viewGroupRooms(${group.id}, '${escapeHtml(group.groupName)}')" class="action-link action-view">Xem</a>
                    <span class="action-sep">|</span>
                    <a href="javascript:void(0)" onclick="editGroupBooking(${group.id})" class="action-link action-edit">Chỉnh sửa</a>
                    <span class="action-sep">|</span>
                    <a href="javascript:void(0)" onclick="deleteGroupBooking(${group.id})" class="action-link action-delete">Xóa</a>
                </div>
            </td>
        </tr>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function viewGroupRooms(groupId, groupName) {
    selectedGroupId = groupId;
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch(`${backendUrl}/api/admin/group-bookings/${groupId}/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rooms = await response.json();
        
        document.getElementById('selectedGroupName').textContent = groupName;
        document.getElementById('roomsContainer').style.display = 'block';
        displayRooms(rooms);
        
        // Scroll to rooms section
        document.getElementById('roomsContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('Error loading rooms:', error);
        alert('Lỗi khi tải danh sách phòng: ' + error.message);
    }
}

function displayRooms(rooms) {
    const tbody = document.getElementById('roomsBody');
    
    if (rooms.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #8c7b72;">Chưa có phòng nào</td></tr>';
        return;
    }

    tbody.innerHTML = rooms.map(room => `
        <tr>
            <td style="font-weight: 600;">${escapeHtml(room.guestName)}</td>
            <td><span style="color: #8c6e5e; font-size: 13px;">${escapeHtml(room.roomType)}</span></td>
            <td style="text-align: center; font-weight: 600;">${room.roomNumber || '-'}</td>
            <td><span class="status-badge status-${room.status.toLowerCase()}">${getRoomStatusText(room.status)}</span></td>
            <td>
                <div class="action-links">
                    <a href="javascript:void(0)" onclick="editRoom(${room.id})" class="action-link action-edit">Chỉnh sửa</a>
                    <span class="action-sep">|</span>
                    <a href="javascript:void(0)" onclick="deleteRoom(${room.id})" class="action-link action-delete">Xóa</a>
                </div>
            </td>
        </tr>
    `).join('');
}

function displayPagination(data) {
    const pagination = document.getElementById('pagination');
    const totalPages = data.totalPages;
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    
    html += `<button ${currentPage === 0 ? 'disabled' : ''} onclick="loadGroupBookings(${currentPage - 1})">Trước</button>`;
    
    for (let i = 0; i < totalPages; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="loadGroupBookings(${i})">${i + 1}</button>`;
    }
    
    html += `<button ${currentPage === totalPages - 1 ? 'disabled' : ''} onclick="loadGroupBookings(${currentPage + 1})">Sau</button>`;
    
    pagination.innerHTML = html;
}

function openCreateModal() {
    document.getElementById('modalTitle').textContent = 'Tạo đặt phòng đoàn mới';
    document.getElementById('groupBookingForm').reset();
    document.getElementById('groupBookingId').value = '';
    const modal = document.getElementById('groupBookingModal');
    modal.style.display = 'flex';
    modal.classList.add('open');
}

function closeGroupBookingModal() {
    const modal = document.getElementById('groupBookingModal');
    modal.classList.remove('open');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 200);
}

async function editGroupBooking(id) {
    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch(`${backendUrl}/api/admin/group-bookings/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const group = await response.json();
        
        document.getElementById('modalTitle').textContent = 'Chỉnh sửa đặt phòng đoàn';
        document.getElementById('groupBookingId').value = group.id;
        document.getElementById('groupName').value = group.groupName;
        document.getElementById('contactPerson').value = group.contactPerson;
        document.getElementById('contactPhone').value = group.contactPhone;
        document.getElementById('contactEmail').value = group.contactEmail || '';
        document.getElementById('totalRooms').value = group.totalRooms;
        document.getElementById('checkIn').value = group.checkIn;
        document.getElementById('checkOut').value = group.checkOut;
        document.getElementById('note').value = group.note || '';
        
        const modal = document.getElementById('groupBookingModal');
        modal.style.display = 'flex';
        modal.classList.add('open');
    } catch (error) {
        console.error('Error loading group booking:', error);
        alert('Lỗi khi tải thông tin đoàn khách');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('accessToken');
    const id = document.getElementById('groupBookingId').value;
    
    const data = {
        groupName: document.getElementById('groupName').value,
        contactPerson: document.getElementById('contactPerson').value,
        contactPhone: document.getElementById('contactPhone').value,
        contactEmail: document.getElementById('contactEmail').value || null,
        totalRooms: parseInt(document.getElementById('totalRooms').value),
        checkIn: document.getElementById('checkIn').value,
        checkOut: document.getElementById('checkOut').value,
        note: document.getElementById('note').value || null
    };

    const url = id 
        ? `${backendUrl}/api/admin/group-bookings/${id}`
        : `${backendUrl}/api/admin/group-bookings`;
    
    const method = id ? 'PUT' : 'POST';

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
            alert(id ? 'Cập nhật thành công!' : 'Tạo mới thành công!');
            closeGroupBookingModal();
            loadGroupBookings(currentPage);
        } else {
            const error = await response.json();
            alert('Lỗi: ' + (error.message || 'Không thể lưu dữ liệu'));
        }
    } catch (error) {
        console.error('Error saving group booking:', error);
        alert('Lỗi khi lưu dữ liệu');
    }
}

async function deleteGroupBooking(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa đoàn khách này?')) {
        return;
    }

    const token = localStorage.getItem('accessToken');

    try {
        const response = await fetch(`${backendUrl}/api/admin/group-bookings/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert('Xóa thành công!');
            loadGroupBookings(currentPage);
            if (selectedGroupId === id) {
                document.getElementById('roomsContainer').style.display = 'none';
                selectedGroupId = null;
            }
        } else {
            alert('Lỗi khi xóa đoàn khách');
        }
    } catch (error) {
        console.error('Error deleting group booking:', error);
        alert('Lỗi khi xóa đoàn khách');
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
            if (selectedGroupId) {
                viewGroupRooms(selectedGroupId, document.getElementById('selectedGroupName').textContent);
            }
        } else {
            alert('Lỗi khi xóa phòng');
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        alert('Lỗi khi xóa phòng');
    }
}

async function editRoom(roomId) {
    const token = localStorage.getItem('accessToken');
    
    try {
        // Fetch room data
        const response = await fetch(`${backendUrl}/api/admin/group-bookings/${selectedGroupId}/rooms`, {
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
        
        // Populate form
        document.getElementById('roomModalTitle').textContent = 'Chỉnh sửa phòng';
        document.getElementById('roomId').value = room.id;
        document.getElementById('guestName').value = room.guestName;
        document.getElementById('roomType').value = room.roomType;
        document.getElementById('roomNumber').value = room.roomNumber || '';
        document.getElementById('roomPrice').value = room.price;
        document.getElementById('roomStatus').value = room.status;
        document.getElementById('roomNote').value = room.note || '';
        
        document.getElementById('roomModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading room:', error);
        alert('Lỗi khi tải thông tin phòng');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
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
    const modal = document.getElementById('groupBookingModal');
    if (event.target === modal) {
        closeGroupBookingModal();
    }
}


// Room Modal Functions
function openAddRoomModal() {
    if (!selectedGroupId) {
        alert('Vui lòng chọn một đoàn khách trước');
        return;
    }
    
    document.getElementById('roomModalTitle').textContent = 'Thêm phòng mới';
    document.getElementById('roomForm').reset();
    document.getElementById('roomId').value = '';
    document.getElementById('roomModal').style.display = 'block';
}

function closeRoomModal() {
    document.getElementById('roomModal').style.display = 'none';
}

async function handleRoomFormSubmit(event) {
    event.preventDefault();
    
    const roomId = document.getElementById('roomId').value;
    const roomData = {
        guestName: document.getElementById('guestName').value,
        roomType: document.getElementById('roomType').value,
        roomNumber: document.getElementById('roomNumber').value || null,
        price: parseFloat(document.getElementById('roomPrice').value),
        status: document.getElementById('roomStatus').value,
        note: document.getElementById('roomNote').value || null
    };

    const token = localStorage.getItem('accessToken');
    
    try {
        let url, method;
        if (roomId) {
            // Update existing room
            url = `${backendUrl}/api/admin/group-bookings/rooms/${roomId}`;
            method = 'PUT';
        } else {
            // Create new room
            url = `${backendUrl}/api/admin/group-bookings/${selectedGroupId}/rooms`;
            method = 'POST';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(roomData)
        });

        if (!response.ok) {
            throw new Error('Failed to save room');
        }

        alert(roomId ? 'Cập nhật phòng thành công!' : 'Thêm phòng thành công!');
        closeRoomModal();
        
        // Reload rooms list
        const groupName = document.getElementById('selectedGroupName').textContent;
        viewGroupRooms(selectedGroupId, groupName);
    } catch (error) {
        console.error('Error saving room:', error);
        alert('Lỗi khi lưu phòng: ' + error.message);
    }
}

// Add event listener for room form
document.addEventListener('DOMContentLoaded', function() {
    const roomForm = document.getElementById('roomForm');
    if (roomForm) {
        roomForm.addEventListener('submit', handleRoomFormSubmit);
    }
});
