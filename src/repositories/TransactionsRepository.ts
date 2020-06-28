import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const incomeValues = transactions
      .filter(transaction => transaction.type === 'income')
      .map(transaction => transaction.value);
    const income =
      incomeValues.length > 0
        ? incomeValues.reduce((value, increment) => value + increment)
        : 0;

    const outcomeValues = transactions
      .filter(transaction => transaction.type === 'outcome')
      .map(transaction => transaction.value);
    const outcome =
      outcomeValues.length > 0
        ? outcomeValues.reduce((value, increment) => value + increment)
        : 0;

    const total = income - outcome;

    return {
      income,
      outcome,
      total,
    };
  }
}

export default TransactionsRepository;
