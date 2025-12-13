// Script de debug para testar prescrição CONTROLADO
const payload = {
  prescriptionType: 'CONTROLADO',
  controlledClass: 'BZD',
  notificationNumber: 'A12345678',
  notificationType: 'AMARELA',
  prescriptionImageUrl: 'https://example.com/prescription-bzd.jpg'
};

console.log('Payload enviado:', JSON.stringify(payload, null, 2));
console.log('\nCampos presentes:');
console.log('- prescriptionType:', payload.prescriptionType);
console.log('- controlledClass:', payload.controlledClass);
console.log('- notificationNumber:', payload.notificationNumber);
console.log('- notificationType:', payload.notificationType);
console.log('- prescriptionImageUrl:', payload.prescriptionImageUrl);
console.log('\nTodos os campos obrigatórios estão presentes?', 
  !!(payload.prescriptionImageUrl && payload.notificationNumber && payload.notificationType && payload.controlledClass)
);
