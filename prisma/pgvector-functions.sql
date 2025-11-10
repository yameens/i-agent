-- Function to match checklist items using cosine similarity
CREATE OR REPLACE FUNCTION match_checklist_items(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id text,
  category text,
  content text,
  embedding vector(1536),
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    category,
    content,
    embedding,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM checklist_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

