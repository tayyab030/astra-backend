import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import {
  CreateProductionDto,
  UpdateProductionDto,
} from './dto/production.dto';
import { ProductionService } from './production.service';

@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get(['', '/'])
  list(@Req() req: AuthenticatedRequest) {
    return this.productionService.list(req.user!.sub);
  }

  @Post(['', '/'])
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProductionDto,
  ) {
    return this.productionService.create(req.user!.sub, dto);
  }

  @Get([':id', ':id/'])
  getOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.productionService.getOne(req.user!.sub, id);
  }

  @Patch([':id', ':id/'])
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateProductionDto,
  ) {
    return this.productionService.update(req.user!.sub, id, dto);
  }

  @Delete([':id', ':id/'])
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.productionService.remove(req.user!.sub, id);
  }
}
