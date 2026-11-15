import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductionDto, UpdateProductionDto } from './dto/production.dto';
import { ProductionRecord } from './entities/production-record.entity';

@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(ProductionRecord)
    private readonly productionRepository: Repository<ProductionRecord>,
  ) {}

  async list(userId: string) {
    const rows = await this.productionRepository.find({
      where: { user_id: userId },
      order: { date: 'DESC', created_at: 'DESC' },
    });
    return rows.map((row) => this.serialize(row));
  }

  async getOne(userId: string, id: string) {
    const row = await this.findOwned(userId, id);
    return this.serialize(row);
  }

  async create(userId: string, dto: CreateProductionDto) {
    const unit =
      dto.unit?.trim() ||
      (dto.type === 'milk' ? 'L' : dto.type === 'egg' ? 'eggs' : 'kg');
    const row = this.productionRepository.create({
      user_id: userId,
      type: dto.type,
      quantity: Number(dto.quantity).toFixed(2),
      unit,
      date: dto.date,
      time: dto.time?.trim() || null,
      animal_id: dto.animal_id ?? null,
      animal_tag: dto.animal_tag?.trim() || null,
      group_id: dto.group_id ?? null,
      group_name: dto.group_name?.trim() || null,
      breed: dto.breed?.trim() || null,
      session: dto.session ?? null,
      fat_percentage:
        dto.fat_percentage === undefined || dto.fat_percentage === null
          ? null
          : Number(dto.fat_percentage).toFixed(2),
      quality_grade: dto.quality_grade ?? null,
      broken_count: dto.broken_count ?? null,
      productivity: dto.productivity ?? null,
      notes: dto.notes?.trim() || null,
    });
    const saved = await this.productionRepository.save(row);
    return this.serialize(saved);
  }

  async update(userId: string, id: string, dto: UpdateProductionDto) {
    const row = await this.findOwned(userId, id);
    if (dto.type !== undefined) row.type = dto.type;
    if (dto.quantity !== undefined) {
      row.quantity = Number(dto.quantity).toFixed(2);
    }
    if (dto.unit !== undefined) row.unit = dto.unit?.trim() || row.unit;
    if (dto.date !== undefined) row.date = dto.date;
    if (dto.time !== undefined) row.time = dto.time?.trim() || null;
    if (dto.animal_id !== undefined) row.animal_id = dto.animal_id;
    if (dto.animal_tag !== undefined) {
      row.animal_tag = dto.animal_tag?.trim() || null;
    }
    if (dto.group_id !== undefined) row.group_id = dto.group_id;
    if (dto.group_name !== undefined) {
      row.group_name = dto.group_name?.trim() || null;
    }
    if (dto.breed !== undefined) row.breed = dto.breed?.trim() || null;
    if (dto.session !== undefined) row.session = dto.session;
    if (dto.fat_percentage !== undefined) {
      row.fat_percentage =
        dto.fat_percentage === null
          ? null
          : Number(dto.fat_percentage).toFixed(2);
    }
    if (dto.quality_grade !== undefined) {
      row.quality_grade = dto.quality_grade;
    }
    if (dto.broken_count !== undefined) row.broken_count = dto.broken_count;
    if (dto.productivity !== undefined) row.productivity = dto.productivity;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;

    const saved = await this.productionRepository.save(row);
    return this.serialize(saved);
  }

  async remove(userId: string, id: string) {
    const row = await this.findOwned(userId, id);
    await this.productionRepository.remove(row);
    return { message: 'Production record deleted' };
  }

  private async findOwned(userId: string, id: string) {
    const row = await this.productionRepository.findOne({
      where: { id, user_id: userId },
    });
    if (!row) {
      throw new NotFoundException({
        detail: 'Production record not found',
        code: 'not_found',
      });
    }
    return row;
  }

  private serialize(row: ProductionRecord) {
    return {
      id: row.id,
      type: row.type,
      quantity: Number(row.quantity),
      unit: row.unit,
      date: row.date,
      time: row.time,
      animal_id: row.animal_id,
      animal_tag: row.animal_tag,
      group_id: row.group_id,
      group_name: row.group_name,
      breed: row.breed,
      session: row.session,
      fat_percentage:
        row.fat_percentage == null ? null : Number(row.fat_percentage),
      quality_grade: row.quality_grade,
      broken_count: row.broken_count,
      productivity: row.productivity,
      notes: row.notes,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
