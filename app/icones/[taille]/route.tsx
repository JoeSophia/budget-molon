// Icônes de l'app installée (manifeste, écran d'accueil iPhone) : /icones/192, /icones/512, /icones/180
import { ImageResponse } from "next/og";

export async function GET(_: Request, { params }: RouteContext<"/icones/[taille]">) {
  const t = Math.min(512, Math.max(32, Number((await params).taille) || 192));
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: "#047857", color: "white", fontSize: t * 0.6, fontWeight: 700 }}>€</div>,
    { width: t, height: t },
  );
}
