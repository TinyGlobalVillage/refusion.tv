require('dotenv').config();
const http = require('http');
const { exec } = require('child_process');
const crypto = require('crypto');

const SECRET = process.env.GITHUB_WEBHOOK_SECRET;
console.log('Webhook Secret:', SECRET);
const port = 7777;

if (!SECRET) {
  console.error(
    '❌ GITHUB_WEBHOOK_SECRET is not set. Exiting.'
  );
  process.exit(1);
}

function verifySignature(req, body) {
  const signature = req.headers['x-hub-signature-256'];
  const hmac = crypto.createHmac('sha256', SECRET);
  const digest =
    'sha256=' + hmac.update(body).digest('hex');
  return signature === digest;
}

http
  .createServer((req, res) => {
    let body = '';

    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (req.method === 'POST' && req.url === '/webhook') {
        if (!verifySignature(req, body)) {
          res.writeHead(401);
          return res.end('Invalid signature\n');
        }

        res.writeHead(200);
        res.end('Deploy triggered\n');
        console.log('✅ Webhook verified, deploying...');

        exec(
          `
        cd /home/refusionist/refusion-core/client/refusionist.com &&
        git pull &&
        npm install &&
        npm run build &&
        pm2 restart refusionist
      `,
          (err, stdout, stderr) => {
            if (err) console.error(`❌ Error: ${err}`);
            if (stdout) console.log(stdout);
            if (stderr) console.error(stderr);
          }
        );
      } else {
        res.writeHead(404);
        res.end();
      }
    });
  })
  .listen(port, () => {
    console.log(
      `🚀 Webhook server listening on port ${port}`
    );
  });
