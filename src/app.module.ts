import { Module } from '@nestjs/common';
import { WordsModule } from './Modules/words/words.module';

@Module({
  imports: [WordsModule],
})
export class AppModule {}
