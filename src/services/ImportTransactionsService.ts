import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';

import { getRepository } from 'typeorm';

import uploadConfig from '../config/upload';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  filename: string;
}

interface TransactionData {
  title: string;
  type: 'income' | 'outcome';
  value: number;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    const csvFilePath = path.join(uploadConfig.directory, filename);

    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);
    const categories: string[] = [];
    const transactionsData: TransactionData[] = [];

    parseCSV.on('data', line => {
      if (line.length === 4 && !isNaN(Number(line[2]))) {
        transactionsData.push({
          title: line[0],
          type: line[1],
          value: Number(line[2]),
        });
        categories.push(line[3]);
      }
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const transactionsRepository = getRepository(Transaction);
    const categoriesRepository = getRepository(Category);

    const findCategories = categories.map(category =>
      categoriesRepository.findOne({
        where: { title: category },
      }),
    );

    const categoriesFindData = await Promise.all(findCategories);

    const categoriesToSave = categoriesFindData
      .map(
        (category, idx) =>
          category || categoriesRepository.create({ title: categories[idx] }),
      )
      .map(category => categoriesRepository.save(category));

    const categoriesAllData = await Promise.all(categoriesToSave);

    const transactionsToSave = transactionsData
      .map((transaction, idx) =>
        transactionsRepository.create({
          ...transaction,
          category: categoriesAllData[idx],
        }),
      )
      .map(transaction => transactionsRepository.save(transaction));

    const transactions = await Promise.all(transactionsToSave);

    return transactions;
  }
}

export default ImportTransactionsService;
