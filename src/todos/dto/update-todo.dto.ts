import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateTodoDto {
  @IsBoolean()
  @IsNotEmpty()
  completed: boolean;
}
