import { type ReactNode } from "react";
import Styles from "./form.module.scss";
import {
  type UseFormRegister,
  type Path,
  type FieldValues,
} from "react-hook-form";

export function FormRow({
  children,
  marginTop,
  horizontal,
}: {
  children: ReactNode;
  marginTop?: "large" | "small";
  horizontal?: boolean;
}) {
  return (
    <div
      className={`${Styles.formRow} ${
        marginTop === "large"
          ? Styles.marginTopLg
          : marginTop === "small"
          ? Styles.marginTopSm
          : ""
      } ${horizontal ? Styles.horizontal : ""}`}
    >
      {children}
    </div>
  );
}

export function Label({
  id,
  text,
  children,
}: {
  id: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <label className={Styles.label} htmlFor={id}>
      {text}
      {children}
    </label>
  );
}

export function Input<T extends FieldValues = FieldValues>({
  id,
  name,
  required,
  register,
  type,
  value,
}: {
  id: string;
  name: Path<T>;
  required?: boolean;
  register: UseFormRegister<T>;
  type?: string;
  value?: string;
}) {
  return (
    <input
      type={type ?? "text"}
      className={Styles.input}
      id={id}
      {...register(name, { required: !!required })}
      value={value}
    />
  );
}
