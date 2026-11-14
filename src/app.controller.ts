import { Controller, Get, Header, HttpCode } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** Liveness probe — no DB / Neon dependency. */
  @Get('health')
  @HttpCode(200)
  @Header('Content-Type', 'text/plain')
  getHealth(): string {
    return 'OK';
  }
}
