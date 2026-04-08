import os
import csv
import json
import time
from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# ─── Supabase 설정 (채팅 이력 + 벡터 DB 통합) ────────────────
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

# OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EMBEDDING_MODEL = "text-embedding-3-small"


# ─── CSV 데이터 로딩 ──────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def load_sample_data():
    """data/ 폴더의 CSV 파일들을 읽어 SAMPLE_DATA 딕셔너리를 구성합니다."""
    data = {}

    # 월별 매출
    with open(os.path.join(DATA_DIR, "monthly_sales.csv"), encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
        data["monthly_sales"] = {
            "labels": [r["month"] for r in rows],
            "datasets": [
                {"label": "2025 매출 (만원)", "data": [int(r["sales_2025"]) for r in rows]},
                {"label": "2024 매출 (만원)", "data": [int(r["sales_2024"]) for r in rows]},
            ],
        }

    # 카테고리 분포
    with open(os.path.join(DATA_DIR, "category_distribution.csv"), encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
        data["category_distribution"] = {
            "labels": [r["category"] for r in rows],
            "data": [int(r["percentage"]) for r in rows],
        }

    # 주간 방문자
    with open(os.path.join(DATA_DIR, "weekly_visitors.csv"), encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
        data["weekly_visitors"] = {
            "labels": [r["day"] for r in rows],
            "data": [int(r["visitors"]) for r in rows],
        }

    # KPI
    with open(os.path.join(DATA_DIR, "kpi.csv"), encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
        data["kpi"] = {r["metric"]: r["value"] for r in rows}

    return data


SAMPLE_DATA = load_sample_data()


# ─── 라우트 ────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html", kpi=SAMPLE_DATA["kpi"], cache_bust=int(time.time()))


@app.route("/api/chart-data")
def chart_data():
    chart_type = request.args.get("type", "monthly_sales")
    data = SAMPLE_DATA.get(chart_type, {})
    return jsonify(data)


# ─── RAG: 벡터 검색 ──────────────────────────────────────────
def search_knowledge(query: str, match_count: int = 5) -> list[dict]:
    """유저 질문을 임베딩하여 Supabase에서 유사 문서를 검색합니다."""
    embedding_resp = client.embeddings.create(model=EMBEDDING_MODEL, input=query)
    query_embedding = embedding_resp.data[0].embedding

    result = supabase.rpc("match_documents", {
        "query_embedding": query_embedding,
        "match_threshold": 0.5,
        "match_count": match_count,
    }).execute()

    return result.data if result.data else []


# ─── 챗봇 API (RAG + Supabase 대화 기록) ─────────────────────
@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json()
    user_message = body.get("message", "")

    if not user_message:
        return jsonify({"error": "메시지가 비어 있습니다."}), 400

    # 유저 메시지 Supabase에 저장
    supabase.table("chat_history").insert({
        "role": "user", "message": user_message
    }).execute()

    # RAG: 벡터 DB에서 관련 문서 검색
    rag_context = ""
    rag_docs = search_knowledge(user_message)
    if rag_docs:
        rag_context = "\n\n참고 자료 (벡터 DB 검색 결과):\n"
        for doc in rag_docs:
            rag_context += f"- [{doc['category']}] {doc['title']}: {doc['content']}\n"

    system_prompt = f"""당신은 데이터 분석 대시보드의 AI 어시스턴트입니다.
아래 데이터를 기반으로 사용자의 질문에 한국어로 답변하세요.
간결하고 인사이트 있는 답변을 제공하세요.

현재 대시보드 데이터:
- 월별 매출(2025): {SAMPLE_DATA['monthly_sales']['datasets'][0]['data']}
- 월별 매출(2024): {SAMPLE_DATA['monthly_sales']['datasets'][1]['data']}
- 카테고리 분포: {dict(zip(SAMPLE_DATA['category_distribution']['labels'], SAMPLE_DATA['category_distribution']['data']))}
- 주간 방문자: {dict(zip(SAMPLE_DATA['weekly_visitors']['labels'], SAMPLE_DATA['weekly_visitors']['data']))}
- KPI: {SAMPLE_DATA['kpi']}
{rag_context}"""

    try:
        # 최근 대화 10건을 컨텍스트로 포함
        recent = supabase.table("chat_history") \
            .select("role, message") \
            .order("id", desc=True) \
            .limit(10) \
            .execute()
        recent_rows = list(reversed(recent.data)) if recent.data else []

        messages = [{"role": "system", "content": system_prompt}]
        for r in recent_rows:
            messages.append({"role": r["role"], "content": r["message"]})

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        reply = response.choices[0].message.content

        # 어시스턴트 응답 Supabase에 저장
        supabase.table("chat_history").insert({
            "role": "assistant", "message": reply
        }).execute()

        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── 대화 기록 조회 API ───────────────────────────────────────
@app.route("/api/chat/history")
def chat_history():
    """최근 대화 50건을 반환합니다."""
    limit = request.args.get("limit", 50, type=int)
    result = supabase.table("chat_history") \
        .select("id, role, message, created_at") \
        .order("id", desc=True) \
        .limit(limit) \
        .execute()
    rows = list(reversed(result.data)) if result.data else []
    return jsonify(rows)


# ─── 대화 기록 삭제 API ───────────────────────────────────────
@app.route("/api/chat/history", methods=["DELETE"])
def clear_chat_history():
    """대화 기록을 모두 삭제합니다."""
    supabase.table("chat_history").delete().neq("id", 0).execute()
    return jsonify({"status": "ok"})


# ─── 분석 API ──────────────────────────────────────────────────
@app.route("/api/analysis", methods=["POST"])
def analysis():
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
