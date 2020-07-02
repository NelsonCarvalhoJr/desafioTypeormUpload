import { getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getRepository(Transaction);

    const repositories = await transactionsRepository.findOne({
      where: { id },
    });

    if (!repositories) {
      throw new AppError('Transaction not found', 404);
    }

    await transactionsRepository.delete(id);
  }
}

export default DeleteTransactionService;
