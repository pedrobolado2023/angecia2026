export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" &&
      process.env.NEXT_PHASE !== "phase-production-build" &&
      process.env.HOTELBEDS_CATALOG_SYNC_ENABLED === "true") {
    const { startHotelbedsCatalogScheduler } = await import("./lib/hotelbedsCatalogSync");
    startHotelbedsCatalogScheduler();
  }
}
