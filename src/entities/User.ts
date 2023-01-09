import {
  Entity,
  BaseEntity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum CompanyType {
  physical = "physical",
  entity = "entity",
}

@Entity("users")
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({
    nullable: false,
  })
  name: string;

  @Column({
    nullable: false,
    unique: true,
  })
  email: string;

  @Column({
    nullable: false,
  })
  password: string;

  @Column({
    nullable: false,
    type: "enum",
    enum: CompanyType,
  })
  type: string;

  @Column({
    nullable: false,
    default: false,
  })
  is_active: boolean;

  @Column({
    nullable: true,
    unique: true,
  })
  activation_token: string;

  @Column({
    nullable: true,
  })
  activation_token_expires: Date;

  @Column({
    nullable: true,
    unique: true,
  })
  reset_password_token: string;

  @Column({
    nullable: true,
  })
  reset_password_token_expires: Date;

  @Column({
    nullable: true,
  })
  avatar_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
