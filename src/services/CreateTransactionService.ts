import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    if (type === 'outcome') {
      const { total } = await transactionsRepository.getBalance();

      if (value > total) {
        throw new AppError(
          'Outcome value cannot be greater than total balance',
          400,
        );
      }
    } else if (type !== 'income') {
      throw new AppError('Invalid type', 400);
    }

    // Atribuir categoria existente no banco de dados ou criar uma nova
    const categoryData =
      (await categoriesRepository.findOne({
        where: { title: category },
      })) ||
      categoriesRepository.create({
        title: category,
      });

    if (!categoryData.id) {
      await categoriesRepository.save(categoryData);
    }

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category: categoryData,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
