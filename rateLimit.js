const rateLimit = require('express-rate-limit');

// Giới hạn tốc độ cơ bản
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // giới hạn 100 requests mỗi IP
    message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút!' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Giới hạn tốc độ chặt cho API chat
const strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 10, // tối đa 10 requests/phút
    message: { error: 'Bạn đã gửi quá nhiều link, vui lòng đợi 1 phút!' },
    keyGenerator: (req) => req.ip,
});

module.exports = { limiter, strictLimiter };
