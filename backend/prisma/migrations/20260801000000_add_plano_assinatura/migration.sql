-- CreateEnum
CREATE TYPE "Plano" AS ENUM ('STARTER', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('TRIAL', 'ATIVA', 'INADIMPLENTE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusCobranca" AS ENUM ('PENDENTE', 'PAGA', 'FALHOU', 'CANCELADA');

-- AlterTable: convert "plano" from String (default "STARTER") to enum Plano
ALTER TABLE "empresas" ALTER COLUMN "plano" DROP DEFAULT;
ALTER TABLE "empresas" ALTER COLUMN "plano" TYPE "Plano" USING ("plano"::"Plano");
ALTER TABLE "empresas" ALTER COLUMN "plano" SET DEFAULT 'STARTER';

-- AlterTable: add subscription tracking columns
ALTER TABLE "empresas" ADD COLUMN "status_assinatura" "StatusAssinatura" NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "empresas" ADD COLUMN "trial_expira_em" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "plano" "Plano" NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "status" "StatusCobranca" NOT NULL DEFAULT 'PENDENTE',
    "gateway" TEXT,
    "gateway_id" TEXT,
    "periodo_inicio" TIMESTAMP(3) NOT NULL,
    "periodo_fim" TIMESTAMP(3) NOT NULL,
    "pago_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assinaturas_empresa_id_idx" ON "assinaturas"("empresa_id");

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
