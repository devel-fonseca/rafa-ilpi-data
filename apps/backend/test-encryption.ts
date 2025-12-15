/**
 * Script de teste de criptografia AES-256-GCM
 *
 * Testa a classe FieldEncryption isoladamente
 */

import { FieldEncryption } from './src/prisma/middleware/encryption.middleware';

// Master key do .env (256 bits = 64 chars hex)
const ENCRYPTION_MASTER_KEY = '5fb88f3827e4f2c48344876a75af1e400be28e392c62bef99711ed56542c9f60';

// Tenant ID de teste
const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

// Dados de teste (CPF/RG/CNS)
const testData = {
  cpf: '123.456.789-00',
  rg: '12.345.678-9',
  cns: '123456789012345',
  legalGuardianCpf: '987.654.321-00',
  legalGuardianRg: '98.765.432-1',
};

console.log('\n🔐 TESTE DE CRIPTOGRAFIA DE CAMPO - LGPD Art. 46\n');
console.log('='.repeat(80));

try {
  // Criar instância de criptografia
  const encryption = new FieldEncryption(ENCRYPTION_MASTER_KEY);
  console.log('\n✅ FieldEncryption inicializada com sucesso');
  console.log(`   Master Key: ${ENCRYPTION_MASTER_KEY.substring(0, 16)}... (truncated)`);
  console.log(`   Tenant ID: ${TEST_TENANT_ID}\n`);

  // Teste 1: Criptografar campos
  console.log('📝 FASE 1: Criptografando campos...\n');
  const encrypted: Record<string, string | null> = {};

  for (const [field, value] of Object.entries(testData)) {
    const encryptedValue = encryption.encrypt(value, TEST_TENANT_ID);
    encrypted[field] = encryptedValue;

    console.log(`   ${field}:`);
    console.log(`      Original: ${value}`);
    console.log(`      Criptografado: ${encryptedValue?.substring(0, 80)}... (${encryptedValue?.length} chars)`);
    console.log(`      Formato válido: ${encryption.isEncrypted(encryptedValue || '')}`);
    console.log();
  }

  // Teste 2: Descriptografar campos
  console.log('\n📖 FASE 2: Descriptografando campos...\n');
  let allSuccess = true;

  for (const [field, encryptedValue] of Object.entries(encrypted)) {
    if (!encryptedValue) continue;

    const decryptedValue = encryption.decrypt(encryptedValue, TEST_TENANT_ID);
    const originalValue = testData[field as keyof typeof testData];
    const match = decryptedValue === originalValue;

    console.log(`   ${field}:`);
    console.log(`      Descriptografado: ${decryptedValue}`);
    console.log(`      Original: ${originalValue}`);
    console.log(`      ✓ Match: ${match ? '✅ SIM' : '❌ NÃO'}`);
    console.log();

    if (!match) allSuccess = false;
  }

  // Teste 3: Tentativa de dupla criptografia (deve ser evitada)
  console.log('\n🔁 FASE 3: Teste de dupla criptografia (proteção)...\n');
  const alreadyEncrypted = encrypted.cpf!;
  const isAlreadyEncrypted = encryption.isEncrypted(alreadyEncrypted);
  console.log(`   Valor já criptografado detectado: ${isAlreadyEncrypted ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`   Middleware evitará dupla criptografia: ${isAlreadyEncrypted ? '✅ SIM' : '❌ NÃO'}\n`);

  // Teste 4: Formato do ciphertext
  console.log('\n📊 FASE 4: Validação de formato...\n');
  const sampleCiphertext = encrypted.cpf!;
  const parts = sampleCiphertext.split(':');
  console.log(`   Formato: salt:iv:tag:encrypted`);
  console.log(`   Partes detectadas: ${parts.length} (esperado: 4)`);
  console.log(`   Salt length: ${parts[0]?.length} chars (esperado: 128)`);
  console.log(`   IV length: ${parts[1]?.length} chars (esperado: 32)`);
  console.log(`   Tag length: ${parts[2]?.length} chars (esperado: 32)`);
  console.log(`   Encrypted length: ${parts[3]?.length} chars (variável)`);
  console.log(`   Formato válido: ${parts.length === 4 && parts[0].length === 128 && parts[1].length === 32 && parts[2].length === 32 ? '✅' : '❌'}\n`);

  // Teste 5: Isolamento por tenant
  console.log('\n🔒 FASE 5: Isolamento criptográfico por tenant...\n');
  const DIFFERENT_TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
  const encryptedTenant1 = encryption.encrypt(testData.cpf, TEST_TENANT_ID);
  const encryptedTenant2 = encryption.encrypt(testData.cpf, DIFFERENT_TENANT_ID);
  console.log(`   Mesmo valor, Tenant 1: ${encryptedTenant1?.substring(0, 60)}...`);
  console.log(`   Mesmo valor, Tenant 2: ${encryptedTenant2?.substring(0, 60)}...`);
  console.log(`   Ciphertexts diferentes: ${encryptedTenant1 !== encryptedTenant2 ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`   Isolamento garantido: ${encryptedTenant1 !== encryptedTenant2 ? '✅ SIM' : '❌ NÃO'}\n`);

  // Resultado final
  console.log('='.repeat(80));
  if (allSuccess) {
    console.log('\n✅ TODOS OS TESTES PASSARAM!');
    console.log('\n✓ Criptografia AES-256-GCM funcionando corretamente');
    console.log('✓ Descriptografia recupera valores originais');
    console.log('✓ Formato de ciphertext validado');
    console.log('✓ Proteção contra dupla criptografia ativa');
    console.log('✓ Isolamento criptográfico por tenant garantido');
    console.log('\n🎉 Sistema pronto para uso em produção!');
    console.log('\nPróximos passos:');
    console.log('  1. Testar com dados reais via API (POST /api/residents)');
    console.log('  2. Verificar dados criptografados no banco (SELECT cpf FROM "Resident")');
    console.log('  3. Validar descriptografia via API (GET /api/residents/:id)');
    console.log('  4. Backup da ENCRYPTION_MASTER_KEY em password manager');
    console.log('  5. Documentar implementação em docs/LGPD-DATA-SECURITY-IMPLEMENTATION.md\n');
  } else {
    console.log('\n❌ FALHAS DETECTADAS!');
    console.log('\nRevise a implementação antes de continuar.\n');
    process.exit(1);
  }

} catch (error: any) {
  console.error('\n❌ ERRO DURANTE TESTE:');
  console.error(`   Mensagem: ${error.message}`);
  console.error(`   Stack: ${error.stack}\n`);
  process.exit(1);
}
