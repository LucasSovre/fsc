import { test, expect } from "@playwright/test";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { register, password, assertTestDatabase, authRequest } from "../helpers";
import { pool } from "../../src/server/database";
import { acceptInvitation, createInvitation } from "../../src/server/calendar";
import { auth } from "../../src/server/auth";
import { mcpResource } from "../../src/server/config";
test.beforeAll(() => { assertTestDatabase(); });
test.afterAll(async () => { await pool.end(); });

test("deux comptes sur téléphone : formulaires natifs, partage, solo, tags et flux", async ({ browser, page, baseURL }, testInfo) => {
  test.setTimeout(120000);
  const a = await register("Alice mobile"), b = await register("Bob mobile");
  const invite = await createInvitation(a.id, b.email);
  await acceptInvitation(b.id, invite.url.split("/").at(-1)!);
  await page.goto("/connexion");
  await page.getByLabel("E-mail", { exact: true }).fill(a.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page.getByRole("heading", { name: "À venir" })).toBeVisible();
  const menuTrigger = page.getByRole("button", { name: "Ouvrir le menu du compte" });
  const accountMenu = page.locator("#menu-compte");
  await expect(accountMenu).not.toBeVisible();
  await menuTrigger.click();
  await expect(accountMenu).toBeVisible();
  await expect(accountMenu.getByRole("button", { name: "Se déconnecter" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("account-menu.png") });
  await page.keyboard.press("Escape");
  await expect(accountMenu).not.toBeVisible();
  await menuTrigger.click();
  await page.getByRole("heading", { name: "À venir" }).click();
  await expect(accountMenu).not.toBeVisible();
  await menuTrigger.click();
  await accountMenu.getByRole("link", { name: "Connecter Claude" }).click();
  await expect(page.getByRole("heading", { name: "Connecter Claude" })).toBeVisible();
  await expect(accountMenu).not.toBeVisible();
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  const settingsIcon = await nav.getByRole("link", { name: "Réglages" }).locator("svg").boundingBox();
  expect(settingsIcon!.width).toBe(settingsIcon!.height);
  const homeButton = await nav.getByRole("link", { name: "Accueil" }).boundingBox();
  const settingsButton = await nav.getByRole("link", { name: "Réglages" }).boundingBox();
  expect(settingsButton!.width).toBeCloseTo(homeButton!.width, 0);
  expect(settingsButton!.height).toBe(homeButton!.height);
  const name = `Commun ${randomUUID().slice(0, 8)}`;
  await page.goto("/evenements/nouveau");
  await expect(page.getByRole("radio", { name: /Commun —/ })).not.toBeChecked();
  await expect(page.getByRole("radio", { name: /Solo —/ })).not.toBeChecked();
  await page.getByRole("radio", { name: /Commun —/ }).check();
  await expect(page.locator(".visibility-common")).toHaveCSS("background-color", "rgb(208, 232, 184)");
  await page.getByLabel("Titre", { exact: true }).fill(name);
  await page.getByLabel("Journée entière", { exact: true }).check();
  await page.getByLabel("Premier jour", { exact: true }).fill("2027-03-10");
  await page.getByLabel("Dernier jour (inclus)", { exact: true }).fill("2027-03-10");
  await page.getByLabel("Nouveaux tags, séparés par des virgules").fill("Famille, Important");
  await page.getByRole("button", { name: "Créer l’événement", exact: true }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  const sharedURL = page.url();
  const contextB = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageB = await contextB.newPage();
  await pageB.goto(`${baseURL}/connexion`);
  await pageB.getByLabel("E-mail", { exact: true }).fill(b.email);
  await pageB.getByLabel("Mot de passe", { exact: true }).fill(password);
  await pageB.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(pageB.getByRole("heading", { name: "À venir" })).toBeVisible();
  await pageB.goto(sharedURL);
  await expect(pageB.getByRole("heading", { name })).toBeVisible();
  await pageB.getByRole("link", { name: "Modifier", exact: true }).click();
  await expect(pageB.getByRole("radio", { name: /Solo —/ })).toBeDisabled();
  await pageB.getByLabel("Titre", { exact: true }).fill(`${name} modifié`);
  await pageB.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(pageB.getByRole("heading", { name: `${name} modifié` })).toBeVisible();
  await page.goto("/evenements/nouveau");
  await page.getByRole("radio", { name: /Solo —/ }).check();
  await expect(page.locator(".visibility-solo")).toHaveCSS("background-color", "rgb(170, 160, 208)");
  await page.getByLabel("Titre", { exact: true }).fill("Solo confidentiel");
  await page.getByRole("button", { name: "Créer l’événement", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Solo confidentiel" })).toBeVisible();
  const privateURL = page.url();
  await pageB.goto(privateURL);
  await expect(pageB.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await page.goto("/reglages");
  await expect(page.getByLabel("Famille", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Tags sélectionnés", exact: true }).check();
  await page.getByLabel("Famille", { exact: true }).check();
  await page.getByRole("button", { name: "Enregistrer mes réglages" }).click();
  await expect(page.getByText("Réglages enregistrés.", { exact: true })).toBeVisible();
  const soloSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Solo", exact: true }) }).last();
  await soloSection.getByRole("button", { name: "Créer ou renouveler le lien d’abonnement" }).click();
  const feedLink = soloSection.locator('a[href*="/abonnements/"]');
  await expect(feedLink).toBeVisible();
  const feedURL = await feedLink.getAttribute("href");
  const response = await page.request.get(feedURL!);
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Solo confidentiel");
  await soloSection.getByRole("button", { name: "Révoquer le lien d’abonnement" }).click();
  await expect(soloSection.getByText("Abonnement révoqué.", { exact: true })).toBeVisible();
  expect((await page.request.get(feedURL!)).status()).toBe(404);
  await page.goto("/calendrier?jour=2027-03-10");
  await expect(page.getByRole("link", { name: `${name} modifié`, exact: true })).toBeVisible();
  expect(await page.locator('link[rel="stylesheet"]').count()).toBeGreaterThan(0);
  await expect(page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Calendrier", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const width of [320, 390, 480, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [screen, url] of [
      ["calendar", "/calendrier?jour=2027-03-10"],
      ["home", "/"],
      ["event", sharedURL],
      ["form", "/evenements/nouveau"],
      ["settings", "/reglages"],
      ["claude", "/claude"],
    ]) {
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${screen} à ${width}px`).toBe(true);
      expect(await page.locator(".app-shell").evaluate(el => el.getBoundingClientRect().width)).toBeLessThanOrEqual(480);
      await page.screenshot({ path: testInfo.outputPath(`${screen}-${width}.png`), fullPage: true });
    }
  }
  await contextB.close();
});

test("OAuth dans le navigateur : connexion, consentement signé et retour PKCE", async ({ page }) => {
  const account = await register("Claude navigateur");
  const clientId = `browser-${randomUUID()}`, redirectUri = "https://client.example/callback";
  const adapter = (await auth.$context).adapter;
  await adapter.create({ model: "oauthClient", data: { clientId, name: "Client navigateur", redirectUris: [redirectUri], tokenEndpointAuthMethod: "none", grantTypes: ["authorization_code"], responseTypes: ["code"], scopes: ["calendar:read"], requirePKCE: true, disabled: false, createdAt: new Date(), updatedAt: new Date() } });
  await adapter.create({ model: "oauthClientResource", data: { clientId, resourceId: mcpResource, createdAt: new Date() } });
  const verifier = randomBytes(32).toString("base64url");
  const query = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "calendar:read", resource: mcpResource, state: randomUUID(), code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" });
  await page.route("https://client.example/callback**", route => route.fulfill({ status: 200, body: "Connexion autorisée", contentType: "text/plain" }));
  await page.goto(`/api/auth/oauth2/authorize?${query}`);
  await expect(page.getByRole("heading", { name: "Connexion", exact: true })).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill(account.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Autoriser Client navigateur" })).toBeVisible();
  await page.getByRole("button", { name: "Autoriser", exact: true }).click();
  await expect(page).toHaveURL(/https:\/\/client.example\/callback\?code=/);
  const code = new URL(page.url()).searchParams.get("code")!;
  const exchange = await authRequest("/oauth2/token", { client_id: clientId, grant_type: "authorization_code", redirect_uri: redirectUri, code_verifier: verifier, resource: mcpResource, code });
  expect(exchange.ok).toBe(true);
  const token = await exchange.json() as { access_token: string };
  expect((await auth.api.verifyFscAccess({ body: { token: token.access_token } })).userId).toBe(account.id);
});

test("présentation : accès clavier, sélection solo, textes longs et zoom", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  for (const width of [320, 390, 480, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["connexion", "mot-de-passe-oublie", "nouveau-mot-de-passe"]) {
      await page.goto(`/${route}`);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${route}-${width}.png`), fullPage: true });
    }
  }
  const user = await register("Compte de test visuel");
  await page.goto("/connexion");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.getByLabel("E-mail", { exact: true }).fill(user.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page.getByRole("heading", { name: "À venir" })).toBeVisible();
  await page.goto("/evenements/nouveau");
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.getByRole("radio", { name: /Commun —/ })).toBeDisabled();
  const solo = page.getByRole("radio", { name: /Solo —/ });
  await solo.focus();
  await page.keyboard.press("Space");
  await expect(solo).toBeChecked();
  await expect(page.locator(".visibility-solo")).toHaveCSS("background-color", "rgb(170, 160, 208)");
  await expect(page.locator(".visibility-solo")).toHaveCSS("outline-style", "solid");
  await page.screenshot({ path: testInfo.outputPath("selection-mobile.png") });
  const title = "Un événement avec un titre très long pour vérifier la lisibilité et le retour à la ligne sur les petits écrans ".repeat(2);
  await page.getByLabel("Titre", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Créer l’événement", exact: true }).click();
  await expect(page.getByRole("heading", { name: title.trim() })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/");
  await page.screenshot({ path: testInfo.outputPath("mobile.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: testInfo.outputPath("desktop.png") });
  await page.setViewportSize({ width: 780, height: 900 });
  await page.goto("/evenements/nouveau");
  await page.evaluate(() => { document.body.style.zoom = "2"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const submit = page.getByRole("button", { name: "Créer l’événement", exact: true });
  await submit.focus();
  const control = await submit.boundingBox(), navigation = await page.locator(".bottom-nav").boundingBox();
  expect(control!.y + control!.height).toBeLessThanOrEqual(navigation!.y);
  await page.screenshot({ path: testInfo.outputPath("form-zoom-200.png") });
});
