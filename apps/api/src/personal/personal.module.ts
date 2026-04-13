import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalController } from './personal.controller';
import { PersonalService } from './personal.service';
import { BudgetCategory } from '../entities/budget-category.entity';
import { SavingsGoal } from '../entities/savings-goal.entity';
import { PersonalRule } from '../entities/personal-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BudgetCategory, SavingsGoal, PersonalRule])],
  controllers: [PersonalController],
  providers: [PersonalService],
  exports: [PersonalService],
})
export class PersonalModule {}
