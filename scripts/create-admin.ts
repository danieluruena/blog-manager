import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "admin" },
    remote: { type: "boolean", default: false },
  },
});

if (!values.email || !values.name) {
  console.error(
    "Uso: npm run user:create -- --email <email> --name <nombre> [--role admin|editor] [--remote]",
  );
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
  console.error("El email no tiene un formato válido.");
  process.exit(1);
}

if (values.role !== "admin" && values.role !== "editor") {
  console.error("El rol debe ser `admin` o `editor`.");
  process.exit(1);
}

console.error(
  "La creación del primer administrador se implementa en la Fase 1, cuando exista la tabla `users`.",
);
console.error(`Destino: D1 ${values.remote ? "remota" : "local"}.`);
console.error(`Email: ${values.email}`);
console.error(`Nombre: ${values.name}`);
console.error(`Rol: ${values.role}`);
process.exit(1);
