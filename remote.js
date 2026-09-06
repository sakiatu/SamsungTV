import WebSocket from 'ws';
import {apps} from './apps.js';
export const keys = new Set(['KEY_POWER','KEY_UP','KEY_DOWN','KEY_LEFT','KEY_RIGHT','KEY_ENTER','KEY_RETURN','KEY_HOME','KEY_MENU','KEY_SOURCE','KEY_VOLUP','KEY_VOLDOWN','KEY_MUTE','KEY_CHUP','KEY_CHDOWN','KEY_PLAY','KEY_PAUSE','KEY_STOP','KEY_REWIND','KEY_FF','KEY_GUIDE','KEY_INFO','KEY_EXIT',...Array.from({length:10},(_,i)=>`KEY_${i}`)]);
export function validHost(host) {
 if(typeof host !== 'string') return false;
 const p=host.split('.');
 return p.length===4 && p.every(x=>/^\d{1,3}$/.test(x)&&Number(x)<=255) && (p[0]==='10'||(p[0]==='192'&&p[1]==='168')||(p[0]==='172'&&Number(p[1])>=16&&Number(p[1])<=31));
}
export function keyMessage(key) { if(!keys.has(key)) throw new Error('Unsupported remote key'); return JSON.stringify({method:'ms.remote.control',params:{Cmd:'Click',DataOfCmd:key,Option:'false',TypeOfRemote:'SendRemoteKey'}}); }
export class Remote {
 constructor(save){this.save=save;this.socket=null;this.state='disconnected';this.message='Connect your TV to get started.';this.host='192.168.0.108';}
 connect(host,port,token){
  this.disconnect();this.host=host;this.state='connecting';this.message='Check your TV and select Allow when prompted.';
  const url=new URL(`${port===8002?'wss':'ws'}://${host}:${port}/api/v2/channels/samsung.remote.control`);
  url.searchParams.set('name',Buffer.from('Samsung Local Remote').toString('base64'));if(token)url.searchParams.set('token',token);
  const ws=new WebSocket(url,{rejectUnauthorized:false,handshakeTimeout:10000});this.socket=ws;
  const timer=setTimeout(()=>{if(this.socket===ws&&this.state==='connecting'){this.message='Pairing timed out. Turn on the TV, then reconnect and select Allow.';ws.terminate();}},45000);
  ws.on('message',raw=>{if(this.socket!==ws)return;try{const data=JSON.parse(raw);if(data.event==='ms.channel.connect'){clearTimeout(timer);this.state='connected';this.message='Ready for your next watch.';if(data.data?.token)this.save(host,port,String(data.data.token));}else if(data.event==='ms.channel.unauthorized'){this.message='Pairing declined. Reconnect and select Allow on the TV.';ws.close();}}catch{}});
  ws.on('error',()=>{if(this.socket===ws)this.message='Cannot reach the TV. Check its IP, power and Wi-Fi, then try again.';});
  ws.on('close',()=>{clearTimeout(timer);if(this.socket===ws){if(this.state==='connected')this.message='TV connection closed. Reconnect to continue.';this.state='disconnected';}});
 }
 disconnect(){const ws=this.socket;this.socket=null;if(ws)ws.terminate();this.state='disconnected';this.message='Connect your TV to get started.';}
 async launchYouTube(){await this.launchApp('111299001912');}
 async launchApp(id){const app=apps.find(app=>app.id===id);if(!app)throw new Error('Unknown TV app.');await this.sendPayload(JSON.stringify({method:'ms.channel.emit',params:{event:'ed.apps.launch',to:'host',data:{appId:app.id,action_type:app.type===2?'DEEP_LINK':'NATIVE_LAUNCH',metaTag:''}}}));}
 async send(key){await this.sendPayload(keyMessage(key));}
 async sendPayload(payload){if(this.state!=='connected'||this.socket?.readyState!==WebSocket.OPEN)throw new Error('Connect your TV before using the remote.');await new Promise((resolve,reject)=>this.socket.send(payload,e=>e?reject(e):resolve()));}
}
