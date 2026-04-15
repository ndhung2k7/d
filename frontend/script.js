// API endpoints
const API_BASE = '/api';

// DOM elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const toast = document.getElementById('toast');
const clearChatBtn = document.getElementById('clear-chat');

// Cài đặt elements
const settingTitle = document.getElementById('setting-title');
const settingFormat = document.getElementById('setting-format');
const settingAnonlink = document.getElementById('setting-anonlink');
const settingLinkx = document.getElementById('setting-linkx');
const settingMual = document.getElementById('setting-mual');
const settingHastebin = document.getElementById('setting-hastebin');
const saveSettingsBtn = document.getElementById('save-settings');
const resetSettingsBtn = document.getElementById('reset-settings');

// Điều hướng
const menuItems = document.querySelectorAll('.menu-item');
const pages = document.querySelectorAll('.page');

// Lịch sử
let lichSuChat = [];

// Hiển thị thông báo
function hienThiThongBao(message, isError = false) {
    toast.textContent = message;
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Thêm tin nhắn vào chat
function themTinNhan(text, laNguoiDung = false, links = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${laNguoiDung ? 'user' : 'bot'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = laNguoiDung ? '👤' : '🤖';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    
    // Xử lý text có thể chứa HTML
    if (text.includes('\n')) {
        textDiv.innerHTML = text.replace(/\n/g, '<br>');
    } else {
        textDiv.textContent = text;
    }
    
    // Thêm nút sao chép cho các link
    if (links) {
        const linkButtons = document.createElement('div');
        linkButtons.style.marginTop = '10px';
        for (const [name, url] of Object.entries(links)) {
            const copyBtn = document.createElement('button');
            copyBtn.textContent = `📋 Sao chép ${name}`;
            copyBtn.className = 'copy-link';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(url);
                hienThiThongBao(`Đã sao chép ${name}: ${url}`);
            };
            linkButtons.appendChild(copyBtn);
        }
        textDiv.appendChild(linkButtons);
    }
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString('vi-VN');
    
    content.appendChild(textDiv);
    content.appendChild(timeDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Lưu vào lịch sử
    luuVaoLichSu(text, laNguoiDung, links);
}

// Lưu vào lịch sử
async function luuVaoLichSu(tinNhan, laNguoiDung, links) {
    try {
        await fetch(`${API_BASE}/lich-su`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tinNhan: tinNhan,
                loai: laNguoiDung ? 'nguoi-dung' : 'bot',
                links: links
            })
        });
        taiLichSu();
    } catch (error) {
        console.error('Lỗi lưu lịch sử:', error);
    }
}

// Tải lịch sử
async function taiLichSu() {
    try {
        const response = await fetch(`${API_BASE}/lich-su`);
        const lichSu = await response.json();
        const historyList = document.getElementById('history-list');
        
        if (lichSu.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <span>📭</span>
                    <p>Chưa có lịch sử trò chuyện</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = lichSu.reverse().map(item => `
            <div class="history-item">
                <div class="history-item-header">
                    <span>${item.loai === 'nguoi-dung' ? '👤 Bạn' : '🤖 Bot'}</span>
                    <span>${new Date(item.thoiGian).toLocaleString('vi-VN')}</span>
                </div>
                <div class="history-item-content">
                    ${item.tinNhan.replace(/\n/g, '<br>')}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Lỗi tải lịch sử:', error);
    }
}

// Xử lý link
async function xuLyLink(link) {
    loadingOverlay.style.display = 'flex';
    
    try {
        const response = await fetch(`${API_BASE}/xu-ly-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link: link })
        });
        
        const data = await response.json();
        
        if (data.error) {
            themTinNhan(`❌ Lỗi: ${data.error}\n${data.chiTiet ? data.chiTiet.join('\n') : ''}`, false);
            hienThiThongBao(data.error, true);
        } else {
            themTinNhan(data.dauRa, false, data.ketQua);
            hienThiThongBao('✅ Xử lý thành công!');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        themTinNhan('❌ Có lỗi xảy ra khi xử lý link. Vui lòng thử lại sau!', false);
        hienThiThongBao('Lỗi kết nối máy chủ!', true);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// Tải cài đặt
async function taiCaiDat() {
    try {
        const response = await fetch(`${API_BASE}/cai-dat`);
        const caiDat = await response.json();
        
        settingTitle.value = caiDat.tieuDe;
        settingFormat.value = caiDat.dinhDang;
        
        // Không hiển thị khóa API từ máy chủ vì lý do bảo mật
        // Chỉ hiển thị thông báo nếu có khóa
        if (caiDat.coKhoa) {
            if (!caiDat.coKhoa.anonlink) hienThiThongBao('⚠️ Chưa cấu hình khóa API Anonlink', true);
            if (!caiDat.coKhoa.linkx) hienThiThongBao('⚠️ Chưa cấu hình khóa API Linkx', true);
            if (!caiDat.coKhoa.mual) hienThiThongBao('⚠️ Chưa cấu hình khóa API Mual', true);
        }
    } catch (error) {
        console.error('Lỗi tải cài đặt:', error);
    }
}

// Lưu cài đặt
async function luuCaiDat() {
    const caiDat = {
        tieuDe: settingTitle.value,
        dinhDang: settingFormat.value,
        apiKeys: {
            anonlink: settingAnonlink.value,
            linkx: settingLinkx.value,
            mual: settingMual.value
        },
        hastebinToken: settingHastebin.value
    };
    
    try {
        const response = await fetch(`${API_BASE}/cai-dat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(caiDat)
        });
        
        if (response.ok) {
            hienThiThongBao('✅ Đã lưu cài đặt thành công!');
            // Xóa các trường mật khẩu
            settingAnonlink.value = '';
            settingLinkx.value = '';
            settingMual.value = '';
            settingHastebin.value = '';
        } else {
            hienThiThongBao('❌ Lỗi khi lưu cài đặt!', true);
        }
    } catch (error) {
        console.error('Lỗi lưu cài đặt:', error);
        hienThiThongBao('❌ Lỗi kết nối!', true);
    }
}

// Đặt lại cài đặt
function datLaiCaiDat() {
    settingTitle.value = '📌 LINK ĐÃ ĐƯỢC RÚT GỌN';
    settingFormat.value = '[TIÊU ĐỀ DO NGƯỜI DÙNG CÀI ĐẶT]\n{link}';
    settingAnonlink.value = '';
    settingLinkx.value = '';
    settingMual.value = '';
    settingHastebin.value = '';
    hienThiThongBao('Đã đặt lại về cài đặt mặc định');
}

// Xóa chat
function xoaChat() {
    chatMessages.innerHTML = `
        <div class="message bot">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="message-text">
                    Chat đã được xóa! Hãy gửi link mới để bắt đầu.
                </div>
                <div class="message-time">Vừa xong</div>
            </div>
        </div>
    `;
    hienThiThongBao('Đã xóa chat');
}

// Xóa lịch sử
async function xoaLichSu() {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử?')) {
        try {
            // Trong thực tế, cần có API xóa lịch sử
            // Ở đây tạm thời tải lại trang
            location.reload();
        } catch (error) {
            console.error('Lỗi xóa lịch sử:', error);
        }
    }
}

// Điều hướng
menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        
        menuItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');
        
        if (page === 'lich-su') {
            taiLichSu();
        }
    });
});

// Sự kiện
sendBtn.addEventListener('click', () => {
    const link = chatInput.value.trim();
    if (link) {
        themTinNhan(link, true);
        xuLyLink(link);
        chatInput.value = '';
    } else {
        hienThiThongBao('Vui lòng nhập link!', true);
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
    }
});

clearChatBtn?.addEventListener('click', xoaChat);
saveSettingsBtn?.addEventListener('click', luuCaiDat);
resetSettingsBtn?.addEventListener('click', datLaiCaiDat);

document.getElementById('clear-history')?.addEventListener('click', xoaLichSu);

// Khởi tạo
taiCaiDat();

// Tự động focus vào ô nhập
chatInput.focus();
