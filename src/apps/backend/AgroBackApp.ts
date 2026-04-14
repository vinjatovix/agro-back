import { Server } from './server.js';

export class AgroBackApp {
  server?: Server;
  host?: string;

  async start() {
    const host: string = process.env.HOST || 'http://localhost';
    const port: string = process.env.PORT || '0';

    this.server = new Server(host, port);
    await this.server.listen();
    const address = this.server.getHTTPServer()?.address();
    const portNumber = typeof address === 'object' && address !== null ? address.port : port;
    this.host = `${host}:${portNumber}`;
    console.log(`Server running at ${this.host}`);
  }

  async stop() {
    if (this.server) {
      await this.server.stop();
      console.log('Server stopped');
    }
  }

  get httpServer() {
    return this.server?.getHTTPServer();
  }
}
