import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getProjectStatusLabel } from './constants/project-status';
import { CreateProjectDto } from './dto/create-project.dto';
import { PatchProjectDto } from './dto/patch-project.dto';
import { Project } from './entities/project.entity';
import { TasksService } from './tasks.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly tasksService: TasksService,
  ) {}

  async listProjects(userId: string) {
    const projects = await this.projectRepository.find({
      where: { user_id: userId },
      order: { starred: 'DESC', updated_at: 'DESC' },
    });

    const dueSoonCounts = await this.tasksService.getTasksDueSoonCounts(
      userId,
      projects.map((project) => project.id),
    );
    const taskCounts = await this.tasksService.getProjectTaskCounts(
      userId,
      projects.map((project) => project.id),
    );

    return projects.map((project) =>
      this.serializeProject(
        project,
        dueSoonCounts.get(project.id) ?? 0,
        taskCounts.get(project.id),
      ),
    );
  }

  async getProject(userId: string, projectId: string) {
    const project = await this.findOwnedProject(userId, projectId);
    const dueSoonCount = await this.countTasksDueSoon(userId, projectId);
    const taskCounts = await this.tasksService.getProjectTaskCounts(userId, [
      projectId,
    ]);
    return this.serializeProject(project, dueSoonCount, taskCounts.get(projectId));
  }

  async createProject(userId: string, dto: CreateProjectDto) {
    const project = this.projectRepository.create({
      user_id: userId,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? '',
      color: dto.color,
      icon: dto.icon,
      starred: dto.starred ?? false,
      status: dto.status,
      due_date: this.normalizeDueDate(dto.due_date),
    });

    const saved = await this.projectRepository.save(project);
    const withDetails = await this.findOwnedProject(userId, saved.id);
    return {
      message: 'Project created successfully',
      ...this.serializeProject(withDetails, 0),
    };
  }

  async replaceProject(userId: string, projectId: string, dto: CreateProjectDto) {
    const project = await this.findOwnedProject(userId, projectId);

    project.title = dto.title.trim();
    project.description = dto.description?.trim() ?? '';
    project.color = dto.color;
    project.icon = dto.icon;
    project.starred = dto.starred ?? false;
    project.status = dto.status;
    project.due_date = this.normalizeDueDate(dto.due_date);

    await this.projectRepository.update(projectId, {
      title: project.title,
      description: project.description,
      color: project.color,
      icon: project.icon,
      starred: project.starred,
      status: project.status,
      due_date: project.due_date,
    });

    const updated = await this.findOwnedProject(userId, projectId);
    const dueSoonCount = await this.countTasksDueSoon(userId, projectId);
    const taskCounts = await this.tasksService.getProjectTaskCounts(userId, [
      projectId,
    ]);

    return {
      message: 'Project updated successfully',
      ...this.serializeProject(updated, dueSoonCount, taskCounts.get(projectId)),
    };
  }

  async patchProject(userId: string, projectId: string, dto: PatchProjectDto) {
    const project = await this.findOwnedProject(userId, projectId);

    if (dto.title !== undefined) project.title = dto.title.trim();
    if (dto.description !== undefined) {
      project.description = dto.description.trim();
    }
    if (dto.color !== undefined) project.color = dto.color;
    if (dto.icon !== undefined) project.icon = dto.icon;
    if (dto.starred !== undefined) project.starred = dto.starred;
    if (dto.status !== undefined) project.status = dto.status;
    if (dto.due_date !== undefined) {
      project.due_date = this.normalizeDueDate(dto.due_date);
    }

    await this.projectRepository.update(projectId, {
      title: project.title,
      description: project.description,
      color: project.color,
      icon: project.icon,
      starred: project.starred,
      status: project.status,
      due_date: project.due_date,
    });

    const updated = await this.findOwnedProject(userId, projectId);
    const dueSoonCount = await this.countTasksDueSoon(userId, projectId);
    const taskCounts = await this.tasksService.getProjectTaskCounts(userId, [
      projectId,
    ]);

    return {
      message: 'Project updated successfully',
      ...this.serializeProject(updated, dueSoonCount, taskCounts.get(projectId)),
    };
  }

  async deleteProject(userId: string, projectId: string) {
    const project = await this.findOwnedProject(userId, projectId);
    await this.projectRepository.remove(project);
    return { message: 'Project deleted successfully' };
  }

  async listProjectTasks(userId: string, projectId: string) {
    return this.tasksService.listProjectTasks(userId, projectId);
  }

  private async findOwnedProject(userId: string, projectId: string) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, user_id: userId },
    });

    if (!project) {
      throw new NotFoundException({ detail: 'Project not found.' });
    }

    return project;
  }

  private normalizeDueDate(value?: string | null) {
    if (!value) return null;
    return value.slice(0, 10);
  }

  private async countTasksDueSoon(userId: string, projectId: string) {
    const counts = await this.tasksService.getTasksDueSoonCounts(userId, [
      projectId,
    ]);
    return counts.get(projectId) ?? 0;
  }

  private serializeProject(
    project: Project,
    tasksDueSoon: number,
    linkedTasks?: { total: number; completed: number; pending: number },
  ) {
    const emptyTasks = { total: 0, completed: 0, pending: 0 };

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      color: project.color,
      icon: project.icon,
      starred: project.starred,
      status: project.status,
      status_label: getProjectStatusLabel(project.status),
      due_date: project.due_date,
      tasks_due_soon: tasksDueSoon,
      linked_tasks: linkedTasks ?? emptyTasks,
    };
  }
}
