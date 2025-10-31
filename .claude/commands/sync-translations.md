# Sync Translations Command

Synchronize translation updates between Chinese (zh.json) and English (en.json) locale files.

## What This Does

This command helps keep your translations in sync when changes are made to the Chinese translations. It:

1. **Detects changes** in `src/i18n/locales/zh.json` compared to the last git commit
2. **Shows you the differences** between old and new Chinese text
3. **Updates the corresponding keys** in `src/i18n/locales/en.json` with appropriate English translations
4. **Displays a summary** of all changed keys

## Usage

```bash
/sync-translations
```

## Example Workflow

When you've updated Chinese translations and want to update English:

1. Make changes to `src/i18n/locales/zh.json`
2. Run `/sync-translations`
3. Review the changes shown
4. The script will identify which keys in `en.json` need updating
5. Use Claude to help translate the Chinese changes to English
6. Commit both files together

## Key Changed Translation Sync

The command identifies changed keys by analyzing git diff and displays:
- The key path (e.g., `trading.wizard.paperStep3.description`)
- The old Chinese value
- The new Chinese value
- Required English translation

## Example Output

```
🔄 Translation Sync Tool

📝 Changes detected in zh.json

Changed keys (showing old → new Chinese text):
──────────────────────────────────────────────────
trading.wizard.paperStep3.description
  OLD: "建议先选择5分钟频率，熟悉界面和操作，然后再选择8小时频率进行真实策略模拟"
  NEW: "建议先选择分钟级频率，熟悉界面和操作，然后再选择小时级频率模拟真实交易"

trading.wizard.paperStep3.5mLabel
  OLD: "5分钟"
  NEW: "分钟级"

[... more changes ...]

✅ Translation update completed!

Next steps:
1. Review the changes above
2. Update en.json with appropriate English translations
3. Commit both files: git add src/i18n/locales/*.json && git commit -m "refactor: update translations"
```

## Tips for Translation

When updating English translations:

- **Be consistent** with existing terminology in your codebase
- **Match the tone** - if the Chinese is more casual, use casual English
- **Keep length similar** to Chinese text to avoid UI layout issues
- **Test in the UI** - verify the text fits properly in the interface
- **Consider context** - different sections may need different translation approaches

## Technical Details

- Reads the current git index to find changes
- Compares old and new Chinese values
- Identifies the JSON paths that changed
- Provides a structured format for translation updates

## Related Files

- Chinese translations: `src/i18n/locales/zh.json`
- English translations: `src/i18n/locales/en.json`
- Translation helper script: `scripts/sync-translations.js`
