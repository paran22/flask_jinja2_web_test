-- ============================================================
-- Supabase 전체 DB 셋업 (채팅 이력 + 벡터 DB)
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- ============================================================

-- 1) 채팅 이력 테이블
create table if not exists chat_history (
  id bigserial primary key,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  created_at timestamptz default now()
);

-- 2) pgvector 확장 활성화
create extension if not exists vector;

-- 3) 문서 테이블 생성
create table if not exists documents (
  id bigserial primary key,
  category text not null,
  title text not null,
  content text not null,
  embedding vector(1536)  -- OpenAI text-embedding-3-small 차원
);

-- 4) 벡터 유사도 검색 함수
create or replace function match_documents(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id bigint,
  category text,
  title text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    d.id,
    d.category,
    d.title,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;
