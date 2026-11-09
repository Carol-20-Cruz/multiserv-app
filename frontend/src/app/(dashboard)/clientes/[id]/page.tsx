import AgregarEquipoForm from "@/components/clientes/agregar-equipo-form";
import DesactivarCliente from "@/components/clientes/desactivar-cliente";
import DetalleCliente from "@/components/clientes/detalle-cliente";
import MensajeExito from "@/components/clientes/mensaje-exito";
import TablaEquipos from "@/components/clientes/tabla-equipos";
import ComponentCard from "@/components/common/component-card";
import PageBreadcrumb from "@/components/common/page-breadcrumb";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { obtenerDelBackend } from "@/lib/backend-sesion";
import type { ClienteDetalle, TipoEquipo } from "@/lib/tipos-clientes";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Detalle del cliente",
};

interface DetallePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    registrado?: string;
    actualizado?: string;
    equipo?: string;
  }>;
}

// Detalle del cliente con sus equipos y el formulario "Agregar equipo".
export default async function DetalleClientePage({
  params,
  searchParams,
}: DetallePageProps) {
  const { id } = await params;
  if (!/^\d{1,9}$/.test(id)) notFound();

  const [cliente, tipos, aviso] = await Promise.all([
    obtenerDelBackend<ClienteDetalle>(`/clientes/${id}`),
    obtenerDelBackend<TipoEquipo[]>("/tipos-equipo"),
    searchParams,
  ]);
  if (!cliente) notFound();

  // Aviso de la última acción. "" (equipo agregado) borra el aviso anterior:
  // el formulario "Agregar equipo" muestra su propio mensaje.
  const mensaje = aviso.equipo
    ? ""
    : aviso.registrado
      ? "Cliente registrado correctamente."
      : aviso.actualizado
        ? "Datos del cliente actualizados correctamente."
        : null;

  return (
    <div>
      <PageBreadcrumb pageTitle="Detalle del cliente" />

      <div className="space-y-6">
        {/* Siempre en el mismo lugar (aunque mensaje sea null) para que
            conserve su estado cuando la URL se limpia. */}
        <MensajeExito mensaje={mensaje} visible={cliente.activo} />
        {!cliente.activo && (
          <Alert variant="info" role="status">
            <AlertDescription className="text-gray-700 dark:text-gray-300">
              Este cliente está desactivado: sus datos y equipos se conservan,
              pero no aparece en el listado ni se le pueden agregar equipos.
            </AlertDescription>
          </Alert>
        )}

        <DetalleCliente cliente={cliente} />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/clientes"
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            Volver al listado
          </Link>
          {cliente.activo && (
            <>
              <Link
                href={`/clientes/${cliente.id}/editar`}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Editar datos de contacto
              </Link>
              <DesactivarCliente
                clienteId={cliente.id}
                nombre={cliente.nombre}
              />
            </>
          )}
        </div>

        <ComponentCard
          title={`Equipos (${cliente.equipos.length})`}
          desc="Electrodomésticos asociados a este cliente."
        >
          <TablaEquipos equipos={cliente.equipos} />
        </ComponentCard>

        {cliente.activo && (
          <ComponentCard
            title="Agregar equipo"
            desc="Tipo de equipo y marca son obligatorios; referencia y serial son opcionales."
          >
            <AgregarEquipoForm clienteId={cliente.id} tipos={tipos ?? []} />
          </ComponentCard>
        )}
      </div>
    </div>
  );
}
