import { createRequire } from 'node:module';
import { defineConfig } from 'vitepress';

const { version } = createRequire(import.meta.url)('../../package.json') as {
  version: string;
};

export default defineConfig({
  title: '@oxth/nestjs-storage',
  description:
    'A unified NestJS storage API for Local, S3, R2, GCS, Azure, and any S3-compatible service.',
  base: '/nestjs-storage/',

  head: [
    // .ico first for browsers without SVG favicon support; SVG wins where supported.
    [
      'link',
      { rel: 'icon', href: '/nestjs-storage/favicon.ico', sizes: '48x48' },
    ],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/nestjs-storage/favicon.svg',
      },
    ],
    [
      'link',
      { rel: 'apple-touch-icon', href: '/nestjs-storage/apple-touch-icon.png' },
    ],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    [
      'link',
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    ],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
      },
    ],
    ['meta', { property: 'og:title', content: '@oxth/nestjs-storage' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'A unified NestJS storage API for Local, S3, R2, GCS, Azure, and any S3-compatible service.',
      },
    ],
    ['meta', { property: 'og:type', content: 'website' }],
    [
      'meta',
      { property: 'og:url', content: 'https://oxth.github.io/nestjs-storage/' },
    ],
    // Social platforms need an absolute URL for the preview image.
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://oxth.github.io/nestjs-storage/og-image.png',
      },
    ],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    [
      'meta',
      {
        property: 'og:image:alt',
        content: '@oxth/nestjs-storage — Unified storage for NestJS',
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'theme-color', content: '#0f766e' }],
  ],

  lastUpdated: true,
  sitemap: { hostname: 'https://oxth.github.io/nestjs-storage/' },
  cleanUrls: true,

  themeConfig: {
    siteTitle: 'NestJS Storage',
    logo: '/favicon.svg',
    outline: { level: [2, 3] },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/oxth/nestjs-storage/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    nav: [
      { text: 'Guide', link: '/guide/', activeMatch: '/guide/' },
      { text: 'Drivers', link: '/drivers/', activeMatch: '/drivers/' },
      { text: 'API Reference', link: '/api/', activeMatch: '/api/' },
      {
        text: `v${version}`,
        items: [
          {
            text: 'Changelog',
            link: 'https://github.com/oxth/nestjs-storage/blob/main/CHANGELOG.md',
          },
          {
            text: 'Releases',
            link: 'https://github.com/oxth/nestjs-storage/releases',
          },
          {
            text: 'npm',
            link: 'https://www.npmjs.com/package/@oxth/nestjs-storage',
          },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Configuration', link: '/guide/configuration' },
          ],
        },
        {
          text: 'Essentials',
          items: [
            { text: 'File Uploads', link: '/guide/file-uploads' },
            { text: 'Naming Strategies', link: '/guide/naming-strategies' },
            { text: 'Signed URLs', link: '/guide/signed-urls' },
            { text: 'Testing', link: '/guide/testing' },
          ],
        },
      ],

      '/drivers/': [
        {
          text: 'Storage Drivers',
          items: [
            { text: 'Overview', link: '/drivers/' },
            { text: 'Local Filesystem', link: '/drivers/local' },
            { text: 'Amazon S3 (+ S3-compatible)', link: '/drivers/s3' },
            { text: 'Cloudflare R2', link: '/drivers/r2' },
            { text: 'Google Cloud Storage', link: '/drivers/gcs' },
            { text: 'Azure Blob Storage', link: '/drivers/azure' },
          ],
        },
        {
          text: 'Extensibility',
          items: [{ text: 'Custom Drivers', link: '/drivers/custom-drivers' }],
        },
      ],

      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'StorageService', link: '/api/storage-service' },
            { text: 'Interfaces & Types', link: '/api/interfaces' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/oxth/nestjs-storage' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present OxTH',
    },
  },
});
