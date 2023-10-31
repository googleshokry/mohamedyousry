import { Module } from '@nestjs/common';
import { WordsController } from './words.controller';

@Module({
  imports:[],
  controllers: [WordsController],
  providers: []
})
export class WordsModule {}
