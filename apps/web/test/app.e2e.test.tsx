import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../src/routes/AppRoutes";

describe("Owner UI shell", () => {
  it("renders the management shell", () => {
    const html = renderToString(
      <StaticRouter location="/">
        <AppRoutes />
      </StaticRouter>,
    );

    expect(html).toContain("dc-chatbot Owner UI");
    expect(html).toContain("Metadata-only");
  });
});
