import { Query, Resolver, Info } from '@nestjs/graphql';
import { GraphQLResolveInfo } from 'graphql';
import { ProfileModel } from './models/profile.model';
import { ProfileService } from './profile.service';
import { requestedRelations } from './selection';

@Resolver(() => ProfileModel)
export class ProfileResolver {
  constructor(private readonly profileService: ProfileService) {}

  @Query(() => ProfileModel, { nullable: true, description: 'Публичная цифровая визитка' })
  profile(@Info() info: GraphQLResolveInfo): Promise<ProfileModel | null> {
    return this.profileService.findPublicProfile(requestedRelations(info));
  }
}
