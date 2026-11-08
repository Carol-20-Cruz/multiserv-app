"use client";

import { cn } from "@/utils";
import Image from "next/image";
import LoginForm from "./form";
import LoginHeader from "./header";

export default function Login() {
  return (
    <div className={cn("flex w-full flex-1 flex-col lg:w-1/2")}>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          {/* En pantallas pequeñas no se ve el panel de marca: logo arriba. */}
          <Image
            className="mb-8 h-10 w-auto lg:hidden dark:hidden"
            src="/images/logo/multiserv-logo-horizontal.svg"
            alt="MultiServ"
            width={200}
            height={40}
            priority
          />
          <Image
            className="mb-8 hidden h-10 w-auto dark:block dark:lg:hidden"
            src="/images/logo/multiserv-logo-horizontal-fondo-oscuro.svg"
            alt="MultiServ"
            width={200}
            height={40}
            priority
          />

          <LoginHeader />
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
