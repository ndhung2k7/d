require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const { limiter, strictLimiter } = require('./rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Giới hạn tốc độ cho tất cả requests
app.use('/api', strictLimiter);
app.use(limiter);

// Phục vụ file tĩnh
app.use(express.static(path.join(__dirname, 'frontend')));

// Routes API
app.use('/api', apiRoutes);

// Route cho giao diện
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/cai-dat', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Xử lý lỗi 404
app.use((req, res) => {
    res.status(404).json({ error: 'Không tìm thấy đường dẫn' });
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Đã có lỗi xảy ra trên máy chủ!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Máy chủ đang chạy tại http://localhost:${PORT}`);
    console.log(`📱 Giao diện chat: http://localhost:${PORT}`);
    console.log(`⚙️ Cài đặt: http://localhost:${PORT}/cai-dat`);
});
