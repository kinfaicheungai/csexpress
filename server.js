import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root=process.cwd(), types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
createServer(async(req,res)=>{try{const pathname=req.url.split('?')[0],path=normalize(pathname==='/'?'index.html':pathname.slice(1)); if(path.startsWith('..')) throw Error(); const data=await readFile(join(root,path)); res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'}); res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(4173,()=>console.log('Rail Outlaws v0.8.4 mobile PWA: http://localhost:4173'));
