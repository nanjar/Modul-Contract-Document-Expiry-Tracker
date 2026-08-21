import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list() {
    return this.documents.list().map((document) => ({
      ...document,
      status: this.documents.status(document),
    }));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const document = this.documents.findOne(id);
    return { ...document, status: this.documents.status(document) };
  }

  @Post()
  create(@Body() body: { title: string; documentType: string; expiryDate?: string | null }) {
    return this.documents.create({
      title: body.title,
      documentType: body.documentType,
      expiryDate: body.expiryDate ?? null,
    });
  }
}
