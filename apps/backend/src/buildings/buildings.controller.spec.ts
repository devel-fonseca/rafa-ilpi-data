import { Test, TestingModule } from '@nestjs/testing';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { FeatureGuard } from '../common/guards/feature.guard';

describe('BuildingsController', () => {
  let controller: BuildingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuildingsController],
      providers: [
        {
          provide: BuildingsService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(FeatureGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<BuildingsController>(BuildingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
