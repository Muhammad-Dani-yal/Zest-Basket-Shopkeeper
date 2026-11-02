import { createApp } from './app.js';
const { http } = await createApp();
http.listen(Number(process.env.PORT || 4100), '127.0.0.1', () =>
  console.log('ZestBasket API: http://127.0.0.1:' + (process.env.PORT || 4100)),
);
