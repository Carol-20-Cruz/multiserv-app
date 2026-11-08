import Error404 from "@/components/common/error-404";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return <Error404 />;
}
