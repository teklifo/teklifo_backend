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
} from "typeorm";
import { Company } from "./Company";

@Entity("items")
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
    default: "",
  })
  number: string;

  @Column({
    default: false,
  })
  is_service: boolean;

  @Column({
    default: true,
  })
  is_available: boolean;

  @Column({
    default: 0,
  })
  sell_price: number;

  @Column({
    default: 0,
  })
  purchase_price: number;

  @Column("text", {
    default: [],
    array: true,
  })
  images: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Company, (company) => company.items, { nullable: false })
  @JoinColumn({
    name: "company",
  })
  company: Company;
}
