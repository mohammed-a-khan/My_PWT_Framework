# CSWebElement Dynamic Object Creation

CSWebElement now provides built-in methods for creating elements dynamically at runtime.

## Available Methods

### 1. Basic Selector Methods

```typescript
// Create by CSS selector
const button = CSWebElement.createByCSS('#submit-button', 'Submit Button');
await button.click();

// Create by XPath
const header = CSWebElement.createByXPath('//h1[@class="page-title"]', 'Page Title');
const text = await header.textContent();

// Create by text
const link = CSWebElement.createByText('Click here', false, 'Dynamic Link');
await link.click();

// Create by ID
const input = CSWebElement.createById('username', 'Username Field');
await input.fill('admin');

// Create by name attribute
const email = CSWebElement.createByName('email', 'Email Field');
await email.fill('user@example.com');

// Create by role
const menu = CSWebElement.createByRole('navigation', 'Main Menu');
await menu.isVisible();

// Create by test ID
const component = CSWebElement.createByTestId('user-profile', 'User Profile');
await component.click();
```

### 2. Template-Based Creation

```typescript
// Create with template and values
const button = CSWebElement.createWithTemplate(
    'button[data-user="{userId}"][data-action="{action}"]',
    { userId: '12345', action: 'delete' },
    'Delete User Button'
);
await button.click();
```

### 3. Table Cell Access

```typescript
// Access specific table cell
const cell = CSWebElement.createTableCell('#data-table', 2, 3, 'Cell at row 2, col 3');
const cellValue = await cell.textContent();
```

### 4. Form Field by Label

```typescript
// Find form field by its label
const field = CSWebElement.createByLabel('First Name', 'input', 'First Name Field');
await field.fill('John');

// Works with select dropdowns too
const dropdown = CSWebElement.createByLabel('Country', 'select', 'Country Dropdown');
await dropdown.selectOption('USA');
```

### 5. Filtered Elements

```typescript
// Create element with filters
const activeButton = CSWebElement.createWithFilter(
    'button',
    { hasText: 'Submit', enabled: true, visible: true },
    'Active Submit Button'
);
await activeButton.click();
```

### 6. Multiple Elements

```typescript
// Get all matching elements as CSWebElement array
const buttons = await CSWebElement.createMultiple('.action-button', 'Action Buttons');
for (const button of buttons) {
    await button.click();
}
```

### 7. Chained Selectors

```typescript
// Chain multiple selectors
const nestedElement = CSWebElement.createChained(
    ['.container', '.section', '.item'],
    'Nested Item'
);
await nestedElement.click();
```

### 8. Custom Options

```typescript
// Full control with custom options
const element = CSWebElement.create({
    css: '.dynamic-element',
    description: 'Custom Dynamic Element',
    waitForVisible: true,
    timeout: 10000,
    retryCount: 5,
    selfHeal: true
});
await element.click();
```

## Practical Examples in Tests

### Example 1: Dynamic Menu Navigation

```typescript
import { CSWebElement } from '../src/element/CSWebElement';

export class DynamicNavigationTest {

    async navigateToMenu(menuName: string) {
        // Dynamically create menu element
        const menuItem = CSWebElement.createByText(menuName, true, `${menuName} Menu`);
        await menuItem.click();

        // Verify navigation
        const header = CSWebElement.createByCSS('h6.page-header');
        const headerText = await header.textContent();
        expect(headerText).toContain(menuName);
    }

    async testAllMenus() {
        const menus = ['Admin', 'PIM', 'Leave', 'Time', 'Recruitment'];

        for (const menu of menus) {
            await this.navigateToMenu(menu);
        }
    }
}
```

### Example 2: Dynamic Form Filling

```typescript
export class DynamicFormTest {

    async fillDynamicForm(formData: Record<string, string>) {
        for (const [fieldName, value] of Object.entries(formData)) {
            // Dynamically create field element
            const field = CSWebElement.createByName(fieldName, `Field: ${fieldName}`);
            await field.fill(value);
        }

        // Submit form
        const submitButton = CSWebElement.createByCSS('button[type="submit"]');
        await submitButton.click();
    }

    async testForm() {
        await this.fillDynamicForm({
            'firstName': 'John',
            'lastName': 'Doe',
            'email': 'john@example.com',
            'phone': '1234567890'
        });
    }
}
```

### Example 3: Dynamic Table Operations

```typescript
export class DynamicTableTest {

    async getTableData(tableId: string, row: number, column: number) {
        const cell = CSWebElement.createTableCell(`#${tableId}`, row, column);
        return await cell.textContent();
    }

    async verifyTableRow(tableId: string, row: number, expectedData: string[]) {
        for (let col = 1; col <= expectedData.length; col++) {
            const cellValue = await this.getTableData(tableId, row, col);
            expect(cellValue).toBe(expectedData[col - 1]);
        }
    }
}
```

### Example 4: Data-Driven Testing

```typescript
export class DataDrivenTest {

    async loginWithUser(username: string, password: string) {
        // Dynamically create elements for each user
        const usernameField = CSWebElement.createByName('username', 'Username');
        const passwordField = CSWebElement.createByName('password', 'Password');
        const loginButton = CSWebElement.createByCSS('button[type="submit"]', 'Login');

        await usernameField.fill(username);
        await passwordField.fill(password);
        await loginButton.click();
    }

    async testMultipleUsers(users: Array<{username: string, password: string}>) {
        for (const user of users) {
            await this.loginWithUser(user.username, user.password);
            // Verify login and logout
            const logoutBtn = CSWebElement.createByText('Logout');
            await logoutBtn.click();
        }
    }
}
```

## Benefits

1. **No pre-declaration needed** - Create elements on the fly
2. **Type-safe** - Full TypeScript support
3. **Self-healing enabled** - Dynamic elements still benefit from self-healing
4. **Full CSWebElement features** - All methods available on dynamic elements
5. **Clean code** - No need for complex selectors in test code

## Best Practices

1. Use descriptive names in the description parameter for better logging
2. Prefer specific methods (createById, createByTestId) over generic CSS
3. Use createWithTemplate for complex dynamic selectors
4. Cache created elements if they'll be reused multiple times
5. Use createMultiple for operating on element collections