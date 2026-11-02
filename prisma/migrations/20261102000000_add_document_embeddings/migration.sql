CREATE TABLE "document_embedding" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_embedding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_embedding_source_chunk_index_key"
    ON "document_embedding"("source", "chunk_index");
CREATE INDEX "document_embedding_source_idx"
    ON "document_embedding"("source");
