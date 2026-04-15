const express = require('express');
const axios = require('axios');
const router = express.Router();

// Lấy cấu hình từ cài đặt (lưu tạm trong bộ nhớ, có thể thay bằng cơ sở dữ liệu)
let caiDat = {
    tieuDe: process.env.DEFAULT_TITLE || '📌 LINK ĐÃ ĐƯỢC RÚT GỌN',
    dinhDang: process.env.DEFAULT_FORMAT || '[TIÊU ĐỀ DO NGƯỜI DÙNG CÀI ĐẶT]\n{link}',
    apiKeys: {
        anonlink: process.env.ANONLINK_API_KEY || '',
        linkx: process.env.LINKX_API_KEY || '',
        mual: process.env.MUAL_API_KEY || ''
    },
    hastebinToken: process.env.HASTEBIN_TOKEN || ''
};

// Lấy cài đặt
router.get('/cai-dat', (req, res) => {
    // Không gửi khóa API về giao diện
    res.json({
        tieuDe: caiDat.tieuDe,
        dinhDang: caiDat.dinhDang,
        coKhoa: {
            anonlink: !!caiDat.apiKeys.anonlink,
            linkx: !!caiDat.apiKeys.linkx,
            mual: !!caiDat.apiKeys.mual,
            hastebin: !!caiDat.hastebinToken
        }
    });
});

// Cập nhật cài đặt
router.post('/cai-dat', (req, res) => {
    const { tieuDe, dinhDang, apiKeys, hastebinToken } = req.body;
    
    if (tieuDe) caiDat.tieuDe = tieuDe;
    if (dinhDang) caiDat.dinhDang = dinhDang;
    if (apiKeys) {
        if (apiKeys.anonlink) caiDat.apiKeys.anonlink = apiKeys.anonlink;
        if (apiKeys.linkx) caiDat.apiKeys.linkx = apiKeys.linkx;
        if (apiKeys.mual) caiDat.apiKeys.mual = apiKeys.mual;
    }
    if (hastebinToken) caiDat.hastebinToken = hastebinToken;
    
    res.json({ thanhCong: true, thongBao: 'Đã lưu cài đặt!' });
});

// Xử lý link chat
router.post('/xu-ly-link', async (req, res) => {
    const { link } = req.body;
    
    if (!link) {
        return res.status(400).json({ error: 'Vui lòng nhập link!' });
    }
    
    // Kiểm tra URL
    try {
        new URL(link);
    } catch (e) {
        return res.status(400).json({ error: 'Link không hợp lệ!' });
    }
    
    try {
        // Bước 1: Định dạng nội dung
        const noiDungDaDinhDang = caiDat.dinhDang.replace('{link}', link);
        const noiDungCuoi = `${caiDat.tieuDe}\n${noiDungDaDinhDang}`;
        
        // Bước 2: Tải lên hastebin
        let hastebinUrl;
        try {
            const phanHoiHastebin = await axios.post('https://hastebin.com/documents', noiDungCuoi, {
                headers: {
                    'Content-Type': 'text/plain',
                    ...(caiDat.hastebinToken && { 'Authorization': `Bearer ${caiDat.hastebinToken}` })
                }
            });
            
            const key = phanHoiHastebin.data.key;
            hastebinUrl = `https://hastebin.com/${key}`;
        } catch (error) {
            console.error('Lỗi Hastebin:', error.message);
            return res.status(500).json({ error: 'Không thể tải lên hastebin!' });
        }
        
        // Bước 3 & 4: Rút gọn qua các API
        const ketQua = {};
        const loi = [];
        
        // Hàm gọi API rút gọn
        const rutGonUrl = async (tenApi, urlApi, apiKey) => {
            if (!apiKey) {
                loi.push(`${tenApi}: Chưa cấu hình khóa API`);
                return null;
            }
            
            try {
                const phanHoi = await axios.get(urlApi, {
                    params: {
                        api: apiKey,
                        url: hastebinUrl,
                        format: 'text'
                    },
                    timeout: 10000
                });
                
                if (phanHoi.data && typeof phanHoi.data === 'string' && phanHoi.data.startsWith('http')) {
                    return phanHoi.data;
                } else if (phanHoi.data && phanHoi.data.url) {
                    return phanHoi.data.url;
                } else if (phanHoi.data && phanHoi.data.shortened_url) {
                    return phanHoi.data.shortened_url;
                } else {
                    return phanHoi.data.toString();
                }
            } catch (error) {
                console.error(`${tenApi} lỗi:`, error.message);
                loi.push(`${tenApi}: ${error.response?.data?.message || error.message}`);
                return null;
            }
        };
        
        // Gọi đồng thời 3 API
        const [ketQuaAnonlink, ketQuaLinkx, ketQuaMual] = await Promise.all([
            rutGonUrl('anonlink', 'https://anonlink.co/api', caiDat.apiKeys.anonlink),
            rutGonUrl('linkx', 'https://linkx.me/api', caiDat.apiKeys.linkx),
            rutGonUrl('mual', 'https://mual.ink/api', caiDat.apiKeys.mual)
        ]);
        
        // Tạo kết quả trả về
        let dauRa = `${caiDat.tieuDe}\n\n`;
        
        if (ketQuaAnonlink) {
            dauRa += `🔗 anonlink: ${ketQuaAnonlink}\n`;
            ketQua.anonlink = ketQuaAnonlink;
        }
        
        if (ketQuaLinkx) {
            dauRa += `🔗 linkx: ${ketQuaLinkx}\n`;
            ketQua.linkx = ketQuaLinkx;
        }
        
        if (ketQuaMual) {
            dauRa += `🔗 mual: ${ketQuaMual}\n`;
            ketQua.mual = ketQuaMual;
        }
        
        if (Object.keys(ketQua).length === 0) {
            return res.status(500).json({ 
                error: 'Không thể rút gọn link qua bất kỳ API nào!',
                chiTiet: loi 
            });
        }
        
        // Thêm link gốc hastebin
        dauRa += `\n📄 Link gốc: ${hastebinUrl}`;
        
        res.json({
            thanhCong: true,
            dauRa: dauRa,
            ketQua: ketQua,
            loi: loi.length > 0 ? loi : null,
            hastebinUrl: hastebinUrl
        });
        
    } catch (error) {
        console.error('Lỗi xử lý:', error);
        res.status(500).json({ error: 'Đã có lỗi xảy ra khi xử lý link!' });
    }
});

// Lấy lịch sử chat (lưu tạm trong bộ nhớ)
let lichSuChat = [];

router.get('/lich-su', (req, res) => {
    res.json(lichSuChat.slice(-50));
});

router.post('/lich-su', (req, res) => {
    const { tinNhan, loai, links } = req.body;
    lichSuChat.push({
        id: Date.now(),
        thoiGian: new Date().toISOString(),
        tinNhan: tinNhan,
        loai: loai,
        links: links,
        trinhDuyet: req.headers['user-agent']
    });
    
    // Giới hạn lịch sử
    if (lichSuChat.length > 200) {
        lichSuChat = lichSuChat.slice(-200);
    }
    
    res.json({ thanhCong: true });
});

module.exports = router;
