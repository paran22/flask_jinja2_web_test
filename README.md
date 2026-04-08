# 📊 Data Dashboard

Flask + Jinja2 + Chart.js 기반의 데이터 분석 대시보드입니다.
OpenAI GPT를 활용한 AI 챗봇과 차트 분석 기능을 제공합니다.

---

## 주요 기능

- **대시보드 개요** — KPI 카드, 월별 매출 추이 차트, 카테고리 분포 차트
- **차트 분석** — 월별 매출 / 카테고리 분포 / 주간 방문자 데이터를 선택하고 AI가 인사이트를 생성
- **AI 챗봇** — 대시보드 데이터를 기반으로 질문에 답변하는 GPT-4o-mini 어시스턴트

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Flask, Gunicorn |
| Frontend | Jinja2, Chart.js, Vanilla JS |
| AI | OpenAI API (GPT-4o-mini) |
| 배포 | Render |

---

## 프로젝트 구조

```
dashboard-app/
├── app.py                    # Flask 서버, API 라우트, 샘플 데이터
├── requirements.txt          # Python 패키지 목록
├── render.yaml               # Render 배포 설정 (IaC)
├── .env.example              # 환경변수 템플릿
├── .gitignore
├── templates/
│   └── index.html            # 메인 대시보드 페이지
└── static/
    ├── css/
    │   └── style.css         # 다크 테마 대시보드 스타일
    └── js/
        └── main.js           # 차트 렌더링, 챗봇, 네비게이션
```

---

## 🖥️ 로컬 실행

### 사전 준비

- Python 3.10 이상
- OpenAI API Key ([발급 페이지](https://platform.openai.com/api-keys))

### 1단계 — 프로젝트 클론

```bash
git clone <your-repo-url>
cd dashboard-app
```

### 2단계 — 가상환경 생성 및 활성화

```bash
# 가상환경 생성
python -m venv venv

# 활성화 (Mac / Linux)
source venv/bin/activate

# 활성화 (Windows PowerShell)
venv\Scripts\Activate.ps1

# 활성화 (Windows CMD)
venv\Scripts\activate.bat
```

### 3단계 — 패키지 설치

```bash
pip install -r requirements.txt
```

### 4단계 — 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 실제 OpenAI API 키를 입력합니다:

```
OPENAI_API_KEY=sk-your-actual-api-key
```

> ⚠️ `.env` 파일은 `.gitignore`에 포함되어 있으므로 Git에 커밋되지 않습니다.
> `.env.example`에는 실제 키를 넣지 마세요.

### 5단계 — 서버 실행

```bash
python app.py
```

브라우저에서 **http://localhost:5000** 에 접속하면 대시보드를 확인할 수 있습니다.

### 실행 확인 체크리스트

| 항목 | 확인 방법 |
|------|----------|
| 서버 기동 | 터미널에 `Running on http://127.0.0.1:5000` 출력 |
| 차트 렌더링 | 개요 페이지에서 라인차트·도넛차트 표시 |
| AI 분석 | 차트 분석 탭 → "AI 분석 요청" 버튼 클릭 → 결과 표시 |
| 챗봇 | AI 챗봇 탭 → 메시지 전송 → 응답 수신 |

---

## 🚀 Render 배포

### 방법 1 — render.yaml 자동 감지 (권장)

프로젝트에 `render.yaml`이 포함되어 있어 Render가 설정을 자동 감지합니다.

1. GitHub에 프로젝트를 Push합니다.

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. [Render 대시보드](https://dashboard.render.com)에 로그인합니다.

3. **New → Web Service** 를 클릭합니다.

4. GitHub 레포지토리를 연결하면 `render.yaml`이 자동 감지됩니다.

5. **Environment → Add Secret** 에서 환경변수를 추가합니다:

   | Key | Value |
   |-----|-------|
   | `OPENAI_API_KEY` | `sk-your-actual-api-key` |

6. **Create Web Service** 를 클릭하면 빌드 및 배포가 시작됩니다.

### 방법 2 — 수동 설정

`render.yaml`을 사용하지 않는 경우 직접 입력합니다:

| 항목 | 값 |
|------|-----|
| **Runtime** | Python |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app:app --bind 0.0.0.0:$PORT` |

Environment에서 `OPENAI_API_KEY`를 Secret으로 추가합니다.

### 배포 후 확인

- Render가 제공하는 URL (예: `https://data-dashboard-xxxx.onrender.com`)로 접속
- 무료 플랜의 경우 15분간 트래픽이 없으면 인스턴스가 슬립 상태로 전환되며, 다음 요청 시 약 30초~1분 정도 콜드 스타트가 발생합니다.

---

## 환경변수 목록

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI API 키 |

---

## 라이선스

MIT
