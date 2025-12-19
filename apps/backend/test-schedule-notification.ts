/**
 * Script de teste para criação de agendamento e notificação
 */
import { PrismaClient } from '@prisma/client';
import { parseISO } from 'date-fns';

const prisma = new PrismaClient();

async function testScheduleNotification() {
  const tenantId = '85764138-8729-4edd-85b5-37e734c7d8ba';
  const residentId = '299367cf-93ea-4278-acf6-d64a5cad31a7';
  const userId = '09472c5b-a2fb-408d-9940-a54c2fa9c6a5';

  console.log('🧪 Teste 1: Criar agendamento pontual');
  console.log('─────────────────────────────────────────');

  // 1. Criar evento agendado
  const event = await prisma.residentScheduledEvent.create({
    data: {
      tenantId,
      residentId,
      eventType: 'CONSULTATION',
      scheduledDate: parseISO('2025-12-18T12:00:00.000'),
      scheduledTime: '14:30',
      title: 'Consulta Cardiologista - TESTE',
      description: 'Teste de notificação automática',
      createdBy: userId,
    },
    include: {
      resident: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  console.log('✅ Evento criado:', {
    id: event.id,
    residentName: event.resident.fullName,
    title: event.title,
    scheduledDate: event.scheduledDate,
    scheduledTime: event.scheduledTime,
  });

  // 2. Criar notificação (simulando o que o service faz)
  const notification = await prisma.notification.create({
    data: {
      tenantId,
      type: 'SCHEDULED_EVENT_DUE',
      category: 'SCHEDULED_EVENT',
      severity: 'INFO',
      title: 'Evento Agendado Hoje',
      message: `${event.resident.fullName} tem um agendamento hoje às ${event.scheduledTime}: ${event.title}`,
      actionUrl: `/dashboard/residentes/${event.residentId}/agenda`,
      entityType: 'SCHEDULED_EVENT',
      entityId: event.id,
      metadata: {
        residentName: event.resident.fullName,
        eventTitle: event.title,
        scheduledTime: event.scheduledTime,
      },
    },
  });

  console.log('✅ Notificação criada:', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
  });

  console.log('\n🧪 Teste 2: Reagendar (simular update)');
  console.log('─────────────────────────────────────────');

  // 3. Atualizar evento (reagendar)
  const updated = await prisma.residentScheduledEvent.update({
    where: { id: event.id },
    data: {
      scheduledDate: parseISO('2025-12-19T12:00:00.000'),
      scheduledTime: '16:00',
      updatedBy: userId,
    },
    include: {
      resident: {
        select: {
          fullName: true,
        },
      },
    },
  });

  console.log('✅ Evento reagendado:', {
    id: updated.id,
    newDate: updated.scheduledDate,
    newTime: updated.scheduledTime,
  });

  // 4. Criar notificação de reagendamento
  const notification2 = await prisma.notification.create({
    data: {
      tenantId,
      type: 'SCHEDULED_EVENT_DUE',
      category: 'SCHEDULED_EVENT',
      severity: 'INFO',
      title: 'Evento Agendado Hoje',
      message: `${updated.resident.fullName} tem um agendamento hoje às ${updated.scheduledTime}: ${updated.title}`,
      actionUrl: `/dashboard/residentes/${updated.residentId}/agenda`,
      entityType: 'SCHEDULED_EVENT',
      entityId: updated.id,
      metadata: {
        residentName: updated.resident.fullName,
        eventTitle: updated.title,
        scheduledTime: updated.scheduledTime,
      },
    },
  });

  console.log('✅ Notificação de reagendamento criada:', {
    id: notification2.id,
    message: notification2.message,
  });

  console.log('\n📊 Resumo:');
  console.log('─────────────────────────────────────────');
  console.log(`✅ Evento ID: ${event.id}`);
  console.log(`✅ Notificação 1 (criação): ${notification.id}`);
  console.log(`✅ Notificação 2 (reagendamento): ${notification2.id}`);

  // Buscar todas as notificações do evento
  const allNotifications = await prisma.notification.findMany({
    where: {
      entityType: 'SCHEDULED_EVENT',
      entityId: event.id,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`\n📢 Total de notificações criadas: ${allNotifications.length}`);
  allNotifications.forEach((n, i) => {
    console.log(`  ${i + 1}. [${n.type}] ${n.title} - ${n.message}`);
  });

  // Limpeza
  console.log('\n🧹 Limpando dados de teste...');
  await prisma.notification.deleteMany({
    where: { entityId: event.id },
  });
  await prisma.residentScheduledEvent.delete({
    where: { id: event.id },
  });
  console.log('✅ Dados removidos');

  await prisma.$disconnect();
}

testScheduleNotification()
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('\n✅ Teste concluído!');
  });
