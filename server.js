import http from 'node:http';
import {keyboardAction} from './keyboard.js';
import {apps} from './apps.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Remote,validHost} from './remote.js';
const port=Number(process.env.PORT||7000);
const bindHost=process.env.BIND_HOST||'127.0.0.1';
const allowedHosts=new Set(['localhost','127.0.0.1',...(process.env.ALLOWED_HOSTS||'').split(',').map(h=>h.trim()).filter(Boolean)].map(h=>`${h}:${port}`));
let config={host:'192.168.0.108',port:8002,tokens:{}};
try{config={...config,...JSON.parse(await readFile(new URL('./.data/config.json',import.meta.url),'utf8'))};}catch{}
const remote=new Remote((host,port,token)=>{config.tokens[`${host}:${port}`]=token;persist().catch(console.error);});remote.host=config.host;
async function persist(){await mkdir(new URL('./.data/',import.meta.url),{recursive:true});await writeFile(new URL('./.data/config.json',import.meta.url),JSON.stringify(config),{mode:0o600});}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(!allowedHosts.has(req.headers.host)){return json(res,403,{error:'Use a configured address to access this remote.'});}
 if(origin&&origin!==`http://${req.headers.host}`)return json(res,403,{error:'Origin rejected'});
 try{
 if(req.url==='/api/apps'&&req.method==='GET')return json(res,200,{apps});
 if(req.url==='/api/status'&&req.method==='GET')return json(res,200,{state:remote.state,message:remote.message,host:remote.host,port:config.port});
 if(req.method==='POST'&&req.url.startsWith('/api/')){
 if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'JSON required'});
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)return json(res,413,{error:'Request too large'});}const body=JSON.parse(raw||'{}');
 if(req.url==='/api/connect'){if(!validHost(body.host)||![8001,8002].includes(body.port))return json(res,400,{error:'Enter a valid private IPv4 address and TV port.'});config.host=body.host;config.port=body.port;await persist();remote.connect(body.host,body.port,config.tokens[`${body.host}:${body.port}`]);return json(res,200,{ok:true});}
 if(req.url==='/api/disconnect'){remote.disconnect();return json(res,200,{ok:true});}
 if(req.url==='/api/app'){await remote.launchApp(body.id);return json(res,200,{ok:true});}
 if(req.url==='/api/youtube'){await remote.launchYouTube();return json(res,200,{ok:true});}
 if(req.url==='/api/keyboard-letter'){const {sequence,needsSync}=keyboardAction(body.from,body.to,body.returnKey);for(const key of sequence){await remote.send(key);await new Promise(resolve=>setTimeout(resolve,180));}return json(res,200,{ok:true,needsSync});}
 if(req.url==='/api/key'){await remote.send(body.key);return json(res,200,{ok:true});}
 return json(res,404,{error:'Not found'});
 }
 const files={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/keyboard-input.js':['keyboard-input.js','text/javascript'],'/style.css':['style.css','text/css'],'/favicon.svg':['favicon.svg','image/svg+xml']};const file=files[req.url?.split('?')[0]];
 if(!file||req.method!=='GET')return json(res,404,{error:'Not found'});
 res.writeHead(200,{'Content-Type':file[1],'Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'"});res.end(await readFile(new URL(`./public/${file[0]}`,import.meta.url)));
 }catch(error){json(res,400,{error:error.message});}
});server.listen(port,bindHost,()=>console.log(`Samsung remote listening on ${bindHost}:${port}`));
