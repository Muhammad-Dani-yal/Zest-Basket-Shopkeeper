import 'dotenv/config';
import { Repository } from './store.js';
const repo = new Repository();
await repo.init();
console.log(
  'Seed initialized (existing records preserved). Demo phone: 03001234567; password: ZestDemo123',
);
process.exit(0);
