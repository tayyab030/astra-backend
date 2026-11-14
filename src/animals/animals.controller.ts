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
import { AnimalsService } from './animals.service';
import {
  CreateAnimalDto,
  CreateAnimalGroupDto,
  UpdateAnimalDto,
  UpdateAnimalGroupDto,
} from './dto/animals.dto';

@Controller('animals')
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

  @Get(['groups', 'groups/'])
  listGroups(@Req() req: AuthenticatedRequest) {
    return this.animalsService.listGroups(req.user!.sub);
  }

  @Post(['groups', 'groups/'])
  createGroup(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAnimalGroupDto,
  ) {
    return this.animalsService.createGroup(req.user!.sub, dto);
  }

  @Get(['groups/:id', 'groups/:id/'])
  getGroup(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.animalsService.getGroup(req.user!.sub, id);
  }

  @Patch(['groups/:id', 'groups/:id/'])
  updateGroup(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAnimalGroupDto,
  ) {
    return this.animalsService.updateGroup(req.user!.sub, id, dto);
  }

  @Delete(['groups/:id', 'groups/:id/'])
  deleteGroup(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.animalsService.deleteGroup(req.user!.sub, id);
  }

  @Get(['', '/'])
  list(@Req() req: AuthenticatedRequest) {
    return this.animalsService.listAnimals(req.user!.sub);
  }

  @Post(['', '/'])
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateAnimalDto) {
    return this.animalsService.createAnimal(req.user!.sub, dto);
  }

  @Get([':id', ':id/'])
  getOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.animalsService.getAnimal(req.user!.sub, id);
  }

  @Patch([':id', ':id/'])
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAnimalDto,
  ) {
    return this.animalsService.updateAnimal(req.user!.sub, id, dto);
  }

  @Delete([':id', ':id/'])
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.animalsService.deleteAnimal(req.user!.sub, id);
  }
}
