import { Column, Entity, type ValueTransformer } from 'typeorm';
import { BaseEntity } from '../../../core/domain/entities/base.entity.js';

const decimalTransformer: ValueTransformer = {
    to: (valor?: number | null) => valor,
    from: (valor?: string | null) => (valor === null || valor === undefined ? null : Number(valor)),
};

@Entity('Dispositivo')
export class DispositivoEntity extends BaseEntity {
    @Column()
    private nome: string;

    @Column()
    private fk_tipoDispositivo: number;

    @Column()
    private fk_casa: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer })
    private potencia_watts: number;

    @Column({ type: 'decimal', precision: 4, scale: 2, transformer: decimalTransformer })
    private horas_uso_dia: number;

    @Column({ type: 'boolean', default: false })
    private ligado: boolean;

    @Column({ type: 'text', nullable: true })
    private foto_url: string | null;

    @Column({ type: 'int', nullable: true })
    private fk_ambiente: number | null;

    constructor() {
        super();
    }

    public static instanciarDispositivo(
        nome: string,
        fk_tipoDispositivo: number,
        fk_casa: number,
        potencia_watts: number,
        horas_uso_dia: number,
        ligado: boolean = false,
        foto_url?: string | null,
        fk_ambiente?: number | null
    ): DispositivoEntity {
        const dispositivo = new DispositivoEntity();
        dispositivo.setNome(nome);
        dispositivo.setFK_TipoDispositivo(fk_tipoDispositivo);
        dispositivo.setFK_Casa(fk_casa);
        dispositivo.setPotenciaWatts(potencia_watts);
        dispositivo.setHorasUsoDia(horas_uso_dia);
        dispositivo.setLigado(ligado);
        dispositivo.setFotoUrl(foto_url);
        dispositivo.setFK_Ambiente(fk_ambiente);
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

    public setPotenciaWatts(potencia: number): void {
        const valor = Number(potencia);
        if (!Number.isFinite(valor) || valor <= 0) {
            this.addNotification('potencia_watts', 'potência deve ser maior que zero');
            return;
        }
        this.potencia_watts = valor;
    }

    public setHorasUsoDia(horas: number): void {
        const valor = Number(horas ?? 0);
        if (!Number.isFinite(valor) || valor < 0 || valor > 24) {
            this.addNotification('horas_uso_dia', 'horas de uso devem estar entre 0 e 24');
            return;
        }
        this.horas_uso_dia = valor;
    }

    // AMBIENTE É OPCIONAL: null/undefined = "SEM AMBIENTE"
    public setFK_Ambiente(id?: number | null): void {
        if (id === null || id === undefined) {
            this.fk_ambiente = null;
            return;
        }
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            this.addNotification('fk_ambiente', 'ambiente do dispositivo inválido');
            return;
        }
        this.fk_ambiente = Number(id);
    }

    public setLigado(ligado: boolean): void {
        this.ligado = Boolean(ligado);
    }

    public setFotoUrl(foto?: string | null): void {
        const valor = foto?.trim();
        this.foto_url = valor ? valor : null;
    }

    public getNome(): string { return this.nome; }
    public getFK_TipoDispositivo(): number { return this.fk_tipoDispositivo; }
    public getFK_Casa(): number { return this.fk_casa; }
    public getFK_Ambiente(): number | null { return this.fk_ambiente; }
    public getPotenciaWatts(): number { return this.potencia_watts; }
    public getHorasUsoDia(): number { return this.horas_uso_dia; }
    public getLigado(): boolean { return this.ligado; }
    public getFotoUrl(): string | null { return this.foto_url; }
}