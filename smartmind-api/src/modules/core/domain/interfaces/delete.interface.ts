export interface IDelete<T extends object> {
    delete(id: number): Promise<boolean>;
}