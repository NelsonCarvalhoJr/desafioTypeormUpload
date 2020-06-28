import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  // Falta regra OUTCOME <= Balance
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    if (type === 'outcome') {
      const balance = await transactionsRepository.getBalance();

      if (value > balance.total) {
        throw new AppError('Invalid value.', 400);
      }
    } else if (type !== 'income') {
      throw new AppError('Invalid type.', 400);
    }

    const categoriesRepository = getRepository(Category);

    let categoryData = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!categoryData) {
      categoryData = categoriesRepository.create({
        title: category,
      });

      await categoriesRepository.save(categoryData);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryData.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
