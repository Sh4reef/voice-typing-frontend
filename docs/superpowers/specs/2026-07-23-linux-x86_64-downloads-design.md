# Design Spec: Linux x86_64 Download Section Integration

## Overview
Enable Linux platform downloads for x86_64 (64-bit) architecture in the VoiceTyping marketing frontend (`voice-typing-frontend`). The update transitions the Linux download card from a "Coming Soon" placeholder state to an active download block matching the layout and behavior of the existing macOS and Windows download cards, while maintaining "Coming Soon" for ARM64 Linux.

## Objectives
1. Enable x86_64 Linux downloads (`.AppImage` and `.deb`) in the frontend UI.
2. Maintain design parity with existing macOS and Windows download cards.
3. Dynamically inject versioned download URLs based on client version fetching logic.
4. Update client OS detection to properly identify Linux users and reflect available architecture support.

## Detailed Design

### 1. HTML Markup (`index.html`)
- **Card Structure (`#download-linux`):**
  - Remove card-level disabled state (`opacity-60 relative overflow-hidden`) and top-right "Coming Soon" badge.
  - Update `os-version` text to `x86_64 / x64 Linux Packages`.
  - Update `os-compat` description to `Supports major Linux distributions (Ubuntu, Debian, Fedora, Arch). Native pre-compiled binaries for x86_64.`.
  - Replace disabled button container with a structured `.download-options-group` containing:
    1. **64-bit (x86_64) Option Row:**
       - Label: `64-bit (x86_64)`
       - Primary Action Button: `<a href="#" class="btn btn-primary btn-sm" id="linux-x64-appimage-download">.AppImage</a>`
       - Secondary Action Button: `<a href="#" class="btn btn-secondary btn-sm" id="linux-x64-deb-download">.deb</a>`
    2. **ARM64 Option Row:**
       - Label: `ARM64`
       - Action Badge: `<span class="text-xs text-text-muted italic">Coming Soon</span>`

### 2. Client JavaScript Logic (`src/main.js`)
- **OS Detection (`detectClientOS`):**
  - When `navigator.userAgent` contains `'linux'`, set `detectedOsLabel.textContent` to `'Download for Linux (x86_64)'`.
- **Dynamic Link Generation (`applyVersionedDownloadLinks`):**
  - Add link mappings for Linux x86_64 binaries:
    - `'linux-x64-appimage-download'`: `${releasesUrl}/VoiceTyping_${version}_amd64.AppImage`
    - `'linux-x64-deb-download'`: `${releasesUrl}/VoiceTyping_${version}_amd64.deb`

## Implementation Steps
1. Modify `index.html` to update `#download-linux` card markup.
2. Modify `src/main.js` to update `detectClientOS` and `applyVersionedDownloadLinks`.
3. Verify links generation and responsive rendering across viewport sizes.
