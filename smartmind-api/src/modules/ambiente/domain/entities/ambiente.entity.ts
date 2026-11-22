import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../core/domain/entities/base.entity.js';

@Entity('Ambiente')
export class AmbienteEntity extends BaseEntity {
    @Column()
    private nome: string;

    @Column({ type: 'varchar', nullable: true })
    private descricao: string | null;

    @Column()
    private fk_casa: number;

    constructor() {
        super();
    }

    public static instanciarAmbiente(nome: string, descricao: string | undefined, fk_casa: number): AmbienteEntity {
        const ambiente = new AmbienteEntity();
        ambiente.setNome(nome);
        ambiente.setDescricao(descricao);
        ambiente.setFK_Casa(fk_casa);
        return ambiente;
    }

    public setNome(nome: string): void {
        if (!nome?.trim()) {
            this.addNotification('nome', 'nome do ambiente não pode ser nulo/vazio');
            return;
        }
        this.nome = nome.trim().toUpperCase();
    }

    public setDescricao(descricao?: string | null): void {
        const valor = descricao?.trim();
        this.descricao = valor ? valor : null;
    }

    public setFK_Casa(id: number): void {
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            this.addNotification('fk_casa', 'casa do ambiente inválida');
            return;
        }
        this.fk_casa = Number(id);
    }

    public getNome(): string { return this.nome; }
    public getDescricao(): string | null { return this.descricao; }
    public getFK_Casa(): number { return this.fk_casa; }
}