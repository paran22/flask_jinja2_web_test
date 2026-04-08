import os
import json
import time
from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ─── 샘플 데이터 ───────────────────────────────────────────────
SAMPLE_DATA = {
    "monthly_sales": {
        "labels": ["1월", "2월", "3월", "4월", "5월", "6월",
                    "7월", "8월", "9월", "10월", "11월", "12월"],
        "datasets": [
            {
                "label": "2025 매출 (만원)",
                "data": [1200, 1900, 1500, 2100, 2400, 2200,
                         2800, 3100, 2900, 3400, 3200, 3800],
            },
            {
                "label": "2024 매출 (만원)",
                "data": [1000, 1400, 1300, 1700, 1900, 1800,
                         2200, 2500, 2300, 2800, 2600, 3100],
            },
        ],
    },
    "category_distribution": {
        "labels": ["전자제품", "의류", "식품", "도서", "스포츠"],
        "data": [35, 25, 20, 10, 10],
    },
    "weekly_visitors": {
        "labels": ["월", "화", "수", "목", "금", "토", "일"],
        "data": [820, 932, 901, 934, 1290, 1330, 1320],
    },
    "kpi": {
        "total_revenue": "3억 2,400만원",
        "total_orders": "12,847건",
        "avg_order_value": "25,200원",
        "conversion_rate": "3.8%",
    },
}


# ─── 라우트 ────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html", kpi=SAMPLE_DATA["kpi"], cache_bust=int(time.time()))


@app.route("/api/chart-data")
def chart_data():
    chart_type = request.args.get("type", "monthly_sales")
    data = SAMPLE_DATA.get(chart_type, {})
    return jsonify(data)


@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json()
    user_message = body.get("message", "")

    if not user_message:
        return jsonify({"error": "메시지가 비어 있습니다."}), 400

    # 시스템 프롬프트에 샘플 데이터 컨텍스트 제공
    system_prompt = f"""당신은 데이터 분석 대시보드의 AI 어시스턴트입니다.
아래 데이터를 기반으로 사용자의 질문에 한국어로 답변하세요.
간결하고 인사이트 있는 답변을 제공하세요.

현재 대시보드 데이터:
- 월별 매출(2025): {SAMPLE_DATA['monthly_sales']['datasets'][0]['data']}
- 월별 매출(2024): {SAMPLE_DATA['monthly_sales']['datasets'][1]['data']}
- 카테고리 분포: {dict(zip(SAMPLE_DATA['category_distribution']['labels'], SAMPLE_DATA['category_distribution']['data']))}
- 주간 방문자: {dict(zip(SAMPLE_DATA['weekly_visitors']['labels'], SAMPLE_DATA['weekly_visitors']['data']))}
- KPI: {SAMPLE_DATA['kpi']}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=500,
            temperature=0.7,
        )
        reply = response.choices[0].message.content
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── 분석 API ──────────────────────────────────────────────────
@app.route("/api/analysis", methods=["POST"])
def analysis():
    """LLM을 활용하여 선택된 차트 데이터에 대한 분석 인사이트를 생성합니다."""
    body = request.get_json()
    chart_type = body.get("chart_type", "monthly_sales")
    data = SAMPLE_DATA.get(chart_type, {})

    prompt = f"""다음 데이터를 분석하고 핵심 인사이트 3가지를 한국어로 제공하세요.
각 인사이트는 한 줄로 간결하게 작성하세요. 번호를 매겨주세요.

데이터 종류: {chart_type}
데이터: {json.dumps(data, ensure_ascii=False)}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.5,
        )
        reply = response.choices[0].message.content
        return jsonify({"analysis": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
