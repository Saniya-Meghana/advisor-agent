-- Create vector search function
CREATE OR REPLACE FUNCTION search_document_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  document_id uuid,
  chunk_index int,
  chunk_text text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.document_id,
    de.chunk_index,
    de.chunk_text,
    1 - (de.embedding <=> query_embedding) as similarity
  FROM document_embeddings de
  WHERE 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;