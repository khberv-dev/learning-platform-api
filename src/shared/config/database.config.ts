import 'dotenv/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from '@/shared/config/snake-naming.strategy';

export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: true,
  namingStrategy: new SnakeNamingStrategy(),
  entities: ['dist/**/*.entity.js'],
});
