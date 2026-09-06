import {test} from 'node:test';import assert from 'node:assert/strict';import {validHost,keyMessage,Remote} from '../remote.js';
test('accepts private IPv4 TV addresses only',()=>{for(const host of ['192.168.0.108','10.0.0.2','172.16.0.1','172.31.255.254'])assert.ok(validHost(host));for(const host of ['127.0.0.1','8.8.8.8','192.168.0.999','172.32.0.1','192.168.1.2/path',null])assert.equal(validHost(host),false);});
test('serializes Samsung remote protocol and rejects arbitrary commands',()=>{assert.deepEqual(JSON.parse(keyMessage('KEY_HOME')),{method:'ms.remote.control',params:{Cmd:'Click',DataOfCmd:'KEY_HOME',Option:'false',TypeOfRemote:'SendRemoteKey'}});assert.throws(()=>keyMessage('arbitrary'));});
test('never claims to send while disconnected',async()=>{const remote=new Remote(()=>{});await assert.rejects(remote.send('KEY_ENTER'),/Connect your TV/);await assert.rejects(remote.launchYouTube(),/Connect your TV/);});
import {WebSocketServer} from 'ws';
import {once} from 'node:events';
test('pairs, saves a token and delivers a key over a real WebSocket',async()=>{
 const server=new WebSocketServer({host:'127.0.0.1',port:8001});await once(server,'listening');let saved;
 const remote=new Remote((...args)=>saved=args);
 try{
 const accepted=once(server,'connection');remote.connect('127.0.0.1',8001);const [peer,request]=await accepted;
 assert.equal(new URL(request.url,'http://localhost').searchParams.get('name'),Buffer.from('Samsung Local Remote').toString('base64'));
 peer.send(JSON.stringify({event:'ms.channel.connect',data:{token:'test-token'}}));
 for(let i=0;i<100&&remote.state!=='connected';i++)await new Promise(r=>setTimeout(r,10));
 assert.equal(remote.state,'connected');assert.deepEqual(saved,['127.0.0.1',8001,'test-token']);
 const received=once(peer,'message');await remote.send('KEY_HOME');const [payload]=await received;assert.equal(JSON.parse(payload).params.DataOfCmd,'KEY_HOME');
 const launched=once(peer,'message');await remote.launchYouTube();const [appPayload]=await launched;const app=JSON.parse(appPayload);assert.equal(app.method,'ms.channel.emit');assert.equal(app.params.event,'ed.apps.launch');assert.equal(app.params.data.appId,'111299001912');
 }finally{remote.disconnect();for(const peer of server.clients)peer.terminate();await new Promise(r=>server.close(r));}
});

test('app launcher rejects unknown apps and uses native launch for browser',async()=>{const remote=new Remote(()=>{});let command;remote.sendPayload=async raw=>command=JSON.parse(raw);await assert.rejects(remote.launchApp('unknown'),/Unknown TV app/);await remote.launchApp('org.tizen.browser');assert.equal(command.params.data.action_type,'NATIVE_LAUNCH');assert.equal(command.params.data.appId,'org.tizen.browser');});

import {route} from '../keyboard.js';
test('YouTube layout routes letters and rejects unknown targets',()=>{assert.deepEqual(route('A','I'),['KEY_DOWN','KEY_RIGHT','KEY_ENTER']);assert.deepEqual(route('I','A'),['KEY_UP','KEY_LEFT','KEY_ENTER']);assert.deepEqual(route('A','A'),['KEY_ENTER']);assert.throws(()=>route('A',' '));assert.deepEqual(route('U',"'"),['KEY_DOWN','KEY_ENTER']);});

test('special controls use confirmed edge and bottom-row anchors',()=>{assert.deepEqual(route('V','Space'),['KEY_DOWN','KEY_ENTER']);assert.deepEqual(route('V','Clear'),['KEY_DOWN','KEY_RIGHT','KEY_ENTER']);assert.deepEqual(route('V','Search'),['KEY_DOWN','KEY_RIGHT','KEY_RIGHT','KEY_ENTER']);for(const [from,to] of [['G','Delete'],['N','&123'],['U','Globe']])assert.deepEqual(route(from,to),['KEY_RIGHT','KEY_ENTER']);assert.deepEqual(route('Space','V','V'),['KEY_UP','KEY_ENTER']);});

test('selected editing controls repeat and navigate back to letters',()=>{for(const control of ['Delete','Space','Clear'])assert.deepEqual(route(control,control),['KEY_ENTER']);assert.deepEqual(route('Delete','G'),['KEY_LEFT','KEY_ENTER']);assert.deepEqual(route('Clear','V','V'),['KEY_UP','KEY_ENTER']);assert.throws(()=>route('invalid','invalid'));});

test('all seven bottom letters reach Space with one Down',()=>{for(const letter of "VWXYZ-'"){assert.deepEqual(route(letter,'Space'),['KEY_DOWN','KEY_ENTER']);assert.deepEqual(route(letter,'Search'),['KEY_DOWN','KEY_RIGHT','KEY_RIGHT','KEY_ENTER']);}assert.deepEqual(route('G','Space'),['KEY_DOWN','KEY_DOWN','KEY_DOWN','KEY_DOWN','KEY_ENTER']);assert.deepEqual(route('Clear','Search'),['KEY_RIGHT','KEY_ENTER']);assert.deepEqual(route('Search','Space'),['KEY_LEFT','KEY_LEFT','KEY_ENTER']);});

test('bottom row returns through its remembered column',()=>{assert.deepEqual(route('Space','Z','Z'),['KEY_UP','KEY_ENTER']);assert.deepEqual(route('Clear','Y','Z'),['KEY_UP','KEY_LEFT','KEY_ENTER']);assert.throws(()=>route('Space','A'),/Sync a letter/);});

test('every bottom control goes directly Up to the remembered letter',()=>{for(const control of ['Space','Clear','Search'])for(const letter of "VWXYZ-'")assert.deepEqual(route(control,letter,letter),['KEY_UP','KEY_ENTER']);});

import {keyboardAction} from '../keyboard.js';
test('unknown bottom-row return moves Up without selecting, then asks for sync',()=>{for(const from of ['Space','Clear','Search']){assert.deepEqual(keyboardAction(from,'A'),{sequence:['KEY_UP'],needsSync:true});assert.deepEqual(keyboardAction(from,from),{sequence:['KEY_ENTER'],needsSync:false});}assert.deepEqual(keyboardAction('Space','Z','Z'),{sequence:['KEY_UP','KEY_ENTER'],needsSync:false});assert.throws(()=>keyboardAction('Space','invalid'));});

import {keyboardTarget} from '../public/keyboard-input.js';
test('physical keyboard maps text keys without capturing shortcuts or composition',()=>{for(const [key,target] of [['a','A'],['Z','Z'],[' ','Space'],['Backspace','Delete'],['Delete','Delete'],['Enter','Search'],['-', '-'],["'", "'"]])assert.equal(keyboardTarget({key}),target);for(const event of [{key:'a',metaKey:true},{key:'a',ctrlKey:true},{key:'a',altKey:true},{key:'a',isComposing:true},{key:'1'},{key:'ArrowUp'}])assert.equal(keyboardTarget(event),null);});
