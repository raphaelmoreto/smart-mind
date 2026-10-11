import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsPositive } from 'class-validator';

export class DispositivoInputDto {
    @ApiProperty()
    @IsString()
    nome: string;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    fk_tipoDispositivo: number;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    fk_casa: number;
}

export class DispositivoOutputDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    nome: string;

    @ApiProperty()
    tipo: string;

    @ApiProperty()
    casa: string;

    @ApiProperty()
    dt_cadastro: Date;

    @ApiProperty({ nullable: true })
    dt_ultima_conexao: Date | null;

    @ApiProperty()
    status: string;
}
