import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        ...(process.env.MODE?.toLowerCase() === 'local'
          ? {
              url:
                process.env.LOCAL_DATABASE_URL ??
                'postgres://postgres:Qwerty%40123@localhost:5432/defiBot',
              ssl: false,
            }
          : {
              host: process.env.DATABASE_HOST ?? 'localhost',
              port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
              username: process.env.DATABASE_USER ?? 'postgres',
              password: process.env.DATABASE_PASSWORD ?? 'postgres',
              database: process.env.DATABASE_NAME ?? 'astra',
              ssl: process.env.DATABASE_SSL !== 'false',
            }),
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
