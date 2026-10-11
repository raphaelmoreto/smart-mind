import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../core/domain/entities/base.entity.js';

@Entity('Dispositivo')
export class DispositivoEntity extends BaseEntity {
    @Column()
    private nome: string;

    @Column()
    private fk_tipoDispositivo: number;

    @Column()
    private fk_casa: number;

    constructor() {
        super();
    }

    public static instanciarDispositivo(
        nome: string,
        fk_tipoDispositivo: number,
        fk_casa: number
    ): DispositivoEntity {
        const dispositivo = new DispositivoEntity();
        dispositivo.setNome(nome);
        dispositivo.setFK_TipoDispositivo(fk_tipoDispositivo);
        dispositivo.setFK_Casa(fk_casa);
        return dispositivo;
    }

    public setNome(nome: string): void {
        if (!nome?.trim()) {
            this.addNotification('nome', 'nome do dispositivo não pode ser nulo/vazio');
            return;
        }
        this.nome = nome.trim().toUpperCase();
    }

    public setFK_TipoDispositivo(id: number): void {
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            this.addNotification('fk_tipoDispositivo', 'tipo de dispositivo inválido');
            return;
        }
        this.fk_tipoDispositivo = Number(id);
    }

    public setFK_Casa(id: number): void {
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            this.addNotification('fk_casa', 'casa do dispositivo inválida');
            return;
        }
        this.fk_casa = Number(id);
    }
    
    public getNome(): string { return this.nome; }
    public getFK_TipoDispositivo(): number { return this.fk_tipoDispositivo; }
    public getFK_Casa(): number { return this.fk_casa; }
}
