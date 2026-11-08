import PageBreadcrumb from "@/components/common/page-breadcrumb";
import Proximamente from "@/components/common/proximamente";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Órdenes",
};

export default function OrdenesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Órdenes" />
      <Proximamente
        title="Órdenes: próximamente"
        description="Aquí podrás crear órdenes de servicio y seguir su estado."
      />
    </div>
  );
}
