import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CreateProjectDto } from './dto/create-project.dto';
import { PatchProjectDto } from './dto/patch-project.dto';
import { ProjectsService } from './projects.service';

@Controller('tasks/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(['', '/'])
  listProjects(@Req() req: AuthenticatedRequest) {
    return this.projectsService.listProjects(req.user!.sub);
  }

  @Post(['', '/'])
  createProject(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.createProject(req.user!.sub, dto);
  }

  @Get([':id/tasks', ':id/tasks/'])
  listProjectTasks(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.projectsService.listProjectTasks(req.user!.sub, id);
  }

  @Get([':id', ':id/'])
  getProject(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.projectsService.getProject(req.user!.sub, id);
  }

  @Put([':id', ':id/'])
  replaceProject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.replaceProject(req.user!.sub, id, dto);
  }

  @Patch([':id', ':id/'])
  patchProject(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: PatchProjectDto,
  ) {
    return this.projectsService.patchProject(req.user!.sub, id, dto);
  }

  @Delete([':id', ':id/'])
  deleteProject(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.projectsService.deleteProject(req.user!.sub, id);
  }
}
