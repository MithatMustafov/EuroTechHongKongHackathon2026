import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello, EuroTech Hong Kong Hackathon 2026';
  }
}
