import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CreateTaskDto } from './dto/create-task.dto';
import { TasksFilterDto } from './dto/tasks-filter.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get(['', '/'])
  listTasks(
    @Req() req: AuthenticatedRequest,
    @Query() filterDto: TasksFilterDto,
  ) {
    return this.tasksService.listTasks(req.user!.sub, filterDto);
  }

  @Post(['', '/'])
  createTask(@Req() req: AuthenticatedRequest, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(req.user!.sub, dto);
  }

  @Get([':id', ':id/'])
  getTask(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.getTask(req.user!.sub, id);
  }

  @Patch([':id', ':id/'])
  updateTask(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(req.user!.sub, id, dto);
  }

  @Delete([':id', ':id/'])
  deleteTask(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.deleteTask(req.user!.sub, id);
  }
}
