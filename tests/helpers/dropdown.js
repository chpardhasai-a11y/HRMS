export async function chooseDropdown(page, label, value) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page
    .getByRole("listbox", { name: label, exact: true })
    .locator(`[role="option"][data-value=${JSON.stringify(String(value))}]`)
    .click();
}
