import { getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getRepository(Transaction);

    const findRepository = await transactionsRepository.findOne({
      where: { id },
    });

    if (!findRepository) {
      throw new AppError("Transactions doesn't exists.", 404);
    }

    await transactionsRepository.delete(id);
  }
}

export default DeleteTransactionService;
