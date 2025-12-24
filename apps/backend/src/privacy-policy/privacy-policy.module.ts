import { Module } from '@nestjs/common';
import { PrivacyPolicyController } from './privacy-policy.controller';
import { PrivacyPolicyService } from './privacy-policy.service';

@Module({
  controllers: [PrivacyPolicyController],
  providers: [PrivacyPolicyService],
  exports: [PrivacyPolicyService],
})
export class PrivacyPolicyModule {}
