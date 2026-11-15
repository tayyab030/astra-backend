import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ageYearsFromDob,
  groupTypeFromSpecies,
} from './constants/animal-constants';
import {
  CreateAnimalDto,
  CreateAnimalGroupDto,
  UpdateAnimalDto,
  UpdateAnimalGroupDto,
} from './dto/animals.dto';
import { AnimalGroup } from './entities/animal-group.entity';
import { Animal } from './entities/animal.entity';

@Injectable()
export class AnimalsService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(AnimalGroup)
    private readonly groupRepository: Repository<AnimalGroup>,
  ) {}

  async listAnimals(userId: string) {
    const animals = await this.animalRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
    return animals.map((animal) => this.serializeAnimal(animal));
  }

  async getAnimal(userId: string, id: string) {
    const animal = await this.findOwnedAnimal(userId, id);
    return this.serializeAnimal(animal);
  }

  async createAnimal(userId: string, dto: CreateAnimalDto) {
    await this.ensureUniqueTag(userId, dto.tag);
    if (dto.group_id) {
      await this.findOwnedGroup(userId, dto.group_id);
    }

    const today = this.todayDate();
    const animal = this.animalRepository.create({
      user_id: userId,
      tag: dto.tag.trim(),
      species: dto.species,
      breed: dto.breed?.trim() || null,
      date_of_birth: dto.date_of_birth ?? null,
      sex: dto.sex ?? null,
      weight:
        dto.weight === undefined || dto.weight === null
          ? null
          : Number(dto.weight).toFixed(2),
      status: dto.status ?? 'Healthy',
      vaccination_status: dto.vaccination_status ?? 'Not Vaccinated',
      price: Number(dto.price ?? 0).toFixed(2),
      currency: dto.currency?.trim() || 'USD',
      price_updated: today,
      group_id: dto.group_id ?? null,
      notes: dto.notes?.trim() || null,
    });

    const saved = await this.animalRepository.save(animal);
    return this.serializeAnimal(saved);
  }

  async updateAnimal(userId: string, id: string, dto: UpdateAnimalDto) {
    const animal = await this.findOwnedAnimal(userId, id);

    if (dto.tag !== undefined && dto.tag.trim() !== animal.tag) {
      await this.ensureUniqueTag(userId, dto.tag, id);
      animal.tag = dto.tag.trim();
    }
    if (dto.species !== undefined) animal.species = dto.species;
    if (dto.breed !== undefined) animal.breed = dto.breed?.trim() || null;
    if (dto.date_of_birth !== undefined) {
      animal.date_of_birth = dto.date_of_birth;
    }
    if (dto.sex !== undefined) {
      animal.sex = dto.sex?.trim() ? dto.sex.trim() : null;
    }
    if (dto.weight !== undefined) {
      animal.weight =
        dto.weight === null ? null : Number(dto.weight).toFixed(2);
    }
    if (dto.status !== undefined) animal.status = dto.status;
    if (dto.vaccination_status !== undefined) {
      animal.vaccination_status = dto.vaccination_status;
    }
    if (dto.price !== undefined) {
      animal.price = Number(dto.price).toFixed(2);
      animal.price_updated = this.todayDate();
    }
    if (dto.currency !== undefined) {
      animal.currency = dto.currency.trim() || animal.currency;
    }
    if (dto.group_id !== undefined) {
      if (dto.group_id) {
        await this.findOwnedGroup(userId, dto.group_id);
      }
      animal.group_id = dto.group_id;
    }
    if (dto.notes !== undefined) animal.notes = dto.notes?.trim() || null;

    const saved = await this.animalRepository.save(animal);
    return this.serializeAnimal(saved);
  }

  async deleteAnimal(userId: string, id: string) {
    const animal = await this.findOwnedAnimal(userId, id);
    await this.animalRepository.remove(animal);
    return { message: 'Animal deleted' };
  }

  async listGroups(userId: string) {
    const groups = await this.groupRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
    return groups.map((group) => this.serializeGroup(group));
  }

  async getGroup(userId: string, id: string) {
    const group = await this.findOwnedGroup(userId, id);
    return this.serializeGroup(group);
  }

  async createGroup(userId: string, dto: CreateAnimalGroupDto) {
    const today = this.todayDate();
    const group = this.groupRepository.create({
      user_id: userId,
      name: dto.name.trim(),
      species: dto.species,
      breed: dto.breed?.trim() || null,
      count: Math.trunc(Number(dto.count)),
      date_created: dto.date_created ?? today,
      production_type: dto.production_type ?? null,
      health_status: dto.health_status ?? 'Healthy',
      vaccination_status: dto.vaccination_status ?? 'Not Vaccinated',
      unit_price: Number(dto.unit_price ?? 0).toFixed(2),
      currency: dto.currency?.trim() || 'USD',
      price_updated: today,
      notes: dto.notes?.trim() || null,
    });

    const saved = await this.groupRepository.save(group);
    return this.serializeGroup(saved);
  }

  async updateGroup(userId: string, id: string, dto: UpdateAnimalGroupDto) {
    const group = await this.findOwnedGroup(userId, id);

    if (dto.name !== undefined) group.name = dto.name.trim();
    if (dto.species !== undefined) group.species = dto.species;
    if (dto.breed !== undefined) group.breed = dto.breed?.trim() || null;
    if (dto.count !== undefined) group.count = Math.trunc(Number(dto.count));
    if (dto.date_created !== undefined) group.date_created = dto.date_created;
    if (dto.production_type !== undefined) {
      group.production_type = dto.production_type;
    }
    if (dto.health_status !== undefined) {
      group.health_status = dto.health_status;
    }
    if (dto.vaccination_status !== undefined) {
      group.vaccination_status = dto.vaccination_status;
    }
    if (dto.unit_price !== undefined) {
      group.unit_price = Number(dto.unit_price).toFixed(2);
      group.price_updated = this.todayDate();
    }
    if (dto.currency !== undefined) {
      group.currency = dto.currency.trim() || group.currency;
    }
    if (dto.notes !== undefined) group.notes = dto.notes?.trim() || null;

    const saved = await this.groupRepository.save(group);
    return this.serializeGroup(saved);
  }

  async deleteGroup(userId: string, id: string) {
    const group = await this.findOwnedGroup(userId, id);
    await this.animalRepository.update(
      { user_id: userId, group_id: id },
      { group_id: null },
    );
    await this.groupRepository.remove(group);
    return { message: 'Animal group deleted' };
  }

  private serializeAnimal(animal: Animal) {
    return {
      id: animal.id,
      tag: animal.tag,
      species: animal.species,
      breed: animal.breed,
      date_of_birth: animal.date_of_birth,
      age: ageYearsFromDob(animal.date_of_birth),
      sex: animal.sex,
      weight: animal.weight === null ? null : Number(animal.weight),
      status: animal.status,
      vaccination_status: animal.vaccination_status,
      price: Number(animal.price),
      currency: animal.currency,
      price_updated: animal.price_updated,
      group_id: animal.group_id,
      notes: animal.notes,
      type: 'individual' as const,
      created_at: animal.created_at,
      updated_at: animal.updated_at,
    };
  }

  private serializeGroup(group: AnimalGroup) {
    const unitPrice = Number(group.unit_price);
    return {
      id: group.id,
      name: group.name,
      species: group.species,
      type: groupTypeFromSpecies(group.species),
      breed: group.breed,
      count: group.count,
      animal_count: group.count,
      date_created: group.date_created,
      production_type: group.production_type,
      health_status: group.health_status,
      vaccination_status: group.vaccination_status,
      unit_price: unitPrice,
      currency: group.currency,
      price_updated: group.price_updated,
      notes: group.notes,
      total_value: unitPrice * group.count,
      created_at: group.created_at,
      updated_at: group.updated_at,
    };
  }

  private async findOwnedAnimal(userId: string, id: string) {
    const animal = await this.animalRepository.findOne({
      where: { id, user_id: userId },
    });
    if (!animal) {
      throw new NotFoundException({ detail: 'Animal not found.' });
    }
    return animal;
  }

  private async findOwnedGroup(userId: string, id: string) {
    const group = await this.groupRepository.findOne({
      where: { id, user_id: userId },
    });
    if (!group) {
      throw new NotFoundException({ detail: 'Animal group not found.' });
    }
    return group;
  }

  private async ensureUniqueTag(
    userId: string,
    tag: string,
    excludeId?: string,
  ) {
    const existing = await this.animalRepository.findOne({
      where: { user_id: userId, tag: tag.trim() },
    });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException({
        tag: ['An animal with this tag already exists.'],
      });
    }
  }

  private todayDate() {
    return new Date().toISOString().slice(0, 10);
  }
}
