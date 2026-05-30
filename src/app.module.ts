import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { TodosModule } from './todos/todos.module';

@Module({
  imports: [DatabaseModule, AuthModule, TodosModule],
})
export class AppModule {}
