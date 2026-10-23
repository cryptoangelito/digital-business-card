import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ExperienceModel } from './experience.model';
import { ProjectModel } from './project.model';
import { SkillModel } from './skill.model';

@ObjectType('Profile')
export class ProfileModel {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  description!: string;

  @Field(() => String, { nullable: true })
  githubUrl!: string | null;

  @Field(() => String, { nullable: true })
  linkedinUrl!: string | null;

  @Field(() => String, { nullable: true })
  websiteUrl!: string | null;

  @Field(() => [SkillModel])
  skills!: SkillModel[];

  @Field(() => [ExperienceModel])
  experience!: ExperienceModel[];

  @Field(() => [ProjectModel])
  projects!: ProjectModel[];
}
