/**
 * Script para reprocessar fotos existentes e gerar thumbnails
 *
 * Uso:
 *   npx tsx scripts/reprocess-existing-photos.ts
 *
 * O que faz:
 * 1. Busca todos os residentes com fotoUrl
 * 2. Para cada foto, baixa do MinIO
 * 3. Gera thumbnails (small, medium)
 * 4. Faz upload dos thumbnails para MinIO
 *
 * Nota: Não altera o banco de dados - apenas adiciona arquivos no MinIO
 */

import { PrismaClient } from '@prisma/client';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const prisma = new PrismaClient();

// Configurar cliente S3 para MinIO
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const bucket = process.env.AWS_S3_BUCKET!;

/**
 * Baixa arquivo do MinIO
 */
async function downloadFromMinIO(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);
  const stream = response.Body;

  if (!stream) {
    throw new Error(`Arquivo não encontrado: ${key}`);
  }

  // Converter stream para buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as any) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Gera e faz upload de thumbnails para uma foto
 */
async function generateThumbnails(basePath: string): Promise<void> {
  console.log(`  Processando: ${basePath}`);

  try {
    // Baixar foto original do MinIO
    const originalBuffer = await downloadFromMinIO(basePath);

    // Definir variantes (apenas thumbnails - original já existe)
    const variants = [
      { suffix: '_small', size: 64, quality: 90 },
      { suffix: '_medium', size: 150, quality: 90 },
    ];

    for (const variant of variants) {
      const variantPath = basePath.replace('.webp', `${variant.suffix}.webp`);

      // Verificar se thumbnail já existe (evitar reprocessamento)
      try {
        await s3Client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: variantPath,
          }),
        );
        console.log(`    ✓ ${variant.suffix} já existe - pulando`);
        continue;
      } catch (error) {
        // Thumbnail não existe - vamos criar
      }

      // Processar imagem
      const processed = await sharp(originalBuffer)
        .resize(variant.size, variant.size, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: variant.quality })
        .toBuffer();

      // Upload para MinIO
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: variantPath,
          Body: processed,
          ContentType: 'image/webp',
        }),
      );

      console.log(`    ✓ ${variant.suffix} criado (${(processed.length / 1024).toFixed(1)}KB)`);
    }
  } catch (error) {
    console.error(`    ✗ Erro: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Script principal
 */
async function main() {
  console.log('🔄 Iniciando reprocessamento de fotos existentes\n');

  try {
    // Buscar todos os residentes com foto
    const residents = await prisma.resident.findMany({
      where: {
        fotoUrl: {
          not: null,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        fotoUrl: true,
      },
    });

    console.log(`📸 Encontrados ${residents.length} residentes com foto\n`);

    if (residents.length === 0) {
      console.log('✅ Nenhuma foto para processar');
      return;
    }

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const resident of residents) {
      console.log(`[${processed + skipped + failed + 1}/${residents.length}] ${resident.fullName}`);

      if (!resident.fotoUrl) {
        console.log('  ⚠ Sem fotoUrl - pulando\n');
        skipped++;
        continue;
      }

      // Verificar se é WebP
      if (!resident.fotoUrl.endsWith('.webp')) {
        console.log(`  ⚠ Formato não suportado: ${resident.fotoUrl} - pulando\n`);
        skipped++;
        continue;
      }

      try {
        await generateThumbnails(resident.fotoUrl);
        processed++;
      } catch (error) {
        console.error(`  ✗ Falha ao processar: ${error instanceof Error ? error.message : error}`);
        failed++;
      }

      console.log(''); // Linha em branco para separar residentes
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('📊 RESUMO');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Processados com sucesso: ${processed}`);
    console.log(`⚠ Pulados: ${skipped}`);
    console.log(`✗ Falhas: ${failed}`);
    console.log(`📝 Total: ${residents.length}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (processed > 0) {
      console.log('✅ Reprocessamento concluído!');
      console.log('💡 As fotos agora têm thumbnails otimizados');
      console.log('💡 O banco de dados não foi alterado');
    }
  } catch (error) {
    console.error('❌ Erro durante reprocessamento:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar script
main();
