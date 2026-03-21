import { FieldEncryption } from './encryption.middleware';

describe('FieldEncryption', () => {
  const masterKey = 'a'.repeat(64);
  const alternateMasterKey = 'b'.repeat(64);
  const tenantId = 'tenant-123';
  let encryption: FieldEncryption;

  beforeEach(() => {
    encryption = new FieldEncryption(masterKey);
    jest.spyOn((encryption as any).logger, 'error').mockImplementation();
  });

  describe('Constructor', () => {
    it('deve lançar erro se masterKey não tiver 64 hex chars', () => {
      expect(() => new FieldEncryption('short')).toThrow(
        'ENCRYPTION_MASTER_KEY must be exactly 64 hex chars (32 bytes)',
      );
    });

    it('deve aceitar masterKey com 64 hex chars', () => {
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
      expect(encryption.decrypt(encrypted1!, tenantId)).toBe(plaintext);
      expect(encryption.decrypt(encrypted2!, tenantId)).toBe(plaintext);
    });

    it('deve preservar valores nulos e vazios', () => {
      expect(encryption.encrypt(null, tenantId)).toBeNull();
      expect(encryption.encrypt(undefined, tenantId)).toBeNull();
      expect(encryption.encrypt('', tenantId)).toBeNull();

      expect(encryption.decrypt(null, tenantId)).toBeNull();
      expect(encryption.decrypt(undefined, tenantId)).toBeNull();
      expect(encryption.decrypt('', tenantId)).toBeNull();
    });

    it('deve criptografar textos com caracteres especiais', () => {
      const plaintext =
        'José da Silva - CPF: 123.456.789-00 - Diagnóstico: Hipertensão';

      const encrypted = encryption.encrypt(plaintext, tenantId);
      const decrypted = encryption.decrypt(encrypted!, tenantId);

      expect(decrypted).toBe(plaintext);
    });

    it('deve criptografar textos longos', () => {
      const plaintext = 'A'.repeat(10000);

      const encrypted = encryption.encrypt(plaintext, tenantId);
      const decrypted = encryption.decrypt(encrypted!, tenantId);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Isolamento por Tenant', () => {
    it('deve gerar criptografia diferente para tenants diferentes', () => {
      const plaintext = 'Dado sensível';

      const encrypted1 = encryption.encrypt(plaintext, 'tenant-1');
      const encrypted2 = encryption.encrypt(plaintext, 'tenant-2');

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('NÃO deve descriptografar com tenantId diferente', () => {
      const plaintext = 'Segredo do tenant 1';
      const encrypted = encryption.encrypt(plaintext, 'tenant-1');

      expect(() => encryption.decrypt(encrypted!, 'tenant-2')).toThrow();
    });

    it('deve descriptografar corretamente com tenantId correto', () => {
      const plaintext = 'Dado isolado por tenant';
      const encrypted = encryption.encrypt(plaintext, 'tenant-1');
      const decrypted = encryption.decrypt(encrypted!, 'tenant-1');

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Integridade (Auth Tag)', () => {
    it('deve detectar adulteração de dados criptografados', () => {
      const encrypted = encryption.encrypt('Dado original', tenantId)!;

      const parts = encrypted.split(':');
      parts[3] = parts[3].slice(0, -2) + 'ff';
      const tamperedEncrypted = parts.join(':');

      expect(() => encryption.decrypt(tamperedEncrypted, tenantId)).toThrow(
        'Failed to decrypt field - data may be corrupted or tampered',
      );
    });

    it('deve detectar adulteração do authentication tag', () => {
      const encrypted = encryption.encrypt('Dado protegido', tenantId)!;

      const parts = encrypted.split(':');
      parts[2] = 'ffffffffffffffffffffffffffffffff';
      const tamperedEncrypted = parts.join(':');

      expect(() => encryption.decrypt(tamperedEncrypted, tenantId)).toThrow();
    });
  });

  describe('Formato de Dados', () => {
    it('deve gerar formato correto: salt:iv:tag:encrypted', () => {
      const encrypted = encryption.encrypt('Teste formato', tenantId)!;
      const parts = encrypted.split(':');

      expect(parts.length).toBe(4);

      const hexRegex = /^[0-9a-f]+$/i;
      parts.forEach((part) => {
        expect(hexRegex.test(part)).toBe(true);
      });

      expect(parts[0].length).toBe(128);
      expect(parts[1].length).toBe(32);
      expect(parts[2].length).toBe(32);
    });

    it('deve retornar texto legado quando a string não estiver no formato criptografado', () => {
      expect(encryption.decrypt('not:a:valid:encrypted:format', tenantId)).toBe(
        'not:a:valid:encrypted:format',
      );
      expect(encryption.decrypt('salt:iv:tag', tenantId)).toBe('salt:iv:tag');
    });
  });

  describe('isEncrypted', () => {
    it('deve identificar corretamente texto criptografado', () => {
      const encrypted = encryption.encrypt('Texto plano', tenantId)!;

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
      expect(encryption.isEncrypted('a:b:c')).toBe(false);
      expect(encryption.isEncrypted('not-hex:values:here:test')).toBe(false);
    });
  });

  describe('Casos de Edge', () => {
    it('deve tratar texto vazio após trim como valor vazio', () => {
      expect(encryption.encrypt('   ', tenantId)).toBeNull();
    });

    it('deve criptografar números convertidos para string', () => {
      const plaintext = '12345678900';
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
    it('deve criptografar/descriptografar 100 registros em tempo razoável', () => {
      const plaintext = 'Dado de teste para benchmark';
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const encrypted = encryption.encrypt(plaintext, `tenant-${i}`);
        encryption.decrypt(encrypted!, `tenant-${i}`);
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(15000);
    });
  });

  describe('Segurança', () => {
    it('deve usar salt diferente a cada criptografia', () => {
      const encrypted1 = encryption.encrypt('Mesmo texto', tenantId)!;
      const encrypted2 = encryption.encrypt('Mesmo texto', tenantId)!;

      expect(encrypted1.split(':')[0]).not.toBe(encrypted2.split(':')[0]);
    });

    it('deve usar IV diferente a cada criptografia', () => {
      const encrypted1 = encryption.encrypt('Mesmo texto', tenantId)!;
      const encrypted2 = encryption.encrypt('Mesmo texto', tenantId)!;

      expect(encrypted1.split(':')[1]).not.toBe(encrypted2.split(':')[1]);
    });

    it('NÃO deve permitir descriptografia com masterKey diferente', () => {
      const encryption1 = new FieldEncryption(masterKey);
      const encryption2 = new FieldEncryption(alternateMasterKey);
      const encrypted = encryption1.encrypt('Segredo com chave A', tenantId)!;

      expect(() => encryption2.decrypt(encrypted, tenantId)).toThrow();
    });
  });
});
