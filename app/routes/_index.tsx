import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { readFileSync } from "fs";
import { join } from "path";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const host = new URL(request.url).hostname;

  if (host === "cloverkitstudio.com" || host === "www.cloverkitstudio.com") {
    const html = readFileSync(join(process.cwd(), "public", "landing.html"), "utf-8");
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return redirect("/app");
};

export default function Index() {
  return null;
}
