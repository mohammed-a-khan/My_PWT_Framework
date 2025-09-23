# Playwright API Methods to Implement in CSWebElement

## Complete List of Playwright Locator Methods

### Action Methods
1. **click(options?)** - Click element
   - Options: button, clickCount, delay, force, modifiers, noWaitAfter, position, timeout, trial
   - Need separate methods: clickWithButton(), clickWithPosition(), clickWithModifiers(), etc.

2. **dblclick(options?)** - Double click
   - Options: button, delay, force, modifiers, noWaitAfter, position, timeout, trial
   - Need separate methods: dblclickWithPosition(), dblclickWithModifiers(), etc.

3. **tap(options?)** - Tap element (mobile)
   - Options: force, modifiers, noWaitAfter, position, timeout, trial

4. **hover(options?)** - Hover over element
   - Options: force, modifiers, position, timeout, trial

5. **dragTo(target, options?)** - Drag to another element
   - Options: force, noWaitAfter, sourcePosition, targetPosition, timeout, trial

6. **focus(options?)** - Focus element
   - Options: timeout

7. **blur(options?)** - Remove focus
   - Options: timeout

8. **press(key, options?)** - Press a key
   - Options: delay, noWaitAfter, timeout

9. **pressSequentially(text, options?)** - Type text character by character
   - Options: delay, noWaitAfter, timeout

10. **type(text, options?)** - Type text (deprecated, use fill)
    - Options: delay, noWaitAfter, timeout

### Input Methods
11. **fill(value, options?)** - Fill input field
    - Options: force, noWaitAfter, timeout

12. **clear(options?)** - Clear input field
    - Options: force, noWaitAfter, timeout

13. **selectOption(values, options?)** - Select dropdown option
    - Options: force, noWaitAfter, timeout
    - Values can be: string, array, object with value/label/index

14. **selectText(options?)** - Select text in element
    - Options: force, timeout

15. **setInputFiles(files, options?)** - Upload files
    - Options: noWaitAfter, timeout
    - Files can be: string, array, object with name/mimeType/buffer

16. **check(options?)** - Check checkbox/radio
    - Options: force, noWaitAfter, position, timeout, trial

17. **uncheck(options?)** - Uncheck checkbox
    - Options: force, noWaitAfter, position, timeout, trial

18. **setChecked(checked, options?)** - Set checked state
    - Options: force, noWaitAfter, position, timeout, trial

### Query Methods
19. **count()** - Get count of matching elements

20. **all()** - Get all matching locators

21. **first()** - Get first matching element

22. **last()** - Get last matching element

23. **nth(index)** - Get nth element

24. **filter(options?)** - Filter locators
    - Options: has, hasNot, hasNotText, hasText

25. **locator(selectorOrLocator, options?)** - Create sub-locator
    - Options: has, hasNot, hasNotText, hasText

### Content Methods
26. **textContent(options?)** - Get text content
    - Options: timeout

27. **innerText(options?)** - Get inner text
    - Options: timeout

28. **innerHTML(options?)** - Get inner HTML
    - Options: timeout

29. **getAttribute(name, options?)** - Get attribute value
    - Options: timeout

30. **inputValue(options?)** - Get input value
    - Options: timeout

31. **allTextContents()** - Get all text contents

32. **allInnerTexts()** - Get all inner texts

### State Methods
33. **isChecked(options?)** - Check if checked
    - Options: timeout

34. **isDisabled(options?)** - Check if disabled
    - Options: timeout

35. **isEditable(options?)** - Check if editable
    - Options: timeout

36. **isEnabled(options?)** - Check if enabled
    - Options: timeout

37. **isHidden(options?)** - Check if hidden
    - Options: timeout

38. **isVisible(options?)** - Check if visible
    - Options: timeout

### Wait Methods
39. **waitFor(options?)** - Wait for element
    - Options: state ('attached', 'detached', 'visible', 'hidden'), timeout

### Evaluation Methods
40. **evaluate(pageFunction, arg?, options?)** - Execute JS on element
    - Options: timeout

41. **evaluateAll(pageFunction, arg?)** - Execute JS on all elements

42. **evaluateHandle(pageFunction, arg?, options?)** - Get JS handle
    - Options: timeout

### Location Methods
43. **boundingBox(options?)** - Get bounding box
    - Options: timeout

44. **screenshot(options?)** - Take screenshot
    - Options: animations, caret, mask, maskColor, omitBackground, path, quality, scale, timeout, type

45. **scrollIntoViewIfNeeded(options?)** - Scroll into view
    - Options: timeout

### Locator Creation Methods
46. **and(locator)** - Combine with AND logic

47. **or(locator)** - Combine with OR logic

48. **getByAltText(text, options?)** - Locate by alt text
    - Options: exact

49. **getByLabel(text, options?)** - Locate by label
    - Options: exact

50. **getByPlaceholder(text, options?)** - Locate by placeholder
    - Options: exact

51. **getByRole(role, options?)** - Locate by ARIA role
    - Options: checked, disabled, exact, expanded, includeHidden, level, name, pressed, selected

52. **getByTestId(testId)** - Locate by test ID

53. **getByText(text, options?)** - Locate by text
    - Options: exact

54. **getByTitle(text, options?)** - Locate by title
    - Options: exact

### Frame Methods
55. **frameLocator(selector)** - Create frame locator

56. **contentFrame()** - Get content frame

### Other Methods
57. **page()** - Get page reference

58. **highlight()** - Highlight element (debugging)

59. **dispatchEvent(type, eventInit?, options?)** - Dispatch DOM event
    - Options: timeout

## Implementation Requirements

For EACH method above, CSWebElement must:

1. **Create main wrapper method** with full options support
2. **Create separate convenience methods** for each optional parameter
3. **Add CSReporter logging** at start and end
4. **Add retry logic** with configurable attempts
5. **Add error handling** with detailed messages
6. **Add performance tracking**
7. **Support self-healing** when element not found
8. **Add screenshot on failure** if configured

Example for click():
```typescript
// Main method
async click(options?: ClickOptions): Promise<void>

// Convenience methods for each option
async clickWithButton(button: 'left' | 'right' | 'middle'): Promise<void>
async clickWithPosition(x: number, y: number): Promise<void>
async clickWithModifiers(modifiers: string[]): Promise<void>
async clickWithDelay(delay: number): Promise<void>
async clickWithForce(): Promise<void>
async clickWithTimeout(timeout: number): Promise<void>
async clickMultipleTimes(count: number): Promise<void>
async clickWithoutWaiting(): Promise<void>
```

## Total Methods to Implement
- **59 main Playwright methods**
- **Approximately 200+ convenience methods** for optional parameters
- Each method needs proper CSReporter integration, retry logic, and error handling