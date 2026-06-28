import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  getCategoryLabel,
  WEALTH_CATEGORIES,
} from './constants/wealth-categories';
import { CreateSavingDto } from './dto/create-saving.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateSavingDto } from './dto/update-saving.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { WealthFilterDto } from './dto/wealth-filter.dto';
import { WithdrawSavingDto } from './dto/withdraw-saving.dto';
import { WealthSaving } from './entities/wealth-saving.entity';
import { WealthTransaction } from './entities/wealth-transaction.entity';

type ResolvedFilter =
  | { mode: 'month'; year: number; month: number }
  | { mode: 'year'; start_year: number; end_year: number };

@Injectable()
export class WealthService {
  constructor(
    @InjectRepository(WealthTransaction)
    private readonly transactionRepository: Repository<WealthTransaction>,
    @InjectRepository(WealthSaving)
    private readonly savingRepository: Repository<WealthSaving>,
  ) {}

  async getDashboard(userId: string, filterDto: WealthFilterDto) {
    const filter = this.resolveFilter(filterDto);
    return this.buildDashboard(userId, filter);
  }

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    const signedAmount =
      dto.category === 'income' ? dto.amount : -Math.abs(dto.amount);

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
      dto.amount ??
      Math.abs(Number(transaction.amount));

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
      const signedAmount =
        category === 'income' ? amountValue : -Math.abs(amountValue);
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

  async createSaving(userId: string, dto: CreateSavingDto) {
    const saving = this.savingRepository.create({
      user_id: userId,
      amount: dto.amount.toFixed(2),
      month: dto.month,
      type: 'deposit',
      reason: null,
    });

    const saved = await this.savingRepository.save(saving);
    return this.serializeSaving(saved);
  }

  async withdrawSaving(userId: string, dto: WithdrawSavingDto) {
    const balance = await this.getSavingsBalance(userId);
    if (dto.amount > balance) {
      throw new BadRequestException({
        amount: [`You only have ${balance.toFixed(2)} available to extract.`],
      });
    }

    const reason = dto.reason.trim();
    const expenseTransaction = await this.createWithdrawalExpenseTransaction(
      userId,
      dto.amount,
      dto.month,
      reason,
    );

    const saving = this.savingRepository.create({
      user_id: userId,
      amount: dto.amount.toFixed(2),
      month: dto.month,
      type: 'withdrawal',
      reason,
      transaction_id: expenseTransaction.id,
    });

    const saved = await this.savingRepository.save(saving);
    return this.serializeSaving(saved);
  }

  async updateSaving(
    userId: string,
    savingId: string,
    dto: UpdateSavingDto,
  ) {
    const saving = await this.findOwnedSaving(userId, savingId);
    const nextAmount = dto.amount ?? Number(saving.amount);
    const nextMonth = dto.month ?? saving.month;

    if (saving.type === 'withdrawal') {
      const nextReason =
        dto.reason !== undefined ? dto.reason.trim() : saving.reason;

      if (!nextReason) {
        throw new BadRequestException({
          reason: ['Reason is required when extracting from savings.'],
        });
      }

      const availableBalance = await this.getSavingsBalanceExcluding(
        userId,
        savingId,
      );
      if (nextAmount > availableBalance) {
        throw new BadRequestException({
          amount: [
            `You only have ${availableBalance.toFixed(2)} available to extract.`,
          ],
        });
      }

      saving.reason = nextReason;
    }

    saving.amount = nextAmount.toFixed(2);
    saving.month = nextMonth;

    const saved = await this.savingRepository.save(saving);

    if (saved.type === 'withdrawal' && saved.reason) {
      await this.syncWithdrawalExpenseTransaction(
        userId,
        saved,
        nextAmount,
        nextMonth,
        saved.reason,
      );
    }

    return this.serializeSaving(saved);
  }

  async deleteSaving(userId: string, savingId: string) {
    const saving = await this.findOwnedSaving(userId, savingId);

    if (saving.type === 'withdrawal' && saving.transaction_id) {
      await this.deleteLinkedTransaction(userId, saving.transaction_id);
    }

    await this.savingRepository.remove(saving);
    return { message: 'Saving deleted' };
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
    const [transactions, savings, savingsBalance] = await Promise.all([
      this.listFilteredTransactions(userId, filter),
      this.listFilteredSavings(userId, filter),
      this.getSavingsBalance(userId),
    ]);

    const serializedTransactions = transactions.map((transaction) =>
      this.serializeTransaction(transaction),
    );
    const serializedSavings = savings.map((saving) =>
      this.serializeSaving(saving),
    );

    const monthlyIncome = this.sumIncome(transactions);
    const monthlyExpenses = this.sumExpenses(transactions);
    const wasteSpending = this.sumWasteSpending(transactions);

    return {
      filter,
      net_worth: savingsBalance,
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      net_savings: monthlyIncome - monthlyExpenses,
      waste_spending: wasteSpending,
      savings_balance: savingsBalance,
      transactions: serializedTransactions,
      savings: serializedSavings,
      category_totals: this.getCategoryTotals(transactions),
    };
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
      query.andWhere('EXTRACT(YEAR FROM transaction.date) BETWEEN :startYear AND :endYear', {
        startYear: filter.start_year,
        endYear: filter.end_year,
      });
    }

    return query.getMany();
  }

  private async listFilteredSavings(userId: string, filter: ResolvedFilter) {
    const query = this.savingRepository
      .createQueryBuilder('saving')
      .where('saving.user_id = :userId', { userId })
      .orderBy('saving.month', 'DESC')
      .addOrderBy('saving.created_at', 'DESC');

    if (filter.mode === 'month') {
      const monthKey = `${filter.year}-${String(filter.month).padStart(2, '0')}`;
      query.andWhere('saving.month = :monthKey', { monthKey });
    } else {
      query.andWhere(
        'CAST(SPLIT_PART(saving.month, \'-\', 1) AS INTEGER) BETWEEN :startYear AND :endYear',
        {
          startYear: filter.start_year,
          endYear: filter.end_year,
        },
      );
    }

    return query.getMany();
  }

  private async getSavingsBalance(userId: string) {
    const entries = await this.savingRepository.find({
      where: { user_id: userId },
    });

    return this.sumSavingsEntries(entries);
  }

  private async getSavingsBalanceExcluding(userId: string, excludeId: string) {
    const entries = await this.savingRepository.find({
      where: { user_id: userId },
    });

    return this.sumSavingsEntries(
      entries.filter((entry) => entry.id !== excludeId),
    );
  }

  private sumSavingsEntries(entries: WealthSaving[]) {
    return entries.reduce((total, entry) => {
      const amount = Number(entry.amount);
      return entry.type === 'deposit' ? total + amount : total - amount;
    }, 0);
  }

  private sumIncome(transactions: WealthTransaction[]) {
    return transactions.reduce((total, transaction) => {
      const amount = Number(transaction.amount);
      return amount > 0 ? total + amount : total;
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

    WEALTH_CATEGORIES.filter((category) => category.value !== 'income').forEach(
      (category) => {
        totals.set(category.value, 0);
      },
    );

    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount);
      if (amount >= 0) {
        return;
      }

      const key = WEALTH_CATEGORIES.some(
        (category) => category.value === transaction.category,
      )
        ? transaction.category
        : 'other';

      if (key === 'income') {
        return;
      }

      totals.set(key, (totals.get(key) ?? 0) + Math.abs(amount));
    });

    return WEALTH_CATEGORIES.filter(
      (category) => category.value !== 'income',
    ).map((category) => ({
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

  private async findOwnedSaving(userId: string, savingId: string) {
    const saving = await this.savingRepository.findOne({
      where: { id: savingId, user_id: userId },
    });

    if (!saving) {
      throw new NotFoundException({ detail: 'Saving not found.' });
    }

    return saving;
  }

  private serializeTransaction(transaction: WealthTransaction) {
    return {
      id: transaction.id,
      description: transaction.description,
      amount: Number(transaction.amount),
      category: getCategoryLabel(transaction.category),
      date: transaction.date,
    };
  }

  private serializeSaving(saving: WealthSaving) {
    return {
      id: saving.id,
      amount: Number(saving.amount),
      month: saving.month,
      type: saving.type,
      ...(saving.reason ? { reason: saving.reason } : {}),
    };
  }

  private monthToTransactionDate(month: string) {
    return `${month}-01`;
  }

  private async createWithdrawalExpenseTransaction(
    userId: string,
    amount: number,
    month: string,
    description: string,
  ) {
    const transaction = this.transactionRepository.create({
      user_id: userId,
      description,
      amount: (-Math.abs(amount)).toFixed(2),
      category: 'other',
      date: this.monthToTransactionDate(month),
    });

    return this.transactionRepository.save(transaction);
  }

  private async syncWithdrawalExpenseTransaction(
    userId: string,
    saving: WealthSaving,
    amount: number,
    month: string,
    description: string,
  ) {
    if (saving.transaction_id) {
      const transaction = await this.transactionRepository.findOne({
        where: { id: saving.transaction_id, user_id: userId },
      });

      if (transaction) {
        transaction.description = description;
        transaction.amount = (-Math.abs(amount)).toFixed(2);
        transaction.date = this.monthToTransactionDate(month);
        transaction.category = 'other';
        await this.transactionRepository.save(transaction);
        return;
      }
    }

    const transaction = await this.createWithdrawalExpenseTransaction(
      userId,
      amount,
      month,
      description,
    );
    saving.transaction_id = transaction.id;
    await this.savingRepository.save(saving);
  }

  private async deleteLinkedTransaction(userId: string, transactionId: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, user_id: userId },
    });

    if (transaction) {
      await this.transactionRepository.remove(transaction);
    }
  }
}
