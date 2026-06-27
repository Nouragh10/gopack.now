import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "gopack\u2024now";

// Pack Plus subscription ($14.99/mo)
const PRODUCT_IDENTIFIER = "pack_plus_monthly";
const PLAY_STORE_PRODUCT_IDENTIFIER = "pack_plus_monthly:monthly";
const PRODUCT_DISPLAY_NAME = "Pack Plus Monthly";
const PRODUCT_USER_FACING_TITLE = "Pack Plus";
const PRODUCT_DURATION = "P1M";
const PRODUCT_PRICES = [{ amount_micros: 14990000, currency: "USD" }]; // $14.99

// Day unlock one-time purchase ($4.99)
const DAY_PRODUCT_IDENTIFIER = "itinerary_day_unlock_499";
const PLAY_STORE_DAY_PRODUCT_IDENTIFIER = "itinerary_day_unlock_499:day";
const DAY_PRODUCT_DISPLAY_NAME = "Day Unlock 4.99";
const DAY_PRODUCT_USER_FACING_TITLE = "Day Unlock";
const DAY_PRODUCT_PRICES = [{ amount_micros: 4990000, currency: "USD" }]; // $4.99

const APP_STORE_APP_NAME = "GoPackNow iOS";
const APP_STORE_BUNDLE_ID = "com.gopacknow.app";
const PLAY_STORE_APP_NAME = "GoPackNow Android";
const PLAY_STORE_PACKAGE_NAME = "com.gopacknow.app";

const ENTITLEMENT_IDENTIFIER = "pack_plus";
const ENTITLEMENT_DISPLAY_NAME = "Pack Plus";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

const PACKAGE_IDENTIFIER = "$rc_monthly";
const PACKAGE_DISPLAY_NAME = "Monthly";

const DAY_PACKAGE_IDENTIFIER = "day_unlock";
const DAY_PACKAGE_DISPLAY_NAME = "Day Unlock";

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });

  if (listProjectsError) throw new Error("Failed to list projects: " + JSON.stringify(listProjectsError));
  console.log("Found projects:", existingProjects.items?.map(p => p.name + " / " + p.id).join(", "));

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found");

  let app: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!app) throw new Error("No test store app found");
  console.log("Test store app:", app.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app found:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app found:", playStoreApp.id);
  }

  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    identifier: string,
    isTestStore: boolean,
    displayName: string,
    userFacingTitle: string,
    opts: { type: "subscription"; duration: string } | { type: "non_consumable" },
  ): Promise<Product> => {
    const existing = existingProducts.items?.find((p) => p.store_identifier === identifier && p.app_id === targetApp.id);
    if (existing) { console.log(label + " product exists:", existing.id); return existing; }

    const body: CreateProductData["body"] = {
      store_identifier: identifier,
      app_id: targetApp.id,
      type: opts.type,
      display_name: displayName,
    };
    if (isTestStore) {
      body.title = userFacingTitle;
      if (opts.type === "subscription" && "duration" in opts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body.subscription = { duration: opts.duration as any };
      }
    }
    const { data: created, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error("Failed to create " + label + " product: " + JSON.stringify(error));
    console.log("Created " + label + " product:", created.id);
    return created;
  };

  const addTestStorePrices = async (productId: string, prices: { amount_micros: number; currency: string }[], label: string) => {
    const { error } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: productId },
      body: { prices },
    });
    if (error) {
      if (typeof error === "object" && "type" in error && (error as any).type === "resource_already_exists") {
        console.log(label + " test store prices already exist");
      } else {
        throw new Error("Failed to add " + label + " test store prices: " + JSON.stringify(error));
      }
    } else {
      console.log("Added " + label + " test store prices");
    }
  };

  // Pack Plus ($14.99/mo)
  const testStoreProduct = await ensureProduct(app, "Test Store [Pack Plus]", PRODUCT_IDENTIFIER, true, PRODUCT_DISPLAY_NAME, PRODUCT_USER_FACING_TITLE, { type: "subscription", duration: PRODUCT_DURATION });
  const appStoreProduct = await ensureProduct(appStoreApp, "App Store [Pack Plus]", PRODUCT_IDENTIFIER, false, PRODUCT_DISPLAY_NAME, PRODUCT_USER_FACING_TITLE, { type: "subscription", duration: PRODUCT_DURATION });
  const playStoreProduct = await ensureProduct(playStoreApp, "Play Store [Pack Plus]", PLAY_STORE_PRODUCT_IDENTIFIER, false, PRODUCT_DISPLAY_NAME, PRODUCT_USER_FACING_TITLE, { type: "subscription", duration: PRODUCT_DURATION });
  await addTestStorePrices(testStoreProduct.id, PRODUCT_PRICES, "Pack Plus");

  // Day Unlock ($9.99) — one-time non-consumable purchase
  const testStoreDayProduct = await ensureProduct(app, "Test Store [Day Unlock]", DAY_PRODUCT_IDENTIFIER, true, DAY_PRODUCT_DISPLAY_NAME, DAY_PRODUCT_USER_FACING_TITLE, { type: "non_consumable" });
  const appStoreDayProduct = await ensureProduct(appStoreApp, "App Store [Day Unlock]", DAY_PRODUCT_IDENTIFIER, false, DAY_PRODUCT_DISPLAY_NAME, DAY_PRODUCT_USER_FACING_TITLE, { type: "non_consumable" });
  const playStoreDayProduct = await ensureProduct(playStoreApp, "Play Store [Day Unlock]", PLAY_STORE_DAY_PRODUCT_IDENTIFIER, false, DAY_PRODUCT_DISPLAY_NAME, DAY_PRODUCT_USER_FACING_TITLE, { type: "non_consumable" });
  await addTestStorePrices(testStoreDayProduct.id, DAY_PRODUCT_PRICES, "Day Unlock");

  let entitlement: Entitlement | undefined;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log("Entitlement exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEntitlement, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", newEntitlement.id);
    entitlement = newEntitlement;
  }

  const { error: attachEntitlementError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: [testStoreProduct.id, appStoreProduct.id, playStoreProduct.id] },
  });
  if (attachEntitlementError) {
    if ((attachEntitlementError as any).type === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached products to entitlement");
  }

  let offering: Offering | undefined;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOffering, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", newOffering.id);
    offering = newOffering;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  let pkg: Package | undefined;
  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  const existingPackage = existingPackages.items?.find((p) => p.lookup_key === PACKAGE_IDENTIFIER);
  if (existingPackage) {
    console.log("Package exists:", existingPackage.id);
    pkg = existingPackage;
  } else {
    const { data: newPackage, error } = await createPackages({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { lookup_key: PACKAGE_IDENTIFIER, display_name: PACKAGE_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create package");
    console.log("Created package:", newPackage.id);
    pkg = newPackage;
  }

  const attachToPackage = async (packageId: string, productIds: string[], label: string) => {
    const { error } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: packageId },
      body: { products: productIds.map(id => ({ product_id: id, eligibility_criteria: "all" as const })) },
    });
    if (error) {
      if ((error as any).type === "unprocessable_entity_error") {
        console.log(label + " products already attached to package");
      } else {
        throw new Error("Failed to attach products to " + label + " package");
      }
    } else {
      console.log("Attached products to " + label + " package");
    }
  };

  await attachToPackage(pkg.id, [testStoreProduct.id, appStoreProduct.id, playStoreProduct.id], "Pack Plus");

  // Day Unlock package
  let dayPkg: Package | undefined;
  const existingDayPackage = existingPackages.items?.find((p) => p.lookup_key === DAY_PACKAGE_IDENTIFIER);
  if (existingDayPackage) {
    console.log("Day Unlock package exists:", existingDayPackage.id);
    dayPkg = existingDayPackage;
  } else {
    const { data: newDayPackage, error } = await createPackages({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { lookup_key: DAY_PACKAGE_IDENTIFIER, display_name: DAY_PACKAGE_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create day unlock package: " + JSON.stringify(error));
    console.log("Created day unlock package:", newDayPackage.id);
    dayPkg = newDayPackage;
  }

  await attachToPackage(dayPkg.id, [testStoreDayProduct.id, appStoreDayProduct.id, playStoreDayProduct.id], "Day Unlock");

  const { data: testKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: app.id } });
  const { data: iosKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: appStoreApp.id } });
  const { data: androidKeys } = await listAppPublicApiKeys({ client, path: { project_id: project.id, app_id: playStoreApp.id } });

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", app.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Entitlement:", ENTITLEMENT_IDENTIFIER);
  console.log("Public API Key - Test Store:", testKeys?.items[0]?.key ?? "N/A");
  console.log("Public API Key - iOS:", iosKeys?.items[0]?.key ?? "N/A");
  console.log("Public API Key - Android:", androidKeys?.items[0]?.key ?? "N/A");
  console.log("====================\n");
  console.log("NEXT: Save these as env vars:");
  console.log("  REVENUECAT_PROJECT_ID =", project.id);
  console.log("  REVENUECAT_TEST_STORE_APP_ID =", app.id);
  console.log("  REVENUECAT_APPLE_APP_STORE_APP_ID =", appStoreApp.id);
  console.log("  REVENUECAT_GOOGLE_PLAY_STORE_APP_ID =", playStoreApp.id);
  console.log("  EXPO_PUBLIC_REVENUECAT_TEST_API_KEY =", testKeys?.items[0]?.key ?? "N/A");
  console.log("  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY =", iosKeys?.items[0]?.key ?? "N/A");
  console.log("  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY =", androidKeys?.items[0]?.key ?? "N/A");
}

seedRevenueCat().catch(console.error);
