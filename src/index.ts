import { Container, getContainer, getRandom } from "@cloudflare/containers";
import { Hono } from "hono";

export class MyContainer extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = "5m";

  // Optional lifecycle hooks
  override onStart() {
    console.log("Container started");
  }

  override onStop() {
    console.log("Container shut down");
  }

  override onError(error: unknown) {
    console.log("Container error:", error);
  }
}

const app = new Hono<{
  Bindings: Env;
}>();

// Home route with available endpoints
app.get("/", (c) => {
  return c.text(
    "Available endpoints:\n" +
      "GET /container/<ID> - Start a container for each ID with a 5m timeout"
  );
});

// Route requests to a specific container using the container ID
app.get("/container/:id", async (c) => {
  const id = c.req.param("id");
  const containerId = c.env.MY_CONTAINER.idFromName(`/container/${id}`);
  const container = c.env.MY_CONTAINER.get(containerId);
  return await container.fetch(c.req.raw);
});

export default app;
