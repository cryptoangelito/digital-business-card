import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { DatabaseModule } from './database/database.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      path: '/graphql',
      playground: false,
      introspection: true,
      plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
    }),
    DatabaseModule,
    ProfileModule,
  ],
})
export class AppModule {}
