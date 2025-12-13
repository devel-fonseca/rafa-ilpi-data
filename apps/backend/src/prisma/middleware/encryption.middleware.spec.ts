import { FieldEncryption } from './encryption.middleware';

describe('FieldEncryption', () => {
  const masterKey = 'test-master-key-with-minimum-32-characters-required';
  const tenantId = 'tenant-123';
  let encryption: FieldEncryption;

  beforeEach(() => {
    encryption = new FieldEncryption(masterKey);
  });

  describe('Constructor', () => {
    it('deve lançar erro se masterKey for muito curta', () => {
      expect(() => new FieldEncryption('short')).toThrow(
        'ENCRYPTION_KEY must be at least 32 characters for AES-256',
      );
    });

    it('deve aceitar masterKey com 32+ caracteres', () => {
      expect(() => new FieldEncryption(masterKey)).not.toThrow();
    });
  });

  describe('Encrypt / Decrypt', () => {
    it('deve criptografar e descriptografar texto corretamente', () => {
      const plaintext = 'Dados sensíveis do paciente';

      const encrypted = encryption.encrypt(plaintext, tenantId);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe('string');

      const decrypted = encryption.decrypt(encrypted!, tenantId);
      expect(decrypted).toBe(plaintext);
    });

    it('deve gerar criptografia diferente a cada chamada (IV único)', () => {
      const plaintext = 'Teste de IV único';

      const encrypted1 = encryption.encrypt(plaintext, tenantId);
      const encrypted2 = encryption.encrypt(plaintext, tenantId);

      expect(encrypted1).not.toBe(encrypted2);

      // Mas ambos devem descriptografar para o mesmo texto
      expect(encryption.decrypt(encrypted1!, tenantId)).toBe(plaintext);
      expect(encryption.decrypt(encrypted2!, tenantId)).toBe(plaintext);
    });

    it('deve preservar valores nulos', () => {
      expect(encryption.encrypt(null, tenantId)).toBeNull();
      expect(encryption.encrypt(undefined, tenantId)).toBeNull();
      expect(encryption.encrypt('', tenantId)).toBeNull();

      expect(encryption.decrypt(null, tenantId)).toBeNull();
      expect(encryption.decrypt(undefined, tenantId)).toBeNull();
      expect(encryption.decrypt('', tenantId)).toBeNull();
    });

    it('deve criptografar textos com caracteres especiais', () => {
      const plaintext = 'José da Silva - CPF: 123.456.789-00 - Diagnóstico: Hipertensão';

      const encrypted = encryption.encrypt(plaintext, tenantId);
      const decrypted = encryption.decrypt(encrypted!, tenantId);

      expect(decrypted).toBe(plaintext);
    });

    it('deve criptografar textos longos', () => {
      const plaintext = 'A'.repeat(10000); // 10KB de texto

      const encrypted = encryption.encrypt(plaintext, tenantId);
      const decrypted = encryption.decrypt(encrypted!, tenantId);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Isolamento por Tenant', () => {
    it('deve gerar criptografia diferente para tenants diferentes', () => {
      const plaintext = 'Dado sensível';
      const tenant1 = 'tenant-1';
      const tenant2 = 'tenant-2';

      const encrypted1 = encryption.encrypt(plaintext, tenant1);
      const encrypted2 = encryption.encrypt(plaintext, tenant2);

      // Criptografias devem ser diferentes
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('NÃO deve descriptografar com tenantId diferente', () => {
      const plaintext = 'Segredo do tenant 1';
      const tenant1 = 'tenant-1';
      const tenant2 = 'tenant-2';

      const encrypted = encryption.encrypt(plaintext, tenant1);

      // Tentar descriptografar com tenant errado deve falhar
      expect(() => encryption.decrypt(encrypted!, tenant2)).toThrow();
    });

    it('deve descriptografar corretamente com tenantId correto', () => {
      const plaintext = 'Dado isolado por tenant';
      const tenant1 = 'tenant-1';

      const encrypted = encryption.encrypt(plaintext, tenant1);
      const decrypted = encryption.decrypt(encrypted!, tenant1);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Integridade (Auth Tag)', () => {
    it('deve detectar adulteração de dados criptografados', () => {
      const plaintext = 'Dado original';
      const encrypted = encryption.encrypt(plaintext, tenantId)!;

      // Adulterar os dados (modificar último byte)
      const parts = encrypted.split(':');
      const encryptedData = parts[3];
      const tampered = encryptedData.slice(0, -2) + 'ff';
      parts[3] = tampered;
      const tamperedEncrypted = parts.join(':');

      // Descriptografia deve falhar
      expect(() => encryption.decrypt(tamperedEncrypted, tenantId)).toThrow(
        'Failed to decrypt field - data may be corrupted or tampered',
      );
    });

    it('deve detectar adulteração do authentication tag', () => {
      const plaintext = 'Dado protegido';
      const encrypted = encryption.encrypt(plaintext, tenantId)!;

      // Adulterar o auth tag
      const parts = encrypted.split(':');
      parts[2] = 'ffffffffffffffffffffffffffffffff'; // Tag inválido
      const tamperedEncrypted = parts.join(':');

      // Descriptografia deve falhar
      expect(() => encryption.decrypt(tamperedEncrypted, tenantId)).toThrow();
    });
  });

  describe('Formato de Dados', () => {
    it('deve gerar formato correto: salt:iv:tag:encrypted', () => {
      const plaintext = 'Teste formato';
      const encrypted = encryption.encrypt(plaintext, tenantId)!;

      const parts = encrypted.split(':');
      expect(parts.length).toBe(4);

      // Verificar se todas as partes são hexadecimal
      const hexRegex = /^[0-9a-f]+$/i;
      parts.forEach(part => {
        expect(hexRegex.test(part)).toBe(true);
      });

      // Verificar tamanhos esperados (em hex = 2 caracteres por byte)
      expect(parts[0].length).toBe(64); // salt: 32 bytes = 64 hex chars
      expect(parts[1].length).toBe(32); // iv: 16 bytes = 32 hex chars
      expect(parts[2].length).toBe(32); // tag: 16 bytes = 32 hex chars
      // parts[3] varia conforme tamanho do texto
    });

    it('deve rejeitar formato inválido na descriptografia', () => {
      const invalid = 'not:a:valid:encrypted:format';

      expect(() => encryption.decrypt(invalid, tenantId)).toThrow(
        'Failed to decrypt field',
      );
    });

    it('deve rejeitar string com menos de 4 partes', () => {
      const invalid = 'salt:iv:tag'; // Falta encrypted data

      expect(() => encryption.decrypt(invalid, tenantId)).toThrow();
    });
  });

  describe('isEncrypted', () => {
    it('deve identificar corretamente texto criptografado', () => {
      const plaintext = 'Texto plano';
      const encrypted = encryption.encrypt(plaintext, tenantId)!;

      expect(encryption.isEncrypted(encrypted)).toBe(true);
    });

    it('deve retornar false para texto plano', () => {
      expect(encryption.isEncrypted('Texto normal')).toBe(false);
      expect(encryption.isEncrypted('123.456.789-00')).toBe(false);
      expect(encryption.isEncrypted('email@example.com')).toBe(false);
    });

    it('deve retornar false para valores nulos/vazios', () => {
      expect(encryption.isEncrypted(null)).toBe(false);
      expect(encryption.isEncrypted(undefined)).toBe(false);
      expect(encryption.isEncrypted('')).toBe(false);
    });

    it('deve retornar false para formato incorreto', () => {
      expect(encryption.isEncrypted('a:b:c')).toBe(false); // Menos de 4 partes
      expect(encryption.isEncrypted('not-hex:values:here:test')).toBe(false);
    });
  });

  describe('Casos de Edge', () => {
    it('deve lidar com texto vazio após trim', () => {
      const plaintext = '   '; // Apenas espaços
      const encrypted = encryption.encrypt(plaintext, tenantId);

      // Espaços são considerados conteúdo válido
      expect(encrypted).not.toBeNull();

      const decrypted = encryption.decrypt(encrypted!, tenantId);
      expect(decrypted).toBe(plaintext);
    });

    it('deve criptografar números convertidos para string', () => {
      const plaintext = '12345678900'; // CPF numérico
      const encrypted = encryption.encrypt(plaintext, tenantId);
      const decrypted = encryption.decrypt(encrypted!, tenantId);

      expect(decrypted).toBe(plaintext);
    });

    it('deve criptografar texto com quebras de linha', () => {
      const plaintext = 'Linha 1\nLinha 2\nLinha 3';
      const encrypted = encryption.encrypt(plaintext, tenantId);
      const decrypted = encryption.decrypt(encrypted!, tenantId);

      expect(decrypted).toBe(plaintext);
    });

    it('deve criptografar texto com emojis e unicode', () => {
      const plaintext = 'Paciente 😷 com febre 🤒 - Observação: 中文';
      const encrypted = encryption.encrypt(plaintext, tenantId);
      const decrypted = encryption.decrypt(encrypted!, tenantId);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Performance', () => {
    it('deve criptografar/descriptografar 100 registros rapidamente', () => {
      const plaintext = 'Dado de teste para benchmark';
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const encrypted = encryption.encrypt(plaintext, `tenant-${i}`);
        encryption.decrypt(encrypted!, `tenant-${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Deve completar 100 encrypt/decrypt em menos de 1 segundo
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Segurança', () => {
    it('deve usar salt diferente a cada criptografia', () => {
      const plaintext = 'Mesmo texto';

      const encrypted1 = encryption.encrypt(plaintext, tenantId)!;
      const encrypted2 = encryption.encrypt(plaintext, tenantId)!;

      // Extrair salts
      const salt1 = encrypted1.split(':')[0];
      const salt2 = encrypted2.split(':')[0];

      expect(salt1).not.toBe(salt2);
    });

    it('deve usar IV diferente a cada criptografia', () => {
      const plaintext = 'Mesmo texto';

      const encrypted1 = encryption.encrypt(plaintext, tenantId)!;
      const encrypted2 = encryption.encrypt(plaintext, tenantId)!;

      // Extrair IVs
      const iv1 = encrypted1.split(':')[1];
      const iv2 = encrypted2.split(':')[1];

      expect(iv1).not.toBe(iv2);
    });

    it('NÃO deve permitir descriptografia com masterKey diferente', () => {
      const plaintext = 'Segredo com chave A';
      const encryption1 = new FieldEncryption('master-key-A-with-minimum-32-characters!!');
      const encryption2 = new FieldEncryption('master-key-B-with-minimum-32-characters!!');

      const encrypted = encryption1.encrypt(plaintext, tenantId)!;

      // Tentar descriptografar com outra instância (outra masterKey)
      expect(() => encryption2.decrypt(encrypted, tenantId)).toThrow();
    });
  });
});
