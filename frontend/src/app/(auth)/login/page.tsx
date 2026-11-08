import Login from "@/components/auth/login";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return <Login />;
}
