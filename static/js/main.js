// ─── Chart.js defaults ──────────────────────────────────
Chart.defaults.color = '#555';
Chart.defaults.borderColor = '#222';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;

const C = {
    w:   '#fafafa',
    w50: 'rgba(250,250,250,0.5)',
    w20: 'rgba(250,250,250,0.15)',
    w08: 'rgba(250,250,250,0.06)',
    g:   '#555',
    pal: ['#fafafa','#888','#555','#333','#222'],
};

const tipStyle = {
    backgroundColor: '#191919',
    titleColor: '#fafafa',
    bodyColor: '#888',
    borderColor: '#333',
    borderWidth: 1,
    cornerRadius: 8,
    padding: 10,
    titleFont: { weight: '600', size: 12 },
    bodyFont: { size: 11 },
    boxPadding: 3,
};

const legStyle = {
    position: 'top',
    labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, color: '#888', font: { size: 11 } },
};

function makeGrad(ctx, a, b, h = 260) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, a); g.addColorStop(1, b);
    return g;
}

// ─── Navigation ─────────────────────────────────────────
document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(t.dataset.section).classList.add('active');
    });
});

// ─── Overview charts ────────────────────────────────────
async function initOverview() {
    // Line
    const sales = await fetch('/api/chart-data?type=monthly_sales').then(r => r.json());
    const lCtx = document.getElementById('overviewLine').getContext('2d');
    new Chart(lCtx, {
        type: 'line',
        data: {
            labels: sales.labels,
            datasets: sales.datasets.map((ds, i) => ({
                label: ds.label,
                data: ds.data,
                borderColor: i === 0 ? C.w : C.g,
                backgroundColor: i === 0
                    ? makeGrad(lCtx, C.w20, 'transparent')
                    : makeGrad(lCtx, 'rgba(85,85,85,0.08)', 'transparent'),
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: i === 0 ? C.w : C.g,
                borderWidth: 1.5,
            })),
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: legStyle, tooltip: tipStyle },
            scales: {
                y: { beginAtZero: true, grid: { color: '#1a1a1a' }, ticks: { font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            },
        },
    });

    // Doughnut
    const cat = await fetch('/api/chart-data?type=category_distribution').then(r => r.json());
    const dCtx = document.getElementById('overviewDoughnut').getContext('2d');
    new Chart(dCtx, {
        type: 'doughnut',
        data: {
            labels: cat.labels,
            datasets: [{ data: cat.data, backgroundColor: C.pal, borderColor: '#0a0a0a', borderWidth: 2, hoverOffset: 6 }],
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: { legend: { ...legStyle, position: 'bottom' }, tooltip: tipStyle },
        },
    });
}

// ─── Analysis chart ─────────────────────────────────────
let aChart = null;

async function loadAnalysis(type) {
    const data = await fetch(`/api/chart-data?type=${type}`).then(r => r.json());
    if (aChart) aChart.destroy();
    const ctx = document.getElementById('analysisChart').getContext('2d');

    if (type === 'monthly_sales') {
        aChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: data.datasets.map((ds, i) => ({
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: i === 0 ? C.w50 : 'rgba(85,85,85,0.3)',
                    borderRadius: 4,
                    borderSkipped: false,
                })),
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: legStyle, tooltip: tipStyle },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#1a1a1a' } },
                    x: { grid: { display: false } },
                },
            },
        });
    } else if (type === 'category_distribution') {
        aChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{ data: data.data, backgroundColor: C.pal, borderColor: '#0a0a0a', borderWidth: 2, hoverOffset: 6 }],
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: { legend: { ...legStyle, position: 'right' }, tooltip: tipStyle },
            },
        });
    } else if (type === 'weekly_visitors') {
        aChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: '방문자 수',
                    data: data.data,
                    borderColor: C.w,
                    backgroundColor: makeGrad(ctx, C.w20, 'transparent'),
                    fill: true, tension: 0.4,
                    pointRadius: 3, pointHoverRadius: 6,
                    pointBackgroundColor: C.w, pointBorderColor: '#0a0a0a', pointBorderWidth: 2,
                    borderWidth: 1.5,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: legStyle, tooltip: tipStyle },
                scales: {
                    y: { beginAtZero: false, grid: { color: '#1a1a1a' } },
                    x: { grid: { display: false } },
                },
            },
        });
    }
}

document.getElementById('chartTypeSelect').addEventListener('change', e => {
    loadAnalysis(e.target.value);
    document.getElementById('analysisResult').style.display = 'none';
});

document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const btn = document.getElementById('analyzeBtn');
    const type = document.getElementById('chartTypeSelect').value;
    const box = document.getElementById('analysisResult');
    const txt = document.getElementById('analysisText');

    btn.disabled = true; btn.textContent = 'Analyzing...';
    box.style.display = 'block';
    txt.innerHTML = '<span class="loading-dots">Analyzing</span>';

    try {
        const r = await fetch('/api/analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chart_type: type }),
        });
        const d = await r.json();
        txt.textContent = d.error ? 'Error: ' + d.error : d.analysis;
    } catch { txt.textContent = '요청 실패. 다시 시도해 주세요.'; }
    finally { btn.disabled = false; btn.textContent = 'Analyze'; }
});

// ─── Chat ───────────────────────────────────────────────
const chatBox = document.getElementById('chatMessages');
const chatIn  = document.getElementById('chatInput');

function addMsg(text, isUser) {
    const el = document.createElement('div');
    el.className = `bubble ${isUser ? 'bubble-user' : 'bubble-bot'}`;
    el.innerHTML = text;
    chatBox.appendChild(el);
    chatBox.scrollTop = chatBox.scrollHeight;
    return el;
}

async function loadHistory() {
    try {
        const list = await fetch('/api/chat/history?limit=50').then(r => r.json());
        list.forEach(r => addMsg(
            r.role === 'user' ? r.message : r.message.replace(/\n/g, '<br>'),
            r.role === 'user'
        ));
    } catch {}
}

document.getElementById('clearChatBtn').addEventListener('click', async () => {
    if (!confirm('대화 기록을 모두 삭제할까요?')) return;
    try {
        await fetch('/api/chat/history', { method: 'DELETE' });
        chatBox.innerHTML = '<div class="bubble bubble-bot">기록이 삭제되었습니다.</div>';
    } catch {}
});

async function sendChat() {
    const msg = chatIn.value.trim();
    if (!msg) return;
    chatIn.value = '';
    addMsg(msg, true);
    const ld = addMsg('<span class="loading-dots">thinking</span>', false);

    try {
        const d = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg }),
        }).then(r => r.json());
        chatBox.removeChild(ld);
        addMsg(d.error ? 'Error: ' + d.error : d.reply.replace(/\n/g, '<br>'), false);
    } catch {
        chatBox.removeChild(ld);
        addMsg('연결 실패. 다시 시도해 주세요.', false);
    }
}

document.getElementById('chatSendBtn').addEventListener('click', sendChat);
chatIn.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

// ─── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initOverview();
    loadAnalysis('monthly_sales');
    loadHistory();
});
