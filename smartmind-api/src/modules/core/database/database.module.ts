import { Module } from "@nestjs/common";

//"ConfigService" É UM SERVIÇO QUE PERMITE LER CONFIGURAÇÕES
import { ConfigModule, ConfigService } from "@nestjs/config";

//"Pool" É UM OBJETO QUE GERENCIA UM "pool" DE CONEXÕES COM O BANCO
import { Pool } from "pg";

import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
    imports: [
        ConfigModule,

        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],

            inject: [ConfigService],

            useFactory: (configService: ConfigService) => ({
                type: "postgres",

                host: configService.getOrThrow<string>("DB_HOST"),
                port: Number(
                    configService.getOrThrow<string>("DB_PORT")
                ),

                username: configService.getOrThrow<string>("DB_USER"),
                password: configService.getOrThrow<string>("DB_PASSWORD"),
                database: configService.getOrThrow<string>("DB_NAME"),

                autoLoadEntities: true,
                synchronize: false,
            }),
        }),
    ],
})
export class DatabaseModule { }
