export function withBasePath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH === "/bx-caller" ? "/bx-caller" : "";

  return `${basePath}${normalizedPath}`;
}
