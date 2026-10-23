import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Experience')
export class ExperienceModel {
  @Field(() => Int)
  id!: number;

  @Field()
  company!: string;

  @Field()
  position!: string;

  @Field()
  period!: string;

  @Field(() => [String])
  achievements!: string[];
}
