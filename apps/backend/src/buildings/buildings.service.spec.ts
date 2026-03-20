import { Test, TestingModule } from '@nestjs/testing';
import { BuildingsService } from './buildings.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { EventsGateway } from '../events/events.gateway';

describe('BuildingsService', () => {
  let service: BuildingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingsService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: TenantContextService,
          useValue: {
            tenantId: 'tenant-test-id',
            client: {},
          },
        },
        {
          provide: EventsGateway,
          useValue: {
            emitDashboardOverviewUpdated: jest.fn(),
          },
        },
      ],
    }).compile();

    service = await module.resolve<BuildingsService>(BuildingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
