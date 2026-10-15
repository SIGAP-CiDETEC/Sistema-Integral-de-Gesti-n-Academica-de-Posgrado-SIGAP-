import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  check() {
    return { status: 'ok', service: 'sigap-backend', timestamp: new Date().toISOString() };
  }
}
