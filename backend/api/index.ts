import { app } from "../src/app";

function handler(req: any, res: any) {
  return app(req, res);
}

export default handler;
module.exports = handler;
(module.exports as any).default = handler;
