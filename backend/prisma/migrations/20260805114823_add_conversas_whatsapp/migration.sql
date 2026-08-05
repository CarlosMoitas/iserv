-- CreateTable
CREATE TABLE "conversas_whatsapp" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'START',
    "contexto" JSONB,
    "ultimo_contato" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needs_human" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversas_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversas_whatsapp_empresa_id_idx" ON "conversas_whatsapp"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversas_whatsapp_empresa_id_telefone_key" ON "conversas_whatsapp"("empresa_id", "telefone");

-- AddForeignKey
ALTER TABLE "conversas_whatsapp" ADD CONSTRAINT "conversas_whatsapp_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
