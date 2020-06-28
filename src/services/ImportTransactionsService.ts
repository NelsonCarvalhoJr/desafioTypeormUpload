import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';

import { getCustomRepository, getRepository } from 'typeorm';

import uploadConfig from '../config/upload';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

import AppError from '../errors/AppError';
import Category from '../models/Category';

interface Request {
  filename: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    // Leitura do arquivo
    const csvFilePath = path.join(uploadConfig.directory, filename);

    const readCsvStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCsvStream.pipe(parseStream);

    const lines: [string, string, number, string][] = [];

    parseCSV.on('data', line => {
      lines.push(line);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    // Cadastro no banco de dados
    const transactions = [];

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    for (const line of lines) {
      if (line[1] === 'outcome') {
        const balance = await transactionsRepository.getBalance();

        if (line[2] > balance.total) {
          throw new AppError('Invalid value.', 400);
        }
      } else if (line[1] !== 'income') {
        throw new AppError('Invalid type.', 400);
      }

      const categoriesRepository = getRepository(Category);

      let categoryData = await categoriesRepository.findOne({
        where: { title: line[3] },
      });

      if (!categoryData) {
        categoryData = categoriesRepository.create({
          title: line[3],
        });

        await categoriesRepository.save(categoryData);
      }

      const transaction = transactionsRepository.create({
        title: line[0],
        type: line[1],
        value: line[2],
        category_id: categoryData.id,
      });

      await transactionsRepository.save(transaction);

      transactions.push(transaction);
    }

    return transactions;
  }
}

export default ImportTransactionsService;
