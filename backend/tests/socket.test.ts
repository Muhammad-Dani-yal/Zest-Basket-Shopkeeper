import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import {io as connect, type Socket} from '../../frontend/node_modules/socket.io-client/build/esm/index.js';
import {createApp} from '../src/app.js';
import {Repository} from '../src/store.js';
function once(socket:Socket,event:string){return new Promise<any>((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Timed out waiting for '+event)),5000);socket.once(event,(data:any)=>{clearTimeout(t);resolve(data)});});}
test('authenticated realtime room receives new orders and logout disconnects its session',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zest-socket-'));const server=await createApp(new Repository(path.join(dir,'store.json')));let socket:Socket|undefined;try{await new Promise<void>(resolve=>server.http.listen(0,'127.0.0.1',resolve));const port=(server.http.address() as any).port;const agent=request.agent(server.app);const login=await agent.post('/api/auth/demo').expect(200);const cookie=(login.headers['set-cookie'] as unknown as string[])[0].split(';')[0];socket=connect('http://127.0.0.1:'+port,{transports:['websocket'],extraHeaders:{Cookie:cookie},autoConnect:false,reconnection:false});const connected=once(socket,'connect');socket.connect();await connected;const received=once(socket,'order:new');const order=await agent.post('/api/demo/orders').expect(201);const event=await received;assert.equal(event.id,order.body.id);const disconnected=once(socket,'disconnect');await agent.post('/api/auth/logout').expect(200);await disconnected;assert.equal(socket.connected,false);}finally{socket?.disconnect();await new Promise<void>(resolve=>server.io.close(()=>resolve()));fs.rmSync(dir,{recursive:true,force:true});}});
