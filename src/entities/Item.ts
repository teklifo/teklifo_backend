import {
  Entity,
  BaseEntity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from './Company';

@Entity('items')
export class Item extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({
    unique: true,
  })
  external_id: string;

  @Index()
  @Column()
  name: string;

  @Index()
  @Column({
    nullable: true,
  })
  number: string;

  @Column({
    default: false,
  })
  is_service: boolean;

  @Column({
    default: 0,
  })
  sell_price: number;

  @Column({
    default: 0,
  })
  purchase_price: number;

  @Column({
    default: '',
  })
  picture_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Company, (company) => company.items)
  @JoinColumn({
    name: 'company_id',
  })
  company: Company;
}
