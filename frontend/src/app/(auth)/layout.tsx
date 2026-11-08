import GridShape from "@/components/common/grid-shape";
import ThemeToggler from "@/components/common/theme-toggler";
import Image from "next/image";

// Layout de autenticación de la plantilla: formulario a la izquierda y
// panel de marca a la derecha (solo en pantallas grandes).
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-1 bg-white p-6 sm:p-0 dark:bg-gray-900">
      <div className="relative flex h-screen w-full flex-col justify-center sm:p-0 lg:flex-row dark:bg-gray-900">
        {children}
        <div className="relative hidden h-full w-full items-center justify-center bg-brand-950 lg:grid lg:w-1/2 dark:bg-white/5">
          <div className="z-1 flex h-full items-center justify-center">
            <GridShape />

            <div className="flex max-w-xs flex-col items-center">
              <Image
                className="mb-4 h-auto w-64"
                width={256}
                height={64}
                src="/images/logo/multiserv-logo-horizontal-fondo-oscuro.svg"
                alt="MultiServ"
                priority
              />
              <p className="text-center text-gray-400 dark:text-white/60">
                Servicio técnico multimarca: órdenes, clientes e inventario en
                un solo lugar.
              </p>
            </div>
          </div>
        </div>

        <div className="fixed inset-e-6 bottom-6 z-50 hidden sm:block">
          <ThemeToggler />
        </div>
      </div>
    </div>
  );
}
