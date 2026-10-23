import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Skill')
export class SkillModel {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  category!: string | null;
}
