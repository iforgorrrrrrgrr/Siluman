// SILUMAN - Game Logic Engine (Revisi Bahasa Indonesia - Versi Horor)

// Global State
const state = {
    act: 1,
    currentStage: 1,
    quizStep: 1,
    puzzles: {
        pattern: false,
        visual: false,
        audio: false,
        file: false,
        geo: false,
        instagram: false,
        youtube: false
    },
    terminalHistory: [],
    audioContext: null,
    ambientHumNode: null,
    beaconNode: null,
    beaconBufferNormal: null,
    beaconBufferReversed: null,
    analyserNode: null,
    visualizerAnimationId: null,
    audioPlaying: false,
    lockoutActive: false,
    glitchIntervalId: null,
    revealTimeout: null
};

// ----------------------------------------------------
// STATE PERSISTENCE
// ----------------------------------------------------
function saveState() {
    const saveData = {
        act: state.act,
        currentStage: state.currentStage,
        quizStep: state.quizStep,
        puzzles: state.puzzles
    };
    localStorage.setItem('siluman_save', JSON.stringify(saveData));
}

function loadState() {
    const saved = localStorage.getItem('siluman_save');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.act = parsed.act || 1;
            state.currentStage = parsed.currentStage || 1;
            state.quizStep = parsed.quizStep || 1;
            if (parsed.puzzles) {
                state.puzzles = { ...state.puzzles, ...parsed.puzzles };
            }
        } catch (e) {
            console.error("Gagal memuat save data", e);
        }
    }
}

// HTML Elements
const views = {
    splash: document.getElementById('splash-screen'),
    quiz: document.getElementById('quiz-screen'),
    failure: document.getElementById('failure-screen'),
    terminal: document.getElementById('terminal-screen'),
    recruitment: document.getElementById('recruitment-screen'),
    endingAccept: document.getElementById('ending-accept'),
    endingDecline: document.getElementById('ending-decline')
};

// -------------------------------------------------------
// QUIZ DATABASE — Hanya wajah + ya/tidak, Bahasa Indonesia
// Beberapa soal punya glitch delay pada gambar atau pilihan
// -------------------------------------------------------
const quizDatabase = {
    1: [
        {
            type: 'face',
            imgSrc: 'Stage1_1.png',
            title: 'Wajah ini muncul di kamera keamanan pukul 03.17 pagi.',
            desc: 'Apakah ini manusia atau siluman?',
            glitchImage: false,
            glitchOptions: false
        },
        {
            type: 'face',
            imgSrc: 'stage1_2.png',
            title: 'Rekaman CCTV menunjukkan entitas ini berdiri diam selama 4 jam.',
            desc: 'Apakah ini siluman?',
            glitchImage: true,
            glitchOptions: false
        },
        {
            type: 'binary_personal',
            title: 'Apakah kamu sendirian di ruangan ini sekarang?',
            desc: 'Sensor termal mendeteksi keberadaan sekunder.',
            btnYesText: 'TIDAK',
            btnNoText: 'YA',
            glitchImage: false,
            glitchOptions: false
        },
        {
            type: 'face',
            imgSrc: 'stage1_3.png',
            title: 'Wajah ini terlihat berbeda dari gambar sebelumnya.',
            desc: 'Apakah sesuatu telah berubah?',
            glitchImage: false,
            glitchOptions: true
        },
        {
            type: 'binary_personal',
            title: 'Apakah kamu mendengar ketukan?',
            desc: 'Sistem mendeteksi getaran berfrekuensi rendah di sekitarmu.',
            playKnock: true,
            glitchImage: false,
            glitchOptions: false
        }
    ],
    2: [
        {
            type: 'face',
            imgSrc: 'Stage2_1.png',
            title: 'Entitas ini terlihat pada rekaman yang sama, tapi di sudut berbeda.',
            desc: 'Apakah ini siluman yang sama?',
            glitchImage: true,
            glitchOptions: false
        },
        {
            type: 'binary_personal',
            title: 'Siapa itu di belakangmu?',
            desc: 'Jangan menoleh. Jawab saja.',
            btnYesText: 'SILUMAN',
            btnNoText: 'SAYA SENDIRI',
            glitchImage: false,
            glitchOptions: false
        },
        {
            type: 'face',
            imgSrc: 'stage2_2.png',
            title: 'Wajah ini muncul di setiap rekaman yang kami analisis.',
            desc: 'Apakah menurutmu ini manusia biasa?',
            glitchImage: false,
            glitchOptions: true
        },
        {
            type: 'binary_personal',
            title: 'Apakah kamu merasakan suhu ruangan turun?',
            desc: 'Sensor termal kami mendeteksi penurunan 6 derajat di lokasi kamu.',
            glitchImage: false,
            glitchOptions: false
        }
    ],
    3: [
        {
            type: 'face',
            imgSrc: 'stage3_1.png',
            title: 'Rekaman ini diambil di rumahmu sendiri.',
            desc: 'Apakah kamu mengenali entitas di wajah ini?',
            glitchImage: true,
            glitchOptions: false
        },
        {
            type: 'binary_personal',
            title: 'Suara siapa itu?',
            desc: 'Kami mendeteksi suara napas di luar jangkauan pendengaranmu.',
            btnYesText: 'ADA ORANG LAIN',
            btnNoText: 'SUARA ANGIN',
            playVoice: true,
            glitchImage: false,
            glitchOptions: true
        },
        {
            type: 'face',
            imgSrc: 'stage3_2.png',
            title: 'Wajah ini menatap langsung ke kamera. Kamera itu di kamarmu.',
            desc: 'Apakah ini benar-benar hanya bayangan?',
            glitchImage: true,
            glitchOptions: true
        }
    ],
    4: [
        {
            type: 'face',
            imgSrc: 'stage4.png',
            title: 'Foto ini ditemukan di dalam komputer kamu.',
            desc: 'Kamu tidak pernah mengunduhnya. Apakah ini siluman?',
            glitchImage: true,
            glitchOptions: false
        },
        {
            type: 'binary_personal',
            title: 'Apakah ini benar-benar komputermu?',
            desc: 'Berkas akses tidak sah terdeteksi sejak 3 menit yang lalu.',
            btnYesText: 'BUKAN',
            btnNoText: 'YA',
            glitchImage: false,
            glitchOptions: false
        }
    ],
    5: [
        {
            type: 'face',
            imgSrc: 'stage5.png',
            zoomClass: 'face-zoom-5',
            title: 'Wajah ini ada di setiap kota yang pernah kamu kunjungi.',
            desc: 'Mereka mengikutimu. Apakah ini siluman?',
            glitchImage: true,
            glitchOptions: true,
            triggerFailure: true
        }
    ],
    6: [
        {
            type: 'face',
            imgSrc: 'stage6.png',
            zoomClass: 'face-zoom-6',
            title: 'KONEKSI RUSAK. SINYAL MENGGANGGU DATA VISUAL.',
            desc: 'Apakah kamu masih ingin melanjutkan?',
            glitchImage: true,
            glitchOptions: false,
            triggerFailure: true
        }
    ],
    7: [
        {
            type: 'face',
            imgSrc: 'stage7.png',
            zoomClass: 'face-zoom-7',
            title: 'APAKAH ITU MASIH ADA DI SANA? (LEVEL KRITIS 7)',
            desc: 'RUNTIME CLASSIFIER GAGAL. PILIH UNTUK MENGHENTIKAN PROTOKOL.',
            glitchImage: true,
            glitchOptions: true,
            triggerFailure: true
        }
    ]
};

// Initialize Application
window.addEventListener('DOMContentLoaded', () => {
    console.log("%c[SISTEM] SILUMAN ARG Admin Bypass", "color: #00f0ff; font-weight: bold; font-size: 14px;");
    console.log("Ketik resetProtocol() untuk memulai ulang sesi.");

    if (localStorage.getItem('siluman_lockout') === 'true') {
        activateView('endingDecline');
        runDeclineTypewriter();
        return;
    }

    loadState(); // Memuat progress sebelumnya

    setupEventHandlers();
    setupVisualCalibration();

    // Jika sudah di stage terminal (stage > 1, atau stage 1 tapi sedang di bypass)
    // Untuk sederhana, jika sudah pernah main, masuk ke splash dulu atau langsung lanjut?
    // User bilang "saat refresh halaman dia tetap/save".
    // Kita arahkan sesuai currentStage, tapi biarkan player klik INISIALISASI dulu dari splash
    // supaya audio context berjalan dengan benar setelah interaksi user.
});

// Helper: Switch active views
function activateView(viewKey) {
    Object.keys(views).forEach(key => {
        if (key === viewKey) {
            views[key].style.display = 'flex';
            views[key].offsetHeight;
            views[key].classList.add('active');
        } else {
            views[key].classList.remove('active');
            views[key].style.display = 'none';
        }
    });

    if (viewKey === 'terminal') {
        focusTerminalInput();
        startVisualizer();
        configureTerminalUIForStage();
    } else {
        stopVisualizer();
    }
}

// Configure Diagnostic Tool Tabs based on Stage
function configureTerminalUIForStage() {
    const dashboard = document.querySelector('.terminal-dashboard');
    const tools = document.querySelector('.terminal-tools');

    const btnVisual = document.getElementById('btn-tab-visual');
    const btnAudio = document.getElementById('btn-tab-audio');
    const btnFeeds = document.getElementById('btn-tab-feeds');

    const tabVisual = document.getElementById('tab-visual');
    const tabAudio = document.getElementById('tab-audio');
    const tabFeeds = document.getElementById('tab-feeds');

    const fGeo = document.getElementById('feed-geo');
    const fInsta = document.getElementById('feed-instagram');
    const fYoutube = document.getElementById('feed-youtube');
    const fBadge = document.getElementById('feeds-badge');

    const logBox = document.getElementById('terminal-log');
    logBox.innerHTML = '';

    logToTerminal("--------------------------------------------------", "info");
    logToTerminal("SILUMAN SYSTEM DIAGNOSTICS BYPASS v1.0.8", "info");
    logToTerminal(`STAGE ${state.currentStage} REPAIR INTERFACE ONLINE`, "info");
    logToTerminal("--------------------------------------------------", "info");

    btnVisual.style.display = 'inline-block';
    btnAudio.style.display = 'inline-block';
    btnFeeds.style.display = 'none'; // Hide External Feeds by default
    tools.style.display = 'flex';
    dashboard.classList.remove('stage-1');

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tool-content').forEach(c => c.classList.remove('active'));

    switch (state.currentStage) {
        case 1:
            tools.style.display = 'none';
            dashboard.classList.add('stage-1');
            logToTerminal("[WARN] Buffer memori berisi aliran terenkripsi. Dekode diperlukan.", "warning");
            logToTerminal("ROT-3 BEACON SIGNAL ID: 'SDWWHUQ'", "warning");
            logToTerminal("Format: 'submit [nilai]'", "info");
            break;

        case 2:
            btnVisual.classList.add('active');
            tabVisual.classList.add('active');
            btnAudio.style.display = 'none';
            logToTerminal("[KRITIS] Aset visual classifier rusak.", "error");
            logToTerminal("Kalibrasi brightness, contrast, dan threshold untuk menemukan kunci.", "info");
            break;

        case 3:
            btnAudio.classList.add('active');
            tabAudio.classList.add('active');
            logToTerminal("[KRITIS] Sinyal audio sub-frekuensi menyiarkan data telemetri.", "error");
            logToTerminal("Putar suara ini sepertinya ada yang aneh, perhatikan dengan seksama.", "info");
            break;

        case 4:
            btnVisual.classList.add('active');
            tabVisual.classList.add('active');
            logToTerminal("[KRITIS] Verifikasi handshake offline diperlukan.", "error");
            logToTerminal("Unduh blokir otomatis. Temukan file 'verification.html' di folder game.", "warning");
            logToTerminal("ketik 'download' untuk instruksi lengkap.", "info");
            break;

        case 5:
            btnFeeds.style.display = 'inline-block';
            btnFeeds.classList.add('active');
            tabFeeds.classList.add('active');
            fGeo.classList.remove('feed-masked');
            fInsta.classList.add('feed-masked');
            fYoutube.classList.add('feed-masked');
            fBadge.textContent = "Signal Masked";
            fBadge.className = "badge red animate-pulse";
            logToTerminal("[WARN] Anomali geografis terdeteksi. Sinkronisasi telemetri satelit.", "warning");
            logToTerminal("Pecahkan koordinat landmark bersejarah Jakarta.", "info");
            break;

        case 6:
            btnFeeds.style.display = 'inline-block';
            btnFeeds.classList.add('active');
            tabFeeds.classList.add('active');
            fGeo.classList.remove('feed-masked');
            fInsta.classList.remove('feed-masked');
            fYoutube.classList.add('feed-masked');
            fBadge.textContent = "Signal Intercepted";
            fBadge.className = "badge yellow animate-pulse";
            logToTerminal("[WARN] Intersepsi komunikasi Vanguard aktif.", "warning");
            logToTerminal("Buka profil untuk mendapatkan kode.", "info");
            break;

        case 7:
            btnFeeds.style.display = 'inline-block';
            btnFeeds.classList.add('active');
            tabFeeds.classList.add('active');
            fGeo.classList.remove('feed-masked');
            fInsta.classList.remove('feed-masked');
            fYoutube.classList.remove('feed-masked');
            fBadge.textContent = "Signal Decoded";
            fBadge.className = "badge green animate-pulse";
            logToTerminal("[WARN] Feed video gelombang pendek terdekripsi.", "warning");
            logToTerminal("Akses metadata siaran YouTube untuk mendapatkan kunci terakhir.", "info");
            break;
    }
}

// ----------------------------------------------------
// EVENT HANDLERS
// ----------------------------------------------------
function setupEventHandlers() {
    document.getElementById('btn-start').addEventListener('click', () => {
        initAudio();
        playGlitchSound();
        startGlitchEngine();

        // If resuming a saved session
        if (state.currentStage > 1 || state.puzzles.pattern || state.puzzles.visual || state.puzzles.audio) {
            logToTerminal("MENGEMBALIKAN SESI SEBELUMNYA...", "system");
            activateView('terminal');
        } else {
            startQuizRound(state.currentStage);
        }
    });

    // YES button on FACE questions
    document.getElementById('btn-face-yes').addEventListener('click', () => {
        playBeepSound();
        const config = quizDatabase[state.currentStage][state.quizStep - 1];
        if (config && config.triggerFailure) {
            triggerSystemFailure();
        } else {
            advanceQuiz();
        }
    });

    // NO button on FACE questions — also triggers failure (they always should continue)
    document.getElementById('btn-face-no').addEventListener('click', () => {
        playBeepSound();
        const config = quizDatabase[state.currentStage][state.quizStep - 1];
        if (state.currentStage === 6 || state.currentStage === 7) {
            triggerFatalGlitchAndRedirect();
        } else if (config && config.triggerFailure) {
            triggerSystemFailure();
        } else {
            advanceQuiz();
        }
    });

    // YES button on BINARY PERSONAL questions
    document.getElementById('btn-see-yes').addEventListener('click', () => {
        playBeepSound();
        const config = quizDatabase[state.currentStage][state.quizStep - 1];
        if (config && config.triggerFailure) {
            triggerSystemFailure();
        } else {
            advanceQuiz();
        }
    });

    // NO button (binary personal) — moves away on hover, triggers failure on click
    const noBtn = document.getElementById('btn-see-no');
    noBtn.addEventListener('mouseover', () => {
        const container = document.querySelector('.binary-choices');
        const rect = container.getBoundingClientRect();

        // Keep position absolute so random placement works
        noBtn.style.position = 'absolute';
        noBtn.style.transform = 'none';

        const maxX = Math.max(0, rect.width - noBtn.offsetWidth - 10);
        const maxY = Math.max(0, rect.height - noBtn.offsetHeight - 10);

        const randomX = Math.floor(Math.random() * maxX);
        const randomY = Math.floor(Math.random() * maxY);

        noBtn.style.left = `${randomX}px`;
        noBtn.style.top = `${randomY}px`;
        playBeepSound(400, 0.05);
    });

    noBtn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerSystemFailure();
    });

    // Failure repair button
    document.getElementById('btn-repair').addEventListener('click', () => {
        playGlitchSound();
        activateView('terminal');
    });

    // Terminal tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tool-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            const tabId = e.target.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            playBeepSound(800, 0.05);
        });
    });

    // Terminal inputs
    const termInput = document.getElementById('terminal-input');
    termInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const commandLine = termInput.value;
            termInput.value = '';
            if (commandLine.trim()) {
                handleTerminalCommand(commandLine);
            }
        }
    });

    document.querySelector('.terminal-shell').addEventListener('click', focusTerminalInput);

    // Audio Analyst controls
    document.getElementById('btn-audio-play').addEventListener('click', playBeacon);
    document.getElementById('btn-audio-stop').addEventListener('click', stopBeacon);

    const speedSlider = document.getElementById('audio-speed');
    const speedVal = document.getElementById('speed-val');
    speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        speedVal.textContent = `${speed.toFixed(2)}x`;
        if (state.beaconNode && state.audioPlaying) {
            state.beaconNode.playbackRate.value = speed;
        }
    });

    document.getElementById('audio-reverse').addEventListener('change', () => {
        if (state.audioPlaying) { stopBeacon(); playBeacon(); }
    });

    document.getElementById('audio-filter').addEventListener('change', () => {
        if (state.audioPlaying) { stopBeacon(); playBeacon(); }
    });

    // Recruitment buttons
    document.getElementById('btn-accept').addEventListener('click', () => {
        playAcceptChime();
        activateView('endingAccept');
    });

    document.getElementById('btn-decline').addEventListener('click', () => {
        playDeclineCrash();
        localStorage.setItem('siluman_lockout', 'true');
        activateView('endingDecline');
        runDeclineTypewriter();
    });
}

function focusTerminalInput() {
    const input = document.getElementById('terminal-input');
    if (input) input.focus();
}

// ----------------------------------------------------
// QUIZ MANAGEMENT
// ----------------------------------------------------
function startQuizRound(stageNum) {
    state.currentStage = stageNum;
    state.quizStep = 1;
    saveState();
    startGlitchEngine();
    activateView('quiz');
    renderQuestion();
}

function renderQuestion() {
    const config = quizDatabase[state.currentStage][state.quizStep - 1];

    // Hide both question containers
    document.getElementById('question-face').classList.add('hidden');
    document.getElementById('question-binary').classList.add('hidden');

    // Clear any pending reveal timeouts
    if (state.revealTimeout) {
        clearTimeout(state.revealTimeout);
        state.revealTimeout = null;
    }

    if (config.type === 'face') {
        renderFaceQuestion(config);
    } else if (config.type === 'binary_personal') {
        renderBinaryQuestion(config);
    }
}

function renderFaceQuestion(config) {
    const container = document.getElementById('question-face');

    // Update title and desc
    container.querySelector('.q-title').textContent = config.title;
    container.querySelector('.q-desc').textContent = config.desc;

    // Update face image source
    const faceImg = document.getElementById('quiz-face-grid');
    
    // Assign correct file name from config
    faceImg.src = config.imgSrc || 'Stage1_1.png';
    faceImg.className = 'quiz-image'; 

    const imageWrapper = container.querySelector('.quiz-image-wrapper');
    const optionsWrapper = container.querySelector('.face-binary-options');

    // Hide image and options initially
    imageWrapper.style.opacity = '0';
    imageWrapper.style.transform = 'scale(0.95)';
    optionsWrapper.style.opacity = '0';
    optionsWrapper.style.transform = 'translateY(12px)';

    container.classList.remove('hidden');

    // If glitch on image: delay image appearance
    const imageDelay = config.glitchImage ? (800 + Math.random() * 1200) : 300;
    // If glitch on options: delay options appearance after image
    const optionsDelay = imageDelay + (config.glitchOptions ? (600 + Math.random() * 1000) : 400);

    // Play scary sounds if needed
    if (config.playKnock) {
        setTimeout(() => playKnockingSound(), imageDelay + 200);
    }
    if (config.playVoice) {
        setTimeout(() => playWhisperSound(), imageDelay + 300);
    }

    // Reveal image
    state.revealTimeout = setTimeout(() => {
        if (config.glitchImage) {
            triggerImageStaticGlitch(imageWrapper);
        }
        imageWrapper.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        imageWrapper.style.opacity = '1';
        imageWrapper.style.transform = 'scale(1)';

        // Reveal options after image
        state.revealTimeout = setTimeout(() => {
            if (config.glitchOptions) {
                triggerOptionsGlitch(optionsWrapper);
            }
            optionsWrapper.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            optionsWrapper.style.opacity = '1';
            optionsWrapper.style.transform = 'translateY(0)';
        }, optionsDelay - imageDelay);
    }, imageDelay);
}

function renderBinaryQuestion(config) {
    const container = document.getElementById('question-binary');

    container.querySelector('.q-title').textContent = config.title;
    container.querySelector('.q-desc').textContent = config.desc;

    const optionsWrapper = container.querySelector('.binary-choices');

    // Update button texts if custom
    const btnYes = document.getElementById('btn-see-yes');
    const btnNo = document.getElementById('btn-see-no');
    btnYes.textContent = config.btnYesText || 'YA';
    btnNo.textContent = config.btnNoText || 'TIDAK';

    // Reset NO button to natural position
    const noBtn = document.getElementById('btn-see-no');
    resetNoBtnPosition();

    // Hide elements initially
    container.style.opacity = '0';
    container.style.transform = 'translateY(12px)';
    container.classList.remove('hidden');

    // Play scary sounds if needed
    if (config.playKnock) {
        setTimeout(() => playKnockingSound(), 600);
    }
    if (config.playVoice) {
        setTimeout(() => playWhisperSound(), 400);
    }

    const delay = config.glitchOptions ? (800 + Math.random() * 1200) : 300;

    state.revealTimeout = setTimeout(() => {
        container.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';

        // Then reveal options with potential delay
        const optDelay = config.glitchOptions ? (600 + Math.random() * 800) : 300;
        optionsWrapper.style.opacity = '0';
        setTimeout(() => {
            optionsWrapper.style.transition = 'opacity 0.5s ease';
            optionsWrapper.style.opacity = '1';
        }, optDelay);
    }, delay);
}

function resetNoBtnPosition() {
    const noBtn = document.getElementById('btn-see-no');
    // Always absolute inside .binary-choices (position: relative)
    noBtn.style.position = 'absolute';
    noBtn.style.left = '170px';
    noBtn.style.top = '50%';
    noBtn.style.transform = 'translateY(-50%)';
    noBtn.style.transition = 'left 0.12s ease, top 0.12s ease';
}

function triggerImageStaticGlitch(el) {
    el.classList.add('glitch-static-flash');
    playBeepSound(200, 0.15);
    setTimeout(() => el.classList.remove('glitch-static-flash'), 400);
}

function triggerOptionsGlitch(el) {
    playBeepSound(150, 0.1);
    el.classList.add('glitch-options-flash');
    setTimeout(() => el.classList.remove('glitch-options-flash'), 300);
}

function advanceQuiz() {
    const maxQuestions = quizDatabase[state.currentStage].length;
    if (state.quizStep < maxQuestions) {
        state.quizStep++;
        saveState();
        renderQuestion();
    } else {
        triggerSystemFailure();
    }
}

function triggerSystemFailure() {
    stopBeacon();
    playGlitchSweep();
    document.body.classList.add('glitch-active');

    const errorBox = document.querySelector('.fatal-error-box');
    if (errorBox) {
        errorBox.querySelector('.error-code').textContent = `ERROR_CODE: 0x800F0${state.currentStage}03 [ALIGNMENT_ANOMALY_STAGE_${state.currentStage}]`;
    }

    setTimeout(() => {
        document.body.classList.remove('glitch-active');
        activateView('failure');
    }, 1200);
}

function resolveStageSuccess(stageCompleted) {
    stopBeacon();

    if (state.glitchIntervalId) clearInterval(state.glitchIntervalId);

    document.body.classList.add('body-glitch-shake');
    document.body.classList.add('body-glitch-invert');
    playGlitchSweep();

    logToTerminal(`SISTEM DIPULIHKAN. MENGKOMPILASI PARAMETER REBOOT UNTUK STAGE ${stageCompleted + 1}...`, "system");

    setTimeout(() => {
        document.body.classList.remove('body-glitch-shake');
        document.body.classList.remove('body-glitch-invert');

        if (stageCompleted < 7) {
            startQuizRound(stageCompleted + 1);
        } else {
            activateView('recruitment');
        }
    }, 2000);
}

// ----------------------------------------------------
// WEB AUDIO API SYNTHESIZER
// ----------------------------------------------------
function initAudio() {
    if (state.audioContext) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextClass();

    startCreepyAmbiance();

    generateBeaconBuffer();

    state.analyserNode = state.audioContext.createAnalyser();
    state.analyserNode.fftSize = 128;
}

function playBeepSound(freq = 600, duration = 0.08) {
    if (!state.audioContext) return;
    const osc = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, state.audioContext.currentTime);
    gain.gain.setValueAtTime(0.05, state.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, state.audioContext.currentTime + duration);
    osc.connect(gain);
    gain.connect(state.audioContext.destination);
    osc.start();
    osc.stop(state.audioContext.currentTime + duration);
}

function playGlitchSound() {
    if (!state.audioContext) return;
    const osc = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, state.audioContext.currentTime);
    osc.frequency.setValueAtTime(40, state.audioContext.currentTime + 0.05);
    osc.frequency.setValueAtTime(200, state.audioContext.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, state.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, state.audioContext.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(state.audioContext.destination);
    osc.start();
    osc.stop(state.audioContext.currentTime + 0.3);
}

function playGlitchSweep() {
    if (!state.audioContext) return;
    const duration = 1.0;
    const osc = state.audioContext.createOscillator();
    const noiseNode = state.audioContext.createBufferSource();
    const oscGain = state.audioContext.createGain();
    const noiseGain = state.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, state.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, state.audioContext.currentTime + duration);

    const bufferSize = state.audioContext.sampleRate * duration;
    const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    noiseNode.buffer = buffer;

    oscGain.gain.setValueAtTime(0.12, state.audioContext.currentTime);
    oscGain.gain.linearRampToValueAtTime(0.001, state.audioContext.currentTime + duration);

    noiseGain.gain.setValueAtTime(0.1, state.audioContext.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, state.audioContext.currentTime + duration);

    osc.connect(oscGain);
    oscGain.connect(state.audioContext.destination);
    noiseNode.connect(noiseGain);
    noiseGain.connect(state.audioContext.destination);

    osc.start();
    noiseNode.start();
    osc.stop(state.audioContext.currentTime + duration);
    noiseNode.stop(state.audioContext.currentTime + duration);
}

// SCARY SOUNDS
function playKnockingSound() {
    if (!state.audioContext) return;
    const now = state.audioContext.currentTime;
    // 3 knocks
    [0, 0.45, 0.9].forEach(offset => {
        const osc = state.audioContext.createOscillator();
        const gain = state.audioContext.createGain();
        const filter = state.audioContext.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now + offset);
        osc.frequency.exponentialRampToValueAtTime(30, now + offset + 0.12);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(120, now + offset);

        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.25, now + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(state.audioContext.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.25);
    });
}

function playWhisperSound() {
    if (!state.audioContext) return;
    const now = state.audioContext.currentTime;
    const duration = 2.5;

    // Create noise
    const bufferSize = state.audioContext.sampleRate * duration;
    const buffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = state.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = state.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.Q.setValueAtTime(5, now);

    const gain = state.audioContext.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.5);
    gain.gain.setValueAtTime(0.07, now + duration - 0.5);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    // Add a subtle pitch oscillation to simulate breathing/voice
    const modOsc = state.audioContext.createOscillator();
    const modGain = state.audioContext.createGain();
    modOsc.frequency.setValueAtTime(3.5, now);
    modGain.gain.setValueAtTime(500, now);
    modOsc.connect(modGain);
    modGain.connect(filter.frequency);
    modOsc.start(now);
    modOsc.stop(now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(state.audioContext.destination);

    noise.start(now);
    noise.stop(now + duration);
}

function playAcceptChime() {
    if (!state.audioContext) return;
    const now = state.audioContext.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25];

    notes.forEach((freq, idx) => {
        const osc = state.audioContext.createOscillator();
        const gain = state.audioContext.createGain();
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.8);
        osc.connect(gain);
        gain.connect(state.audioContext.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 1.0);
    });
}

function playDeclineCrash() {
    if (!state.audioContext) return;
    const duration = 3.0;
    const now = state.audioContext.currentTime;

    const osc = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(10, now + duration);

    const filter = state.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(30, now + duration);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(state.audioContext.destination);

    osc.start(now);
    osc.stop(now + duration);

    stopCreepyAmbiance();
}

// ----------------------------------------------------
// CREEPY AMBIENCE GENERATOR
// ----------------------------------------------------
function startCreepyAmbiance() {
    if (!state.audioContext) return;
    const ctx = state.audioContext;
    const now = ctx.currentTime;

    // 1. Deep Sub Drone (Dark rumble)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(45, now);
    
    const subLfo = ctx.createOscillator();
    subLfo.type = 'sine';
    subLfo.frequency.setValueAtTime(0.2, now); // Very slow
    const subLfoGain = ctx.createGain();
    subLfoGain.gain.setValueAtTime(5, now);
    subLfo.connect(subLfoGain);
    subLfoGain.connect(subOsc.frequency); // Modulate pitch slightly

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.25, now);
    
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    
    subOsc.start();
    subLfo.start();

    // 2. Dissonant Mid Drone
    const midOsc1 = ctx.createOscillator();
    midOsc1.type = 'sawtooth';
    midOsc1.frequency.setValueAtTime(110, now);
    
    const midOsc2 = ctx.createOscillator();
    midOsc2.type = 'sawtooth';
    midOsc2.frequency.setValueAtTime(114, now); // Dissonant beating
    
    const midFilter = ctx.createBiquadFilter();
    midFilter.type = 'lowpass';
    midFilter.frequency.setValueAtTime(150, now);

    // LFO for the mid filter to make it "breathe"
    const filterLfo = ctx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.setValueAtTime(0.1, now); // 10 seconds per cycle
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.setValueAtTime(100, now);
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(midFilter.frequency);

    const midGain = ctx.createGain();
    midGain.gain.setValueAtTime(0.05, now);

    midOsc1.connect(midFilter);
    midOsc2.connect(midFilter);
    midFilter.connect(midGain);
    midGain.connect(ctx.destination);

    midOsc1.start();
    midOsc2.start();
    filterLfo.start();

    // 3. Eerie High Ringing
    const highOsc = ctx.createOscillator();
    highOsc.type = 'sine';
    highOsc.frequency.setValueAtTime(1800, now);
    
    const highGain = ctx.createGain();
    highGain.gain.setValueAtTime(0, now); // Start silent

    state.creepyAmbianceIntervals = [];
    state.creepyAmbianceIntervals.push(setInterval(() => {
        if(Math.random() > 0.6 && state.audioContext) {
            const t = state.audioContext.currentTime;
            highGain.gain.linearRampToValueAtTime(0.015, t + 4);
            highGain.gain.linearRampToValueAtTime(0, t + 10);
        }
    }, 12000));

    highOsc.connect(highGain);
    highGain.connect(ctx.destination);
    highOsc.start();

    // 4. Random Whispers & Knocks
    state.creepyAmbianceIntervals.push(setInterval(() => {
        const rand = Math.random();
        // Don't play if the audio context is suspended or stopped
        if(state.audioContext && state.audioContext.state === 'running') {
            if (rand > 0.85) {
                playWhisperSound();
            } else if (rand > 0.7) {
                playKnockingSound();
            }
        }
    }, 15000));

    // Save nodes to state so we can stop them
    state.ambientNodes = [subOsc, subLfo, midOsc1, midOsc2, filterLfo, highOsc];
}

function stopCreepyAmbiance() {
    if (state.ambientNodes) {
        state.ambientNodes.forEach(node => {
            try { node.stop(); } catch(e) {}
        });
        state.ambientNodes = [];
    }
    if (state.creepyAmbianceIntervals) {
        state.creepyAmbianceIntervals.forEach(clearInterval);
        state.creepyAmbianceIntervals = [];
    }
}

// ----------------------------------------------------
// PUZZLE SIGNAL (MORSE BEACON GENERATION)
// ----------------------------------------------------
function generateBeaconBuffer() {
    const sampleRate = state.audioContext.sampleRate;
    const dotLen = 0.12;
    const dashLen = dotLen * 3;
    const gapLen = dotLen;
    const letterGap = dotLen * 3;
    const wordGap = dotLen * 7;

    const morsePattern = [
        'dash', 'gap', 'dash', 'gap', 'dash', 'letter', // O
        'dot', 'gap', 'dot', 'gap', 'dash', 'letter',   // U
        'dash', 'letter',                               // T
        'dot', 'gap', 'dot', 'gap', 'dot', 'letter',   // S
        'dot', 'gap', 'dot', 'letter',                 // I
        'dash', 'gap', 'dot', 'gap', 'dot', 'letter', // D
        'dot', 'letter',                               // E
        'dot', 'gap', 'dash', 'gap', 'dot', 'letter', // R
        'dot', 'gap', 'dot', 'gap', 'dot', 'word'     // S
    ];

    let duration = 0.5;
    morsePattern.forEach(item => {
        if (item === 'dot') duration += dotLen;
        else if (item === 'dash') duration += dashLen;
        else if (item === 'gap') duration += gapLen;
        else if (item === 'letter') duration += letterGap;
        else if (item === 'word') duration += wordGap;
    });
    duration += 0.5;

    const speedRatio = 4.0;
    const totalSamples = Math.ceil(sampleRate * duration * speedRatio);
    const buffer = state.audioContext.createBuffer(1, totalSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    let sampleIndex = Math.ceil(sampleRate * 0.5 * speedRatio);
    const freq = 600;

    morsePattern.forEach(item => {
        let len = 0;
        let play = false;

        if (item === 'dot') { len = dotLen; play = true; }
        else if (item === 'dash') { len = dashLen; play = true; }
        else if (item === 'gap') { len = gapLen; }
        else if (item === 'letter') { len = letterGap; }
        else if (item === 'word') { len = wordGap; }

        const samplesToFill = Math.ceil(sampleRate * len * speedRatio);

        if (play) {
            for (let i = 0; i < samplesToFill; i++) {
                const t = (sampleIndex + i) / sampleRate;
                const beep = Math.sin(2 * Math.PI * (freq / speedRatio) * t);
                const noise = (Math.random() * 2 - 1) * 0.15;
                const hum = Math.sin(2 * Math.PI * 30 * t) * 0.2;
                channelData[sampleIndex + i] = (beep * 0.4) + noise + hum;
            }
        } else {
            for (let i = 0; i < samplesToFill; i++) {
                const t = (sampleIndex + i) / sampleRate;
                const noise = (Math.random() * 2 - 1) * 0.08;
                const hum = Math.sin(2 * Math.PI * 30 * t) * 0.15;
                channelData[sampleIndex + i] = noise + hum;
            }
        }
        sampleIndex += samplesToFill;
    });

    while (sampleIndex < totalSamples) {
        channelData[sampleIndex] = (Math.random() * 2 - 1) * 0.08;
        sampleIndex++;
    }

    state.beaconBufferNormal = buffer;

    const revBuffer = state.audioContext.createBuffer(1, totalSamples, sampleRate);
    const revData = revBuffer.getChannelData(0);
    for (let i = 0; i < totalSamples; i++) {
        revData[i] = channelData[totalSamples - 1 - i];
    }
    state.beaconBufferReversed = revBuffer;
}

function playBeacon() {
    if (!state.audioContext) return;
    if (state.audioPlaying) stopBeacon();

    state.audioPlaying = true;

    const isReversed = document.getElementById('audio-reverse').checked;
    const isFilter = document.getElementById('audio-filter').checked;
    const speed = parseFloat(document.getElementById('audio-speed').value);

    const activeBuffer = isReversed ? state.beaconBufferNormal : state.beaconBufferReversed;

    const sourceNode = state.audioContext.createBufferSource();
    sourceNode.buffer = activeBuffer;
    sourceNode.loop = true;
    sourceNode.playbackRate.value = speed;

    let lastNode = sourceNode;

    if (isFilter) {
        const biquadFilter = state.audioContext.createBiquadFilter();
        biquadFilter.type = 'bandpass';
        biquadFilter.frequency.value = 600;
        biquadFilter.Q.value = 3.0;
        lastNode.connect(biquadFilter);
        lastNode = biquadFilter;
    }

    const gainNode = state.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.5, state.audioContext.currentTime);

    lastNode.connect(gainNode);
    gainNode.connect(state.analyserNode);
    state.analyserNode.connect(state.audioContext.destination);

    sourceNode.start(0);
    state.beaconNode = sourceNode;

    document.getElementById('btn-audio-play').classList.add('active');
    document.getElementById('btn-audio-play').textContent = "🔊 SINYAL BERPUTAR";
}

function stopBeacon() {
    if (state.beaconNode && state.audioPlaying) {
        try { state.beaconNode.stop(); } catch (e) { }
        state.beaconNode = null;
    }
    state.audioPlaying = false;
    const btn = document.getElementById('btn-audio-play');
    if (btn) {
        btn.classList.remove('active');
        btn.textContent = "🔊 PLAY BEACON";
    }
}

// ----------------------------------------------------
// SPECTRUM VISUALIZER
// ----------------------------------------------------
function startVisualizer() {
    const canvas = document.getElementById('canvas-visualizer');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function draw() {
        state.visualizerAnimationId = requestAnimationFrame(draw);
        if (!state.analyserNode) return;

        const bufferLength = state.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        if (state.audioPlaying) {
            state.analyserNode.getByteFrequencyData(dataArray);
        } else {
            for (let i = 0; i < bufferLength; i++) {
                dataArray[i] = Math.random() * 15;
            }
        }

        ctx.fillStyle = '#040406';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] * 0.7;
            const isReversed = document.getElementById('audio-reverse').checked;
            ctx.fillStyle = isReversed ? `rgba(255, 176, 0, ${barHeight / 150 + 0.1})` : `rgba(0, 240, 255, ${barHeight / 150 + 0.1})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            ctx.strokeStyle = isReversed ? '#ffb000' : '#00f0ff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, canvas.height - barHeight);
            ctx.lineTo(x + barWidth, canvas.height - barHeight);
            ctx.stroke();
            x += barWidth;
        }
    }

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    draw();
}

function stopVisualizer() {
    if (state.visualizerAnimationId) {
        cancelAnimationFrame(state.visualizerAnimationId);
        state.visualizerAnimationId = null;
    }
}

// ----------------------------------------------------
// CANVAS VISUAL CALIBRATION PUZZLE
// ----------------------------------------------------
function setupVisualCalibration() {
    const canvas = document.getElementById('canvas-visual');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const sliders = {
        brightness: document.getElementById('slide-brightness'),
        contrast: document.getElementById('slide-contrast'),
        threshold: document.getElementById('slide-threshold')
    };

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = 400;
    baseCanvas.height = 250;
    const baseCtx = baseCanvas.getContext('2d');

    baseCtx.fillStyle = '#0d0d0f';
    baseCtx.fillRect(0, 0, 400, 250);

    const imgData = baseCtx.getImageData(0, 0, 400, 250);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = Math.floor(Math.random() * 25);
        data[i] = noise;
        data[i + 1] = noise;
        data[i + 2] = noise;
    }
    baseCtx.putImageData(imgData, 0, 0);

    baseCtx.font = 'bold 36px "Share Tech Mono", monospace';
    baseCtx.fillStyle = 'rgb(24, 24, 24)';
    baseCtx.textAlign = 'center';
    baseCtx.textBaseline = 'middle';
    baseCtx.fillText('GATEKEEPER', 200, 125);

    baseCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    baseCtx.lineWidth = 1;
    for (let x = 0; x < 400; x += 40) {
        baseCtx.beginPath();
        baseCtx.moveTo(x, 0);
        baseCtx.lineTo(x, 250);
        baseCtx.stroke();
    }
    for (let y = 0; y < 250; y += 40) {
        baseCtx.beginPath();
        baseCtx.moveTo(0, y);
        baseCtx.lineTo(400, y);
        baseCtx.stroke();
    }

    function renderFilters() {
        const bright = parseInt(sliders.brightness.value);
        const cont = parseInt(sliders.contrast.value);
        const thresh = parseInt(sliders.threshold.value);

        canvas.width = 400;
        canvas.height = 250;

        ctx.drawImage(baseCanvas, 0, 0);

        const displayData = ctx.getImageData(0, 0, 400, 250);
        const pixels = displayData.data;

        const contrastFactor = (259 * (cont + 255)) / (255 * (259 - cont));

        for (let i = 0; i < pixels.length; i += 4) {
            let r = pixels[i];
            r = r + bright;
            r = contrastFactor * (r - 128) + 128;

            if (thresh > 0) {
                r = r >= thresh ? 255 : 0;
            }

            r = Math.max(0, Math.min(255, r));

            if (thresh > 0 && r === 255) {
                pixels[i] = 51;
                pixels[i + 1] = 255;
                pixels[i + 2] = 51;
            } else {
                pixels[i] = r;
                pixels[i + 1] = r;
                pixels[i + 2] = r;
            }
        }

        ctx.putImageData(displayData, 0, 0);
    }

    sliders.brightness.addEventListener('input', renderFilters);
    sliders.contrast.addEventListener('input', renderFilters);
    sliders.threshold.addEventListener('input', renderFilters);

    document.getElementById('btn-reset-calibration').addEventListener('click', () => {
        sliders.brightness.value = 0;
        sliders.contrast.value = 0;
        sliders.threshold.value = 0;
        renderFilters();
        playBeepSound();
    });

    renderFilters();
}

function triggerFatalGlitchAndRedirect() {
    playDeclineCrash();
    document.body.classList.add('body-glitch-shake');
    document.body.style.filter = "invert(1) contrast(5) sepia(1) hue-rotate(300deg)";
    
    // Fill screen with red glitch
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100vw';
    flash.style.height = '100vh';
    flash.style.backgroundColor = 'red';
    flash.style.mixBlendMode = 'overlay';
    flash.style.zIndex = '999999';
    document.body.appendChild(flash);

    // Glitch effect loop
    const intenseGlitch = setInterval(() => {
        document.body.style.transform = `translate(${Math.random()*20-10}px, ${Math.random()*20-10}px)`;
        flash.style.opacity = Math.random() > 0.5 ? '1' : '0.2';
    }, 50);

    setTimeout(() => {
        clearInterval(intenseGlitch);
        window.location.href = 'wrongperson.html';
    }, 1800);
}

// ----------------------------------------------------
// DYNAMIC GLITCH ENGINE
// ----------------------------------------------------
function startGlitchEngine() {
    if (state.glitchIntervalId) {
        clearInterval(state.glitchIntervalId);
    }

    let duration = 25000;
    switch (state.currentStage) {
        case 1: duration = 25000; break;
        case 2: duration = 20000; break;
        case 3: duration = 15000; break;
        case 4: duration = 11000; break;
        case 5: duration = 8000; break;
        case 6: duration = 5000; break;
        case 7: duration = 3000; break;
    }

    state.glitchIntervalId = setInterval(() => {
        triggerRandomGlitch();
    }, duration);
}

function triggerRandomGlitch() {
    const glitchType = Math.floor(Math.random() * 5);

    switch (glitchType) {
        case 0:
            document.body.classList.add('body-glitch-shake');
            playBeepSound(100, 0.05);
            setTimeout(() => document.body.classList.remove('body-glitch-shake'), 300);
            break;
        case 1:
            document.body.classList.add('body-glitch-invert');
            playBeepSound(80, 0.1);
            setTimeout(() => document.body.classList.remove('body-glitch-invert'), 150);
            break;
        case 2:
            const activeView = document.querySelector('.view.active');
            if (activeView) {
                activeView.classList.add('body-glitch-color-split');
                activeView.classList.add('body-glitch-blur');
                setTimeout(() => {
                    activeView.classList.remove('body-glitch-color-split');
                    activeView.classList.remove('body-glitch-blur');
                }, 400);
            }
            break;
        case 3:
            const texts = document.querySelectorAll('#game-container h2, #game-container p, .log-line');
            if (texts.length > 0) {
                const targetText = texts[Math.floor(Math.random() * texts.length)];
                const originalStr = targetText.innerHTML;
                if (targetText.textContent.trim().length > 3) {
                    const glyphs = "█▒░▖▗▘▙▚▛▜▝▞▟☠☣☢⚙⚠⚡☠";
                    let scrambled = "";
                    for (let i = 0; i < targetText.textContent.length; i++) {
                        if (Math.random() > 0.4) {
                            scrambled += glyphs.charAt(Math.floor(Math.random() * glyphs.length));
                        } else {
                            scrambled += targetText.textContent.charAt(i);
                        }
                    }
                    targetText.classList.add('scrambled-text');
                    targetText.textContent = scrambled;
                    setTimeout(() => {
                        targetText.classList.remove('scrambled-text');
                        targetText.innerHTML = originalStr;
                    }, 400);
                }
            }
            break;
        case 4:
            if (state.audioContext) playGlitchSound();
            const bar = document.querySelector('.glitch-bar');
            if (bar) {
                bar.style.height = '40px';
                bar.style.backgroundColor = 'rgba(255, 51, 51, 0.3)';
                setTimeout(() => {
                    bar.style.height = '5px';
                    bar.style.backgroundColor = 'rgba(0, 240, 255, 0.1)';
                }, 250);
            }
            break;
    }
}

// ----------------------------------------------------
// TERMINAL COMMAND PARSER
// ----------------------------------------------------
function handleTerminalCommand(inputLine) {
    const rawLine = inputLine.trim();
    logToTerminal(`guest@siluman:~$ ${rawLine}`, "user");

    const parts = rawLine.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
        case 'help':
            if (args[0] === 'morse') {
                logToTerminal("REFERENSI KAMUS MORSE:", "system");
                logToTerminal("A .-    B -...  C -.-.  D -..   E .     F ..-.", "system");
                logToTerminal("G --.   H ....  I ..    J .---  K -.-   L .-..", "system");
                logToTerminal("M --    N -.    O ---   P .--.  Q --.-  R .-.", "system");
                logToTerminal("S ...   T -     U ..-   V ...-  W .--   X -..-", "system");
                logToTerminal("Y -.--  Z --..", "system");
            } else {
                logToTerminal("PERINTAH TERSEDIA:", "info");
                logToTerminal("  help              Tampilkan daftar perintah.", "info");
                logToTerminal("  help morse        Tampilkan kamus translasi Morse.", "info");
                logToTerminal("  decrypt [teks]    Dekode sandi Caesar ROT-3.", "info");
                logToTerminal("  download          Instruksi unduh file verifikasi.", "info");
                logToTerminal("  status            Cek status kredensial stage.", "info");
                logToTerminal("  submit [kunci]    Submit kredensial untuk patch stage aktif.", "info");
                logToTerminal("  shutdown          Bersihkan bypass diagnostik dan reboot modul.", "info");
                logToTerminal("  clear             Bersihkan log konsol.", "info");
            }
            break;

        case 'decrypt':
            if (args.length === 0) {
                logToTerminal("Error: Teks hilang. Penggunaan: 'decrypt [teks]'", "error");
            } else {
                const targetText = args.join(" ").toUpperCase();
                const decryptedText = decryptROT3(targetText);
                logToTerminal(`TERJEMAHAN BEACON: '${decryptedText}'`, "system");
            }
            break;

        case 'download':
            logToTerminal("MEMULAI UNDUHAN PAKSA DARI SERVER...", "warning");
            
            // Create a hidden link to trigger actual browser download
            const link = document.createElement('a');
            link.href = 'verification.html';
            link.download = 'verification.html';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            logToTerminal("File 'verification.html' telah diunduh ke peranti Anda.", "system");
            logToTerminal("Buka file tersebut di browser untuk mencari kuncinya.", "info");
            break;

        case 'status':
            logToTerminal("VERIFIKASI KREDENSIAL VANGUARD PER STAGE:", "system");
            logToTerminal(`  STAGE 1 (ROT-3 CIPHER):      ${state.puzzles.pattern ? "[TERVERIFIKASI]" : (state.currentStage === 1 ? "[AKTIF]" : "[TERKUNCI]")}`, state.puzzles.pattern ? "system" : (state.currentStage === 1 ? "warning" : "error"));
            logToTerminal(`  STAGE 2 (VISUAL CALIBRATOR): ${state.puzzles.visual ? "[TERVERIFIKASI]" : (state.currentStage === 2 ? "[AKTIF]" : "[TERKUNCI]")}`, state.puzzles.visual ? "system" : (state.currentStage === 2 ? "warning" : "error"));
            logToTerminal(`  STAGE 3 (SIGNAL ANALYST):    ${state.puzzles.audio ? "[TERVERIFIKASI]" : (state.currentStage === 3 ? "[AKTIF]" : "[TERKUNCI]")}`, state.puzzles.audio ? "system" : (state.currentStage === 3 ? "warning" : "error"));
            logToTerminal(`  STAGE 4 (LOCAL ARCHIVE):     ${state.puzzles.file ? "[TERVERIFIKASI]" : (state.currentStage === 4 ? "[AKTIF]" : "[TERKUNCI]")}`, state.puzzles.file ? "system" : (state.currentStage === 4 ? "warning" : "error"));
            logToTerminal(`  STAGE 5 (GEOGRAPHIC RIDDLE): ${state.puzzles.geo ? "[TERVERIFIKASI]" : (state.currentStage === 5 ? "[AKTIF]" : "[TERKUNCI]")}`, state.puzzles.geo ? "system" : (state.currentStage === 5 ? "warning" : "error"));
            logToTerminal(`  STAGE 6 (INSTAGRAM FEED):    ${state.puzzles.instagram ? "[TERVERIFIKASI]" : (state.currentStage === 6 ? "[AKTIF]" : "[TERKUNCI]")}`, state.puzzles.instagram ? "system" : (state.currentStage === 6 ? "warning" : "error"));
            logToTerminal(`  STAGE 7 (YOUTUBE BROADCAST): ${state.puzzles.youtube ? "[TERVERIFIKASI]" : (state.currentStage === 7 ? "[AKTIF]" : "[TERKUNCI]")}`, state.puzzles.youtube ? "system" : (state.currentStage === 7 ? "warning" : "error"));
            break;

        case 'submit':
            if (args.length === 0) {
                logToTerminal("Error: Kunci hilang. Penggunaan: 'submit [kunci]'", "error");
            } else {
                const key = args.join("_").toUpperCase();
                checkCredential(key);
            }
            break;

        case 'shutdown':
            const allSolved = state.puzzles.pattern && state.puzzles.visual && state.puzzles.audio &&
                state.puzzles.file && state.puzzles.geo && state.puzzles.instagram &&
                state.puzzles.youtube;
            if (allSolved) {
                logToTerminal("MENGKOMPILASI METRIK KESESUAIAN KOGNITIF...", "system");
                logToTerminal("Shutdown bypass diinisialisasi. Menghentikan modul.", "system");
                playGlitchSweep();
                setTimeout(() => activateView('recruitment'), 1500);
            } else {
                logToTerminal("ERROR: LEVEL INTEGRITAS TIDAK CUKUP. PATCH SEMUA STAGE TERLEBIH DAHULU.", "error");
                logToTerminal("Cek progres kredensial dengan mengetik 'status'.", "info");
            }
            break;

        case 'clear':
            document.getElementById('terminal-log').innerHTML = '';
            break;

        default:
            logToTerminal(`Perintah tidak ditemukan: '${command}'. Ketik 'help' untuk detail.`, "error");
            break;
    }

    playBeepSound(500, 0.05);
}

function logToTerminal(text, type = "normal") {
    const logBox = document.getElementById('terminal-log');
    if (!logBox) return;
    const line = document.createElement('div');
    line.className = `log-line text-${type}`;
    line.textContent = text;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
}

function decryptROT3(text) {
    return text.split('').map(char => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) {
            return String.fromCharCode(((code - 65 - 3 + 26) % 26) + 65);
        }
        return char;
    }).join('');
}

function checkCredential(key) {
    if (state.currentStage === 1) {
        if (key === 'PATTERN') {
            state.puzzles.pattern = true;
            logToTerminal("SUKSES: Override cipher Caesar ROT-3 diterima.", "system");
            playBeepSound(900, 0.2);
            resolveStageSuccess(1);
        } else {
            logToTerminal(`Akses Ditolak. Tanda tangan tidak cocok untuk Stage 1.`, "error");
        }
    } else if (state.currentStage === 2) {
        if (key === 'GATEKEEPER') {
            state.puzzles.visual = true;
            logToTerminal("SUKSES: Tanda tangan kalibrasi visual cocok.", "system");
            playBeepSound(900, 0.2);
            resolveStageSuccess(2);
        } else {
            logToTerminal("Akses Ditolak. Tanda tangan tidak cocok untuk Stage 2.", "error");
        }
    } else if (state.currentStage === 3) {
        if (key === 'OUTSIDERS') {
            state.puzzles.audio = true;
            logToTerminal("SUKSES: Telemetri sinyal Morse terverifikasi.", "system");
            playBeepSound(900, 0.2);
            resolveStageSuccess(3);
        } else {
            logToTerminal("Akses Ditolak. Tanda tangan tidak cocok untuk Stage 3.", "error");
        }
    } else if (state.currentStage === 4) {
        if (key === 'RESEARCHER') {
            state.puzzles.file = true;
            logToTerminal("SUKSES: Kode konfirmasi file lokal terverifikasi.", "system");
            playBeepSound(900, 0.2);
            resolveStageSuccess(4);
        } else {
            logToTerminal("Akses Ditolak. Tanda tangan tidak cocok untuk Stage 4.", "error");
        }
    } else if (state.currentStage === 5) {
        // Koordinat museum jakarta
        if (key === '-6.135199,106.813300' || key.includes('-6.135199') || key === '-6.1352781,106.8132808,21') {
            state.puzzles.geo = true;
            saveState();
            logToTerminal("SUKSES: Landmark koordinat bersejarah terverifikasi.", "system");
            playBeepSound(900, 0.2);
            resolveStageSuccess(5);
        } else {
            logToTerminal("Akses Ditolak. Tanda tangan tidak cocok untuk Stage 5.", "error");
        }
    } else if (state.currentStage === 6) {
        if (key === 'LAST_CHANCE'  || key === 'LASTCHANCE') {
            state.puzzles.instagram = true;
            logToTerminal("SUKSES: Kunci komunikasi Instagram terverifikasi.", "system");
            playBeepSound(900, 0.2);
            resolveStageSuccess(6);
        } else {
            logToTerminal("Akses Ditolak. Tanda tangan tidak cocok untuk Stage 6.", "error");
        }
    } else if (state.currentStage === 7) {
        if (key === 'SHUTITDOWNNOW' || key === 'SHUT_IT_DOWN_NOW' || key === 'PART_2') {
            state.puzzles.youtube = true;
            logToTerminal("SUKSES: Kunci siaran YouTube terverifikasi.", "system");
            playBeepSound(900, 0.2);
            logToTerminal("SEMUA TUJUH STAGE BERHASIL DIVERIFIKASI.", "system");
            logToTerminal("Level integritas diagnostik: 100%. Siap untuk shutdown sistem.", "info");
            logToTerminal("Perintah: 'shutdown'", "info");
        } else {
            logToTerminal("Akses Ditolak. Tanda tangan tidak cocok untuk Stage 7.", "error");
        }
    }
}

// ----------------------------------------------------
// ACT 4: DECLINE TYPEWRITER ENDING
// ----------------------------------------------------
function runDeclineTypewriter() {
    const text = "Kamu tidak pernah ada di sini.";
    const target = document.getElementById('decline-text');
    if (!target) return;
    target.textContent = "";
    target.style.maxWidth = "0";
    let index = 0;

    function type() {
        if (index < text.length) {
            target.textContent += text.charAt(index);
            index++;
            target.style.maxWidth = "100%";
            setTimeout(type, 150);
        }
    }

    setTimeout(type, 1000);
}

// ----------------------------------------------------
// CONSOLE BYPASS FUNCTION
// ----------------------------------------------------
window.resetProtocol = function () {
    localStorage.removeItem('siluman_lockout');

    if (state.audioContext) playAcceptChime();

    if (state.glitchIntervalId) {
        clearInterval(state.glitchIntervalId);
        state.glitchIntervalId = null;
    }

    state.act = 1;
    state.currentStage = 1;
    state.quizStep = 1;
    state.puzzles = {
        pattern: false, visual: false, audio: false, file: false,
        geo: false, instagram: false, youtube: false
    };
    state.audioPlaying = false;
    saveState();

    const progress = document.getElementById('quiz-progress');
    if (progress) progress.style.width = '0%';

    resetNoBtnPosition();

    const speedSlider = document.getElementById('audio-speed');
    if (speedSlider) speedSlider.value = 1.0;

    const speedVal = document.getElementById('speed-val');
    if (speedVal) speedVal.textContent = '1.00x';

    const revCheck = document.getElementById('audio-reverse');
    if (revCheck) revCheck.checked = false;

    const filtCheck = document.getElementById('audio-filter');
    if (filtCheck) filtCheck.checked = false;

    const bright = document.getElementById('slide-brightness');
    const cont = document.getElementById('slide-contrast');
    const thresh = document.getElementById('slide-threshold');
    if (bright) bright.value = 0;
    if (cont) cont.value = 0;
    if (thresh) thresh.value = 0;

    setupVisualCalibration();
    stopBeacon();
    activateView('splash');

    console.log("%c[SISTEM] SESI DIHAPUS. MEMULAI ULANG SISTEM...", "color: #33ff33; font-weight: bold;");
    return "RESET PROTOKOL: SELESAI.";
};
