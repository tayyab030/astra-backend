import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from '../tasks/tasks.module';
import { TimeEntry } from './entities/time-entry.entity';
import { TimeTrackedTask } from './entities/time-tracked-task.entity';
import { TimeTrackSettings } from './entities/time-track-settings.entity';
import { TimeTrackController } from './time-track.controller';
import { TimeTrackService } from './time-track.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimeEntry,
      TimeTrackedTask,
      TimeTrackSettings,
    ]),
    TasksModule,
  ],
  controllers: [TimeTrackController],
  providers: [TimeTrackService],
  exports: [TimeTrackService],
})
export class TimeTrackModule {}
