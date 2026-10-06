// Minimální statický server pro náhled (preview/), s Range requesty kvůli videu.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, 'site');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.json': 'application/json' };
http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (p.endsWith(path.sep)) p = path.join(p, 'index.html');
  fs.stat(p, (e, st) => {
    if (e || !st.isFile()) { // neexistující stránka → 404.html (jako v produkci)
      if (/\.[a-z0-9]+$/i.test(p) && !p.endsWith('.html')) { res.writeHead(404); return res.end('404'); }
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return fs.createReadStream(path.join(root, '404.html')).pipe(res);
    }
    const head = { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (m) {
      const start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : st.size - 1;
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      return fs.createReadStream(p, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...head, 'Content-Length': st.size });
    fs.createReadStream(p).pipe(res);
  });
}).listen(5196, () => console.log('http://localhost:5196'));
