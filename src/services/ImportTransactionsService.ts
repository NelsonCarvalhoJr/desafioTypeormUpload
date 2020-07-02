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

    const titles: string[] = [];
    const types: 'income' | 'outcome'[] = [];
    const values: number[] = [];
    const categories: string[] = [];

    parseCSV.on('data', line => {
      if (line.length === 4 && !isNaN(Number(line[2]))) {
        titles.push(line[0]);
        types.push(line[1]);
        values.push(Number(line[2]));
        categories.push(line[3]);
      }
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const transactionsRepository = getRepository(Transaction);
    const categoriesRepository = getRepository(Category);

    const transactions = [];

    for (let idx = 0; idx < titles.length; idx += 1) {
      const categoryData =
        (await categoriesRepository.findOne({
          where: { title: categories[idx] },
        })) ||
        categoriesRepository.create({
          title: categories[idx],
        });

      if (!categoryData.id) {
        const test = await categoriesRepository.save(categoryData);
      }

      const transaction = transactionsRepository.create({
        title: titles[idx],
        type: types[idx],
        value: values[idx],
        category: categoryData,
      });

      await transactionsRepository.save(transaction);

      transactions.push(transaction);
    }

    return transactions;
  }
}

export default ImportTransactionsService;
