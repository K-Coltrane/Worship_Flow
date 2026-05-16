import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { AddServiceItemDto, ReorderServiceItemsDto } from './service-flow.dto';
import { ServiceFlowService } from './service-flow.service';

@Controller('service-flow')
export class ServiceFlowController {
  constructor(private readonly serviceFlowService: ServiceFlowService) {}

  @Get()
  getFlow() {
    return this.serviceFlowService.getFlow();
  }

  @Post('items')
  addItem(@Body() input: AddServiceItemDto) {
    return this.serviceFlowService.addItem(input);
  }

  @Put('items/reorder')
  reorderItems(@Body() input: ReorderServiceItemsDto) {
    return this.serviceFlowService.reorderItems(input.itemIds);
  }

  @Post('items/:id/active')
  setActiveItem(@Param('id') id: string) {
    return this.serviceFlowService.setActiveItem(id);
  }

  @Delete('items/:id')
  removeItem(@Param('id') id: string) {
    this.serviceFlowService.removeItem(id);
    return { deleted: true };
  }
}
