export interface ITarifaRepository {
    buscarTarifaAtual(casaId: string): Promise<number>;
}