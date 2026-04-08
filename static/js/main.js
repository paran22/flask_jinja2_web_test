// ─── Chart.js 글로벌 설정 (라이트 테마) ─────────────────
Chart.defaults.color = '#9ca3af';
Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.06)';
Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";

const COLORS = {
    primary: '#7c5cfc',
    primaryBg: 'rgba(124, 92, 252, 0.12)',
    secondary: '#06b6a0',
    secondaryBg: 'rgba(6, 182, 160, 0.10)',
    palette: ['#7c5cfc', '#06b6a0', '#f59e0b', '#f43f5e', '#5c9cfc'],
    paletteBg: [
        'rgba(124, 92, 252, 0.75)',
        'rgba(6, 182, 160, 0.75)',
        'rgba(245, 158, 11, 0.75)',
        'rgba(244, 63, 94, 0.75)',
        'rgba(92, 156, 252, 0.75)',
    ],
};

const gridColor = 'rgba(0, 0, 0, 0.04)';
const defaultScales = {
    y: { beginAtZero: true, grid: { color: gridColor } },
    x: { grid: { display: false } },
};

const tooltipStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    titleColor: '#1a1a2e',
    bodyColor: '#4b5563',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderWidth: 1,
    cornerRadius: 12,
    padding: 12,
    titleFont: { weight: '600' },
    boxPadding: 4,
};

const legendStyle = {
    position: 'top',
    labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, color: '#6b7280' },
};

// ─── 그라디언트 유틸 ────────────────────────────────────
function createGradient(ctx, colorStart, colorEnd, height = 300) {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, colorStart);
    g.addColorStop(1, colorEnd);
    return g;
}

// ─── 네비게이션 ─────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;

        document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
        item.classList.add('active');

        document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
        document.getElementById(section).classList.add('active');
    });
});

// ─── 개요 페이지 차트 ───────────────────────────────────
let overviewLineChart = null;
let overviewPieChart = null;

async function initOverviewCharts() {
    const salesData = await fetch('/api/chart-data?type=monthly_sales').then((r) => r.json());
    const lineCtx = document.getElementById('overviewLineChart').getContext('2d');

    const gradP = createGradient(lineCtx, 'rgba(124, 92, 252, 0.18)', 'rgba(124, 92, 252, 0.0)');
    const gradS = createGradient(lineCtx, 'rgba(6, 182, 160, 0.15)', 'rgba(6, 182, 160, 0.0)');

    overviewLineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: salesData.labels,
            datasets: salesData.datasets.map((ds, i) => ({
                label: ds.label,
                data: ds.data,
                borderColor: i === 0 ? COLORS.primary : COLORS.secondary,
                backgroundColor: i === 0 ? gradP : gradS,
                fill: true,
                tension: 0.45,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: i === 0 ? COLORS.primary : COLORS.secondary,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: 2.5,
            })),
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: legendStyle, tooltip: tooltipStyle },
            scales: defaultScales,
        },
    });

    // 도넛
    const catData = await fetch('/api/chart-data?type=category_distribution').then((r) => r.json());
    const pieCtx = document.getElementById('overviewPieChart').getContext('2d');

    overviewPieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: catData.labels,
            datasets: [{
                data: catData.data,
                backgroundColor: COLORS.paletteBg,
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 8,
            }],
        },
        options: {
            responsive: true,
            cutout: '68%',
            plugins: {
                legend: { ...legendStyle, position: 'bottom' },
                tooltip: tooltipStyle,
            },
        },
    });
}

// ─── 분석 페이지 차트 ───────────────────────────────────
let analysisChart = null;

async function loadAnalysisChart(chartType) {
    const data = await fetch(`/api/chart-data?type=${chartType}`).then((r) => r.json());
    if (analysisChart) analysisChart.destroy();

    const ctx = document.getElementById('analysisChart').getContext('2d');

    if (chartType === 'monthly_sales') {
        analysisChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: data.datasets.map((ds, i) => ({
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: i === 0
                        ? createGradient(ctx, 'rgba(124, 92, 252, 0.8)', 'rgba(124, 92, 252, 0.35)')
                        : createGradient(ctx, 'rgba(6, 182, 160, 0.8)', 'rgba(6, 182, 160, 0.35)'),
                    borderRadius: 8,
                    borderSkipped: false,
                })),
            },
            options: {
                responsive: true,
                plugins: { legend: legendStyle, tooltip: tooltipStyle },
                scales: defaultScales,
            },
        });
    } else if (chartType === 'category_distribution') {
        analysisChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.data,
                    backgroundColor: COLORS.paletteBg,
                    borderColor: '#fff',
                    borderWidth: 3,
                    hoverOffset: 10,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { ...legendStyle, position: 'right' },
                    tooltip: tooltipStyle,
                },
            },
        });
    } else if (chartType === 'weekly_visitors') {
        const grad = createGradient(ctx, 'rgba(124, 92, 252, 0.2)', 'rgba(124, 92, 252, 0.0)');
        analysisChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: '방문자 수',
                    data: data.data,
                    borderColor: COLORS.primary,
                    backgroundColor: grad,
                    fill: true,
                    tension: 0.45,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: COLORS.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    borderWidth: 2.5,
                }],
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: legendStyle, tooltip: tooltipStyle },
                scales: { ...defaultScales, y: { ...defaultScales.y, beginAtZero: false } },
            },
        });
    }
}

// 차트 타입 변경
document.getElementById('chartTypeSelect').addEventListener('change', (e) => {
    loadAnalysisChart(e.target.value);
    document.getElementById('analysisResult').style.display = 'none';
});

// AI 분석 요청
document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const btn = document.getElementById('analyzeBtn');
    const chartType = document.getElementById('chartTypeSelect').value;
    const resultDiv = document.getElementById('analysisResult');
    const textDiv = document.getElementById('analysisText');

    btn.disabled = true;
    btn.textContent = '분석 중...';
    resultDiv.style.display = 'block';
    textDiv.innerHTML = '<span class="loading-dots">AI가 데이터를 분석하고 있습니다</span>';

    try {
        const res = await fetch('/api/analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chart_type: chartType }),
        });
        const data = await res.json();
        textDiv.textContent = data.error ? '오류: ' + data.error : data.analysis;
    } catch {
        textDiv.textContent = '요청에 실패했습니다. 다시 시도해 주세요.';
    } finally {
        btn.disabled = false;
        btn.textContent = '🔍 AI 분석 요청';
    }
});

// ─── 챗봇 ───────────────────────────────────────────────
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

function addMessage(content, isUser = false) {
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    div.innerHTML = `
        <div class="message-avatar">${isUser ? '가' : '🤖'}</div>
        <div class="message-content">${content}</div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

async function sendChat() {
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    addMessage(message, true);
    const loadingDiv = addMessage('<span class="loading-dots">생각하는 중</span>');

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });
        const data = await res.json();
        chatMessages.removeChild(loadingDiv);

        if (data.error) {
            addMessage('죄송합니다. 오류가 발생했습니다: ' + data.error);
        } else {
            addMessage(data.reply.replace(/\n/g, '<br>'));
        }
    } catch {
        chatMessages.removeChild(loadingDiv);
        addMessage('서버 연결에 실패했습니다. 다시 시도해 주세요.');
    }
}

chatSendBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
});

// ─── 초기화 ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initOverviewCharts();
    loadAnalysisChart('monthly_sales');
});
