import {
  Entity,
  BaseEntity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToMany,
} from "typeorm";
import { Item } from "./Item";
import { User } from "./User";

export enum CompanyType {
  physical = "physical",
  entity = "entity",
}

@Entity("companies")
export class Company extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  name: string;

  @Index()
  @Column({
    unique: true,
  })
  tin: string;

  @Column({
    type: "enum",
    enum: CompanyType,
  })
  type: string;

  @Column({
    default: "",
  })
  logo_url: string;

  @Column({
    default: "",
  })
  description: string;

  @Column({
    type: "simple-json",
    default: "{}",
  })
  contacts: {
    phone: string[];
    email: string[];
    address: string[];
    website: string[];
  };

  @Column({
    type: "simple-json",
    default: "{}",
  })
  socials: {
    facebook: string;
    instragram: string;
    youtube: string;
  };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Item, (item) => item.company)
  items: Item[];

  @ManyToMany(() => User, (user) => user.companies)
  users: User[];
}
