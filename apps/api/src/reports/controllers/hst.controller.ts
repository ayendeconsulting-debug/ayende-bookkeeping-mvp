import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import { ProvinceConfigService } from '../services/province-config.service';

@Controller('tax')
export class HstController {
  constructor(
    private readonly provinceConfigService: ProvinceConfigService,
  ) {}

  /**
   * GET /tax/provinces
   * Returns all 13 Canadian provinces/territories ordered by province_name.
   * Read-only — no create/update/delete exposed.
   */
  @Get('provinces')
  findAllProvinces() {
    return this.provinceConfigService.findAll();
  }

  /**
   * GET /tax/provinces/:code
   * Returns the provincial tax config for a single province code (e.g. ON, BC, AB).
   * Returns most recent effective record for that code.
   */
  @Get('provinces/:code')
  findProvinceByCode(@Param('code') code: string) {
    return this.provinceConfigService.findByCode(code);
  }
}
