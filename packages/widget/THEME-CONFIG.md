# Widget Theme & Configuration Reference

This document provides definitions of all themable configuration options.

## Theme Colors (`config.theme.*`)

| Property | Description |
|----------|-------------|
| `primary` | Main text color for headings, body text, and icons |
| `secondary` | Secondary text color for less prominent text |
| `surface` | Background for panel, input area, and assistant message bubbles |
| `muted` | Muted text color for timestamps, hints |
| `accent` | User message bubbles and interactive elements |
| `container` | Message container/body area background |
| `border` | Default border color for panel and elements |
| `divider` | Color for divider lines between sections |
| `messageBorder` | Border color for message bubbles |
| `inputBackground` | Background for the text input/composer |
| `callToAction` | Launcher call-to-action icon color |
| `callToActionBackground` | Launcher call-to-action button background |

## Panel Styling (`config.theme.*`)

| Property | Default | Description |
|----------|---------|-------------|
| `panelBorder` | `"1px solid var(--tvw-cw-border)"` | Border style for the chat panel |
| `panelShadow` | `"0 25px 50px -12px rgba(0,0,0,0.25)"` | Box shadow for the panel |
| `panelBorderRadius` | `"16px"` | Border radius for panel corners |

## Border Radius (`config.theme.*`)

| Property | Description |
|----------|-------------|
| `radiusSm` | Small radius (chips, small elements) |
| `radiusMd` | Medium radius (buttons, inputs) |
| `radiusLg` | Large radius (cards, panels) |
| `launcherRadius` | Launcher button radius |
| `buttonRadius` | Button radius |

## Typography (`config.theme.*`)

| Property | Description |
|----------|-------------|
| `inputFontFamily` | `"sans-serif" \| "serif" \| "mono"` - Input font family |
| `inputFontWeight` | Input font weight |

## Launcher (`config.launcher.*`)

### Basic
| Property | Description |
|----------|-------------|
| `enabled` | Show/hide the launcher button |
| `title` | Header title text |
| `subtitle` | Header subtitle text |
| `textHidden` | Hide title/subtitle on launcher |
| `iconUrl` | Custom launcher icon URL |
| `position` | `"bottom-right" \| "bottom-left" \| "top-right" \| "top-left"` |
| `autoExpand` | Auto-open widget on page load |
| `width` | Chat panel width |

### Full Height & Sidebar
| Property | Default | Description |
|----------|---------|-------------|
| `fullHeight` | `false` | Fill full height of container |
| `sidebarMode` | `false` | Position as sidebar flush with viewport |
| `sidebarWidth` | `"420px"` | Sidebar width |

### Agent Icon
| Property | Description |
|----------|-------------|
| `agentIconText` | Emoji/text for agent icon |
| `agentIconName` | Icon name |
| `agentIconHidden` | Hide agent icon |
| `agentIconSize` | Icon size |

### Call to Action Icon
| Property | Description |
|----------|-------------|
| `callToActionIconText` | Emoji/text for CTA |
| `callToActionIconName` | Icon name |
| `callToActionIconColor` | Icon color |
| `callToActionIconBackgroundColor` | Background color |
| `callToActionIconHidden` | Hide CTA icon |
| `callToActionIconPadding` | Padding |
| `callToActionIconSize` | Size |

### Header Icon
| Property | Description |
|----------|-------------|
| `headerIconSize` | Header icon size |
| `headerIconName` | Header icon name |
| `headerIconHidden` | Hide header icon |

## Send Button (`config.sendButton.*`)

| Property | Description |
|----------|-------------|
| `backgroundColor` | Button background |
| `textColor` | Text/icon color |
| `borderWidth` | Border width |
| `borderColor` | Border color |
| `paddingX` / `paddingY` | Padding |
| `iconText` | Emoji/text |
| `iconName` | Icon name |
| `useIcon` | Use icon vs text |
| `size` | Button size |
| `tooltipText` | Tooltip text |
| `showTooltip` | Show tooltip |

**Theme overrides:** `sendButtonBackgroundColor`, `sendButtonTextColor`, `sendButtonBorderColor`

## Close Button (`config.launcher.*`)

| Property | Description |
|----------|-------------|
| `closeButtonSize` | Button size |
| `closeButtonColor` | Icon color |
| `closeButtonBackgroundColor` | Background |
| `closeButtonBorderWidth` | Border width |
| `closeButtonBorderColor` | Border color |
| `closeButtonBorderRadius` | Border radius |
| `closeButtonPaddingX` / `closeButtonPaddingY` | Padding |
| `closeButtonPlacement` | `"inline" \| "top-right"` |
| `closeButtonIconName` | Icon name |
| `closeButtonIconText` | Emoji/text |
| `closeButtonTooltipText` | Tooltip text |
| `closeButtonShowTooltip` | Show tooltip |

**Theme overrides:** `closeButtonColor`, `closeButtonBackgroundColor`, `closeButtonBorderColor`

## Clear Chat Button (`config.launcher.clearChat.*`)

| Property | Description |
|----------|-------------|
| `enabled` | Show clear chat button |
| `placement` | `"inline" \| "top-right"` |
| `iconName` | Icon name |
| `iconColor` | Icon color |
| `backgroundColor` | Background |
| `borderWidth` / `borderColor` / `borderRadius` | Border styling |
| `size` | Button size |
| `paddingX` / `paddingY` | Padding |
| `tooltipText` | Tooltip text |
| `showTooltip` | Show tooltip |

**Theme overrides:** `clearChatIconColor`, `clearChatBackgroundColor`, `clearChatBorderColor`

## Voice Recognition (`config.voiceRecognition.*`)

| Property | Description |
|----------|-------------|
| `enabled` | Enable voice input |
| `pauseDuration` | Pause duration (ms) before auto-stop |
| `iconName` / `iconSize` / `iconColor` | Icon styling |
| `backgroundColor` / `borderColor` / `borderWidth` | Button styling |
| `paddingX` / `paddingY` | Padding |
| `tooltipText` / `showTooltip` | Tooltip |
| `recordingIconColor` | Icon color when recording |
| `recordingBackgroundColor` | Background when recording |
| `recordingBorderColor` | Border when recording |
| `showRecordingIndicator` | Show recording indicator |
| `autoResume` | `boolean \| "assistant"` - Auto-resume listening |

**Theme overrides:** `micIconColor`, `micBackgroundColor`, `micBorderColor`, `recordingIconColor`, `recordingBackgroundColor`, `recordingBorderColor`

## Status Indicator (`config.statusIndicator.*`)

| Property | Default | Description |
|----------|---------|-------------|
| `visible` | `true` | Show status indicator |
| `idleText` | `"Online"` | Idle text |
| `connectingText` | `"Connecting..."` | Connecting text |
| `connectedText` | `"Connected"` | Connected text |
| `errorText` | `"Error"` | Error text |

## Tool Call Display (`config.toolCall.*`)

| Property | Description |
|----------|-------------|
| `backgroundColor` / `borderColor` / `borderWidth` / `borderRadius` | Container styling |
| `headerBackgroundColor` / `headerTextColor` / `headerPaddingX` / `headerPaddingY` | Header styling |
| `contentBackgroundColor` / `contentTextColor` / `contentPaddingX` / `contentPaddingY` | Content styling |
| `codeBlockBackgroundColor` / `codeBlockBorderColor` / `codeBlockTextColor` | Code block styling |
| `toggleTextColor` | Expand/collapse toggle color |
| `labelTextColor` | Label color |

## Suggestion Chips (`config.suggestionChipsConfig.*`)

| Property | Description |
|----------|-------------|
| `fontFamily` | `"sans-serif" \| "serif" \| "mono"` |
| `fontWeight` | Font weight |
| `paddingX` / `paddingY` | Padding |

**Chip content:** `config.suggestionChips: string[]`

## Layout (`config.layout.*`)

### Header (`layout.header.*`)
| Property | Description |
|----------|-------------|
| `layout` | `"default" \| "minimal" \| "expanded"` |
| `showIcon` / `showTitle` / `showSubtitle` | Show/hide elements |
| `showCloseButton` / `showClearChat` | Show/hide buttons |
| `render` | Custom render function |

### Messages (`layout.messages.*`)
| Property | Description |
|----------|-------------|
| `layout` | `"bubble" \| "flat" \| "minimal"` |
| `groupConsecutive` | Group consecutive same-role messages |
| `avatar.show` / `avatar.position` / `avatar.userAvatar` / `avatar.assistantAvatar` | Avatar config |
| `timestamp.show` / `timestamp.position` / `timestamp.format` | Timestamp config |
| `renderUserMessage` / `renderAssistantMessage` | Custom render functions |

### Slots (`layout.slots.*`)
Available: `header-left`, `header-center`, `header-right`, `body-top`, `messages`, `body-bottom`, `footer-top`, `composer`, `footer-bottom`

## Copy / Text (`config.copy.*`)

| Property | Description |
|----------|-------------|
| `welcomeTitle` | Welcome message title |
| `welcomeSubtitle` | Welcome message subtitle |
| `inputPlaceholder` | Input placeholder text |
| `sendButtonLabel` | Send button label |

## Feature Flags (`config.features.*`)

| Property | Description |
|----------|-------------|
| `showReasoning` | Show AI reasoning/thinking steps |
| `showToolCalls` | Show tool call invocations |

## CSS Variables

```css
:root {
  --tvw-cw-primary: #1f2937;
  --tvw-cw-secondary: #6b7280;
  --tvw-cw-surface: #ffffff;
  --tvw-cw-muted: #9ca3af;
  --tvw-cw-accent: #3b82f6;
  --tvw-cw-container: #f8fafc;
  --tvw-cw-border: #e5e7eb;
  --tvw-cw-divider: #e5e7eb;
  --tvw-cw-message-border: #e5e7eb;
  --tvw-cw-input-background: #ffffff;
  --tvw-cw-call-to-action: #ffffff;
  --tvw-cw-call-to-action-background: #1f2937;
}
```

