import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function reset() {
  console.log('🔄 RESETANDO FLAGS DOS TRIALS DE MANU\n')
  console.log('━'.repeat(60))

  // Buscar todos os tenants Manu de teste
  const result = await prisma.subscription.updateMany({
    where: {
      tenant: {
        name: { startsWith: 'TESTE Manu' },
        email: 'manu.root@gmail.com',
      },
    },
    data: {
      trialAlert7Sent: false,
      trialAlert3Sent: false,
      trialAlert1Sent: false,
    },
  })

  console.log(`✅ ${result.count} subscriptions resetadas!\n`)
  console.log('Agora você pode executar os jobs novamente para enviar os emails.\n')

  await prisma.$disconnect()
}

reset()
