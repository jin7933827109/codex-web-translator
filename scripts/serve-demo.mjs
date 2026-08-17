import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const articlePath = join(root, "demo", "article.html");
const port = Number(process.env.CODEX_TRANSLATOR_DEMO_PORT || 4173);

const server = createServer((request, response) => {
  if (request.url !== "/" && request.url !== "/article.html") {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "text/html; charset=utf-8"
  });
  createReadStream(articlePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Demo: http://127.0.0.1:${port}/\n`);
});
