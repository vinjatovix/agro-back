import dotenv from 'dotenv';
import { AgroBackApp } from './apps/backend/AgroBackApp.js';

dotenv.config();

try {
  new AgroBackApp().start();
} catch (err) {
  console.error('Error starting the application:', err);
  process.exit(1);
}

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
  process.exit(1);
});
