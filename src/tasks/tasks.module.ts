import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Goal } from '../goals/entities/goal.entity';
import { Project } from './entities/project.entity';
import { Task } from './entities/task.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Task, Goal])],
  controllers: [ProjectsController, TasksController],
  providers: [ProjectsService, TasksService],
  exports: [TasksService, ProjectsService],
})
export class TasksModule {}
