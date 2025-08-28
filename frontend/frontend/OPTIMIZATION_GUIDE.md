
# Image Reference Updates Required

After Phase 1 optimization, update these files to use WebP images:

## Logo References to Update:
- Update components to use .webp versions
- Add fallback support for older browsers
- Update imports in component files

## Example Update Pattern:
```typescript
// Before
<img src="/logos/phantom.png" alt="Phantom" />

// After (with fallback)
<picture>
  <source srcSet="/logos/phantom.webp" type="image/webp" />
  <img src="/logos/phantom.png" alt="Phantom" />
</picture>
```

## Video References to Update:
- Update coverVideo paths in game components
- Add WebM support with MP4 fallback

## Audio References to Update:
- Update audio imports to use sprite system
- Implement audio sprite player utility
