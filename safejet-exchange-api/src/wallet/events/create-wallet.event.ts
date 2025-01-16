export class CreateWalletEvent {
  constructor(
    public readonly userId: string,
    public readonly blockchains: string[],
    public readonly networks: string[],
  ) {}
} 