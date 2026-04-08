"""
knowledge_base.csv를 OpenAI 임베딩으로 변환하여 Supabase에 업로드하는 스크립트.

사전 준비:
  1. supabase_setup.sql 을 Supabase SQL Editor에서 실행
  2. .env 에 아래 값 설정
     OPENAI_API_KEY=sk-...
     SUPABASE_URL=https://xxx.supabase.co
     SUPABASE_KEY=eyJ...

실행:
  python setup_vector_db.py
"""

import os
import csv
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client

load_dotenv()

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CSV_PATH = os.path.join(DATA_DIR, "knowledge_base.csv")

EMBEDDING_MODEL = "text-embedding-3-small"


def get_embedding(text: str) -> list[float]:
    """텍스트를 OpenAI 임베딩 벡터로 변환합니다."""
    response = openai_client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return response.data[0].embedding


def main():
    # CSV 읽기
    with open(CSV_PATH, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    print(f"총 {len(rows)}개 문서를 처리합니다.\n")

    # 기존 데이터 삭제 (재실행 시 중복 방지)
    supabase.table("documents").delete().neq("id", 0).execute()
    print("기존 documents 테이블 초기화 완료.\n")

    for i, row in enumerate(rows, 1):
        # 임베딩할 텍스트: 카테고리 + 제목 + 본문을 합침
        text_to_embed = f"[{row['category']}] {row['title']}\n{row['content']}"
        embedding = get_embedding(text_to_embed)

        supabase.table("documents").insert({
            "category": row["category"],
            "title": row["title"],
            "content": row["content"],
            "embedding": embedding,
        }).execute()

        print(f"  [{i}/{len(rows)}] {row['title']}")

    print(f"\n완료! {len(rows)}개 문서가 Supabase에 업로드되었습니다.")


if __name__ == "__main__":
    main()
