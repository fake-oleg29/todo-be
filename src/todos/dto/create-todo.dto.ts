import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  text: string;

  @IsNumber()
  @IsNotEmpty()
  categoryId: number;
}
