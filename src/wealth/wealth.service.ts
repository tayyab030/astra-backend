import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  getCategoryLabel,
  isIncomeCategory,
  WEALTH_EXPENSE_CATEGORIES,
} from './constants/wealth-categories';
import { CreateCategoryBudgetDto } from './dto/create-category-budget.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateCategoryBudgetDto } from './dto/update-category-budget.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { WealthFilterDto } from './dto/wealth-filter.dto';
import { WealthCategoryBudget } from './entities/wealth-category-budget.entity';
import { WealthTransaction } from './entities/wealth-transaction.entity';

type ResolvedFilter =
  | { mode: 'month'; year: number; month: number }
  | { mode: 'year'; start_year: number; end_year: number };

type BudgetStatus = 'on_track' | 'near_limit' | 'over_budget';

@Injectable()
export class WealthService {
  constructor(
    @InjectRepository(WealthTransaction)
    private readonly transactionRepository: Repository<WealthTransaction>,
    @InjectRepository(WealthCategoryBudget)
    private readonly budgetRepository: Repository<WealthCategoryBudget>,
  ) {}

  async getDashboard(userId: string, filterDto: WealthFilterDto) {
    const filter = this.resolveFilter(filterDto);
    return this.buildDashboard(userId, filter);
  }

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    const signedAmount = isIncomeCategory(dto.category)
      ? dto.amount
      : -Math.abs(dto.amount);

    const transaction = this.transactionRepository.create({
      user_id: userId,
      description: dto.description.trim(),
      amount: signedAmount.toFixed(2),
      category: dto.category,
      date: dto.date,
    });

    const saved = await this.transactionRepository.save(transaction);
    return this.serializeTransaction(saved);
  }

  async updateTransaction(
    userId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
  ) {
    const transaction = await this.findOwnedTransaction(userId, transactionId);
    const category = dto.category ?? transaction.category;
    const amountValue =
      dto.amount ?? Math.abs(Number(transaction.amount));

    if (dto.description !== undefined) {
      transaction.description = dto.description.trim();
    }
    if (dto.date !== undefined) {
      transaction.date = dto.date;
    }
    if (dto.category !== undefined) {
      transaction.category = dto.category;
    }
    if (dto.amount !== undefined || dto.category !== undefined) {
      const signedAmount = isIncomeCategory(category)
        ? amountValue
        : -Math.abs(amountValue);
      transaction.amount = signedAmount.toFixed(2);
    }

    const saved = await this.transactionRepository.save(transaction);
    return this.serializeTransaction(saved);
  }

  async deleteTransaction(userId: string, transactionId: string) {
    const transaction = await this.findOwnedTransaction(userId, transactionId);
    await this.transactionRepository.remove(transaction);
    return { message: 'Transaction deleted' };
  }

  async createCategoryBudget(userId: string, dto: CreateCategoryBudgetDto) {
    if (dto.period_type === 'month' && dto.month === undefined) {
      throw new BadRequestException({
        month: ['Month is required for monthly budgets.'],
      });
    }

    if (dto.period_type === 'year' && dto.month !== undefined) {
      throw new BadRequestException({
        month: ['Month must not be set for yearly budgets.'],
      });
    }

    const month = dto.period_type === 'month' ? dto.month! : null;
    await this.ensureBudgetIsUnique(
      userId,
      dto.category,
      dto.period_type,
      dto.year,
      month,
    );

    const budget = this.budgetRepository.create({
      user_id: userId,
      category: dto.category,
      amount: dto.amount.toFixed(2),
      period_type: dto.period_type,
      year: dto.year,
      month,
    });

    const saved = await this.budgetRepository.save(budget);
    return this.serializeBudget(saved);
  }

  async updateCategoryBudget(
    userId: string,
    budgetId: string,
    dto: UpdateCategoryBudgetDto,
  ) {
    const budget = await this.findOwnedBudget(userId, budgetId);
    budget.amount = dto.amount.toFixed(2);
    const saved = await this.budgetRepository.save(budget);
    return this.serializeBudget(saved);
  }

  async deleteCategoryBudget(userId: string, budgetId: string) {
    const budget = await this.findOwnedBudget(userId, budgetId);
    await this.budgetRepository.remove(budget);
    return { message: 'Budget deleted' };
  }

  private resolveFilter(filterDto: WealthFilterDto): ResolvedFilter {
    const now = new Date();
    const mode = filterDto.mode ?? 'month';

    if (mode === 'year') {
      const startYear = filterDto.start_year ?? now.getFullYear();
      const endYear = filterDto.end_year ?? startYear;

      if (endYear < startYear) {
        throw new BadRequestException({
          end_year: ['End year must be greater than or equal to start year.'],
        });
      }

      return { mode: 'year', start_year: startYear, end_year: endYear };
    }

    return {
      mode: 'month',
      year: filterDto.year ?? now.getFullYear(),
      month: filterDto.month ?? now.getMonth() + 1,
    };
  }

  private async buildDashboard(userId: string, filter: ResolvedFilter) {
    const [transactions, netWorth, budgets, budgetTransactions] =
      await Promise.all([
        this.listFilteredTransactions(userId, filter),
        this.getNetWorth(userId),
        this.listBudgetsForFilter(userId, filter),
        this.listTransactionsForBudgetSpending(userId, filter),
      ]);

    const serializedTransactions = transactions.map((transaction) =>
      this.serializeTransaction(transaction),
    );

    const monthlyIncome = this.sumIncome(transactions);
    const monthlyExpenses = this.sumExpenses(transactions);

    return {
      filter,
      net_worth: netWorth,
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      net_savings: monthlyIncome - monthlyExpenses,
      waste_spending: this.sumWasteSpending(transactions),
      transactions: serializedTransactions,
      category_totals: this.getCategoryTotals(transactions),
      category_budgets: this.buildCategoryBudgets(budgets, budgetTransactions),
    };
  }

  private async listBudgetsForFilter(
    userId: string,
    filter: ResolvedFilter,
  ) {
    const query = this.budgetRepository
      .createQueryBuilder('budget')
      .where('budget.user_id = :userId', { userId });

    if (filter.mode === 'month') {
      query.andWhere(
        new Brackets((qb) => {
          qb.where(
            'budget.period_type = :monthType AND budget.year = :year AND budget.month = :month',
            {
              monthType: 'month',
              year: filter.year,
              month: filter.month,
            },
          ).orWhere(
            'budget.period_type = :yearType AND budget.year = :year',
            { yearType: 'year', year: filter.year },
          );
        }),
      );
      query
        .orderBy('budget.period_type', 'ASC')
        .addOrderBy('budget.category', 'ASC');
    } else {
      query
        .andWhere('budget.year BETWEEN :startYear AND :endYear', {
          startYear: filter.start_year,
          endYear: filter.end_year,
        })
        .orderBy('budget.year', 'ASC')
        .addOrderBy('budget.month', 'ASC', 'NULLS FIRST')
        .addOrderBy('budget.category', 'ASC');
    }

    return query.getMany();
  }

  private async listTransactionsForBudgetSpending(
    userId: string,
    filter: ResolvedFilter,
  ) {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.user_id = :userId', { userId })
      .andWhere('transaction.amount < 0');

    if (filter.mode === 'month') {
      query.andWhere('EXTRACT(YEAR FROM transaction.date) = :year', {
        year: filter.year,
      });
      query.andWhere('EXTRACT(MONTH FROM transaction.date) = :month', {
        month: filter.month,
      });
    } else {
      query.andWhere(
        'EXTRACT(YEAR FROM transaction.date) BETWEEN :startYear AND :endYear',
        {
          startYear: filter.start_year,
          endYear: filter.end_year,
        },
      );
    }

    return query.getMany();
  }

  private buildCategoryBudgets(
    budgets: WealthCategoryBudget[],
    transactions: WealthTransaction[],
  ) {
    return budgets.map((budget) => {
      const limit = Number(budget.amount);
      const spent = this.getSpentForBudget(transactions, budget);
      const remaining = limit - spent;
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      return {
        id: budget.id,
        category: budget.category,
        label: getCategoryLabel(budget.category),
        period_type: budget.period_type,
        year: budget.year,
        month: budget.month ?? undefined,
        limit,
        spent,
        remaining,
        percentage,
        status: this.getBudgetStatus(percentage),
      };
    });
  }

  private getSpentForBudget(
    transactions: WealthTransaction[],
    budget: WealthCategoryBudget,
  ) {
    return transactions.reduce((total, transaction) => {
      const amount = Number(transaction.amount);
      if (amount >= 0 || isIncomeCategory(transaction.category)) {
        return total;
      }

      const category = WEALTH_EXPENSE_CATEGORIES.some(
        (entry) => entry.value === transaction.category,
      )
        ? transaction.category
        : 'other';

      if (category !== budget.category) {
        return total;
      }

      const year = Number(transaction.date.slice(0, 4));
      const month = Number(transaction.date.slice(5, 7));

      if (budget.period_type === 'month') {
        if (year !== budget.year || month !== budget.month) {
          return total;
        }
      } else if (year !== budget.year) {
        return total;
      }

      return total + Math.abs(amount);
    }, 0);
  }

  private getBudgetStatus(percentage: number): BudgetStatus {
    if (percentage >= 100) {
      return 'over_budget';
    }

    if (percentage >= 80) {
      return 'near_limit';
    }

    return 'on_track';
  }

  private async ensureBudgetIsUnique(
    userId: string,
    category: string,
    periodType: 'month' | 'year',
    year: number,
    month: number | null,
  ) {
    const query = this.budgetRepository
      .createQueryBuilder('budget')
      .where('budget.user_id = :userId', { userId })
      .andWhere('budget.category = :category', { category })
      .andWhere('budget.period_type = :periodType', { periodType })
      .andWhere('budget.year = :year', { year });

    if (month === null) {
      query.andWhere('budget.month IS NULL');
    } else {
      query.andWhere('budget.month = :month', { month });
    }

    const existing = await query.getOne();

    if (existing) {
      throw new ConflictException({
        detail: 'A budget already exists for this category and period.',
      });
    }
  }

  private async getNetWorth(userId: string) {
    const transactions = await this.transactionRepository.find({
      where: { user_id: userId },
    });

    return transactions.reduce(
      (total, transaction) => total + Number(transaction.amount),
      0,
    );
  }

  private async listFilteredTransactions(
    userId: string,
    filter: ResolvedFilter,
  ) {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.user_id = :userId', { userId })
      .orderBy('transaction.date', 'DESC')
      .addOrderBy('transaction.created_at', 'DESC');

    if (filter.mode === 'month') {
      query.andWhere('EXTRACT(YEAR FROM transaction.date) = :year', {
        year: filter.year,
      });
      query.andWhere('EXTRACT(MONTH FROM transaction.date) = :month', {
        month: filter.month,
      });
    } else {
      query.andWhere(
        'EXTRACT(YEAR FROM transaction.date) BETWEEN :startYear AND :endYear',
        {
          startYear: filter.start_year,
          endYear: filter.end_year,
        },
      );
    }

    return query.getMany();
  }

  private sumIncome(transactions: WealthTransaction[]) {
    return transactions.reduce((total, transaction) => {
      if (!isIncomeCategory(transaction.category)) {
        return total;
      }

      return total + Math.abs(Number(transaction.amount));
    }, 0);
  }

  private sumExpenses(transactions: WealthTransaction[]) {
    return transactions.reduce((total, transaction) => {
      const amount = Number(transaction.amount);
      return amount < 0 ? total + Math.abs(amount) : total;
    }, 0);
  }

  private sumWasteSpending(transactions: WealthTransaction[]) {
    return transactions.reduce((total, transaction) => {
      const amount = Number(transaction.amount);
      if (amount >= 0 || transaction.category !== 'waste') {
        return total;
      }
      return total + Math.abs(amount);
    }, 0);
  }

  private getCategoryTotals(transactions: WealthTransaction[]) {
    const totals = new Map<string, number>();

    WEALTH_EXPENSE_CATEGORIES.forEach((category) => {
      totals.set(category.value, 0);
    });

    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount);
      if (amount >= 0 || isIncomeCategory(transaction.category)) {
        return;
      }

      const key = WEALTH_EXPENSE_CATEGORIES.some(
        (category) => category.value === transaction.category,
      )
        ? transaction.category
        : 'other';

      totals.set(key, (totals.get(key) ?? 0) + Math.abs(amount));
    });

    return WEALTH_EXPENSE_CATEGORIES.map((category) => ({
      value: category.value,
      label: category.label,
      total: totals.get(category.value) ?? 0,
    }));
  }

  private async findOwnedTransaction(userId: string, transactionId: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, user_id: userId },
    });

    if (!transaction) {
      throw new NotFoundException({ detail: 'Transaction not found.' });
    }

    return transaction;
  }

  private async findOwnedBudget(userId: string, budgetId: string) {
    const budget = await this.budgetRepository.findOne({
      where: { id: budgetId, user_id: userId },
    });

    if (!budget) {
      throw new NotFoundException({ detail: 'Budget not found.' });
    }

    return budget;
  }

  private serializeTransaction(transaction: WealthTransaction) {
    return {
      id: transaction.id,
      description: transaction.description,
      amount: Number(transaction.amount),
      category: transaction.category,
      date: transaction.date,
    };
  }

  private serializeBudget(budget: WealthCategoryBudget) {
    return {
      id: budget.id,
      category: budget.category,
      label: getCategoryLabel(budget.category),
      period_type: budget.period_type,
      year: budget.year,
      month: budget.month ?? undefined,
      limit: Number(budget.amount),
    };
  }
}
