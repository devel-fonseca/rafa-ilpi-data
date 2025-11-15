import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function fixDemoUser() {
  console.log('🔧 Criando/Atualizando Casa de Repouso Vida Plena...');

  try {
    // Buscar ou criar o tenant Vida Plena
    let tenant = await prisma.tenant.findFirst({
      where: {
        slug: 'vida-plena'
      }
    });

    if (!tenant) {
      console.log('⚠️ Tenant Vida Plena não encontrado, criando...');

      // Get the Free plan
      const freePlan = await prisma.plan.findUnique({
        where: { type: 'FREE' }
      });

      if (!freePlan) {
        console.error('❌ Plano FREE não encontrado');
        return;
      }

      // Criar novo tenant Vida Plena
      tenant = await prisma.tenant.create({
        data: {
          name: 'Casa de Repouso Vida Plena',
          slug: 'vida-plena',
          cnpj: '98.765.432/0001-10',
          schemaName: 'tenant_vida_plena',
          email: 'contato@vidaplena.com.br',
          phone: '(11) 91234-5678',
          address: 'Avenida da Paz, 456 - Jardim Esperança - São Paulo/SP',
          addressNumber: '456',
          addressComplement: '',
          addressDistrict: 'Jardim Esperança',
          addressCity: 'São Paulo',
          addressState: 'SP',
          addressZipCode: '04567-890',
          status: 'ACTIVE',
          subscriptions: {
            create: {
              planId: freePlan.id,
              status: 'TRIAL',
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }
          }
        }
      });

      // Criar schema no PostgreSQL
      try {
        await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "tenant_vida_plena"`);
        console.log('✓ Schema tenant_vida_plena criado');
      } catch (error) {
        console.error('⚠️ Erro criando schema (pode já existir):', error);
      }

      console.log('✅ Tenant Vida Plena criado!');
    } else {
      console.log('✓ Tenant Vida Plena encontrado:', tenant.id);
    }

    // Verificar se o usuário existe
    const existingUser = await prisma.user.findFirst({
      where: {
        email: 'admin@vidaplena.com',
        tenantId: tenant.id
      }
    });

    if (existingUser) {
      console.log('✓ Usuário admin encontrado, atualizando senha...');

      // Atualizar a senha
      const hashedPassword = await bcrypt.hash('senha123', 10);

      await prisma.user.update({
        where: {
          id: existingUser.id
        },
        data: {
          password: hashedPassword,
          isActive: true,
          tenantId: tenant.id,
          role: 'ADMIN'
        }
      });

      console.log('✅ Senha do usuário admin atualizada!');
    } else {
      console.log('⚠️ Usuário admin não encontrado, criando...');

      // Criar o usuário
      const hashedPassword = await bcrypt.hash('senha123', 10);

      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: 'Administrador Vida Plena',
          email: 'admin@vidaplena.com',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
        }
      });

      console.log('✅ Usuário admin criado!');
    }

    console.log('\n📧 Credenciais de Acesso:');
    console.log('   ILPI: Casa de Repouso Vida Plena');
    console.log('   Email: admin@vidaplena.com');
    console.log('   Senha: senha123');

    // Testar o hash
    const testUser = await prisma.user.findFirst({
      where: {
        email: 'admin@vidaplena.com',
        tenantId: tenant.id
      }
    });

    if (testUser) {
      const isValid = await bcrypt.compare('senha123', testUser.password);
      console.log('\n🔐 Teste de senha:', isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDemoUser();