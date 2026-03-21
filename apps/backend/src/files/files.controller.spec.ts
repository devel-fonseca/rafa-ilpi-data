import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('FilesController', () => {
  let controller: FilesController;
  let filesService: {
    getFileUrl: jest.Mock;
    deleteFile: jest.Mock;
  };

  beforeEach(async () => {
    filesService = {
      getFileUrl: jest.fn(),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        {
          provide: FilesService,
          useValue: filesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<FilesController>(FilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should forward plain string file paths on download', async () => {
    filesService.getFileUrl.mockResolvedValue('https://signed.example/file');

    const result = await controller.getFileUrl(
      'tenants/tenant-123/documents/file.pdf',
    );

    expect(filesService.getFileUrl).toHaveBeenCalledWith(
      'tenants/tenant-123/documents/file.pdf',
    );
    expect(result).toEqual({
      url: 'https://signed.example/file',
      expiresIn: 3600,
    });
  });

  it('should normalize wildcard array params on download', async () => {
    filesService.getFileUrl.mockResolvedValue('https://signed.example/file');

    await controller.getFileUrl([
      'tenants',
      'tenant-123',
      'documents',
      'file%20name.pdf',
    ]);

    expect(filesService.getFileUrl).toHaveBeenCalledWith(
      'tenants/tenant-123/documents/file name.pdf',
    );
  });

  it('should normalize wildcard array params on delete', async () => {
    filesService.deleteFile.mockResolvedValue(undefined);

    const result = await controller.deleteFile([
      'tenants',
      'tenant-123',
      'documents',
      'arquivo%20final.pdf',
    ]);

    expect(filesService.deleteFile).toHaveBeenCalledWith(
      'tenants/tenant-123/documents/arquivo final.pdf',
    );
    expect(result).toEqual({
      message: 'Arquivo deletado com sucesso',
    });
  });

  it('should keep raw path when decodeURIComponent fails', async () => {
    filesService.getFileUrl.mockResolvedValue('https://signed.example/file');

    await controller.getFileUrl([
      'tenants',
      'tenant-123',
      'documents',
      'broken%2',
    ]);

    expect(filesService.getFileUrl).toHaveBeenCalledWith(
      'tenants/tenant-123/documents/broken%2',
    );
  });
});
