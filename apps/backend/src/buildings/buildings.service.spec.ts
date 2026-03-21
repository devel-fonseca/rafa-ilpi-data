import { Test, TestingModule } from '@nestjs/testing';
import { BuildingsService } from './buildings.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { EventsGateway } from '../events/events.gateway';

describe('BuildingsService', () => {
  let service: BuildingsService;
  let tenantClient: {
    building: { findMany: jest.Mock; count: jest.Mock };
    floor: { groupBy: jest.Mock; findMany: jest.Mock };
    room: { groupBy: jest.Mock; findMany: jest.Mock };
    bed: { groupBy: jest.Mock };
  };

  beforeEach(async () => {
    tenantClient = {
      building: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      floor: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      room: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      bed: {
        groupBy: jest.fn(),
      },
    };

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
            client: tenantClient,
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

  describe('findAll()', () => {
    it('should aggregate floors, rooms and beds in batch per building', async () => {
      tenantClient.building.findMany.mockResolvedValue([
        { id: 'building-1', name: 'Clínica 1', code: 'C1' },
        { id: 'building-2', name: 'Clínica 2', code: 'C2' },
      ]);
      tenantClient.building.count.mockResolvedValue(2);

      tenantClient.floor.groupBy.mockResolvedValue([
        { buildingId: 'building-1', _count: { _all: 2 } },
        { buildingId: 'building-2', _count: { _all: 1 } },
      ]);
      tenantClient.floor.findMany.mockResolvedValue([
        { id: 'floor-1', buildingId: 'building-1' },
        { id: 'floor-2', buildingId: 'building-1' },
        { id: 'floor-3', buildingId: 'building-2' },
      ]);

      tenantClient.room.groupBy.mockResolvedValue([
        { floorId: 'floor-1', _count: { _all: 2 } },
        { floorId: 'floor-2', _count: { _all: 1 } },
        { floorId: 'floor-3', _count: { _all: 1 } },
      ]);
      tenantClient.room.findMany.mockResolvedValue([
        { id: 'room-1', floorId: 'floor-1' },
        { id: 'room-2', floorId: 'floor-1' },
        { id: 'room-3', floorId: 'floor-2' },
        { id: 'room-4', floorId: 'floor-3' },
      ]);

      tenantClient.bed.groupBy
        .mockResolvedValueOnce([
          { roomId: 'room-1', _count: { _all: 2 } },
          { roomId: 'room-2', _count: { _all: 1 } },
          { roomId: 'room-3', _count: { _all: 2 } },
          { roomId: 'room-4', _count: { _all: 1 } },
        ])
        .mockResolvedValueOnce([
          { roomId: 'room-1', _count: { _all: 1 } },
          { roomId: 'room-3', _count: { _all: 1 } },
        ]);

      const result = await service.findAll(0, 50);

      expect(result).toEqual({
        data: [
          {
            id: 'building-1',
            name: 'Clínica 1',
            code: 'C1',
            totalFloors: 2,
            totalRooms: 3,
            totalBeds: 5,
            occupiedBeds: 2,
            availableBeds: 3,
          },
          {
            id: 'building-2',
            name: 'Clínica 2',
            code: 'C2',
            totalFloors: 1,
            totalRooms: 1,
            totalBeds: 1,
            occupiedBeds: 0,
            availableBeds: 1,
          },
        ],
        total: 2,
        skip: 0,
        take: 50,
      });
    });

    it('should return early when there are no buildings in the page', async () => {
      tenantClient.building.findMany.mockResolvedValue([]);
      tenantClient.building.count.mockResolvedValue(0);

      const result = await service.findAll(0, 50);

      expect(result).toEqual({
        data: [],
        total: 0,
        skip: 0,
        take: 50,
      });
      expect(tenantClient.floor.groupBy).not.toHaveBeenCalled();
      expect(tenantClient.room.groupBy).not.toHaveBeenCalled();
      expect(tenantClient.bed.groupBy).not.toHaveBeenCalled();
    });
  });
});
