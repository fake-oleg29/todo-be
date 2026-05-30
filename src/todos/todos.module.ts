import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';

@Module({
  imports: [AuthModule, CategoriesModule],
  controllers: [TodosController],
  providers: [TodosService],
})
export class TodosModule {}
