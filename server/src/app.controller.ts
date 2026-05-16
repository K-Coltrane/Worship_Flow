import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      mode: 'offline-first',
      timestamp: new Date().toISOString(),
    };
  }
}
