import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSettings {
  @PrimaryColumn()
  key: string;

  @Column()
  value: string;
} 