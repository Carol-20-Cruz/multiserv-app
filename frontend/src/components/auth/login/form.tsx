"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginFormData } from "./schema";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      correo: "",
      password: "",
    },
    mode: "onTouched",
  });

  const handleFormSubmit = async (_data: LoginFormData) => {
    // Se conecta al backend en el siguiente paso.
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-5"
      noValidate
    >
      <Field data-invalid={Boolean(errors.correo)} controlId="correo">
        <FieldLabel className="mb-1.5 block">
          Correo electrónico <span className="text-red-500">*</span>
        </FieldLabel>
        <Input
          {...register("correo")}
          type="email"
          autoComplete="username"
          placeholder="usuario@multiserv.com"
          aria-invalid={errors.correo ? "true" : undefined}
        />
        <FieldError errors={[errors.correo]} />
      </Field>

      <Field data-invalid={Boolean(errors.password)} controlId="password">
        <FieldLabel className="mb-1.5 block">
          Contraseña <span className="text-red-500">*</span>
        </FieldLabel>
        <InputGroup>
          <InputGroupInput
            {...register("password")}
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            aria-invalid={errors.password ? "true" : undefined}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="text-gray-500 dark:text-gray-400"
            >
              {showPassword ? (
                <EyeIcon className="fill-current" />
              ) : (
                <EyeCloseIcon className="fill-current" />
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <FieldError errors={[errors.password]} />
      </Field>

      <div>
        <Button
          className="w-full"
          size="lg"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
        </Button>
      </div>
    </form>
  );
}
